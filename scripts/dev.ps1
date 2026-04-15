$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$services = @(
  @{ Name = "backend"; Path = (Join-Path $repoRoot "backend"); Command = "npm.cmd run start" },
  @{ Name = "frontend"; Path = (Join-Path $repoRoot "frontend"); Command = "npm.cmd run dev" }
)

$jobs = @()

try {
  foreach ($service in $services) {
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
    if ($job.State -eq "Running") {
      Stop-Job -Job $job | Out-Null
    }
  }

  foreach ($job in $jobs) {
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
}
