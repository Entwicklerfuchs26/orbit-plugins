"""Verfuegbarkeit: dt. Synchro-Historie (MyDubList = Wahrheit, Synchronkartei-Link) +
'wo legal' via TMDB (offiziell; Stub ohne Key). JustWatch bewusst NICHT (AGB)."""
from __future__ import annotations

import os
from urllib.parse import quote

import httpx


def synchronkartei_search(title: str) -> str:
    return f"https://www.synchronkartei.de/?q={quote(title)}"


def tmdb_providers(title: str) -> dict:
    key = os.environ.get("TMDB_API_KEY")
    if not key:
        return {"status": "stub", "note": "TMDB_API_KEY nicht gesetzt — braucht Jonas' Key", "providers": []}
    try:
        s = httpx.get(
            "https://api.themoviedb.org/3/search/tv",
            params={"api_key": key, "query": title, "language": "de-DE"},
            timeout=20,
        ).json()
        if not s.get("results"):
            return {"status": "ok", "providers": []}
        tid = s["results"][0]["id"]
        wp = httpx.get(
            f"https://api.themoviedb.org/3/tv/{tid}/watch/providers", params={"api_key": key}, timeout=20
        ).json()
        de = (wp.get("results") or {}).get("DE") or {}
        provs = []
        for kind in ("flatrate", "buy", "rent"):
            for p in de.get(kind, []):
                provs.append({"name": p.get("provider_name"), "type": kind})
        return {"status": "ok", "link": de.get("link"), "providers": provs}
    except Exception as e:
        return {"status": "error", "note": str(e), "providers": []}


def availability(m: dict) -> dict:
    title = m.get("title_english") or m.get("title_romaji") or m.get("title") or ""
    return {
        "dubbed_de": bool(m.get("dub_de")),
        "dub_tier": m.get("dub_tier"),
        "dub_source": "MyDubList (CC BY 4.0)",
        "synchronkartei_search": synchronkartei_search(title),
        "legal": tmdb_providers(title),
    }
