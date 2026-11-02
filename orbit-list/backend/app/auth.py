"""Zugangsschutz fuers Backend.

* Ohne gesetztes Passwort: nur Zugriffe von localhost (127.0.0.1/::1) — wie bisher.
* Mit Passwort: jede Anfrage braucht den Zugangsschluessel (Header ``X-Orbitlist-Key`` oder
  ``Authorization: Bearer``). Den Schluessel bekommt man per ``POST /auth/login`` gegen das Passwort.
  Er ist ein HMAC ueber ein geheimes Serverkennwort und wird bei Passwortwechsel ungueltig.
* Passwort wird nur als scrypt-Hash gespeichert. Setzen: ``python -m app.auth`` (fragt interaktiv)
  oder Umgebungsvariable ORBITLIST_PASSWORD beim Start (wird gehasht, nicht gespeichert).
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque

from .db import repo

PUBLIC_PATHS = ("/health", "/catalog/slim.db.gz", "/auth/status", "/auth/login", "/app", "/docs", "/openapi.json")
LOOPBACK = {"127.0.0.1", "::1", "localhost"}
_fail: dict[str, deque] = defaultdict(deque)


def _scrypt(pw: str, salt: bytes) -> str:
    return hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32).hex()


def set_password(pw: str) -> None:
    if len(pw) < 8:
        raise ValueError("Passwort: mindestens 8 Zeichen")
    salt = secrets.token_bytes(16)
    repo.meta_set("auth_salt", salt.hex())
    repo.meta_set("auth_hash", _scrypt(pw, salt))
    repo.meta_set("auth_secret", secrets.token_hex(32))  # rotiert → alte Schluessel ungueltig


def clear_password() -> None:
    for k in ("auth_salt", "auth_hash", "auth_secret"):
        repo.meta_set(k, "")


def is_required() -> bool:
    return bool(repo.meta_get("auth_hash"))


def apply_env() -> None:
    """ORBITLIST_PASSWORD beim Start uebernehmen (nur wenn es sich vom gespeicherten unterscheidet)."""
    pw = os.environ.get("ORBITLIST_PASSWORD")
    if not pw:
        return
    salt_hex, h = repo.meta_get("auth_salt"), repo.meta_get("auth_hash")
    if salt_hex and h and hmac.compare_digest(_scrypt(pw, bytes.fromhex(salt_hex)), h):
        return
    set_password(pw)


def _key() -> str:
    return hmac.new(repo.meta_get("auth_secret").encode(), b"orbitlist-access", hashlib.sha256).hexdigest()


def login(pw: str, client: str) -> str | None:
    now = time.time()
    q = _fail[client]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= 5:
        raise PermissionError("zu viele Versuche — bitte eine Minute warten")
    salt_hex, h = repo.meta_get("auth_salt"), repo.meta_get("auth_hash")
    if not (salt_hex and h) or not hmac.compare_digest(_scrypt(pw, bytes.fromhex(salt_hex)), h):
        q.append(now)
        return None
    return _key()


def check(path: str, client: str, key: str | None, method: str) -> tuple[int, str] | None:
    """None = erlaubt, sonst (Status, Meldung)."""
    if method == "OPTIONS" or any(path == p or path.startswith(p + "/") for p in PUBLIC_PATHS):
        return None
    if not is_required():
        if client in LOOPBACK:
            return None
        return 403, "Kein Passwort gesetzt — Zugriff von aussen gesperrt. Setzen mit: python -m app.auth"
    if key and hmac.compare_digest(key, _key()):
        return None
    return 401, "Zugangsschluessel fehlt oder ungueltig"


if __name__ == "__main__":
    import getpass
    import sys

    if "--entfernen" in sys.argv:
        clear_password()
        print("Passwort entfernt (nur noch localhost).")
    else:
        a, b = getpass.getpass("Neues Passwort: "), getpass.getpass("Wiederholen: ")
        if a != b:
            sys.exit("Passwoerter ungleich")
        set_password(a)
        print("Passwort gesetzt. Backend neu starten ist nicht noetig.")
