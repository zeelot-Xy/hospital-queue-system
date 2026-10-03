param([string]$Version = "1.0.0")

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$OutputRoot = Join-Path $ProjectRoot "release"
$StageRoot = Join-Path $OutputRoot "stage"

if (Test-Path -LiteralPath $StageRoot) { Remove-Item -LiteralPath $StageRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $StageRoot | Out-Null
$ResolvedStage = [System.IO.Path]::GetFullPath($StageRoot).TrimEnd('\') + '\'

function Assert-WithinStage {
  param([string]$Path)
  $resolved = [System.IO.Path]::GetFullPath($Path)
  if (-not $resolved.StartsWith($ResolvedStage, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a path outside the release staging directory: $resolved"
  }
}

function Copy-Package {
  param([string]$Name, [string]$DeploymentFolder, [string]$ManualBase)
  $target = Join-Path $StageRoot $Name
  Assert-WithinStage $target
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Copy-Item -LiteralPath (Join-Path $ProjectRoot "backend") -Destination $target -Recurse
  Copy-Item -LiteralPath (Join-Path $ProjectRoot "frontend") -Destination $target -Recurse
  $deployTarget = Join-Path $target "deploy"
  New-Item -ItemType Directory -Force -Path $deployTarget | Out-Null
  Copy-Item -LiteralPath (Join-Path $ProjectRoot "deploy\$DeploymentFolder") -Destination $deployTarget -Recurse
  Copy-Item -LiteralPath (Join-Path $ProjectRoot "README.md") -Destination $target
  $generatedDirectories = @(
    Get-ChildItem -LiteralPath $target -Recurse -Directory -Filter node_modules
    Get-ChildItem -LiteralPath $target -Recurse -Directory -Filter dist
    Get-ChildItem -LiteralPath $target -Recurse -Directory -Filter backups
  )
  foreach ($directory in $generatedDirectories | Sort-Object { $_.FullName.Length } -Descending) {
    Assert-WithinStage $directory.FullName
    if (Test-Path -LiteralPath $directory.FullName) {
      Remove-Item -LiteralPath $directory.FullName -Recurse -Force
    }
  }
  foreach ($file in Get-ChildItem -LiteralPath $target -Recurse -File | Where-Object { $_.Name -eq ".env" -or $_.Extension -eq ".log" }) {
    Assert-WithinStage $file.FullName
    Remove-Item -LiteralPath $file.FullName -Force
  }
  $manualDir = Join-Path $ProjectRoot "client-manuals"
  if (Test-Path -LiteralPath $manualDir) {
    $manualTarget = Join-Path $target "client-manuals"
    New-Item -ItemType Directory -Force -Path $manualTarget | Out-Null
    Get-ChildItem -LiteralPath $manualDir -File | Where-Object {
      $_.BaseName -eq $ManualBase -and $_.Extension -in ".docx", ".pdf"
    } |
      Copy-Item -Destination $manualTarget
  }
  return $target
}

$local = Copy-Package "hospital-queue-local-$Version" "local" "Clinic_Computer_and_Local_Network_Manual"
$online = Copy-Package "hospital-queue-online-$Version" "online" "Online_Server_Deployment_Manual"
$evaluation = Copy-Package "hospital-queue-evaluation-$Version" "evaluation" "Client_Evaluation_and_Guided_Tour_Manual"
New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

foreach ($folder in @($local, $online, $evaluation)) {
  $archive = Join-Path $OutputRoot "$((Split-Path -Leaf $folder)).zip"
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
  Compress-Archive -Path (Join-Path $folder "*") -DestinationPath $archive -CompressionLevel Optimal
}

$hashLines = Get-ChildItem -LiteralPath $OutputRoot -Filter "*.zip" | Sort-Object Name | ForEach-Object {
  $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
  "$($hash.Hash) *$($_.Name)"
}
$hashLines | Set-Content -LiteralPath (Join-Path $OutputRoot "SHA256SUMS.txt") -Encoding ascii

if (Test-Path -LiteralPath $StageRoot) {
  $resolvedCleanupTarget = (Resolve-Path -LiteralPath $StageRoot).Path
  $resolvedOutputRoot = [System.IO.Path]::GetFullPath($OutputRoot).TrimEnd('\') + '\'
  if (-not $resolvedCleanupTarget.StartsWith($resolvedOutputRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove staging outside the release directory: $resolvedCleanupTarget"
  }
  Remove-Item -LiteralPath $resolvedCleanupTarget -Recurse -Force
}

Write-Host "Release archives written to $OutputRoot"
