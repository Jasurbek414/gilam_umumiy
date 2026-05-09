$path = "d:\Jasurbek tegilmasin\gilam\gilam-platforma-main\frontend-app\src\app\company\finance\page.tsx"
$allLines = Get-Content $path
$good = $allLines[0..328] + $allLines[407..($allLines.Count - 1)]
Set-Content -Path $path -Value $good
Write-Host "Done. New line count: $($good.Count)"
