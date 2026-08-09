$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Cyan
}

docker compose up -d --build
Write-Host ""
Write-Host "AI Writing Coach is running:" -ForegroundColor Green
Write-Host "  http://127.0.0.1:8000"
Write-Host ""
Write-Host "Status:"
docker compose ps
