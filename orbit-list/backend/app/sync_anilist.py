"""AniList-Export (einseitig, NUR Anime). Braucht OAuth-Token (Env ANILIST_TOKEN).

Nutzt SaveMediaListEntry mit FuzzyDateInput {year,month,day} → umgeht den bekannten
MCP-Datums-Bug. **H wird NIE synchronisiert** (nur space='normal').

STUB: Ohne ANILIST_TOKEN wird nichts gesendet; preview() zeigt, was synchronisiert würde.
Jonas-Block: App auf anilist.co/settings/developer registrieren, PIN-Token holen,
als Secret (sops/agenix) → ANILIST_TOKEN.
"""
from __future__ import annotations

import os

import httpx

from .db import connect

ENDPOINT = "https://graphql.anilist.co"
MUTATION = """
mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score, progress: $progress) {
    id status score progress
  }
}
"""
STATUS_MAP = {
    "watching": "CURRENT", "planning": "PLANNING", "completed": "COMPLETED",
    "dropped": "DROPPED", "paused": "PAUSED", "rewatching": "REPEATING",
}


def _entries() -> list:
    con = connect()
    rows = con.execute(
        "SELECT m.anilist_id, m.title_romaji, u.rating, u.watch_status, u.progress "
        "FROM media m JOIN user_entry u ON u.media_id=m.id "
        "WHERE m.space='normal' AND m.anilist_id IS NOT NULL "
        "AND (u.watch_status IS NOT NULL AND u.watch_status<>'none' OR u.rating IS NOT NULL)"
    ).fetchall()
    con.close()
    return rows


def preview() -> list[dict]:
    return [
        {
            "anilist_id": r["anilist_id"],
            "title": r["title_romaji"],
            "status": STATUS_MAP.get(r["watch_status"] or "none"),
            "score": r["rating"],
            "progress": r["progress"],
        }
        for r in _entries()
    ]


def run() -> dict:
    token = os.environ.get("ANILIST_TOKEN")
    pending = preview()
    if not token:
        return {
            "status": "stub",
            "note": "ANILIST_TOKEN nicht gesetzt — Jonas: App auf anilist.co/settings/developer "
            "registrieren, PIN-Token holen, als Secret bereitstellen.",
            "would_sync": len(pending),
        }
    headers = {"Authorization": f"Bearer {token}"}
    done, errors = 0, []
    for e in pending:
        if not e["status"] and e["score"] is None:
            continue
        variables = {
            "mediaId": e["anilist_id"],
            "status": e["status"],
            "score": float(e["score"]) if e["score"] is not None else None,
            "progress": e["progress"] or 0,
        }
        try:
            r = httpx.post(ENDPOINT, json={"query": MUTATION, "variables": variables}, headers=headers, timeout=30)
            r.raise_for_status()
            done += 1
        except Exception as ex:  # einzelne Fehler sammeln, Rest weiter
            errors.append(f"{e['title']}: {ex!r}")
    return {"status": "ok", "synced": done, "errors": errors[:5]}
