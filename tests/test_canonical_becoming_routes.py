import re
from pathlib import Path

from app import BECOMING_ASSET_ROOT, home, becoming_preview

ROOT = Path(__file__).resolve().parents[1]


def test_root_serves_orena_from_legacy_template_namespace() -> None:
    response = home()
    body = response.body.decode("utf-8")
    assert body == (ROOT / "templates" / "becoming" / "index.html").read_text(encoding="utf-8")
    assert body != (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    assert BECOMING_ASSET_ROOT.name == "becoming"


def test_root_document_is_not_cacheable() -> None:
    # The shell names every stylesheet and module the app loads, so a cached
    # copy keeps requesting yesterday's asset list and a sheet added since is
    # simply never fetched. Every asset answers no-store; the document that
    # names them has to as well.
    assert home().headers["cache-control"] == "no-store, max-age=0"


def test_becoming_aliases_canonicalize_to_root() -> None:
    response = becoming_preview()
    assert response.status_code == 302
    assert response.headers["location"] == "/"


def test_oauth_callback_target_and_frontend_version_remain_canonical() -> None:
    auth = (ROOT / "auth_support.py").read_text(encoding="utf-8")
    assert 'RedirectResponse("/", status_code=302)' in auth

    frontend_version = (
        ROOT / "BECOMING_FRONTEND_VERSION"
    ).read_text(encoding="utf-8").strip()
    assert re.fullmatch(r"\d+\.\d+\.\d+", frontend_version)

    template = (
        ROOT / "templates" / "becoming" / "index.html"
    ).read_text(encoding="utf-8")
    asset_versions = set(
        re.findall(
            r"/becoming-assets/[^\"']+\?v=(\d+\.\d+\.\d+)",
            template,
        )
    )
    assert asset_versions == {frontend_version}
    assert "<title>Orena</title>" in template
    assert "aria-label=\"Orena navigation\"" in template
    assert "BECOMING navigation" not in template
    assert "BECOMING home" not in template
    assert ">BECOMING<" not in template
    assert "Orena" in (ROOT / "static" / "becoming" / "domain" / "i18n.js").read_text(encoding="utf-8")
