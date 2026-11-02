"""Füllt media.dub_languages aus MyDubLists Sprach-Dateien (für den Mehrsprachen-Filter).
Schnell: lädt nur die Dub-Listen (keine AniList-Calls), updatet per mal_id."""
from __future__ import annotations

import json

import httpx

from .db import connect
from .sources import mydublist


def run() -> dict:
    with httpx.Client(headers={"User-Agent": "orbitlist/0.1 (+local)"}) as client:
        mal_to_langs = mydublist.load_all_dub_languages(client)
    con = connect()
    try:
        rows = con.execute("SELECT id, mal_id FROM media WHERE mal_id IS NOT NULL").fetchall()
        n = 0
        for r in rows:
            langs = mal_to_langs.get(r["mal_id"])
            if langs:
                con.execute("UPDATE media SET dub_languages=? WHERE id=?", (json.dumps(langs), r["id"]))
                n += 1
        con.commit()
    finally:
        con.close()
    langs_seen = sorted({l for v in mal_to_langs.values() for l in v})
    print(f"populate_langs fertig: {n} Titel, Sprachen: {langs_seen}", flush=True)
    return {"updated": n, "languages": langs_seen}


if __name__ == "__main__":
    run()
