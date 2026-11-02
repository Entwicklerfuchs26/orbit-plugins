"""Streaming-Verfuegbarkeit je Titel (Treffer, die das Geraet geprueft hat) fuer Detailansicht und Wunschliste."""
from __future__ import annotations

from .db import connect


def set_items(media_id: int, items: list[dict]) -> int:
    """Ersetzt die gespeicherten Treffer des Titels durch die frisch geprueften."""
    con = connect()
    try:
        con.execute("DELETE FROM streaming WHERE media_id=?", (media_id,))
        n = 0
        for it in items:
            svc = (it.get("service") or "").strip()
            if not svc:
                continue
            con.execute(
                "INSERT OR REPLACE INTO streaming (media_id, service, url, source) VALUES (?,?,?,?)",
                (media_id, svc, it.get("url"), it.get("source")),
            )
            n += 1
        con.commit()
        return n
    finally:
        con.close()


def get_map(ids: list[int]) -> dict[int, list[dict]]:
    if not ids:
        return {}
    con = connect()
    try:
        q = ",".join("?" for _ in ids)
        out: dict[int, list[dict]] = {}
        for r in con.execute(
            f"SELECT media_id, service, url, source, checked_at FROM streaming WHERE media_id IN ({q}) ORDER BY service", ids
        ):
            out.setdefault(r["media_id"], []).append(
                {"service": r["service"], "url": r["url"], "source": r["source"], "checked_at": r["checked_at"]}
            )
        return out
    finally:
        con.close()
