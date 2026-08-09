import hashlib
import os
import secrets
import shutil
import sqlite3
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlparse

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token
from google_auth_oauthlib.flow import Flow
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from writing_coach.core.request_context import LANGUAGE_CODE_CTX, USER_KEY_CTX, current_language_code
from writing_coach.core.storage import resolve_language_db_path
from writing_coach.core.language_registry import DEFAULT_LANGUAGE, enabled_language

ROOT = Path(__file__).resolve().parent
LEGACY_DB_PATH = Path(os.getenv("WRITING_DB", ROOT / "data" / "writing.db"))
AUTH_DB_PATH = Path(os.getenv("AUTH_DB", LEGACY_DB_PATH.parent / "auth.db"))
USER_DATA_ROOT = Path(os.getenv("USER_DATA_ROOT", LEGACY_DB_PATH.parent / "users"))

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://127.0.0.1:8000/auth/google/callback",
).strip()
SESSION_SECRET = os.getenv("SESSION_SECRET", "").strip()
BOOTSTRAP_OWNER_EMAIL = os.getenv("BOOTSTRAP_OWNER_EMAIL", "").strip().casefold()
PLATFORM_ADMIN_EMAILS = {
    x.strip().casefold()
    for x in os.getenv("PLATFORM_ADMIN_EMAILS", "").split(",")
    if x.strip()
}
if BOOTSTRAP_OWNER_EMAIL:
    PLATFORM_ADMIN_EMAILS.add(BOOTSTRAP_OWNER_EMAIL)

AUTH_ENABLED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
COOKIE_SECURE = GOOGLE_REDIRECT_URI.casefold().startswith("https://")

if AUTH_ENABLED and not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET is required when Google authentication is enabled.")

parsed_redirect = urlparse(GOOGLE_REDIRECT_URI)
if AUTH_ENABLED and parsed_redirect.scheme == "http" and parsed_redirect.hostname in {"localhost", "127.0.0.1", "::1"}:
    os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

_user_key = USER_KEY_CTX
_language_key = LANGUAGE_CODE_CTX
_db_initializer: Callable[[], None] | None = None
_initialized_user_dbs: set[str] = set()


def user_db_path(
    user_key: str,
    legacy_db: Path | None = None,
    language_code: str | None = None,
) -> Path:
    legacy_db = legacy_db or LEGACY_DB_PATH
    lang = enabled_language(language_code or current_language_code()).db_namespace or DEFAULT_LANGUAGE
    return resolve_language_db_path(
        user_key=user_key,
        language_code=lang,
        legacy_db=legacy_db,
        user_data_root=USER_DATA_ROOT,
        auth_enabled=AUTH_ENABLED,
    )


def current_db_path(legacy_db: Path | None = None) -> Path:
    return user_db_path(
        _user_key.get(),
        legacy_db=legacy_db,
        language_code=_language_key.get(),
    )

def auth_db() -> sqlite3.Connection:
    AUTH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(AUTH_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db() -> None:
    with auth_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                google_sub TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL DEFAULT '',
                picture TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                last_login TEXT NOT NULL
            )
            """
        )
        cols = {str(r["name"]) for r in conn.execute("PRAGMA table_info(users)").fetchall()}
        if "role" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
        for email in PLATFORM_ADMIN_EMAILS:
            conn.execute("UPDATE users SET role='admin' WHERE lower(email)=?", (email,))
        conn.commit()

def auth_user(google_sub: str) -> dict[str, Any] | None:
    if not google_sub:
        return None
    with auth_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE google_sub = ?", (google_sub,)).fetchone()
    return dict(row) if row else None


def upsert_auth_user(info: dict[str, Any]) -> dict[str, Any]:
    sub = str(info.get("sub") or "")
    email = str(info.get("email") or "").strip()
    name = str(info.get("name") or "").strip()
    picture = str(info.get("picture") or "").strip()
    if not sub or not email:
        raise HTTPException(400, "Google account did not provide a valid subject/email.")
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    with auth_db() as conn:
        conn.execute(
            """
            INSERT INTO users(google_sub,email,name,picture,created_at,last_login)
            VALUES(?,?,?,?,?,?)
            ON CONFLICT(google_sub) DO UPDATE SET
              email=excluded.email,name=excluded.name,picture=excluded.picture,last_login=excluded.last_login
            """,
            (sub,email,name,picture,now,now),
        )
        if email.casefold() in PLATFORM_ADMIN_EMAILS:
            conn.execute("UPDATE users SET role='admin' WHERE google_sub=?", (sub,))
        conn.commit()
    return auth_user(sub) or {}


def require_admin(request: Request) -> dict[str, Any]:
    if not AUTH_ENABLED:
        return {"google_sub":"local-admin","email":"local","name":"Local developer","role":"admin"}
    sub = str(request.session.get("user_sub") or "")
    user = auth_user(sub)
    if not user:
        raise HTTPException(401, "Authentication required")
    if str(user.get("role") or "user") != "admin":
        raise HTTPException(403, "Platform administrator access required")
    return user

def google_flow(code_verifier: str | None = None) -> Flow:
    config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    flow = Flow.from_client_config(
        config,
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ],
        code_verifier=code_verifier,
        autogenerate_code_verifier=(code_verifier is None),
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    return flow


def maybe_claim_legacy_data(email: str, google_sub: str) -> bool:
    if not BOOTSTRAP_OWNER_EMAIL or email.strip().casefold() != BOOTSTRAP_OWNER_EMAIL:
        return False
    target = user_db_path(google_sub, language_code="en")
    if target.exists() or not LEGACY_DB_PATH.exists():
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(LEGACY_DB_PATH, target)
    return True


def ensure_user_db() -> None:
    if _db_initializer is None:
        return
    path = current_db_path()
    key = str(path.resolve())
    if key in _initialized_user_dbs:
        return
    _db_initializer()
    _initialized_user_dbs.add(key)


router = APIRouter()


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    if not AUTH_ENABLED:
        return RedirectResponse("/", status_code=302)
    if request.session.get("user_sub"):
        return RedirectResponse("/", status_code=302)
    template = (ROOT / "templates" / "login.html").read_text(encoding="utf-8")
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip() if (ROOT / "VERSION").exists() else "dev"
    return HTMLResponse(template.replace("{{APP_VERSION}}", version))


@router.get("/auth/google")
def auth_google(request: Request):
    if not AUTH_ENABLED:
        raise HTTPException(503, "Google authentication is not configured.")
    flow = google_flow()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    request.session["oauth_nonce"] = nonce
    url, _ = flow.authorization_url(
        state=state,
        nonce=nonce,
        access_type="online",
        include_granted_scopes="true",
        prompt="select_account",
    )

    if not flow.code_verifier:
        raise HTTPException(500, "OAuth PKCE verifier was not generated.")
    request.session["oauth_code_verifier"] = flow.code_verifier

    return RedirectResponse(url, status_code=302)


@router.get("/auth/google/callback")
def auth_google_callback(request: Request):
    if not AUTH_ENABLED:
        raise HTTPException(503, "Google authentication is not configured.")
    error = request.query_params.get("error")
    if error:
        raise HTTPException(400, f"Google login was cancelled or failed: {error}")

    expected_state = str(request.session.get("oauth_state") or "")
    returned_state = str(request.query_params.get("state") or "")
    if not expected_state or not secrets.compare_digest(expected_state, returned_state):
        raise HTTPException(400, "Invalid OAuth state.")

    code = str(request.query_params.get("code") or "")
    if not code:
        raise HTTPException(400, "Google did not return an authorization code.")

    code_verifier = str(request.session.get("oauth_code_verifier") or "")
    if not code_verifier:
        raise HTTPException(
            400,
            "OAuth session expired or PKCE verifier is missing. Please start Google login again.",
        )

    flow = google_flow(code_verifier=code_verifier)
    flow.fetch_token(code=code)
    raw_id_token = flow.credentials.id_token
    if not raw_id_token:
        raise HTTPException(400, "Google did not return an ID token.")

    info = google_id_token.verify_oauth2_token(raw_id_token, GoogleAuthRequest(), GOOGLE_CLIENT_ID)
    expected_nonce = str(request.session.get("oauth_nonce") or "")
    if expected_nonce and str(info.get("nonce") or "") != expected_nonce:
        raise HTTPException(400, "Invalid OpenID Connect nonce.")
    if not bool(info.get("email_verified")):
        raise HTTPException(403, "Google email is not verified.")

    user = upsert_auth_user(info)
    maybe_claim_legacy_data(str(user.get("email") or ""), str(user.get("google_sub") or ""))
    request.session.clear()
    request.session["user_sub"] = str(user["google_sub"])
    return RedirectResponse("/", status_code=302)


@router.post("/auth/logout")
def auth_logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/api/me")
def api_me(request: Request) -> dict[str, Any]:
    if not AUTH_ENABLED:
        return {"authenticated":True,"mode":"local","name":"Local user","email":"","picture":"","role":"admin","is_admin":True}
    sub = str(request.session.get("user_sub") or "")
    user = auth_user(sub)
    if not user:
        raise HTTPException(401, "Authentication required")
    role = str(user.get("role") or "user")
    return {
        "authenticated": True,
        "mode": "google",
        "name": user.get("name") or user.get("email"),
        "email": user.get("email") or "",
        "picture": user.get("picture") or "",
        "language": current_language_code(),
        "role": role,
        "is_admin": role == "admin",
    }

class UserIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        requested_language = enabled_language(
            request.session.get("language") or DEFAULT_LANGUAGE
        ).code

        public = (
            path == "/login"
            or path == "/api/health"
            or path == "/api/platform/languages"
            or path.startswith("/auth/")
            or path.startswith("/static/")
            or path == "/favicon.ico"
        )

        if not AUTH_ENABLED:
            user_token = _user_key.set("legacy")
            language_token = _language_key.set(requested_language)
            try:
                return await call_next(request)
            finally:
                _language_key.reset(language_token)
                _user_key.reset(user_token)

        if public:
            language_token = _language_key.set(requested_language)
            try:
                return await call_next(request)
            finally:
                _language_key.reset(language_token)

        user_sub = str(request.session.get("user_sub") or "")
        if not user_sub:
            if path.startswith("/api/"):
                return JSONResponse({"detail": "Authentication required"}, status_code=401)
            return RedirectResponse("/login", status_code=302)

        user_token = _user_key.set(user_sub)
        language_token = _language_key.set(requested_language)
        try:
            ensure_user_db()
            return await call_next(request)
        finally:
            _language_key.reset(language_token)
            _user_key.reset(user_token)

def install_auth(app: FastAPI, db_initializer: Callable[[], None]) -> None:
    global _db_initializer
    _db_initializer = db_initializer
    init_auth_db()
    app.include_router(router)
    app.add_middleware(UserIsolationMiddleware)
    app.add_middleware(
        SessionMiddleware,
        secret_key=SESSION_SECRET or "local-single-user-mode",
        session_cookie="writing_coach_session",
        max_age=60 * 60 * 24 * 14,
        same_site="lax",
        https_only=COOKIE_SECURE,
    )
