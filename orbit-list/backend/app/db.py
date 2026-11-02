"""Datenhaltung + Datenzugriffs-Schicht (abstrahiert: Remote/lokal).

Die API spricht nur gegen ``MediaRepo`` (abstrakt). Das Backend nutzt ``SqliteRepo``.
Ein spaeteres Orbit-Plugin im lokalen Modus kann dieselbe Schnittstelle gegen
IndexedDB implementieren — darum ist hier bewusst eine schmale Repo-API definiert.
"""
from __future__ import annotations

import json
import os
import sqlite3
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional

try:  # sqlite-vec ist optional (erst ab Meilenstein C fuer Embeddings gebraucht)
    import sqlite_vec
    HAVE_VEC = True
except Exception:  # pragma: no cover
    HAVE_VEC = False

DB_PATH = Path(
    os.environ.get("ANIME_DB", Path(__file__).resolve().parent.parent / "data" / "anime.db")
)

# space = 'normal' (Anime) | 'h' (Hentai, versteckt). media_type = anime|manga|book|...
SCHEMA = """
CREATE TABLE IF NOT EXISTS media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  space         TEXT NOT NULL DEFAULT 'normal',
  media_type    TEXT NOT NULL DEFAULT 'anime',
  anilist_id    INTEGER,
  mal_id        INTEGER,
  anisearch_id  INTEGER,
  title_romaji  TEXT,
  title_english TEXT,
  title_native  TEXT,
  title_de      TEXT,
  synonyms      TEXT,            -- JSON array
  format        TEXT,
  status        TEXT,
  episodes      INTEGER,
  season_year   INTEGER,
  genres        TEXT,            -- JSON array
  tags          TEXT,            -- JSON array
  is_adult      INTEGER DEFAULT 0,
  popularity    INTEGER,
  average_score INTEGER,
  cover_url     TEXT,
  banner_url    TEXT,
  color         TEXT,
  description_en TEXT,
  description_de TEXT,
  dub_de        INTEGER DEFAULT 0,
  dub_tier      TEXT,
  dub_languages TEXT,            -- JSON array von Sprachen mit Dub
  info_links    TEXT,            -- JSON object
  search_blob   TEXT,            -- lowercase Titel+Synonyme fuer Findbarkeit
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_media_anilist ON media(space, anilist_id) WHERE anilist_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_media_mal ON media(space, mal_id) WHERE anilist_id IS NULL AND mal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_media_space_type ON media(space, media_type);
CREATE INDEX IF NOT EXISTS ix_media_pop ON media(popularity DESC);

CREATE TABLE IF NOT EXISTS user_entry (
  media_id     INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  rating       INTEGER,          -- 1..10
  note         TEXT,             -- eigenes Beschreibungsfeld
  watch_status TEXT DEFAULT 'none',  -- none|watching|completed|dropped|paused|planning
  progress     INTEGER DEFAULT 0,
  collection   TEXT DEFAULT 'none', -- none|wish|owned
  lent_to      TEXT,
  lent_since   TEXT,
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  url_schema TEXT NOT NULL,       -- enthaelt {slug}
  logo       TEXT,
  space      TEXT DEFAULT 'normal',
  enabled    INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS meta_kv (key TEXT PRIMARY KEY, value TEXT);

-- Wo ein Titel nachweislich schaubar ist (nur Treffer; vom Geraet geprueft: Direktlink aufloesbar bzw. AniList-Streaming-Link)
CREATE TABLE IF NOT EXISTS streaming (
  media_id   INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  service    TEXT NOT NULL,
  url        TEXT,
  source     TEXT,             -- 'direct' (Schema-Link aufgeloest) | 'anilist'
  checked_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (media_id, service)
);

-- Medientyp-Configs (= der Dropdown-Umschalter neben dem Logo). hidden=1 → nur nach H-Entsperren.
CREATE TABLE IF NOT EXISTS media_types (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  space       TEXT NOT NULL DEFAULT 'normal',   -- 'normal' | 'h'
  media_type  TEXT NOT NULL DEFAULT 'anime',     -- Filter auf media.media_type
  hidden      INTEGER DEFAULT 0,
  enabled     INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  deletable   INTEGER DEFAULT 1
);
"""

# Erscheinungsdatum zum Sortieren: genaues Startdatum, sonst Jahr (Titel ohne Angabe kommen immer zuletzt)
_DATE_KEY = "COALESCE(m.start_date, CASE WHEN m.season_year IS NOT NULL THEN printf('%04d', m.season_year) END)"

JSON_FIELDS = {"synonyms", "genres", "tags", "studios", "info_links", "dub_languages"}


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute(f"PRAGMA journal_mode={os.environ.get('ORBITLIST_JOURNAL', 'WAL')}")  # eingebettet (Handy): DELETE
    con.execute("PRAGMA foreign_keys=ON")
    try:
        con.enable_load_extension(True)
        if HAVE_VEC:
            sqlite_vec.load(con)
        con.enable_load_extension(False)
    except Exception:
        pass
    return con


def init_db() -> None:
    con = connect()
    con.executescript(SCHEMA)
    # Migration: mal_id-Unique nur noch für Zeilen OHNE anilist_id (z.B. H aus Jikan).
    # Verschiedene AniList-Anime (Staffeln) dürfen sich eine idMal teilen → sonst Import-Crash.
    con.execute("DROP INDEX IF EXISTS ux_media_mal")
    con.execute(
        "CREATE UNIQUE INDEX ux_media_mal ON media(space, mal_id) WHERE anilist_id IS NULL AND mal_id IS NOT NULL"
    )
    try:
        con.execute("ALTER TABLE media ADD COLUMN dub_languages TEXT")
    except Exception:
        pass  # Spalte existiert bereits
    try:
        # Dienste gehören zu EINER Config (eigener Streaming-Satz je Config, z.B. H komplett getrennt).
        con.execute("ALTER TABLE services ADD COLUMN config_slug TEXT DEFAULT 'anime'")
        con.execute("UPDATE services SET config_slug='anime' WHERE config_slug IS NULL AND space='normal'")
        con.execute("UPDATE services SET config_slug='h' WHERE config_slug IS NULL AND space='h'")
    except Exception:
        pass  # Spalte existiert bereits
    try:
        con.execute("ALTER TABLE user_entry ADD COLUMN favorite INTEGER DEFAULT 0")  # ♥ Favorit
    except Exception:
        pass
    try:
        con.execute("ALTER TABLE user_entry ADD COLUMN favorite_order INTEGER")  # Rang in der Favoriten-Liste
    except Exception:
        pass
    # AniList-Zusatzdaten (Import ueber /sync/anilist/import) — rein additiv
    for tbl, col, typ in [
        ("media", "season", "TEXT"), ("media", "country", "TEXT"), ("media", "source", "TEXT"),
        ("media", "studios", "TEXT"), ("media", "oadb_id", "TEXT"), ("media", "start_date", "TEXT"), ("services", "search_schema", "TEXT"), ("media", "kitsu_id", "INTEGER"), ("media", "next_airing_ep", "INTEGER"), ("media", "next_airing_at", "INTEGER"),
        ("user_entry", "started_at", "TEXT"), ("user_entry", "completed_at", "TEXT"), ("user_entry", "rewatches", "INTEGER"),
    ]:
        try:
            con.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {typ}")
        except Exception:
            pass
    con.commit()
    con.close()


def _row_to_media(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    for f in JSON_FIELDS:
        if f in d and d[f]:
            try:
                d[f] = json.loads(d[f])
            except Exception:
                d[f] = None
    # bequeme Anzeige-Felder
    d["title"] = d.get("title_de") or d.get("title_english") or d.get("title_romaji") or d.get("title_native")
    d["description"] = d.get("description_de") or d.get("description_en")
    return d


class MediaRepo(ABC):
    """Schmale, implementierungs-unabhaengige Schnittstelle (Remote/lokal)."""

    @abstractmethod
    def upsert_media(self, m: dict[str, Any]) -> int: ...

    @abstractmethod
    def list_media(self, **f: Any) -> list[dict[str, Any]]: ...

    @abstractmethod
    def get_media(self, media_id: int) -> Optional[dict[str, Any]]: ...

    @abstractmethod
    def set_user_entry(self, media_id: int, patch: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def count(self, **f: Any) -> int: ...


_MEDIA_COLS = [
    "space", "media_type", "anilist_id", "mal_id", "anisearch_id",
    "title_romaji", "title_english", "title_native", "title_de", "synonyms",
    "format", "status", "episodes", "season_year", "genres", "tags",
    "is_adult", "popularity", "average_score", "cover_url", "banner_url", "color",
    "description_en", "description_de", "dub_de", "dub_tier", "dub_languages", "info_links", "search_blob",
]
_USER_COLS = ["rating", "note", "watch_status", "progress", "collection", "lent_to", "lent_since", "favorite", "favorite_order",
              "started_at", "completed_at", "rewatches"]


class SqliteRepo(MediaRepo):
    def __init__(self) -> None:
        init_db()

    # ---- schreiben -------------------------------------------------------
    def upsert_media(self, m: dict[str, Any]) -> int:
        row = {k: m.get(k) for k in _MEDIA_COLS}
        for f in JSON_FIELDS:
            if isinstance(row.get(f), (list, dict)):
                row[f] = json.dumps(row[f], ensure_ascii=False)
        # search_blob fuer Findbarkeit ueber alle Titelvarianten + Synonyme
        titles = [m.get("title_romaji"), m.get("title_english"), m.get("title_native"), m.get("title_de")]
        syn = m.get("synonyms") or []
        if isinstance(syn, str):
            try:
                syn = json.loads(syn)
            except Exception:
                syn = []
        row["search_blob"] = " | ".join(t.lower() for t in (titles + list(syn)) if t)

        con = connect()
        try:
            key_col = "anilist_id" if m.get("anilist_id") else "mal_id"
            cur = con.execute(
                f"SELECT id FROM media WHERE space=? AND {key_col}=?",
                (row["space"], m.get(key_col)),
            )
            existing = cur.fetchone()
            if existing:
                mid = existing["id"]
                # description_de (teure Übersetzung) beim Re-Import NICHT mit None überschreiben
                parts, vals = [], []
                for c in _MEDIA_COLS:
                    parts.append("description_de=COALESCE(?, description_de)" if c == "description_de" else f"{c}=?")
                    vals.append(row[c])
                con.execute(f"UPDATE media SET {', '.join(parts)}, updated_at=datetime('now') WHERE id=?", vals + [mid])
            else:
                cols = ", ".join(_MEDIA_COLS)
                ph = ", ".join("?" for _ in _MEDIA_COLS)
                cur = con.execute(f"INSERT INTO media ({cols}) VALUES ({ph})", [row[c] for c in _MEDIA_COLS])
                mid = cur.lastrowid
            con.commit()
            return mid
        finally:
            con.close()

    def set_user_entry(self, media_id: int, patch: dict[str, Any]) -> dict[str, Any]:
        fields = {k: v for k, v in patch.items() if k in _USER_COLS}
        con = connect()
        try:
            con.execute("INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)", (media_id,))
            if fields:
                sets = ", ".join(f"{c}=?" for c in fields) + ", updated_at=datetime('now')"
                con.execute(f"UPDATE user_entry SET {sets} WHERE media_id=?", list(fields.values()) + [media_id])
            con.commit()
            r = con.execute("SELECT * FROM user_entry WHERE media_id=?", (media_id,)).fetchone()
            return dict(r) if r else {}
        finally:
            con.close()

    def set_favorites_order(self, ids: list[int]) -> None:
        """Rangfolge der Favoriten setzen (Drag-and-drop). Reihenfolge = Platz 1,2,3…"""
        con = connect()
        try:
            for i, mid in enumerate(ids):
                con.execute("INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)", (mid,))
                con.execute("UPDATE user_entry SET favorite=1, favorite_order=? WHERE media_id=?", (i, mid))
            con.commit()
        finally:
            con.close()

    # ---- lesen -----------------------------------------------------------
    @staticmethod
    def _as_list(v: Any) -> list[str]:
        if not v:
            return []
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return list(v)

    def _where(self, f: dict[str, Any]) -> tuple[str, list[Any]]:
        clauses, args = ["m.space=?"], [f.get("space", "normal")]
        if f.get("media_type"):
            clauses.append("m.media_type=?"); args.append(f["media_type"])
        # Genres (mehrere → UND, wie AniList)
        genres = self._as_list(f.get("genres")) or self._as_list(f.get("genre"))
        for g in genres:
            clauses.append("lower(m.genres) LIKE ?"); args.append(f'%"{g.lower()}"%')
        # Tags (mehrere → UND), Saison/Land/Quelle/Studio (AniList-Import)
        for t in self._as_list(f.get("tags")):
            clauses.append("lower(m.tags) LIKE ?"); args.append(f'%"{t.lower()}"%')
        for col in ("season", "country", "source"):
            if f.get(col):
                clauses.append(f"m.{col}=?"); args.append(str(f[col]).upper())
        if f.get("studio"):
            clauses.append("lower(m.studios) LIKE ?"); args.append(f'%"{str(f["studio"]).lower()}"%')
        # Format (mehrere → ODER)
        fmts = self._as_list(f.get("format"))
        if fmts:
            clauses.append("(" + " OR ".join("m.format=?" for _ in fmts) + ")"); args.extend(fmts)
        # Freigabe-Status (mehrere → ODER)
        sts = self._as_list(f.get("status"))
        if sts:
            clauses.append("(" + " OR ".join("m.status=?" for _ in sts) + ")"); args.extend(sts)
        if f.get("year_min"):
            clauses.append("m.season_year>=?"); args.append(int(f["year_min"]))
        if f.get("year_max"):
            clauses.append("m.season_year<=?"); args.append(int(f["year_max"]))
        if f.get("dub") is not None:
            clauses.append("m.dub_de=?"); args.append(1 if f["dub"] else 0)
        if f.get("dub_lang"):
            clauses.append("lower(m.dub_languages) LIKE ?"); args.append(f'%"{f["dub_lang"].lower()}"%')
        if f.get("q"):
            clauses.append("m.search_blob LIKE ?"); args.append(f'%{f["q"].lower()}%')
        if f.get("collection"):
            clauses.append("u.collection=?"); args.append(f["collection"])
        ws = f.get("watch_status")
        if ws == "all":  # "Meine Liste / Alle" = alle Einträge mit irgendeinem Status
            clauses.append("u.watch_status IS NOT NULL AND u.watch_status<>'none'")
        elif ws:
            clauses.append("u.watch_status=?"); args.append(ws)
        # Gesehen/Nicht-gesehen (wirkt mit + ohne KI). yes = completed/rewatching, no = Rest.
        seen = f.get("seen")
        if seen in ("yes", True, "1", 1):
            clauses.append("u.watch_status IN ('completed','rewatching')")
        elif seen in ("no", False, "0", 0):
            clauses.append("(u.watch_status IS NULL OR u.watch_status NOT IN ('completed','rewatching'))")
        if f.get("favorite") in ("1", 1, True, "yes"):
            clauses.append("u.favorite=1")
        if f.get("rating"):  # nach vergebener Punktzahl filtern (exakt 1..10)
            clauses.append("u.rating=?"); args.append(int(f["rating"]))
        return " AND ".join(clauses), args

    def list_media(self, **f: Any) -> list[dict[str, Any]]:
        where, args = self._where(f)
        order = {"popularity": "m.average_score IS NULL, m.average_score DESC, m.popularity DESC, m.id", "score": "m.average_score IS NULL, m.average_score DESC, m.popularity DESC, m.id",
                 "title": "m.search_blob ASC", "recent": "m.updated_at DESC",
                 "favorite": "u.favorite_order IS NULL, u.favorite_order ASC",
                 "date_desc": f"{_DATE_KEY} IS NULL, {_DATE_KEY} DESC, m.id", "date_asc": f"{_DATE_KEY} IS NULL, {_DATE_KEY} ASC, m.id"}.get(f.get("sort", "popularity"), "m.average_score IS NULL, m.average_score DESC, m.popularity DESC, m.id")
        limit = int(f.get("limit", 60)); offset = int(f.get("offset", 0))
        sql = (
            "SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since, u.favorite, u.started_at, u.completed_at, u.rewatches "
            "FROM media m LEFT JOIN user_entry u ON u.media_id=m.id "
            f"WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?"
        )
        con = connect()
        try:
            rows = con.execute(sql, args + [limit, offset]).fetchall()
            return [_row_to_media(r) for r in rows]
        finally:
            con.close()

    def count(self, **f: Any) -> int:
        where, args = self._where(f)
        con = connect()
        try:
            r = con.execute(
                f"SELECT COUNT(*) c FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE {where}",
                args,
            ).fetchone()
            return r["c"]
        finally:
            con.close()

    def get_media(self, media_id: int) -> Optional[dict[str, Any]]:
        con = connect()
        try:
            r = con.execute(
                "SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since, u.favorite, u.started_at, u.completed_at, u.rewatches "
                "FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE m.id=?",
                (media_id,),
            ).fetchone()
            return _row_to_media(r) if r else None
        finally:
            con.close()

    # ---- Profil-Statistik (wie AniList-Overview) -------------------------
    def profile_stats(self) -> dict[str, Any]:
        from collections import Counter

        con = connect()
        try:
            by_status = {
                r["watch_status"]: r["c"]
                for r in con.execute(
                    "SELECT watch_status, COUNT(*) c FROM user_entry WHERE watch_status<>'none' GROUP BY watch_status"
                )
            }
            agg = con.execute(
                "SELECT COUNT(*) total, COALESCE(SUM(progress),0) eps, AVG(rating) mean "
                "FROM user_entry WHERE watch_status<>'none'"
            ).fetchone()
            rated = con.execute(
                "SELECT rating, COUNT(*) c FROM user_entry WHERE rating IS NOT NULL GROUP BY rating ORDER BY rating"
            ).fetchall()
            gc: Counter = Counter()
            for r in con.execute(
                "SELECT m.genres FROM media m JOIN user_entry u ON u.media_id=m.id "
                "WHERE u.watch_status NOT IN ('none','planning')"
            ):
                if r["genres"]:
                    try:
                        for g in json.loads(r["genres"]):
                            gc[g] += 1
                    except Exception:
                        pass
            eps = agg["eps"] or 0
            # Days Planned: geplante Titel * Folgen * 24 min
            planned_eps = con.execute(
                "SELECT COALESCE(SUM(m.episodes),0) e FROM media m JOIN user_entry u ON u.media_id=m.id "
                "WHERE u.watch_status='planning'"
            ).fetchone()["e"] or 0
            # Standardabweichung der Wertungen
            ratings = [r["rating"] for r in con.execute(
                "SELECT rating FROM user_entry WHERE rating IS NOT NULL")]
            std_dev = None
            if len(ratings) > 1:
                mu = sum(ratings) / len(ratings)
                std_dev = round((sum((x - mu) ** 2 for x in ratings) / len(ratings)) ** 0.5, 2)
            # Stunden je Wertung (progress * 24 min)
            hours_by_score = {
                str(r["rating"]): round((r["mins"] or 0) / 60, 1)
                for r in con.execute(
                    "SELECT rating, SUM(COALESCE(progress,0))*24 mins FROM user_entry "
                    "WHERE rating IS NOT NULL GROUP BY rating ORDER BY rating")
            }
            # Folgen-Verteilung der gelisteten Titel (Buckets)
            buckets = {"1": 0, "2–12": 0, "13–26": 0, "27–50": 0, "51–100": 0, "100+": 0}
            for r in con.execute(
                "SELECT m.episodes e FROM media m JOIN user_entry u ON u.media_id=m.id "
                "WHERE u.watch_status<>'none' AND m.episodes IS NOT NULL"
            ):
                e = r["e"]
                k = ("1" if e <= 1 else "2–12" if e <= 12 else "13–26" if e <= 26
                     else "27–50" if e <= 50 else "51–100" if e <= 100 else "100+")
                buckets[k] += 1
            return {
                "total": agg["total"] or 0,
                "by_status": by_status,
                "episodes": eps,
                "days_watched": round(eps * 24 / 60 / 24, 1),
                "days_planned": round(planned_eps * 24 / 60 / 24, 1),
                "mean_score": round(agg["mean"], 1) if agg["mean"] else None,
                "std_dev": std_dev,
                "score_dist": {str(r["rating"]): r["c"] for r in rated},
                "hours_by_score": hours_by_score,
                "episode_dist": buckets,
                "top_genres": gc.most_common(12),
            }
        finally:
            con.close()

    # ---- Verteilungen für Stats-Donuts + Jahr-Linie (aus vorhandenen Daten) ----
    def stats_distributions(self) -> dict[str, Any]:
        con = connect()
        try:
            def grp(col: str) -> list[dict[str, Any]]:
                rows = con.execute(
                    f"SELECT m.{col} k, COUNT(*) c FROM media m JOIN user_entry u ON u.media_id=m.id "
                    f"WHERE u.watch_status<>'none' AND m.{col} IS NOT NULL GROUP BY m.{col} ORDER BY c DESC"
                )
                return [{"key": r["k"], "count": r["c"]} for r in rows]
            by_status = [
                {"key": r["watch_status"], "count": r["c"]}
                for r in con.execute(
                    "SELECT watch_status, COUNT(*) c FROM user_entry WHERE watch_status<>'none' "
                    "GROUP BY watch_status ORDER BY c DESC")
            ]
            by_year = [
                {"key": r["y"], "count": r["c"]}
                for r in con.execute(
                    "SELECT m.season_year y, COUNT(*) c FROM media m JOIN user_entry u ON u.media_id=m.id "
                    "WHERE u.watch_status<>'none' AND m.season_year IS NOT NULL GROUP BY m.season_year ORDER BY m.season_year")
            ]
            return {"by_format": grp("format"), "by_status": by_status, "by_year": by_year}
        finally:
            con.close()

    # ---- Stats-Unterseiten: ranked Aggregation über ein JSON-Array-Feld -----
    def stats_by_field(self, field: str) -> list[dict[str, Any]]:
        """Ranked Liste (Genre/Tag): je Wert Count + Mean-Score + Stunden. field∈genres|tags."""
        if field not in ("genres", "tags", "studios"):
            raise ValueError("field muss genres, tags oder studios sein")
        from collections import defaultdict

        con = connect()
        try:
            agg: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0, "score_sum": 0.0, "score_n": 0, "mins": 0})
            for r in con.execute(
                f"SELECT m.{field} v, u.rating, COALESCE(u.progress,0) prog FROM media m "
                "JOIN user_entry u ON u.media_id=m.id WHERE u.watch_status<>'none'"
            ):
                if not r["v"]:
                    continue
                try:
                    vals = json.loads(r["v"])
                except Exception:
                    continue
                for name in vals:
                    a = agg[name]
                    a["count"] += 1
                    a["mins"] += r["prog"] * 24
                    if r["rating"] is not None:
                        a["score_sum"] += r["rating"]; a["score_n"] += 1
            out = [
                {
                    "name": name,
                    "count": int(a["count"]),
                    "mean_score": round(a["score_sum"] / a["score_n"], 1) if a["score_n"] else None,
                    "hours": round(a["mins"] / 60, 1),
                }
                for name, a in agg.items()
            ]
            out.sort(key=lambda x: x["count"], reverse=True)
            return out
        finally:
            con.close()

    # ---- Medientyp-Configs (Dropdown-Umschalter) -------------------------
    def list_media_types(self, include_hidden: bool = False) -> list[dict[str, Any]]:
        con = connect()
        try:
            sql = "SELECT * FROM media_types WHERE enabled=1"
            if not include_hidden:
                sql += " AND hidden=0"
            sql += " ORDER BY sort_order, name"
            return [dict(r) for r in con.execute(sql)]
        finally:
            con.close()

    def get_media_type(self, slug: str) -> Optional[dict[str, Any]]:
        con = connect()
        try:
            r = con.execute("SELECT * FROM media_types WHERE slug=?", (slug,)).fetchone()
            return dict(r) if r else None
        finally:
            con.close()

    def add_media_type(self, slug: str, name: str, description: Optional[str],
                       space: str, media_type: str, hidden: int = 0) -> None:
        con = connect()
        try:
            n = con.execute("SELECT COALESCE(MAX(sort_order),0)+1 n FROM media_types").fetchone()["n"]
            con.execute(
                "INSERT INTO media_types (slug,name,description,space,media_type,hidden,enabled,sort_order,deletable) "
                "VALUES (?,?,?,?,?,?,1,?,1) "
                "ON CONFLICT(slug) DO UPDATE SET name=excluded.name, description=excluded.description, "
                "space=excluded.space, media_type=excluded.media_type, hidden=excluded.hidden, enabled=1",
                (slug, name, description, space, media_type, int(hidden), n),
            )
            con.commit()
        finally:
            con.close()

    def delete_media_type(self, slug: str) -> None:
        con = connect()
        try:
            con.execute("DELETE FROM media_types WHERE slug=? AND deletable=1", (slug,))
            con.commit()
        finally:
            con.close()

    # ---- services (generischer Dienst-Checker, PRO CONFIG) ---------------
    def list_services(self, config_slug: str = "anime") -> list[dict[str, Any]]:
        con = connect()
        try:
            rows = con.execute(
                "SELECT * FROM services WHERE enabled=1 AND config_slug=?", (config_slug,)
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            con.close()

    def add_service(self, name: str, url_schema: str, logo: Optional[str] = None,
                    config_slug: str = "anime", space: str = "normal", search_schema: Optional[str] = None) -> int:
        con = connect()
        try:
            cur = con.execute(
                "INSERT INTO services (name, url_schema, search_schema, logo, space, config_slug, enabled) VALUES (?,?,?,?,?,?,1)",
                (name, url_schema, search_schema, logo, space, config_slug),
            )
            con.commit()
            return cur.lastrowid
        finally:
            con.close()

    # ---- Filter-Metadaten PRO CONFIG (eigene Genres/Formate je Config) ---
    def filter_meta(self, space: str = "normal", media_type: Optional[str] = None) -> dict[str, Any]:
        con = connect()
        try:
            where = "space=?"
            args: list[Any] = [space]
            if media_type:
                where += " AND media_type=?"; args.append(media_type)
            formats = [r[0] for r in con.execute(
                f"SELECT DISTINCT format FROM media WHERE {where} AND format IS NOT NULL ORDER BY format", args)]
            statuses = [r[0] for r in con.execute(
                f"SELECT DISTINCT status FROM media WHERE {where} AND status IS NOT NULL ORDER BY status", args)]
            yr = con.execute(
                f"SELECT MIN(season_year), MAX(season_year) FROM media WHERE {where} AND season_year IS NOT NULL", args
            ).fetchone()
            # Genres aus den echten Daten DIESER Config sammeln (H hat andere als Anime)
            gc: dict[str, int] = {}
            for r in con.execute(f"SELECT genres FROM media WHERE {where} AND genres IS NOT NULL", args):
                if r["genres"]:
                    try:
                        for g in json.loads(r["genres"]):
                            gc[g] = gc.get(g, 0) + 1
                    except Exception:
                        pass
            genres = [g for g, _ in sorted(gc.items(), key=lambda x: (-x[1], x[0]))]
            tc: dict[str, int] = {}
            for r in con.execute(f"SELECT tags FROM media WHERE {where} AND tags IS NOT NULL", args):
                try:
                    for t in json.loads(r["tags"] or "[]"):
                        tc[t] = tc.get(t, 0) + 1
                except Exception:
                    pass
            tags = [t for t, _ in sorted(tc.items(), key=lambda x: (-x[1], x[0]))]
            return {"formats": formats, "statuses": statuses, "year_min": yr[0], "year_max": yr[1], "genres": genres, "tags": tags}
        finally:
            con.close()

    def delete_service(self, sid: int) -> None:
        con = connect()
        try:
            con.execute("DELETE FROM services WHERE id=?", (sid,))
            con.commit()
        finally:
            con.close()

    def meta_get(self, key: str) -> Optional[str]:
        con = connect()
        try:
            r = con.execute("SELECT value FROM meta_kv WHERE key=?", (key,)).fetchone()
            return r["value"] if r else None
        finally:
            con.close()

    def meta_set(self, key: str, value: str) -> None:
        con = connect()
        try:
            con.execute("INSERT INTO meta_kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=?",
                        (key, value, value))
            con.commit()
        finally:
            con.close()


repo = SqliteRepo()
