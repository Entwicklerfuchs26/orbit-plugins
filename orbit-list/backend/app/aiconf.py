"""KI-Konfiguration (Embedding-Modell): aus/Server/Extern. Gespeichert in meta_kv.

Modi:
  server   — Ollama auf dem Backend-Rechner (Default bge-m3)
  external — eigener Endpunkt (Ollama- oder OpenAI-kompatibel), z.B. anderer PC oder Anbieter
  device   — kleines Modell auf dem Handy (noch nicht verfuegbar; kommt mit der Handy-Version)
Der API-Schluessel wird nie an die Oberflaeche zurueckgegeben.
"""
from __future__ import annotations

import httpx

from .db import repo
from .sources import ollama

KEYS = ("ai_enabled", "ai_mode", "ai_ext_kind", "ai_ext_url", "ai_ext_model", "ai_ext_key",
        "ai_index_model", "ai_index_dim")


def _m(k: str, d: str = "") -> str:
    v = repo.meta_get(k)
    return d if v is None else v


def _embedded() -> int:
    from . import embeddings
    return embeddings.index_count().get("embedded", 0)


def get() -> dict:
    enabled = repo.meta_get("ai_enabled")
    if enabled is None:  # Altbestand: war schon indiziert → weiter aktiv; sonst aus
        enabled = "1" if _embedded() > 0 else "0"
    return {
        "enabled": enabled == "1",
        "mode": _m("ai_mode", "server"),
        "ext_kind": _m("ai_ext_kind", "openai"),
        "ext_url": _m("ai_ext_url"),
        "ext_model": _m("ai_ext_model"),
        "ext_key_set": bool(_m("ai_ext_key")),
        "index_model": _m("ai_index_model") or ("server:" + ollama.EMBED_MODEL if _embedded() else ""),
        "index_dim": int(_m("ai_index_dim", "0") or 0),
    }


def update(p: dict) -> dict:
    mapping = {"enabled": "ai_enabled", "mode": "ai_mode", "ext_kind": "ai_ext_kind", "ext_url": "ai_ext_url",
               "ext_model": "ai_ext_model", "ext_key": "ai_ext_key"}
    for k, mk in mapping.items():
        if k in p and p[k] is not None:
            v = p[k]
            if k == "enabled":
                v = "1" if v else "0"
            if k == "ext_url":
                v = str(v).strip().rstrip("/")
            if k == "mode" and v not in ("server", "external", "device"):
                raise ValueError("mode ungueltig")
            repo.meta_set(mk, str(v))
    return get()


def model_id() -> str:
    c = get()
    if c["mode"] == "external":
        return f"external:{c['ext_kind']}:{c['ext_model']}"
    if c["mode"] == "device":
        return "device"
    return f"server:{ollama.EMBED_MODEL}"


def embed(texts: list[str]) -> list[list[float]]:
    c = get()
    if c["mode"] == "device":
        raise RuntimeError("Modell auf dem Handy ist noch nicht verfügbar")
    if c["mode"] == "server":
        r = httpx.post(f"{ollama.OLLAMA}/api/embed", json={"model": ollama.EMBED_MODEL, "input": texts}, timeout=180)
        r.raise_for_status()
        return r.json()["embeddings"]
    if not c["ext_url"] or not c["ext_model"]:
        raise RuntimeError("Externer Endpunkt/Modell nicht eingetragen")
    if c["ext_kind"] == "ollama":
        r = httpx.post(f"{c['ext_url']}/api/embed", json={"model": c["ext_model"], "input": texts}, timeout=180)
        r.raise_for_status()
        return r.json()["embeddings"]
    headers = {"Authorization": f"Bearer {_m('ai_ext_key')}"} if _m("ai_ext_key") else {}
    r = httpx.post(f"{c['ext_url']}/v1/embeddings", json={"model": c["ext_model"], "input": texts},
                   headers=headers, timeout=180)
    r.raise_for_status()
    return [d["embedding"] for d in sorted(r.json()["data"], key=lambda d: d["index"])]


def test() -> dict:
    try:
        v = embed(["Test"])[0]
        return {"ok": True, "dim": len(v), "model": model_id()}
    except Exception as ex:
        return {"ok": False, "error": str(ex)[:300]}


def check_ready() -> str | None:
    """None = bereit, sonst Fehlertext fuer die Oberflaeche."""
    c = get()
    if not c["enabled"]:
        return "KI-Funktionen sind deaktiviert (Einstellungen → KI)"
    if c["mode"] == "device":
        return "Modell auf dem Handy noch nicht verfügbar"
    if c["index_model"] != model_id():
        return "Der Index passt nicht zum gewählten Modell — in den Einstellungen neu aufbauen"
    return None
