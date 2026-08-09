$ErrorActionPreference = "Stop"
$Target = "ai-writing-coach-data"
$all = docker volume ls --format "{{.Name}}"
$old = @($all | Where-Object { $_ -like "*_writing_data" -and $_ -ne $Target })
if ($old.Count -eq 0) {
    Write-Host "No old *_writing_data volume found. Nothing to migrate." -ForegroundColor Yellow
    exit 0
}
if ($old.Count -gt 1) {
    Write-Host "Multiple old volumes found:" -ForegroundColor Yellow
    $old | ForEach-Object { Write-Host "  $_" }
    throw "Please keep only the intended old volume or copy it manually."
}
$Source = $old[0]
docker volume create $Target | Out-Null
Write-Host "Migrating writing.db: $Source -> $Target" -ForegroundColor Cyan
docker run --rm -v "${Source}:/from:ro" -v "${Target}:/to" alpine:3.20 sh -c "if [ -f /from/writing.db ]; then cp /from/writing.db /to/writing.db; else exit 4; fi"
Write-Host "Migration finished. Old volume was NOT deleted." -ForegroundColor Green
