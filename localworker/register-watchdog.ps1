param([string]$Target, [string]$NodePath, [string]$TaskName = 'CodexLocalWorkerWatchdog', [ValidateRange(1,1440)][int]$IntervalMinutes = 2)
$ErrorActionPreference = 'Stop'
if (-not $Target) { $Target = Join-Path $env:USERPROFILE '.codex-local-worker' }
if (-not $NodePath) { $NodePath = (Get-Command node.exe -ErrorAction Stop).Source }
$name = $TaskName
$node = $NodePath
$script = Join-Path $Target 'watchdog.mjs'
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw 'Node ausente.' }
if (-not (Test-Path -LiteralPath $script -PathType Leaf)) { throw 'Watchdog ausente.' }
$periodic = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$logon = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
if ($existing) {
  $actualExe = [IO.Path]::GetFullPath($existing.Actions[0].Execute)
  $expectedExe = [IO.Path]::GetFullPath($node)
  if ($actualExe -ine $expectedExe -or $existing.Actions[0].Arguments -ne "`"$script`"") {
    throw 'Tarefa existente aponta para outro comando; preserve-a e escolha outro -TaskName.'
  }
  $actualInterval = $null
  foreach ($trigger in $existing.Triggers) {
    if ($trigger.Repetition -and $trigger.Repetition.Interval) {
      try { $actualInterval = [System.Xml.XmlConvert]::ToTimeSpan($trigger.Repetition.Interval).TotalMinutes } catch {}
    }
  }
  $updated = $existing.Triggers.Count -ne 2 -or $actualInterval -ne $IntervalMinutes
  if ($updated) { Set-ScheduledTask -TaskName $name -Trigger @($periodic,$logon) | Out-Null }
  $current = Get-ScheduledTask -TaskName $name
  [pscustomobject]@{ Name = $current.TaskName; State = $current.State.ToString(); Triggers = $current.Triggers.Count; Execute = $actualExe; Arguments = $current.Actions[0].Arguments; Principal = $current.Principal.UserId; already_registered = $true; triggers_updated = $updated; recovery_interval_minutes = $IntervalMinutes } | ConvertTo-Json
  return
}
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`""
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger @($periodic,$logon) -Principal $principal -Settings $settings -Description 'Recuperação local e entrega terminal do localWorker' | Out-Null
$task = Get-ScheduledTask -TaskName $name
[pscustomobject]@{ Name = $task.TaskName; State = $task.State.ToString(); Triggers = $task.Triggers.Count; Execute = $task.Actions[0].Execute; Arguments = $task.Actions[0].Arguments; Principal = $task.Principal.UserId; recovery_interval_minutes = $IntervalMinutes } | ConvertTo-Json
