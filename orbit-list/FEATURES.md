# Anime-Liste — Testliste & Status

**Build-Nacht 01.11.2026.** A–D autonom gebaut + jeweils laufend verifiziert.

## Starten (ein Befehl — läuft evtl. schon)
```bash
cd ~/projects/anime-liste/backend && ./run.sh
```
Dann im Browser: **http://127.0.0.1:8787/app/**
(Läuft der Dienst schon aus der Build-Nacht, reicht die URL.)

---

## Testliste (kompakt, ~5 Min — abhaken: `[x]`)

### 1 · Oberfläche & Browsen
- [ ] Seite öffnet im AniList-Look, Grid aus Cover-Karten, ~13.000 Titel; runterscrollen lädt nach (Infinite-Scroll).
- [ ] Oben rechts Ansicht umschalten (Grid ↔ Liste) — Karten werden zu Zeilen.
- [ ] Cover zeigen DE-Badge (dt. Dub), Prozent-Score; manche ★-Wertung/Regal-Icon.

### 2 · Detail, Bewerten, Ins Regal
- [ ] Karte anklicken → Panel rechts: Banner, alle Titel (inkl. japanisch), Genres, „Deutscher Dub (Tier)".
- [ ] Wertung 1–10 klicken → bleibt; Status wählen; „Ins Regal" → Wunsch/Im Regal.
- [ ] „Im Regal" → Feld „Verliehen an" erscheint; Notiz eintippen.
- [ ] Panel schließen, Karte zeigt jetzt Wertung/Regal-Badge.

### 3 · Suche & Filter
- [ ] Suche „shingeki" → findet Attack on Titan (Titelvarianten!). „one punch" → One-Punch Man.
- [ ] Genre-Chip (z.B. Fantasy) filtert; „DE"-Knopf oben → nur mit dt. Dub.
- [ ] Sortierung (Beliebtheit/Wertung/Titel) + Sammlung-Filter (Wunsch/Im Regal).

### 4 · KI-Suche (semantisch) — über die API testbar
- [ ] `http://127.0.0.1:8787/ai/search?q=a notebook that kills anyone whose name is written` → **Death Note**.
- [ ] `…/ai/search?q=overpowered hero who defeats every enemy with one punch` → **One-Punch Man**.
- [ ] `…&new_for_me=true` blendet als „fertig" markierte Titel aus.
  *(UI-Suchleisten-Einbindung der KI-Suche: nächster kleiner Schritt — API läuft.)*

### 5 · Privater Bereich (H)
- [ ] ⚙ (oben rechts) → „Privat" → Passwort setzen → „Entsperren".
- [ ] Oben erscheint Reiter **H** → zeigt den getrennten H-Katalog (100 Titel).
- [ ] Seite neu laden → H ist wieder **verborgen** (keine Spur), bis Passwort erneut.

---

## Fertig & verifiziert
- **A** Backend+Import: **13.290 Anime** (ganzer AniList-Katalog via Jahr-Sharding) + dt. Dub
  (MyDubList, **2.729** synchronisiert) + **1.669 H** (AniList isAdult; Jikan IPv6-only). **14.959 embedded.**
  **B** UI (Svelte, AniList-Look, headless gerendert, Infinite-Scroll). **C** KI-Suche (bge-m3,
  semantisch korrekt), „neu-für-mich", DE-Übersetzung (qwen2.5:3b, läuft weiter — Stand Nacht ~150/300),
  Verfügbarkeit, Einkaufsliste. Dienst-Checker + Medientyp-Picker (Line-Art).

## Offen / braucht Jonas (Meilenstein D/E — Gerüst steht, Stubs markiert)
- **AniList-Export:** `POST /sync/anilist/run` zeigt Stub → App auf anilist.co/settings/developer
  registrieren, PIN-Token als Secret → `ANILIST_TOKEN`. (`/sync/anilist/preview` zeigt schon, was ginge.)
- **Jellyfin-Tracker:** API-Key im Dashboard → `JELLYFIN_URL`/`JELLYFIN_TOKEN`.
- **Browser-Tracker:** WebExtension in `plugin/webextension/` — Crunchyroll-DOM-Selektoren vor Produktiv
  an echtem Tab gegenprüfen. aniworld läuft aus der URL.
- **TMDB** („wo legal"): kostenloser Key → `TMDB_API_KEY` (sonst Stub).
- **Nächste kleine Schritte:** KI-Suche in die Suchleiste der UI einbinden; Übersetzung zu Ende laufen
  lassen; Dienst-Logos in `plugin/assets/logos/` ablegen.

## Datenquellen / Attribution
AniList · **Dub-Daten © MyDubList — https://mydublist.com — (CC BY 4.0)** · Jikan/MAL (H) · Synchronkartei · TMDB.
JustWatch bewusst NICHT (AGB).
