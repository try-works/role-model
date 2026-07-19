Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `01 AS-IS`
Role: `analyst`
Bundle Path: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/review-bundles/phase1-as-is-analyst.md`
Artifact Path: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/01-as-is.md`
Artifact Content Hash: `b77199895db8357491b51767b82b4aa4ea7833ef44c6c508f26601cf49d9e08c`
GeneratedAt: `2026-07-18T23:54:37Z`

## Bundle Scope
- Canonical delegated review bundle for recursive-mode audit/review work.
- Regenerate this bundle if the draft, changed files, or required evidence changes materially before review.

## Routing
- Routed CLI: `none`
- Routed Model: `none`
- Routing Config Path: `none`
- Routing Discovery Path: `none`

## Diff Basis
- Baseline type: `local commit`
- Baseline reference: `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`
- Comparison reference: `working-tree`
- Normalized baseline: `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`

## Changed Files Reviewed
- none

## Upstream Artifacts To Re-read
- `.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-requirements.md`
- `.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-worktree.md`

## Relevant Addenda
- `.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md`

## Prior Recursive Evidence
- `.recursive/memory/patterns/git-push-merge-workflow.md`
- `.recursive/memory/patterns/github-ci-and-release-workflow.md`
- `.recursive/memory/skills/SKILLS.md`
- `.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Control-Plane Docs
- `.recursive/STATE.md`
- `.recursive/DECISIONS.md`

## Targeted Code References
- `.github/workflows/ci.yml`
- `.github/workflows/build-binaries.yml`
- `.github/workflows/docs-site-deploy.yml`
- `role-model-router/apps/launcher/main.go`
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `scripts/install.sh`
- `scripts/install.ps1`

## Evidence References
- `.recursive/run/78-dev-stage-main-cicd-runtime-channels/subagents/phase1-as-is-audit.md`

## Audit Questions
- `Final PASS re-audit recorded after controller repairs`

## Required Output
- `PASS`

## Notes
- Review output is invalid if it does not cite the upstream artifacts, diff basis, changed files, and final verdict.
- If this bundle is incomplete, reject delegation and perform the audit as self-audit.
