param([Parameter(Mandatory=$true)][string]$ProjectRoot,[switch]$VerifyOnly,[string]$BeforeConfigBackup,[switch]$SkipWorkerInstall)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'worker-config-invariant.ps1')
. (Join-Path $PSScriptRoot 'native-installer-result.ps1')
. (Join-Path $PSScriptRoot 'supervisor-installation-tasks.ps1')
$projectC9R=(Resolve-Path -LiteralPath $ProjectRoot).Path
$proofRootC9R=Join-Path $projectC9R 'constructor/audit-private'
$tasksC9R=@(Select-SupervisorInstallationTasksC9R -Tasks @(Get-ScheduledTask | Where-Object TaskName -Like 'CodexSupervisorResume-*'))
$targetsC9R=@()
foreach($taskC9R in $tasksC9R){
  if($taskC9R.Actions.Count -ne 1 -or $taskC9R.Actions[0].Arguments -notmatch '^//B //Nologo "(.+\\launch\.vbs)"$'){throw 'UNEXPECTED_SUPERVISOR_ACTION'}
  $dirC9R=Split-Path -Parent $Matches[1]
  $cfgC9R=Get-Content -LiteralPath (Join-Path $dirC9R 'config.json') -Raw|ConvertFrom-Json
  if($taskC9R.TaskName -ne ('CodexSupervisorResume-'+$cfgC9R.threadId)){throw 'TARGET_IDENTITY_MISMATCH'}
  $targetsC9R+=@{dir=$dirC9R;config=$cfgC9R;controlHash=(Get-FileHash -LiteralPath (Join-Path $dirC9R 'continuity.json')).Hash}
}
if(-not $targetsC9R.Count){throw 'NO_VERIFIED_INSTALLATION'}
$workersC9R=@($targetsC9R|ForEach-Object{$_.config.workerHome}|Select-Object -Unique)
if($workersC9R.Count -ne 1){throw 'MULTIPLE_WORKER_INSTALLATIONS_REQUIRE_SCOPING'}
$workerC9R=$workersC9R[0]
$nodeC9R=(Get-Command node.exe -ErrorAction Stop).Source
$psC9R=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$env:C9R_WORKER_DIR=$workerC9R
try{$cliC9R=('import {pathToFileURL} from "node:url";import path from "node:path";const d=await import(pathToFileURL(path.join(process.env.C9R_WORKER_DIR,"delivery.mjs")));console.log(await d.codexCommand());'|& $nodeC9R --input-type=module -|Select-Object -Last 1)}finally{Remove-Item Env:C9R_WORKER_DIR}
if($LASTEXITCODE -ne 0 -or -not(Test-Path -LiteralPath $cliC9R -PathType Leaf)){throw 'CLI_DISCOVERY_FAILED'}
$workerConfigBeforeC9R=Get-Content -LiteralPath (Join-Path $workerC9R 'config.json') -Raw
if($VerifyOnly -or $SkipWorkerInstall){
  if(-not $BeforeConfigBackup){throw 'VERIFY_REQUIRES_ORIGINAL_BACKUP'}
  $backupC9R=Get-Item -LiteralPath $BeforeConfigBackup
  if($backupC9R.Directory.FullName -ine [IO.Path]::GetFullPath($workerC9R) -or $backupC9R.Name -notmatch '^config\.json\.backup-\d+$' -or ($backupC9R.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'INVALID_WORKER_CONFIG_BACKUP'}
  $workerConfigBeforeC9R=Get-Content -LiteralPath $backupC9R.FullName -Raw
}
$globalConfigC9R=Join-Path $targetsC9R[0].config.codexHome 'config.toml'
$globalHashC9R=(Get-FileHash -LiteralPath $globalConfigC9R).Hash
if(-not $VerifyOnly -and -not $SkipWorkerInstall){
  Invoke-NativeInstallerC9R -Program $psC9R -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',(Join-Path $projectC9R 'src/install.ps1'),'-WorkerHome',$workerC9R,'-CodexHome',$targetsC9R[0].config.codexHome,'-CodexExe',$cliC9R,'-SkipPrerequisites','-SkipModel','-SkipWatchdog','-SkipGlobalRules','-WaitForIdle') -LogPath (Join-Path $proofRootC9R 'c9r-worker-install.log')
}
$filesC9R=@('continuity.mts','continuity.mjs','delivery.mjs','watchdog.mjs','job-store.mjs')
foreach($nameC9R in $filesC9R){
  if((Get-FileHash -LiteralPath (Join-Path $workerC9R $nameC9R)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $projectC9R ('src/localworker/'+$nameC9R))).Hash){throw 'WORKER_HASH_MISMATCH'}
}
$resultC9R=@()
$supervisorFilesC9R=@('continuity.mts','continuity.mjs','core.mts','core.mjs','run.mts','run.mjs','receipts.mts','receipts.mjs')
foreach($targetC9R in $targetsC9R){
  $cfgC9R=$targetC9R.config
  if(-not $VerifyOnly){
    Invoke-NativeInstallerC9R -Program $psC9R -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',(Join-Path $projectC9R 'src/supervisor/install.ps1'),'-ThreadId',$cfgC9R.threadId,'-RepoPath',$cfgC9R.repoPath,'-Target',$targetC9R.dir,'-CodexHome',$cfgC9R.codexHome,'-WorkerHome',$cfgC9R.workerHome,'-NodeExe',$nodeC9R,'-CodexExe',$cliC9R,'-OllamaExe',$cfgC9R.ollama,'-ScanMinutes',[string]$cfgC9R.scanMinutes,'-WaitForIdle') -LogPath (Join-Path $proofRootC9R ('c9r-supervisor-'+$cfgC9R.threadId+'.log'))
  }
  if((Get-FileHash -LiteralPath (Join-Path $targetC9R.dir 'continuity.json')).Hash -ne $targetC9R.controlHash){throw 'AUTHORIZATION_CHANGED_BY_INSTALL'}
  foreach($nameC9R in $supervisorFilesC9R){
    if((Get-FileHash -LiteralPath (Join-Path $targetC9R.dir $nameC9R)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $projectC9R ('src/supervisor/'+$nameC9R))).Hash){throw 'SUPERVISOR_HASH_MISMATCH'}
  }
  $manifestC9R=Get-Content -LiteralPath (Join-Path $targetC9R.dir 'worker-recovery/manifest.json') -Raw|ConvertFrom-Json
  foreach($nameC9R in $filesC9R){
    $hashC9R=(Get-FileHash -LiteralPath (Join-Path $workerC9R $nameC9R)).Hash
    $entryC9R=@($manifestC9R.files|Where-Object name -EQ $nameC9R)
    if($entryC9R.Count -ne 1 -or $entryC9R[0].sha256 -ine $hashC9R -or (Get-FileHash -LiteralPath (Join-Path $targetC9R.dir ('worker-recovery/'+$nameC9R))).Hash -ne $hashC9R){throw 'RECOVERY_HASH_MISMATCH'}
  }
  $taskC9R=Get-ScheduledTask -TaskName $cfgC9R.taskPrefix
  if(@($taskC9R.Triggers|Where-Object{$_.CimClass.CimClassName -in @('MSFT_TaskBootTrigger','MSFT_TaskLogonTrigger')}).Count -or $taskC9R.Settings.WakeToRun -or $taskC9R.Settings.StartWhenAvailable){throw 'UNAUTHORIZED_BOOT_OR_WAKE'}
  $controlC9R=Get-Content -LiteralPath (Join-Path $targetC9R.dir 'continuity.json') -Raw|ConvertFrom-Json
  $resultC9R+=@{thread_id=$cfgC9R.threadId;mode=$controlC9R.mode;reason=$controlC9R.reason;control_preserved=$true;hashes_and_manifest_match=$true;boot_logon=$false;wake_or_catchup=$false}
}
if((Get-FileHash -LiteralPath $globalConfigC9R).Hash -ne $globalHashC9R){throw 'GLOBAL_CONFIG_CHANGED'}
$settingsC9R=Assert-WorkerConfigC9R -Before $workerConfigBeforeC9R -After (Get-Content -LiteralPath (Join-Path $workerC9R 'config.json') -Raw) -ResolvedCodex $cliC9R
$proofC9R=@{timestamp_utc=[DateTime]::UtcNow.ToString('o');files=$filesC9R;supervisor_files=$supervisorFilesC9R;installations=$resultC9R;global_config_preserved=$true;worker_config_preserved=$settingsC9R.settings_preserved;codex_command_refreshed=$settingsC9R.codex_command_refreshed;verification_only=[bool]$VerifyOnly;worker_install_skipped=[bool]$SkipWorkerInstall;real_chat_sends=0;real_inference=$false;resume_executed=$false}
[IO.File]::WriteAllText((Join-Path $proofRootC9R 'causal-resume-installed-proof.json'),($proofC9R|ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
Write-Output 'C9R_INSTALLED_HASHES_VERIFIED_AUTHORIZATION_PRESERVED'
