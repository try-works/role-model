# Release checklist

## Stage candidate

1. Confirm the intended work is merged into `dev` with all required CI lanes green.
2. Open and review `dev -> stage`; use a merge commit and do not rewrite stage history.
3. Confirm the stage binary matrix completed and its artifacts include `role-model-stage`, public source-tree,
   exact private source commit, Run 88 release identity, private manifest/sidecar digests, all 13 extensions,
   attestations, and `core_payload_sha256`.
4. Run the stage package on `3457` beside production on `3456` and development on `3458`; verify isolated state.

## Production promotion

1. Open and review `stage -> main`; do not add untested product changes during promotion.
2. Confirm all main promotion checks pass and merge with a merge commit.
3. Create an annotated tag: `git tag -a vX.Y.Z -m "role-model vX.Y.Z"`.
4. Push the tag. Production packaging must retrieve the matching stage candidate, rebuild its exact private commit,
   and verify the complete paired identity (release, public tree/core, private manifest/sidecar, compatibility
   generation, and 13-extension closure) before publication.
5. Approve the protected `release` environment when requested.

## Published assets

Verify the release contains `role-model-{linux-x64,darwin-x64,darwin-arm64}` archives,
`role-model-win32-x64.zip`, `install.sh`, `install.ps1`, `SHA256SUMS.txt`, generated release highlights, and
artifact attestations. Installer and manual-download docs must use the same filenames.

## Rollback and hotfix

- Roll back a bad release by restoring the last known-good tag/assets and documenting the failed candidate; do not
  force-reset `main`.
- For an emergency, branch `hotfix/*` from `main`, review and validate it, merge to `main`, then forward the hotfix to
  `stage` and `dev` through reviewed merges.
- If a promotion branch diverges, merge the upstream promotion branch and resolve conflicts; never delete or
  force-update long-lived history.
