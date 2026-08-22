Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `2-to-be-plan`
Artifact: `02-to-be-plan.md`
Addendum: `10`
Status: `LOCKED`
LockedAt: `2026-08-22T14:24:15Z`
LockHash: `1641221f993cb08aa99ebb9fe165cbb61e1ea34daa5d8699748cf4b32411c06c`

# Stage package worktree-cleanliness repair

## Finding

The Run 93 `stage` promotion at public commit `e50f1ccc` reached the mandatory
release packager, but all platform jobs failed before an archive was emitted.
The package provenance guard correctly rejected a dirty public checkout. The
workflow itself had created the dirt by checking the exact paired private
repository out at `${GITHUB_WORKSPACE}/_private`; that untracked directory is
not ignored. This is a workflow-topology defect, not a reason to weaken the
source provenance rule.

## Requirements

1. The stage/production binary workflow must check the paired private release
   revision out only under an ignored workspace path and must pass its exact
   `dist/run00-dev` path to `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`.
2. `package-sea.ts` must retain its existing fail-closed response to any
   tracked or untracked public source change. No status-path filtering,
   bypass environment variable, or source-tree identity relaxation is allowed.
3. The same workflow path must be used for the private build, private ancestry
   verification, and Track B distribution root. A stale `_private` reference
   is a release-contract failure.
4. Strict TDD is required: a workflow-contract RED must fail against the
   `_private` implementation; GREEN must prove an ignored paired checkout and
   exact distribution path; the existing dirty-public-worktree regression must
   remain green.
5. Verification includes local workflow-contract tests, `pnpm ci:check`, and
   a new GitHub stage package run that passes all CI lanes, creates the
   `stage-rc-<12-sha>` prerelease, and binds all 13 Track B extensions.

## Scope

Only the public binary workflow and its workflow-contract test may change.
No release artifact will be accepted until the rebuilt paired Stage RC passes
the release workflow; no credentials are read or included in artifacts.

## Implementation and verification record

- RED: the added workflow-contract assertion failed against the original
  `path: _private` topology, which made the paired checkout an untracked file
  inside the public source tree and caused the strict SEA provenance guard to
  fail.
- GREEN: `.github/workflows/build-binaries.yml` now checks the paired private
  source out to `.cache/paired-private`, and uses that exact path for private
  branch verification, the private Track B build, and
  `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`.
- The packager's public-worktree cleanliness check is unchanged. The workflow
  therefore still rejects actual public source drift before packaging.
- Focused release workflow tests passed: 28/28.
- `corepack pnpm ci:check` passed locally, including lint, schema validation,
  all builds/tests, rebuilt-runtime critical validation, Rust, and smoke.

## GitHub release gate

The prior stage CI run `32577358303` passed, while its paired binary workflow
`32577358384` failed only because the old workflow dirtied the public checkout
with `_private/`. The repaired workflow must pass GitHub CI and the next stage
binary build must publish a fresh `stage-rc-<12-sha>` prerelease before this
release path is considered complete. Its manifest must retain the mandatory
Track B runtime binding and extension count of 13.
