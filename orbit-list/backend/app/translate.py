"""Beschreibungen EN->DE via nexus-Ollama (qwen2.5:3b), Ergebnis in SQLite gecacht
(nie doppelt). Nur importierte Titel, inkrementell."""
from __future__ import annotations

from .db import connect
from .sources import ollama


def translate_missing(limit: int = 50, space: str | None = None) -> dict:
    con = connect()
    where = "description_en IS NOT NULL AND description_en <> '' AND (description_de IS NULL OR description_de='')"
    params: list = []
    if space:
        where += " AND space=?"
        params.append(space)
    params.append(limit)
    rows = con.execute(f"SELECT id, description_en FROM media WHERE {where} LIMIT ?", params).fetchall()
    n = 0
    for r in rows:
        try:
            de = ollama.translate(r["description_en"][:2000])
            con.execute("UPDATE media SET description_de=? WHERE id=?", (de, r["id"]))
            con.commit()
            n += 1
            print(f"  uebersetzt {n}/{len(rows)}", flush=True)
        except Exception as e:
            print(f"  translate fail id={r['id']}: {e!r}", flush=True)
    con.close()
    return {"translated": n, "requested": len(rows)}


if __name__ == "__main__":
    import sys

    translate_missing(int(sys.argv[1]) if len(sys.argv) > 1 else 50)
