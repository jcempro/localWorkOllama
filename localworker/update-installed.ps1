param([string]$Target, [string]$NodePath, [string]$CodexCommand)
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
$files = @('AGENTS.md','server.mjs','worker-core.mjs','worker-runner.mjs','delivery.mjs','watchdog.mjs')
foreach ($name in $files) {
  $from = Join-Path $source $name
  $to = Join-Path $target $name
  if (-not (Test-Path -LiteralPath $from -PathType Leaf) -or -not (Test-Path -LiteralPath $to -PathType Leaf)) { throw "Arquivo ausente: $name" }
  if ($name.EndsWith('.mjs')) {
    & $node --check $from
    if ($LASTEXITCODE -ne 0) { throw "Sintaxe inválida: $name" }
  }
}
$configFile = Join-Path $target 'config.json'
if (-not (Test-Path -LiteralPath $configFile -PathType Leaf)) { throw 'config.json instalado ausente.' }
$config = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
$config.PSObject.Properties.Remove('worker_rules')
$config | Add-Member -NotePropertyName maintenance_repo -NotePropertyValue (Resolve-Path -LiteralPath (Join-Path $source '..')).Path -Force
$config | Add-Member -NotePropertyName codex_command -NotePropertyValue $CodexCommand -Force
$config | Add-Member -NotePropertyName ollama_attempts -NotePropertyValue 4 -Force
Copy-Item -LiteralPath $configFile -Destination "$configFile.backup-$stamp"
foreach ($name in $files) {
  $from = Join-Path $source $name
  $to = Join-Path $target $name
  Copy-Item -LiteralPath $to -Destination "$to.backup-$stamp"
  Copy-Item -LiteralPath $from -Destination $to -Force
  if ($name.EndsWith('.mjs')) {
    & $node --check $to
    if ($LASTEXITCODE -ne 0) { throw "Verificação instalada falhou: $name; restaure backup-$stamp" }
  }
}
[IO.File]::WriteAllText($configFile, ($config | ConvertTo-Json -Depth 10) + "`n", [Text.UTF8Encoding]::new($false))
[pscustomobject]@{ updated = $files; backup_suffix = $stamp } | ConvertTo-Json
