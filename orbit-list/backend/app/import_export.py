"""AniList-GDPR-Export → eigene DB (user_entry). Dient als BACKUP/Restore.

Die eigene Liste (Bewertungen, Status, Fortschritt) bleibt so erhalten und ist
wiederherstellbar — auch wenn am AniList-Konto etwas schiefgeht. Fehlende Titel
(nicht im Katalog) werden per ID nachgeladen, damit nichts Geschautes fehlt.
"""
from __future__ import annotations

import json

import httpx

from .db import connect, repo
from .importer import _apply_dub, build_info_links
from .sources import anilist, mydublist

# AniList-GDPR-Status-Codes (empirisch bestätigt):
STATUS_MAP = {0: "watching", 1: "planning", 2: "completed", 3: "dropped", 4: "paused", 5: "rewatching"}


def _entries(path: str) -> list[dict]:
    d = json.load(open(path, encoding="utf-8"))
    return [e for e in d.get("lists", []) if e.get("series_type") == 0]


def run(path: str, fetch_missing: bool = True) -> dict:
    entries = _entries(path)
    con = connect()
    idmap = {
        r["anilist_id"]: r["id"]
        for r in con.execute("SELECT id, anilist_id FROM media WHERE space='normal' AND anilist_id IS NOT NULL")
    }
    con.close()

    missing = [e["series_id"] for e in entries if e["series_id"] not in idmap]
    added = 0
    if fetch_missing and missing:
        print(f"  {len(missing)} Titel fehlen im Katalog → nachladen …", flush=True)
        with httpx.Client(headers={"User-Agent": "anime-liste/0.1"}) as client:
            a2ids, mal2ids = mydublist.load_mappings(client)
            tier_of = mydublist.load_dub_tiers(client)
            for m in anilist.fetch_by_ids(client, missing):
                _apply_dub(m, a2ids, tier_of, mal2ids)
                mid = repo.upsert_media(m)
                idmap[m["anilist_id"]] = mid
                added += 1
        print(f"  {added} nachgeladen", flush=True)

    matched = 0
    still_missing = []
    for e in entries:
        mid = idmap.get(e["series_id"])
        if not mid:
            still_missing.append(e["series_id"])
            continue
        patch = {"watch_status": STATUS_MAP.get(e["status"], "none"), "progress": e.get("progress") or 0}
        if e.get("score"):
            patch["rating"] = round(e["score"] / 10)
        if e.get("notes"):
            patch["note"] = e["notes"]
        repo.set_user_entry(mid, patch)
        matched += 1

    result = {"entries": len(entries), "matched": matched, "nachgeladen": added, "fehlen_noch": len(still_missing)}
    print(f"Export-Import fertig: {result}", flush=True)
    return result


if __name__ == "__main__":
    import sys

    run(sys.argv[1])
