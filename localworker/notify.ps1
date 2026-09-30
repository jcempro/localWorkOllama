param(
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$Body,
  [ValidateSet('info','error')][string]$Kind = 'info'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$icon = [System.Windows.Forms.NotifyIcon]::new()
try {
  $icon.Icon = if ($Kind -eq 'error') { [System.Drawing.SystemIcons]::Error } else { [System.Drawing.SystemIcons]::Information }
  $icon.Visible = $true
  $icon.BalloonTipTitle = $Title
  $icon.BalloonTipText = $Body
  $icon.BalloonTipIcon = if ($Kind -eq 'error') { [System.Windows.Forms.ToolTipIcon]::Error } else { [System.Windows.Forms.ToolTipIcon]::Info }
  $icon.ShowBalloonTip(5000)
  Start-Sleep -Seconds 6
} finally { $icon.Dispose() }
