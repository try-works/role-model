$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:57696'
$auth = 'role-model-local'
$runDir = 'D:\DEV\role-model\.worktrees\69-benchmark-scoring-integrity\.recursive\run\69-benchmark-scoring-integrity\evidence\runtime\full-rerun-2'
$body = @{
  mode = 'full'
  judgeEndpointId = 'openai.personal.openai-codex-subscription.global.gpt-5.4'
  endpointIds = @(
    'deepseek.personal.deepseek-api-key.global.deepseek-v4-flash',
    'deepseek.personal.deepseek-api-key.global.deepseek-v4-pro',
    'openai.personal.openai-codex-subscription.global.gpt-5.4'
  )
  useJudge = $true
  preflightProbe = $true
} | ConvertTo-Json -Depth 6
$headers = @{ Authorization = "Bearer $auth" }
$start = Invoke-RestMethod -Method Post -Uri "$base/api/role-model/benchmark/runs" -Headers $headers -ContentType 'application/json' -Body $body
$start | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 "$runDir/start.json"
$runId = $start.runId
$progressPath = "$runDir/progress.jsonl"
if (Test-Path $progressPath) { Remove-Item -LiteralPath $progressPath -Force }
while ($true) {
  $progress = Invoke-RestMethod -Method Get -Uri "$base/api/role-model/benchmark/runs/$runId" -Headers $headers
  $progress | ConvertTo-Json -Depth 20 -Compress | Add-Content -Encoding utf8 $progressPath
  if ($progress.status -eq 'completed') {
    $progress | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 "$runDir/completed-progress.json"
    $progress.result | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 "$runDir/result.json"
    break
  }
  if ($progress.status -eq 'failed') {
    $progress | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 "$runDir/failed-progress.json"
    break
  }
  Start-Sleep -Seconds 5
}
