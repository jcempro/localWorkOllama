param([string]$Target, [string]$NodePath, [string]$CodexCommand, [string]$CodexConfig, [string]$MaintenanceRepo, [string]$MaintenanceId, [string]$WorkerModel, [ValidateRange(4096,262144)][int]$ContextTokens, [switch]$EnableHybridMaintenance)
$ErrorActionPreference = 'Stop'
if ($MaintenanceId -and $MaintenanceId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'Identidade de manutenção inválida.' }
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
  $env:LOCAL_WORKER_UPDATE_ROOT_R8Q=$target
  Push-Location $source
  try {
    # Stdin preserva aspas tambem no transporte nativo do Windows PowerShell 5.1.
    $activeId='import {activeJob} from "./job-store.mjs"; console.log((await activeJob(process.env.LOCAL_WORKER_UPDATE_ROOT_R8Q))??"");' | & $node --input-type=module -
    if($LASTEXITCODE -ne 0){throw 'Indice ativo nao recuperavel: instalacao adiada com evidencia preservada.'}
    if(($activeId|Select-Object -Last 1)){throw 'Job ativo: instalação adiada.'}
  }finally{Pop-Location;Remove-Item Env:LOCAL_WORKER_UPDATE_ROOT_R8Q}
}
$stamp = Get-Date -Format yyyyMMddHHmmss
$files = @('AGENTS.md','server.mts','server.mjs','response-contract.mts','response-contract.mjs','supervisor-review.mts','supervisor-review.mjs','delegation-policy.mts','delegation-policy.mjs','continuity.mts','continuity.mjs','continuity.ps1','thread-check.mjs','job-store.mjs','job-control.mjs','context-manager.mjs','progress-guard.mjs','worker-core.mts','worker-core.mjs','evidence-rendering.mts','evidence-rendering.mjs','worker-runner.mjs','delivery.mts','delivery.mjs','watchdog.mjs','monitor.mjs','monitor-page.mjs','mcp-config.mjs','mcp-call.mjs','notify.ps1','package.json','package-lock.json')
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
if ($MaintenanceId) { $config | Add-Member -NotePropertyName maintenance_id -NotePropertyValue $MaintenanceId -Force }
if ($EnableHybridMaintenance) {
  if (-not $config.maintenance_id) { throw 'Adoção híbrida exige identidade de manutenção preservada.' }
  $config | Add-Member -NotePropertyName maintenance_hybrid_version -NotePropertyValue 1 -Force
}
$config | Add-Member -NotePropertyName codex_command -NotePropertyValue $CodexCommand -Force
$codexConfigPath = if ($CodexConfig) { [IO.Path]::GetFullPath($CodexConfig) } elseif ($config.codex_config) { [IO.Path]::GetFullPath($config.codex_config) } else { Join-Path (if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }) 'config.toml' }
$config | Add-Member -NotePropertyName codex_config -NotePropertyValue $codexConfigPath -Force
if (-not $config.PSObject.Properties['ollama_attempts']) { $config | Add-Member -NotePropertyName ollama_attempts -NotePropertyValue 4 }
if ($config.timeout_ms -eq 7200000) { $config.timeout_ms = 0 } # Migração do antigo padrão; demais escolhas explícitas permanecem.
if ($WorkerModel) { $config.model = $WorkerModel }
if (-not $config.PSObject.Properties['context_tokens']) { $config | Add-Member -NotePropertyName context_tokens -NotePropertyValue 32768 }
if (-not $config.PSObject.Properties['min_context_tokens']) { $config | Add-Member -NotePropertyName min_context_tokens -NotePropertyValue 8192 }
if ($PSBoundParameters.ContainsKey('ContextTokens')) { $config.context_tokens = $ContextTokens }
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
