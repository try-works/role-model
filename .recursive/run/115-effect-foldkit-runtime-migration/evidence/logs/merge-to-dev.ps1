git fetch origin --quiet 2>&1 | Out-Null
git merge-base --is-ancestor origin/dev origin/feat/115-effect-foldkit-runtime-migration
Write-Output ('ff_possible_exit=' + $LASTEXITCODE)
git push origin origin/feat/115-effect-foldkit-runtime-migration:refs/heads/dev 2>&1 | Select-Object -First 8
git fetch origin --quiet 2>&1 | Out-Null
Write-Output ('origin/dev now: ' + (git rev-parse --short origin/dev))
Write-Output ('branch head:   ' + (git rev-parse --short origin/feat/115-effect-foldkit-runtime-migration))
Write-Output ('dev==branch: ' + ((git rev-parse origin/dev) -eq (git rev-parse origin/feat/115-effect-foldkit-runtime-migration)))