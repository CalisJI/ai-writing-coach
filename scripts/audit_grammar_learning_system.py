from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = ROOT / "docs" / "ORENA_GRAMMAR_SYSTEM_AUDIT.md"
MAP_PATH = ROOT / "docs" / "ORENA_GRAMMAR_MIGRATION_MAP.json"

LANGS = {
    "english": {
        "code": "en",
        "expected_levels": ["A1", "A2", "B1", "B2", "C1", "C2"],
    },
    "chinese": {
        "code": "zh",
        "expected_levels": ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6", "HSK7-9"],
    },
}

RICH_CAPABILITIES = {
    "hook",
    "meaning",
    "learning_blocks",
    "patterns",
    "semantic_parts",
    "situations",
    "transformations",
    "word_order",
    "timelines",
    "personal_practice",
    "active_recall",
    "memory_hook",
    "recap",
    "transfer",
}

VISUAL_RENDERER_MARKERS = {
    "formula": ("GrammarFormula", "grammar-formula", "formulaBlock"),
    "semantic_sentence": ("SemanticSentence", "semantic-sentence", "semanticSentence"),
    "transformation": ("TransformationFlow", "transformation-flow", "transformationFlow"),
    "word_order": ("WordOrderFlow", "word-order-flow", "wordOrderFlow"),
    "timeline": ("TimelineVisual", "timeline-visual", "timelineVisual"),
    "contrast": ("ContrastCard", "contrast-card", "contrastCard"),
    "scene": ("RealLifeScene", "UsageScenario", "real-life-scene", "usage-scenario"),
    "sentence_builder": ("SentenceBuilder", "sentence-builder", "sentenceBuilder"),
    "personal_practice": ("PersonalPractice", "personal-practice", "personalPractice"),
    "recall": ("RecallPrompt", "recall-prompt", "activeRecall"),
    "memory_hook": ("MemoryHook", "memory-hook", "memoryHook"),
    "skill_transfer": ("SkillTransfer", "skill-transfer", "skillTransfer"),
}

SCAN_SUFFIXES = {".py", ".js", ".mjs", ".html", ".md"}
SCAN_EXCLUDES = {
    "writing_coach/languages/english/grammar_curriculum.json",
    "writing_coach/languages/chinese/grammar_curriculum.json",
    "writing_coach/languages/english/grammar_knowledge.json",
    "writing_coach/languages/chinese/grammar_knowledge.json",
    "docs/ORENA_GRAMMAR_MIGRATION_MAP.json",
    "docs/ORENA_GRAMMAR_SYSTEM_AUDIT.md",
}

def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))

def stable_fingerprint(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def duplicate_groups(items: list[dict[str, Any]], getter) -> list[dict[str, Any]]:
    groups: dict[str, list[str]] = defaultdict(list)
    for item in items:
        value = str(getter(item) or "").strip()
        if value:
            groups[value].append(str(item["id"]))
    return [
        {"value": key, "ids": ids, "count": len(ids)}
        for key, ids in groups.items()
        if len(ids) > 1
    ]

def recommend_modes(language: str, item: dict[str, Any]) -> list[str]:
    # Audit heuristic only. This is NOT authoritative pedagogy.
    text = " ".join(
        str(item.get(key) or "")
        for key in ("title", "module", "category", "objective_vi")
    ).lower()

    modes: list[str] = []
    def add(*values: str) -> None:
        for value in values:
            if value not in modes:
                modes.append(value)

    if language == "english":
        if any(x in text for x in (
            "present", "past", "future", "perfect", "continuous", "tense", "aspect",
        )):
            add("formula", "timeline", "contrast", "scene")
        if any(x in text for x in (
            "plural", "comparative", "superlative", "participle", "gerund", "infinitive",
        )):
            add("transformation", "formula", "contrast")
        if any(x in text for x in (
            "word order", "question", "negative", "passive", "reported", "relative clause",
            "noun clause", "adverb clause", "conditional", "causative",
        )):
            add("formula", "position", "contrast", "sentence_builder")
        if any(x in text for x in (
            "article", "determiner", "preposition", "some", "any", "modal",
        )):
            add("formula", "contrast", "scene")
    else:
        if any(x in text for x in (
            "svo", "trật tự", "word order", "vị trí", "把", "被", "是...的", "是…的",
            "存在", "tồn tại", "连", "除了",
        )):
            add("position", "formula", "sentence_builder", "scene")
        if any(x in text for x in ("了", "过", "着", "thể", "aspect")):
            add("insertion", "timeline", "contrast", "scene")
        if any(x in text for x in (
            "比", "比较", "so sánh", "一样", "越来越", "越...越", "越…越", "没有 comparison",
        )):
            add("formula", "contrast", "scene")
        if any(x in text for x in ("量词", "lượng từ", "classifier", "个")):
            add("formula", "scene", "categorize")
        if any(x in text for x in ("补语", "bổ ngữ", "complement")):
            add("position", "formula", "contrast")
        if any(x in text for x in ("不", "没", "没有", "negation", "phủ định")):
            add("contrast", "position", "scene")
        if any(x in text for x in ("的", "地", "得")):
            add("position", "contrast", "semantic_sentence")

    if not modes:
        add("formula", "context", "contrast")
    return modes

def scan_source() -> dict[str, Any]:
    grammar_hits = []
    developer_primary_flow_markers = []
    hardcoded_ids = []

    grammar_id_pattern = re.compile(r"(?:zh-hsk\d|[abc]\d-[a-z0-9-]{4,})", re.I)
    developer_terms = (
        "Lesson source",
        "Nguồn lesson",
        "课程来源",
        "Completion records study activity only",
        "Dấu hoàn thành chỉ ghi nhận",
        "完成记录只表示",
        "locked-syllabus-fallback",
        "generated teaching layer",
        "generated teaching",
    )

    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in SCAN_SUFFIXES:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel in SCAN_EXCLUDES or rel.startswith(".git/"):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue

        low = text.lower()
        if "grammar" in low or "ngữ pháp" in low or "语法" in text:
            grammar_hits.append(rel)

        found_dev = [term for term in developer_terms if term in text]
        if found_dev:
            developer_primary_flow_markers.append({"path": rel, "markers": found_dev})

        ids = sorted(set(grammar_id_pattern.findall(text)))
        if ids:
            hardcoded_ids.append({"path": rel, "ids": ids[:20], "count": len(ids)})

    return {
        "grammar_related_source_files": sorted(grammar_hits),
        "developer_or_metadata_markers": developer_primary_flow_markers,
        "hardcoded_grammar_id_candidates": hardcoded_ids,
    }

def renderer_audit() -> dict[str, Any]:
    path = ROOT / "static" / "becoming" / "screens" / "grammar.js"
    text = path.read_text(encoding="utf-8")
    supported = {}
    for capability, markers in VISUAL_RENDERER_MARKERS.items():
        supported[capability] = any(marker in text for marker in markers)

    return {
        "path": path.relative_to(ROOT).as_posix(),
        "legacy_linear_blocks": {
            "objective": "c.objective" in text,
            "rules": "detail.rules" in text,
            "contrasts": "detail.contrasts" in text,
            "exceptions": "detail.exceptions" in text,
            "examples": "examplesBlock(detail.examples)" in text,
            "mistakes": "detail.mistakes" in text,
            "guided_practice": "practiceBlock(detail.guided_practice)" in text,
            "production": "data-grammar-production" in text,
        },
        "visual_learning_capabilities": supported,
        "source_metadata_in_primary_flow": "c.source" in text and "grammar-lesson-actions" in text,
        "mastery_disclaimer_in_primary_flow": "c.noMastery" in text,
        "completion_requires_two_production_lines": "productionEntries.length<2" in text,
        "shared_renderer": True,
        "english_chinese_same_renderer": True,
    }

def architecture_audit() -> dict[str, Any]:
    checks = {}
    files = {
        "router": ROOT / "static" / "becoming" / "router.js",
        "app_js": ROOT / "static" / "becoming" / "app.js",
        "api_js": ROOT / "static" / "becoming" / "api.js",
        "app_py": ROOT / "app.py",
        "i18n": ROOT / "static" / "becoming" / "domain" / "i18n.js",
        "knowledge_validator": ROOT / "writing_coach" / "grammar_knowledge.py",
    }
    texts = {key: path.read_text(encoding="utf-8") for key, path in files.items()}

    checks["route_hash_grammar"] = "'grammar'" in texts["router"]
    checks["screen_registered"] = "grammar:renderGrammar" in texts["app_js"]
    checks["shared_api_client"] = "grammarLesson:" in texts["api_js"]
    checks["quick_reference_api_client"] = "grammarReference:" in texts["api_js"]
    checks["static_kb_endpoint"] = '"static-grammar-kb"' in texts["app_py"]
    checks["runtime_ai_removed"] = "def generate_grammar_lesson(" not in texts["app_py"]
    checks["completion_endpoint"] = '@app.post("/api/library/grammar/{lesson_id}/complete")' in texts["app_py"]
    checks["uncomplete_endpoint"] = '@app.delete("/api/library/grammar/{lesson_id}/complete")' in texts["app_py"]
    checks["chrome_i18n"] = "chrome.grammar" in texts["i18n"]
    checks["kb_runtime_ai_guard"] = "runtime_ai" in texts["knowledge_validator"]
    checks["kb_cross_skill_guard"] = "cross_skill" in texts["knowledge_validator"]
    return checks

def audit_language(language: str, cfg: dict[str, Any]) -> dict[str, Any]:
    base = ROOT / "writing_coach" / "languages" / language
    curriculum = load_json(base / "grammar_curriculum.json")
    knowledge = load_json(base / "grammar_knowledge.json")
    kb_by_id = {str(item["id"]): item for item in knowledge}

    counts = Counter(str(item.get("kind") or "unknown") for item in curriculum)
    levels = Counter(str(item.get("level") or "unknown") for item in curriculum)
    lesson_levels = Counter(
        str(item.get("level") or "unknown")
        for item in curriculum
        if item.get("kind") == "lesson"
    )
    modules = Counter(str(item.get("module") or "") for item in curriculum)
    categories = Counter(str(item.get("category") or "") for item in curriculum)

    curriculum_keys = sorted({key for item in curriculum for key in item})
    knowledge_keys = sorted({key for item in knowledge for key in item})
    lesson_body_keys = sorted({
        key
        for item in knowledge
        for key in (item.get("lesson") or {})
    })

    missing_kb = []
    foundation = []
    curated = []
    placeholders = []
    migration = []

    for item in curriculum:
        grammar_id = str(item["id"])
        kb = kb_by_id.get(grammar_id)
        reasons = []
        status = "PENDING"

        if kb is None:
            missing_kb.append(grammar_id)
            reasons.append("missing_static_kb")
            status = "BLOCKED"
        else:
            source = kb.get("source") or {}
            content_status = source.get("content_status")
            if content_status == "foundation":
                foundation.append(grammar_id)
                reasons.append("foundation_content_only")
            elif content_status == "curated":
                curated.append(grammar_id)
            else:
                reasons.append("unknown_content_status")

            body = kb.get("lesson") or {}
            if item.get("kind") == "lesson":
                empty_fields = [
                    field
                    for field in ("rules", "examples", "mistakes")
                    if not body.get(field)
                ]
                if empty_fields:
                    placeholders.append({
                        "id": grammar_id,
                        "empty_fields": empty_fields,
                    })
                    reasons.append("teaching_body_incomplete:" + ",".join(empty_fields))

            if not any(key in kb for key in RICH_CAPABILITIES):
                reasons.append("rich_learning_model_not_migrated")

            if (
                content_status == "curated"
                and any(key in kb for key in RICH_CAPABILITIES)
                and not reasons
            ):
                status = "MIGRATED"

        migration.append({
            "id": grammar_id,
            "language": cfg["code"],
            "level": item.get("level"),
            "kind": item.get("kind"),
            "module": item.get("module"),
            "category": item.get("category"),
            "title": item.get("title"),
            "status": status,
            "reasons": reasons,
            "candidate_visual_modes": recommend_modes(language, item),
            "candidate_modes_are_heuristic": True,
        })

    duplicate_titles = duplicate_groups(curriculum, lambda x: x.get("title"))
    duplicate_objectives = duplicate_groups(curriculum, lambda x: x.get("objective_vi"))

    body_fingerprints: dict[str, list[str]] = defaultdict(list)
    for item in knowledge:
        body_fingerprints[stable_fingerprint(item.get("lesson") or {})].append(str(item["id"]))
    duplicate_bodies = [
        {"fingerprint": fp, "ids": ids, "count": len(ids)}
        for fp, ids in body_fingerprints.items()
        if len(ids) > 1
    ]

    migration_counts = Counter(row["status"] for row in migration)

    return {
        "language": language,
        "code": cfg["code"],
        "total_items": len(curriculum),
        "counts_by_kind": dict(sorted(counts.items())),
        "levels_all_items": dict(levels),
        "lesson_levels": dict(lesson_levels),
        "expected_levels": cfg["expected_levels"],
        "level_coverage_ok": set(lesson_levels) == set(cfg["expected_levels"]),
        "module_count": len([x for x in modules if x]),
        "category_count": len([x for x in categories if x]),
        "modules": dict(modules.most_common()),
        "categories": dict(categories.most_common()),
        "curriculum_schema_keys": curriculum_keys,
        "knowledge_schema_keys": knowledge_keys,
        "lesson_body_schema_keys": lesson_body_keys,
        "missing_kb_ids": missing_kb,
        "foundation_count": len(foundation),
        "curated_count": len(curated),
        "placeholder_or_incomplete_lesson_count": len(placeholders),
        "placeholder_or_incomplete_lessons": placeholders,
        "duplicate_title_groups": duplicate_titles,
        "duplicate_objective_groups": duplicate_objectives,
        "duplicate_lesson_body_groups": duplicate_bodies,
        "migration_counts": dict(migration_counts),
        "migration": migration,
    }

def md_list(values: list[str]) -> str:
    return ", ".join(values) if values else "None"

def status_line(label: str, value: bool) -> str:
    return f"- {'DONE' if value else 'PENDING'} — {label}"

def main() -> None:
    languages = {
        language: audit_language(language, cfg)
        for language, cfg in LANGS.items()
    }
    renderer = renderer_audit()
    architecture = architecture_audit()
    source_scan = scan_source()

    migration_rows = [
        row
        for data in languages.values()
        for row in data["migration"]
    ]
    overall_counts = Counter(row["status"] for row in migration_rows)

    result = {
        "audit_version": 1,
        "source_of_truth": "repository grammar_curriculum.json + static grammar_knowledge.json",
        "scope": "ALL current English and Chinese grammar curriculum items",
        "language_data": languages,
        "renderer": renderer,
        "architecture": architecture,
        "source_scan": source_scan,
        "overall_migration_counts": dict(overall_counts),
        "hard_rule": (
            "Do not mark Grammar redesign complete until every current English and Chinese "
            "curriculum item has an explicit migration status and legacy presentation is removed "
            "or explicitly reported as pending/blocked."
        ),
    }

    MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    MAP_PATH.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    en = languages["english"]
    zh = languages["chinese"]
    visual = renderer["visual_learning_capabilities"]
    missing_visual = [name for name, supported in visual.items() if not supported]

    lines = [
        "# Orena Global Grammar Learning System — Phase 1 Audit",
        "",
        "> Scope: all current English + Chinese grammar content. This document is an audit/migration map, not a claim that the redesign is complete.",
        "",
        "## AUDIT",
        "",
        f"- English: **{en['counts_by_kind'].get('lesson', 0)} lessons / {en['total_items']} total items**.",
        f"- Chinese: **{zh['counts_by_kind'].get('lesson', 0)} lessons / {zh['total_items']} total items**.",
        f"- Total current curriculum items: **{en['total_items'] + zh['total_items']}**.",
        f"- English levels: {md_list(list(en['lesson_levels']))}.",
        f"- Chinese levels: {md_list(list(zh['lesson_levels']))}.",
        f"- English modules/categories: {en['module_count']} / {en['category_count']}.",
        f"- Chinese modules/categories: {zh['module_count']} / {zh['category_count']}.",
        "",
        "### Current data model",
        "",
        f"- Curriculum keys: `{', '.join(en['curriculum_schema_keys'])}`.",
        f"- Static KB top-level keys: `{', '.join(en['knowledge_schema_keys'])}`.",
        f"- Current teaching-body keys: `{', '.join(en['lesson_body_schema_keys'])}`.",
        "- Static KB already provides stable IDs, quick reference, cross-skill metadata, content status and runtime-AI exclusion.",
        "- The current KB does **not** yet expose the rich adaptive learning-block model required for formula, position, insertion, timeline, scene, sentence-building, recall and transfer composition.",
        "",
        "## ARCHITECTURE",
        "",
        status_line("`#/grammar` route exists", architecture["route_hash_grammar"]),
        status_line("Grammar screen is registered", architecture["screen_registered"]),
        status_line("Shared API client serves Grammar", architecture["shared_api_client"]),
        status_line("Quick-reference API client exists", architecture["quick_reference_api_client"]),
        status_line("Lesson endpoint serves static KB", architecture["static_kb_endpoint"]),
        status_line("Runtime Grammar lesson AI generation is removed", architecture["runtime_ai_removed"]),
        status_line("Completion/uncomplete endpoints exist", architecture["completion_endpoint"] and architecture["uncomplete_endpoint"]),
        status_line("Grammar chrome localization exists", architecture["chrome_i18n"]),
        "",
        "## CURRENT RENDERER GAP",
        "",
        "- Current lesson renderer is still primarily linear: objective → rules → contrasts → exceptions → examples → mistakes → guided practice → production.",
        f"- Missing reusable visual-learning capabilities detected in current renderer: **{md_list(missing_visual)}**.",
        f"- Developer/content-source metadata in primary learning flow: **{'YES' if renderer['source_metadata_in_primary_flow'] else 'NO'}**.",
        f"- Mastery/completion disclaimer in primary learning flow: **{'YES' if renderer['mastery_disclaimer_in_primary_flow'] else 'NO'}**.",
        f"- Current completion gate is based on two production lines: **{'YES' if renderer['completion_requires_two_production_lines'] else 'NO'}**.",
        "",
        "## ENGLISH",
        "",
        f"- DONE — curriculum source of truth exists for {en['counts_by_kind'].get('lesson', 0)} lessons.",
        f"- DONE — static KB coverage missing IDs: {len(en['missing_kb_ids'])}.",
        f"- IN PROGRESS — foundation static content: {en['foundation_count']}.",
        f"- DONE — curated rich-learning content: {en['curated_count']}.",
        f"- PENDING — incomplete/placeholder teaching bodies detected: {en['placeholder_or_incomplete_lesson_count']}.",
        f"- Migration status: `{json.dumps(en['migration_counts'], ensure_ascii=False)}`.",
        "",
        "## CHINESE",
        "",
        f"- DONE — curriculum source of truth exists for {zh['counts_by_kind'].get('lesson', 0)} lessons.",
        f"- DONE — static KB coverage missing IDs: {len(zh['missing_kb_ids'])}.",
        f"- IN PROGRESS — foundation static content: {zh['foundation_count']}.",
        f"- DONE — curated rich-learning content: {zh['curated_count']}.",
        f"- PENDING — incomplete/placeholder teaching bodies detected: {zh['placeholder_or_incomplete_lesson_count']}.",
        f"- Migration status: `{json.dumps(zh['migration_counts'], ensure_ascii=False)}`.",
        "",
        "## DUPLICATION / PLACEHOLDER SIGNALS",
        "",
        f"- English duplicate-title groups: {len(en['duplicate_title_groups'])}.",
        f"- Chinese duplicate-title groups: {len(zh['duplicate_title_groups'])}.",
        f"- English duplicate teaching-body fingerprints: {len(en['duplicate_lesson_body_groups'])}.",
        f"- Chinese duplicate teaching-body fingerprints: {len(zh['duplicate_lesson_body_groups'])}.",
        "- Duplicate fingerprints are audit signals only; they require content review before being treated as actual duplicate lessons.",
        "",
        "## LOCALIZATION",
        "",
        "- Shared Grammar renderer currently has EN/VI/ZH chrome copy.",
        "- Current lesson-body source is not yet a full learner-locale content system; the next content model must separate UI locale from target-language pedagogy.",
        "- Chinese must preserve Hanzi-first presentation with optional/toggleable Pinyin and natural meaning layers in Phase 2+.",
        "",
        "## PROGRESS / COMPLETION",
        "",
        "- Existing completion persistence is retained and must not regress.",
        "- Current completion is activity evidence, not mastery.",
        "- Phase 2 must move completion UI to the end of meaningful learning flow without breaking existing stored completion IDs.",
        "",
        "## HARD-CODE / SOURCE SCAN",
        "",
        f"- Grammar-related source files detected: {len(source_scan['grammar_related_source_files'])}.",
        f"- Files with developer/metadata markers requiring UX review: {len(source_scan['developer_or_metadata_markers'])}.",
        f"- Files with possible hard-coded grammar IDs: {len(source_scan['hardcoded_grammar_id_candidates'])}.",
        "- Full file lists and markers are preserved in `docs/ORENA_GRAMMAR_MIGRATION_MAP.json`.",
        "",
        "## PHASE 2 ENTRY GATE",
        "",
        "- Build one shared Grammar Learning Content Model by extending the existing static KB; do not create a parallel lesson source.",
        "- Build reusable adaptive learning blocks for formula, semantic sentence, transformation, position, insertion, timeline/aspect, contrast, scene, sentence building, micro-practice, personal practice, recall, memory hook and skill transfer.",
        "- Preserve stable grammar IDs, current completion namespace and static-runtime behavior.",
        "- Validate structurally different English concepts before mass migration.",
        "- Validate Chinese word order, particle/aspect, comparison/classifier and construction concepts before mass migration.",
        "- Do not begin full 508-item content migration until both representative English and Chinese renderers pass.",
        "",
        "## MIGRATION STATUS",
        "",
        f"- Overall: `{json.dumps(dict(overall_counts), ensure_ascii=False)}`.",
        "- Per-item status, reasons and candidate visual modes are in `docs/ORENA_GRAMMAR_MIGRATION_MAP.json`.",
        "- Candidate visual modes are heuristics for planning only; they are not authoritative pedagogy.",
        "",
        "## REMAINING WORK",
        "",
        "1. Phase 2 — rich data model + reusable renderer/component foundation.",
        "2. Phase 3 — representative English validation.",
        "3. Phase 4 — representative Chinese validation.",
        "4. Phase 5 — migrate every current curriculum item with explicit status.",
        "5. Phase 6 — Writing/Speaking/Reading/Listening grammar inspection and transfer.",
        "6. Phase 7 — desktop/mobile/accessibility/localization/regression QA.",
        "",
        "**Grammar redesign status: IN PROGRESS. Phase 1 audit only.**",
        "",
    ]
    DOC_PATH.write_text("\n".join(lines), encoding="utf-8")

    assert en["total_items"] == 269, en["total_items"]
    assert zh["total_items"] == 239, zh["total_items"]
    assert en["counts_by_kind"].get("lesson") == 228, en["counts_by_kind"]
    assert zh["counts_by_kind"].get("lesson") == 197, zh["counts_by_kind"]
    assert not en["missing_kb_ids"], en["missing_kb_ids"][:5]
    assert not zh["missing_kb_ids"], zh["missing_kb_ids"][:5]
    assert architecture["runtime_ai_removed"]
    assert architecture["static_kb_endpoint"]
    assert len(migration_rows) == 508
    assert sum(overall_counts.values()) == 508

    print("ORENA_GRAMMAR_PHASE1_AUDIT=PASS")
    print(f"EN_LESSONS={en['counts_by_kind'].get('lesson')} EN_ITEMS={en['total_items']}")
    print(f"ZH_LESSONS={zh['counts_by_kind'].get('lesson')} ZH_ITEMS={zh['total_items']}")
    print(f"MIGRATION={dict(overall_counts)}")
    print(f"REPORT={DOC_PATH.relative_to(ROOT)}")
    print(f"MAP={MAP_PATH.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
