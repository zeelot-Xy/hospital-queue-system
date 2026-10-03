param(
  [ValidateSet("install", "start", "stop", "status", "open", "reset-demo")]
  [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$ComposeFile = Join-Path $ScriptDir "docker-compose.yml"
$EnvFile = Join-Path $ScriptDir ".env"
$CredentialsFile = Join-Path (Split-Path -Parent $ScriptDir) "DEMO-CREDENTIALS.txt"

function Assert-Docker {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  docker info *> $null
  $dockerExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  if ($dockerExitCode -ne 0) { throw "Docker Desktop is not running. Start Docker Desktop, wait for it to be ready, and try again." }
}

function New-RandomSecret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return [Convert]::ToBase64String($buffer).Replace("=", "").Replace("+", "A").Replace("/", "B")
}

function Get-LanAddress {
  $address = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "vEthernet|Loopback" } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
  return $address
}

function Initialize-Environment {
  if (Test-Path -LiteralPath $EnvFile) { return }
  $demoPassword = "Demo!" + (New-RandomSecret 12).Substring(0, 14)
  $dbPassword = New-RandomSecret 28
  $jwtSecret = New-RandomSecret 48
  $lanAddress = Get-LanAddress
  $origins = "http://localhost:8081,http://127.0.0.1:8081"
  if ($lanAddress) { $origins += ",http://${lanAddress}:8081" }
  $content = @(
    "DEMO_MODE=true"
    "DB_NAME=hospital_queue_demo"
    "DB_USER=clinic_demo"
    "DB_PASSWORD=$dbPassword"
    "JWT_SECRET=$jwtSecret"
    "ADMIN_NAME=Evaluation Administrator"
    "ADMIN_EMAIL=admin.demo@clinic.local"
    "ADMIN_PHONE=+2348000000100"
    "ADMIN_PASSWORD=$demoPassword"
    "DEMO_ACCOUNT_PASSWORD=$demoPassword"
    "CLINIC_PORT=8081"
    "CLINIC_TIMEZONE=Africa/Lagos"
    "CLINIC_ORIGINS=$origins"
  )
  $content | Set-Content -LiteralPath $EnvFile -Encoding ascii
  @"
HOSPITAL QUEUE SYSTEM - EVALUATION ACCOUNTS

Open: http://localhost:8081
Administrator: admin.demo@clinic.local
Staff: staff.demo@clinic.local
Doctor: doctor.demo@clinic.local
Patient: patient.demo@clinic.local
Password for every evaluation account: $demoPassword

These accounts contain demonstration data only. Do not enter real patient data.
"@ | Set-Content -LiteralPath $CredentialsFile -Encoding utf8
}

Assert-Docker
Initialize-Environment
$compose = @("compose", "--env-file", $EnvFile, "-f", $ComposeFile)

switch ($Action) {
  "install" {
    docker @compose up -d --build --wait
    docker @compose exec -T backend npm run db:demo
    Start-Process "http://localhost:8081"
    Write-Host "Evaluation system installed. Demo credentials: $CredentialsFile"
  }
  "start" { docker @compose up -d --wait }
  "stop" { docker @compose stop }
  "status" { docker @compose ps }
  "open" {
    docker @compose up -d --wait
    Start-Process "http://localhost:8081"
  }
  "reset-demo" {
    docker @compose up -d --wait
    docker @compose exec -T backend npm run db:demo
    Write-Host "The original demonstration accounts and workflow are ready again."
  }
}
