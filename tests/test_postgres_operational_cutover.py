from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def test_compose_keeps_runtime_and_shadow_selection_separate() -> None:
    compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")
    service = compose.split("  writing-coach:", 1)[1].split("\n  postgres:", 1)[0]
    assert "PERSISTENCE_BACKEND: ${PERSISTENCE_BACKEND:-sqlite}" in service
    assert "POSTGRES_RUNTIME_URL: ${POSTGRES_RUNTIME_URL:-}" in service
    assert "POSTGRES_SHADOW_URL: ${POSTGRES_SHADOW_URL:-}" in service
    assert "POSTGRES_RUNTIME_URL: ${POSTGRES_SHADOW_URL" not in compose


def test_environment_template_uses_authoritative_postgres_staging_contract() -> None:
    template = (ROOT / ".env.example").read_text(encoding="utf-8")
    values = dict(line.split("=", 1) for line in template.splitlines() if line and not line.startswith("#") and "=" in line)
    assert values["PERSISTENCE_BACKEND"] == "postgresql"
    assert values["POSTGRES_RUNTIME_URL"] == ""
    assert values["POSTGRES_SHADOW_URL"] == ""


def test_runbook_is_non_destructive_and_preserves_rollback_checkpoint() -> None:
    runbook = (ROOT / "docs/POSTGRES_OPERATIONAL_CUTOVER.md").read_text(encoding="utf-8")
    assert "docker compose stop writing-coach" in runbook
    assert "ai-writing-coach-data" in runbook and "backups" in runbook
    assert "postgres_cutover_rehearsal.py" in runbook
    assert "PERSISTENCE_BACKEND=sqlite" in runbook
    assert "frozen SQLite is the rollback checkpoint" in runbook
    assert "no reverse sync exists" in runbook
    commands = "\n".join(re.findall(r"```(?:powershell|env)?\n(.*?)```", runbook, re.DOTALL))
    for forbidden in ("down -v", "down --volumes", "docker volume rm", "docker volume prune"):
        assert forbidden not in commands
    assert "dst=/source,readonly" in commands
    assert "dst=/backup" in commands and "sqlite-$CutoverStamp.tar.gz" in commands
    assert "Backup already exists" in runbook
    assert "operator explicitly accepts PostgreSQL as authoritative" in runbook
    assert "maintenance window ends" in runbook
    assert "backups/" in (ROOT / ".gitignore").read_text(encoding="utf-8")


def test_real_env_is_not_a_tracked_phase_c1_artifact() -> None:
    rules = (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert ".env" in rules
    assert ".env.*" in rules
    assert "!.env.example" in rules


def test_runbook_separates_local_and_oauth_product_smoke_reads() -> None:
    runbook = (ROOT / "docs/POSTGRES_OPERATIONAL_CUTOVER.md").read_text(encoding="utf-8")
    main_smoke, local_section = runbook.split("### Local/auth-disabled mode", 1)
    local_section, oauth_section = local_section.split("### OAuth-enabled mode", 1)
    assert "/api/product/me" not in main_smoke
    assert "Invoke-RestMethod http://127.0.0.1:8000/api/product/me" in local_section
    assert "Do not run the unauthenticated PowerShell product request." in oauth_section
    assert "signed-in session" in oauth_section
