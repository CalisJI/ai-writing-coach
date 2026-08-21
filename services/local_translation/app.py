from __future__ import annotations

from collections import OrderedDict
import os
from threading import Lock

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

MODELS = {
    ("en", "vi"): "Helsinki-NLP/opus-mt-en-vi",
    ("en", "zh"): "Helsinki-NLP/opus-mt-en-zh",
    ("zh", "vi"): "Helsinki-NLP/opus-mt-zh-vi",
    ("zh", "en"): "Helsinki-NLP/opus-mt-zh-en",
}
MAX_LOADED_MODELS = int(os.getenv("MAX_LOADED_TRANSLATION_MODELS", "2"))
MAX_BATCH_SEGMENTS = 24


class Segment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    segment_id: str = Field(min_length=1, max_length=128)
    text: str = Field(min_length=1, max_length=6000)


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_language: str
    target_language: str
    segments: list[Segment] = Field(min_length=1, max_length=MAX_BATCH_SEGMENTS)


app = FastAPI(title="Orena Local Translation")
_models: OrderedDict[str, tuple[object, object]] = OrderedDict()
_lock = Lock()


def _model(model_id: str) -> tuple[object, object]:
    with _lock:
        cached = _models.get(model_id)
        if cached is not None:
            _models.move_to_end(model_id)
            return cached
        from transformers import MarianMTModel, MarianTokenizer

        tokenizer = MarianTokenizer.from_pretrained(model_id, local_files_only=True)
        model = MarianMTModel.from_pretrained(model_id, local_files_only=True)
        model.eval()
        cached = (tokenizer, model)
        _models[model_id] = cached
        while len(_models) > MAX_LOADED_MODELS:
            _models.popitem(last=False)
        return cached


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/translate")
def translate(request: Request) -> dict[str, object]:
    model_id = MODELS.get((request.source_language, request.target_language))
    if model_id is None:
        raise HTTPException(422, "Unsupported translation language pair.")
    try:
        tokenizer, model = _model(model_id)
        inputs = tokenizer([segment.text for segment in request.segments], return_tensors="pt", padding=True, truncation=True)
        generated = model.generate(**inputs)
        meanings = tokenizer.batch_decode(generated, skip_special_tokens=True)
    except (OSError, RuntimeError) as exc:
        raise HTTPException(503, "Local translation model is not provisioned.") from exc
    return {
        "engine": "local_marian",
        "model": model_id,
        "translations": [
            {"segment_id": segment.segment_id, "translated_meaning": meaning.strip()}
            for segment, meaning in zip(request.segments, meanings)
        ],
    }
