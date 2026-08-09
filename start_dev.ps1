$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
Write-Host "Starting development mode with Docker Compose Watch..." -ForegroundColor Cyan
docker compose -f compose.yaml -f compose.dev.yaml up --watch --build
