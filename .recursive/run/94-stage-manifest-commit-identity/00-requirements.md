Run: `/.recursive/run/94-stage-manifest-commit-identity/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-08-23T08:46:34Z`
LockHash: `ed975a6c59df64523c025dc34b28f181b90ee0a340e17d7f6deb4d264e748ab5`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User-approved Stage RC `stage-rc-23f91a1f7cd8` acceptance attempt and its recorded rejection.
- `/.github/workflows/build-binaries.yml`
- `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`
Outputs:
- `/.recursive/run/94-stage-manifest-commit-identity/00-requirements.md`
Scope note: Repairs the broken Stage manifest commit provenance gate before any subsequent Stage RC or main promotion.

## TODO

- [x] Record the failed acceptance evidence and root issue.
- [x] Define code-level and workflow-level acceptance conditions.
- [x] Define strict TDD and release-verification evidence.
- [x] Separate the repair from later human UAT and production promotion.

## Requirements

### `R1` CI commit provenance survives shallow Stage builds

Description: A branch build with no tag or readable Git metadata preserves the CI revision and build date instead of emitting a synthetic commit value.

Acceptance criteria:
- A shallow `stage` build with `GITHUB_SHA` produces that exact SHA as `manifest.commit`.
- A packaged Stage runtime rejects a missing or non-40-hex commit identity.

### `R2` Release workflow rejects provenance mismatch at every trust boundary

Description: Stage packaging and production promotion must reject packages whose declared commit does not equal the commit that produced or was accepted for the package.

Acceptance criteria:
- Stage/production packaging fails when `manifest.commit !== GITHUB_SHA`.
- Production candidate consumption fails when the downloaded Stage manifest commit differs from the accepted Stage workflow SHA.
- The existing acceptance workflow remains the final exact-artifact check; this run does not weaken it.

### `R3` Regression proof is reproducible before a new candidate is requested

Description: The repair must be developed with strict RED/GREEN evidence and must pass the relevant runtime and release-workflow contract suites.

Acceptance criteria:
- Each production guard has a concrete RED receipt followed by a GREEN receipt.
- The focused Stage runtime unit, integration, and regression layers pass.
- The full release-workflow contract suite passes locally before merge.

## Out of Scope

- `OOS1`: Accepting, deleting, or modifying the rejected candidate `stage-rc-23f91a1f7cd8`.
- `OOS2`: Publishing a new Stage RC, human UAT, private `stage -> main`, public `stage -> main`, and stable tagging. Those occur only after this repair merges and the corrected candidate is independently built.
- `OOS3`: Changes to Track B extension behavior or user runtime state.

## Constraints

- Preserve fail-closed provenance checks; do not bypass release acceptance.
- No credentials, runtime state, or downloaded artifacts are committed.
- TDD Mode for implementation is strict.

## Coverage Gate

- [x] R1 covers the source fallback and runtime startup boundary.
- [x] R2 covers both producing and consuming workflow boundaries.
- [x] R3 covers reproducible RED/GREEN and contract verification.
Coverage: PASS

## Approval Gate

- [x] Scope is limited to the defect that blocked the accepted-candidate workflow.
- [x] Later human UAT and promotion are explicitly deferred rather than implied.
Approval: PASS
