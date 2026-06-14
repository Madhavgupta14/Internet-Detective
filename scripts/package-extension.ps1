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

# Stage a copy so we can strip the dev-only "key" field (the Chrome Web Store
# rejects it) without touching dist/, which keeps a stable ID for local dev.
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("spectra-pkg-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stage | Out-Null
try {
  Copy-Item -Path (Join-Path $DistPath "*") -Destination $stage -Recurse -Force

  $manifestPath = Join-Path $stage "manifest.json"
  $content = Get-Content -LiteralPath $manifestPath -Raw
  # Remove the   "key": "....",   line (store-disallowed). Single base64 line.
  $content = [regex]::Replace($content, '(?m)^\s*"key"\s*:\s*"[^"]*",\s*\r?\n', '')
  # Write UTF-8 without BOM so the store/Chrome parse it cleanly.
  [System.IO.File]::WriteAllText($manifestPath, $content, (New-Object System.Text.UTF8Encoding($false)))

  if ($content -match '"key"') {
    throw "Failed to strip 'key' from manifest; aborting to avoid a bad upload."
  }

  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $OutputPath -Force
}
finally {
  Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Packaged extension (store-ready, no 'key'): $OutputPath"
