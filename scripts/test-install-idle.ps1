$ErrorActionPreference = 'Stop'
$sourceI8N = Join-Path (Split-Path -Parent $PSScriptRoot) 'src\install.ps1'
$tokensI8N = $null; $errorsI8N = $null
$astI8N = [Management.Automation.Language.Parser]::ParseFile($sourceI8N, [ref]$tokensI8N, [ref]$errorsI8N)
if ($errorsI8N.Count) { throw 'Sintaxe inválida do instalador' }
$functionI8N = $astI8N.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Wait-WorkerIdleA3C'}, $true)
. ([scriptblock]::Create($functionI8N.Extent.Text))
$idI8N = [guid]::NewGuid().ToString('D')
$rootI8N = Join-Path ([IO.Path]::GetTempPath()) ('worker-idle-test-' + $idI8N)
$dirI8N = Join-Path $rootI8N ('jobs\' + $idI8N)
$null = New-Item -ItemType Directory -Path $dirI8N -Force
$stateI8N = Join-Path $dirI8N 'state.json'
try {
  @{job_id=$idI8N} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $rootI8N 'active.json')
  @{job_id=$idI8N;status='RUNNING'} | ConvertTo-Json | Set-Content -LiteralPath $stateI8N
  $jobI8N = Start-Job -ScriptBlock {param($file,$id) Start-Sleep -Seconds 2; @{job_id=$id;status='COMPLETED'} | ConvertTo-Json | Set-Content -LiteralPath $file} -ArgumentList $stateI8N,$idI8N
  $timerI8N = [Diagnostics.Stopwatch]::StartNew()
  Wait-WorkerIdleA3C $rootI8N
  if ($timerI8N.Elapsed.TotalSeconds -lt 1) { throw 'Espera liberada antes do término' }
  $null = Wait-Job $jobI8N
  Receive-Job $jobI8N -ErrorAction Stop
  Remove-Job $jobI8N
  if ((Get-Content -LiteralPath $stateI8N -Raw | ConvertFrom-Json).status -ne 'COMPLETED') { throw 'Estado indevidamente modificado' }
  Write-Output 'Instalador: evento terminal libera espera sem cancelar job.'
} finally {
  $resolvedI8N = [IO.Path]::GetFullPath($rootI8N)
  if ((Split-Path -Parent $resolvedI8N) -ne [IO.Path]::GetTempPath().TrimEnd('\')) { throw 'Limpeza fora do diretório temporário recusada' }
  Remove-Item -LiteralPath $resolvedI8N -Recurse -Force
}
