"""FastAPI-App — Anime-Liste Backend.

H-Datenraum ist per Passwort-Gate geschuetzt (Bedrohungsmodell: Gaeste am PC).
Default zeigt keine Spur von H: /anime bedient nur space='normal'.
"""
from __future__ import annotations

import hashlib
from typing import Optional

from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import secrets

from . import auth
from . import availability as avail_mod
from . import db
from . import embeddings as emb
from . import sync_anilist
from . import aiconf
from . import anilist_import
from . import translate as tr
from .db import repo
from .sources import ollama
from .tracker import jellyfin as jf

app = FastAPI(title="Orbitlist API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)



@app.middleware("http")
async def _access_guard(request: Request, call_next):
    h = request.headers.get("authorization", "")
    key = request.headers.get("x-orbitlist-key") or (h[7:] if h.lower().startswith("bearer ") else None)
    client = request.client.host if request.client else ""
    denied = auth.check(request.url.path, client, key, request.method)
    if denied:
        return JSONResponse({"detail": denied[1]}, status_code=denied[0])
    return await call_next(request)


class _LoginBody(BaseModel):
    password: str


@app.get("/auth/status")
def auth_status() -> dict:
    return {"required": auth.is_required()}


@app.post("/auth/login")
def auth_login(body: _LoginBody, request: Request) -> dict:
    if not auth.is_required():
        return {"key": "", "required": False}
    try:
        key = auth.login(body.password, request.client.host if request.client else "")
    except PermissionError as e:
        raise HTTPException(429, str(e))
    if not key:
        raise HTTPException(401, "Passwort falsch")
    return {"key": key, "required": True}


# Legale Standard-Dienste (generischer Checker; Jonas ergaenzt eigene/H-Dienste selbst)
DEFAULT_SERVICES = [
    ("Crunchyroll", "https://www.crunchyroll.com/de/search?q={q}", "crunchyroll.png"),
    ("Netflix", "https://www.netflix.com/search?q={q}", "netflix.png"),
    ("Prime Video", "https://www.primevideo.com/search?phrase={q}", "prime.png"),
    ("Disney+", "https://www.disneyplus.com/de-de/search?q={q}", "disneyplus.png"),
]


def _seed_services() -> None:
    if repo.list_services("anime"):
        return
    con = db.connect()
    try:
        for name, schema, logo in DEFAULT_SERVICES:
            con.execute(
                "INSERT INTO services (name, url_schema, logo, space, config_slug, enabled) VALUES (?,?,?, 'normal', 'anime', 1)",
                (name, schema, logo),
            )
        con.commit()
    finally:
        con.close()


# Medientyp-Start-Configs (idempotent). Anime = nicht löschbarer Default; H-Configs hidden.
# (slug, name, description, space, media_type, hidden, deletable, sort_order)
DEFAULT_MEDIA_TYPES = [
    ("anime", "Anime", "Serien & Filme aus Japan", "normal", "anime", 0, 0, 0),
    ("manga", "Manga", "Comics & Light Novels", "normal", "manga", 0, 1, 1),
    ("book", "Bücher", "Romane & Sachbücher", "normal", "book", 0, 1, 2),
    ("film", "Filme", "Kino & Streaming", "normal", "film", 0, 1, 3),
    ("series", "Serien", "Real-Serien & Shows", "normal", "series", 0, 1, 4),
    ("audiobook", "Hörbücher", "Audio & Podcasts", "normal", "audiobook", 0, 1, 5),
    ("h", "Hentai", "Versteckt — nur nach Entsperren", "h", "anime", 1, 1, 10),
    ("porno", "Porno", "Versteckt", "h", "porno", 1, 1, 11),
    ("doujin", "Doujinshi", "Versteckt", "h", "doujin", 1, 1, 12),
]


def _seed_media_types() -> None:
    con = db.connect()
    try:
        for slug, name, desc, space, mt, hidden, deletable, order in DEFAULT_MEDIA_TYPES:
            con.execute(
                "INSERT OR IGNORE INTO media_types "
                "(slug,name,description,space,media_type,hidden,enabled,sort_order,deletable) "
                "VALUES (?,?,?,?,?,?,1,?,?)",
                (slug, name, desc, space, mt, hidden, order, deletable),
            )
        con.commit()
    finally:
        con.close()


@app.on_event("startup")
def _startup() -> None:
    db.init_db()
    auth.apply_env()
    _seed_services()
    _seed_media_types()


# --------------------------------------------------------------------- Katalog-Abzug
@app.get("/catalog/slim.db.gz")
def catalog_slim():
    """Katalog ohne Nutzerdaten fuer das eingebettete Backend (Handy). Oeffentlich lesbar."""
    from fastapi.responses import FileResponse
    from . import slim
    return FileResponse(slim.build(), media_type="application/gzip", filename="catalog.db.gz")


# --------------------------------------------------------------------- health
@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "media_normal": repo.count(space="normal"),
        "media_h": repo.count(space="h"),
        "last_import": repo.meta_get("last_import"),
    }


@app.get("/stats")
def stats() -> dict:
    return {
        "anime": repo.count(space="normal"),
        "anime_dubbed": repo.count(space="normal", dub=True),
        "h": repo.count(space="h"),
        "attribution": repo.meta_get("dub_attribution"),
    }


# ----------------------------------------------------------------- normale DB
@app.get("/anime")
def list_anime(
    genre: Optional[str] = None,
    genres: Optional[str] = None,
    format: Optional[str] = None,
    status: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    dub: Optional[bool] = None,
    dub_lang: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "popularity",
    collection: Optional[str] = None,
    watch_status: Optional[str] = None,
    media_type: Optional[str] = None,
    seen: Optional[str] = None,
    favorite: Optional[str] = None,
    rating: Optional[int] = None,
    tags: Optional[str] = None,
    season: Optional[str] = None,
    country: Optional[str] = None,
    source: Optional[str] = None,
    studio: Optional[str] = None,
    limit: int = Query(60, le=2000),
    offset: int = 0,
) -> dict:
    f = dict(space="normal", genre=genre, genres=genres, format=format, status=status,
             year_min=year_min, year_max=year_max, dub=dub, dub_lang=dub_lang, q=q,
             collection=collection, watch_status=watch_status, media_type=media_type, seen=seen,
             favorite=favorite, rating=rating, tags=tags, season=season, country=country, source=source, studio=studio)
    items = repo.list_media(**f, sort=sort, limit=limit, offset=offset)
    return {"total": repo.count(**f), "count": len(items), "items": items}


@app.get("/profile/stats")
def profile_stats() -> dict:
    return repo.profile_stats()


@app.get("/stats/distributions")
def stats_distributions() -> dict:
    return repo.stats_distributions()


@app.get("/stats/genres")
def stats_genres() -> dict:
    return {"items": repo.stats_by_field("genres")}


@app.get("/stats/tags")
def stats_tags() -> dict:
    return {"items": repo.stats_by_field("tags")}


@app.get("/stats/studios")
def stats_studios() -> dict:
    return {"items": repo.stats_by_field("studios")}


@app.get("/meta/filters")
def meta_filters(
    space: str = "normal",
    media_type: Optional[str] = None,
    x_h_password: Optional[str] = Header(None),
) -> dict:
    """Verfügbare Filterwerte PRO CONFIG (eigene Genres/Formate je Config; H hat andere als Anime)."""
    if space == "h" and not _h_ok(x_h_password):
        raise HTTPException(403, "gesperrt")
    return repo.filter_meta(space=space, media_type=media_type)


@app.get("/anime/{media_id}")
def get_anime(media_id: int) -> dict:
    m = repo.get_media(media_id)
    if not m or m["space"] != "normal":
        raise HTTPException(404, "nicht gefunden")
    return m


@app.get("/services")
def services(config: str = "anime") -> list:
    # Dienste PRO Config (H hat komplett eigene, getrennt von Anime).
    return repo.list_services(config)


class ServiceBody(BaseModel):
    name: str
    url_schema: str
    logo: Optional[str] = None
    config: str = "anime"
    space: str = "normal"


@app.post("/services")
def add_service(body: ServiceBody) -> dict:
    return {"id": repo.add_service(body.name, body.url_schema, body.logo, body.config, body.space)}


@app.delete("/services/{sid}")
def del_service(sid: int) -> dict:
    repo.delete_service(sid)
    return {"ok": True}


# ---------------------------------------- Medientyp-Configs (Dropdown-Umschalter)
class MediaTypeBody(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    space: str = "normal"
    media_type: str = "anime"
    hidden: bool = False


class ActiveBody(BaseModel):
    slug: str


@app.get("/media-types")
def media_types(x_h_password: Optional[str] = Header(None)) -> list:
    # Versteckte Configs (H) NUR mit gültigem Passwort — sonst verrät die Liste die Existenz von H.
    return repo.list_media_types(include_hidden=_h_ok(x_h_password))


@app.post("/media-types")
def add_media_type(body: MediaTypeBody) -> dict:
    repo.add_media_type(body.slug, body.name, body.description, body.space, body.media_type, int(body.hidden))
    return {"ok": True, "slug": body.slug}


@app.delete("/media-types/{slug}")
def del_media_type(slug: str) -> dict:
    mt = repo.get_media_type(slug)
    if not mt:
        raise HTTPException(404, "nicht gefunden")
    if not mt["deletable"]:
        raise HTTPException(409, "Standard-Typ nicht löschbar")
    repo.delete_media_type(slug)
    if repo.meta_get("active_media_type") == slug:
        repo.meta_set("active_media_type", "anime")  # aktiven gelöschten Typ → Fallback Anime
    return {"ok": True}


@app.get("/media-types/active")
def get_active_media_type() -> dict:
    # Nur SICHTBARE Typen werden persistiert → H taucht nach Reload NIE von selbst auf (Leak-Schutz).
    slug = repo.meta_get("active_media_type") or "anime"
    mt = repo.get_media_type(slug)
    if not mt or mt["hidden"]:
        mt = repo.get_media_type("anime")
    return mt or {"slug": "anime", "name": "Anime", "space": "normal", "media_type": "anime", "hidden": 0, "deletable": 0}


@app.put("/media-types/active")
def set_active_media_type(body: ActiveBody) -> dict:
    mt = repo.get_media_type(body.slug)
    if not mt:
        raise HTTPException(404, "nicht gefunden")
    if mt["hidden"]:
        # Versteckte Typen NICHT persistieren (nur Session) — sonst Leak bei Reload.
        return {"ok": True, "persisted": False}
    repo.meta_set("active_media_type", body.slug)
    return {"ok": True, "persisted": True}


# ----------------------------------------------------- user entry (Bewerten, Regal)
class EntryPatch(BaseModel):
    rating: Optional[int] = None
    note: Optional[str] = None
    watch_status: Optional[str] = None
    progress: Optional[int] = None
    collection: Optional[str] = None  # none|wish|owned
    lent_to: Optional[str] = None
    lent_since: Optional[str] = None
    favorite: Optional[int] = None  # 0/1 ♥


@app.patch("/media/{media_id}/entry")
def patch_entry(media_id: int, patch: EntryPatch) -> dict:
    if not repo.get_media(media_id):
        raise HTTPException(404, "nicht gefunden")
    return repo.set_user_entry(media_id, patch.model_dump(exclude_none=True))


class FavOrder(BaseModel):
    ids: list[int]


@app.post("/favorites/reorder")
def favorites_reorder(body: FavOrder) -> dict:
    repo.set_favorites_order(body.ids)
    return {"ok": True, "count": len(body.ids)}


# ----------------------------------------------------------- H-Gate (versteckt)
def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def _h_ok(x_h_password: Optional[str]) -> bool:
    stored = repo.meta_get("h_password_hash")
    return bool(stored and x_h_password and _hash(x_h_password) == stored)


class PwBody(BaseModel):
    password: str


@app.get("/h/status")
def h_status() -> dict:
    return {"configured": repo.meta_get("h_password_hash") is not None}


@app.post("/h/password")
def h_set_password(body: PwBody) -> dict:
    repo.meta_set("h_password_hash", _hash(body.password))
    return {"ok": True}


@app.post("/h/unlock")
def h_unlock(body: PwBody) -> dict:
    if not _h_ok(body.password):
        raise HTTPException(403, "falsch oder nicht gesetzt")
    return {"ok": True}


@app.post("/h/reset")
def h_reset() -> dict:
    # Casual-Gäste-Modell: Zurücksetzen ohne altes Passwort erlaubt (Gäste gehen nicht in die Einstellungen).
    con = db.connect()
    con.execute("DELETE FROM meta_kv WHERE key='h_password_hash'")
    con.commit()
    con.close()
    return {"ok": True}


@app.get("/h")
def list_h(
    genre: Optional[str] = None,
    genres: Optional[str] = None,
    format: Optional[str] = None,
    status: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    q: Optional[str] = None,
    media_type: Optional[str] = None,
    watch_status: Optional[str] = None,
    seen: Optional[str] = None,
    favorite: Optional[str] = None,
    rating: Optional[int] = None,
    dub: Optional[bool] = None,
    dub_lang: Optional[str] = None,
    sort: str = "popularity",
    limit: int = Query(60, le=2000),
    offset: int = 0,
    x_h_password: Optional[str] = Header(None),
) -> dict:
    if not _h_ok(x_h_password):
        raise HTTPException(403, "gesperrt")
    f = dict(space="h", genre=genre, genres=genres, format=format, status=status,
             year_min=year_min, year_max=year_max, q=q, media_type=media_type,
             watch_status=watch_status, seen=seen, favorite=favorite, rating=rating,
             dub=dub, dub_lang=dub_lang)
    items = repo.list_media(**f, sort=sort, limit=limit, offset=offset)
    return {"total": repo.count(**f), "count": len(items), "items": items}


# ------------------------------------------------- KI: Embeddings + semantische Suche
_idx: dict = {"running": False, "done": 0, "total": 0, "error": None}


@app.get("/ai/status")
def ai_status() -> dict:
    return {
        "embed_model": ollama.EMBED_MODEL,
        "embed_ready": ollama.has_model(ollama.EMBED_MODEL),
        "translate_model": ollama.TRANSLATE_MODEL,
        "translate_ready": ollama.has_model(ollama.TRANSLATE_MODEL),
        "problem": aiconf.check_ready(),
        "indexing": dict(_idx),
        **emb.index_count(),
    }


@app.get("/ai/config")
def ai_config_get() -> dict:
    return aiconf.get()


class AiConfig(BaseModel):
    enabled: Optional[bool] = None
    mode: Optional[str] = None
    ext_kind: Optional[str] = None
    ext_url: Optional[str] = None
    ext_model: Optional[str] = None
    ext_key: Optional[str] = None


@app.put("/ai/config")
def ai_config_put(body: AiConfig) -> dict:
    try:
        return aiconf.update(body.model_dump(exclude_none=True))
    except ValueError as ex:
        raise HTTPException(400, str(ex))


@app.post("/ai/test")
def ai_test() -> dict:
    return aiconf.test()


def _run_index(full: bool) -> None:
    def prog(n: int, t: int) -> None:
        _idx["done"], _idx["total"] = n, t
    try:
        if full:
            emb.rebuild(progress=prog)
        else:
            emb.index_all(progress=prog)  # nur neue Titel nachziehen
    except Exception as ex:
        _idx["error"] = str(ex)[:300]
    finally:
        _idx["running"] = False


@app.post("/ai/index")
def ai_index(rebuild: bool = False) -> dict:
    """Index im Hintergrund pflegen (Fortschritt in /ai/status). rebuild=true: komplett neu mit dem gewählten Modell;
    sonst nur neue Titel — außer der Index gehört zu einem anderen Modell, dann zwingend komplett neu."""
    import threading

    if _idx["running"]:
        return {"started": False, "running": True}
    t = aiconf.test()
    if not t["ok"]:
        raise HTTPException(503, f"Modell nicht erreichbar: {t['error']}")
    _idx.update(running=True, done=0, total=0, error=None)
    full = rebuild or aiconf.get()["index_model"] != aiconf.model_id()
    threading.Thread(target=_run_index, args=(full,), daemon=True).start()
    return {"started": True}


@app.get("/ai/search")
def ai_search(
    q: str,
    space: str = "normal",
    new_for_me: bool = False,
    genre: Optional[str] = None,
    genres: Optional[str] = None,
    format: Optional[str] = None,
    status: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    dub: Optional[bool] = None,
    dub_lang: Optional[str] = None,
    media_type: Optional[str] = None,
    watch_status: Optional[str] = None,
    seen: Optional[str] = None,
    favorite: Optional[str] = None,
    rating: Optional[int] = None,
    tags: Optional[str] = None,
    season: Optional[str] = None,
    country: Optional[str] = None,
    source: Optional[str] = None,
    studio: Optional[str] = None,
    limit: int = Query(20, le=50),
    x_h_password: Optional[str] = Header(None),
) -> dict:
    if space == "h" and not _h_ok(x_h_password):
        raise HTTPException(403, "gesperrt")
    problem = aiconf.check_ready()
    if problem:
        raise HTTPException(503, problem)
    # Semantische Suche GLEICHZEITIG mit den manuellen Filtern (genres/format/status/year/dub/seen/…)
    filters = dict(genre=genre, genres=genres, format=format, status=status,
                   year_min=year_min, year_max=year_max, dub=dub, dub_lang=dub_lang,
                   media_type=media_type, watch_status=watch_status, seen=seen,
                   favorite=favorite, rating=rating, tags=tags, season=season, country=country,
                   source=source, studio=studio)
    return {"query": q, "new_for_me": new_for_me,
            "results": emb.search(q, space=space, limit=limit, new_for_me=new_for_me, filters=filters)}


# ------------------------------------------------------------- Verfuegbarkeit
@app.get("/media/{media_id}/availability")
def media_availability(media_id: int) -> dict:
    m = repo.get_media(media_id)
    if not m:
        raise HTTPException(404, "nicht gefunden")
    return avail_mod.availability(m)


# ------------------------------------------------------------- Uebersetzung
@app.post("/translate/run")
def translate_run(limit: int = 50, space: Optional[str] = None) -> dict:
    if not ollama.has_model(ollama.TRANSLATE_MODEL):
        raise HTTPException(503, "Uebersetzungsmodell nicht geladen")
    return tr.translate_missing(limit, space)


# ----------------------------------------------- Export (Standard MAL-XML + JSON-Vollbackup)
from fastapi.responses import Response  # noqa: E402
import json as _json  # noqa: E402

_MAL_STATUS = {
    "watching": "Watching", "rewatching": "Watching", "completed": "Completed",
    "paused": "On-Hold", "dropped": "Dropped", "planning": "Plan to Watch",
}


def _export_rows() -> list:
    con = db.connect()
    try:
        return con.execute(
            "SELECT m.anilist_id, m.mal_id, m.title_romaji, m.title_english, m.title_de, "
            "u.rating, u.watch_status, u.progress, u.note, u.collection, u.favorite, u.favorite_order "
            "FROM media m JOIN user_entry u ON u.media_id=m.id "
            "WHERE m.space='normal' AND (u.watch_status<>'none' OR u.rating IS NOT NULL OR u.favorite=1)"
        ).fetchall()
    finally:
        con.close()


@app.get("/export/mal")
def export_mal() -> Response:
    """MAL-kompatibles XML — von AniList/Kitsu/Simkl/MAL importierbar (De-facto-Standard)."""
    parts = ['<?xml version="1.0" encoding="UTF-8"?>', "<myanimelist>",
             "  <myinfo><user_export_type>1</user_export_type></myinfo>"]
    for r in _export_rows():
        if not r["mal_id"] or (r["watch_status"] in (None, "none")):
            continue
        title = r["title_romaji"] or r["title_english"] or ""
        parts.append("  <anime>")
        parts.append(f"    <series_animedb_id>{r['mal_id']}</series_animedb_id>")
        parts.append(f"    <series_title><![CDATA[{title}]]></series_title>")
        parts.append(f"    <my_watched_episodes>{r['progress'] or 0}</my_watched_episodes>")
        parts.append(f"    <my_score>{r['rating'] or 0}</my_score>")
        parts.append(f"    <my_status>{_MAL_STATUS.get(r['watch_status'], 'Watching')}</my_status>")
        parts.append("    <update_on_import>1</update_on_import>")
        parts.append("  </anime>")
    parts.append("</myanimelist>")
    xml = "\n".join(parts)
    return Response(content=xml, media_type="application/xml",
                    headers={"Content-Disposition": "attachment; filename=orbitlist-mal.xml"})


@app.get("/export/json")
def export_json() -> Response:
    """Vollbackup inkl. Orbitlist-Felder (Notiz/Regal/Favorit) — die MAL-XML nicht abbildet."""
    from . import userdata
    data = userdata.export_dict()
    body = _json.dumps(data, ensure_ascii=False, indent=2)
    return Response(content=body, media_type="application/json",
                    headers={"Content-Disposition": "attachment; filename=orbitlist-backup.json"})


@app.post("/import")
async def import_user(request: Request) -> dict:
    """Nutzerdaten importieren: Orbitlist-JSON-Backup oder MAL-XML (Rohtext im Body)."""
    from . import userdata
    try:
        return userdata.import_text((await request.body()).decode("utf-8"))
    except Exception as e:
        raise HTTPException(400, f"Import fehlgeschlagen: {e}")


# ----------------------------------------------- Sammlung als Einkaufsliste (API-Facette)
@app.get("/collection/export")
def collection_export(status: str = "wish") -> dict:
    items = repo.list_media(space="normal", collection=status, limit=500)
    svcs = repo.list_services("anime")

    def links(m: dict) -> dict:
        q = m.get("title_romaji") or m.get("title") or ""
        return {s["name"]: s["url_schema"].replace("{q}", q) for s in svcs}

    return {
        "status": status,
        "count": len(items),
        "items": [
            {
                "title": m["title"],
                "year": m.get("season_year"),
                "rating": m.get("rating"),
                "dubbed_de": bool(m.get("dub_de")),
                "info_links": m.get("info_links"),
                "service_links": links(m),
            }
            for m in items
        ],
    }


# =================================================================== D/E (Gerüst + Stubs)
# --- Watch-Tracker: Ingest vom Browser (WebExtension) ---
class WatchEvent(BaseModel):
    source: str  # 'crunchyroll' | 'aniworld' | …
    serie: str
    staffel: Optional[int] = None
    folge: Optional[int] = None
    position_sec: Optional[float] = None
    playing: bool = True


@app.post("/watch")
def watch(ev: WatchEvent) -> dict:
    con = db.connect()
    try:
        row = con.execute(
            "SELECT id FROM media WHERE search_blob LIKE ? ORDER BY popularity DESC LIMIT 1",
            (f"%{ev.serie.lower()}%",),
        ).fetchone()
    finally:
        con.close()
    if row and ev.folge:
        repo.set_user_entry(row["id"], {"watch_status": "watching", "progress": ev.folge})
        return {"matched": True, "media_id": row["id"]}
    repo.meta_set("last_watch_unmatched", f"{ev.source}: {ev.serie} S{ev.staffel}E{ev.folge}")
    return {"matched": False, "note": "kein DB-Treffer (nachpflegbar)"}


# --- AniList-Export (Stub ohne Token) ---
@app.get("/sync/anilist/preview")
def sync_preview() -> dict:
    p = sync_anilist.preview()
    return {"count": len(p), "entries": p[:50]}


class AniImport(BaseModel):
    username: str


@app.post("/sync/anilist/import")
def anilist_import_run(body: AniImport) -> dict:
    """Zusatzdaten aus oeffentlichem AniList-Profil (tokenfrei). Ueberschreibt nie Status/Wertung."""
    try:
        return anilist_import.run(body.username.strip())
    except Exception as ex:
        raise HTTPException(502, f"AniList-Import fehlgeschlagen: {ex}")


@app.get("/sync/anilist/username")
def anilist_username() -> dict:
    return {"username": repo.meta_get("anilist_username")}


@app.post("/sync/anilist/run")
def sync_run() -> dict:
    return sync_anilist.run()


# --- Jellyfin-Tracker (Stub ohne Env) ---
@app.get("/tracker/jellyfin/now")
def jellyfin_now() -> dict:
    return jf.now_playing()


# --- Pairing: Backend erzeugt URL + Token fuer das Plugin ---
@app.get("/pair/info")
def pair_info() -> dict:
    tok = repo.meta_get("pair_token")
    if not tok:
        tok = secrets.token_urlsafe(18)
        repo.meta_set("pair_token", tok)
    return {"api_base": "http://<nexus-ip>:8787", "token": tok, "note": "Im Plugin eintragen (gleiches Netz / WireGuard)."}


# --- gebautes Frontend unter /app servieren (zum direkten Testen im Browser) ---
import os as _os
_PLUGIN_DIST = Path(_os.environ.get("ORBITLIST_UI") or Path(__file__).resolve().parent.parent.parent / "plugin" / "dist")
if _PLUGIN_DIST.exists():
    app.mount("/app", StaticFiles(directory=str(_PLUGIN_DIST), html=True), name="app")
