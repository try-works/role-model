# Run 43 accelerated Phase 5 QA (subset full-mode smoke + complete quick)
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3456"
$logDir = "D:\DEV\role-model\.recursive\run\43-benchmark-routing-display\evidence\logs"
$log = Join-Path $logDir "phase5-accelerated-qa.log"
$h = @{ Authorization = "Bearer role-model-local"; "Content-Type" = "application/json" }
$ep1 = "deepseek.litellm.global.deepseek-deepseek-v4-pro"
$ep2 = "deepseek.litellm.global.deepseek-deepseek-v4-flash"
$smokeCases = @("e01-yes-no", "p06-medium-explain", "p17-tools-multi-hard")

function Log([string]$msg) {
  $line = "[$(Get-Date -Format o)] $msg"
  Write-Host $line
  Add-Content -Path $log -Value $line
}

function Wait-Run([string]$runId, [int]$maxMinutes = 20) {
  for ($i = 0; $i -lt ($maxMinutes * 6); $i++) {
    Start-Sleep -Seconds 10
    $p = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs/$runId" -Headers @{ Authorization = "Bearer role-model-local" }
    if ($p.status -eq "completed" -or $p.status -eq "failed") { return $p }
    if ($i % 6 -eq 0) { Log "poll $runId $($p.completedSteps)/$($p.totalSteps) $($p.status)" }
  }
  throw "timeout waiting for $runId"
}

"=== Run 43 accelerated Phase 5 QA ===" | Out-File $log
Log "SEA SHA256: 771eef88a2e78392d4872bdb1d48ac80b7f4f0d3bc693f2195d8b5967b1cc1f9"
Log "Verification tier: full-mode smoke (3 cases) + complete quick (12 hard)"

# Q3 smoke — full mode, subset cases
$fullBody = @{
  mode = "full"
  endpointIds = @($ep1, $ep2)
  judgeEndpointId = $ep1
  caseIds = $smokeCases
} | ConvertTo-Json -Compress
$fullStart = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Method POST -Headers $h -Body $fullBody
Log "Q3-smoke full runId=$($fullStart.runId) cases=$($smokeCases -join ',')"
$fullDone = Wait-Run $fullStart.runId 25
Log "Q3-smoke status=$($fullDone.status) steps=$($fullDone.completedSteps)/$($fullDone.totalSteps)"

# Q4 — complete quick
$quickBody = @{
  mode = "quick"
  endpointIds = @($ep1, $ep2)
  judgeEndpointId = $ep1
} | ConvertTo-Json -Compress
$quickStart = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Method POST -Headers $h -Body $quickBody
Log "Q4 quick runId=$($quickStart.runId)"
$quickDone = Wait-Run $quickStart.runId 25
Log "Q4 quick status=$($quickDone.status) steps=$($quickDone.completedSteps)/$($quickDone.totalSteps)"

# Q5/Q6 — API readback
$byMode = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summaries/by-mode" -Headers @{ Authorization = "Bearer role-model-local" }
Log "Q6 byMode full=$($byMode.full.runId) quick=$($byMode.quick.runId)"
$runs = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Headers @{ Authorization = "Bearer role-model-local" }
Log "Q6 run history count=$($runs.Count)"
$cand = Invoke-RestMethod -Uri "$base/api/role-model/router/candidates" -Headers @{ Authorization = "Bearer role-model-local" }
$c = $cand | Where-Object { $_.endpointId -eq $ep1 } | Select-Object -First 1
Log "Q5 routingQualityScore=$($c.routingQualityScore) artifact=$($c.benchmarkCapability.overallScore) hardBlend=$([bool]$c.routingBenchmarkQuality.hardBlend)"
$summary = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summary" -Headers @{ Authorization = "Bearer role-model-local" }
$audit = $summary.caseAudits | Select-Object -First 1
Log "Q7 caseAudit latencyMs=$($audit.latencyMs)"

# Q8 — per-endpoint clear
$before = Invoke-RestMethod -Uri "$base/api/role-model/router/candidates" -Headers @{ Authorization = "Bearer role-model-local" }
Invoke-RestMethod -Uri "$base/api/role-model/benchmark/endpoints/$([uri]::EscapeDataString($ep1))/data" -Method DELETE -Headers @{ Authorization = "Bearer role-model-local" } | Out-Null
$after8 = Invoke-RestMethod -Uri "$base/api/role-model/router/candidates" -Headers @{ Authorization = "Bearer role-model-local" }
$cAfter8 = $after8 | Where-Object { $_.endpointId -eq $ep1 } | Select-Object -First 1
Log "Q8 after clear routingQualityScore=$($cAfter8.routingQualityScore) benchmarkSamples=$($cAfter8.routingBenchmarkQuality.benchmark_samples)"

# Q9 — global clear
Invoke-RestMethod -Uri "$base/api/role-model/benchmark/data" -Method DELETE -Headers @{ Authorization = "Bearer role-model-local" } | Out-Null
$after9Summary = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summary" -Headers @{ Authorization = "Bearer role-model-local" }
$after9Runs = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Headers @{ Authorization = "Bearer role-model-local" }
Log "Q9 after global clear runId=$($after9Summary.runId) history=$($after9Runs.Count)"

# Q10 — quick re-run after clear
$q10Start = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Method POST -Headers $h -Body $quickBody
Log "Q10 re-run runId=$($q10Start.runId)"
$q10Done = Wait-Run $q10Start.runId 25
Log "Q10 status=$($q10Done.status)"
$after10 = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summaries/by-mode" -Headers @{ Authorization = "Bearer role-model-local" }
Log "Q10 quick panel runId=$($after10.quick.runId)"

Log "DONE accelerated QA"
