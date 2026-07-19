$ErrorActionPreference = "Stop"

$baseUrl = "http://127.0.0.1:55725"
$node = (Get-Command node.exe -ErrorAction Stop).Source
$piCli = "D:\pi\node_modules\@earendil-works\pi-coding-agent\dist\cli.js"
$evidenceRoot = $PSScriptRoot
$cases = @(
  @{ id = "alias-baseline"; model = "baseline.remote-only"; marker = "RUN77_ALIAS_BASELINE_OK" },
  @{ id = "alias-difficulty"; model = "difficulty.remote-only"; marker = "RUN77_ALIAS_DIFFICULTY_OK" },
  @{ id = "direct-deepseek"; model = "deepseek/deepseek-v4-pro"; marker = "RUN77_DIRECT_DEEPSEEK_OK" },
  @{ id = "direct-kimi-k3"; model = "moonshot/kimi-k3"; marker = "RUN77_DIRECT_KIMI_K3_OK" }
)

$results = foreach ($case in $cases) {
  $stdoutPath = Join-Path $evidenceRoot "$($case.id).stdout.log"
  $stderrPath = Join-Path $evidenceRoot "$($case.id).stderr.log"
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $node
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.Environment["ROLE_MODEL_ENDPOINT"] = $baseUrl
  foreach ($argument in @(
    $piCli,
    "--no-session",
    "--provider", "role-model",
    "--model", $case.model,
    "--no-tools",
    "--print", "Reply with exactly $($case.marker) and nothing else."
  )) {
    [void]$startInfo.ArgumentList.Add($argument)
  }

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $startedAt = [DateTimeOffset]::UtcNow
  [void]$process.Start()
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $exited = $process.WaitForExit(180000)
  if (-not $exited) {
    $process.Kill($true)
    $process.WaitForExit()
  }
  $stdout = $stdoutTask.GetAwaiter().GetResult()
  $stderr = $stderrTask.GetAwaiter().GetResult()
  [System.IO.File]::WriteAllText($stdoutPath, $stdout)
  [System.IO.File]::WriteAllText($stderrPath, $stderr)
  [pscustomobject]@{
    caseId = $case.id
    model = $case.model
    marker = $case.marker
    markerObserved = $stdout.Contains($case.marker, [System.StringComparison]::Ordinal)
    elapsedMs = [math]::Round(([DateTimeOffset]::UtcNow - $startedAt).TotalMilliseconds, 3)
    exited = $exited
    exitCode = if ($exited) { $process.ExitCode } else { $null }
    stdoutFile = [System.IO.Path]::GetFileName($stdoutPath)
    stderrFile = [System.IO.Path]::GetFileName($stderrPath)
  }
}

$resultPath = Join-Path $evidenceRoot "pi-case-results.json"
[System.IO.File]::WriteAllText($resultPath, ($results | ConvertTo-Json -Depth 5))
$results | ConvertTo-Json -Depth 5
