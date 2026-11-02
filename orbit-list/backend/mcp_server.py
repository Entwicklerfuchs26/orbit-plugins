"""MCP-Server `fuchs-orbitlist` — Lesen + Schreiben, inkl. semantischer KI-Suche mit Filtern.

Duenne Schicht ueber die lokale REST-API (ORBITLIST_API, Default http://127.0.0.1:8787),
damit Filter-/Suchlogik nur an EINER Stelle lebt. Der H-Raum wird bewusst NICHT exponiert.
Start (stdio):  .venv/bin/python mcp_server.py
"""
from __future__ import annotations

import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

API = os.environ.get("ORBITLIST_API", "http://127.0.0.1:8787").rstrip("/")
mcp = FastMCP("fuchs-orbitlist")

_FILTERS = ("tags", "season", "country", "source", "studio", "genre", "genres", "format", "status", "year_min", "year_max", "dub", "dub_lang",
            "media_type", "watch_status", "seen", "favorite", "rating")


def _call(method: str, path: str, **kw):
    if os.environ.get("ORBITLIST_KEY"):
        kw.setdefault("headers", {})["X-Orbitlist-Key"] = os.environ["ORBITLIST_KEY"]
    r = httpx.request(method, API + path, timeout=60, **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"{r.status_code}: {r.text[:300]}")
    return r.json()


def _slim(m: dict) -> dict:
    keys = ("id", "title", "title_de", "format", "year", "status", "genres", "episodes",
            "score", "rating", "watch_status", "progress", "favorite", "_distance")
    return {k: m[k] for k in keys if k in m and m[k] is not None}


def _filters(**kw) -> dict:
    return {k: v for k, v in kw.items() if v is not None and k in _FILTERS}


@mcp.tool()
def orbit_search(
    query: str,
    semantic: bool = True,
    genres: Optional[str] = None,
    format: Optional[str] = None,
    status: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    watch_status: Optional[str] = None,
    seen: Optional[str] = None,
    favorite: Optional[str] = None,
    rating: Optional[int] = None,
    media_type: Optional[str] = None,
    tags: Optional[str] = None,
    season: Optional[str] = None,
    studio: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """Sucht in der Orbitlist. semantic=True: KI-Suche (Bedeutung, z.B. 'melancholischer Sci-Fi-Roadtrip'),
    sonst Titelsuche. Filter wirken IMMER zusätzlich. genres/tags kommasepariert; season=WINTER|SPRING|SUMMER|FALL; studio=Name. seen='1'/'0' (gesehen/nicht gesehen).
    watch_status: watching|completed|rewatching|paused|dropped|planning."""
    f = _filters(genres=genres, format=format, status=status, year_min=year_min, year_max=year_max,
                 watch_status=watch_status, seen=seen, favorite=favorite, rating=rating,
                 media_type=media_type, tags=tags, season=season, studio=studio)
    if semantic:
        res = _call("GET", "/ai/search", params={"q": query, "limit": min(limit, 50), **f})
        return [_slim(m) for m in res["results"]]
    res = _call("GET", "/anime", params={"q": query, "limit": limit, **f})
    return [_slim(m) for m in res["items"]]


@mcp.tool()
def orbit_list(
    watch_status: Optional[str] = None,
    genres: Optional[str] = None,
    favorite: Optional[str] = None,
    seen: Optional[str] = None,
    sort: str = "popularity",
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Listet Titel (Standard-Config) mit Filtern, z.B. watch_status='watching' für 'Beobachten'."""
    f = _filters(watch_status=watch_status, genres=genres, favorite=favorite, seen=seen)
    res = _call("GET", "/anime", params={"sort": sort, "limit": limit, "offset": offset, **f})
    return {"total": res["total"], "items": [_slim(m) for m in res["items"]]}


@mcp.tool()
def orbit_get(media_id: int) -> dict:
    """Vollständige Details zu einem Titel inkl. eigener Wertung/Fortschritt."""
    return _call("GET", f"/anime/{media_id}")


@mcp.tool()
def orbit_filters(media_type: Optional[str] = None) -> dict:
    """Verfügbare Filterwerte (Genres, Formate, …) der Config."""
    p = {"media_type": media_type} if media_type else {}
    return _call("GET", "/meta/filters", params=p)


@mcp.tool()
def orbit_stats() -> dict:
    """Profil-Statistik: Anzahl je Status, Ø-Wertung, Tage etc."""
    return _call("GET", "/profile/stats")


def _patch(media_id: int, body: dict) -> dict:
    return _call("PATCH", f"/media/{media_id}/entry", json=body)


@mcp.tool()
def orbit_rate(media_id: int, rating: int) -> dict:
    """Setzt die eigene Wertung (Skala der Orbitlist, i.d.R. 1–10)."""
    return _patch(media_id, {"rating": rating})


@mcp.tool()
def orbit_set_status(media_id: int, watch_status: str) -> dict:
    """Setzt den Listenstatus: watching|completed|rewatching|paused|dropped|planning."""
    return _patch(media_id, {"watch_status": watch_status})


@mcp.tool()
def orbit_set_progress(media_id: int, progress: int) -> dict:
    """Setzt die gesehene Folgenzahl."""
    return _patch(media_id, {"progress": progress})


@mcp.tool()
def orbit_favorite(media_id: int, favorite: bool = True) -> dict:
    """Setzt/entfernt das ♥ Favorit."""
    return _patch(media_id, {"favorite": 1 if favorite else 0})


@mcp.tool()
def orbit_note(media_id: int, note: str) -> dict:
    """Setzt die persönliche Notiz zu einem Titel."""
    return _patch(media_id, {"note": note})


if __name__ == "__main__":
    mcp.run()
