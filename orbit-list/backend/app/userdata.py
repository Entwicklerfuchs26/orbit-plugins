"""Nutzerdaten (Liste, Einstellungen) getrennt vom Katalog: Export und Import im Standardformat.

- JSON-Vollbackup (``orbitlist_export``): alle Listenfelder, Einstellungen; Zuordnung beim Import ueber
  oadb_id → AniList-ID → MAL-ID, damit die Datei mit jedem Katalogstand zusammenpasst.
- MAL-XML (De-facto-Standard): Import wie Export, nur Status/Fortschritt/Bewertung.
Das eingebettete Backend sichert damit seine Nutzerdaten (kleine Datei) statt der ganzen Datenbank.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET

from .db import connect, repo

ENTRY_COLS = ["rating", "note", "watch_status", "progress", "collection", "lent_to", "lent_since",
              "favorite", "favorite_order", "started_at", "completed_at", "rewatches"]
MAL_STATUS = {"watching": "watching", "completed": "completed", "on-hold": "paused", "onhold": "paused",
              "dropped": "dropped", "plan to watch": "planning", "plantowatch": "planning"}
SKIP_META = ("last_", "auth_", "pair_token")  # Laufzeit-/Zugangsdaten gehoeren nicht ins Backup


def export_dict() -> dict:
    con = connect()
    try:
        rows = con.execute(
            "SELECT m.oadb_id, m.anilist_id, m.mal_id, m.space, m.title_romaji, m.title_english, "
            + ", ".join(f"u.{c}" for c in ENTRY_COLS) + " FROM media m JOIN user_entry u ON u.media_id=m.id "
            "WHERE u.watch_status<>'none' OR u.rating IS NOT NULL OR u.favorite=1 OR u.note IS NOT NULL "
            "OR u.collection<>'none' OR u.lent_to IS NOT NULL"
        ).fetchall()
        meta = {r["key"]: r["value"] for r in con.execute("SELECT key, value FROM meta_kv")
                if not r["key"].startswith(SKIP_META)}
        streaming = [dict(r) for r in con.execute(
            "SELECT m.oadb_id, m.anilist_id, m.mal_id, s.service, s.url, s.source FROM streaming s JOIN media m ON m.id=s.media_id")]
        scores = [dict(r) for r in con.execute(
            "SELECT anilist_id, average_score AS score FROM media WHERE anilist_id IS NOT NULL AND average_score IS NOT NULL")]
        services = [dict(r) for r in con.execute("SELECT * FROM services")]
        types = [dict(r) for r in con.execute("SELECT * FROM media_types")]
    finally:
        con.close()
    return {"orbitlist_export": 2, "entries": [dict(r) for r in rows], "meta": meta,
            "services": services, "media_types": types, "streaming": streaming, "scores": scores}


def _find(con, e: dict):
    for col in ("oadb_id", "anilist_id", "mal_id"):
        v = e.get(col)
        if v:
            r = con.execute(f"SELECT id FROM media WHERE {col}=? ORDER BY (space='normal') DESC LIMIT 1", (v,)).fetchone()
            if r:
                return r["id"]
    return None


def _restore_table(con, table: str, rows: list[dict]) -> None:
    cols = [r["name"] for r in con.execute(f"PRAGMA table_info({table})")]
    con.execute(f"DELETE FROM {table}")
    for r in rows:
        use = [c for c in cols if c in r]
        con.execute(f"INSERT INTO {table}({','.join(use)}) VALUES ({','.join('?' for _ in use)})", [r[c] for c in use])


def _parse_mal(text: str) -> list[dict]:
    out = []
    for a in ET.fromstring(text).iter("anime"):
        g = lambda t: (a.findtext(t) or "").strip()
        st = MAL_STATUS.get(g("my_status").lower())
        if not g("series_animedb_id").isdigit() or not st:
            continue
        sc = int(g("my_score") or 0)
        out.append({"mal_id": int(g("series_animedb_id")), "watch_status": st,
                    "progress": int(g("my_watched_episodes") or 0), "rating": sc or None})
    return out


def import_text(text: str) -> dict:
    """Liest JSON-Vollbackup oder MAL-XML. Eintraege ohne Katalogtreffer werden gezaehlt, nicht erfunden."""
    t = text.lstrip()
    if t.startswith("<"):
        data = {"entries": _parse_mal(t)}
    else:
        data = json.loads(t)
        if "orbitlist_export" not in data:
            raise ValueError("Unbekanntes Format (weder Orbitlist-JSON noch MAL-XML)")
    con = connect()
    matched = missing = 0
    try:
        for tbl in ("services", "media_types"):
            if data.get(tbl):
                _restore_table(con, tbl, data[tbl])
        for k, v in (data.get("meta") or {}).items():
            if not k.startswith(SKIP_META):
                con.execute("INSERT OR REPLACE INTO meta_kv(key, value) VALUES (?, ?)", (k, v))
        con.commit()
        for e in data.get("entries", []):
            mid = _find(con, e)
            if not mid:
                missing += 1
                continue
            patch = {c: e[c] for c in ENTRY_COLS if c in e}
            if patch:
                repo.set_user_entry(mid, patch)
            matched += 1
        for st in data.get("streaming") or []:
            mid = _find(con, st)
            if mid and st.get("service"):
                con.execute("INSERT OR REPLACE INTO streaming (media_id, service, url, source) VALUES (?,?,?,?)",
                            (mid, st["service"], st.get("url"), st.get("source")))
        for sc in data.get("scores") or []:
            if sc.get("anilist_id") and sc.get("score"):
                con.execute("UPDATE media SET average_score=? WHERE anilist_id=? AND average_score IS NULL", (sc["score"], sc["anilist_id"]))
        con.commit()
    finally:
        con.close()
    return {"entries": matched + missing, "matched": matched, "not_in_catalog": missing}
