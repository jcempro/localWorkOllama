param([Parameter(Mandatory=$true)][string]$ProjectRoot)
$ErrorActionPreference='Stop'
$baseC9R=Join-Path (Resolve-Path -LiteralPath $ProjectRoot).Path 'constructor/audit-private'
$idC9R=[Guid]::NewGuid().ToString('N')
$dirC9R=Join-Path $baseC9R ('scheduler-c9r-'+$idC9R)
$prefixC9R='LocalWorkerC9RTest-'+$idC9R
$eventC9R=($idC9R+$idC9R)
$taskNameC9R=$prefixC9R+'-'+$eventC9R.Substring(0,24)
$taskCreatedC9R=$false
New-Item -ItemType Directory -Path $dirC9R|Out-Null
try{
  Copy-Item -LiteralPath (Join-Path $ProjectRoot 'src/supervisor/platform.ps1') -Destination (Join-Path $dirC9R 'platform.ps1')
  $cfgC9R=Join-Path $dirC9R 'config.json'
  [IO.File]::WriteAllText($cfgC9R,(@{taskPrefix=$prefixC9R}|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
  [IO.File]::WriteAllText((Join-Path $dirC9R 'fire.ps1'),'[IO.File]::WriteAllText((Join-Path $PSScriptRoot "fired.txt"),[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString())',(New-Object Text.UTF8Encoding($false)))
  $exeC9R=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
  $cmdC9R='"'+$exeC9R+'" -NoProfile -NonInteractive -File "'+(Join-Path $dirC9R 'fire.ps1')+'"'
  [IO.File]::WriteAllText((Join-Path $dirC9R 'launch.vbs'),('Set shell = CreateObject("WScript.Shell")'+"`r`n"+'WScript.Quit shell.Run("'+$cmdC9R.Replace('"','""')+'", 0, True)'),[Text.Encoding]::Unicode)
  $resetC9R=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()*1000
  $dueC9R=$resetC9R+60000
  & (Join-Path $dirC9R 'platform.ps1') -Action Schedule -Config $cfgC9R -EventId $eventC9R -DueAt $dueC9R
  $taskCreatedC9R=$true
  $taskC9R=Get-ScheduledTask -TaskName $taskNameC9R
  $boundaryC9R=[DateTimeOffset]::new([DateTime]$taskC9R.Triggers[0].StartBoundary).ToUnixTimeMilliseconds()
  if($boundaryC9R -ne $dueC9R){throw 'RESET_PLUS_60_MISMATCH'}
  if($taskC9R.Triggers.Count -ne 1 -or $taskC9R.Triggers[0].CimClass.CimClassName -ne 'MSFT_TaskTimeTrigger' -or $taskC9R.Settings.WakeToRun -or $taskC9R.Settings.StartWhenAvailable){throw 'UNEXPECTED_TRIGGER_OR_BOOT_CATCHUP'}
  $deadlineC9R=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+120000
  $firedC9R=Join-Path $dirC9R 'fired.txt'
  while(-not(Test-Path -LiteralPath $firedC9R)){
    if([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -gt $deadlineC9R){throw 'SCHEDULED_TASK_DID_NOT_FIRE'}
    Start-Sleep -Milliseconds 250
  }
  $actualC9R=[long](Get-Content -LiteralPath $firedC9R -Raw)
  if($actualC9R -lt $dueC9R -or $actualC9R -gt $dueC9R+15000){throw 'DISPATCH_OUTSIDE_MEASURED_TOLERANCE'}
  $proofC9R=@{test='real-os-scheduler-simulated-reset';reset_ms=$resetC9R;due_ms=$dueC9R;actual_ms=$actualC9R;delay_after_due_ms=$actualC9R-$dueC9R;configured_exact_plus_60=$true;boot_logon=$false;wake_or_catchup=$false;real_quota_exhausted=$false;real_chat_send=$false}
  [IO.File]::WriteAllText((Join-Path $baseC9R 'causal-scheduler-proof.json'),($proofC9R|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
  Write-Output ('C9R_REAL_SCHEDULER_OK delay_ms='+($actualC9R-$dueC9R))
}finally{
  if($taskCreatedC9R){
    $existingC9R=Get-ScheduledTask -TaskName $taskNameC9R -ErrorAction SilentlyContinue
    if($existingC9R -and $existingC9R.Actions[0].Arguments -eq ('//B //Nologo "'+(Join-Path $dirC9R 'launch.vbs')+'"')){Unregister-ScheduledTask -TaskName $taskNameC9R -Confirm:$false}
    elseif($existingC9R){throw 'TASK_CHANGED_PRESERVED_FOR_REVIEW'}
  }
  $actualDirC9R=(Resolve-Path -LiteralPath $dirC9R).Path
  if(-not $actualDirC9R.StartsWith($baseC9R+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $actualDirC9R) -ne ('scheduler-c9r-'+$idC9R)){throw 'UNSAFE_FIXTURE_CLEANUP'}
  Remove-Item -LiteralPath $actualDirC9R -Recurse -Force
}
