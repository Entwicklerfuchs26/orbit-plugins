# Anime-Liste — erweiterbarer Medien-Tracker (Anime zuerst)

Selbstgehosteter Katalog-/Bewertungs-Tracker im AniList-Look. Eigene DB = Quelle der Wahrheit;
deutsche Anzeige; KI-/Such-Interna englisch. Medien-agnostischer Kern (Anime + H zuerst, weitere
Typen als Config/„Media-Pack"). Konzept im Zweiten Gehirn: `02 Projekte/Anime-Liste.md`.

## Struktur
- `backend/` — FastAPI + SQLite, Import, API, KI-Suche, Übersetzung, Tracker. Serviert die UI unter `/app`.
- `plugin/` — Svelte-Frontend (AniList-Look). `src/` = gemeinsame UI; `orbit/` = Orbit-Plugin-Wrapper;
  `webextension/` = Browser-Tracker (Gerüst).

## Schnellstart
```bash
cd backend && ./install.sh          # venv + deps
.venv/bin/python -m app.importer    # Daten (AniList + MyDubList + H)
ollama pull bge-m3 && .venv/bin/python -m app.embeddings   # KI-Index
cd ../plugin && npm install && npm run build                # UI bauen
cd ../backend && ./run.sh           # → http://127.0.0.1:8787/app/
```
Übersetzung (optional): `ollama pull qwen2.5:3b && .venv/bin/python -m app.translate 400`

## Datenquellen (alle legal)
AniList (Metadaten), MyDubList (dt. Dub, CC BY 4.0 — Attribution Pflicht), Jikan/MAL (H),
Synchronkartei + TMDB (Verfügbarkeit). JustWatch bewusst NICHT (AGB).

## Status
A Fundament+Import · B Oberfläche · C KI/Verfügbarkeit = fertig & verifiziert.
D/E Export-Sync, Jellyfin/Browser-Tracker, Installer/Pairing = Gerüst + Stubs (brauchen Secrets/Live).
Offene Punkte & Testliste: `FEATURES.md`.

## MCP-Server `fuchs-orbitlist`
`backend/mcp_server.py` (stdio) — Lesen+Schreiben: `orbit_search` (KI-Suche + Filter), `orbit_list`, `orbit_get`,
`orbit_filters`, `orbit_stats`, `orbit_rate`, `orbit_set_status`, `orbit_set_progress`, `orbit_favorite`, `orbit_note`.
Spricht die lokale REST-API (`ORBITLIST_API`, Default `http://127.0.0.1:8787`); H-Raum wird nicht exponiert.
Einbinden: Command `backend/.venv/bin/python backend/mcp_server.py`.

## Backend selbst betreiben (für das Orbit-Plugin „Anime-Liste")

Das Plugin ist nur die Oberfläche; die Daten liegen in **deinem** Backend. Beim ersten Öffnen fragt das Plugin
nach **Adresse:Port** und **Passwort** des Backends.

**Allgemein (Linux/macOS):**
```
cd backend && ./install.sh                    # venv + Abhängigkeiten
.venv/bin/python -m app.auth                  # Zugangspasswort setzen (min. 8 Zeichen)
HOST=0.0.0.0 ./run.sh                         # im Netz/VPN erreichbar; Port 8787
```
Ohne Passwort bedient das Backend **nur localhost**; von außen antwortet es mit 403. Nie ungeschützt ins offene
Internet stellen — besser nur im Heimnetz oder über VPN (WireGuard/Tailscale).

**Katalog:** der Katalog kommt aus der offenen Datenbank *Orbit Anime DB* (`anime.jsonl`):
`.venv/bin/python -m app.catalog pfad/zu/anime.jsonl`. Tägliches Update: `backend/update.sh`.

**NixOS:** `inputs.orbitlist.url = "github:Entwicklerfuchs26/orbit-plugins?dir=orbit-list";` und `imports = [ orbitlist.nixosModules.default ];`, dann
```nix
services.orbitlist = { enable = true; host = "192.168.1.20"; passwordFile = "/root/orbitlist.pw"; inbox = "/var/lib/orbitlist-inbox"; };
```
(`host` ≠ 127.0.0.1 verlangt `passwordFile`; Katalogdatei `anime.jsonl` in die Inbox legen → Import startet automatisch.)

**Plugin verbinden:** Plugin öffnen → Adresse (z. B. `192.168.1.20:8787`) + Passwort → Verbinden. Das Plugin
unterstützt http:// im Heimnetz (auf dem Handy über nativen HTTP-Zugriff).
