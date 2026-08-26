"""Build the vendored Hanzi stroke-order pack from upstream hanzi-writer-data.

The upstream package ships one JSON file per character (9,574 files, ~31 MB).
Committing that many tiny files is hostile to Git and to `COPY static` in the
Dockerfile, so this script converts them into two files:

    hanzi_strokes.pack        concatenated zlib records, one per character
    hanzi_strokes.index.json  character -> [offset, length] plus provenance

Only the container format changes. Stroke paths, medians and radical-stroke
indices are copied through byte-for-byte, so the pack stays a faithful copy of
the upstream data (see stroke_data/README.md for the Arphic Public License
notice this conversion is published under).

Stdlib only: the operator Python has no project dependencies.

    python scripts/build_hanzi_stroke_pack.py            # download + build
    python scripts/build_hanzi_stroke_pack.py --source D # build from a dir
    python scripts/build_hanzi_stroke_pack.py --check    # verify, write nothing
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
import tarfile
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "writing_coach" / "languages" / "chinese" / "stroke_data"

PACKAGE = "hanzi-writer-data"
VERSION = "2.0.1"
TARBALL = f"https://registry.npmjs.org/{PACKAGE}/-/{PACKAGE}-{VERSION}.tgz"
FORMAT = "orena.hanzi-strokes.v1"

HAN = ((0x3400, 0x4DBF), (0x4E00, 0x9FFF))


def is_han(char: str) -> bool:
    point = ord(char)
    return any(low <= point <= high for low, high in HAN)


def download_members() -> dict[str, bytes]:
    print(f"Downloading {TARBALL}")
    with urllib.request.urlopen(TARBALL, timeout=300) as response:  # noqa: S310
        blob = response.read()
    print(f"  {len(blob) / 1e6:.1f} MB")

    members: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as archive:
        for member in archive.getmembers():
            if not member.isfile():
                continue
            name = member.name.removeprefix("package/")
            handle = archive.extractfile(member)
            if handle is not None:
                members[name] = handle.read()
    return members


def read_members(source: Path) -> dict[str, bytes]:
    root = source / "package" if (source / "package").is_dir() else source
    print(f"Reading {root}")
    return {path.name: path.read_bytes() for path in root.iterdir() if path.is_file()}


def build(members: dict[str, bytes]) -> tuple[bytes, dict]:
    entries = {}
    for name, blob in members.items():
        if not name.endswith(".json") or name == "package.json":
            continue
        character = name[: -len(".json")]
        if len(character) != 1 or not is_han(character):
            continue
        entries[character] = json.loads(blob.decode("utf-8"))

    if not entries:
        raise SystemExit("No character files found in the source package.")

    pack = bytearray()
    offsets: dict[str, list[int]] = {}
    for character in sorted(entries):
        data = entries[character]
        record = json.dumps(
            {
                "strokes": data["strokes"],
                "medians": data["medians"],
                "radStrokes": data.get("radStrokes") or [],
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        compressed = zlib.compress(record, 9)
        offsets[character] = [len(pack), len(compressed)]
        pack += compressed

    index = {
        "format": FORMAT,
        "source": {
            "package": PACKAGE,
            "version": VERSION,
            "tarball": TARBALL,
            "upstream": "https://github.com/skishore/makemeahanzi",
            "license": "Arphic Public License (see ARPHICPL.TXT)",
        },
        "count": len(offsets),
        "pack_sha256": hashlib.sha256(bytes(pack)).hexdigest(),
        "offsets": offsets,
    }
    return bytes(pack), index


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="extracted hanzi-writer-data directory")
    parser.add_argument("--check", action="store_true", help="verify the committed pack, write nothing")
    args = parser.parse_args()

    if args.check:
        index_path = TARGET / "hanzi_strokes.index.json"
        pack_path = TARGET / "hanzi_strokes.pack"
        if not index_path.is_file() or not pack_path.is_file():
            print("FAIL: stroke pack is missing")
            return 1
        index = json.loads(index_path.read_text(encoding="utf-8"))
        pack = pack_path.read_bytes()
        digest = hashlib.sha256(pack).hexdigest()
        if digest != index.get("pack_sha256"):
            print(f"FAIL: pack digest {digest} does not match index {index.get('pack_sha256')}")
            return 1
        print(f"OK: {index['count']} characters, {len(pack) / 1e6:.1f} MB, digest matches")
        return 0

    members = read_members(args.source) if args.source else download_members()
    pack, index = build(members)

    TARGET.mkdir(parents=True, exist_ok=True)
    (TARGET / "hanzi_strokes.pack").write_bytes(pack)
    (TARGET / "hanzi_strokes.index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    license_text = members.get("ARPHICPL.TXT")
    if license_text:
        (TARGET / "ARPHICPL.TXT").write_bytes(license_text)
    else:
        print("WARNING: ARPHICPL.TXT was not present in the source package")

    print(f"Wrote {index['count']} characters, {len(pack) / 1e6:.1f} MB to {TARGET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
