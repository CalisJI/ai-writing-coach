param(
    [string]$Branch = "main"
)
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

function Log($msg) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$stamp $msg" | Tee-Object -FilePath (Join-Path $Root "update.log") -Append
}

if (-not (Test-Path ".git")) {
    Log "SKIP: This folder is not a Git clone. Auto-update requires the project to be cloned from a Git remote."
    exit 2
}

$dirty = git status --porcelain
if ($dirty) {
    Log "SKIP: Local source has uncommitted changes. Refusing to overwrite them."
    exit 3
}

Log "Checking origin/$Branch..."
git fetch origin $Branch --quiet
$local = (git rev-parse HEAD).Trim()
$remote = (git rev-parse "origin/$Branch").Trim()
if ($local -eq $remote) {
    Log "No update available ($($local.Substring(0,7)))."
    exit 0
}

Log "Update found: $($local.Substring(0,7)) -> $($remote.Substring(0,7)). Backing up database first."
$BackupDir = Join-Path $Root "backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "/backup/writing-$stamp.db"

# Briefly stop only the app while copying SQLite for a consistent backup.
docker compose stop writing-coach | Out-Null
docker volume create ai-writing-coach-data | Out-Null
$mount = ($BackupDir -replace '\\','/')
docker run --rm -v ai-writing-coach-data:/data:ro -v "${mount}:/backup" alpine:3.20 sh -c "if [ -f /data/writing.db ]; then cp /data/writing.db '$backupPath'; fi" | Out-Null

try {
    git pull --ff-only origin $Branch
    docker compose up -d --build
    Log "Updated successfully to $((git rev-parse --short HEAD).Trim())."
} catch {
    Log "ERROR: Update failed: $($_.Exception.Message)"
    docker compose up -d
    throw
}
