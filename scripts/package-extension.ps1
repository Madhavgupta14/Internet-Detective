param(
  [string]$DistPath = "dist",
  [string]$OutputPath = "release/spectra-extension.zip"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $DistPath)) {
  throw "Build output not found at '$DistPath'. Run npm run build first."
}

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

if (Test-Path -LiteralPath $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

Compress-Archive -Path (Join-Path $DistPath "*") -DestinationPath $OutputPath -Force
Write-Host "Packaged extension: $OutputPath"
