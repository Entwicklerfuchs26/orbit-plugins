#!/usr/bin/env bash
# Backend-Installer (ein Standard-Weg). Linux/macOS: uv + venv. Windows: WSL oder py -m venv.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v uv >/dev/null 2>&1; then
  echo "→ 'uv' wird benötigt (https://astral.sh/uv). Fallback: python3 -m venv .venv && pip install -r requirements.txt"
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -r requirements.txt
else
  uv venv --python 3.12 .venv
  . .venv/bin/activate
  uv pip install -r requirements.txt
fi

echo
echo "Fertig. Nächste Schritte:"
echo "  1) Import:   .venv/bin/python -m app.importer"
echo "  2) KI-Index: .venv/bin/python -m app.embeddings   (braucht 'ollama pull bge-m3')"
echo "  3) Start:    ./run.sh    →    http://127.0.0.1:8787/app/"
