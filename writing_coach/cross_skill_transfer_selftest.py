from writing_coach.cross_skill_transfer import select_cross_skill_cue


def test_each_source_is_linkable():
    assert select_cross_skill_cue(language="en", writing={"available": True, "language": "en", "essay_id": 4, "evidence": "I am"})["source"] == "writing"
    assert select_cross_skill_cue(language="en", reading=[{"id": 2, "language": "en", "title": "Travel", "latest_attempt": {"correct_count": 3, "total": 4}}])["source"] == "reading"
    listening = [{"id": "l1", "language": "en", "asset_id": "a", "segment_id": "s", "source_url": "https://example.test/a", "revealed": True}]
    assert select_cross_skill_cue(language="en", listening=listening)["source"] == "listening"
    assert select_cross_skill_cue(language="en", listening=[{"id": "l2", "language": "en", "asset_id": "a", "segment_id": "s", "checked_attempt_count": 1}])["action"]["segment_id"] == "s"
    speaking = [{"id": "sp1", "language": "en", "asset_id": "a", "segment_id": "s", "reference_text": "Hello", "transcript_text": "Hello", "dimensions": {"fluency": 90}}]
    assert select_cross_skill_cue(language="en", speaking=speaking)["source"] == "speaking"


def test_rejects_malformed_stale_and_cross_language_records():
    malformed = [{"id": 2, "language": "en", "title": "Travel", "latest_attempt": {"correct_count": 5, "total": 4}}]
    assert select_cross_skill_cue(language="en", reading=malformed)["available"] is False
    stale = [{"id": 3, "language": "en", "title": "Old session", "latest_attempt": None}]
    assert select_cross_skill_cue(language="en", reading=stale)["available"] is False
    assert select_cross_skill_cue(language="zh", reading=[{"id": 2, "language": "en", "title": "Travel", "latest_attempt": {"correct_count": 3, "total": 4}}])["available"] is False
    assert select_cross_skill_cue(language="en", writing={"available": True, "language": "vi", "essay_id": 4, "evidence": "I am"})["available"] is False
    assert select_cross_skill_cue(language="en", listening=[{"language": "en", "asset_id": "a", "segment_id": "s", "revealed": False, "checked_attempt_count": 0}])["available"] is False
    assert select_cross_skill_cue(language="zh", speaking=[{"language": "en", "asset_id": "a", "segment_id": "s", "reference_text": "Hi", "transcript_text": "Hi", "dimensions": {"fluency": 90}}])["available"] is False
    assert "proficiency" not in select_cross_skill_cue(language="en", reading=[{"id": 2, "language": "en", "title": "Travel", "latest_attempt": {"correct_count": 3, "total": 4}}])


if __name__ == "__main__":
    test_each_source_is_linkable()
    test_rejects_malformed_stale_and_cross_language_records()
    print("cross-skill transfer selftest: PASS")
