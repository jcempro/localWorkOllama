param(
  [string]$Target,
  [string]$CodexConfig,
  [string]$NodePath,
  [string]$NpmCommand,
  [string]$CodexCommand,
  [string]$MaintenanceRepo,
  [string]$WorkerModel = 'qwen3-coder-next-32k'
)
$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$maintenanceRepo = if ($MaintenanceRepo) { (Resolve-Path -LiteralPath $MaintenanceRepo).Path } else { (Resolve-Path -LiteralPath (Join-Path $source '..')).Path }
if (-not $Target) { $Target = Join-Path $env:USERPROFILE '.codex-local-worker' }
if (-not $CodexConfig) {
  $codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
  $CodexConfig = Join-Path $codexHome 'config.toml'
}
if (-not $NodePath) { $NodePath = (Get-Command node.exe -ErrorAction Stop).Source }
if (-not $NpmCommand) { $NpmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source }
if (-not $CodexCommand) {
  $found = Get-Command codex.exe -ErrorAction SilentlyContinue
  if ($found) { $CodexCommand = $found.Source }
  elseif ($env:CODEX_CLI_PATH -and (Test-Path -LiteralPath $env:CODEX_CLI_PATH -PathType Leaf)) { $CodexCommand = $env:CODEX_CLI_PATH }
  else {
    $globalRoot = (& $NpmCommand root -g).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível localizar o CLI Codex.' }
    $native = Get-ChildItem -LiteralPath (Join-Path $globalRoot '@openai\codex') -Filter codex.exe -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $native) { throw 'codex.exe não encontrado. Instale Codex Desktop/CLI e informe -CodexCommand.' }
    $CodexCommand = $native.FullName
  }
}
$files = @('AGENTS.md','config.json','package.json','package-lock.json','server.mjs','thread-check.mjs','job-store.mjs','worker-core.mjs','worker-runner.mjs','delivery.mjs','watchdog.mjs','monitor.mjs','notify.ps1')
foreach ($exe in @($NodePath,$NpmCommand,$CodexCommand)) {
  if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Executável ausente: $exe" }
}
$nodeMajor = [int]((& $NodePath -p 'process.versions.node').Split('.')[0])
if ($nodeMajor -lt 22) { throw 'Node.js 22 ou superior é necessário para node:sqlite.' }
$queueHelp = & $CodexCommand queue --help 2>&1
if ($LASTEXITCODE -ne 0 -or -not (($queueHelp -join "`n") -match '--thread\s+<') -or -not (($queueHelp -join "`n") -match '--message\s+<')) { throw 'Este codex.exe não oferece codex queue --thread/--message; atualize o Codex Desktop/CLI.' }
foreach ($name in $files) {
  if (-not (Test-Path -LiteralPath (Join-Path $source $name) -PathType Leaf)) { throw "Fonte ausente: $name" }
}
$Target = [IO.Path]::GetFullPath($Target)
$CodexConfig = [IO.Path]::GetFullPath($CodexConfig)
if (Test-Path -LiteralPath $Target) { throw "Destino já existe; preserve ou use update-installed.ps1: $Target" }
$StageTarget = "$Target.installing-$PID"
if (Test-Path -LiteralPath $StageTarget) { throw "Área temporária já existe: $StageTarget" }
$content = if (Test-Path -LiteralPath $CodexConfig -PathType Leaf) { [IO.File]::ReadAllText($CodexConfig) } else { '' }
if ($content -match '(?m)^\[mcp_servers\.localworker(?:\.env)?\][ \t]*\r?$') { throw 'MCP localworker já configurado; preserve a configuração existente.' }
New-Item -ItemType Directory -Path $StageTarget | Out-Null
$targetItem = Get-Item -LiteralPath $StageTarget -Force
if (-not $targetItem.PSIsContainer -or ($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Raiz de instalação inválida ou reparse point.' }
$nodeToml = ConvertTo-Json -InputObject $NodePath -Compress
$serverToml = ConvertTo-Json -InputObject (Join-Path $Target 'server.mjs') -Compress
$content = $content.TrimEnd() + "`r`n`r`n[mcp_servers.localworker]`r`ncommand = $nodeToml`r`nargs = [$serverToml]`r`nenabled = true`r`nstartup_timeout_sec = 120`r`n"

try {
foreach ($name in $files) { Copy-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $StageTarget $name) }
$workerConfig = Get-Content -LiteralPath (Join-Path $source 'config.json') -Raw | ConvertFrom-Json
$workerConfig | Add-Member -NotePropertyName maintenance_repo -NotePropertyValue $maintenanceRepo -Force
$workerConfig | Add-Member -NotePropertyName codex_command -NotePropertyValue $CodexCommand -Force
$workerConfig.model = $WorkerModel
[IO.File]::WriteAllText((Join-Path $StageTarget 'config.json'), ($workerConfig | ConvertTo-Json -Depth 10) + "`n", [Text.UTF8Encoding]::new($false))
& $NpmCommand ci --ignore-scripts --prefix $StageTarget
if ($LASTEXITCODE -ne 0) {
  $fallbackCache = Join-Path $StageTarget '.npm-cache'
  & $NpmCommand ci --ignore-scripts --prefix $StageTarget --cache $fallbackCache --prefer-online
  if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou com cache padrão e cache isolado; config.toml do Codex preservado.' }
  $cacheItem = Get-Item -LiteralPath $fallbackCache -Force -ErrorAction SilentlyContinue
  if ($cacheItem -and $cacheItem.PSIsContainer -and -not ($cacheItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { Remove-Item -LiteralPath $fallbackCache -Recurse -Force }
}
Move-Item -LiteralPath $StageTarget -Destination $Target
} catch {
  $stageItem = Get-Item -LiteralPath $StageTarget -Force -ErrorAction SilentlyContinue
  if ($stageItem -and $stageItem.PSIsContainer -and -not ($stageItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    Remove-Item -LiteralPath $StageTarget -Recurse -Force
  }
  throw
}
New-Item -ItemType Directory -Path (Split-Path -Parent $CodexConfig) -Force | Out-Null
$backup = $null
if (Test-Path -LiteralPath $CodexConfig -PathType Leaf) {
  $backup = "$CodexConfig.localworker-backup-$(Get-Date -Format yyyyMMddHHmmss)"
  Copy-Item -LiteralPath $CodexConfig -Destination $backup
}
$temporary = "$CodexConfig.$PID.tmp"
[IO.File]::WriteAllText($temporary, $content, [Text.UTF8Encoding]::new($false))
if (Test-Path -LiteralPath $CodexConfig -PathType Leaf) { [IO.File]::Replace($temporary, $CodexConfig, $backup) }
else { [IO.File]::Move($temporary, $CodexConfig) }
[pscustomobject]@{ installed = $files.Count; backup = $backup; target = $Target; config_updated = $true; model = $WorkerModel } | ConvertTo-Json
