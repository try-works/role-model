$wt = 'D:/DEV/role-model/.worktrees/merge-115-dev'
Push-Location $wt
git push -u origin feat/115-effect-foldkit-runtime-migration 2>&1 | Select-Object -First 4
Write-Output ('push_branch_exit=' + $LASTEXITCODE)
Pop-Location