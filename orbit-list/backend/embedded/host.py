"""Eingebettetes Backend (Pyodide im Handy): ruft die FastAPI-App direkt als ASGI auf, ohne Netzwerk.

Das Plugin legt die App-Quellen nach /app/app, die Datenbank nach /data/anime.db und ruft ``handle``.
Nicht verfuegbar im Handy: sqlite-vec (KI-Suche) und ausgehendes HTTP ueber httpx (AniList-Sync,
Verfuegbarkeit) — beides wird hier als Stub bereitgestellt und meldet sauber einen Fehler.
"""
import asyncio
import json
import os
import sys
import types

os.environ.setdefault("ANIME_DB", "/work/anime.db")
os.environ.setdefault("ORBITLIST_JOURNAL", "DELETE")
os.environ.setdefault("ORBITLIST_UI", "/nonexistent")

if "sqlite_vec" not in sys.modules:
    try:
        import sqlite_vec  # noqa: F401
    except Exception:
        def _nope(*a, **k):
            raise RuntimeError("KI-Suche (sqlite-vec) ist im Handy nicht verfuegbar")
        sys.modules["sqlite_vec"] = types.SimpleNamespace(load=_nope, serialize_float32=_nope)

if "httpx" not in sys.modules:
    try:
        import httpx  # noqa: F401
    except Exception:
        def _net(*a, **k):
            raise RuntimeError("Netzwerkzugriff ist im eingebetteten Backend (noch) nicht verfuegbar")
        sys.modules["httpx"] = types.SimpleNamespace(get=_net, post=_net, put=_net, request=_net,
                                                      Client=_net, AsyncClient=_net, HTTPError=Exception)

_app = None
_started = False


def _no_threads():
    """Pyodide hat keine Threads: sync-Endpunkte laufen direkt in der Ereignisschleife."""
    import starlette.concurrency as sc
    import fastapi.routing as fr
    import fastapi.concurrency as fc

    async def inline(func, *args, **kwargs):
        return func(*args, **kwargs)

    for m in (sc, fr, fc):
        if hasattr(m, "run_in_threadpool"):
            m.run_in_threadpool = inline


def _load():
    global _app
    if _app is None:
        _no_threads()
        sys.path.insert(0, "/app")
        from app.main import app  # noqa: PLC0415
        _app = app
    return _app


async def _ensure_started():
    app = _load()
    global _started
    if not _started:
        await app.router.startup()
        _started = True
    return app


async def _call(method, path, headers, body):
    app = await _ensure_started()
    p, _, q = path.partition("?")
    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method.upper(),
        "scheme": "http", "path": p, "raw_path": p.encode(), "query_string": q.encode(), "root_path": "",
        "headers": [(k.lower().encode(), str(v).encode()) for k, v in (headers or {}).items()],
        "client": ("127.0.0.1", 0), "server": ("127.0.0.1", 0),
    }
    sent = False
    out = {"status": 500, "headers": {}, "body": b""}

    async def receive():
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body or b"", "more_body": False}
        return {"type": "http.disconnect"}

    async def send(msg):
        if msg["type"] == "http.response.start":
            out["status"] = msg["status"]
            out["headers"] = {k.decode(): v.decode() for k, v in msg.get("headers", [])}
        elif msg["type"] == "http.response.body":
            out["body"] += msg.get("body", b"")

    await app(scope, receive, send)
    return out


async def handle(method, path, headers_json="{}", body=""):
    """Gibt (status, content_type, body_text) zurueck."""
    r = await _call(method, path, json.loads(headers_json or "{}"), body.encode() if isinstance(body, str) else body)
    return json.dumps({"status": r["status"], "headers": r["headers"], "body": r["body"].decode("utf-8", "replace")})


# ---- KI-Suche auf dem Geraet: das Plugin (TypeScript) rechnet Einbettungen und Aehnlichkeit selbst;
# hier nur Datenzugriff auf die Arbeitsdatenbank. Rueckgabe jeweils JSON-Text.
async def ai_count():
    await _ensure_started()
    from app.db import connect
    con = connect()
    try:
        return json.dumps(con.execute("SELECT COUNT(*) FROM media").fetchone()[0])
    finally:
        con.close()


async def ai_docs(after, limit):
    """Texte-Rohdaten der naechsten `limit` Titel mit id > after (aufsteigend)."""
    await _ensure_started()
    from app.db import connect
    con = connect()
    try:
        cols = {r[1] for r in con.execute("PRAGMA table_info(media)")}
        want = ["id", "title_english", "title_romaji", "title_native", "title_de", "synonyms", "genres",
                "studios", "format", "season_year", "description_de", "description_en"]
        sel = ", ".join(c if c in cols else f"NULL AS {c}" for c in want)
        rows = con.execute(f"SELECT {sel} FROM media WHERE id>? ORDER BY id LIMIT ?", (int(after), int(limit))).fetchall()
        return json.dumps([dict(r) for r in rows])
    finally:
        con.close()


async def ai_allowed(space, new_for_me, filters_json, h_password=""):
    await _ensure_started()
    from app import embeddings
    if space == "h":
        from app.main import _h_ok
        if not _h_ok(h_password or None):
            return json.dumps({"forbidden": True, "ids": []})
    f = json.loads(filters_json or "{}")
    return json.dumps({"forbidden": False, "ids": embeddings.allowed_ids(space, bool(new_for_me), f)})


async def ai_fetch(ids_json, distances_json="[]"):
    await _ensure_started()
    from app import embeddings
    return json.dumps(embeddings.fetch_ordered(json.loads(ids_json), json.loads(distances_json)), default=str)
