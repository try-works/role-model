$tsx = 'D:\DEV\role-model\.worktrees\69-benchmark-scoring-integrity\node_modules\.bin\tsx.CMD'
$entry = 'D:\DEV\role-model\.worktrees\69-benchmark-scoring-integrity\role-model-router\apps\runtime-host-bridge\src\cli-entry.ts'
$repoRoot = 'D:\DEV\role-model\.worktrees\69-benchmark-scoring-integrity'
$runtimeStateRoot = 'C:\Users\erikb\AppData\Local\Role Model Runtime\state'

& $tsx $entry `
  --repo-root $repoRoot `
  --runtime-state-root $runtimeStateRoot `
  --scope-id 'runtime-host-bridge' `
  --port '57696'
