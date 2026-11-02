"""Import-Pipeline: AniList-Metadaten + MyDubList-Dub-Status + Jikan/MAL-H-Daten."""
from __future__ import annotations

import datetime

import httpx

from .db import repo
from .sources import anilist, jikan, mydublist


def build_info_links(anilist_id, mal_id, anisearch_id) -> dict:
    links = {}
    if anilist_id:
        links["anilist"] = f"https://anilist.co/anime/{anilist_id}"
    if mal_id:
        links["mal"] = f"https://myanimelist.net/anime/{mal_id}"
    if anisearch_id:
        links["anisearch"] = f"https://www.anisearch.com/anime/{anisearch_id}"
    return links


def _apply_dub(m: dict, a2ids: dict, tier_of: dict, mal2ids: dict) -> None:
    mal = m.get("mal_id")
    ani = a2ids.get(m.get("anilist_id"), {}) if m.get("anilist_id") else {}
    info = mal2ids.get(mal, {}) if mal else {}
    if not m.get("anilist_id"):
        m["anilist_id"] = info.get("anilist")
    anisearch = m.get("anisearch_id") or ani.get("anisearch") or info.get("anisearch")
    m["anisearch_id"] = anisearch
    tier = tier_of.get(mal) if mal else None
    m["dub_de"] = 1 if tier else 0
    m["dub_tier"] = tier
    m["info_links"] = build_info_links(m.get("anilist_id"), mal, anisearch)


def run(pages_anilist: int = 500, hentai_pages: int = 40) -> dict:
    """Voll-Import, STREAMEND (speichert pro Seite → überlebt Abbrüche, zeigt Fortschritt)."""
    with httpx.Client(headers={"User-Agent": "anime-liste/0.1 (+local, private)"}) as client:
        print("MyDubList: Mappings + Dub-Tiers laden …", flush=True)
        a2ids, mal2ids = mydublist.load_mappings(client)
        tier_of = mydublist.load_dub_tiers(client)
        print(f"  {len(a2ids)} AniList-Mappings, {len(tier_of)} deutsche Dubs", flush=True)

        print("AniList: Voll-Katalog streamend importieren (Jahr-Sharding) …", flush=True)
        n = 0
        for page in anilist.iter_all(client):
            for m in page:
                _apply_dub(m, a2ids, tier_of, mal2ids)
                repo.upsert_media(m)
            n += len(page)
            if n % 500 < 50:
                print(f"  Anime {n}", flush=True)

        print("H-Datenraum (AniList isAdult; Jikan IPv6-only) streamend …", flush=True)
        hn = 0
        for page in anilist.iter_adult(client, pages=hentai_pages):
            for m in page:
                _apply_dub(m, a2ids, tier_of, mal2ids)
                repo.upsert_media(m)
            hn += len(page)
            print(f"  H {hn}", flush=True)
        repo.meta_set("h_source", "anilist")

    repo.meta_set("last_import", datetime.datetime.now().isoformat(timespec="seconds"))
    repo.meta_set("dub_attribution", mydublist.ATTRIBUTION)
    stats = {"anime": repo.count(space="normal"), "h": repo.count(space="h")}
    print(f"Import fertig: {stats}", flush=True)
    return stats


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=4, help="AniList-Seiten à 50")
    ap.add_argument("--hentai-pages", type=int, default=2)
    args = ap.parse_args()
    run(args.pages, args.hentai_pages)
