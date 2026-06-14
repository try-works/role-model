# Resume run 43 Phase 5 after pause — Q10 + artifact prep
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3456"
$log = "D:\DEV\role-model\.recursive\run\43-benchmark-routing-display\evidence\logs\phase5-accelerated-qa.log"
$h = @{ Authorization = "Bearer role-model-local"; "Content-Type" = "application/json" }
$ep1 = "deepseek.litellm.global.deepseek-deepseek-v4-pro"
$ep2 = "deepseek.litellm.global.deepseek-deepseek-v4-flash"
$quickBody = @{ mode = "quick"; endpointIds = @($ep1, $ep2); judgeEndpointId = $ep1 } | ConvertTo-Json -Compress

function Log([string]$msg) {
  $line = "[$(Get-Date -Format o)] RESUME $msg"
  Write-Host $line
  Add-Content -Path $log -Value $line
}

function Wait-Run([string]$runId, [int]$maxMinutes = 15) {
  for ($i = 0; $i -lt ($maxMinutes * 6); $i++) {
    Start-Sleep -Seconds 10
    $p = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs/$runId" -Headers @{ Authorization = "Bearer role-model-local" }
    if ($p.status -eq "completed" -or $p.status -eq "failed") { return $p }
    if ($i % 6 -eq 0) { Log "poll $runId $($p.completedSteps)/$($p.totalSteps)" }
  }
  throw "timeout waiting for $runId"
}

Log "=== resume after operator pause ==="
Log "SEA SHA256=4dc26f1c9989e972373dd2c7e26bd30c77b9871eee06750b0c34a89ce5cb214c"

# Q10 — quick re-run after global clear (Q9 completed before pause)
$q10Start = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Method POST -Headers $h -Body $quickBody
Log "Q10 re-run runId=$($q10Start.runId)"
$q10Done = Wait-Run $q10Start.runId
Log "Q10 status=$($q10Done.status) steps=$($q10Done.completedSteps)/$($q10Done.totalSteps)"
$after10 = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summaries/by-mode" -Headers @{ Authorization = "Bearer role-model-local" }
Log "Q10 quick panel runId=$($after10.quick.runId) full panel=$($after10.full.runId)"

# Q11 spot-check
$ds = (Invoke-RestMethod -Uri "$base/api/role-model/providers" -Headers @{ Authorization = "Bearer role-model-local" }) | Where-Object { $_.providerId -eq "deepseek" } | Select-Object -First 1
Log "Q11 deepseek.providerKind=$($ds.providerKind)"

Log "DONE resume — next: write and lock 05-manual-qa.md"
