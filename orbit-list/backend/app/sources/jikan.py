"""Jikan (MyAnimeList) — Quelle fuer den H-Datenraum (AniList hat H praktisch nicht).

rating=rx = Hentai. Read-only, frei. Rate-Limit ~3/s, 60/min -> sleep.
"""
from __future__ import annotations

import time
from typing import Any

import httpx

BASE = "https://api.jikan.moe/v4"


def _normalize(m: dict[str, Any]) -> dict[str, Any]:
    images = (m.get("images") or {}).get("jpg") or {}
    syn = [t.get("title") for t in (m.get("titles") or []) if t.get("title")]
    return {
        "space": "h",
        "media_type": "anime",
        "mal_id": m.get("mal_id"),
        "title_romaji": m.get("title"),
        "title_english": m.get("title_english"),
        "title_native": m.get("title_japanese"),
        "synonyms": syn or (m.get("title_synonyms") or []),
        "format": m.get("type"),
        "status": m.get("status"),
        "episodes": m.get("episodes"),
        "season_year": m.get("year"),
        "genres": [g.get("name") for g in (m.get("genres") or []) if g.get("name")],
        "is_adult": 1,
        "popularity": (m.get("members") or 0),
        "average_score": int((m.get("score") or 0) * 10) if m.get("score") else None,
        "cover_url": images.get("large_image_url") or images.get("image_url"),
        "description_en": m.get("synopsis"),
    }


def fetch_hentai(client: httpx.Client, pages: int = 2, limit: int = 25) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for p in range(1, pages + 1):
        r = None
        for attempt in range(2):
            try:
                r = client.get(
                    f"{BASE}/anime",
                    params={"rating": "rx", "order_by": "members", "sort": "desc", "page": p, "limit": limit},
                    timeout=8,
                )
            except httpx.TransportError as e:  # Connect/Read-Timeout etc. (Jikan ist IPv6-only)
                print(f"  Jikan Netzfehler ({e!r}), Versuch {attempt + 1}/2 …", flush=True)
                continue
            if r.status_code == 429:
                time.sleep(3)
                continue
            r.raise_for_status()
            break
        if r is None or r.status_code != 200:
            raise httpx.TransportError(f"Jikan Seite {p} nach Retries nicht erreichbar")
        out.extend(_normalize(m) for m in r.json().get("data", []))
        time.sleep(1)  # Jikan-Rate-Limit
    return out
