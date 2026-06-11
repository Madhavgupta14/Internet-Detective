param(
  [Parameter(Mandatory = $true)]
  [string]$ExtensionId
)

$ErrorActionPreference = "Stop"

if ($ExtensionId -notmatch '^[a-p]{32}$') {
  throw "ExtensionId must be the 32-character Chrome extension ID, for example abcdefghijklmnopabcdefghijklmnop."
}

$origins = @(
  "chrome-extension://$ExtensionId",
  "http://localhost:*",
  "http://127.0.0.1:*"
) -join ","

setx OLLAMA_ORIGINS $origins | Out-Null

Write-Host "Configured OLLAMA_ORIGINS for this Windows user:"
Write-Host $origins
Write-Host ""
Write-Host "Restart Ollama completely before using Internet Detective again."
