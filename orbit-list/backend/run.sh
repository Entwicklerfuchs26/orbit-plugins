#!/usr/bin/env bash
# Startet das Anime-Liste Backend. Erwartet das venv unter backend/.venv.
# HOST=0.0.0.0 macht es im Netz erreichbar — nur mit gesetztem Passwort (python -m app.auth
# oder ORBITLIST_PASSWORD); ohne Passwort sperrt das Backend alles ausser localhost.
set -euo pipefail
cd "$(dirname "$0")"
. .venv/bin/activate
exec uvicorn app.main:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8787}" "$@"
