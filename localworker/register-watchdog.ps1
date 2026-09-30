param([string]$Target, [string]$NodePath, [string]$TaskName = 'CodexLocalWorkerWatchdog')
$ErrorActionPreference = 'Stop'
if (-not $Target) { $Target = Join-Path $env:USERPROFILE '.codex-local-worker' }
if (-not $NodePath) { $NodePath = (Get-Command node.exe -ErrorAction Stop).Source }
$name = $TaskName
if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) { throw 'Tarefa já existe; preservar configuração anterior.' }
$node = $NodePath
$script = Join-Path $Target 'watchdog.mjs'
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw 'Node ausente.' }
if (-not (Test-Path -LiteralPath $script -PathType Leaf)) { throw 'Watchdog ausente.' }
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`""
$periodic = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
$logon = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger @($periodic,$logon) -Principal $principal -Settings $settings -Description 'Recuperação local e entrega terminal do localWorker' | Out-Null
$task = Get-ScheduledTask -TaskName $name
[pscustomobject]@{ Name = $task.TaskName; State = $task.State.ToString(); Triggers = $task.Triggers.Count; Execute = $task.Actions[0].Execute; Arguments = $task.Actions[0].Arguments; Principal = $task.Principal.UserId } | ConvertTo-Json
