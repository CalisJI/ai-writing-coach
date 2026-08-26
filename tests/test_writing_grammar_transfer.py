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
        "grammar_id": "a1-agreement",
        "title": "Subject verb agreement",
        "level": "A1",
        "reason": "Writing finding category: agreement",
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
