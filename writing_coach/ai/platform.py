from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from writing_coach.ai.base import AIProviderError, AIProviderUnavailable, AIResult
from writing_coach.ai.providers import build_providers
from writing_coach.persistence.platform_repository import SQLitePlatformRepository

ROOT = Path(__file__).resolve().parents[2]
PLATFORM_DB_PATH = Path(os.getenv("PLATFORM_DB", ROOT / "data" / "platform.db"))
_admin_guard: Callable[[Request], dict[str, Any]] | None = None

router = APIRouter(prefix="/api/admin/ai", tags=["platform-admin"])


class AIConfigIn(BaseModel):
    provider: str = Field(min_length=2, max_length=40)
    model: str = Field(min_length=1, max_length=160)


_platform_repository = SQLitePlatformRepository(PLATFORM_DB_PATH)


def init_platform_ai_db() -> None:
    _platform_repository.initialize()


def providers() -> dict[str, Any]:
    return build_providers()


def _provider_snapshot(item: Any) -> dict[str, Any]:
    models = item.list_models()
    return {
        "id": item.id,
        "name": item.name,
        "kind": item.kind,
        "configured": bool(item.configured),
        "available": bool(models),
        "models": models,
        "default_model": getattr(item, "default_model", "") or (models[0] if models else ""),
        "secret_mode": item.secret_mode,
    }


def _default_selection() -> tuple[str, str]:
    items = providers()
    ollama = items["ollama"]
    models = ollama.list_models()
    model = ollama.default_model
    if models and model not in models:
        model = models[0]
    return "ollama", model


def active_selection() -> tuple[Any, str]:
    init_platform_ai_db()
    items = providers()

    row = _platform_repository.get_ai_selection()

    if row:
        provider_id = row.provider
        model = row.model
        item = items.get(provider_id)
        if item and item.configured and model:
            return item, model

    provider_id, model = _default_selection()
    return items[provider_id], model


def active_ai_label() -> str:
    item, model = active_selection()
    return f"{item.id}:{model}"


def active_ai_status() -> dict[str, Any]:
    item, model = active_selection()
    models = item.list_models()
    if item.id == "ollama":
        ready = bool(item.configured and model and model in models)
    else:
        ready = bool(item.configured and model and (not models or model in models))
    return {
        "ready": ready,
        "provider": item.id,
        "model": model,
        "provider_name": item.name,
        "kind": item.kind,
    }


def generate_structured(
    *,
    messages: list[dict[str, str]],
    schema: dict[str, Any],
    max_output_tokens: int = 1200,
    temperature: float = 0.1,
    seed: int | None = None,
) -> AIResult:
    item, model = active_selection()
    if not item.configured:
        raise AIProviderUnavailable(f"{item.name} is not configured.")

    # Do not silently fail over to a paid provider.
    return item.generate_json(
        messages=messages,
        schema=schema,
        model=model,
        max_output_tokens=max_output_tokens,
        temperature=temperature,
        seed=seed,
    )


def _require_admin(request: Request) -> dict[str, Any]:
    if _admin_guard is None:
        raise HTTPException(503, "Platform admin guard is not installed.")
    return _admin_guard(request)


def _config_payload() -> dict[str, Any]:
    item, model = active_selection()
    return {
        "active": {
            "provider": item.id,
            "provider_name": item.name,
            "model": model,
            "kind": item.kind,
        },
        "providers": [_provider_snapshot(value) for value in providers().values()],
        "policy": {
            "scope": "global-platform",
            "automatic_paid_failover": False,
            "secrets": "server-managed",
        },
    }


@router.get("/config")
def admin_ai_config(request: Request) -> dict[str, Any]:
    _require_admin(request)
    return _config_payload()


@router.put("/config")
def admin_ai_config_update(payload: AIConfigIn, request: Request) -> dict[str, Any]:
    admin = _require_admin(request)
    items = providers()
    provider_id = payload.provider.strip().casefold()
    model = payload.model.strip()
    item = items.get(provider_id)

    if not item:
        raise HTTPException(400, "Unknown AI provider.")
    if not item.configured:
        raise HTTPException(409, f"{item.name} is not configured on the server.")

    models = item.list_models()
    if models and model not in models:
        raise HTTPException(400, "Selected model is not available for this provider.")

    _platform_repository.set_ai_selection(
        provider=provider_id,
        model=model,
        updated_by=str(admin.get("google_sub") or ""),
    )

    return _config_payload()


@router.post("/test")
def admin_ai_test(payload: AIConfigIn, request: Request) -> dict[str, Any]:
    _require_admin(request)
    items = providers()
    provider_id = payload.provider.strip().casefold()
    model = payload.model.strip()
    item = items.get(provider_id)

    if not item:
        raise HTTPException(400, "Unknown AI provider.")
    if not item.configured:
        raise HTTPException(409, f"{item.name} is not configured.")

    schema = {
        "type": "object",
        "properties": {
            "ok": {"type": "boolean"},
            "message": {"type": "string"},
        },
        "required": ["ok", "message"],
    }

    try:
        result = item.generate_json(
            messages=[
                {"role": "system", "content": "Return a tiny JSON health response for a writing application."},
                {"role": "user", "content": "Return ok=true and a short message."},
            ],
            schema=schema,
            model=model,
            max_output_tokens=80,
            temperature=0.0,
        )
    except AIProviderUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    except AIProviderError as exc:
        raise HTTPException(502, str(exc)) from exc

    return {
        "ok": bool(result.data.get("ok", True)),
        "provider": result.provider,
        "model": result.model,
        "message": str(result.data.get("message") or "Connection succeeded."),
    }


def install_platform_ai(
    app: FastAPI,
    admin_guard: Callable[[Request], dict[str, Any]],
) -> None:
    global _admin_guard
    _admin_guard = admin_guard
    init_platform_ai_db()
    app.include_router(router)
