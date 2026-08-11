from pathlib import Path
import re
import sys

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
bad = []
pattern = re.compile(r'\$[A-Za-z_][A-Za-z0-9_]*\?')

for ps1 in root.rglob("*.ps1"):
    text = ps1.read_text(encoding="utf-8", errors="replace")
    for line_no, line in enumerate(text.splitlines(), 1):
        stripped = line.lstrip()
        if stripped.startswith("#"):
            continue
        if pattern.search(line):
            bad.append((ps1, line_no, line.strip()))

if bad:
    print("PowerShell URI interpolation validation FAILED")
    print("Use ${variable}?query=... instead of $variable?query=...")
    for path, line_no, line in bad:
        print(f" - {path}:{line_no}: {line}")
    raise SystemExit(1)

print("PowerShell URI interpolation validation OK")
