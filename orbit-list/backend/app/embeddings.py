"""Semantische Suche: Katalog einmal mit bge-m3 embedden (inkrementell), Vektoren in
sqlite-vec. Suche = Query embedden + KNN + Filter (space, 'neu fuer mich')."""
from __future__ import annotations

import re

import sqlite_vec

from .db import connect
from .sources import ollama


def _strip(html: str | None) -> str:
    if not html:
        return ""
    return re.sub(r"<[^>]+>", " ", html)


def _dim() -> int:
    from .db import repo
    return int(repo.meta_get("ai_index_dim") or ollama.EMBED_DIM)


def ensure_table(con) -> None:
    con.execute(
        f"CREATE VIRTUAL TABLE IF NOT EXISTS vec_media USING vec0("
        f"media_id INTEGER PRIMARY KEY, embedding FLOAT[{_dim()}])"
    )


def rebuild(progress=None) -> dict:
    """Index mit dem AKTUELLEN Modell komplett neu aufbauen (Dimension wird erkannt)."""
    from . import aiconf
    from .db import repo
    dim = len(aiconf.embed(["Test"])[0])
    con = connect()
    con.execute("DROP TABLE IF EXISTS vec_media")
    con.commit()
    con.close()
    repo.meta_set("ai_index_dim", str(dim))
    res = index_all(progress=progress)
    repo.meta_set("ai_index_model", aiconf.model_id())
    return res


def _doc(row) -> str:
    import json

    genres = []
    if row["genres"]:
        try:
            genres = json.loads(row["genres"])
        except Exception:
            pass
    title = row["title_english"] or row["title_romaji"] or row["title_native"] or ""
    return f"{title}. Genres: {', '.join(genres)}. {_strip(row['description_en'])[:1500]}".strip()


def index_all(batch: int = 32, progress=None) -> dict:
    con = connect()
    ensure_table(con)
    done = {r[0] for r in con.execute("SELECT media_id FROM vec_media").fetchall()}
    rows = con.execute("SELECT id, title_english, title_romaji, title_native, genres, description_en FROM media").fetchall()
    todo = [r for r in rows if r["id"] not in done]
    total = len(todo)
    n = 0
    for i in range(0, total, batch):
        chunk = todo[i : i + batch]
        vecs = ollama.embed([_doc(r) for r in chunk])
        for r, v in zip(chunk, vecs):
            con.execute(
                "INSERT OR REPLACE INTO vec_media(media_id, embedding) VALUES (?, ?)",
                (r["id"], sqlite_vec.serialize_float32(v)),
            )
        con.commit()
        n += len(chunk)
        if progress:
            progress(n, total)
        print(f"  indexiert {n}/{total}", flush=True)
    con.close()
    return {"indexed": n, "already": len(done), "total_media": len(rows)}


def index_count() -> dict:
    con = connect()
    ensure_table(con)
    v = con.execute("SELECT COUNT(*) c FROM vec_media").fetchone()["c"]
    m = con.execute("SELECT COUNT(*) c FROM media").fetchone()["c"]
    con.close()
    return {"embedded": v, "media": m}


def search(query: str, space: str = "normal", limit: int = 3, new_for_me: bool = False,
           filters: dict | None = None, candidates: int = 300) -> list[dict]:
    """Semantische Suche + GLEICHZEITIG die manuellen Filter (genres/format/status/year/dub/seen/media_type).
    KNN liefert Kandidaten, danach werden sie durch dieselbe _where-Logik gefiltert."""
    import json

    f = dict(filters or {})
    f["space"] = space
    qv = ollama.embed([query])[0]
    con = connect()
    ensure_table(con)
    knn = con.execute(
        "SELECT media_id, distance FROM vec_media WHERE embedding MATCH ? ORDER BY distance LIMIT ?",
        (sqlite_vec.serialize_float32(qv), candidates),
    ).fetchall()
    order = {r["media_id"]: (i, r["distance"]) for i, r in enumerate(knn)}
    if not order:
        con.close()
        return []
    ids = list(order.keys())

    from .db import SqliteRepo, _row_to_media
    where, args = SqliteRepo()._where(f)
    ph = ",".join("?" for _ in ids)
    rows = con.execute(
        f"SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since "
        f"FROM media m LEFT JOIN user_entry u ON u.media_id=m.id "
        f"WHERE m.id IN ({ph}) AND {where}",
        ids + args,
    ).fetchall()
    con.close()

    out = []
    for r in rows:
        if new_for_me and (r["watch_status"] in ("completed", "watching")):
            continue
        d = _row_to_media(r)
        d["_rank"] = order[r["id"]][0]
        d["_distance"] = round(order[r["id"]][1], 4)
        out.append(d)
    out.sort(key=lambda x: x["_rank"])
    return out[:limit]


# ---- Bausteine fuer das eingebettete Backend (Handy): dort rechnet das Plugin die Aehnlichkeit selbst
# (kein sqlite-vec) und nutzt nur diese beiden Funktionen fuer Filter und Ergebnisdaten.
def allowed_ids(space: str = "normal", new_for_me: bool = False, filters: dict | None = None) -> list[int]:
    """IDs aller Titel, die die manuellen Filter erfuellen (gleiche _where-Logik wie die Suche)."""
    f = dict(filters or {})
    f["space"] = space
    from .db import SqliteRepo
    where, args = SqliteRepo()._where(f)
    con = connect()
    try:
        rows = con.execute(
            f"SELECT m.id, u.watch_status FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE {where}", args
        ).fetchall()
    finally:
        con.close()
    return [r["id"] for r in rows if not (new_for_me and r["watch_status"] in ("completed", "watching"))]


def fetch_ordered(ids: list[int], distances: list[float] | None = None) -> list[dict]:
    """Titel zu den IDs in genau dieser Reihenfolge (mit _rank/_distance wie die Server-Suche)."""
    if not ids:
        return []
    from .db import _row_to_media
    con = connect()
    try:
        ph = ",".join("?" for _ in ids)
        rows = con.execute(
            f"SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since "
            f"FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE m.id IN ({ph})", ids
        ).fetchall()
    finally:
        con.close()
    by = {r["id"]: r for r in rows}
    out = []
    for i, mid in enumerate(ids):
        if mid in by:
            d = _row_to_media(by[mid])
            d["_rank"] = i
            if distances is not None and i < len(distances):
                d["_distance"] = round(distances[i], 4)
            out.append(d)
    return out


if __name__ == "__main__":
    print(index_all())
