$wt = 'D:/DEV/role-model/.worktrees/merge-115-dev'
Push-Location $wt
$runDir = '.recursive/run/115-effect-foldkit-runtime-migration'
if (Test-Path $runDir) {
  git rm -r --cached --quiet $runDir 2>&1 | Out-Null
  Remove-Item -Recurse -Force $runDir
  Write-Output 'excluded the run artifact directory from the merge commit'
}
$staged = (git status --porcelain=v1 | Measure-Object).Count
Write-Output ('staged entries: ' + $staged)
$env:GIT_AUTHOR_NAME = 'role-model agent'
$env:GIT_AUTHOR_EMAIL = 'agent@localhost'
$env:GIT_COMMITTER_NAME = 'role-model agent'
$env:GIT_COMMITTER_EMAIL = 'agent@localhost'
git commit -q -m "feat(runtime): effect 4.0.6 and foldkit runtime UI migration (run115)" -m "Squashed delivery of the coordinated public backend migration and Foldkit UI port: vendored Effect 4.0.6 / Foldkit 0.169 / crease by commit, SQLite Effect service with host call-site migration, scoped transport and SSE cancellation, composition DAG with a wired Bootstrap owner, bounded diagnostics read with a real socket proof, Foldkit shell with one refresh subscription and gap resync, twelve migrated routes and a machine-checkable route inventory, and a packaging path that builds, pairs and validates a SEA artifact on the v0.0.20 baseline. Run-time evidence and logs are intentionally excluded from this commit."
git log -1 --format='%h %s'
Write-Output ('files: ' + (git show --stat --oneline HEAD | Select-Object -Last 1))
Pop-Location