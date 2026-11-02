"""Smoke-Test: prüft die LAUFENDE API gegen erwartetes Verhalten. Exit != 0 bei Fehler.

Kern des selbstverifizierenden Workflows: statt manuell durchklicken einmal
`./.venv/bin/python smoke_test.py` — grün = alles tut noch, was es soll.
Nach jeder Änderung ausführen (oder per git pre-commit / watch).
"""
from __future__ import annotations

import sys

import httpx

B = "http://127.0.0.1:8787"
fails: list[str] = []


def check(name: str, cond: bool, got: object = "") -> None:
    print(f"{'✓' if cond else '✗'} {name}" + ("" if cond else f"   → {got!r}"))
    if not cond:
        fails.append(name)


try:
    h = httpx.get(f"{B}/health", timeout=10).json()
    check("health=ok", h.get("status") == "ok", h)
    check(">=200 Anime importiert", h.get("media_normal", 0) >= 200, h.get("media_normal"))
    check(">=50 H-Titel", h.get("media_h", 0) >= 50, h.get("media_h"))

    a = httpx.get(f"{B}/anime", params={"genre": "Action"}, timeout=10).json()
    check("Genre-Filter liefert Treffer", a["total"] > 0, a["total"])
    check("Felder Titel/Cover/dub_de da", all(k in a["items"][0] for k in ("title", "cover_url", "dub_de")))

    s = httpx.get(f"{B}/anime", params={"q": "shingeki"}, timeout=10).json()
    check("Findbarkeit shingeki→Titan", any("Titan" in (i.get("title") or "") for i in s["items"]))

    ai = httpx.get(f"{B}/ai/search", params={"q": "a notebook that kills anyone whose name is written"}, timeout=40).json()
    titles = [r["title"] for r in ai.get("results", [])]
    check("KI-Suche → Death Note", any("Death Note" in t for t in titles), titles)

    ai2 = httpx.get(f"{B}/ai/search", params={"q": "overpowered hero who defeats every enemy with one punch"}, timeout=40).json()
    check("KI-Suche → One-Punch Man", any("One-Punch" in r["title"] or "One Punch" in r["title"] for r in ai2.get("results", [])),
          [r["title"] for r in ai2.get("results", [])])

    check("H gesperrt ohne Passwort", httpx.get(f"{B}/h").status_code == 403)

    # --- Medientyp-Configs (M2) ---
    mt_pub = httpx.get(f"{B}/media-types", timeout=10).json()
    slugs_pub = {m["slug"] for m in mt_pub}
    check("media-types: Anime da (ohne Passwort)", "anime" in slugs_pub, slugs_pub)
    check("media-types: KEIN H ohne Passwort (kein Leak)", "h" not in slugs_pub and not any(m["hidden"] for m in mt_pub), slugs_pub)
    check("DELETE anime → 409 (Default nicht löschbar)", httpx.delete(f"{B}/media-types/anime").status_code == 409)
    httpx.put(f"{B}/media-types/active", json={"slug": "manga"}, timeout=10)
    check("aktiver Typ roundtrip (manga)", httpx.get(f"{B}/media-types/active").json().get("slug") == "manga")
    httpx.put(f"{B}/media-types/active", json={"slug": "anime"}, timeout=10)
    check("/anime?media_type=anime antwortet", httpx.get(f"{B}/anime", params={"media_type": "anime", "limit": 1}).status_code == 200)

    httpx.post(f"{B}/h/password", json={"password": "smoke-test-pw"}, timeout=10)
    HP = {"x-h-password": "smoke-test-pw"}
    hh = httpx.get(f"{B}/h", headers=HP, timeout=10)
    check("H entsperrt mit Passwort", hh.status_code == 200 and hh.json().get("total", 0) > 0)
    check("H bleibt gesperrt mit falschem Passwort", httpx.get(f"{B}/h", headers={"x-h-password": "falsch"}).status_code == 403)
    mt_priv = httpx.get(f"{B}/media-types", headers=HP, timeout=10).json()
    check("media-types MIT Passwort: H sichtbar", any(m["slug"] == "h" for m in mt_priv), [m["slug"] for m in mt_priv])
    httpx.put(f"{B}/media-types/active", json={"slug": "h"}, headers=HP, timeout=10)
    check("aktiver Typ wird NICHT auf H persistiert (kein Reload-Leak)",
          httpx.get(f"{B}/media-types/active").json().get("slug") != "h")
    httpx.post(f"{B}/h/reset", timeout=10)  # Testzustand zurücksetzen → App startet für Jonas unkonfiguriert

    # --- Stats + Meine-Liste (M3/M4) ---
    sg = httpx.get(f"{B}/stats/genres", timeout=10).json()
    check("/stats/genres ranked (Count/MeanScore/Hours)", len(sg.get("items", [])) > 0 and "mean_score" in sg["items"][0], sg.get("items", [])[:1])
    la = httpx.get(f"{B}/anime", params={"watch_status": "all", "limit": 1}, timeout=10).json()
    check("Meine-Liste 'Alle' (watch_status=all)", la["total"] > 0, la.get("total"))
    pf2 = httpx.get(f"{B}/profile/stats", timeout=10).json()
    check("profile_stats erweitert (days_planned/std_dev/episode_dist)",
          all(k in pf2 for k in ("days_planned", "std_dev", "episode_dist", "hours_by_score")), list(pf2.keys()))

    # --- Neue Filter: gesehen/nicht gesehen + KI mit Filter gleichzeitig + per-Config-Meta ---
    sy = httpx.get(f"{B}/anime", params={"seen": "yes", "limit": 1}, timeout=10).json()
    sn = httpx.get(f"{B}/anime", params={"seen": "no", "limit": 1}, timeout=10).json()
    check("Filter gesehen/nicht gesehen trennt", sy["total"] > 0 and sn["total"] > sy["total"], (sy["total"], sn["total"]))
    mf2 = httpx.get(f"{B}/meta/filters", params={"space": "normal"}, timeout=10).json()
    check("Filter-Meta liefert Genres pro Config", len(mf2.get("genres", [])) > 0, mf2.get("genres", [])[:3])
    aif = httpx.get(f"{B}/ai/search", params={"q": "girl with a sword", "genres": "Action", "limit": 5}, timeout=40).json()
    res = aif.get("results", [])
    check("KI-Suche + Filter gleichzeitig (nur Action)", len(res) > 0 and all("Action" in (r.get("genres") or []) for r in res),
          [(r["title"], r.get("genres")) for r in res[:3]])
    svc = httpx.get(f"{B}/services", params={"config": "anime"}, timeout=10).json()
    check("Dienste pro Config (anime)", len(svc) > 0, [s["name"] for s in svc])

    sp = httpx.get(f"{B}/sync/anilist/preview", timeout=10).json()
    check("AniList-Sync-Preview antwortet", "count" in sp, sp)

    av = httpx.get(f"{B}/media/1/availability", timeout=10).json()
    check("Verfügbarkeit liefert dub + synchronkartei-link", "dubbed_de" in av and "synchronkartei_search" in av)

    pf = httpx.get(f"{B}/profile/stats", timeout=10).json()
    check("Profil-Statistik", pf.get("total", 0) >= 0 and "by_status" in pf)
    mf = httpx.get(f"{B}/meta/filters", timeout=10).json()
    check("Filter-Metadaten (Formate)", len(mf.get("formats", [])) > 0, mf)
    mg = httpx.get(f"{B}/anime", params={"genres": "Action,Fantasy", "format": "TV", "year_min": 2015}, timeout=10).json()
    check("Mehrfach-Filter (Genres+Format+Jahr)", mg["total"] > 0, mg.get("total"))

    app_ = httpx.get(f"{B}/app/", timeout=10)
    check("UI unter /app erreichbar", app_.status_code == 200 and "text/html" in app_.headers.get("content-type", ""))
except Exception as e:  # pragma: no cover
    check("Backend erreichbar", False, e)

print()
if fails:
    print(f"❌ {len(fails)} FEHLER: {', '.join(fails)}")
    sys.exit(1)
print("✅ ALLE GRÜN — App verhält sich wie erwartet.")
sys.exit(0)
