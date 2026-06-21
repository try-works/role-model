# Run after Run 53 browser QA sign-off to remove temporary QA telemetry rows.
$scriptPath = Join-Path $env:TEMP "run53-cleanup-temporary-qa-telemetry.cjs"
$script = @'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('D:/DEV/role-model/.worktrees/53/runtime-output/run53-qa/run53-qa/memory/memory.sqlite');
const result = db.prepare("DELETE FROM runtime_telemetry_records WHERE request_id LIKE 'run53-qa-seed-%' OR client_request_id LIKE 'run53-qa-seed-%' OR client_request_id LIKE 'run53-qa-generated-%'").run();
db.close();
console.log(JSON.stringify({ deletedRows: result.changes }));
'@
Set-Content -LiteralPath $scriptPath -Value $script -Encoding utf8
node --no-warnings $scriptPath
Remove-Item -LiteralPath $scriptPath -Force
