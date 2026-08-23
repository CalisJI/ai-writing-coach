from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STATIC=ROOT/"static"/"becoming"
errors=[]

def require(condition,message):
    if not condition:
        errors.append(message)

required=[
    ROOT/"app.py",
    ROOT/"writing_coach"/"becoming_memory.py",
    ROOT/"scripts"/"becoming_release_gate.py",
    ROOT/"writing_coach"/"becoming_polish_selftest.py",
    STATIC/"app.css",
    STATIC/"phase3.css",
    STATIC/"phase4.css",
    STATIC/"app.js",
    STATIC/"store.js",
    STATIC/"components"/"primitives.js",
    STATIC/"components"/"dictionary.js",
    STATIC/"domain"/"support.js",
    STATIC/"domain"/"feedback-map.js",
    STATIC/"domain"/"feedback.js",
    STATIC/"screens"/"onboarding.js",
    STATIC/"screens"/"profile.js",
    STATIC/"screens"/"write.js",
    STATIC/"screens"/"review.js",
    STATIC/"screens"/"journey.js",
    STATIC/"screens"/"library.js",
    ROOT/"templates"/"becoming"/"index.html",
    ROOT/"BECOMING_FRONTEND_VERSION",
]
for path in required:
    require(path.exists(),f"Missing {path.relative_to(ROOT)}")

if not errors:
    app=(ROOT/"app.py").read_text(encoding="utf-8")
    memory=(ROOT/"writing_coach"/"becoming_memory.py").read_text(encoding="utf-8")
    app_css=(STATIC/"app.css").read_text(encoding="utf-8")
    phase3=(STATIC/"phase3.css").read_text(encoding="utf-8")
    phase4=(STATIC/"phase4.css").read_text(encoding="utf-8")
    app_js=(STATIC/"app.js").read_text(encoding="utf-8")
    store=(STATIC/"store.js").read_text(encoding="utf-8")
    primitives=(STATIC/"components"/"primitives.js").read_text(encoding="utf-8")
    dictionary=(STATIC/"components"/"dictionary.js").read_text(encoding="utf-8")
    support=(STATIC/"domain"/"support.js").read_text(encoding="utf-8")
    feedback_map=(STATIC/"domain"/"feedback-map.js").read_text(encoding="utf-8")
    feedback=(STATIC/"domain"/"feedback.js").read_text(encoding="utf-8")
    onboarding=(STATIC/"screens"/"onboarding.js").read_text(encoding="utf-8")
    profile=(STATIC/"screens"/"profile.js").read_text(encoding="utf-8")
    write=(STATIC/"screens"/"write.js").read_text(encoding="utf-8")
    review=(STATIC/"screens"/"review.js").read_text(encoding="utf-8")
    journey=(STATIC/"screens"/"journey.js").read_text(encoding="utf-8")
    library=(STATIC/"screens"/"library.js").read_text(encoding="utf-8")
    template=(ROOT/"templates"/"becoming"/"index.html").read_text(encoding="utf-8")
    version=(ROOT/"BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip()

    require(version=="2.7.1","BECOMING_FRONTEND_VERSION must be 2.7.1")
    require("SCHEMA_VERSION = 10" in app,"backend schema v10 missing")
    require(app.endswith("\n") and not app.endswith("\n\n"),"app.py EOF hygiene failed")

    # 1. Learning-language state isolation.
    require("becoming.draft.v2.en" not in store and "becoming.draft.v2.zh" not in store,
            "language draft keys should be derived, not duplicated literals")
    require("DRAFT_PREFIX='becoming.draft.v2'" in store,"language-scoped draft key prefix missing")
    require("function activateLanguage" in store,"activateLanguage state owner missing")
    require("state.lastEvaluation=null" in store,"language switch must invalidate old Review evidence")
    require("activateLanguage(language" in app_js,"header language switch does not load target-language draft")
    require("previousRoute==='review'" in app_js,"old-language Review invalidation missing")
    require("becoming.draft.v1" in store,"legacy draft migration path missing")

    # 2. Orange rails root fix.
    compact=app_css.replace("\n","")
    require(".main-content:focus,.main-content:focus-visible{outline:none}" in compact,
            "full-page main-content focus rail fix missing")
    require(":focus-visible" in app_css,"interactive focus system must remain present")

    # 3. Native/support language.
    require("native_language: str" in memory,"native_language profile model missing")
    require("ADD COLUMN native_language" in memory,"idempotent native_language migration missing")
    require("profileNativeLanguage" in profile,"Profile native-language selector missing")
    require("onboardingNativeLanguage" in onboarding,"Onboarding native-language selector missing")
    require("becoming.support-language.v1" in store,"global support-language identity preference missing")
    require("export function setSupportLanguage" in store and "export function supportLanguage" in store,
            "support-language identity state helpers missing")
    require("supportLanguage()" in app_js,"support-language preference is not synchronized across learning profiles")
    require("export function supportCopy" in support and "export function supportNote" in support,
            "central native-language support copy missing")

    # 4 + 9. Feedback target clarity and concrete why/better.
    require("expandLexicalRange" in feedback_map,"partial-token evidence expansion missing")
    require("export function sentenceContext" in feedback_map,"full sentence context missing")
    require("export function changedSegments" in feedback,"Before/Better diff helper missing")
    require("Sentence context" in review,"Review sentence-context surface missing")
    require("feedbackExplanation" in review and "categoryReason" in review,
            "concrete feedback explanation fallback missing")
    require("feedbackRule" in review and "categoryRule" in review,
            "reusable rule guidance missing")
    require(".feedback-change" in phase3 and ".change-after" in phase3,
            "Before/Better visual comparison styling missing")

    # 5. Strong Version is a Review-theme comparison, not arbitrary 3D.
    require("comparison-grid" in review,"Strong Version comparison structure missing")
    require(".comparison-panel" in app_css,"Strong Version Review-theme surfaces missing")
    require("3d" not in review.lower(),"Strong Version must not introduce 3D decoration")

    # 6. Evidence-first Writing progress, no new nav/dashboard route.
    require("writingProgressOverview" in journey,"Writing progress overview missing from Journey")
    require("WRITING PROGRESS" in journey,"Writing progress landmark missing")
    require(".writing-progress-grid" in phase4,"Writing progress responsive layout missing")
    require('data-route="dashboard"' not in template,"unexpected dashboard navigation was introduced")

    # 7. Functional section boundaries.
    require(".functional-surface" in app_css,"shared functional-surface primitive missing")
    require("focus-surface" in review and "strength-surface" in review and "next-action-surface" in review,
            "Review functional boundaries missing")
    require("journey-section-surface" in journey,"Journey functional boundaries missing")

    # 8. Tooltips.
    require("export function helpTip" in primitives,"shared help tooltip primitive missing")
    for name,text in [
        ("profile",profile),
        ("write",write),
        ("review",review),
        ("journey",journey),
        ("library",library),
    ]:
        require("helpTip(" in text,f"{name} does not use the shared help tooltip")

    # 10 + 11. Chinese assistance reuses the current dictionary API.
    require("pinyinMode" in dictionary,"dictionary Pinyin mode missing")
    require("hanCharacters" in dictionary and "hanzi-grid-row" in dictionary,
            "Hanyu-style Hanzi writing grid missing")
    require("stroke order is shown only" in dictionary.lower(),
            "verified-stroke-order limitation note missing")
    require("api.dictionary" in dictionary,"shared dictionary component must reuse existing dictionary API")
    require("selectionLookupButton" in write,"Writing selection dictionary/Pinyin lookup missing")
    require("dictionaryResultMarkup" in library,"Library must reuse shared dictionary component")
    require("showSavedPhonetic" in library,"saved Chinese Pinyin preference handling missing")

    # No product/AI/scoring redesign.
    require('data-route="read"' in template and 'data-route="library"' in template,
            "existing navigation regressed")
    require("/becoming-assets/app.js?v=2.7.1" in template,"2.7.1 cache version missing")
    require("/static/becoming/" not in template,"legacy BECOMING asset route reintroduced")
    for forbidden in ["OLLAMA_URL","/api/chat","requests."]:
        require(forbidden not in dictionary and forbidden not in support,
                f"UI polish introduced provider/network-specific logic: {forbidden}")

if errors:
    print("BECOMING UI/UX batch polish validation FAILED")
    for item in errors:
        print(" -",item)
    raise SystemExit(1)

print("BECOMING UI/UX batch polish validation OK")
print("Language isolation + focus-rail fix + native guidance + feedback clarity + themed comparison + Writing progress + tooltips + Pinyin/Hanzi assistance present")
