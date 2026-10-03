param(
  [ValidateSet("install", "start", "stop", "status", "open", "backup", "restore", "update")]
  [string]$Action = "status",
  [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"
$PackageDir = Split-Path -Parent $PSScriptRoot
$ComposeFile = Join-Path $PSScriptRoot "docker-compose.yml"
$EnvFile = Join-Path $PSScriptRoot ".env"

function Assert-Docker {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  docker info *> $null
  $dockerExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  if ($dockerExitCode -ne 0) { throw "Docker Desktop is not running. Start it and try again." }
}

function Assert-Environment {
  if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw "Clinic settings have not been created. Run INSTALL-CLINIC.cmd first."
  }
  $unsafe = Select-String -LiteralPath $EnvFile -Pattern "CHANGE_TO" -Quiet
  if ($unsafe) { throw "Replace every CHANGE_TO value in $EnvFile before starting the clinic system." }
}

function New-RandomSecret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return [Convert]::ToBase64String($buffer).Replace("=", "").Replace("+", "A").Replace("/", "B")
}

function Get-LanAddress {
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "vEthernet|Loopback" } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
}

function Initialize-ClinicEnvironment {
  if (Test-Path -LiteralPath $EnvFile) { return }
  Write-Host "Clinic setup - the database and security secrets will be generated automatically."
  $adminName = Read-Host "Administrator full name"
  $adminEmail = Read-Host "Administrator email"
  $adminPhone = Read-Host "Administrator phone"
  $securePassword = Read-Host "Administrator password (at least 10 characters)" -AsSecureString
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try { $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  if (-not $adminName -or -not $adminEmail -or -not $adminPhone -or $adminPassword -notmatch '^[A-Za-z0-9!@%_.-]{10,}$') {
    throw "Name, email, phone, and a password of at least 10 characters using letters, numbers, and ! @ % _ . - are required."
  }
  $lanAddress = Get-LanAddress
  $origins = "http://localhost:8080,http://127.0.0.1:8080"
  if ($lanAddress) { $origins += ",http://${lanAddress}:8080" }
  @(
    "DB_NAME=hospital_queue"
    "DB_USER=clinic_app"
    "DB_PASSWORD=$(New-RandomSecret 28)"
    "JWT_SECRET=$(New-RandomSecret 48)"
    "ADMIN_NAME=$adminName"
    "ADMIN_EMAIL=$($adminEmail.Trim().ToLowerInvariant())"
    "ADMIN_PHONE=$adminPhone"
    "ADMIN_PASSWORD=$adminPassword"
    "CLINIC_PORT=8080"
    "CLINIC_TIMEZONE=Africa/Lagos"
    "CLINIC_ORIGINS=$origins"
  ) | Set-Content -LiteralPath $EnvFile -Encoding utf8
  Write-Host "Private settings created. Keep $EnvFile and its passwords private."
  if ($lanAddress) { Write-Host "Other clinic devices can use http://${lanAddress}:8080 after Windows Firewall permits port 8080." }
}

Assert-Docker
if ($Action -eq "install") { Initialize-ClinicEnvironment }
Assert-Environment
$compose = @("compose", "--env-file", $EnvFile, "-f", $ComposeFile)

switch ($Action) {
  "install" { docker @compose up -d --build --wait }
  "start"   { docker @compose up -d --wait }
  "open"    {
    docker @compose up -d --wait
    $portLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^CLINIC_PORT=' } | Select-Object -First 1
    $clinicPort = if ($portLine) { ($portLine -split '=', 2)[1].Trim() } else { "8080" }
    Start-Process "http://localhost:$clinicPort"
  }
  "stop"    { docker @compose stop }
  "status"  { docker @compose ps }
  "update"  { docker @compose up -d --build --wait }
  "backup" {
    $backupDir = Join-Path $PSScriptRoot "backups"
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $target = Join-Path $backupDir "hospital-queue-$stamp.sql"
    $envMap = @{}
    Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match "^[^#=]+=" } | ForEach-Object {
      $key, $value = $_ -split "=", 2; $envMap[$key.Trim()] = $value.Trim()
    }
    docker @compose exec -T database pg_dump -U $envMap.DB_USER -d $envMap.DB_NAME | Set-Content -LiteralPath $target -Encoding utf8
    Write-Host "Backup saved to $target"
  }
  "restore" {
    if (-not $BackupFile -or -not (Test-Path -LiteralPath $BackupFile)) { throw "Provide an existing SQL backup with -BackupFile." }
    $resolved = (Resolve-Path -LiteralPath $BackupFile).Path
    $envMap = @{}
    Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match "^[^#=]+=" } | ForEach-Object {
      $key, $value = $_ -split "=", 2; $envMap[$key.Trim()] = $value.Trim()
    }
    Get-Content -Raw -LiteralPath $resolved | docker @compose exec -T database psql -U $envMap.DB_USER -d $envMap.DB_NAME
    Write-Host "Restore completed from $resolved"
  }
}
