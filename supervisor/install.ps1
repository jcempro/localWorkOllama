param(
  [Parameter(Mandatory=$true)][string]$ThreadId,
  [Parameter(Mandatory=$true)][string]$RepoPath,
  [string]$Target,
  [string]$CodexHome,
  [string]$WorkerHome,
  [string]$NodeExe,
  [string]$CodexExe,
  [string]$OllamaExe,
  [ValidateRange(1,60)][int]$ScanMinutes=2
)
$ErrorActionPreference='Stop'
if($ThreadId -notmatch '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$'){throw 'ThreadId invalido.'}
if(-not $Target){$Target=Join-Path $env:USERPROFILE ('.codex-supervisor-resume\'+$ThreadId)}
if(-not $CodexHome){$CodexHome=if($env:CODEX_HOME){$env:CODEX_HOME}else{Join-Path $env:USERPROFILE '.codex'}}
if(-not $WorkerHome){$WorkerHome=if($env:LOCAL_WORKER_HOME){$env:LOCAL_WORKER_HOME}else{Join-Path $env:USERPROFILE '.codex-local-worker'}}
if(-not $NodeExe){$NodeExe=(Get-Command node.exe -ErrorAction Stop).Source}
$workerConfigS8R=Get-Content -LiteralPath (Join-Path $WorkerHome 'config.json') -Raw | ConvertFrom-Json
if(-not $CodexExe){$CodexExe=$workerConfigS8R.codex_command}
if(-not $OllamaExe){$OllamaExe=(Get-Command ollama.exe -ErrorAction Stop).Source}
$npmS8R=(Get-Command npm.cmd -ErrorAction Stop).Source
$psS8R=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$appS8R=@(Get-StartApps | Where-Object AppID -Like 'OpenAI.Codex_*!App')
if($appS8R.Count -ne 1){throw 'Desktop nao identificado inequivocamente.'}
foreach($pS8R in @($RepoPath,$WorkerHome,$CodexHome,$NodeExe,$CodexExe,$OllamaExe,$npmS8R)){
  $itemS8R=Get-Item -LiteralPath $pS8R -Force
  if($itemS8R.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Path redirecionado recusado.'}
}
$Target=[IO.Path]::GetFullPath($Target)
if(Test-Path -LiteralPath $Target){
  if(Test-Path -LiteralPath (Join-Path $Target 'config.json')){
    $oldS8R=Get-Content -LiteralPath (Join-Path $Target 'config.json') -Raw | ConvertFrom-Json
    if($oldS8R.threadId -ne $ThreadId -or [IO.Path]::GetFullPath($oldS8R.repoPath) -ine [IO.Path]::GetFullPath($RepoPath)){throw 'Instalacao pertence a outro destino.'}
  }elseif((Get-ChildItem -LiteralPath $Target -Force | Measure-Object).Count -gt 0){
    $partialS8R=Get-Content -LiteralPath (Join-Path $Target 'install-owner.json') -Raw | ConvertFrom-Json
    if($partialS8R.threadId -ne $ThreadId -or $partialS8R.repoPath -ine [IO.Path]::GetFullPath($RepoPath)){throw 'Destino parcial pertence a outro escopo.'}
  }
}
New-Item -ItemType Directory -Path $Target -Force | Out-Null
$cursorS8R=Get-Item -LiteralPath $Target
while($cursorS8R){if($cursorS8R.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Raiz redirecionada recusada.'};$cursorS8R=$cursorS8R.Parent}
$utfS8R=New-Object Text.UTF8Encoding($false)
$installMutexS8R=New-Object Threading.Mutex($false,('Local\CodexSupervisorResume-'+$ThreadId))
$ownsS8R=$false
try{
  try{$ownsS8R=$installMutexS8R.WaitOne(0)}catch [Threading.AbandonedMutexException]{$ownsS8R=$true}
  if(-not $ownsS8R){throw 'Runtime ativo; instalacao pode ser repetida depois sem interrupcao.'}
  [IO.File]::WriteAllText((Join-Path $Target 'install-owner.json'),(@{threadId=$ThreadId;repoPath=[IO.Path]::GetFullPath($RepoPath)}|ConvertTo-Json),$utfS8R)
$filesS8R=@('core.mjs','core.mts','rpc.mjs','rpc.mts','receipts.mjs','receipts.mts','run.mjs','run.mts','platform.ps1','install.ps1')
foreach($nameS8R in $filesS8R){
  if(-not(Test-Path -LiteralPath (Join-Path $PSScriptRoot $nameS8R) -PathType Leaf)){throw 'Fonte incompleta.'}
  if($nameS8R.EndsWith('.mjs')){& $NodeExe --check (Join-Path $PSScriptRoot $nameS8R);if($LASTEXITCODE -ne 0){throw 'Fonte JS invalida.'}}
}
# Fonte previamente validada; substituicao de cada arquivo com backup atomico.
foreach($nameS8R in $filesS8R){
  $srcS8R=Join-Path $PSScriptRoot $nameS8R
  $dstS8R=Join-Path $Target $nameS8R
  if(Test-Path -LiteralPath $dstS8R){
    if((Get-FileHash -LiteralPath $srcS8R).Hash -eq (Get-FileHash -LiteralPath $dstS8R).Hash){continue}
    Copy-Item -LiteralPath $srcS8R -Destination ($dstS8R+'.new')
    [IO.File]::Replace(($dstS8R+'.new'),$dstS8R,($dstS8R+'.previous'))
  }else{Copy-Item -LiteralPath $srcS8R -Destination $dstS8R}
}
$prefixS8R='CodexSupervisorResume-'+$ThreadId
$cfgS8R=@{schema=1;threadId=$ThreadId;repoPath=[IO.Path]::GetFullPath($RepoPath);codexHome=[IO.Path]::GetFullPath($CodexHome);workerHome=[IO.Path]::GetFullPath($WorkerHome);node=$NodeExe;codex=$CodexExe;ollama=$OllamaExe;ollamaUrl=$workerConfigS8R.ollama_url;npm=$npmS8R;powershell=$psS8R;desktopAppId=$appS8R[0].AppID;taskPrefix=$prefixS8R;mutexName=('Local\'+$prefixS8R);scanMinutes=$ScanMinutes}
# Hash da identidade retornada pela API oficial; nenhum token/senha e nenhum perfil copiado.
$env:SUPERVISOR_INSTALL_CONFIG_S8R=($cfgS8R|ConvertTo-Json -Compress)
$probeS8R=@'
import {connect} from './rpc.mjs';import {digest} from './core.mjs';
const c=JSON.parse(process.env.SUPERVISOR_INSTALL_CONFIG_S8R);const r=await connect(c);
try{const a=await r.read('account/read',{refreshToken:true});if(a.account?.type!=='chatgpt')throw Error('CHATGPT_LOGIN_REQUIRED');const t=(await r.read('thread/read',{threadId:c.threadId})).thread;if(t.id!==c.threadId||t.cwd.toLowerCase()!==c.repoPath.toLowerCase())throw Error('TARGET_MISMATCH');console.log(digest(a.account));}finally{r.close();}
'@
Push-Location $Target
try{$identityS8R=& $NodeExe --input-type=module -e $probeS8R;if($LASTEXITCODE -ne 0){throw 'Falha na autenticacao/identidade.'}}finally{Pop-Location;Remove-Item Env:SUPERVISOR_INSTALL_CONFIG_S8R}
$cfgS8R.accountKey=($identityS8R|Select-Object -Last 1).Trim()
if($oldS8R -and $oldS8R.accountKey -ne $cfgS8R.accountKey){throw 'Conta mudou; instalacao preservada sem ativacao.'}
$configFileS8R=Join-Path $Target 'config.json'
[IO.File]::WriteAllText(($configFileS8R+'.new'),($cfgS8R|ConvertTo-Json -Depth 8),$utfS8R)
if(Test-Path -LiteralPath $configFileS8R){[IO.File]::Replace(($configFileS8R+'.new'),$configFileS8R,($configFileS8R+'.previous'))}else{[IO.File]::Move(($configFileS8R+'.new'),$configFileS8R)}
# Copia privada de recuperacao: somente runtime e configuracao, nunca jobs/auth/tokens.
$recoveryS8R=Join-Path $Target 'worker-recovery'
New-Item -ItemType Directory -Path $recoveryS8R -Force|Out-Null
$manifestS8R=@()
$workerFilesS8R=@('AGENTS.md','config.json','package.json','package-lock.json','server.mjs','thread-check.mjs','job-store.mjs','job-control.mjs','context-manager.mjs','progress-guard.mjs','worker-core.mjs','worker-runner.mjs','delivery.mjs','watchdog.mjs','monitor.mjs','monitor-page.mjs','mcp-config.mjs','mcp-call.mjs','notify.ps1')
foreach($nameS8R in $workerFilesS8R){$fromS8R=Join-Path $WorkerHome $nameS8R;$toS8R=Join-Path $recoveryS8R $nameS8R;Copy-Item -LiteralPath $fromS8R -Destination $toS8R -Force;$manifestS8R+=@{name=$nameS8R;sha256=(Get-FileHash -LiteralPath $toS8R -Algorithm SHA256).Hash.ToLowerInvariant()}}
[IO.File]::WriteAllText((Join-Path $recoveryS8R 'manifest.json'),(@{schema=1;files=$manifestS8R}|ConvertTo-Json -Depth 8),$utfS8R)
$commandS8R='"'+$psS8R+'" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+(Join-Path $Target 'platform.ps1')+'" -Action Tick -Config "'+(Join-Path $Target 'config.json')+'"'
$vbsS8R='Set shell = CreateObject("WScript.Shell")'+"`r`n"+'WScript.Quit shell.Run("'+$commandS8R.Replace('"','""')+'", 0, True)'+"`r`n"
[IO.File]::WriteAllText((Join-Path $Target 'launch.vbs'),$vbsS8R,[Text.Encoding]::Unicode)
& $NodeExe (Join-Path $Target 'run.mjs') --probe
if($LASTEXITCODE -ne 0){throw 'Prontidao nao comprovada; tarefa nao registrada.'}
& $psS8R -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $Target 'platform.ps1') -Action Register -Config (Join-Path $Target 'config.json')
if($LASTEXITCODE -ne 0){throw 'Registro de tarefa falhou.'}
Write-Output "Instalado: $Target; tarefa: $prefixS8R; intervalo gratuito: $ScanMinutes min."
Write-Output "Cobertura exclusiva: conversa $ThreadId, repositorio $RepoPath. Outras conversas requerem registro proprio."
}finally{if($ownsS8R){$installMutexS8R.ReleaseMutex()};$installMutexS8R.Dispose()}
