Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-18T23:54:38Z`
LockHash: `b51f958be58c4a9bc574e2ce354e48a640d102e31a5438476cb30142b7ea6df5`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-requirements.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-worktree.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- current repository, GitHub, and Cloudflare configuration
Outputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/01-as-is.md`
Scope note: This document captures the branch, workflow, release, docs deployment, and packaged-runtime behavior before changes.

## TODO

- [x] Re-read the locked Phase 0 artifacts and effective addendum
- [x] Create novice-runnable reproduction steps
- [x] Document current behavior for R1-R9
- [x] Identify code and configuration pointers
- [x] Record known unknowns and external-state evidence
- [x] Review relevant prior recursive evidence
- [x] Assemble the delegated audit context
- [x] Run the phase audit
- [x] Repair findings and re-audit to PASS
- [x] Create traceability mapping
- [x] Complete Coverage Gate
- [x] Complete Approval Gate

## Reproduction Steps (Novice-Runnable)

1. Open `D:\DEV\role-model\.worktrees\78-dev-stage-main-cicd-runtime-channels`.
2. Run `git branch --show-current` and confirm `recursive/78-dev-stage-main-cicd-runtime-channels`.
3. Run `git rev-parse HEAD` and confirm baseline `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`.
4. Run `git rev-list --left-right --count origin/main...origin/stage`; the observed result is `154 0`, so stage is stale and contains no unique commit.
5. Inspect `.github/workflows/ci.yml`, `.github/workflows/build-binaries.yml`, `.github/workflows/docs-site-deploy.yml`, `.github/workflows/cla.yml`, `CONTRIBUTING.md`, and `.github/pull_request_template.md`.
6. Run `gh api repos/try-works/role-model` and the branch-protection/environment API reads recorded below.
7. Run `wrangler pages project list --json`; only `role-model-dev` currently exists and owns `role-model.dev`.
8. Inspect `role-model-router/apps/launcher/main.go`, `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`, `runtime-version.ts`, and the cited `index.ts` state/credential paths.
9. Run the Phase 0 baseline commands: frozen install, workflow contract tests, launcher Go tests with `GO111MODULE=off`, and schema validation.

## Current Behavior by Requirement

- `R1`: blocked. GitHub defaults to `main`; `dev` does not exist; `stage` is 154 commits behind `main`; ordinary contribution docs branch from and target `main`; merged branches are not automatically deleted.
- `R2`: blocked. There are no repository rulesets. `main` requires only the `cla` context, does not require a PR review or resolved conversations, and does not enforce administrators. `stage` is unprotected and no promotion-source guard exists.
- `R3`: partially satisfied but blocked. CI exposes attributable steps and runtime lanes, but runs on every push/PR, uses `--frozen-lockfile=false`, has one serial job, lacks concurrency and explicit permissions, and is not a meaningful required check on `main`.
- `R4`: superseded by the approved addendum. The docs site builds on relevant PRs; main pushes deploy to `role-model-dev`, but `workflow_dispatch` can deploy an arbitrary selected ref because every non-PR event is accepted. It reports no GitHub environment and has no post-deploy health check. Effective scope is one strictly main-only docs deployment, not three Pages projects.
- `R5`: blocked. The binary matrix runs on `main`, tags, and manual dispatch; only tags publish releases. The package manifest already records executable SHA-256 and commit, but workflow/archive/artifact names lack channel/SHA identity, stage produces no candidate matrix, no channel field exists, and promotion evidence does not distinguish the channel-neutral core payload hash.
- `R6`: blocked. The Windows launcher hard-codes port `3456`, scope `standalone-runtime`, and a title-case cache directory. Packaging has no trusted channel input or profile manifest. Runtime health/version responses do not report the effective channel/name/endpoint.
- `R7`: blocked. Existing user-facing launcher/runtime strings and the Windows batch filename use title-case `Role Model`/`Role-Model`; stage/dev identities are absent. Pi correctly retains production endpoint `http://127.0.0.1:3456`, but stage/dev endpoint examples do not exist.
- `R8`: blocked. Contribution, PR, recursive, CI/release, and release-checklist docs describe direct-main development and do not define the promotion/hotfix/resynchronization contract.
- `R9`: blocked. Existing workflow and Go tests pass against the old topology. No invalid-promotion fixture, channel-profile tests, three-runtime concurrency test, state-isolation test, or final GitHub migration receipt exists.

## Relevant Code Pointers

- `.github/workflows/ci.yml`: current broad serial validation workflow.
- `.github/workflows/build-binaries.yml`: current main/tag/manual runtime matrix and release publication.
- `.github/workflows/docs-site-deploy.yml`: current single-site PR-build/main-deploy workflow.
- `.github/workflows/cla.yml`: current `cla` check and main-based CLA storage.
- `scripts/build-binaries-workflow.test.mjs`: binary-workflow contract test.
- `apps/docs-site/scripts/docs-site-deploy-workflow.test.mjs`: docs-workflow contract test.
- `CONTRIBUTING.md` and `.github/pull_request_template.md`: contributor target-branch contract.
- `role-model-router/apps/launcher/main.go`: hard-coded port, scope, state root, URLs, and launcher identity.
- `role-model-router/apps/launcher/main_test.go`: current launcher argument tests.
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`: packaging, manifest, Go launcher, and `Role-Model.bat` creation.
- `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`: current version/commit/build-date shape without channel metadata.
- `role-model-router/apps/runtime-host-bridge/src/index.ts`: health/summary/version endpoints, standalone migration, stored OAuth location mirroring, and title-case discovery identity.
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`: raw SEA startup path and default option resolution used by Unix installs.
- `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`: literal runtime display name and effective base URL routes.
- `scripts/install.sh`: Unix installer symlinks the raw SEA executable, so channel defaults must work without the Windows launcher.
- `scripts/install.ps1`: Windows installer currently depends on the title-case batch filename and stable-release asset names.
- `packages/pi-role-model/src/config.ts`: production endpoint default that must remain `3456`.
- `docs/operations/02-ci-and-release-flow.md` and `03-release-checklist.md`: current direct-main operations contract.

## Evidence

- Repository settings: `default_branch=main`, `delete_branch_on_merge=false`, and all three merge methods enabled.
- Branch topology: `origin/main...origin/stage` is `154 0`; `dev` is absent.
- Main protection: required checks are only `["cla"]`; administrator enforcement, PR review requirements, and conversation resolution are disabled; force pushes and deletion are disabled.
- GitHub environments: only `release` exists.
- Cloudflare Pages: only `role-model-dev` exists; its domains are `role-model-dev.pages.dev` and `role-model.dev`.
- `ci.yml` installs with `pnpm install --frozen-lockfile=false` and triggers on unfiltered pushes and pull requests.
- `build-binaries.yml` verifies and packages `Role-Model.bat`; archive names have platform but no channel/SHA identity.
- Launcher constants are `runtimePort=3456`, cache `Role Model Runtime`, and scope `standalone-runtime`.
- Stored OAuth location resolution maps every non-`standalone-runtime` scope to a `standalone-runtime` counterpart under the selected container root. Distinct roots prevent direct production-filesystem leakage, but stage/dev would still duplicate credentials under a misleading production scope name; compatibility mirroring must become production-only or explicitly channel-aware.
- Unix installation symlinks the raw SEA binary. Without a wrapper, it resolves port `3456`, title-case state, and scope `runtime-host-bridge`; channel defaults must therefore be consumed by the raw packaged executable, not only by the Windows launcher.
- Phase 0 passed frozen install, both existing workflow contract tests, Go launcher tests with `GO111MODULE=off`, and 37-schema/30-fixture validation.

## Known Unknowns

- The exact GitHub required-check names can only be finalized after the new workflows run once; protections must be applied after check-name validation.
- The current Cloudflare token can list projects, but domain movement is intentionally undecided because `role-model.dev` already serves from `role-model-dev`; the addendum removes any need to create dev/stage docs projects.
- Runtime packaging is cross-platform, while the friendly Go launcher is Windows-only. The raw SEA executable used by `install.sh` must read the same packaged profile as the launcher so Unix packages do not silently fall back to production defaults.
- Existing production state needs backward compatibility. Stage/dev must not participate in production legacy config or OAuth-location mirroring.

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: "Establish the three-branch integration and promotion contract" | Summary: establish dev integration and dev-to-stage-to-main promotion. | Owner: branch migration and contributor policy.
- `R2` | Disposition: `in-scope` | Source Quote: "Protect branches and enforce promotion sources" | Summary: protect branches and enforce promotion sources. | Owner: GitHub protections and promotion guard.
- `R3` | Disposition: `in-scope` | Source Quote: "Restructure CI into deliberate, diagnosable validation lanes" | Summary: deliberate required validation lanes. | Owner: CI workflow.
- `R4` | Disposition: `in-scope` | Source Quote: "Provide separated development, staging, and production docs deployments" | Summary: the approved addendum narrows this to PR build plus one strictly main-only deploy. | Owner: docs workflow and locked addendum.
- `R5` | Disposition: `in-scope` | Source Quote: "Align binary candidate and production release promotion" | Summary: stage candidates and tag-only stable releases. | Owner: binary workflow.
- `R6` | Disposition: `in-scope` | Source Quote: "Add an explicit packaged-runtime channel profile" | Summary: explicit isolated runtime profiles on 3456/3457/3458. | Owner: runtime CLI, launcher, and packaging.
- `R7` | Disposition: `in-scope` | Source Quote: "Make channel identity visible and consistently named" | Summary: exact lowercase channel identity and endpoint visibility. | Owner: runtime identity and docs.
- `R8` | Disposition: `in-scope` | Source Quote: "Update repository policy and operations documentation" | Summary: update contribution and operations policy. | Owner: contributing and release docs.
- `R9` | Disposition: `in-scope` | Source Quote: "Prove migration safety and concurrent runtime operation" | Summary: prove concurrent operation and migration safety. | Owner: automated and manual QA.

## Prior Recursive Evidence Reviewed

- `/.recursive/STATE.md` entries for attributable CI lanes, docs secret-skip behavior, release attestation retry, and runtime test lanes.
- `/.recursive/DECISIONS.md` entries for workflow contract tests, single tag-gated release publication, recursive changelog generation, and GitHub-only validation caveats.
- `/.recursive/memory/patterns/github-ci-and-release-workflow.md`: preserve workflow contract tests and distinguish repository definitions from external settings.
- `/.recursive/memory/patterns/git-push-merge-workflow.md`: verify branch and ancestry around push/promotion operations.
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`: delegate only with a complete bundle and refresh evidence after repairs.

## Audit Context

Audit Execution Mode: `subagent`
Subagent Availability: `available`
Subagent Capability Probe: `collaboration agent accepted the bounded Phase 1 analyst task and returned file-backed FAIL then PASS re-audit verdicts`.
Delegation Decision Basis: `The locked requirements, approved addendum, baseline receipt, current repository files, and external configuration reads form a complete bounded audit bundle.`
Audit Inputs Provided:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-requirements.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-worktree.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/01-as-is.md`
- targeted workflow, launcher, CLI, packaging, installer, runtime metadata, credential-location, and operations files listed above

## Effective Inputs Re-read

- Locked `00-requirements.md` and `00-worktree.md` were re-read.
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` was re-read and changes effective `R4` to a single main-only docs deployment.
- Current GitHub repository/branch/environment state and Cloudflare Pages project state were read immediately before this audit.

## Earlier Phase Reconciliation

- Phase 0 branch/runtime decisions remain applicable.
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md`: effective `R4` is narrowed; no dev/stage Pages projects or docs environments will be planned.
- Phase 0 baseline commands remain green; the initial Go module-mode failure was a command-context correction, not a product failure.

## Subagent Contribution Verification

- Reviewed Action Records: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/subagents/phase1-as-is-audit.md`.
- Main-Agent Verification Performed:
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/01-as-is.md`
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/review-bundles/phase1-as-is-analyst.md`
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/subagents/phase1-as-is-audit.md`
  - `/.github/workflows/ci.yml`
  - `/.github/workflows/build-binaries.yml`
  - `/.github/workflows/docs-site-deploy.yml`
  - `/role-model-router/apps/launcher/main.go`
  - `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`
  - `/scripts/install.sh`
  - `/scripts/install.ps1`
- Acceptance Decision: accepted
- Refresh Handling: `the review bundle was regenerated after material repairs and its artifact hash matched the repaired 01-as-is.md`.
- Repair Performed After Verification:
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/01-as-is.md`
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/review-bundles/phase1-as-is-analyst.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`
- Comparison reference: `working-tree`
- Normalized baseline: `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4` plus `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/78-dev-stage-main-cicd-runtime-channels`
- Actual changed files reviewed: only the untracked run-78 recursive artifact directory.
- Unexplained drift: none.

## Gaps Found

None. Phase 1 has no unresolved analysis or audit gaps. The product/configuration deficiencies identified in `## Current Behavior by Requirement` remain planned implementation work for later phases.

## Repair Work Performed

- Locked the Phase 1 upstream-gap addendum that narrows docs deployment to PR validation plus one main-only deploy.
- Corrected docs manual-dispatch behavior, existing manifest hash/commit evidence, and the precise OAuth counterpart boundary after delegated review.
- Elevated `cli.ts`, both installers, credential-location compatibility, and cross-platform channel profile delivery into explicit planning constraints.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: dev/default-branch/topology settings and documentation are absent. | Blocking Evidence: GitHub repository settings, branch comparison, `CONTRIBUTING.md`.
- R2 | Status: blocked | Rationale: protections and promotion guard are absent. | Blocking Evidence: `.github/workflows/ci.yml`, `.github/workflows/cla.yml`
- R3 | Status: blocked | Rationale: current CI topology and mutable lockfile install do not meet the requirement. | Blocking Evidence: `.github/workflows/ci.yml`.
- R4 | Status: superseded by approved addendum | Addendum: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` | Audit Note: effective docs scope is PR build plus main-only deployment.
- R5 | Status: blocked | Rationale: the manifest has executable hash/commit, but stage candidates, channel-aware artifact identity, and explicit promotion/core-payload evidence are absent. | Blocking Evidence: `.github/workflows/build-binaries.yml`, packaging manifest.
- R6 | Status: blocked | Rationale: launcher and runtime metadata are production-hard-coded and channel isolation is absent. | Blocking Evidence: `role-model-router/apps/launcher/main.go`, `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`
- R7 | Status: blocked | Rationale: exact lowercase channel identity and endpoint docs are absent. | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`, `README.md`, `docs/public/install.md`
- R8 | Status: blocked | Rationale: policy and operations docs describe direct-main flow. | Blocking Evidence: `CONTRIBUTING.md`, `.github/pull_request_template.md`, `docs/operations/02-ci-and-release-flow.md`, `docs/operations/03-release-checklist.md`
- R9 | Status: blocked | Rationale: migration and concurrent-runtime proofs do not exist. | Blocking Evidence: `scripts/build-binaries-workflow.test.mjs`, `role-model-router/apps/launcher/main_test.go`, `role-model-router/apps/runtime-host-bridge/test/runtime-version.test.ts`

## Audit Verdict

- Summary: the delegated audit found five evidence-precision gaps; all were repaired, the bundle was refreshed, and independent re-audit returned PASS.
Audit: PASS

## Traceability

- `R1` -> branch/settings evidence in `## Current Behavior by Requirement` and GitHub reads.
- `R2` -> protection and guard evidence in `## Current Behavior by Requirement` and `.github/workflows/ci.yml`.
- `R3` -> CI trigger/install/lane evidence in `.github/workflows/ci.yml`.
- `R4` -> locked addendum plus `.github/workflows/docs-site-deploy.yml` and Cloudflare evidence.
- `R5` -> `.github/workflows/build-binaries.yml` and `package-sea.ts` manifest evidence.
- `R6` -> launcher, CLI, packaging, metadata, and credential-location evidence.
- `R7` -> naming and endpoint evidence in launcher/package/docs searches.
- `R8` -> contributor, PR, recursive, and operations documentation evidence.
- `R9` -> baseline test receipt and missing migration/concurrency coverage.

## Coverage Gate

- [x] Every R1-R9 requirement has current behavior and evidence
- [x] The approved docs-site scope correction is effective input
- [x] Repository, GitHub, Cloudflare, packaging, and runtime-state surfaces are covered
- [x] OOS1-OOS5 remain preserved

Coverage: PASS

## Approval Gate

- [x] The user approved implementation after tracker creation
- [x] The user explicitly narrowed docs-site deployment scope
- [x] No production repository, GitHub, or Cloudflare setting has been mutated during AS-IS audit

Approval: PASS
