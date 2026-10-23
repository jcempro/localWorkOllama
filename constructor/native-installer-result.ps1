# Execucao interna: stderr e diagnostico; sucesso exige codigo nativo zero.
function Invoke-NativeInstallerC9R {
  param([Parameter(Mandatory=$true)][string]$Program,[Parameter(Mandatory=$true)][string[]]$ArgumentList,[Parameter(Mandatory=$true)][string]$LogPath)
  if(-not [IO.Path]::IsPathRooted($Program) -or -not(Test-Path -LiteralPath $Program -PathType Leaf)){throw 'NATIVE_EXECUTABLE_MISSING'}
  $savedPreferenceC9R=$ErrorActionPreference
  $savedNativeExitC9R=$global:LASTEXITCODE
  $nativeExitC9R=$null
  try{
    # PS5.1 converte stderr redirecionado em NativeCommandError; nao confundir aviso com exit.
    $ErrorActionPreference='Continue'
    $global:LASTEXITCODE=$null
    & $Program @ArgumentList *> $LogPath
    $nativeExitC9R=$global:LASTEXITCODE
  }finally{$ErrorActionPreference=$savedPreferenceC9R;$global:LASTEXITCODE=$savedNativeExitC9R}
  if($null -eq $nativeExitC9R -or $nativeExitC9R -ne 0){throw ('NATIVE_INSTALLER_EXIT_'+$nativeExitC9R+'_SEE_LOG')}
}
