from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static" / "becoming"
errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


required = [
    ROOT / "app.py",
    ROOT / "writing_coach" / "becoming_memory.py",
    ROOT / "writing_coach" / "becoming_polish_r2_selftest.py",
    ROOT / "scripts" / "becoming_release_gate.py",
    ROOT / "templates" / "becoming" / "index.html",
    STATIC / "domain" / "i18n.js",
    STATIC / "domain" / "screen-contract.js",
    STATIC / "domain" / "rank.js",
    STATIC / "components" / "rank-frame.js",
    STATIC / "theme.js",
    STATIC / "theme.css",
    STATIC / "app.css",
    STATIC / "phase3.css",
    ROOT / "BECOMING_FRONTEND_VERSION",
]
for path in required:
    require(path.exists(), f"Missing {path.relative_to(ROOT)}")

if not errors:
    app = text("app.py")
    memory = text("writing_coach/becoming_memory.py")
    template = text("templates/becoming/index.html")
    i18n = text("static/becoming/domain/i18n.js")
    contract = text("static/becoming/domain/screen-contract.js")
    rank = text("static/becoming/domain/rank.js")
    rank_frame = text("static/becoming/components/rank-frame.js")
    theme = text("static/becoming/theme.js")
    theme_css = text("static/becoming/theme.css")
    app_css = text("static/becoming/app.css")
    phase3 = text("static/becoming/phase3.css")
    app_js = text("static/becoming/app.js")
    store = text("static/becoming/store.js")
    primitives = text("static/becoming/components/primitives.js")
    dictionary = text("static/becoming/components/dictionary.js")
    review = text("static/becoming/screens/review.js")
    profile = text("static/becoming/screens/profile.js")
    reading = text("static/becoming/screens/reading.js")
    library = text("static/becoming/screens/library.js")
    journey = text("static/becoming/screens/journey.js")
    router = text("static/becoming/router.js")
    version = text("BECOMING_FRONTEND_VERSION").strip()

    require(version == "2.7.2", "BECOMING_FRONTEND_VERSION must be 2.7.2")
    require("SCHEMA_VERSION = 11" in app, "schema version 11 missing")
    require(app.endswith("\n") and not app.endswith("\n\n"), "app.py EOF hygiene failed")

    # Interface language owns global chrome and screen copy.
    for needle in [
        "export function uiLocale",
        "export function applyChromeI18n",
        "export function categoryLabel",
        "export function practiceModeLabel",
        "export function topicLabel",
        "profile.interface_language",
        "chrome.home",
    ]:
        require(needle in i18n, f"central i18n contract missing: {needle}")
    require("becoming.support-language.v1" in template, "interface language does not boot before UI")
    require("data-learning-language" not in template, "learning language should remain runtime state, not replace UI locale")

    for screen in ["home", "write", "review", "reading", "library", "journey", "profile", "onboarding"]:
        source = text(f"static/becoming/screens/{screen}.js")
        require("../domain/i18n.js" in source and "t(" in source, f"{screen} does not consume central i18n")

    require("uiLocale()==='vi'&&payload.translation_vi" in dictionary, "dictionary Vietnamese-only helper content leaks across interface locales")
    require("uiLocale()==='vi'?(checked.explanation_vi" in reading, "Reading Vietnamese explanation leaks across interface locales")
    require("uiLocale()==='vi'?item.translation_vi" in library, "Library Vietnamese translation leaks across interface locales")

    # Future modules require product-design intent metadata.
    route_match = re.search(r"VALID\s*=\s*new Set\(\[([^\]]+)\]\)", router, re.S)
    routes = set(re.findall(r"['\"]([a-z_-]+)['\"]", route_match.group(1))) if route_match else set()
    contracts = set(re.findall(r"^\s{2}([a-z_-]+):\{", contract, re.M))
    require(bool(routes), "could not read router routes")
    require(routes == contracts, f"screen-contract mismatch: router={sorted(routes)} contract={sorted(contracts)}")
    for field in ["learnerGoal:", "dominantIdea:", "primaryAction:", "progressiveDisclosure:", "evidence:"]:
        require(field in contract, f"screen contract field missing: {field}")
    require("screenContract(route)" in app_js, "runtime does not verify screen contract")

    # Async actions communicate immediately.
    for needle in ["export function spinner", "export function setBusy", "export async function runBusy", "showLoadingDialog"]:
        require(needle in primitives, f"busy primitive missing: {needle}")
    require("showLoadingDialog(" in dictionary, "dictionary/Pinyin lookup does not open an immediate loading dialog")
    require("@keyframes becoming-spin" in app_css and ".busy-indicator" in app_css, "visible busy indicator styles missing")

    # Chinese Review Pinyin lives in Review unless explicitly off.
    for needle in [
        "review-pinyin-summary", "review-pinyin-overview", "hydrateReviewPinyin",
        "api.dictionary(term)", "state.profile?.pinyin==='off'", "busy.loading_pinyin",
    ]:
        require(needle in review, f"Review Pinyin contract missing: {needle}")
    require("profilePinyin" in profile and "profile.pinyin_auto" in profile and "profile.pinyin_off" in profile, "Pinyin user setting missing")
    require(".review-pinyin-overview" in phase3, "Review Pinyin processing UI styles missing")

    # Multiple curated themes persist without changing the product IA.
    require("theme_preset: str" in memory and "ADD COLUMN theme_preset" in memory, "theme preference additive migration missing")
    for preset in ["editorial", "sage", "clay", "blueprint"]:
        require(preset in theme, f"theme runtime preset missing: {preset}")
        if preset != "editorial":
            require(f'html[data-palette="{preset}"]' in theme_css, f"theme CSS missing: {preset}")
    require("profileTheme" in profile and "theme-choice-grid" in profile, "Profile theme chooser missing")
    require(".theme-choice-grid" in app_css, "theme chooser responsive styles missing")

    # Growth Rank is earned from real evidence, not activity or external scoring.
    for needle in ["revision_wins", "reliableStrengths", "masteredStrengths", "internal_growth_rank"]:
        require(needle in rank, f"Growth Rank evidence contract missing: {needle}")
    require("profile.rank.note" in rank_frame and "growth-rank-frame" in rank_frame, "Growth Rank frame missing")
    require("growthRankFrame(rank)" in profile, "Profile does not render Growth Rank")
    require(".growth-rank-frame" in app_css, "Growth Rank visual system missing")
    for forbidden in ["streak", "leaderboard", " xp ", "cefr_rank", "hsk_rank"]:
        require(forbidden not in (rank + rank_frame).lower(), f"Growth Rank introduced forbidden activity/benchmark concept: {forbidden}")

    # Existing product IA remains stable.
    for route in ["home", "write", "read", "library", "journey", "profile"]:
        require(f'data-route="{route}"' in template, f"existing nav route missing: {route}")
    require('data-route="rank"' not in template and 'data-route="theme"' not in template, "polish introduced unnecessary navigation")
    require("writingProgressOverview" in journey, "Writing progress evidence overview regressed")

    # Current asset route/cache discipline remains stable.
    require("/static/becoming/" not in template, "legacy BECOMING asset path reintroduced")
    require("/becoming-assets/app.js?v=2.7.2" in template, "2.7.2 app cache key missing")

    # New presentation layers do not bypass the current AI/provider architecture.
    for label, source in [
        ("i18n", i18n), ("theme", theme), ("rank", rank + rank_frame), ("dictionary", dictionary),
    ]:
        for forbidden in ["/api/chat", "OLLAMA_URL", "requests."]:
            require(forbidden not in source, f"{label} bypasses shared architecture: {forbidden}")

if errors:
    print("BECOMING v2.7.2 UI/UX polish validation FAILED")
    for item in errors:
        print(" -", item)
    raise SystemExit(1)

print("BECOMING v2.7.2 UI/UX polish validation OK")
print("Global design contracts + consistent interface locale + visible async feedback + Chinese Review Pinyin + curated themes + evidence-derived Growth Rank present")
