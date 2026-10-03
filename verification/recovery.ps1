$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ComposeFile = Join-Path $ProjectRoot "deploy\local\docker-compose.yml"
$EnvFile = Join-Path $ProjectRoot "deploy\local\.env"
$BackupDir = Join-Path $ProjectRoot "deploy\local\backups"
$Stamp = Get-Date -Format "yyyyMMddHHmmss"
$RestoreDatabase = "hospital_queue_restore_test_$Stamp"

$settings = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') { $settings[$matches[1].Trim()] = $matches[2].Trim() }
}
$databaseUser = $settings["DB_USER"]
$databaseName = $settings["DB_NAME"]
if (-not $databaseUser -or -not $databaseName) { throw "DB_USER and DB_NAME are required" }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$backup = Join-Path $BackupDir "recovery-$Stamp.sql"
$compose = @("compose", "--env-file", $EnvFile, "-f", $ComposeFile)

function Invoke-Docker {
  param([string[]]$Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed with exit code $LASTEXITCODE" }
}

try {
  $before = & docker @compose exec -T database psql -U $databaseUser -d $databaseName -Atc "SELECT COUNT(*) FROM users;"
  if ($LASTEXITCODE -ne 0) { throw "Could not read baseline data" }

  $dump = & docker @compose exec -T database pg_dump -U $databaseUser -d $databaseName --no-owner --no-privileges
  if ($LASTEXITCODE -ne 0 -or -not $dump) { throw "Database backup failed" }
  [System.IO.File]::WriteAllLines($backup, [string[]]$dump, [System.Text.UTF8Encoding]::new($false))
  if ((Get-Item -LiteralPath $backup).Length -lt 1024) { throw "Backup file is unexpectedly small" }

  Invoke-Docker (@($compose) + @("exec", "-T", "database", "createdb", "-U", $databaseUser, $RestoreDatabase))
  Get-Content -LiteralPath $backup | & docker @compose exec -T database psql -v ON_ERROR_STOP=1 -U $databaseUser -d $RestoreDatabase | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Database restore failed" }
  $restored = & docker @compose exec -T database psql -U $databaseUser -d $RestoreDatabase -Atc "SELECT COUNT(*) FROM users;"
  if ($LASTEXITCODE -ne 0 -or [int]$restored -ne [int]$before) { throw "Restored user count does not match baseline" }

  Invoke-Docker (@($compose) + @("restart", "database", "backend", "web"))
  Invoke-Docker (@($compose) + @("up", "-d", "--wait"))
  $after = & docker @compose exec -T database psql -U $databaseUser -d $databaseName -Atc "SELECT COUNT(*) FROM users;"
  if ($LASTEXITCODE -ne 0 -or [int]$after -ne [int]$before) { throw "Data did not persist after restart" }

  [pscustomobject]@{
    status = "passed"
    backup_bytes = (Get-Item -LiteralPath $backup).Length
    restored_database = "temporary database (removed)"
    users_before = [int]$before
    users_after_restart = [int]$after
    persistence = "verified"
  } | ConvertTo-Json
} finally {
  & docker @compose exec -T database dropdb -U $databaseUser --if-exists $RestoreDatabase 2>$null | Out-Null
  if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
}
