from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"static"/"becoming"
TEMPLATE=ROOT/"templates"/"becoming"/"index.html"

required=[
    STATIC/"theme.css",
    STATIC/"physical.css",
    STATIC/"theme.js",
    STATIC/"components"/"icons.js",
    STATIC/"components"/"identity.js",
    STATIC/"screens"/"onboarding.js",
    STATIC/"screens"/"home.js",
    STATIC/"screens"/"write.js",
    STATIC/"screens"/"journey.js",
    TEMPLATE,
]

errors=[]
def require(condition,message):
    if not condition:
        errors.append(message)

for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    html=TEMPLATE.read_text(encoding="utf-8")
    theme=(STATIC/"theme.css").read_text(encoding="utf-8")
    physical=(STATIC/"physical.css").read_text(encoding="utf-8")
    onboarding=(STATIC/"screens"/"onboarding.js").read_text(encoding="utf-8")
    write=(STATIC/"screens"/"write.js").read_text(encoding="utf-8")
    app=(STATIC/"app.js").read_text(encoding="utf-8")

    require('document.documentElement.dataset.theme' in html,"pre-paint theme initialization missing")
    require('fonts.googleapis.com' in html,"design-system web fonts are not linked")
    require('/static/becoming/theme.css?v=2.1.0' in html,"theme.css missing from document")
    require('/static/becoming/physical.css?v=2.1.0' in html,"physical.css missing from document")
    require('html[data-theme="dark"]' in theme,"dark token set missing")
    require('--theme-accent-600:#FF7A2F' in theme,"dark accent token missing")
    require('Soft Physical Digital' in physical,"physical design layer missing")
    require('.identity-object' in physical,"3D identity object missing")
    require('.refinement-object' in physical,"empty-state refinement object missing")
    require('.mastery-object' in physical,"milestone identity object missing")
    require('languageObject' in onboarding,"language selection does not use identity object")
    require("04 · REFINE" in write,"refinement journey landmark missing")
    require("installTheme()" in app,"theme runtime is not installed")
    require("linear-gradient" not in physical.split(".button-primary",1)[1].split(".button-primary:hover",1)[0],
            "primary button must not use a gradient")

if errors:
    print("BECOMING Phase 2 validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING Phase 2 validation OK")
print("Dark theme + Soft Physical Digital identity moments + 04 REFINE present")
