"""Ollama auf nexus (127.0.0.1:11434) — Embeddings (bge-m3) + Uebersetzung (qwen2.5:3b)."""
from __future__ import annotations

import os

import httpx

OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "bge-m3")
TRANSLATE_MODEL = os.environ.get("TRANSLATE_MODEL", "qwen2.5:3b")
EMBED_DIM = 1024  # bge-m3


def available_models() -> list[str]:
    try:
        r = httpx.get(f"{OLLAMA}/api/tags", timeout=10)
        return [m["name"] for m in r.json().get("models", [])]
    except Exception:
        return []


def has_model(name: str) -> bool:
    return any(m == name or m.startswith(name + ":") for m in available_models())


def embed(texts: list[str]) -> list[list[float]]:
    from .. import aiconf  # Modus (Server/Extern) kommt aus der KI-Konfiguration
    return aiconf.embed(texts)


def translate(text: str, target: str = "Deutsch") -> str:
    prompt = (
        f"Uebersetze die folgende Anime-Beschreibung ins {target}. "
        f"Gib NUR die Uebersetzung aus, ohne Vorrede, ohne Anfuehrungszeichen.\n\n{text}"
    )
    r = httpx.post(
        f"{OLLAMA}/api/generate",
        json={"model": TRANSLATE_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.2}},
        timeout=240,
    )
    r.raise_for_status()
    return r.json()["response"].strip()
