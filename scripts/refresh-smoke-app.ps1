$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$SmokeAppDir = Join-Path $RepoRoot "examples/smoke-app"

Write-Host "[1/4] Building package at repo root..."
Set-Location $RepoRoot
npm run build

Write-Host "[2/4] Uninstalling env-safe-check from smoke app..."
Set-Location $SmokeAppDir
npm uninstall env-safe-check

Write-Host "[3/4] Installing local package into smoke app..."
npm install ../../ --no-package-lock

Write-Host "[4/4] Running smoke app validation..."
npm run validate
