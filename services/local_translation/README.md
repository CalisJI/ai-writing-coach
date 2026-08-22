# Local translation service

The service runs Marian models behind an internal HTTP boundary. Provision the Hugging Face cache before learner traffic; request handling uses `local_files_only=True` and never downloads models.

Models:

- `Helsinki-NLP/opus-mt-en-vi` — Apache-2.0
- `Helsinki-NLP/opus-mt-en-zh` — Apache-2.0
- `Helsinki-NLP/opus-mt-zh-vi` — Apache-2.0
- `Helsinki-NLP/opus-mt-zh-en` — CC-BY-4.0; model attribution: Helsinki-NLP / OPUS-MT

The default engine identifier is `local_marian`; loaded models are lazy and bounded by `MAX_LOADED_TRANSLATION_MODELS` (default 2). The model cache should be mounted separately from the Orena application image.

Provision once before learner traffic:

```sh
docker compose run --rm -e TRANSFORMERS_OFFLINE=0 local-translator python provision_models.py
```
