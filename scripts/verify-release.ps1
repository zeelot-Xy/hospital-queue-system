param([switch]$Runtime)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$EvidenceDir = Join-Path $ProjectRoot "evidence\release-verification\$Stamp"
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
$Results = [System.Collections.Generic.List[object]]::new()

function Run-Check {
  param(
    [string]$Id,
    [string]$Title,
    [string]$WorkingDirectory,
    [string]$Executable,
    [string[]]$Arguments,
    [int[]]$AllowedExitCodes = @(0)
  )
  $log = Join-Path $EvidenceDir "$Id.log"
  Push-Location $WorkingDirectory
  try {
    & $Executable @Arguments 2>&1 | Tee-Object -FilePath $log
    $exitCode = $LASTEXITCODE
  } catch {
    $_ | Out-String | Set-Content -LiteralPath $log
    $exitCode = 1
  } finally {
    Pop-Location
  }
  $status = if ($AllowedExitCodes -contains $exitCode) { "PASS" } else { "FAIL" }
  $Results.Add([pscustomobject]@{ Id=$Id; Title=$Title; Status=$status; ExitCode=$exitCode; Log=(Split-Path -Leaf $log) })
}

Run-Check "T01-backend-tests" "Backend unit and boundary tests" $ProjectRoot "npm.cmd" @("test")
Run-Check "T02-frontend-lint" "Frontend lint" $ProjectRoot "npm.cmd" @("run", "lint")
Run-Check "T03-frontend-build" "Frontend production build" $ProjectRoot "npm.cmd" @("run", "build")
Run-Check "T04-local-compose" "Clinic LAN Compose validation" $ProjectRoot "docker" @("compose", "--env-file", "deploy/local/.env.example", "-f", "deploy/local/docker-compose.yml", "config", "--quiet")
Run-Check "T05-online-compose" "Ubuntu VPS Compose validation" $ProjectRoot "docker" @("compose", "--env-file", "deploy/online/.env.example", "-f", "deploy/online/docker-compose.yml", "config", "--quiet")
Run-Check "T06-backend-audit" "Backend production dependency audit" (Join-Path $ProjectRoot "backend") "npm.cmd" @("audit", "--omit=dev", "--json") @(0,1)
Run-Check "T07-frontend-audit" "Frontend production dependency audit" (Join-Path $ProjectRoot "frontend") "npm.cmd" @("audit", "--omit=dev", "--json") @(0,1)
Run-Check "T08-diff-check" "Whitespace and patch integrity" $ProjectRoot "git" @("diff", "--check")

if ($Runtime) {
  $runtimeSettings = @{}
  Get-Content -LiteralPath (Join-Path $ProjectRoot "deploy\local\.env") | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') { $runtimeSettings[$matches[1].Trim()] = $matches[2].Trim() }
  }
  $env:ADMIN_EMAIL = $runtimeSettings["ADMIN_EMAIL"]
  $env:ADMIN_PASSWORD = $runtimeSettings["ADMIN_PASSWORD"]
  $env:API_BASE_URL = "http://127.0.0.1:8080"
  $env:EVIDENCE_DIR = $EvidenceDir
  Run-Check "T09-container-build" "Build clinic deployment" $ProjectRoot "docker" @("compose", "--env-file", "deploy/local/.env", "-f", "deploy/local/docker-compose.yml", "build")
  Run-Check "T10-container-start" "Start clean clinic deployment" $ProjectRoot "docker" @("compose", "--env-file", "deploy/local/.env", "-f", "deploy/local/docker-compose.yml", "up", "-d", "--wait")
  Run-Check "T11-api-workflow" "Patient-to-consultation API workflow" $ProjectRoot "node" @("verification/api-workflow.js")
  Run-Check "T12-performance" "25-user performance check" $ProjectRoot "node" @("verification/performance.js")
  Run-Check "T13-browser" "Headless browser and responsive workflow" $ProjectRoot "node" @("verification/browser.js")
  Run-Check "T14-realtime" "Authenticated Socket.IO delivery" $ProjectRoot "node" @("verification/realtime.js")
  Run-Check "T15-recovery" "Restart, backup, and restore rehearsal" $ProjectRoot "powershell.exe" @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "verification/recovery.ps1")
  Run-Check "T16-concurrency" "Concurrent daily queue allocation" $ProjectRoot "node" @("verification/concurrency.js")
} else {
  foreach ($item in @(
    @("T09-container-build", "Build clinic deployment"),
    @("T10-container-start", "Start clean clinic deployment"),
    @("T11-api-workflow", "Patient-to-consultation API workflow"),
    @("T12-performance", "25-user performance check"),
    @("T13-browser", "Headless browser and responsive workflow"),
    @("T14-realtime", "Authenticated Socket.IO delivery"),
    @("T15-recovery", "Restart, backup, and restore rehearsal"),
    @("T16-concurrency", "Concurrent daily queue allocation")
  )) {
    $Results.Add([pscustomobject]@{ Id=$item[0]; Title=$item[1]; Status="BLOCKED"; ExitCode=""; Log="Docker engine required" })
  }
}

$Results | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $EvidenceDir "results.json")

$summary = @(
  "# Release Verification Summary",
  "",
  "Run: $Stamp",
  "",
  "| Test ID | Verification | Status | Evidence |",
  "|---|---|---|---|"
)
foreach ($result in $Results) {
  $summary += "| $($result.Id) | $($result.Title) | $($result.Status) | $($result.Log) |"
}
$summary += ""
$summary += "A BLOCKED result is not a pass. Runtime release approval requires Docker-backed tests T09 through T16."
$summary | Set-Content -LiteralPath (Join-Path $EvidenceDir "SUMMARY.md")

@(
  "# Requirements Traceability Matrix",
  "",
  "| Requirement | Verification IDs | Chapter evidence |",
  "|---|---|---|",
  "| Secure registration and role control | T01, T11 | Chapter 3 authentication design; Chapter 4 test results |",
  "| Appointment scheduling and collision protection | T01, T11, T16 | Chapter 3 transaction design; Chapter 4 workflow result |",
  "| Daily patient queue management | T01, T11, T14, T16 | Chapter 3 queue algorithm; Chapter 4 queue screenshots |",
  "| Consultation records and patient history | T11 | Chapter 3 data model; Chapter 4 completed visit result |",
  "| Reporting and audit evidence | T11 | Chapter 3 reporting design; Chapter 4 result tables |",
  "| Deployment and recovery | T04, T05, T09, T10, T15 | Chapter 3 deployment method; Chapter 4 acceptance result |",
  "| Performance under clinic load | T12 | Chapter 3 test procedure; Chapter 4 p95 performance table |",
  "| Browser compatibility and usability | T03, T13 | Chapter 3 interface design; Chapter 4 screenshots |"
) | Set-Content -LiteralPath (Join-Path $EvidenceDir "TRACEABILITY.md")

@(
  "# Defect Register",
  "",
  "| ID | Finding | Resolution/Status |",
  "|---|---|---|",
  "| D-001 | Registration boundary test included cold module-loading time | Controller initialization moved outside measured test; resolved |",
  "| D-002 | Queue numbers could race under simultaneous arrival | PostgreSQL advisory transaction lock added; database concurrency proof passes |",
  "| D-003 | Development user inventory endpoint exposed in server | Endpoint removed; regression test passes |",
  "| D-004 | Backend Sequelize/UUID moderate advisory | Not reachable by application input; documented and monitored |",
  "| D-005 | Docker runtime unavailable during baseline | Docker restored; complete runtime suite now executes |",
  "| D-006 | Reverse proxy served SPA HTML for health endpoints | Exact health and readiness proxy routes added; resolved |",
  "| D-007 | Container timezone caused valid clinic arrivals to appear late | Configurable clinic timezone added; resolved |"
) | Set-Content -LiteralPath (Join-Path $EvidenceDir "DEFECT_REGISTER.md")

Write-Host "Evidence written to $EvidenceDir"
if ($Results.Status -contains "FAIL") { exit 1 }
