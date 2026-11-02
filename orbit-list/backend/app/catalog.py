"""Katalog-Import aus der eigenen offenen Datenbank (orbit-anime-db, anime.jsonl).

Additiv und nicht-destruktiv: bestehende Eintraege (und damit user_entry) werden nie geloescht oder
ersetzt. Zuordnung ueber AniList-ID (Verweis), sonst eindeutige MAL-/aniSearch-ID, sonst neuer Eintrag.
Bestehende Eintraege ohne Gegenstueck bleiben, erkennbar an ``oadb_id IS NULL`` (nicht geraten).

Aufruf:  python -m app.catalog [pfad/zu/anime.jsonl] [--db KOPIE.db]
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path

DEFAULT_JSONL = Path(os.environ.get("OADB_JSONL", Path.home() / "projects/orbit-anime-db/data/anime.jsonl"))

FORMAT = {"tv": "TV", "movie": "MOVIE", "ova": "OVA", "ona": "ONA", "special": "SPECIAL"}
STATUS = {"announced": "NOT_YET_RELEASED", "upcoming": "NOT_YET_RELEASED", "airing": "RELEASING", "finished": "FINISHED"}
# AniList-/MAL-Genre-Vokabular; alles andere aus der Quelle sind Themen/Tags
GENRES = {
    "action": "Action", "adventure": "Adventure", "comedy": "Comedy", "drama": "Drama", "ecchi": "Ecchi",
    "fantasy": "Fantasy", "horror": "Horror", "mahou shoujo": "Mahou Shoujo", "mecha": "Mecha", "music": "Music",
    "mystery": "Mystery", "psychological": "Psychological", "romance": "Romance", "sci-fi": "Sci-Fi",
    "science fiction": "Sci-Fi", "slice of life": "Slice of Life", "sports": "Sports", "sport": "Sports",
    "supernatural": "Supernatural", "thriller": "Thriller", "hentai": "Hentai",
}

NEW_COLS = [("media", "oadb_id", "TEXT"), ("media", "kitsu_id", "INTEGER")]


def _titlecase(s: str) -> str:
    return " ".join(w.capitalize() if not w.isupper() else w for w in s.split())


def _split_genres(raw: list[str]) -> tuple[list[str], list[str]]:
    genres: list[str] = []
    tags: list[str] = []
    for g in raw or []:
        k = g.strip().lower()
        if not k:
            continue
        if k in GENRES:
            v = GENRES[k]
            if v not in genres:
                genres.append(v)
        else:
            v = _titlecase(k)
            if v not in tags:
                tags.append(v)
    return genres, tags


def _info_links(ids: dict, website: str | None) -> dict:
    links = {}
    if ids.get("anilist"):
        links["anilist"] = f"https://anilist.co/anime/{ids['anilist']}"
    if ids.get("mal"):
        links["mal"] = f"https://myanimelist.net/anime/{ids['mal']}"
    if ids.get("anisearch"):
        links["anisearch"] = f"https://www.anisearch.com/anime/{ids['anisearch']}"
    if ids.get("kitsu"):
        links["kitsu"] = f"https://kitsu.app/anime/{ids['kitsu']}"
    if ids.get("wikipedia_en"):
        links["wikipedia"] = f"https://en.wikipedia.org/wiki/{str(ids['wikipedia_en']).replace(' ', '_')}"
    if website:
        links["website"] = website
    return links


def _row_from_record(r: dict) -> dict:
    ids = r.get("ids") or {}
    t = r.get("title") or {}
    season = r.get("season") or {}
    genres, tags = _split_genres(r.get("genres") or [])
    syn = [s for s in (t.get("synonyms") or []) if s]
    syn_text = (r.get("synopsis") or {}).get("text")
    start = r.get("start_date") or ""
    year = season.get("year") or (int(start[:4]) if start[:4].isdigit() else None)
    adult = 1 if "Hentai" in genres else 0
    titles = [t.get("romaji"), t.get("en"), t.get("ja")]
    return {
        "oadb_id": r["id"],
        "space": "h" if adult else "normal",
        "is_adult": adult,
        "anilist_id": ids.get("anilist"),
        "mal_id": ids.get("mal"),
        "anisearch_id": ids.get("anisearch"),
        "kitsu_id": ids.get("kitsu"),
        "title_romaji": t.get("romaji") or t.get("en"),
        "title_english": t.get("en"),
        "title_native": t.get("ja"),
        "synonyms": syn,
        "format": FORMAT.get(r.get("type")),
        "status": STATUS.get(r.get("status")),
        "episodes": r.get("episodes"),
        "season_year": year,
        "season": (season.get("season") or "").upper() or None,
        "genres": genres,
        "tags": tags,
        "studios": r.get("studios") or [],
        "description_en": syn_text,
        "info_links": _info_links(ids, r.get("website")),
        "search_blob": " | ".join(x.lower() for x in titles + syn if x),
    }


def _j(v):
    return json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v


def run(jsonl: Path = DEFAULT_JSONL, db: Path | None = None, progress=print) -> dict:
    from . import db as dbmod

    path = Path(db) if db else dbmod.DB_PATH
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    for tbl, col, typ in NEW_COLS:
        try:
            con.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {typ}")
        except sqlite3.OperationalError:
            pass
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_media_oadb ON media(oadb_id) WHERE oadb_id IS NOT NULL")
    con.commit()

    before = {
        "media": con.execute("SELECT COUNT(*) FROM media").fetchone()[0],
        "user_entry": con.execute("SELECT COUNT(*) FROM user_entry").fetchone()[0],
    }

    by_oadb, by_ani, by_mal, by_anis = {}, {}, {}, {}
    mal_cnt: dict[int, int] = {}
    for r in con.execute("SELECT id, oadb_id, anilist_id, mal_id, anisearch_id FROM media"):
        if r["oadb_id"]:
            by_oadb[r["oadb_id"]] = r["id"]
        if r["anilist_id"]:
            by_ani[r["anilist_id"]] = r["id"]
        if r["mal_id"]:
            mal_cnt[r["mal_id"]] = mal_cnt.get(r["mal_id"], 0) + 1
            by_mal[r["mal_id"]] = r["id"]
        if r["anisearch_id"]:
            by_anis[r["anisearch_id"]] = r["id"]
    by_mal = {k: v for k, v in by_mal.items() if mal_cnt[k] == 1}

    claimed: set[int] = set()
    stats = {"matched": 0, "created": 0, "created_h": 0, "skipped_dup": 0, "status_refreshed": 0}

    fill_cols = ["title_romaji", "title_english", "title_native", "format", "episodes", "season_year", "season",
                 "description_en", "mal_id", "anisearch_id", "kitsu_id"]
    fill_json = ["synonyms", "genres", "tags", "studios", "info_links"]

    n = 0
    for line in open(jsonl, encoding="utf-8"):
        rec = json.loads(line)
        row = _row_from_record(rec)
        mid = by_oadb.get(row["oadb_id"])
        if mid is None and row["anilist_id"]:
            mid = by_ani.get(row["anilist_id"])
        elif mid is None:
            mid = (by_mal.get(row["mal_id"]) if row["mal_id"] else None) or (
                by_anis.get(row["anisearch_id"]) if row["anisearch_id"] else None)
        if mid is not None and mid in claimed:
            stats["skipped_dup"] += 1
            continue

        if mid is not None:
            cur = con.execute("SELECT * FROM media WHERE id=?", (mid,)).fetchone()
            sets, vals = ["oadb_id=?"], [row["oadb_id"]]
            for c in fill_cols:
                if row.get(c) is not None and cur[c] in (None, ""):
                    sets.append(f"{c}=?")
                    vals.append(row[c])
            for c in fill_json:
                if row.get(c) and not cur[c] or (row.get(c) and cur[c] in ("[]", "{}")):
                    sets.append(f"{c}=?")
                    vals.append(_j(row[c]))
            # Status nur nachziehen, solange er sich aendern kann (laufend / angekuendigt)
            if row["status"] and cur["status"] in ("RELEASING", "NOT_YET_RELEASED", None) and row["status"] != cur["status"]:
                sets.append("status=?")
                vals.append(row["status"])
                stats["status_refreshed"] += 1
                if row["episodes"]:
                    sets.append("episodes=?")
                    vals.append(row["episodes"])
            con.execute(f"UPDATE media SET {', '.join(sets)} WHERE id=?", vals + [mid])
            claimed.add(mid)
            stats["matched"] += 1
        else:
            cols = ["oadb_id", "space", "media_type", "is_adult", "anilist_id", "mal_id", "anisearch_id", "kitsu_id",
                    "title_romaji", "title_english", "title_native", "synonyms", "format", "status", "episodes",
                    "season_year", "season", "genres", "tags", "studios", "description_en", "info_links", "search_blob"]
            vals = [_j(row.get(c)) if c != "media_type" else "anime" for c in cols]
            try:
                cur = con.execute(f"INSERT INTO media ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})", vals)
            except sqlite3.IntegrityError:
                # MAL-ID schon vergeben (anderer Eintrag ohne AniList-ID) → ohne MAL-ID anlegen
                vals[cols.index("mal_id")] = None
                cur = con.execute(f"INSERT INTO media ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})", vals)
            claimed.add(cur.lastrowid)
            stats["created"] += 1
            stats["created_h"] += row["is_adult"]
        n += 1
        if n % 5000 == 0:
            con.commit()
            progress(f"  {n} Titel verarbeitet")

    con.execute("INSERT OR REPLACE INTO meta_kv(key, value) VALUES ('last_catalog_import', datetime('now'))")
    con.commit()

    after = {
        "media": con.execute("SELECT COUNT(*) FROM media").fetchone()[0],
        "user_entry": con.execute("SELECT COUNT(*) FROM user_entry").fetchone()[0],
        "ohne_gegenstueck": con.execute("SELECT COUNT(*) FROM media WHERE oadb_id IS NULL").fetchone()[0],
        "ohne_gegenstueck_in_liste": con.execute(
            "SELECT COUNT(*) FROM media m JOIN user_entry u ON u.media_id=m.id WHERE m.oadb_id IS NULL").fetchone()[0],
        "verwaiste_listeneintraege": con.execute(
            "SELECT COUNT(*) FROM user_entry u LEFT JOIN media m ON m.id=u.media_id WHERE m.id IS NULL").fetchone()[0],
    }
    con.close()
    res = {"vorher": before, "nachher": after, **stats}
    progress(json.dumps(res, ensure_ascii=False, indent=1))
    return res


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dbarg = None
    if "--db" in sys.argv:
        dbarg = sys.argv[sys.argv.index("--db") + 1]
        args = [a for a in args if a != dbarg]
    run(Path(args[0]) if args else DEFAULT_JSONL, dbarg)
