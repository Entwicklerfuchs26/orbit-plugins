# Anime-Liste Tracker (Browser-WebExtension)

Erkennt die gerade laufende Folge auf **Crunchyroll** (Web) und **aniworld** und meldet sie
an das lokale Backend (`POST /watch`). Liest nur den **eigenen offenen Tab** (URL + DOM +
`<video>`-Status) — kein Fremdserver-Scrape.

## Status: GERÜST (Meilenstein D)
- aniworld: Serie/Staffel/Folge sauber aus der URL. ✓
- Crunchyroll: Serie+Folge über DOM-Selektoren — **vor Produktiv an echten Tabs gegenprüfen**
  (SPA-Markup ändert sich; Selektoren ggf. anpassen). Konnte im De-Risk nicht live verifiziert
  werden (Vivaldi-CDP war aus).

## Laden (Chrome/Vivaldi)
`chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden" → diesen Ordner.

## Offen (Jonas / nächster Schritt)
- Backend-URL konfigurierbar machen (Options-Seite) statt fest `127.0.0.1:8787`.
- Titel→AniList-ID-Matching serverseitig verfeinern (aktuell Fuzzy über search_blob).
- Entscheid: WebExtension (robust) vs. CDP-Polling über fuchs-vivaldi.
