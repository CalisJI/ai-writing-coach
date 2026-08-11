from __future__ import annotations

from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
errors = []

for path in root.rglob("*.ps1"):
    for lineno, line in enumerate(
        path.read_text(encoding="utf-8", errors="replace").splitlines(),
        1,
    ):
        stripped = line.lstrip()
        if not stripped or stripped.startswith("#"):
            continue
        lowered = line.lower()
        if "python -c" in lowered and '\\"' in line:
            errors.append(
                f"{path.relative_to(root)}:{lineno}: "
                "PowerShell python -c uses backslash-escaped double quotes"
            )

if errors:
    print("PowerShell python -c quoting validation FAILED")
    for item in errors:
        print(" -", item)
    print(
        "PowerShell does not use backslash to escape double quotes. "
        "Prefer quote-simple Python payloads."
    )
    raise SystemExit(1)

print("PowerShell python -c quoting validation OK")
