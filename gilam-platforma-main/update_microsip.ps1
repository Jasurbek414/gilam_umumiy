$path = "$env:APPDATA\MicroSIP\MicroSIP.ini"
$content = Get-Content $path
$content = $content -replace 'audioRingDevice=""', 'audioRingDevice="Realtek High Definition Audio"'
$content = $content -replace 'audioOutputDevice=""', 'audioOutputDevice="Realtek High Definition Audio"'
$content = $content -replace 'audioInputDevice=""', 'audioInputDevice="Intelr Smart Sound Technology for Digital Microphones"'
Set-Content -Path $path -Value $content -Encoding Unicode
Write-Host "MicroSIP config updated successfully."
