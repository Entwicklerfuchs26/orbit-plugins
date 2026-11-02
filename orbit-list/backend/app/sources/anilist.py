"""AniList GraphQL — Metadaten-Quelle.

AniList kappt Offset-Paginierung bei ~5000 Ergebnissen pro Abfrage (Seite 100 → HTTP 400).
Darum: Voll-Katalog per **Jahr-Sharding** (seasonYear) + ein Populär-Sweep für Titel ohne
seasonYear. 400 wird als „Shard zu Ende" behandelt, nicht als Crash.
"""
from __future__ import annotations

import time
from typing import Any

import httpx

ENDPOINT = "https://graphql.anilist.co"

_FIELDS = """
      id
      idMal
      title { romaji english native }
      synonyms
      format status episodes seasonYear genres
      averageScore popularity isAdult
      coverImage { extraLarge large color }
      bannerImage
      description(asHtml: false)
"""

QUERY = f"""
query ($page: Int, $perPage: Int, $year: Int) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{ hasNextPage }}
    media(type: ANIME, isAdult: false, seasonYear: $year, sort: POPULARITY_DESC) {{ {_FIELDS} }}
  }}
}}
"""

QUERY_ADULT = f"""
query ($page: Int, $perPage: Int, $year: Int) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{ hasNextPage }}
    media(type: ANIME, isAdult: true, genre_in: ["Hentai"], seasonYear: $year, sort: POPULARITY_DESC) {{ {_FIELDS} }}
  }}
}}
"""


def _normalize(m: dict[str, Any], space: str = "normal") -> dict[str, Any]:
    t = m.get("title") or {}
    cover = m.get("coverImage") or {}
    return {
        "space": space,
        "media_type": "anime",
        "anilist_id": m.get("id"),
        "mal_id": m.get("idMal"),
        "title_romaji": t.get("romaji"),
        "title_english": t.get("english"),
        "title_native": t.get("native"),
        "synonyms": m.get("synonyms") or [],
        "format": m.get("format"),
        "status": m.get("status"),
        "episodes": m.get("episodes"),
        "season_year": m.get("seasonYear"),
        "genres": m.get("genres") or [],
        "is_adult": 1 if m.get("isAdult") else 0,
        "popularity": m.get("popularity"),
        "average_score": m.get("averageScore"),
        "cover_url": cover.get("extraLarge") or cover.get("large"),
        "banner_url": m.get("bannerImage"),
        "color": cover.get("color"),
        "description_en": m.get("description"),
    }


def _pages(client: httpx.Client, query: str, base_vars: dict, per_page: int = 50, max_pages: int = 100, space: str = "normal"):
    """Paginiert eine Query; bricht sauber ab bei 400 (AniList-Limit), leerem Resultat oder Ende."""
    for p in range(1, max_pages + 1):
        r = None
        for _ in range(4):
            r = client.post(ENDPOINT, json={"query": query, "variables": {**base_vars, "page": p, "perPage": per_page}}, timeout=60)
            if r.status_code == 429:
                time.sleep(int(r.headers.get("Retry-After", "60")))
                continue
            break
        if r is None or r.status_code >= 400:
            break  # 400 = Paginierungs-Limit erreicht → Shard zu Ende
        data = (r.json().get("data") or {}).get("Page")
        if not data:
            break
        yield [_normalize(m, space) for m in data["media"]]
        if not data["pageInfo"]["hasNextPage"]:
            break
        time.sleep(2.1)


def iter_all(client: httpx.Client, start_year: int = 2027, end_year: int = 1940, per_page: int = 50):
    """Voll-Katalog: pro Jahr (je < 5000, kein Limit-Crash) + Populär-Sweep für Titel ohne seasonYear."""
    for year in range(start_year, end_year - 1, -1):
        yield from _pages(client, QUERY, {"year": year}, per_page, max_pages=100)
    yield from _pages(client, QUERY, {"year": None}, per_page, max_pages=100)  # populär, inkl. ohne Jahr


def iter_adult(client: httpx.Client, pages: int = 100, per_page: int = 50):
    """H: AniList isAdult + Genre Hentai (Jikan ist IPv6-only)."""
    yield from _pages(client, QUERY_ADULT, {"year": None}, per_page, max_pages=pages, space="h")


QUERY_IDS = f"""
query ($ids: [Int], $perPage: Int) {{
  Page(perPage: $perPage) {{
    media(id_in: $ids, type: ANIME) {{ {_FIELDS} }}
  }}
}}
"""


def fetch_by_ids(client: httpx.Client, ids: list[int], per_page: int = 50) -> list[dict[str, Any]]:
    """Holt konkrete Anime per AniList-ID (für fehlende Titel aus dem Export)."""
    out: list[dict[str, Any]] = []
    for i in range(0, len(ids), per_page):
        chunk = ids[i : i + per_page]
        r = None
        for _ in range(4):
            r = client.post(ENDPOINT, json={"query": QUERY_IDS, "variables": {"ids": chunk, "perPage": per_page}}, timeout=60)
            if r.status_code == 429:
                time.sleep(int(r.headers.get("Retry-After", "60")))
                continue
            break
        if r is None or r.status_code >= 400:
            continue
        data = (r.json().get("data") or {}).get("Page") or {}
        out.extend(_normalize(m) for m in data.get("media", []))
        time.sleep(2.1)
    return out


# ---- Kompatibilität: einfache Listen-Varianten (für kleine Importe/Tests) ----
def fetch_popular(client: httpx.Client, pages: int = 4, per_page: int = 50) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for page in _pages(client, QUERY, {"year": None}, per_page, max_pages=pages):
        out.extend(page)
    return out


def fetch_adult(client: httpx.Client, pages: int = 2, per_page: int = 50) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for page in iter_adult(client, pages=pages, per_page=per_page):
        out.extend(page)
    return out
