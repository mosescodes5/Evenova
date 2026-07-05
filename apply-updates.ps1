# apply-updates.ps1
# Extracts evenova-updates.zip directly into your repo, overwriting the
# matching files in place. Preserves folder structure, so it only touches
# the exact files that were updated.
#
# USAGE:
#   1. Put evenova-updates.zip and this script in the same folder as your
#      repo root (the folder containing "backend" and "frontend").
#   2. Right-click apply-updates.ps1 -> Run with PowerShell
#      (or open PowerShell in that folder and run: .\apply-updates.ps1)

$zipPath = Join-Path $PSScriptRoot "evenova-updates.zip"
$destination = $PSScriptRoot

if (-not (Test-Path $zipPath)) {
    Write-Host "Couldn't find evenova-updates.zip next to this script. Make sure both files are in the same folder." -ForegroundColor Red
    exit 1
}

Write-Host "Applying updates into $destination ..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath $destination -Force
Write-Host "Done. Run 'git status' to see exactly what changed before committing." -ForegroundColor Green
