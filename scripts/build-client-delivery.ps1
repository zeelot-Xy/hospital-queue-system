param(
  [string]$Version = "1.0.0",
  [switch]$SkipReleaseBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReleaseRoot = Join-Path $ProjectRoot "release"
$DeliveryName = "client-delivery-$Version"
$DeliveryRoot = Join-Path $ReleaseRoot $DeliveryName
$MasterArchive = Join-Path $ReleaseRoot "Hospital_Queue_System_Client_Delivery_$Version.zip"
$MasterChecksum = Join-Path $ReleaseRoot "CLIENT_DELIVERY_SHA256.txt"
$ResolvedReleaseRoot = [System.IO.Path]::GetFullPath($ReleaseRoot).TrimEnd('\') + '\'

function Assert-WithinRelease {
  param([string]$Path)
  $resolved = [System.IO.Path]::GetFullPath($Path)
  if (-not $resolved.StartsWith($ResolvedReleaseRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a path outside the release directory: $resolved"
  }
}

if (-not $SkipReleaseBuild) {
  & (Join-Path $PSScriptRoot "build-release.ps1") -Version $Version
}

Assert-WithinRelease $DeliveryRoot
if (Test-Path -LiteralPath $DeliveryRoot) {
  Remove-Item -LiteralPath $DeliveryRoot -Recurse -Force
}

$localDir = Join-Path $DeliveryRoot "01-Clinic-LAN"
$onlineDir = Join-Path $DeliveryRoot "02-Online-Server"
$evaluationDir = Join-Path $DeliveryRoot "00-Explore-Evaluation"
$acceptanceDir = Join-Path $DeliveryRoot "Acceptance"
New-Item -ItemType Directory -Force -Path $localDir, $onlineDir, $evaluationDir, $acceptanceDir | Out-Null

Copy-Item -LiteralPath (Join-Path $ReleaseRoot "hospital-queue-evaluation-$Version.zip") -Destination $evaluationDir
Copy-Item -LiteralPath (Join-Path $ProjectRoot "client-manuals\Client_Evaluation_and_Guided_Tour_Manual.docx") -Destination $evaluationDir
Copy-Item -LiteralPath (Join-Path $ProjectRoot "client-manuals\Client_Evaluation_and_Guided_Tour_Manual.pdf") -Destination $evaluationDir

Copy-Item -LiteralPath (Join-Path $ReleaseRoot "hospital-queue-local-$Version.zip") -Destination $localDir
Copy-Item -LiteralPath (Join-Path $ProjectRoot "client-manuals\Clinic_Computer_and_Local_Network_Manual.docx") -Destination $localDir
Copy-Item -LiteralPath (Join-Path $ProjectRoot "client-manuals\Clinic_Computer_and_Local_Network_Manual.pdf") -Destination $localDir

Copy-Item -LiteralPath (Join-Path $ReleaseRoot "hospital-queue-online-$Version.zip") -Destination $onlineDir
Copy-Item -LiteralPath (Join-Path $ProjectRoot "client-manuals\Online_Server_Deployment_Manual.docx") -Destination $onlineDir
Copy-Item -LiteralPath (Join-Path $ProjectRoot "client-manuals\Online_Server_Deployment_Manual.pdf") -Destination $onlineDir

Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs\CLIENT_DELIVERY_START_HERE.md") -Destination (Join-Path $DeliveryRoot "START_HERE.md")
Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs\RELEASE_READINESS.md") -Destination (Join-Path $acceptanceDir "RELEASE_READINESS.md")
Copy-Item -LiteralPath (Join-Path $ProjectRoot "evidence\release-verification\2026-08-11_062512\SUMMARY.md") -Destination (Join-Path $acceptanceDir "SOFTWARE_ACCEPTANCE_SUMMARY.md")
Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs\EVALUATION_ACCEPTANCE_SUMMARY.md") -Destination $acceptanceDir

$checksumFile = Join-Path $DeliveryRoot "SHA256SUMS.txt"
$checksumLines = Get-ChildItem -LiteralPath $DeliveryRoot -Recurse -File |
  Where-Object { $_.FullName -ne $checksumFile } |
  Sort-Object FullName |
  ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
    $relative = $_.FullName.Substring($DeliveryRoot.Length).TrimStart('\').Replace('\', '/')
    "$($hash.Hash.ToLowerInvariant())  $relative"
  }
$checksumLines | Set-Content -LiteralPath $checksumFile -Encoding ascii

Assert-WithinRelease $MasterArchive
if (Test-Path -LiteralPath $MasterArchive) {
  Remove-Item -LiteralPath $MasterArchive -Force
}
Compress-Archive -Path (Join-Path $DeliveryRoot "*") -DestinationPath $MasterArchive -CompressionLevel Optimal

$masterHash = Get-FileHash -LiteralPath $MasterArchive -Algorithm SHA256
"$($masterHash.Hash.ToLowerInvariant())  $([System.IO.Path]::GetFileName($MasterArchive))" |
  Set-Content -LiteralPath $MasterChecksum -Encoding ascii

Write-Host "Client delivery folder: $DeliveryRoot"
Write-Host "Master delivery archive: $MasterArchive"
Write-Host "Master archive checksum: $MasterChecksum"
