param([string]$Target, [string]$NodePath, [string]$TaskName = 'CodexLocalWorkerWatchdog', [ValidateRange(1,1440)][int]$IntervalMinutes = 2)
$ErrorActionPreference = 'Stop'
if (-not $Target) { $Target = Join-Path $env:USERPROFILE '.codex-local-worker' }
if (-not $NodePath) { $NodePath = (Get-Command node.exe -ErrorAction Stop).Source }
$name = $TaskName
$node = [IO.Path]::GetFullPath($NodePath)
$Target = [IO.Path]::GetFullPath($Target)
$script = Join-Path $Target 'watchdog.mjs'
$launcher = Join-Path $Target 'watchdog-launch.vbs'
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw 'Node ausente.' }
if (-not (Test-Path -LiteralPath $script -PathType Leaf)) { throw 'Watchdog ausente.' }
if (-not (Test-Path -LiteralPath $wscript -PathType Leaf)) { throw 'Windows Script Host ausente.' }
$rootItem = Get-Item -LiteralPath $Target -Force
if (-not $rootItem.PSIsContainer -or ($rootItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Raiz do Worker inválida.' }
$escapedNode = $node.Replace('"','""')
$escapedScript = $script.Replace('"','""')
$launcherText = "Set shell = CreateObject(""WScript.Shell"")`r`nshell.Run Chr(34) & ""$escapedNode"" & Chr(34) & "" "" & Chr(34) & ""$escapedScript"" & Chr(34), 0, True`r`n"
$currentLauncher = if (Test-Path -LiteralPath $launcher -PathType Leaf) { [IO.File]::ReadAllText($launcher) } else { '' }
if ($currentLauncher -ne $launcherText) {
  $tempLauncher = "$launcher.$PID.tmp"
  [IO.File]::WriteAllText($tempLauncher,$launcherText,[Text.Encoding]::Unicode)
  try {
    if ($currentLauncher) { [IO.File]::Replace($tempLauncher,$launcher,"$launcher.backup-$(Get-Date -Format yyyyMMddHHmmss)") }
    else { [IO.File]::Move($tempLauncher,$launcher) }
  } finally { Remove-Item -LiteralPath $tempLauncher -Force -ErrorAction SilentlyContinue }
}
$arguments = '//B //Nologo "' + $launcher + '"'
$action = New-ScheduledTaskAction -Execute $wscript -Argument $arguments
$periodic = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$logon = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Actions.Count -ne 1) { throw 'Tarefa existente possui múltiplas ações; preserve-a e escolha outro -TaskName.' }
  $actualExe = [IO.Path]::GetFullPath($existing.Actions[0].Execute)
  $actualArguments = $existing.Actions[0].Arguments
  $sameNew = $actualExe -ieq $wscript -and $actualArguments -eq $arguments
  $sameOld = $actualExe -ieq $node -and $actualArguments -eq "`"$script`""
  if (-not $sameNew -and -not $sameOld) {
    throw 'Tarefa existente aponta para outro comando; preserve-a e escolha outro -TaskName.'
  }
  $actualInterval = $null
  foreach ($trigger in $existing.Triggers) {
    if ($trigger.Repetition -and $trigger.Repetition.Interval) {
      try { $actualInterval = [System.Xml.XmlConvert]::ToTimeSpan($trigger.Repetition.Interval).TotalMinutes } catch {}
    }
  }
  $updated = -not $sameNew -or $existing.Triggers.Count -ne 2 -or $actualInterval -ne $IntervalMinutes
  if ($updated) { Set-ScheduledTask -TaskName $name -Action $action -Trigger @($periodic,$logon) | Out-Null }
  $current = Get-ScheduledTask -TaskName $name
  [pscustomobject]@{ Name = $current.TaskName; State = $current.State.ToString(); Triggers = $current.Triggers.Count; Execute = $current.Actions[0].Execute; Arguments = $current.Actions[0].Arguments; Principal = $current.Principal.UserId; already_registered = $true; migrated_from_console = $sameOld; triggers_updated = $updated; recovery_interval_minutes = $IntervalMinutes } | ConvertTo-Json
  return
}
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger @($periodic,$logon) -Principal $principal -Settings $settings -Description 'Recuperação local e entrega terminal do localWorker' | Out-Null
$task = Get-ScheduledTask -TaskName $name
[pscustomobject]@{ Name = $task.TaskName; State = $task.State.ToString(); Triggers = $task.Triggers.Count; Execute = $task.Actions[0].Execute; Arguments = $task.Actions[0].Arguments; Principal = $task.Principal.UserId; recovery_interval_minutes = $IntervalMinutes } | ConvertTo-Json
