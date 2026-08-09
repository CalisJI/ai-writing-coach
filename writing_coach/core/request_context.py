from contextvars import ContextVar

from writing_coach.core.language_registry import DEFAULT_LANGUAGE

USER_KEY_CTX: ContextVar[str] = ContextVar("writing_coach_user", default="legacy")
LANGUAGE_CODE_CTX: ContextVar[str] = ContextVar("writing_coach_language", default=DEFAULT_LANGUAGE)


def current_user_key() -> str:
    return USER_KEY_CTX.get()


def current_language_code() -> str:
    return LANGUAGE_CODE_CTX.get()
