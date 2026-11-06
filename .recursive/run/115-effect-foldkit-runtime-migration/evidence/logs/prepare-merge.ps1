$wt = 'D:/DEV/role-model/.worktrees/merge-115-dev'
if (Test-Path $wt) { git worktree remove $wt --force 2>&1 | Out-Null }
git worktree add --detach $wt origin/dev 2>&1 | Select-Object -Last 1
Push-Location $wt
git checkout -B feat/115-effect-foldkit-runtime-migration 2>&1 | Select-Object -Last 1
$env:GIT_AUTHOR_NAME = 'role-model agent'
$env:GIT_AUTHOR_EMAIL = 'agent@localhost'
$env:GIT_COMMITTER_NAME = 'role-model agent'
$env:GIT_COMMITTER_EMAIL = 'agent@localhost'
git merge --squash recursive/115-effect-foldkit-runtime-migration 2>&1 | Select-Object -Last 3
$conf = (git status --porcelain=v1 | Where-Object { $_ -match '^(UU|AA|DU|UD|AU|UA|DD)' } | Measure-Object).Count
Write-Output ('conflicts=' + $conf)
Pop-Location