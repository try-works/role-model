$ErrorActionPreference = "Stop"

$baseUrl = "http://127.0.0.1:55726"
$node = (Get-Command node.exe -ErrorAction Stop).Source
$piCli = "D:\pi\node_modules\@earendil-works\pi-coding-agent\dist\cli.js"
$evidenceRoot = $PSScriptRoot
$cases = @(
  @{ id = "direct-kimi-k3"; model = "moonshot/kimi-k3"; marker = "RUN77_KIMI_REFRESH_OK" },
  @{ id = "direct-gpt-5-4"; model = "chatgpt/gpt-5.4"; marker = "RUN77_GPT54_DIRECT_OK" },
  @{ id = "alias-baseline"; model = "baseline.remote-only"; marker = "RUN77_ALIAS_AFTER_REFRESH_OK" }
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
  $exited = $process.WaitForExit(240000)
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
