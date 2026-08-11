from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from auth_support import AUTH_ENABLED, auth_user
from writing_coach.product.catalog import PLANS
from writing_coach.product.service import product_service

router = APIRouter(prefix="/api/product", tags=["product"])


def current_user_key(request: Request) -> str:
    if not AUTH_ENABLED:
        return "local-development"

    sub = str(request.session.get("user_sub") or "")
    if not sub or not auth_user(sub):
        raise HTTPException(401, "Authentication required")
    return sub


@router.get("/me")
def product_me(request: Request) -> dict[str, Any]:
    return product_service.account_state(current_user_key(request))


@router.get("/plans")
def product_plans(request: Request) -> dict[str, Any]:
    current_user_key(request)
    return {
        "plans": [plan.as_dict() for plan in PLANS.values()],
        "billing_ready": False,
    }
