param([string]$Target, [string]$NodePath, [string]$CodexCommand, [string]$CodexConfig, [string]$MaintenanceRepo, [string]$WorkerModel)
$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$target = if ($Target) { $Target } else { Join-Path $env:USERPROFILE '.codex-local-worker' }
$node = if ($NodePath) { $NodePath } else { (Get-Command node.exe -ErrorAction Stop).Source }
if (-not $CodexCommand) {
  $found = Get-Command codex.exe -ErrorAction SilentlyContinue
  if ($found) { $CodexCommand = $found.Source }
  elseif ($env:CODEX_CLI_PATH) { $CodexCommand = $env:CODEX_CLI_PATH }
}
if (-not $CodexCommand -or -not (Test-Path -LiteralPath $CodexCommand -PathType Leaf)) { throw 'codex.exe ausente; informe -CodexCommand.' }
$targetItem = Get-Item -LiteralPath $target -Force
if (-not $targetItem.PSIsContainer -or ($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Raiz inválida.' }
if (Test-Path -LiteralPath (Join-Path $target 'create.lock')) { throw 'Criação de job em andamento.' }
$activeFile = Join-Path $target 'active.json'
if (Test-Path -LiteralPath $activeFile) {
  $active = Get-Content -LiteralPath $activeFile -Raw | ConvertFrom-Json
  $stateFile = Join-Path (Join-Path $target 'jobs') (Join-Path $active.job_id 'state.json')
  $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
  if ($state.status -notin @('COMPLETED','FAILED','CANCELLED')) { throw 'Job ativo: instalação adiada.' }
}
$stamp = Get-Date -Format yyyyMMddHHmmss
$files = @('AGENTS.md','server.mjs','thread-check.mjs','job-store.mjs','worker-core.mjs','worker-runner.mjs','delivery.mjs','watchdog.mjs','monitor.mjs','monitor-page.mjs','mcp-config.mjs','mcp-call.mjs','notify.ps1','package.json','package-lock.json')
$existingFiles = @()
$newFiles = @()
foreach ($name in $files) {
  $from = Join-Path $source $name
  $to = Join-Path $target $name
  if (-not (Test-Path -LiteralPath $from -PathType Leaf)) { throw "Fonte ausente: $name" }
  if (Test-Path -LiteralPath $to -PathType Leaf) { $existingFiles += $name }
  elseif (Test-Path -LiteralPath $to) { throw "Destino não é arquivo regular: $name" }
  else { $newFiles += $name }
  if ($name.EndsWith('.mjs')) {
    & $node --check $from
    if ($LASTEXITCODE -ne 0) { throw "Sintaxe inválida: $name" }
  }
}
$configFile = Join-Path $target 'config.json'
if (-not (Test-Path -LiteralPath $configFile -PathType Leaf)) { throw 'config.json instalado ausente.' }
$config = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
$config.PSObject.Properties.Remove('worker_rules')
$maintenance = if ($MaintenanceRepo) { (Resolve-Path -LiteralPath $MaintenanceRepo).Path } elseif ($env:LOCAL_WORKER_MAINTENANCE_REPO) { (Resolve-Path -LiteralPath $env:LOCAL_WORKER_MAINTENANCE_REPO).Path } else { (Resolve-Path -LiteralPath (Join-Path $source '..')).Path }
$config | Add-Member -NotePropertyName maintenance_repo -NotePropertyValue $maintenance -Force
$config | Add-Member -NotePropertyName codex_command -NotePropertyValue $CodexCommand -Force
$codexConfigPath = if ($CodexConfig) { [IO.Path]::GetFullPath($CodexConfig) } elseif ($config.codex_config) { [IO.Path]::GetFullPath($config.codex_config) } else { Join-Path (if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }) 'config.toml' }
$config | Add-Member -NotePropertyName codex_config -NotePropertyValue $codexConfigPath -Force
if (-not $config.PSObject.Properties['ollama_attempts']) { $config | Add-Member -NotePropertyName ollama_attempts -NotePropertyValue 4 }
if ($config.timeout_ms -eq 7200000) { $config.timeout_ms = 0 } # Migração do antigo padrão; demais escolhas explícitas permanecem.
if ($WorkerModel) { $config.model = $WorkerModel }
Copy-Item -LiteralPath $configFile -Destination "$configFile.backup-$stamp"
foreach ($name in $existingFiles) { Copy-Item -LiteralPath (Join-Path $target $name) -Destination "$(Join-Path $target $name).backup-$stamp" }
try {
  foreach ($name in $files) {
    $from = Join-Path $source $name
    $to = Join-Path $target $name
    Copy-Item -LiteralPath $from -Destination $to -Force
    if ($name.EndsWith('.mjs')) {
      & $node --check $to
      if ($LASTEXITCODE -ne 0) { throw "Verificação instalada falhou: $name" }
    }
  }
  $temp = "$configFile.$PID.tmp"
  [IO.File]::WriteAllText($temp, ($config | ConvertTo-Json -Depth 10) + "`n", [Text.UTF8Encoding]::new($false))
  [IO.File]::Replace($temp,$configFile,"$configFile.backup-$stamp")
} catch {
  foreach ($name in $existingFiles) { Copy-Item -LiteralPath "$(Join-Path $target $name).backup-$stamp" -Destination (Join-Path $target $name) -Force }
  foreach ($name in $newFiles) { Remove-Item -LiteralPath (Join-Path $target $name) -Force -ErrorAction SilentlyContinue }
  Copy-Item -LiteralPath "$configFile.backup-$stamp" -Destination $configFile -Force
  throw
}
$registration = & $node (Join-Path $target 'mcp-config.mjs') $codexConfigPath $CodexCommand
if ($LASTEXITCODE -ne 0) { throw 'Runtime atualizado, mas registro MCP falhou; reexecute após corrigir o diagnóstico.' }
[pscustomobject]@{ updated = $files; backup_suffix = $stamp; registration = ($registration | ConvertFrom-Json) } | ConvertTo-Json
