$ErrorActionPreference='Stop'
$sourceI6W=Join-Path (Split-Path -Parent $PSScriptRoot) 'supervisor/install.ps1'
$tokensI6W=$null;$errorsI6W=$null
$astI6W=[Management.Automation.Language.Parser]::ParseFile($sourceI6W,[ref]$tokensI6W,[ref]$errorsI6W)
if($errorsI6W.Count){throw 'INSTALLER_SYNTAX_INVALID'}
$functionI6W=$astI6W.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Enter-InstallationMutexI6W'},$true)
if(-not $functionI6W){throw 'MUTEX_FUNCTION_MISSING'}
# Importa somente a funcao real; nao executa instalador, configuracoes ou runtime.
. ([scriptblock]::Create($functionI6W.Extent.Text))
$suffixI6W=[guid]::NewGuid().ToString('N')
$mutexNameI6W='Local\CodexInstallTestI6W-'+$suffixI6W
$readyNameI6W='Local\CodexInstallReadyI6W-'+$suffixI6W
$mutexI6W=New-Object Threading.Mutex($false,$mutexNameI6W)
$readyI6W=New-Object Threading.EventWaitHandle($false,[Threading.EventResetMode]::ManualReset,$readyNameI6W)
$ownsI6W=$false;$holderI6W=$null
$holderCodeI6W=@'
$ErrorActionPreference='Stop'
$m=New-Object Threading.Mutex($false,'MUTEX_NAME_I6W')
$e=[Threading.EventWaitHandle]::OpenExisting('READY_NAME_I6W')
$owns=$false
try {
 $owns=$m.WaitOne(10000)
 if(-not $owns){throw 'HOLDER_CANNOT_ACQUIRE'}
 [void]$e.Set()
 Start-Sleep -Milliseconds 3200
}finally{if($owns){$m.ReleaseMutex()};$m.Dispose();$e.Dispose()}
'@
$holderCodeI6W=$holderCodeI6W.Replace('MUTEX_NAME_I6W',$mutexNameI6W).Replace('READY_NAME_I6W',$readyNameI6W)
$encodedI6W=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($holderCodeI6W))
try {
 $powershellI6W=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
 $holderI6W=Start-Process -FilePath $powershellI6W -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand',$encodedI6W) -WindowStyle Hidden -PassThru
 if(-not $readyI6W.WaitOne(10000)){throw 'HOLDER_NOT_READY'}
 $ownsI6W=Enter-InstallationMutexI6W -Mutex $mutexI6W
 if($ownsI6W){throw 'IMMEDIATE_MODE_DID_NOT_REFUSE_BUSY_MUTEX'}
 $clockI6W=[Diagnostics.Stopwatch]::StartNew()
 $ownsI6W=Enter-InstallationMutexI6W -Mutex $mutexI6W -WaitForIdle -IdleWaitSeconds 1
 $clockI6W.Stop()
 if($ownsI6W -or $clockI6W.ElapsedMilliseconds -lt 500){throw 'FINITE_WAIT_DID_NOT_REFUSE_BUSY_MUTEX'}
 $ownsI6W=Enter-InstallationMutexI6W -Mutex $mutexI6W -WaitForIdle -IdleWaitSeconds 10
 if(-not $ownsI6W){throw 'WAIT_DID_NOT_ACQUIRE_AFTER_RELEASE'}
 $mutexI6W.ReleaseMutex();$ownsI6W=$false
 $ownsI6W=Enter-InstallationMutexI6W -Mutex $mutexI6W
 if(-not $ownsI6W){throw 'MUTEX_NOT_REUSABLE'}
 if(-not $holderI6W.WaitForExit(10000)){throw 'HOLDER_NOT_EXITED'}
 if($holderI6W.ExitCode -ne 0){throw 'HOLDER_FAILED'}
 Write-Output 'I6W_MUTEX_REAL_PROCESSES_IMMEDIATE_TIMEOUT_RELEASE_REACQUIRE_OK'
}finally{
 if($ownsI6W){$mutexI6W.ReleaseMutex()}
 $mutexI6W.Dispose();$readyI6W.Dispose()
 if($holderI6W -and -not $holderI6W.HasExited){[void]$holderI6W.WaitForExit(10000)}
}
