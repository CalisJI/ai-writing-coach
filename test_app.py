from app import app_cefr, weighted_overall

def test_weighted_score():
    d = {"grammar": 60, "vocabulary": 70, "coherence": 65, "task_achievement": 80, "naturalness": 55}
    assert weighted_overall(d) == 66.2

def test_bands():
    assert app_cefr(29) == "A1"
    assert app_cefr(44.9) == "A2"
    assert app_cefr(59.9) == "B1"
    assert app_cefr(74.9) == "B2"
    assert app_cefr(89.9) == "C1"
    assert app_cefr(90) == "C2"
