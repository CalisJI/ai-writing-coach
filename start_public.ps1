$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env. Add CLOUDFLARE_TUNNEL_TOKEN, then run this script again." -ForegroundColor Yellow
    exit 1
}

$envText = Get-Content ".env" -Raw
if ($envText -match "(?m)^CLOUDFLARE_TUNNEL_TOKEN=\s*$") {
    Write-Host "CLOUDFLARE_TUNNEL_TOKEN is empty in .env" -ForegroundColor Red
    exit 1
}

docker compose --profile public up -d --build
Write-Host "Writing Coach + Cloudflare Tunnel are running." -ForegroundColor Green
docker compose --profile public ps
