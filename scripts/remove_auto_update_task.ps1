$TaskName = "AI Writing Coach Auto Update"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Removed scheduled task: $TaskName" -ForegroundColor Green
