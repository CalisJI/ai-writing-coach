from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from writing_coach.product.catalog import DEFAULT_PLAN_ID, Plan, plan_by_id
from writing_coach.product.repository import ProductRepository, SQLiteProductRepository


@dataclass(frozen=True)
class FeatureAccess:
    key: str
    enabled: bool
    monthly_limit: int | None
    used: int
    remaining: int | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "enabled": self.enabled,
            "monthly_limit": self.monthly_limit,
            "used": self.used,
            "remaining": self.remaining,
        }


class ProductService:
    def __init__(self, repository: ProductRepository | None = None) -> None:
        self.repository = repository or SQLiteProductRepository()

    def plan_for_user(self, user_key: str) -> Plan:
        subscription = self.repository.get_subscription(user_key)
        if not subscription or subscription.status not in {"active", "trialing"}:
            return plan_by_id(DEFAULT_PLAN_ID)
        return plan_by_id(subscription.plan_id)

    def feature_access(self, *, user_key: str, feature: str) -> FeatureAccess:
        plan = self.plan_for_user(user_key)
        entitlement = plan.entitlement_map().get(feature)
        if not entitlement:
            return FeatureAccess(feature, False, None, 0, None)

        used = self.repository.monthly_usage(user_key=user_key, feature=feature)
        remaining = (
            None
            if entitlement.monthly_limit is None
            else max(0, entitlement.monthly_limit - used)
        )
        enabled = entitlement.enabled and (remaining is None or remaining > 0)
        return FeatureAccess(
            key=feature,
            enabled=enabled,
            monthly_limit=entitlement.monthly_limit,
            used=used,
            remaining=remaining,
        )

    def account_state(self, user_key: str) -> dict[str, Any]:
        plan = self.plan_for_user(user_key)
        features = {
            item.key: self.feature_access(user_key=user_key, feature=item.key).as_dict()
            for item in plan.entitlements
        }
        return {
            "plan": {
                "id": plan.id,
                "name": plan.name,
                "description": plan.description,
                "price_label": plan.price_label,
            },
            "features": features,
            "billing_ready": False,
        }


product_service = ProductService()
