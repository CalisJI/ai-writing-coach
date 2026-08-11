from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Entitlement:
    key: str
    enabled: bool = True
    monthly_limit: int | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "enabled": self.enabled,
            "monthly_limit": self.monthly_limit,
        }


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    description: str
    price_label: str
    entitlements: tuple[Entitlement, ...]

    def entitlement_map(self) -> dict[str, Entitlement]:
        return {item.key: item for item in self.entitlements}

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price_label": self.price_label,
            "entitlements": [item.as_dict() for item in self.entitlements],
        }


FREE = Plan(
    id="free",
    name="Free",
    description="Core writing practice for everyday learning.",
    price_label="Free",
    entitlements=(
        Entitlement("writing.evaluate", monthly_limit=30),
        Entitlement("writing.improve", monthly_limit=10),
        Entitlement("library.grammar"),
        Entitlement("dictionary.lookup", monthly_limit=120),
        Entitlement("vocabulary.save", monthly_limit=100),
        Entitlement("analytics.basic"),
        Entitlement("analytics.advanced", enabled=False),
        Entitlement("practice.personalized", enabled=False),
        Entitlement("export.report", enabled=False),
    ),
)

PREMIUM = Plan(
    id="premium",
    name="Premium",
    description="Deeper feedback, personalized practice and advanced progress tools.",
    price_label="Premium",
    entitlements=(
        Entitlement("writing.evaluate", monthly_limit=500),
        Entitlement("writing.improve", monthly_limit=250),
        Entitlement("library.grammar"),
        Entitlement("dictionary.lookup", monthly_limit=2000),
        Entitlement("vocabulary.save", monthly_limit=3000),
        Entitlement("analytics.basic"),
        Entitlement("analytics.advanced"),
        Entitlement("practice.personalized"),
        Entitlement("export.report"),
    ),
)

PLANS: dict[str, Plan] = {
    FREE.id: FREE,
    PREMIUM.id: PREMIUM,
}

DEFAULT_PLAN_ID = FREE.id


def plan_by_id(plan_id: str | None) -> Plan:
    return PLANS.get((plan_id or "").strip().casefold(), FREE)
