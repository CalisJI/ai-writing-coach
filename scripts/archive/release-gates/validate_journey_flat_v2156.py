from pathlib import Path
import argparse
import re

ROOT=Path(__file__).resolve().parents[1]
START="/* === BECOMING v2.15.6 JOURNEY FLAT EVIDENCE START ==="
END="/* === BECOMING v2.15.6 JOURNEY FLAT EVIDENCE END === */"

parser=argparse.ArgumentParser()
parser.add_argument(
    "--css",
    default=str(ROOT/"static"/"becoming"/"trusted-ui-v213.css"),
)
args=parser.parse_args()

css_path=Path(args.css).resolve()
version_path=ROOT/"BECOMING_FRONTEND_VERSION"
errors=[]

def req(value,msg):
    if not value:
        errors.append(msg)

req(css_path.exists(),f"CSS target missing: {css_path}")
req(version_path.exists(),"BECOMING_FRONTEND_VERSION missing")

if not errors:
    css=css_path.read_text(encoding="utf-8",errors="ignore")
    version=version_path.read_text(encoding="utf-8").strip()

    req(version=="2.15.6","Frontend version must be 2.15.6")
    req(css.count("BECOMING v2.15.6 JOURNEY FLAT EVIDENCE START")==1,
        "Journey flat evidence block must exist exactly once in the active CSS")
    req(css.count("BECOMING v2.15.6 JOURNEY FLAT EVIDENCE END")==1,
        "Journey flat evidence end marker must exist exactly once in the active CSS")

    if START in css and END in css:
        start_index=css.index(START)
        end_index=css.index(END,start_index)+len(END)
        block=css[start_index:end_index]
        executable=re.sub(r"/\*.*?\*/","",block,flags=re.S)

        for token in [
            '[data-screen-contract="journey"]',
            ".journey-page",
            ".bc13-frame",
            ":has(> .bc13-row)",
            "background: transparent",
            "border: 0",
            "box-shadow: none",
            "border-bottom: 1px solid",
        ]:
            req(token in block,f"Missing Journey flat evidence contract: {token}")

        req("!important" not in executable,
            "v2.15.6 Journey block must not introduce !important")
        req(re.search(r"\b(?:width|inline-size)\s*:\s*100vw\b",executable,re.I) is None,
            "v2.15.6 Journey block must not introduce 100vw")
        req(re.search(r"margin-(?:left|right)\s*:\s*-\d",executable,re.I) is None,
            "v2.15.6 Journey block must not introduce negative horizontal margin")

if errors:
    print("BECOMING v2.15.6 validation FAILED")
    print("CSS target:",css_path)
    for error in errors:
        print(" -",error)
    raise SystemExit(1)

print("BECOMING v2.15.6 validation OK")
print("CSS target:",css_path)
print("Journey block scope and forbidden-pattern checks: PASS")
