# Run 43 - full benchmark after existing quick; verify dual display (R1/Q3/Q4/Q5)
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3456"
$logDir = "D:\DEV\role-model\.recursive\run\43-benchmark-routing-display\evidence\logs"
$log = Join-Path $logDir "phase5-full-dual-display-qa.log"
$artifactRoot = "C:\Users\erikb\AppData\Local\Temp\role-model-run42-verify-state\run43-verify\memory\benchmark-runs"
$validateScript = "D:\DEV\role-model\.recursive\run\36-runtime-consumption-telemetry-remediation\evidence\scripts\validate-benchmark-run.py"
$h = @{ Authorization = "Bearer role-model-local"; "Content-Type" = "application/json" }
$ep1 = "deepseek.litellm.global.deepseek-deepseek-v4-pro"
$ep2 = "deepseek.litellm.global.deepseek-deepseek-v4-flash"

function Log([string]$msg) {
  $line = "[$(Get-Date -Format o)] $msg"
  Write-Host $line
  Add-Content -Path $log -Value $line
}

function Wait-Run([string]$runId, [int]$maxMinutes = 180) {
  for ($i = 0; $i -lt ($maxMinutes * 6); $i++) {
    Start-Sleep -Seconds 10
    $p = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs/$runId" -Headers @{ Authorization = "Bearer role-model-local" }
    if ($p.status -eq "completed" -or $p.status -eq "failed") { return $p }
    if ($i % 6 -eq 0) { Log "poll $runId $($p.completedSteps)/$($p.totalSteps) $($p.status)" }
  }
  throw "timeout waiting for $runId"
}

"=== Run 43 full + dual display QA ===" | Out-File $log -Encoding utf8
Log "SEA context: scope run43-verify on :3456"

$before = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summaries/by-mode" -Headers @{ Authorization = "Bearer role-model-local" }
Log "pre-full quick runId=$($before.quick.runId) full runId=$($before.full.runId)"
if (-not $before.quick.runId) { throw "Expected existing quick run before full benchmark" }

$fullBody = @{
  mode = "full"
  endpointIds = @($ep1, $ep2)
  judgeEndpointId = $ep1
} | ConvertTo-Json -Compress
$fullStart = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Method POST -Headers $h -Body $fullBody
Log "Q3-full start runId=$($fullStart.runId) totalSteps=$($fullStart.totalSteps)"
$fullDone = Wait-Run $fullStart.runId 180
Log "Q3-full status=$($fullDone.status) steps=$($fullDone.completedSteps)/$($fullDone.totalSteps)"
if ($fullDone.status -ne "completed") { throw "Full benchmark did not complete: $($fullDone.status)" }

$fullValidate = & python $validateScript --artifact-root $artifactRoot --run-id $fullStart.runId 2>&1 | Out-String
Log "Q3 validate-benchmark-run.py output follows"
Log $fullValidate.Trim()

$quickValidate = & python $validateScript --artifact-root $artifactRoot --run-id $before.quick.runId 2>&1 | Out-String
Log "Q4 validate-benchmark-run.py (quick) output follows"
Log $quickValidate.Trim()

$byMode = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summaries/by-mode" -Headers @{ Authorization = "Bearer role-model-local" }
Log "dual-display full runId=$($byMode.full.runId) mode=$($byMode.full.mode) subjects=$($byMode.full.subjects.Count)"
Log "dual-display quick runId=$($byMode.quick.runId) mode=$($byMode.quick.mode) subjects=$($byMode.quick.subjects.Count)"

$fullOk = [bool]$byMode.full.runId -and $byMode.full.mode -eq "full" -and $byMode.full.subjects.Count -ge 1
$quickOk = [bool]$byMode.quick.runId -and $byMode.quick.mode -eq "quick" -and $byMode.quick.subjects.Count -ge 1
$distinct = $byMode.full.runId -ne $byMode.quick.runId
Log "R1 dual panels: fullOk=$fullOk quickOk=$quickOk distinctRunIds=$distinct"

$globalSummary = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/summary" -Headers @{ Authorization = "Bearer role-model-local" }
Log "global summary runId=$($globalSummary.runId) mode=$($globalSummary.mode)"

$runs = Invoke-RestMethod -Uri "$base/api/role-model/benchmark/runs" -Headers @{ Authorization = "Bearer role-model-local" }
Log "run history count=$($runs.Count) modes=$($runs.mode -join ',')"

$cand = Invoke-RestMethod -Uri "$base/api/role-model/router/candidates" -Headers @{ Authorization = "Bearer role-model-local" }
foreach ($ep in @($ep1, $ep2)) {
  $c = $cand | Where-Object { $_.endpointId -eq $ep } | Select-Object -First 1
  $hb = $c.routingBenchmarkQuality.hardBlend
  Log "Q5 $ep routingQualityScore=$($c.routingQualityScore) artifact=$($c.benchmarkCapability.overallScore) hardBlend=$([bool]$hb)"
  if ($hb) {
    Log "  hardBlend full=$($hb.full) quick=$($hb.quick) blended=$($hb.blended)"
  }
}

$evidenceDir = "D:\DEV\role-model\.recursive\run\43-benchmark-routing-display\evidence\logs"
$byMode | ConvertTo-Json -Depth 8 | Out-File (Join-Path $evidenceDir "phase5-dual-display-by-mode.json") -Encoding utf8
$cand | ConvertTo-Json -Depth 8 | Out-File (Join-Path $evidenceDir "phase5-dual-display-candidates.json") -Encoding utf8

if (-not ($fullOk -and $quickOk -and $distinct)) { throw "Dual display verification FAILED" }
Log "PASS full and quick coexist in by-mode API"
Log "DONE"
