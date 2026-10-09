param(
  [Parameter(Mandatory=$true)][ValidateSet('Tick','TestEvent','Register','Schedule','Unschedule','Desktop','Ollama','WorkerDependencies')][string]$Action,
  [Parameter(Mandatory=$true)][string]$Config,
  [string]$EventId,
  [ValidatePattern('^[a-z0-9-]{1,64}$')][string]$TestId='installation-test',
  [long]$DueAt
)
$ErrorActionPreference = 'Stop'
$cfgS8R = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
$rootS8R = Split-Path -Parent ([IO.Path]::GetFullPath($Config))
function Assert-RootS8R([string]$Root) {
  $cursor = Get-Item -LiteralPath $Root -Force
  while ($cursor) {
    if ($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse point recusado.' }
    $cursor = $cursor.Parent
  }
}
Assert-RootS8R $rootS8R
function Register-TaskS8R([string]$Name, $Triggers) {
  $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
  $arguments = '//B //Nologo "' + (Join-Path $rootS8R 'launch.vbs') + '"'
  $existing = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  if ($existing -and ($existing.Actions.Count -ne 1 -or $existing.Actions[0].Execute -ine $wscript -or $existing.Actions[0].Arguments -ne $arguments)) { throw 'Colisao de tarefa: outra acao preservada.' }
  $actionS8R = New-ScheduledTaskAction -Execute $wscript -Argument $arguments
  $principalS8R = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  $settingsS8R = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName $Name -Action $actionS8R -Trigger $Triggers -Principal $principalS8R -Settings $settingsS8R -Description 'Continuidade autorizada do supervisor; consulta sem inferencia, sem credenciais armazenadas.' -Force | Out-Null
}
if ($Action -in @('Tick','TestEvent')) {
  $mutexS8R = New-Object Threading.Mutex($false,$cfgS8R.mutexName)
  $ownedS8R = $false
  try {
    try { $ownedS8R = $mutexS8R.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownedS8R = $true }
    if (-not $ownedS8R) { exit 0 }
    $env:SUPERVISOR_MUTEX_S8R = $cfgS8R.mutexName
    $argsS8R = @((Join-Path $rootS8R 'run.mjs'))
    if ($Action -eq 'TestEvent') { $argsS8R += @('--test-event',('--test-id='+$TestId)) }
    & $cfgS8R.node @argsS8R
    exit $LASTEXITCODE
  } finally { if($ownedS8R){$mutexS8R.ReleaseMutex()};$mutexS8R.Dispose() }
}
if ($Action -eq 'Register') {
  $periodicS8R = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(30) -RepetitionInterval (New-TimeSpan -Minutes $cfgS8R.scanMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
  $logonS8R = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
  Register-TaskS8R $cfgS8R.taskPrefix @($periodicS8R,$logonS8R)
} elseif ($Action -in @('Schedule','Unschedule')) {
  if ($EventId -notmatch '^[a-f0-9]{64}$') { throw 'EventId invalido.' }
  $nameS8R = $cfgS8R.taskPrefix + '-' + $EventId.Substring(0,24)
  $existingS8R = Get-ScheduledTask -TaskName $nameS8R -ErrorAction SilentlyContinue
  if ($Action -eq 'Unschedule') {
    if ($existingS8R) {
      if($existingS8R.Actions[0].Arguments -ne ('//B //Nologo "'+(Join-Path $rootS8R 'launch.vbs')+'"')){throw 'Acao divergente.'}
      Unregister-ScheduledTask -TaskName $nameS8R -Confirm:$false
    }
  } else {
    # Agendador representa segundos; reset oficial ja tem essa precisao. Retry arredonda para cima.
    $atS8R = [DateTimeOffset]::FromUnixTimeMilliseconds([long]([Math]::Ceiling($DueAt/1000.0)*1000)).LocalDateTime
    $sameS8R = $existingS8R -and $existingS8R.Triggers.Count -eq 1 -and ([DateTime]$existingS8R.Triggers[0].StartBoundary -eq $atS8R)
    if (-not $sameS8R) { Register-TaskS8R $nameS8R @(New-ScheduledTaskTrigger -Once -At $atS8R) }
    $verifiedS8R = Get-ScheduledTask -TaskName $nameS8R
    if ([DateTime]$verifiedS8R.Triggers[0].StartBoundary -ne $atS8R) { throw 'Agendamento nao corresponde ao reset + 60 segundos.' }
  }
} elseif ($Action -eq 'Desktop') {
  $runningS8R = Get-Process -Name ChatGPT,Codex -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path -like '*\WindowsApps\OpenAI.Codex_*' }
  if (-not $runningS8R) {
    $appS8R = Get-StartApps | Where-Object AppID -EQ $cfgS8R.desktopAppId
    if (-not $appS8R) { throw 'DESKTOP_NOT_INSTALLED: reinstalacao autenticada necessaria.' }
    Start-Process -FilePath (Join-Path $env:SystemRoot 'explorer.exe') -ArgumentList ('shell:AppsFolder\' + $cfgS8R.desktopAppId) -WindowStyle Hidden
    for($iS8R=0;$iS8R -lt 20;$iS8R++) {
      Start-Sleep -Milliseconds 500
      $runningS8R = Get-Process -Name ChatGPT,Codex -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path -like '*\WindowsApps\OpenAI.Codex_*' }
      if($runningS8R){break}
    }
    if(-not $runningS8R){throw 'DESKTOP_START_PENDING'}
  }
} elseif ($Action -eq 'Ollama') {
  try { $null = Invoke-RestMethod -Uri $cfgS8R.ollamaUrl -TimeoutSec 3; return } catch {}
  if (-not (Test-Path -LiteralPath $cfgS8R.ollama -PathType Leaf)) { throw 'OLLAMA_NOT_INSTALLED' }
  Start-Process -FilePath $cfgS8R.ollama -ArgumentList 'serve' -WindowStyle Hidden
  for($iS8R=0;$iS8R -lt 15;$iS8R++) {
    Start-Sleep -Milliseconds 500
    try { $null=Invoke-RestMethod -Uri $cfgS8R.ollamaUrl -TimeoutSec 2; return } catch {}
  }
  throw 'OLLAMA_START_PENDING'
} elseif ($Action -eq 'WorkerDependencies') {
  Assert-RootS8R $cfgS8R.workerHome
  & $cfgS8R.npm ci --ignore-scripts --prefix $cfgS8R.workerHome
  if($LASTEXITCODE -ne 0){throw 'WORKER_DEPENDENCIES_UNAVAILABLE'}
}
