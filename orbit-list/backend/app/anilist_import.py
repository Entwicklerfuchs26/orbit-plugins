"""AniList → eigene DB: Zusatzdaten aus dem OEFFENTLICHEN Profil (kein Token noetig).

Reichert vorhandene Titel an (Tags, Studios, Saison, Land, Quelle, naechste Folge) und uebernimmt
Start-/Enddatum, Rewatches und Favoriten. Ueberschreibt NIE Status/Wertung/Fortschritt.
Nur space='normal' (H wird nie angefasst).
"""
from __future__ import annotations

import json

import httpx

from .db import connect

ENDPOINT = "https://graphql.anilist.co"
LIST_Q = """
query ($u: String) {
  MediaListCollection(userName: $u, type: ANIME) { lists { entries {
    repeat startedAt{year month day} completedAt{year month day}
    media { id season countryOfOrigin source
      tags { name rank isGeneralSpoiler isMediaSpoiler }
      studios { nodes { name isAnimationStudio } }
      nextAiringEpisode { episode airingAt } } } } }
}"""
FAV_Q = """
query ($u: String, $p: Int) {
  User(name: $u) { favourites { anime(page: $p, perPage: 25) { pageInfo { hasNextPage } nodes { id } } } }
}"""


def _post(q: str, v: dict) -> dict:
    r = httpx.post(ENDPOINT, json={"query": q, "variables": v}, timeout=60)
    r.raise_for_status()
    d = r.json()
    if d.get("errors"):
        raise RuntimeError(d["errors"][0].get("message", "AniList-Fehler"))
    return d["data"]


def _date(d: dict | None) -> str | None:
    if not d or not d.get("year"):
        return None
    return f"{d['year']:04d}-{(d.get('month') or 1):02d}-{(d.get('day') or 1):02d}"


def run(username: str) -> dict:
    lists = _post(LIST_Q, {"u": username})["MediaListCollection"]["lists"]
    favs: list[int] = []
    page = 1
    while True:
        a = _post(FAV_Q, {"u": username, "p": page})["User"]["favourites"]["anime"]
        favs += [n["id"] for n in a["nodes"]]
        if not a["pageInfo"]["hasNextPage"]:
            break
        page += 1

    con = connect()
    ids = {r["anilist_id"]: r["id"] for r in con.execute(
        "SELECT id, anilist_id FROM media WHERE space='normal' AND anilist_id IS NOT NULL")}
    enriched = missing = 0
    seen: set[int] = set()
    for lst in lists:
        for e in lst["entries"]:
            m = e["media"]
            mid = ids.get(m["id"])
            if mid is None:
                missing += 1
                continue
            if m["id"] in seen:
                continue
            seen.add(m["id"])
            tags = [t["name"] for t in (m.get("tags") or [])
                    if t["rank"] >= 50 and not t["isGeneralSpoiler"] and not t["isMediaSpoiler"]]
            studios = list(dict.fromkeys(s["name"] for s in (m.get("studios") or {}).get("nodes", []) if s["isAnimationStudio"]))
            na = m.get("nextAiringEpisode") or {}
            con.execute(
                "UPDATE media SET tags=?, studios=?, season=?, country=?, source=?, "
                "next_airing_ep=?, next_airing_at=? WHERE id=?",
                (json.dumps(tags), json.dumps(studios), m.get("season"), m.get("countryOfOrigin"),
                 m.get("source"), na.get("episode"), na.get("airingAt"), mid))
            con.execute("INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)", (mid,))
            con.execute("UPDATE user_entry SET started_at=?, completed_at=?, rewatches=? WHERE media_id=?",
                        (_date(e.get("startedAt")), _date(e.get("completedAt")), e.get("repeat") or 0, mid))
            enriched += 1

    # Favoriten: vorhandene lokale Rangfolge bleibt; fehlende werden hinten angehaengt.
    have = con.execute("SELECT COUNT(*) c FROM user_entry WHERE favorite=1").fetchone()["c"]
    nxt = (con.execute("SELECT COALESCE(MAX(favorite_order),-1)+1 n FROM user_entry WHERE favorite=1").fetchone()["n"])
    fav_new = 0
    for i, aid in enumerate(favs):
        mid = ids.get(aid)
        if mid is None:
            continue
        con.execute("INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)", (mid,))
        cur = con.execute("SELECT favorite FROM user_entry WHERE media_id=?", (mid,)).fetchone()
        if cur["favorite"]:
            continue
        order = i if have == 0 else nxt
        nxt += 1
        con.execute("UPDATE user_entry SET favorite=1, favorite_order=? WHERE media_id=?", (order, mid))
        fav_new += 1
    con.execute("INSERT OR REPLACE INTO meta_kv (key, value) VALUES ('anilist_username', ?)", (username,))
    con.commit()
    con.close()
    return {"status": "ok", "enriched": enriched, "not_in_catalog": missing,
            "favorites_on_anilist": len(favs), "favorites_added": fav_new}
