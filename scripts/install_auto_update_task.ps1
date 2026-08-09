param(
    [int]$EveryMinutes = 5,
    [string]$Branch = "main"
)
$ErrorActionPreference = "Stop"
if ($EveryMinutes -lt 1) { throw "EveryMinutes must be >= 1" }
$Updater = (Resolve-Path (Join-Path $PSScriptRoot "update_from_git.ps1")).Path
$TaskName = "AI Writing Coach Auto Update"
$arg = "-NoProfile -ExecutionPolicy Bypass -File `"$Updater`" -Branch `"$Branch`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Description "Checks Git for AI Writing Coach updates and safely rebuilds Docker only when origin changed." -Force | Out-Null
Write-Host "Installed scheduled task: $TaskName (every $EveryMinutes minutes)" -ForegroundColor Green
Write-Host "Auto-update only works after this project is a Git clone with an origin remote." -ForegroundColor Yellow
