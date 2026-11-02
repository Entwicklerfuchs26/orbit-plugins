"""Jellyfin-Tracker (REST). Braucht JELLYFIN_URL + JELLYFIN_TOKEN (API-Key).

AniList-ID kommt aus ProviderIds der SERIE (AniO schreibt sie als NFO-uniqueid).
STUB ohne Env. Jonas-Block: API-Key im Jellyfin-Dashboard anlegen → Secret.
"""
from __future__ import annotations

import os

import httpx


def _cfg() -> tuple[str | None, str | None]:
    return os.environ.get("JELLYFIN_URL"), os.environ.get("JELLYFIN_TOKEN")


def now_playing() -> dict:
    url, tok = _cfg()
    if not (url and tok):
        return {"status": "stub", "note": "JELLYFIN_URL/JELLYFIN_TOKEN nicht gesetzt — Jonas: API-Key anlegen"}
    h = {"Authorization": f'MediaBrowser Token="{tok}"'}
    try:
        sessions = httpx.get(f"{url}/Sessions", headers=h, timeout=15).json()
    except Exception as e:
        return {"status": "error", "note": repr(e)}
    out = []
    for s in sessions:
        npi = s.get("NowPlayingItem")
        if not npi:
            continue
        anilist = None
        sid = npi.get("SeriesId")
        if sid:
            try:
                item = httpx.get(f"{url}/Items/{sid}", headers=h, params={"Fields": "ProviderIds"}, timeout=15).json()
                pids = {k.lower(): v for k, v in (item.get("ProviderIds") or {}).items()}
                anilist = pids.get("anilist")
            except Exception:
                pass
        out.append({
            "series": npi.get("SeriesName"),
            "season": npi.get("ParentIndexNumber"),
            "episode": npi.get("IndexNumber"),
            "anilist_id": anilist,
            "paused": (s.get("PlayState") or {}).get("IsPaused"),
        })
    return {"status": "ok", "playing": out}
