from writing_coach.product.catalog import FREE, PREMIUM, plan_by_id


def test_free_and_premium_catalog():
    assert FREE.id == "free"
    assert PREMIUM.id == "premium"
    assert plan_by_id("unknown").id == "free"


def test_premium_has_advanced_features():
    free = FREE.entitlement_map()
    premium = PREMIUM.entitlement_map()
    assert free["analytics.advanced"].enabled is False
    assert premium["analytics.advanced"].enabled is True
    assert free["practice.personalized"].enabled is False
    assert premium["practice.personalized"].enabled is True


def test_limits_are_catalog_data_not_user_flags():
    assert FREE.entitlement_map()["writing.evaluate"].monthly_limit == 30
    assert PREMIUM.entitlement_map()["writing.evaluate"].monthly_limit == 500
