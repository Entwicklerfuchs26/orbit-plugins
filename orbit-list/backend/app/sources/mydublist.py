"""MyDubList (CC BY 4.0) — deutscher Dub-Status + ID-Mapping.

Attribution Pflicht: "Dub data (c) MyDubList - https://mydublist.com - (CC BY 4.0)".
Dub-Dateien fuehren MAL-IDs. Tier-Reihenfolge very-high..low (kumulativ).
"""
from __future__ import annotations

import json
from typing import Any

import httpx

BASE = "https://raw.githubusercontent.com/Joelis57/MyDubList/main/dubs/"
TIERS = ["very-high", "high", "normal", "low"]  # bestes zuerst
ATTRIBUTION = "Dub data © MyDubList - https://mydublist.com - (CC BY 4.0)"


def load_mappings(client: httpx.Client) -> tuple[dict[int, dict], dict[int, dict]]:
    """Liefert (anilist_id -> {mal,anisearch}, mal_id -> {anilist,anisearch})."""
    a2ids: dict[int, dict] = {}
    mal2ids: dict[int, dict] = {}
    r = client.get(BASE + "mappings/mappings_merged.jsonl", timeout=90)
    r.raise_for_status()
    for line in r.text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
        except Exception:
            continue
        mal, al, ani = o.get("mal_id"), o.get("anilist_id"), o.get("anisearch_id")
        if al is not None:
            a2ids[al] = {"mal": mal, "anisearch": ani}
        if mal is not None:
            mal2ids[mal] = {"anilist": al, "anisearch": ani}
    return a2ids, mal2ids


LANGS = [
    "german", "english", "spanish", "french", "italian", "portuguese", "japanese",
    "russian", "polish", "chinese", "korean", "arabic", "hungarian", "turkish", "dutch",
]


def load_all_dub_languages(client: httpx.Client, tier: str = "high") -> dict[int, list[str]]:
    """mal_id -> Liste Sprachen mit Dub (für den Mehrsprachen-Filter)."""
    mal_to_langs: dict[int, list[str]] = {}
    for lang in LANGS:
        try:
            r = client.get(f"{BASE}confidence/{tier}/dubbed_{lang}.json", timeout=60)
            r.raise_for_status()
            for mid in r.json().get("dubbed", []):
                mal_to_langs.setdefault(int(mid), []).append(lang)
        except Exception:
            continue
    return mal_to_langs


def load_dub_tiers(client: httpx.Client) -> dict[int, str]:
    """mal_id -> bester (hoechster) Tier, in dem der Titel als dt.-synchronisiert gilt."""
    tier_of: dict[int, str] = {}
    for t in TIERS:
        try:
            r = client.get(f"{BASE}confidence/{t}/dubbed_german.json", timeout=90)
            r.raise_for_status()
            ids = r.json().get("dubbed", [])
        except Exception:
            ids = []
        for mid in ids:
            tier_of.setdefault(int(mid), t)  # erstes (bestes) gewinnt
    return tier_of
