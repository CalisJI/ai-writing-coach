# PostgreSQL operational cutover runbook (Phase C2)

> Historical cutover record. The operational cutover is complete and
> PostgreSQL is authoritative. Do not rerun this procedure for public staging;
> use `docs/PUBLIC_DEPLOYMENT.md`.

Phase C1 adds this procedure only. SQLite remains authoritative until the
operator reaches and explicitly accepts the commit point below.

## 1. Preflight

Use a clean stable `main` checkout. Confirm no development lane is using the
shared volumes, the app is healthy on SQLite, and the existing PostgreSQL
volume will be preserved.

```powershell
git fetch origin --prune
if ((git branch --show-current) -ne 'main') { throw 'Cutover requires main.' }
if (git status --porcelain) { throw 'Cutover requires a clean checkout.' }
if ((git rev-parse HEAD) -ne (git rev-parse origin/main)) { throw 'Local main is not current.' }
docker compose ps
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/readiness
```

In the operator-owned `.env`, configure both URLs intentionally for the same
cutover database, while keeping `PERSISTENCE_BACKEND=sqlite`:

```env
PERSISTENCE_BACKEND=sqlite
POSTGRES_SHADOW_URL=postgresql+psycopg://USER:PASSWORD@postgres:5432/becoming
POSTGRES_RUNTIME_URL=postgresql+psycopg://USER:PASSWORD@postgres:5432/becoming
```

Do not print either URL. A URL alone never activates PostgreSQL.

## 2. Quiesce writes and back up SQLite

```powershell
docker compose stop writing-coach
$VolumeUsers = @(docker ps --quiet --filter "volume=ai-writing-coach-data")
if ($VolumeUsers.Count) { docker ps --filter "volume=ai-writing-coach-data"; throw 'SQLite volume still has a running consumer; CUTOVER ABORTED.' }
$CutoverStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupDirectory = Join-Path $PWD 'backups'
New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$BackupFile = Join-Path $BackupDirectory "sqlite-$CutoverStamp.tar.gz"
if (Test-Path -LiteralPath $BackupFile) { throw "Backup already exists: $BackupFile" }
docker run --rm --mount type=volume,src=ai-writing-coach-data,dst=/source,readonly --mount "type=bind,src=$BackupDirectory,dst=/backup" alpine:3.20 tar -czf "/backup/sqlite-$CutoverStamp.tar.gz" -C /source .
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $BackupFile)) { throw 'SQLite backup failed; CUTOVER ABORTED.' }
docker run --rm --mount "type=bind,src=$BackupDirectory,dst=/backup,readonly" alpine:3.20 tar -tzf "/backup/sqlite-$CutoverStamp.tar.gz" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'SQLite backup verification failed; CUTOVER ABORTED.' }
$FrozenManifest = Join-Path $BackupDirectory "sqlite-$CutoverStamp.sha256"
docker run --rm --mount type=volume,src=ai-writing-coach-data,dst=/source,readonly alpine:3.20 sh -c "find /source -type f ! -name 'learning_cache.db*' -exec sha256sum {} + | sort" | Set-Content $FrozenManifest
```

The timestamped archive is outside `ai-writing-coach-data`; `backups/` is
ignored. Never continue after backup failure and never use `docker compose
down -v`.

## 3. Prepare PostgreSQL and prove the frozen source

```powershell
docker compose --profile postgres up -d --wait postgres
docker compose --profile postgres ps postgres
docker compose run --rm --no-deps -v "${PWD}:/workspace:ro" -w /workspace writing-coach python scripts/postgres_cutover_rehearsal.py --data-root /data
```

The existing rehearsal must complete, in order: orphan-source preflight;
Alembic upgrade and import pass 1; auth/platform/product semantic parity;
core scoped parity; specialized scoped parity; import pass 2; all parity again;
and final Alembic-head equality. Any nonzero result means **CUTOVER ABORTED**;
leave `PERSISTENCE_BACKEND=sqlite` and restart the SQLite app.

## 4. Switch and smoke test

Only after backup and every rehearsal gate pass, edit the operator `.env`:

```env
PERSISTENCE_BACKEND=postgresql
POSTGRES_RUNTIME_URL=postgresql+psycopg://USER:PASSWORD@postgres:5432/becoming
```

Then recreate only the application service:

```powershell
docker compose up -d --no-deps --force-recreate writing-coach
docker compose logs --tail 100 writing-coach
docker compose exec writing-coach sh -lc 'test "$PERSISTENCE_BACKEND" = postgresql'
Invoke-WebRequest http://127.0.0.1:8000/ -UseBasicParsing
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/readiness
$Languages = Invoke-RestMethod http://127.0.0.1:8000/api/platform/languages
$Languages | ConvertTo-Json -Depth 5
$AfterManifest = Join-Path $BackupDirectory "sqlite-$CutoverStamp-after.sha256"
docker run --rm --mount type=volume,src=ai-writing-coach-data,dst=/source,readonly alpine:3.20 sh -c "find /source -type f ! -name 'learning_cache.db*' -exec sha256sum {} + | sort" | Set-Content $AfterManifest
if (Compare-Object (Get-Content $FrozenManifest) (Get-Content $AfterManifest)) { throw 'Authoritative SQLite changed during smoke; rollback required.' }
```

### Local/auth-disabled mode

Use this safe PostgreSQL-backed product read only when authentication is
disabled:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/product/me
```

### OAuth-enabled mode

Do not run the unauthenticated PowerShell product request. Open the
application in a browser, sign in through the existing OAuth flow, and use the
signed-in session to perform `GET /api/product/me`. Confirm the account/product
read succeeds. Authentication/login failure or any repository failure is a
smoke failure and requires rollback.

Require clean startup with no PostgreSQL connectivity/Alembic error, HTTP 200
in local mode or the expected login flow in OAuth mode, healthy status, a
successful product repository read, and both EN and ZH in the language response.
Perform only safe reads during this maintenance smoke window. The app has no
SQLite fallback; PostgreSQL startup failure must leave startup failed closed.

## 5. Rollback or commit

If any smoke check fails, before normal user writes resume:

```powershell
docker compose stop writing-coach
# Edit the operator .env: PERSISTENCE_BACKEND=sqlite
docker compose up -d --no-deps --force-recreate writing-coach
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Keep PostgreSQL and its volume intact for investigation. Do not copy
PostgreSQL writes back to SQLite automatically; no reverse sync exists.
Rollback is safe only inside the controlled window before user writes resume.

The commit point is reached only when PostgreSQL startup and every smoke check
pass, the operator explicitly accepts PostgreSQL as authoritative, and the
maintenance window ends. Until then, frozen SQLite is the rollback checkpoint.
