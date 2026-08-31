"""HTTP cache contracts for deterministic and mutable reference data."""

import asyncio

import httpx
from fastapi import HTTPException

import app as app_module
from writing_coach.languages.chinese import stroke_order


def test_stroke_order_is_versioned_and_conditionally_cacheable(monkeypatch):
    provider_calls = []

    def no_provider(*_args, **_kwargs):
        provider_calls.append(True)
        raise AssertionError("stroke-order must not call a provider")

    monkeypatch.setattr(app_module, "generate_structured", no_provider)
    monkeypatch.setattr(app_module, "requests", type("NoRequests", (), {"get": no_provider})())

    async def exercise():
        transport = httpx.ASGITransport(app=app_module.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            first = await client.get("/api/chinese/stroke-order?word=%E5%AD%A6%E4%B9%A0")
            repeat = await client.get("/api/chinese/stroke-order?word=%E5%AD%A6%E4%B9%A0")
            second = await client.get(
                "/api/chinese/stroke-order?word=%E5%AD%A6%E4%B9%A0",
                headers={"If-None-Match": first.headers["etag"]},
            )
            return first, repeat, second

    first, repeat, second = asyncio.run(exercise())
    assert first.status_code == 200
    assert first.json()["source"] == "make-me-a-hanzi"
    assert first.json()["source_version"] == stroke_order.SOURCE_VERSION
    assert first.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert first.headers["etag"]
    assert repeat.status_code == 200
    assert repeat.headers["etag"] == first.headers["etag"]
    assert second.status_code == 304
    assert second.headers["etag"] == first.headers["etag"]
    assert second.headers["cache-control"] == first.headers["cache-control"]
    assert provider_calls == []


def test_stroke_order_unavailable_is_not_cached(monkeypatch):
    def unavailable(_word):
        raise stroke_order.StrokeDataUnavailable("pack missing")

    monkeypatch.setattr(stroke_order, "stroke_order_for", unavailable)

    async def exercise():
        transport = httpx.ASGITransport(app=app_module.app, raise_app_exceptions=False)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.get("/api/chinese/stroke-order?word=%E5%AD%A6")

    response = asyncio.run(exercise())
    assert response.status_code == 503
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["detail"]["category"] == "stroke_data_unavailable"


def test_dictionary_is_explicitly_conservative_for_success_and_failure(monkeypatch):
    original_lookup = app_module.lookup_dictionary

    def success(word):
        return {"word": word, "definitions": [], "source": "test"}

    monkeypatch.setattr(app_module, "lookup_dictionary", success)

    async def success_request():
        transport = httpx.ASGITransport(app=app_module.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return [
                await client.get("/api/dictionary?word=learn"),
                await client.get("/api/dictionary?word=%E5%AD%A6%E4%B9%A0"),
            ]

    responses = asyncio.run(success_request())
    assert [response.status_code for response in responses] == [200, 200]
    assert [response.json()["word"] for response in responses] == ["learn", "学习"]
    assert all(response.headers["cache-control"] == "no-store" for response in responses)

    def unavailable(_word):
        raise HTTPException(503, "dictionary unavailable")

    monkeypatch.setattr(app_module, "lookup_dictionary", unavailable)

    async def failure_request():
        transport = httpx.ASGITransport(app=app_module.app, raise_app_exceptions=False)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.get("/api/dictionary?word=learn")

    failed = asyncio.run(failure_request())
    assert failed.status_code == 503
    assert failed.headers["cache-control"] == "no-store"

    monkeypatch.setattr(app_module, "lookup_dictionary", original_lookup)

    async def validation_requests():
        transport = httpx.ASGITransport(app=app_module.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return [
                await client.get("/api/dictionary"),
                await client.get("/api/dictionary?word="),
                await client.get("/api/chinese/stroke-order"),
            ]

    invalid = asyncio.run(validation_requests())
    assert [response.status_code for response in invalid] == [422, 400, 422]
    assert all(response.headers["cache-control"] == "no-store" for response in invalid[:2])
    assert "cache-control" not in invalid[2].headers
