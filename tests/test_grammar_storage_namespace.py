from writing_coach.core.request_context import LANGUAGE_CODE_CTX
from app import _grammar_storage_key

def test_grammar_storage_key_versions_language_and_content():
    lesson={"id":"a1-present-simple","content_version":2}
    token=LANGUAGE_CODE_CTX.set("en")
    try:
        en_v2=_grammar_storage_key(lesson)
        en_v1=_grammar_storage_key({**lesson,"content_version":1})
    finally:
        LANGUAGE_CODE_CTX.reset(token)
    token=LANGUAGE_CODE_CTX.set("zh")
    try:
        zh_v2=_grammar_storage_key(lesson)
    finally:
        LANGUAGE_CODE_CTX.reset(token)
    assert en_v2=="en:grammar:v2:a1-present-simple"
    assert en_v1!=en_v2
    assert zh_v2!=en_v2
