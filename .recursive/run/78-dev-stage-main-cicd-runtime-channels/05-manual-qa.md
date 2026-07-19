Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `05 Manual QA`
Status: `DRAFT`
LockedAt: `pending`
LockHash: `pending`
Workflow version: `recursive-mode-audit-v2`
Inputs: locked test summary, packaged channel builds, GitHub PR #62, and observed check runs.
Outputs: concurrent-runtime receipt and recoverable GitHub migration status.
Scope note: Local/runtime QA is complete; final repository migration awaits the required maintainer-reviewed merge.

## TODO

- [x] Build production, stage, and development Windows packages
- [x] Run stage and development beside the existing main runtime
- [x] Restart one channel and verify state isolation
- [x] Create `dev`, push the implementation, and open PR #62 targeting `dev`
- [x] Observe all real GitHub check names and results
- [ ] Receive maintainer review and merge PR #62
- [ ] Promote `dev -> stage -> main` with reviewed PRs
- [ ] Apply/read back final protections and set default branch to `dev`

## QA Execution Record

- Existing main remained healthy on `127.0.0.1:3456` and was never stopped or modified.
- `role-model-stage` ran and restarted on `127.0.0.1:3457`.
- `role-model-dev` remained healthy on `127.0.0.1:3458` during the stage restart.
- Stage marker state persisted; no marker appeared in development; the development SQLite hash remained unchanged.
- Stage/development used distinct `role-model-runtime-stage` and `role-model-runtime-dev` roots under disposable `LOCALAPPDATA`.
- Temporary stage/development processes were shut down; the existing main runtime stayed healthy.

## GitHub Migration Status

- Tracker: https://github.com/try-works/role-model/issues/61
- Pull request: https://github.com/try-works/role-model/pull/62
- `dev` was created from captured main baseline `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`.
- Implementation branch `recursive/78-dev-stage-main-cicd-runtime-channels` was pushed and PR #62 targets `dev`.
- Observed passing checks: `promotion-guard`, `quality`, `build-test`, `runtime-critical`, `runtime-router`, `rust`, `smoke`, `cla`, and `Build docs site`.
- Docs deployment correctly skipped on the PR.

## Approval Boundary

PR #62 is ready for review. The approved design requires one maintainer review and reviewed promotion PRs. Self-merging before that review would contradict the policy being installed, so protections/default-branch changes remain pending until the reviewed implementation reaches `dev` and can be promoted without bypassing the new contract.

## Requirement Status

- R1: partially complete; `dev` and the default targeting policy exist, but reviewed promotions/default-branch mutation remain pending.
- R2: pending reviewed merge and observed-check protection application.
- R3-R9: QA complete; R4 follows approved docs addendum 01.

## Cleanup

Temporary stage/development processes were stopped. The existing main runtime was preserved. Disposable package/state artifacts remain only under the explicit sibling QA path for inspection and can be removed after final migration closeout.
