$run = '.recursive/run/115-effect-foldkit-runtime-migration/'
$f = Join-Path $run 'subagents/s27b-validator-scope.md'
$c = Get-Content $f
$out = @(); $inImpact = $false; $inEvidence = $false
foreach ($line in $c) {
  if ($line -match '^## Claimed Artifact Impact') { $inImpact = $true; $out += $line; continue }
  if ($inImpact -and $line -match '^## ') { $inImpact = $false; $inEvidence = $false }
  if ($inImpact -and $line -eq '### Evidence Used') { $inEvidence = $true; $out += $line; continue }
  if ($inImpact -and $inEvidence -and $line -eq '- none') { $out += ('- `/' + $run + 'evidence/other/s27b-tdd.json`'); $inEvidence = $false; continue }
  if ($inImpact -and $line -match '^### ') { $inEvidence = $false }
  $out += $line
}
Set-Content -Path $f -Value $out -Encoding utf8
$b = [char]96
$row22 = '- R22 | Status: implemented | Changed Files: ' + $b + 'role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts' + $b + ', ' + $b + 'role-model-router/apps/runtime-host-bridge/test/s27b-validator-scope.test.ts' + $b + ' | Implementation Evidence: ' + $b + '/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s27b-tdd.json' + $b + ', ' + $b + '/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s27-packaged-run.md' + $b + ' |'
$row33 = '- R33 | Status: implemented | Changed Files: ' + $b + 'role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts' + $b + ', ' + $b + 'role-model-router/apps/runtime-host-bridge/test/s27b-validator-scope.test.ts' + $b + ' | Implementation Evidence: ' + $b + '/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s27-packaged-run.md' + $b + ', ' + $b + '/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s28a-tdd.json' + $b + ' |'
$s = Join-Path $run '03-implementation-summary.md'
$lines = Get-Content $s
$res = @()
foreach ($line in $lines) {
  if ($line -match '^- R22 \|') { $res += $row22 }
  elseif ($line -match '^- R33 \|') { $res += $row33 }
  else { $res += $line }
}
Set-Content -Path $s -Value $res -Encoding utf8
'fixed rows and record'