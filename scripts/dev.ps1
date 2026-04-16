$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$services = @(
  @{
    Name = "backend"
    Path = (Join-Path $repoRoot "backend")
    Command = "npm.cmd run dev"
    Port = 5000
  },
  @{
    Name = "frontend"
    Path = (Join-Path $repoRoot "frontend")
    Command = "npm.cmd run dev"
    Port = 3000
  }
)

$jobs = @()

function Test-PortInUse {
  param([int]$Port)

  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(500)

    if ($connected -and $client.Connected) {
      $client.EndConnect($async)
      return $true
    }

    return $false
  } catch {
    return $false
  } finally {
    if ($client) {
      $client.Dispose()
    }
  }
}

function Get-ListeningPid {
  param([int]$Port)

  $match = netstat -ano -p tcp | Select-String "LISTENING\s+(\d+)$" | Where-Object {
    $_.Line -match "[:\.]$Port\s+"
  } | Select-Object -First 1

  if (-not $match) {
    return $null
  }

  if ($match.Matches.Count -gt 0) {
    return [int]$match.Matches[0].Groups[1].Value
  }

  return $null
}

function StopListener {
  param($Service)

  $listenerPid = Get-ListeningPid -Port $Service.Port
  if (-not $listenerPid) {
    return $false
  }

  Write-Host "[$($Service.Name)] Port $($Service.Port) is occupied by stale PID $listenerPid. Stopping it before restart."
  taskkill /PID $listenerPid /T /F | Out-Null
  Start-Sleep -Seconds 1
  return -not (Test-PortInUse -Port $Service.Port)
}

try {
  foreach ($service in $services) {
    if (Test-PortInUse -Port $service.Port) {
      if (-not (StopListener -Service $service)) {
        throw "Port $($service.Port) is already in use by another process and could not be cleared automatically. Stop that process or change the configured port before running npm run dev."
      }
    }

    $job = Start-Job -Name $service.Name -ArgumentList $service.Path, $service.Command -ScriptBlock {
      param($workingDirectory, $command)
      Set-Location $workingDirectory
      Invoke-Expression "$command 2>&1"
    }

    $jobs += $job
  }

  while ($true) {
    foreach ($job in $jobs) {
      Receive-Job -Job $job | ForEach-Object {
        Write-Host "[$($job.Name)] $_"
      }

      if ($job.State -in @("Failed", "Stopped")) {
        throw "$($job.Name) exited with state $($job.State)"
      }

      if ($job.State -eq "Completed") {
        throw "$($job.Name) exited unexpectedly"
      }
    }

    Start-Sleep -Milliseconds 500
  }
} finally {
  foreach ($job in $jobs) {
    if ($job -and $job.State -eq "Running") {
      Stop-Job -Job $job | Out-Null
    }
  }

  foreach ($job in $jobs) {
    if ($job) {
      Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
  }
}
