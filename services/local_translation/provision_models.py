from transformers import MarianMTModel, MarianTokenizer

MODELS = (
    "Helsinki-NLP/opus-mt-en-vi",
    "Helsinki-NLP/opus-mt-en-zh",
    "Helsinki-NLP/opus-mt-zh-vi",
    "Helsinki-NLP/opus-mt-zh-en",
)

for model_id in MODELS:
    MarianTokenizer.from_pretrained(model_id)
    MarianMTModel.from_pretrained(model_id)
    print(f"provisioned {model_id}")
