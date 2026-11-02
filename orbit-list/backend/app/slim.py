"""Schlanker Katalog-Abzug fuer das eingebettete Backend im Handy: nur Katalogdaten, keine
Nutzerdaten, keine Embeddings, keine Zugangsdaten. Wird bei Bedarf erzeugt und neben der DB abgelegt."""
from __future__ import annotations

import gzip
import shutil
import sqlite3
import tempfile
from pathlib import Path

from . import db as dbmod

CATALOG_TABLES = ("media", "services", "media_types")


def build(out: Path | None = None) -> Path:
    """Erzeugt <db>.slim.db.gz (neu, wenn die Quelle neuer ist) und gibt den Pfad zurueck."""
    src = dbmod.DB_PATH
    out = out or src.with_suffix(".slim.db.gz")
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        return out
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "slim.db"
        dbmod.DB_PATH = tmp
        try:
            dbmod.init_db()
        finally:
            dbmod.DB_PATH = src
        con = sqlite3.connect(tmp)
        con.execute("ATTACH DATABASE ? AS o", (str(src),))
        for t in CATALOG_TABLES:
            cols = [r[1] for r in con.execute(f"PRAGMA main.table_info({t})")]
            ocols = {r[1] for r in con.execute(f"PRAGMA o.table_info({t})")}
            use = [c for c in cols if c in ocols]
            con.execute(f"DELETE FROM main.{t}")
            con.execute(f"INSERT INTO main.{t}({','.join(use)}) SELECT {','.join(use)} FROM o.{t}")
        con.commit()
        con.execute("DETACH DATABASE o")
        con.execute("VACUUM")
        con.close()
        part = out.with_suffix(".part")
        with open(tmp, "rb") as f_in, gzip.open(part, "wb", compresslevel=9) as f_out:
            shutil.copyfileobj(f_in, f_out)
        part.replace(out)
    return out


if __name__ == "__main__":
    # python -m app.slim <anime.jsonl> <out.db.gz>  — Katalog-Abzug direkt aus der offenen Datenbank (AnimeDB) bauen
    import os
    import sys
    import tempfile

    jsonl, target = Path(sys.argv[1]), Path(sys.argv[2])
    with tempfile.TemporaryDirectory() as td:
        os.environ["ANIME_DB"] = str(Path(td) / "anime.db")
        dbmod.DB_PATH = Path(os.environ["ANIME_DB"])
        dbmod.init_db()
        from . import catalog
        catalog.run(jsonl, dbmod.DB_PATH, progress=lambda *_: None)
        shutil.copyfile(build(Path(td) / "out.gz"), target)
    print(f"{target} ({target.stat().st_size} Bytes)")
