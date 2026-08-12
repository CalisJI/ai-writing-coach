from pathlib import Path

from writing_coach.core.platform_api import api_platform_skills
from writing_coach.core.skill_registry import (
    SkillAudience,
    SkillReleaseState,
    all_skills,
    skill,
    skills_for,
)


ROOT = Path(__file__).resolve().parents[1]


def test_central_registry_represents_required_truthful_states() -> None:
    items = {item.key: item for item in all_skills()}
    assert set(items) == {"writing", "speaking", "reading", "listening"}
    assert {item.release_state for item in items.values()} >= {
        SkillReleaseState.PUBLIC,
        SkillReleaseState.DEVELOPMENT,
        SkillReleaseState.HIDDEN,
    }

    assert items["writing"].available_to(SkillAudience.PUBLIC) is True
    assert items["reading"].available_to(SkillAudience.PUBLIC) is False
    assert items["reading"].available_to(SkillAudience.INTERNAL) is True
    assert items["speaking"].source_available is False
    assert items["speaking"].available_to(SkillAudience.INTERNAL) is False
    assert items["listening"].release_state is SkillReleaseState.HIDDEN
    assert tuple(item.key for item in skills_for(SkillAudience.PUBLIC)) == ("writing",)
    assert skill("READING") is items["reading"]


def test_platform_contract_is_one_language_wide_release_matrix() -> None:
    payload = api_platform_skills()
    assert payload["policy"] == "language-wide"
    assert payload["language_scope"] == ["en", "zh"]
    assert [item["key"] for item in payload["skills"]] == [
        "writing",
        "speaking",
        "reading",
        "listening",
    ]
    assert all("language" not in item and "languages" not in item for item in payload["skills"])
    for profile in ("english", "chinese"):
        source = (ROOT / f"writing_coach/languages/{profile}/profile.py").read_text(encoding="utf-8")
        assert "release_state" not in source


def test_navigation_consumes_shared_skill_contract() -> None:
    template = (ROOT / "templates/becoming/index.html").read_text(encoding="utf-8")
    app = (ROOT / "static/becoming/app.js").read_text(encoding="utf-8")
    navigation = (ROOT / "static/becoming/domain/skill-release.js").read_text(encoding="utf-8")

    assert 'data-route="write" data-skill="writing" hidden' in template
    assert 'data-route="read" data-skill="reading" hidden' in template
    for supporting_route in ("home", "library", "journey", "profile"):
        assert f'data-route="{supporting_route}" data-skill=' not in template
    assert "applySkillNavigation(state.skills" in app
    assert "routeAvailable(route,state.skills" in app
    assert "item.public_available===true" in navigation
    assert "item.internal_available===true" in navigation
    assert "link.classList.toggle('hidden',hidden)" in navigation
    assert "development" not in navigation


def test_reading_implementation_and_release_versions_remain_intact() -> None:
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert (ROOT / "writing_coach/becoming_reading.py").is_file()
    assert (ROOT / "static/becoming/screens/reading.js").is_file()
    for route in (
        '@app.get("/api/reading/sessions"',
        '@app.get("/api/reading/session/{session_id}"',
        '@app.post("/api/reading/session"',
        '@app.post("/api/reading/session/{session_id}/answer"',
    ):
        assert route in app
    assert (ROOT / "VERSION").read_text(encoding="utf-8").strip() == "1.4.0"
    assert (ROOT / "BECOMING_FRONTEND_VERSION").read_text(encoding="utf-8").strip() == "2.15.7"
