$ErrorActionPreference = 'Stop'

$configPath = Join-Path $env:USERPROFILE '.codex\config.toml'
$configLine = Get-Content $configPath | Where-Object { $_ -match '^http_headers' } | Select-Object -First 1
$keyMatch = [regex]::Match($configLine, 'X-Goog-Api-Key"\s*=\s*"([^"]+)"')

if (-not $keyMatch.Success) {
  throw 'No se encontró X-Goog-Api-Key en ~/.codex/config.toml.'
}

$codex = Get-ChildItem (Join-Path $env:USERPROFILE '.vscode\extensions') -Filter codex.exe -Recurse -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $codex) {
  throw 'No se encontró codex.exe en las extensiones de VS Code.'
}

$key = $keyMatch.Groups[1].Value
& $codex '-c' "mcp_servers.stitch.http_headers={ X-Goog-Api-Key = '$key' }" @args
