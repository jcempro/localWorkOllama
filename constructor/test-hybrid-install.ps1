# Fixture de instalação isolada/adoção/idempotência; sem tarefa agendada ou jobs.
param([string]$NodeExe)
$ErrorActionPreference='Stop'
$WORKSPACE_S4W = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$PRIVATE_S4W = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'audit-private'))
$FIXTURE_S4W = Join-Path $PRIVATE_S4W ('hybrid-install-'+[guid]::NewGuid().ToString('D'))
$SCRIPT_S4W = Join-Path $WORKSPACE_S4W 'src/install.ps1'
New-Item -ItemType Directory -Path $FIXTURE_S4W | Out-Null
$WORKER_S4W = Join-Path $FIXTURE_S4W 'worker'
$CODEX_S4W = Join-Path $FIXTURE_S4W 'codex'
try {
  & $SCRIPT_S4W -WorkerHome $WORKER_S4W -CodexHome $CODEX_S4W -SkipPrerequisites -SkipModel -SkipWatchdog -EnableHybridMaintenance
  if ($LASTEXITCODE -ne 0) { throw 'Instalação falhou.' }
  $firstS4W=Get-Content -LiteralPath (Join-Path $WORKER_S4W 'config.json') -Raw | ConvertFrom-Json
  if ($firstS4W.maintenance_hybrid_version -ne 1 -or -not $firstS4W.maintenance_id) { throw 'Adoção/identidade ausentes.' }
  foreach($nameS4W in @('delegation-policy.mts','delegation-policy.mjs','server.mjs','worker-core.mjs','worker-runner.mjs')) {
    if ((Get-FileHash -LiteralPath (Join-Path $WORKER_S4W $nameS4W)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $WORKSPACE_S4W ('src/localworker/'+$nameS4W))).Hash) { throw "Artefato divergente: $nameS4W" }
  }
  # Atualização SEM repetir opt-in deve preservar a adoção e escolhas anteriores.
  & $SCRIPT_S4W -WorkerHome $WORKER_S4W -CodexHome $CODEX_S4W -SkipPrerequisites -SkipModel -SkipWatchdog
  if ($LASTEXITCODE -ne 0) { throw 'Reinstalação falhou.' }
  $secondS4W=Get-Content -LiteralPath (Join-Path $WORKER_S4W 'config.json') -Raw | ConvertFrom-Json
  foreach($keyS4W in @('maintenance_hybrid_version','maintenance_id','model','context_tokens','timeout_ms')) {
    if($firstS4W.$keyS4W -ne $secondS4W.$keyS4W) { throw "Configuração não preservada: $keyS4W" }
  }
  Write-Output 'hybrid installer: instalação nova, arquivos equivalentes, adoção/identidade, atualização idempotente e escolhas preservadas OK'
} finally {
  $resolvedS4W=[IO.Path]::GetFullPath($FIXTURE_S4W)
  if ([IO.Path]::GetDirectoryName($resolvedS4W) -ne $PRIVATE_S4W) { throw 'Limpeza fora do alvo recusada.' }
  $itemS4W=Get-Item -LiteralPath $resolvedS4W -Force -ErrorAction SilentlyContinue
  if($itemS4W -and $itemS4W.PSIsContainer -and -not ($itemS4W.Attributes -band [IO.FileAttributes]::ReparsePoint)) { Remove-Item -LiteralPath $resolvedS4W -Recurse -Force }
}
