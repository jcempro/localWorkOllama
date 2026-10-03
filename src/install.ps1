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
  [ValidateRange(4096,262144)][int]$ModelContextTokens = 32768,
  [string]$WatchdogTaskName = 'CodexLocalWorkerWatchdog',
  [ValidateRange(1,1440)][int]$WatchdogIntervalMinutes = 2,
  [switch]$SkipPrerequisites,
  [switch]$SkipModel,
  [switch]$WaitForIdle,
  [switch]$SkipWatchdog,
  [switch]$SkipGlobalRules
)
$ErrorActionPreference = 'Stop'
$MODEL_EXPLICIT_A3C = $PSBoundParameters.ContainsKey('WorkerModel') -or -not [string]::IsNullOrWhiteSpace($env:LOCAL_MODEL)
$MODEL_BUILD_EXPLICIT_A3C = $PSBoundParameters.ContainsKey('BaseModel') -or $PSBoundParameters.ContainsKey('ModelContextTokens') -or -not [string]::IsNullOrWhiteSpace($env:LOCAL_BASE_MODEL)
if (-not $PSBoundParameters.ContainsKey('WorkerModel') -and $env:LOCAL_MODEL) { $WorkerModel = $env:LOCAL_MODEL }
if (-not $PSBoundParameters.ContainsKey('BaseModel') -and $env:LOCAL_BASE_MODEL) { $BaseModel = $env:LOCAL_BASE_MODEL }
$SOURCE_ROOT_A3C = $PSScriptRoot
$WORKER_SOURCE_A3C = Join-Path $SOURCE_ROOT_A3C 'localworker'
$WORKER_HOME_A3C = if ($WorkerHome) { $WorkerHome } elseif ($env:LOCAL_WORKER_HOME) { $env:LOCAL_WORKER_HOME } else { Join-Path $env:USERPROFILE '.codex-local-worker' }
$CODEX_HOME_A3C = if ($CodexHome) { $CodexHome } elseif ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$CODEX_CONFIG_A3C = Join-Path $CODEX_HOME_A3C 'config.toml'
$GLOBAL_OVERRIDE_A3C = Join-Path $CODEX_HOME_A3C 'AGENTS.override.md'
$GLOBAL_RULES_A3C = if (Test-Path -LiteralPath $GLOBAL_OVERRIDE_A3C -PathType Leaf) { $GLOBAL_OVERRIDE_A3C } else { Join-Path $CODEX_HOME_A3C 'AGENTS.md' }
function Wait-WorkerIdleA3C([string]$Root) {
  if (-not (Test-Path -LiteralPath $Root -PathType Container)) { return }
  $watcherA3C = [IO.FileSystemWatcher]::new($Root, 'state.json')
  $watcherA3C.IncludeSubdirectories = $true
  $watcherA3C.EnableRaisingEvents = $true
  $reportedA3C = $null
  try {
    while ($true) {
      $activeFileA3C = Join-Path $Root 'active.json'
      if (-not (Test-Path -LiteralPath $activeFileA3C)) { return }
      $activeA3C = Get-Content -LiteralPath $activeFileA3C -Raw | ConvertFrom-Json
      if ($activeA3C.job_id -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'ID ativo inválido; atualização recusada.' }
      $stateFileA3C = Join-Path (Join-Path $Root 'jobs') (Join-Path $activeA3C.job_id 'state.json')
      $stateA3C = Get-Content -LiteralPath $stateFileA3C -Raw | ConvertFrom-Json
      if ($stateA3C.job_id -ne $activeA3C.job_id) { throw 'Identidade do estado ativo divergente.' }
      if ($stateA3C.status -in @('COMPLETED','FAILED','CANCELLED')) { return }
      if ($reportedA3C -ne $activeA3C.job_id) {
        Write-Output "Instalação aguardando término do job $($activeA3C.job_id) por evento local."
        $reportedA3C = $activeA3C.job_id
      }
      # Evento é preferencial; timeout apenas recupera evento perdido, sem inferência ou rede.
      $null = $watcherA3C.WaitForChanged([IO.WatcherChangeTypes]::All, 60000)
    }
  } finally { $watcherA3C.Dispose() }
}
if ($WaitForIdle) { Wait-WorkerIdleA3C $WORKER_HOME_A3C }
$RULES_START_A3C = '<!-- LOCALWORKER_GLOBAL_START -->'
$RULES_END_A3C = '<!-- LOCALWORKER_GLOBAL_END -->'
$LEGACY_GLOBAL_SHA256_A3C = 'a8eff5e87698169d7d658758b165a27735a1272a6bebad8f35f98736b527603e'
$MAINTENANCE_REPO_A3C = $SOURCE_ROOT_A3C
$MAINTENANCE_MARKER_A3C = Join-Path (Split-Path -Parent $SOURCE_ROOT_A3C) '.localworker-maintenance-id'
if (-not (Test-Path -LiteralPath $MAINTENANCE_MARKER_A3C -PathType Leaf)) {
  $markerStream = [IO.File]::Open($MAINTENANCE_MARKER_A3C, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try {
    $markerBytes = [Text.UTF8Encoding]::new($false).GetBytes(([Guid]::NewGuid().ToString('D')) + "`n")
    $markerStream.Write($markerBytes, 0, $markerBytes.Length)
  } finally { $markerStream.Dispose() }
}
$MAINTENANCE_ID_A3C = [IO.File]::ReadAllText($MAINTENANCE_MARKER_A3C).Trim()
if ($MAINTENANCE_ID_A3C -and $MAINTENANCE_ID_A3C -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'Identidade do repositório de manutenção inválida.' }
$APP_INSTALLER_FAMILY_A3C = 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe'
$WINGET_BOOTSTRAP_URL_A3C = 'https://aka.ms/getwinget'
$APP_INSTALLER_STORE_URI_A3C = 'ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1'
$DESKTOP_PACKAGE_ID_A3C = '9PLM9XGG6VKS'
$GIT_PACKAGE_ID_A3C = 'Git.Git'
$NODE_PACKAGE_ID_A3C = 'OpenJS.NodeJS.LTS'
$OLLAMA_PACKAGE_ID_A3C = 'Ollama.Ollama'
$OLLAMA_API_A3C = if ($env:OLLAMA_URL) { $env:OLLAMA_URL.TrimEnd('/') } else { 'http://127.0.0.1:11434' }
$WINGET_WAIT_ATTEMPTS_A3C = 60
$WINGET_WAIT_SECONDS_A3C = 5
$OLLAMA_WAIT_ATTEMPTS_A3C = 12
$OLLAMA_WAIT_SECONDS_A3C = 2
$GPU_RESERVE_MIN_BYTES_A3C = [UInt64](512 * 1024 * 1024)
$GPU_RESERVE_FRACTION_A3C = 0.20
$GPU_RESERVE_REQUEST_A3C = if ($env:LOCAL_WORKER_GPU_RESERVE_BYTES) { [UInt64]::Parse($env:LOCAL_WORKER_GPU_RESERVE_BYTES) } else { [UInt64]0 }
$GPU_RESTART_REQUIRED_A3C = $false
$GPU_RESERVE_APPLIED_BYTES_A3C = [UInt64]0

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

function Ensure-Winget-A3C {
  $windowsApps = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps'
  if (Test-Path -LiteralPath $windowsApps -PathType Container) { $env:PATH = "$windowsApps;$env:PATH" }
  $found = Find-Executable-A3C '' @('winget.exe')
  if ($found) { return $found }
  try {
    Add-AppxPackage -RegisterByFamilyName -MainPackage $APP_INSTALLER_FAMILY_A3C -ErrorAction Stop
  } catch { Write-Verbose "Registro do App Installer: $_" }
  $found = Find-Executable-A3C '' @('winget.exe')
  if ($found) { return $found }
  $bundle = Join-Path $env:TEMP "localworker-appinstaller-$PID.msixbundle"
  try {
    Invoke-WebRequest -Uri $WINGET_BOOTSTRAP_URL_A3C -OutFile $bundle -MaximumRedirection 8 -ErrorAction Stop
    $signature = Get-AuthenticodeSignature -FilePath $bundle
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft') { throw 'Assinatura do App Installer não validada.' }
    Add-AppxPackage -Path $bundle -ErrorAction Stop
  } catch { Write-Verbose "Instalação assinada do App Installer: $_" }
  finally { Remove-Item -LiteralPath $bundle -Force -ErrorAction SilentlyContinue }
  $found = Find-Executable-A3C '' @('winget.exe')
  if ($found) { return $found }
  Start-Process $APP_INSTALLER_STORE_URI_A3C
  for ($attempt = 0; $attempt -lt $WINGET_WAIT_ATTEMPTS_A3C; $attempt++) {
    Start-Sleep -Seconds $WINGET_WAIT_SECONDS_A3C
    $found = Find-Executable-A3C '' @('winget.exe')
    if ($found) { return $found }
  }
  throw 'App Installer/winget indisponível após registro, pacote assinado e Microsoft Store; instale-o pelo canal oficial e execute novamente.'
}

function Ensure-Package-A3C([string]$Name, [string]$PackageId) {
  if (Find-Executable-A3C '' @($Name)) { return }
  $winget = Ensure-Winget-A3C
  & $winget install --id $PackageId --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    $installed = & $winget list --id $PackageId --exact 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $installed) { throw "Instalação de $PackageId falhou; nenhum estado do Worker foi alterado." }
  }
  $env:PATH = [Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [Environment]::GetEnvironmentVariable('PATH','User') + ';' + $env:PATH
}

if (-not (Test-Path -LiteralPath $WORKER_SOURCE_A3C -PathType Container)) { throw 'Distribuição localworker ausente.' }
if (-not $SkipPrerequisites) {
  $winget = Ensure-Winget-A3C
  Ensure-Package-A3C 'git.exe' $GIT_PACKAGE_ID_A3C
  Ensure-Package-A3C 'node.exe' $NODE_PACKAGE_ID_A3C
  Ensure-Package-A3C 'ollama.exe' $OLLAMA_PACKAGE_ID_A3C
  $desktop = Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue
  if (-not $desktop) {
    & $winget install --id $DESKTOP_PACKAGE_ID_A3C -s msstore --accept-package-agreements --accept-source-agreements
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
if ($OLLAMA_EXE_A3C -and -not $SkipModel) {
  $gpuReserve = if ($GPU_RESERVE_REQUEST_A3C -gt 0) { $GPU_RESERVE_REQUEST_A3C } else { $GPU_RESERVE_MIN_BYTES_A3C }
  $nvidia = Find-Executable-A3C '' @('nvidia-smi.exe')
  if ($nvidia -and $GPU_RESERVE_REQUEST_A3C -eq 0) {
    $gpuSizes = & $nvidia --query-gpu=memory.total --format=csv,noheader,nounits 2>$null
    if ($LASTEXITCODE -eq 0 -and $gpuSizes) {
      $smallestMiB = ($gpuSizes | ForEach-Object { $size = 0; if ([int]::TryParse(([string]$_).Trim(),[ref]$size)) { $size } } | Measure-Object -Minimum).Minimum
      if ($smallestMiB -gt 0) { $gpuReserve = [UInt64][Math]::Max($gpuReserve,[Math]::Ceiling($smallestMiB * 1048576 * $GPU_RESERVE_FRACTION_A3C)) }
    }
  }
  $existingGpuReserve = [Environment]::GetEnvironmentVariable('OLLAMA_GPU_OVERHEAD','User')
  $parsedGpuReserve = [UInt64]0
  if (-not [UInt64]::TryParse($existingGpuReserve,[ref]$parsedGpuReserve) -or $parsedGpuReserve -lt $gpuReserve) {
    [Environment]::SetEnvironmentVariable('OLLAMA_GPU_OVERHEAD',[string]$gpuReserve,'User')
    $env:OLLAMA_GPU_OVERHEAD = [string]$gpuReserve
    $GPU_RESTART_REQUIRED_A3C = $true
  }
  $GPU_RESERVE_APPLIED_BYTES_A3C = [UInt64][Math]::Max($gpuReserve,$parsedGpuReserve)
}
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
  try { Invoke-RestMethod -Uri "$OLLAMA_API_A3C/api/version" -TimeoutSec 8 | Out-Null }
  catch {
    Start-Process -FilePath $OLLAMA_EXE_A3C -ArgumentList 'serve' -WindowStyle Hidden
    $GPU_RESTART_REQUIRED_A3C = $false
    $ready = $false
    for ($attempt = 0; $attempt -lt $OLLAMA_WAIT_ATTEMPTS_A3C; $attempt++) {
      Start-Sleep -Seconds $OLLAMA_WAIT_SECONDS_A3C
      try { Invoke-RestMethod -Uri "$OLLAMA_API_A3C/api/version" -TimeoutSec 3 | Out-Null; $ready = $true; break } catch {}
    }
    if (-not $ready) { throw 'Ollama não respondeu após inicialização.' }
  }
  $models = & $OLLAMA_EXE_A3C list
  if ($LASTEXITCODE -ne 0) { throw 'ollama list falhou.' }
  $canonicalModel = if ($WorkerModel.Contains(':')) { $WorkerModel } else { "${WorkerModel}:latest" }
  $listedModels = @($models | Select-Object -Skip 1 | ForEach-Object { (([string]$_).Trim() -split '\s+')[0] })
  $modelPresent = $listedModels -contains $WorkerModel -or $listedModels -contains $canonicalModel
  if (-not $modelPresent -or $MODEL_BUILD_EXPLICIT_A3C) {
    & $OLLAMA_EXE_A3C pull $BaseModel
    if ($LASTEXITCODE -ne 0) { throw 'Download do modelo Ollama falhou.' }
    $modelfile = Join-Path $env:TEMP ("localworker-model-$PID.Modelfile")
    try {
      [IO.File]::WriteAllText($modelfile, "FROM $BaseModel`nPARAMETER num_ctx $ModelContextTokens`n", [Text.UTF8Encoding]::new($false))
      & $OLLAMA_EXE_A3C create $WorkerModel -f $modelfile
      if ($LASTEXITCODE -ne 0) { throw 'Criação do modelo Ollama falhou.' }
    } finally { Remove-Item -LiteralPath $modelfile -Force -ErrorAction SilentlyContinue }
  }
}

$WORKER_HOME_A3C = [IO.Path]::GetFullPath($WORKER_HOME_A3C)
$CODEX_HOME_A3C = [IO.Path]::GetFullPath($CODEX_HOME_A3C)
if (Test-Path -LiteralPath $WORKER_HOME_A3C) {
  $updateArgs = @{ Target = $WORKER_HOME_A3C; NodePath = $NODE_EXE_A3C; CodexCommand = $CODEX_EXE_A3C; CodexConfig = $CODEX_CONFIG_A3C; MaintenanceRepo = $MAINTENANCE_REPO_A3C; MaintenanceId = $MAINTENANCE_ID_A3C }
  if ($MODEL_EXPLICIT_A3C) { $updateArgs.WorkerModel = $WorkerModel }
  if ($PSBoundParameters.ContainsKey('ModelContextTokens')) { $updateArgs.ContextTokens = $ModelContextTokens }
  & (Join-Path $WORKER_SOURCE_A3C 'update-installed.ps1') @updateArgs
} else {
  & (Join-Path $WORKER_SOURCE_A3C 'install.ps1') -Target $WORKER_HOME_A3C -CodexConfig $CODEX_CONFIG_A3C -NodePath $NODE_EXE_A3C -NpmCommand $NPM_EXE_A3C -CodexCommand $CODEX_EXE_A3C -WorkerModel $WorkerModel -ContextTokens $ModelContextTokens -MaintenanceRepo $MAINTENANCE_REPO_A3C -MaintenanceId $MAINTENANCE_ID_A3C
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
    $prefix = $existing.Substring(0,$begin)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hashBytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($prefix.Replace("`r`n","`n").Trim())) }
    finally { $sha.Dispose() }
    $prefixHash = ([BitConverter]::ToString($hashBytes)).Replace('-','').ToLowerInvariant()
    if ($prefixHash -eq $LEGACY_GLOBAL_SHA256_A3C) { $prefix = '' }
    $next = $prefix + $block + $existing.Substring($end)
  } elseif ($existing.Contains($RULES_START_A3C) -or $existing.Contains($RULES_END_A3C)) {
    throw 'Marcador parcial no AGENTS.md global; preservado para reparo manual.'
  } elseif ($existing.Contains($rules)) {
    $next = $existing
  } else {
    $next = $existing.TrimEnd() + "`r`n`r`n" + $block + "`r`n"
  }
  if ($next -ne $existing) {
    $rulesBackup = "$GLOBAL_RULES_A3C.backup-$(Get-Date -Format yyyyMMddHHmmss)"
    if ($existing) { Copy-Item -LiteralPath $GLOBAL_RULES_A3C -Destination $rulesBackup }
    $temp = "$GLOBAL_RULES_A3C.$PID.tmp"
    [IO.File]::WriteAllText($temp,$next,[Text.UTF8Encoding]::new($false))
    if (Test-Path -LiteralPath $GLOBAL_RULES_A3C -PathType Leaf) { [IO.File]::Replace($temp,$GLOBAL_RULES_A3C,$rulesBackup) }
    else { [IO.File]::Move($temp,$GLOBAL_RULES_A3C) }
  }
}
if (-not $SkipWatchdog) {
  & (Join-Path $WORKER_SOURCE_A3C 'register-watchdog.ps1') -Target $WORKER_HOME_A3C -NodePath $NODE_EXE_A3C -TaskName $WatchdogTaskName -IntervalMinutes $WatchdogIntervalMinutes
  if ($LASTEXITCODE -ne 0) { throw 'Registro do watchdog falhou.' }
}
[pscustomobject]@{ worker = $WORKER_HOME_A3C; codex = $CODEX_HOME_A3C; model = $WorkerModel; source = $SOURCE_ROOT_A3C; status = 'INSTALLED'; gpu_reserve_bytes = $GPU_RESERVE_APPLIED_BYTES_A3C; ollama_restart_required_for_gpu_reserve = $GPU_RESTART_REQUIRED_A3C } | ConvertTo-Json
