# FT-CONTINUITY-U6C: observes this OS session and an existing visible Desktop only.
# No startup, navigation, queue, recovery, credential access or mutation.
$ErrorActionPreference='Stop'
$bootU6C=(Get-CimInstance -ClassName Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().Ticks.ToString()
$desktopU6C=Get-Process -Name Codex,ChatGPT -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -and $_.Path -like '*\WindowsApps\OpenAI.Codex_*' -and $_.MainWindowHandle -ne 0
} | Sort-Object StartTime | Select-Object -First 1
$instanceU6C=$null
if($desktopU6C){$instanceU6C=([string]$desktopU6C.Id+'-'+$desktopU6C.StartTime.ToUniversalTime().Ticks)}
@{schema=1;bootId=$bootU6C;desktopInstance=$instanceU6C}|ConvertTo-Json -Compress
