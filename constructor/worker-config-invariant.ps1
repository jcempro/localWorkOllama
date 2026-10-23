function Assert-WorkerConfigC9R {
  param([string]$Before,[string]$After,[string]$ResolvedCodex)
  $beforeC9R=$Before|ConvertFrom-Json
  $afterC9R=$After|ConvertFrom-Json
  $beforeKeysC9R=@($beforeC9R.PSObject.Properties.Name|Sort-Object)
  $afterKeysC9R=@($afterC9R.PSObject.Properties.Name|Sort-Object)
  if(($beforeKeysC9R -join "`n") -cne ($afterKeysC9R -join "`n")){throw 'WORKER_CONFIG_KEYS_CHANGED'}
  foreach($keyC9R in $beforeKeysC9R){
    if($keyC9R -eq 'codex_command'){continue}
    $oldC9R=ConvertTo-Json -InputObject $beforeC9R.$keyC9R -Depth 100 -Compress
    $newC9R=ConvertTo-Json -InputObject $afterC9R.$keyC9R -Depth 100 -Compress
    if($oldC9R -cne $newC9R){throw ('WORKER_SETTING_CHANGED:'+ $keyC9R)}
  }
  if(-not [IO.Path]::IsPathRooted($ResolvedCodex) -or -not(Test-Path -LiteralPath $ResolvedCodex -PathType Leaf)){throw 'RESOLVED_CODEX_NOT_FOUND'}
  if(-not [IO.Path]::IsPathRooted([string]$afterC9R.codex_command) -or [IO.Path]::GetFullPath($afterC9R.codex_command) -ine [IO.Path]::GetFullPath($ResolvedCodex)){throw 'WORKER_CODEX_DIFFERS_FROM_RESOLVER'}
  [pscustomobject]@{settings_preserved=$true;codex_command_refreshed=($beforeC9R.codex_command -cne $afterC9R.codex_command)}
}
