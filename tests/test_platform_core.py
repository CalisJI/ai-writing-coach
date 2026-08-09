from pathlib import Path

from writing_coach.core.language_registry import DEFAULT_LANGUAGE, all_languages, enabled_language
from writing_coach.core.storage import resolve_language_db_path, user_hash
from writing_coach.languages.english.profile import RUBRIC_WEIGHTS, score_to_level


def test_language_registry_contract():
    items = {x.code: x for x in all_languages()}
    assert DEFAULT_LANGUAGE == "en"
    assert items["en"].enabled is True
    assert items["zh"].enabled is False
    assert enabled_language("zh").code == "en"


def test_core_rubric_is_stable():
    assert list(RUBRIC_WEIGHTS) == [
        "grammar", "vocabulary", "coherence", "task_achievement", "naturalness"
    ]
    assert round(sum(RUBRIC_WEIGHTS.values()), 8) == 1.0


def test_english_score_bands():
    assert score_to_level(29) == "A1"
    assert score_to_level(44.9) == "A2"
    assert score_to_level(59.9) == "B1"
    assert score_to_level(74.9) == "B2"
    assert score_to_level(89.9) == "C1"
    assert score_to_level(90) == "C2"


def test_authenticated_language_paths_are_isolated(tmp_path: Path):
    legacy = tmp_path / "writing.db"
    users = tmp_path / "users"
    en = resolve_language_db_path(
        user_key="same-user", language_code="en", legacy_db=legacy,
        user_data_root=users, auth_enabled=True
    )
    zh = resolve_language_db_path(
        user_key="same-user", language_code="zh", legacy_db=legacy,
        user_data_root=users, auth_enabled=True
    )
    assert en != zh
    assert en == users / user_hash("same-user") / "en" / "writing.db"
    assert zh == users / user_hash("same-user") / "zh" / "writing.db"


def test_old_authenticated_english_db_is_copied_once(tmp_path: Path):
    legacy = tmp_path / "writing.db"
    users = tmp_path / "users"
    root = users / user_hash("user-a")
    root.mkdir(parents=True)
    old = root / "writing.db"
    old.write_bytes(b"legacy-data")
    canonical = resolve_language_db_path(
        user_key="user-a", language_code="en", legacy_db=legacy,
        user_data_root=users, auth_enabled=True
    )
    assert canonical.read_bytes() == b"legacy-data"
    assert old.exists()
