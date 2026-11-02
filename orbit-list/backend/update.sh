#!/usr/bin/env bash
# Tägliches Katalog-Update: eigene offene Datenbank (orbit-anime-db) neu bauen → in Orbitlist einlesen
# → Dub-Sprachen → Embedding-Index. Inkrementell, Liste/Bewertungen bleiben unangetastet.
# Kontakt fuer den User-Agent: OADB_CONTACT (aus ~/.config/orbitlist/env, nicht im Repo).
set -euo pipefail
cd "$(dirname "$0")"
. .venv/bin/activate
OADB_DIR="${OADB_DIR:-$HOME/projects/orbit-anime-db}"
ENVF="$HOME/.config/orbitlist/env"
[ -f "$ENVF" ] && set -a && . "$ENVF" && set +a
: "${OADB_CONTACT:?OADB_CONTACT fehlt (siehe $ENVF)}"
export OADB_CONTACT

# manami-Release (woechentlich) — bei Fehler mit der vorhandenen Datei weiterarbeiten
SRC="$OADB_DIR/data/manami-src.json"
if [ ! -f "$SRC" ] || [ -n "$(find "$SRC" -mtime +3 2>/dev/null)" ]; then
  tmp="$(mktemp -d)"
  if curl -fsSL --max-time 600 -o "$tmp/m.zst" \
      "https://github.com/manami-project/anime-offline-database/releases/latest/download/anime-offline-database-minified.json.zst" \
      && zstd -dq "$tmp/m.zst" -o "$tmp/m.json" && python -c "import json,sys;json.load(open('$tmp/m.json'))"; then
    mv "$tmp/m.json" "$SRC"
  else
    echo "WARN: manami-Download fehlgeschlagen — nutze vorhandene Datei" >&2
  fi
  rm -rf "$tmp"
fi

# Pipeline (Wikidata + manami + ANN + Wikipedia) — Fehler hier bricht ab, bevor die DB angefasst wird
MANAMI_JSON="$SRC" PYTHON="$(which python)" bash "$OADB_DIR/update.sh"

python -m app.catalog "$OADB_DIR/data/anime.jsonl"

# Katalog auch an die Animus-Instanz (Phone-Backend im WG-Tunnel) — Fehler hier stoppen den Lauf nicht
if [ -n "${ANIMUS_INBOX:-}" ]; then
  rsync -a "$OADB_DIR/data/anime.jsonl" "$ANIMUS_INBOX/anime.jsonl" || echo "WARN: Katalog-Sync zu Animus fehlgeschlagen" >&2
fi
python -m app.populate_langs
python -m app.embeddings
