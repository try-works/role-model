Run: `/.recursive/run/94-stage-manifest-commit-identity/`
Addendum: `Production Track-B candidate-tree binding`
Status: `DRAFT`
Date: `2026-08-29`

## Release-blocking observation

Stable tag `v0.0.12` was built from public `main` commit
`86ae3be0fdb7523385ad7259b2b74ef41469434d`. The accepted Stage package was
built from `d97d7ccf66d91de6702433ac1075e31c07201f39`. Both commits resolve to
public source tree `73fd52db96793cddd8b4686c2110dfdee480b60f`, and both use
private commit `4b23c9940dc2674440c38f384c16fe3075e4e3c3`.

The production package correctly failed closed because the rebuilt Track-B
manifest used `publicCommit: 86ae…` and therefore hashed to
`e10fbe…`, while the Stage package used `publicCommit: d97…` and hashed to
`e093a7…`. Extension files, sidecar, source trees, and private commit matched.

## Root cause

The production workflow reused the public `main` checkout for both the stable
package and the private Track-B distribution build. Track-B correctly records
the public *commit* as well as its tree, so a merge commit with the same tree
produced a different distribution manifest identity. The production verifier
correctly rejected it.

## Remediation

For production only:

1. Checkout the exact accepted Stage public commit into `.cache/paired-public`.
2. Verify its commit equals the accepted candidate SHA and its tree equals the
   production `main` source tree.
3. Pass that clean checkout to the private Track-B distribution build. Continue
   packaging the public runtime from `main`.
4. Preserve the existing exact manifest-hash comparison; do not normalize or
   weaken it.

## Strict TDD evidence

- **RED:** Added `production rebuilds Track B against the accepted stage public
  commit` to `scripts/build-binaries-workflow.test.mjs`; it failed because the
  workflow had no accepted-public checkout.
- **GREEN:** Added the checkout, commit/tree gate, and production-only worktree
  selection. The regression test passed.
- **Regression:** 40 focused Run-88 and binary-workflow tests passed.

## Required release verification

1. Merge this workflow-only repair to `dev`, then promote it through `stage`.
2. Download and inspect the new Stage RC: its package includes 13 extensions
   and the accepted source/Track-B identities.
3. Run stage UAT and explicit candidate acceptance.
4. Promote the paired branches to `main`, tag the next unused SemVer patch, and
   verify every production matrix package reports the same Track-B manifest and
   sidecar digests as the accepted Stage package.
5. Verify the stable GitHub release contains all four platform archives,
   installers, checksums, highlights, and attestations.

## Non-goals

- Do not retag or publish the failed `v0.0.12` build.
- Do not weaken candidate identity validation or treat matching source trees as
  permission to ignore commit provenance.

