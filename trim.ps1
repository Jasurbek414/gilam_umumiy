$path = "d:\Jasurbek tegilmasin\gilam\gilam-platforma-main\frontend-app\src\app\company\finance\components.tsx"
$lines = Get-Content $path -TotalCount 412
Set-Content -Path $path -Value $lines
Write-Host "Done. Lines: $($lines.Count)"
