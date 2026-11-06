# Run 115 S86: scripted, logged runtime-config editor E2E
# Replaces the earlier unlogged interactive claim (review finding, s81b).
$ErrorActionPreference = "Stop"
$env:TMP = "E:/rm-tmp"; $env:TEMP = "E:/rm-tmp"
$root = "E:/rm-tmp/s85a/release/win32-x64"
$exe = Join-Path $root "role-model-dev.exe"
$state = "E:/rm-tmp/s86-state"
$port = 5911
Remove-Item -Recurse -Force $state -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $state | Out-Null
$yaml = @("routing:", "  strategy: controller") -join [Environment]::NewLine
Set-Content -Path (Join-Path $state "runtime-config.yaml") -Value $yaml -NoNewline
$static = "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/role-model-router/apps/runtime-ui-next/dist/client"
$proc = Start-Process -FilePath $exe -ArgumentList @("--repo-root", $root, "--runtime-state-root", $state, "--host", "127.0.0.1", "--port", "$port", "--fixture-root", "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/testdata/router-runtime/fixtures", "--static-root", $static) -PassThru -RedirectStandardOutput "E:/rm-tmp/s86-out.log" -RedirectStandardError "E:/rm-tmp/s86-err.log" -WorkingDirectory $root
Start-Sleep -Seconds 18
$base = "http://127.0.0.1:" + $port
function Get-Config { return (Invoke-WebRequest -Uri ($base + "/api/role-model/runtime/config") -TimeoutSec 10 -UseBasicParsing).Content | ConvertFrom-Json }
$g1 = Get-Config
"[step1] GET applied=" + $g1.applied + " strategy=" + $g1.config.routingStrategy
$body = $g1.config
$body.routingStrategy = "baseline"
$json = $body | ConvertTo-Json -Depth 20 -Compress
$put = Invoke-WebRequest -Uri ($base + "/api/role-model/runtime/config") -Method PUT -Body $json -ContentType "application/json" -TimeoutSec 20 -UseBasicParsing
"[step2] PUT status=" + $put.StatusCode
$g2 = Get-Config
"[step3] GET after save strategy=" + $g2.config.routingStrategy
if ($g2.config.routingStrategy -ne "baseline") { throw "config did not persist" }
$restore = $g2.config
$restore.routingStrategy = "controller"
$rjson = $restore | ConvertTo-Json -Depth 20 -Compress
$put2 = Invoke-WebRequest -Uri ($base + "/api/role-model/runtime/config") -Method PUT -Body $rjson -ContentType "application/json" -TimeoutSec 20 -UseBasicParsing
$g3 = Get-Config
"[step4] restore PUT status=" + $put2.StatusCode + " final strategy=" + $g3.config.routingStrategy
if ($g3.config.routingStrategy -ne "controller") { throw "restore failed" }
"RESULT: PASS - GET -> PUT -> GET persisted -> PUT restore -> GET verified"