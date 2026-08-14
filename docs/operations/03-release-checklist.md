# Release checklist

## Stage candidate

1. Confirm the intended work is merged into both repositories' `dev` branches with all available CI lanes green.
2. Promote the exact paired private commit through reviewed `role-model-internal` `dev -> stage`, then set the public
   `ROLE_MODEL_PAIRED_PRIVATE_SHA` variable to that private stage commit.
3. Open and review public `dev -> stage`; use a merge commit and do not rewrite stage history.
4. Confirm the stage binary matrix completed and its artifacts include `role-model-stage`, public source-tree,
   exact private source commit, Run 88 release identity, private manifest/sidecar digests, all 13 extensions,
   attestations, and `core_payload_sha256`.
5. Run the stage package on `3457` beside production on `3456` and development on `3458`; verify isolated state.

## Production promotion

1. Promote private `stage -> main` with a reviewed merge commit; the exact private commit recorded by the tested
   stage package must be an ancestor of private `main`.
2. Open and review public `stage -> main`; do not add untested product changes during promotion.
3. Confirm all main promotion checks pass and merge with a merge commit.
4. Create an annotated public tag: `git tag -a vX.Y.Z -m "role-model vX.Y.Z"`. The private repository does not
   receive a separate release tag.
5. Push the tag. Production packaging must retrieve an artifact from a successful public `stage` push, rebuild its exact private commit,
   and verify the complete paired identity (release, public tree/core, private manifest/sidecar, compatibility
   generation, and 13-extension closure) before publication.
6. Approve the protected `release` environment when requested.

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
