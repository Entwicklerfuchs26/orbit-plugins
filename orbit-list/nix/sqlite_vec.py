"""Duenner Ersatz fuer das PyPI-Paket `sqlite-vec` auf Nix: nutzt die Bibliothek aus nixpkgs.
Gleiche Schnittstelle wie benutzt (load, loadable_path, serialize_float32); Pfad ueber SQLITE_VEC_SO."""
import os
import struct


def loadable_path() -> str:
    return os.environ["SQLITE_VEC_SO"]


def load(con) -> None:
    con.load_extension(loadable_path())


def serialize_float32(vec) -> bytes:
    return struct.pack(f"{len(vec)}f", *vec)
