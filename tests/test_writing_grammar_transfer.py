from writing_coach.writing_grammar_transfer import grammar_links_for_issues


def test_transfer_links_agreement_to_matching_static_lesson():
    knowledge = {
        "a1-agreement": {
            "title": "Subject verb agreement",
            "level": "A1",
            "quick_reference": {"lookup_tags": ["subject-verb agreement"]},
        },
        "a1-articles": {
            "title": "Articles",
            "level": "A1",
            "quick_reference": {"lookup_tags": ["article"]},
        },
    }
    links = grammar_links_for_issues(
        [{"id": "issue-1", "category": "agreement", "quote": "I has"}], knowledge
    )
    assert links == [{
        "issue_id": "issue-1",
        "category": "agreement",
        "grammar_id": "a1-agreement",
        "title": "Subject verb agreement",
        "level": "A1",
        "reason": "Writing finding category: agreement",
        "evidence": "I has",
        "source": "static-grammar-kb",
    }]


def test_transfer_omits_uncertain_categories():
    assert grammar_links_for_issues(
        [{"id": "issue-1", "category": "word_choice"}],
        {"lesson": {"title": "Vocabulary", "quick_reference": {"lookup_tags": ["words"]}}},
    ) == []


def test_transfer_deduplicates_a_lesson_seen_in_multiple_issues():
    knowledge = {
        "a1-agreement": {
            "title": "Subject verb agreement",
            "level": "A1",
            "quick_reference": {"lookup_tags": ["agreement"]},
        },
    }
    links = grammar_links_for_issues(
        [
            {"id": "issue-1", "category": "agreement"},
            {"id": "issue-2", "category": "agreement"},
        ],
        knowledge,
    )
    assert [item["grammar_id"] for item in links] == ["a1-agreement"]


def test_transfer_maps_chinese_grammar_categories_to_r5_lessons():
    knowledge = {
        "hsk2-aspect": {
            "title": "Aspect particles",
            "level": "HSK2",
            "quick_reference": {"lookup_tags": ["aspect interaction", "\u8fc7/\u4e86/\u7740"]},
        },
        "hsk3-measure": {
            "title": "Measure words",
            "level": "HSK3",
            "quick_reference": {"lookup_tags": ["classifier"]},
        },
        "hsk4-ba": {
            "title": "Ba sentence",
            "level": "HSK4",
            "quick_reference": {"lookup_tags": ["ba sentence", "\u628a"]},
        },
        "hsk4-bei": {
            "title": "Bei sentence",
            "level": "HSK4",
            "quick_reference": {"lookup_tags": ["bei sentence", "\u88ab"]},
        },
    }
    issues = [
        {"id": "issue-aspect", "category": "aspect"},
        {"id": "issue-measure", "category": "measure_word"},
        {"id": "issue-ba", "category": "ba_sentence"},
        {"id": "issue-bei", "category": "bei_sentence"},
    ]

    links = grammar_links_for_issues(issues, knowledge)

    assert {item["grammar_id"] for item in links} == {
        "hsk2-aspect",
        "hsk3-measure",
        "hsk4-ba",
        "hsk4-bei",
    }
    assert {item["category"] for item in links} == {
        "aspect",
        "measure_word",
        "ba_sentence",
        "bei_sentence",
    }


def test_real_chinese_catalog_prefers_target_level_for_aspect_transfer():
    from writing_coach.languages.grammar_registry import grammar_provider

    provider = grammar_provider("zh")
    links = grammar_links_for_issues(
        [{"id": "issue-aspect", "category": "aspect"}],
        provider.knowledge_by_id,
        target_level="HSK2",
    )

    assert links
    assert all(item["level"] == "HSK2" for item in links)
    assert "zh-hsk2-review-1-31" in {item["grammar_id"] for item in links}


def test_target_level_precedes_stronger_advanced_signal():
    knowledge = {
        "hsk2-aspect": {
            "title": "Aspect basics",
            "level": "HSK2",
            "quick_reference": {"lookup_tags": ["过/了/着"]},
        },
        "hsk6-aspect": {
            "title": "Advanced written aspect interaction",
            "level": "HSK6",
            "quick_reference": {"lookup_tags": ["aspect interaction"]},
        },
    }

    links = grammar_links_for_issues(
        [{"id": "issue-aspect", "category": "aspect"}],
        knowledge,
        target_level="HSK2",
    )

    assert [item["grammar_id"] for item in links] == ["hsk2-aspect", "hsk6-aspect"]


def test_targeted_grammar_practice_carries_evidence_into_bilingual_prompt(monkeypatch):
    import app
    from types import SimpleNamespace
    from writing_coach.languages.grammar_registry import grammar_provider

    provider = grammar_provider("zh")
    grammar_id = "zh-hsk1-1-svo-c-b-n"
    assert grammar_id in provider.by_id
    lesson = provider.by_id[grammar_id]
    monkeypatch.setattr(app, "active_grammar_by_id", lambda: provider.by_id)
    monkeypatch.setattr(app, "active_profile", lambda: SimpleNamespace(code="zh"))

    result = app.grammar_targeted_practice(grammar_id, evidence="我每天写")

    assert result["grammar_id"] == grammar_id
    assert result["title"] == lesson["title"]
    assert result["level"] == lesson["level"] == "HSK1"
    assert result["target_level"] == "HSK1"
    assert result["source"] == "static-grammar-kb"
    assert result["practice_blueprint"] == lesson.get("practice_blueprint", {})
    context = result["practice_context"]
    assert context == {
        "intent": "repair",
        "focus_category": "grammar",
        "focus_label": lesson["title"],
        "focus_family": "grammar",
        "task_type": "story",
        "topic": "语法迁移练习",
        "target_level": "HSK1",
        "action_label": "练习这个语法",
        "reason": "根据你的 Writing 发现和静态 Grammar 课程选择的针对性练习。",
        "evidence": "我每天写",
        "focus_instruction": result["prompt"],
        "grammar_id": grammar_id,
        "grammar_title": lesson["title"],
    }
    assert "我每天写" in result["prompt"]


def test_targeted_grammar_practice_uses_real_english_lesson_contract(monkeypatch):
    import app
    from types import SimpleNamespace
    from writing_coach.languages.grammar_registry import grammar_provider

    provider = grammar_provider("en")
    grammar_id = "a1-complete-sentences-and-basic-word-order"
    assert grammar_id in provider.by_id
    lesson = provider.by_id[grammar_id]
    monkeypatch.setattr(app, "active_grammar_by_id", lambda: provider.by_id)
    monkeypatch.setattr(app, "active_profile", lambda: SimpleNamespace(code="en"))

    result = app.grammar_targeted_practice(grammar_id, evidence="I write")

    assert result["grammar_id"] == grammar_id
    assert result["title"] == lesson["title"]
    assert result["level"] == lesson["level"] == "A1"
    assert result["target_level"] == "A1"
    assert result["source"] == "static-grammar-kb"
    context = result["practice_context"]
    assert context["intent"] == "repair"
    assert context["focus_category"] == "grammar"
    assert context["focus_family"] == "grammar"
    assert context["focus_label"] == lesson["title"]
    assert context["grammar_id"] == grammar_id
    assert context["grammar_title"] == lesson["title"]
    assert context["target_level"] == "A1"
    assert context["evidence"] == "I write"
    assert context["focus_instruction"] == result["prompt"]
    assert result["prompt"].endswith('Pay special attention to this evidence from your writing: “I write”.')
    assert context["action_label"] == "Practice this grammar"
    assert context["reason"] == "Targeted practice selected from a Writing finding and the static Grammar curriculum."
    assert context["topic"] == "grammar transfer"
