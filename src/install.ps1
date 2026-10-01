param(
  [string]$WorkerHome,
  [string]$CodexHome,
  [string]$GitExe,
  [string]$NodeExe,
  [string]$NpmExe,
  [string]$OllamaExe,
  [string]$CodexExe,
  [string]$WorkerModel = 'qwen3-coder-next-32k',
  [string]$BaseModel = 'qwen3-coder-next:q4_K_M',
  [string]$WatchdogTaskName = 'CodexLocalWorkerWatchdog',
  [ValidateRange(1,1440)][int]$WatchdogIntervalMinutes = 15,
  [switch]$SkipPrerequisites,
  [switch]$SkipModel,
  [switch]$SkipWatchdog,
  [switch]$SkipGlobalRules
)
$ErrorActionPreference = 'Stop'
$SOURCE_ROOT_A3C = $PSScriptRoot
$WORKER_SOURCE_A3C = Join-Path $SOURCE_ROOT_A3C 'localworker'
$WORKER_HOME_A3C = if ($WorkerHome) { $WorkerHome } elseif ($env:LOCAL_WORKER_HOME) { $env:LOCAL_WORKER_HOME } else { Join-Path $env:USERPROFILE '.codex-local-worker' }
$CODEX_HOME_A3C = if ($CodexHome) { $CodexHome } elseif ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$CODEX_CONFIG_A3C = Join-Path $CODEX_HOME_A3C 'config.toml'
$GLOBAL_RULES_A3C = Join-Path $CODEX_HOME_A3C 'AGENTS.md'
$RULES_START_A3C = '<!-- LOCALWORKER_GLOBAL_START -->'
$RULES_END_A3C = '<!-- LOCALWORKER_GLOBAL_END -->'
$MAINTENANCE_REPO_A3C = $SOURCE_ROOT_A3C

function Find-Executable-A3C([string]$Given, [string[]]$Names) {
  if ($Given) {
    if (-not (Test-Path -LiteralPath $Given -PathType Leaf)) { throw "Executável ausente: $Given" }
    return (Resolve-Path -LiteralPath $Given).Path
  }
  foreach ($name in $Names) {
    $found = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found -and (Test-Path -LiteralPath $found.Source -PathType Leaf)) { return $found.Source }
  }
  return $null
}

function Ensure-Package-A3C([string]$Name, [string]$PackageId) {
  if (Find-Executable-A3C '' @($Name)) { return }
  $winget = Find-Executable-A3C '' @('winget.exe')
  if (-not $winget) { throw "Ausente: $Name. Instale App Installer/winget ou o pacote oficial e execute novamente." }
  & $winget install --id $PackageId --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    $installed = & $winget list --id $PackageId --exact 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $installed) { throw "Instalação de $PackageId falhou; nenhum estado do Worker foi alterado." }
  }
  $env:PATH = [Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [Environment]::GetEnvironmentVariable('PATH','User') + ';' + $env:PATH
}

if (-not (Test-Path -LiteralPath $WORKER_SOURCE_A3C -PathType Container)) { throw 'Distribuição localworker ausente.' }
if (-not $SkipPrerequisites) {
  Ensure-Package-A3C 'git.exe' 'Git.Git'
  Ensure-Package-A3C 'node.exe' 'OpenJS.NodeJS.LTS'
  Ensure-Package-A3C 'ollama.exe' 'Ollama.Ollama'
  $winget = Find-Executable-A3C '' @('winget.exe')
  if (-not $winget) { throw 'winget ausente para instalar Codex Desktop.' }
  $desktop = Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue
  if (-not $desktop) {
    & $winget install --id '9PLM9XGG6VKS' -s msstore --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0 -and -not (Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue)) { throw 'Instalação do Codex Desktop falhou.' }
  }
}

$GIT_EXE_A3C = Find-Executable-A3C $GitExe @('git.exe')
if ($GIT_EXE_A3C) {
  $GIT_ROOT_A3C = & $GIT_EXE_A3C -C $SOURCE_ROOT_A3C rev-parse --show-toplevel 2>$null
  if ($LASTEXITCODE -eq 0 -and $GIT_ROOT_A3C) { $MAINTENANCE_REPO_A3C = [string]$GIT_ROOT_A3C }
}
$NODE_EXE_A3C = Find-Executable-A3C $NodeExe @('node.exe')
$NPM_EXE_A3C = Find-Executable-A3C $NpmExe @('npm.cmd')
$OLLAMA_EXE_A3C = Find-Executable-A3C $OllamaExe @('ollama.exe')
if (-not $NODE_EXE_A3C -or -not $NPM_EXE_A3C) { throw 'Node.js/npm não encontrados após instalação.' }
if (-not $SkipPrerequisites -and (-not $GIT_EXE_A3C -or -not $OLLAMA_EXE_A3C)) { throw 'Git/Ollama não encontrados após instalação.' }
$nodeMajor = [int]((& $NODE_EXE_A3C -p 'process.versions.node').Split('.')[0])
if ($nodeMajor -lt 22) { throw 'Node.js 22 ou superior necessário.' }

$CODEX_EXE_A3C = Find-Executable-A3C $CodexExe @('codex.exe')
if (-not $CODEX_EXE_A3C -and -not $SkipPrerequisites) {
  & $NPM_EXE_A3C install -g '@openai/codex'
  if ($LASTEXITCODE -ne 0) { throw 'Instalação do Codex CLI falhou.' }
  $CODEX_EXE_A3C = Find-Executable-A3C '' @('codex.exe')
}
if (-not $CODEX_EXE_A3C) {
  $npmRoot = (& $NPM_EXE_A3C root -g).Trim()
  $native = Get-ChildItem -LiteralPath (Join-Path $npmRoot '@openai\codex') -Recurse -File -Filter 'codex.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($native) { $CODEX_EXE_A3C = $native.FullName }
}
if (-not $CODEX_EXE_A3C) { throw 'Codex CLI ausente; indique -CodexExe.' }
$queueHelp = & $CODEX_EXE_A3C queue --help 2>&1
if ($LASTEXITCODE -ne 0 -or -not (($queueHelp -join "`n") -match '--thread\s+<') -or -not (($queueHelp -join "`n") -match '--message\s+<')) {
  throw 'Codex CLI não oferece queue --thread/--message; atualize o CLI.'
}

if (-not $SkipModel) {
  if (-not $OLLAMA_EXE_A3C) { throw 'Ollama ausente.' }
  try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 8 | Out-Null }
  catch {
    Start-Process -FilePath $OLLAMA_EXE_A3C -ArgumentList 'serve' -WindowStyle Hidden
    $ready = $false
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
      Start-Sleep -Seconds 2
      try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 3 | Out-Null; $ready = $true; break } catch {}
    }
    if (-not $ready) { throw 'Ollama não respondeu após inicialização.' }
  }
  $models = & $OLLAMA_EXE_A3C list
  if ($LASTEXITCODE -ne 0) { throw 'ollama list falhou.' }
  if (($models -join "`n") -notmatch [regex]::Escape($WorkerModel)) {
    & $OLLAMA_EXE_A3C pull $BaseModel
    if ($LASTEXITCODE -ne 0) { throw 'Download do modelo Ollama falhou.' }
    $modelfile = Join-Path $env:TEMP ("localworker-model-$PID.Modelfile")
    try {
      [IO.File]::WriteAllText($modelfile, "FROM $BaseModel`nPARAMETER num_ctx 32768`n", [Text.UTF8Encoding]::new($false))
      & $OLLAMA_EXE_A3C create $WorkerModel -f $modelfile
      if ($LASTEXITCODE -ne 0) { throw 'Criação do modelo Ollama falhou.' }
    } finally { Remove-Item -LiteralPath $modelfile -Force -ErrorAction SilentlyContinue }
  }
}

$WORKER_HOME_A3C = [IO.Path]::GetFullPath($WORKER_HOME_A3C)
$CODEX_HOME_A3C = [IO.Path]::GetFullPath($CODEX_HOME_A3C)
if (Test-Path -LiteralPath $WORKER_HOME_A3C) {
  $updateArgs = @{ Target = $WORKER_HOME_A3C; NodePath = $NODE_EXE_A3C; CodexCommand = $CODEX_EXE_A3C; MaintenanceRepo = $MAINTENANCE_REPO_A3C }
  if ($PSBoundParameters.ContainsKey('WorkerModel')) { $updateArgs.WorkerModel = $WorkerModel }
  & (Join-Path $WORKER_SOURCE_A3C 'update-installed.ps1') @updateArgs
} else {
  & (Join-Path $WORKER_SOURCE_A3C 'install.ps1') -Target $WORKER_HOME_A3C -CodexConfig $CODEX_CONFIG_A3C -NodePath $NODE_EXE_A3C -NpmCommand $NPM_EXE_A3C -CodexCommand $CODEX_EXE_A3C -WorkerModel $WorkerModel -MaintenanceRepo $MAINTENANCE_REPO_A3C
}
if ($LASTEXITCODE -ne 0) { throw 'Instalação ou atualização do Worker falhou.' }

if (-not $SkipGlobalRules) {
  New-Item -ItemType Directory -Path $CODEX_HOME_A3C -Force | Out-Null
  $rules = [IO.File]::ReadAllText((Join-Path $SOURCE_ROOT_A3C 'agents.supervisor.md')).TrimEnd()
  $block = "$RULES_START_A3C`r`n" + $rules + "`r`n$RULES_END_A3C"
  $existing = if (Test-Path -LiteralPath $GLOBAL_RULES_A3C -PathType Leaf) { [IO.File]::ReadAllText($GLOBAL_RULES_A3C) } else { '' }
  if ($existing.Contains($RULES_START_A3C) -and $existing.Contains($RULES_END_A3C)) {
    $begin = $existing.IndexOf($RULES_START_A3C)
    $end = $existing.IndexOf($RULES_END_A3C) + $RULES_END_A3C.Length
    $next = $existing.Substring(0,$begin) + $block + $existing.Substring($end)
  } elseif ($existing.Contains($RULES_START_A3C) -or $existing.Contains($RULES_END_A3C)) {
    throw 'Marcador parcial no AGENTS.md global; preservado para reparo manual.'
  } elseif ($existing.Contains($rules)) {
    $next = $existing
  } else {
    $next = $existing.TrimEnd() + "`r`n`r`n" + $block + "`r`n"
  }
  if ($next -ne $existing) {
    if ($existing) { Copy-Item -LiteralPath $GLOBAL_RULES_A3C -Destination "$GLOBAL_RULES_A3C.backup-$(Get-Date -Format yyyyMMddHHmmss)" }
    $temp = "$GLOBAL_RULES_A3C.$PID.tmp"
    [IO.File]::WriteAllText($temp,$next,[Text.UTF8Encoding]::new($false))
    [IO.File]::Move($temp,$GLOBAL_RULES_A3C,$true)
  }
}
if (-not $SkipWatchdog) {
  & (Join-Path $WORKER_SOURCE_A3C 'register-watchdog.ps1') -Target $WORKER_HOME_A3C -NodePath $NODE_EXE_A3C -TaskName $WatchdogTaskName -IntervalMinutes $WatchdogIntervalMinutes
  if ($LASTEXITCODE -ne 0) { throw 'Registro do watchdog falhou.' }
}
[pscustomobject]@{ worker = $WORKER_HOME_A3C; codex = $CODEX_HOME_A3C; model = $WorkerModel; source = $SOURCE_ROOT_A3C; status = 'INSTALLED' } | ConvertTo-Json
