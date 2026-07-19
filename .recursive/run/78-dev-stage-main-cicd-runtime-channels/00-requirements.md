Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-18T23:33:39Z`
LockHash: `210fbbc8fab34c3623b916cc9e97bb50df0a4a176ab91bb0f83645d28b1d92a2`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- GitHub tracker `https://github.com/try-works/role-model/issues/61`
- approved user proposal for `dev -> stage -> main` promotion
- approved user requirement that development, stage, and production runtime builds run concurrently
- user correction that the canonical product name is exactly `role-model`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/patterns/github-ci-and-release-workflow.md`
- `/.recursive/memory/patterns/git-push-merge-workflow.md`
Outputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-requirements.md`
Scope note: Establish the repository, GitHub, deployment, release, and packaged-runtime contracts for an enforceable development-to-production promotion pipeline with concurrently runnable channel builds.

## TODO

- [x] Capture the approved tracker as the source requirement
- [x] Define stable requirement identifiers and observable acceptance criteria
- [x] Preserve the canonical `role-model` naming correction
- [x] Define out-of-scope boundaries
- [x] Record migration, safety, and verification constraints
- [x] Complete the Coverage Gate
- [x] Record the user's implementation approval

## Goal

Normal feature, fix, and recursive run branches enter through `dev`, are promoted as a tested release candidate to `stage`, and reach production only through `main`. The workflows and GitHub protections must enforce that path. Official packaged runtimes from all three channels must be installable and runnable together on one device without sharing ports, state, locks, logs, or process identity.

## Fixed Decisions

1. The long-lived promotion branches are `dev`, `stage`, and `main`.
2. `dev` is the default integration and GitHub default branch; `main` remains production truth.
3. Normal feature, fix, dependency, and `recursive/*` work branches from and targets `dev`.
4. Normal PRs into `dev` use squash merge; `dev -> stage` and `stage -> main` promotions preserve ancestry with merge commits.
5. Production hotfixes branch from `main`, land through a reviewed PR, and are forwarded to `stage` and `dev`.
6. Production uses `role-model` on port `3456`; stage uses `role-model-stage` on `3457`; development uses `role-model-dev` on `3458`.
7. The exact canonical product spelling is lowercase and hyphenated: `role-model`. New user-facing channel identities must not use `Role Model`.
8. Channel identity is supplied explicitly by trusted build workflows, not inferred from mutable Git state at runtime.
9. Core runtime payload identity should remain channel-neutral where practical; thin launch profiles may vary by channel, and promotion evidence must record the core payload hash.
10. CI validation, deployment authorization, and release publication remain separate concerns.

## Requirements

### R1 — Establish the three-branch integration and promotion contract

Acceptance criteria:

- create `dev` from the approved current `main` migration baseline
- bring `stage` to the same migration baseline before the first promotion
- make `dev` the GitHub default branch
- document and enforce that `feature/*`, `fix/*`, dependency, and `recursive/*` PRs target `dev`
- document squash merge for ordinary work and merge-commit promotion for `dev -> stage -> main`
- enable automatic deletion of merged short-lived branches
- document stabilization and production-hotfix forward-merge behavior
- preserve `main` as the production source of truth

### R2 — Protect branches and enforce promotion sources

Acceptance criteria:

- protect `dev`, `stage`, and `main` from force pushes, deletion, and unreviewed direct changes
- require pull requests, resolved conversations, and required CI checks
- include administrators in enforcement
- require the CLA where external contributions first enter `dev` without redundantly blocking promotions
- add a required guard that rejects ordinary PRs to `stage` unless the head is `dev`
- add a required guard that rejects ordinary PRs to `main` unless the head is `stage`
- preserve an explicit, auditable emergency exception for approved `hotfix/*` work
- require maintainer approval for stage and production promotions
- make the configured GitHub rules match the repository documentation

### R3 — Restructure CI into deliberate, diagnosable validation lanes

Acceptance criteria:

- PR validation targets PRs into `dev`, `stage`, and `main`
- branch-push validation is limited to the long-lived branches where post-merge proof is useful
- dependency installation uses `pnpm install --frozen-lockfile`
- CI retains separately diagnosable quality, build/test, runtime-critical, runtime-router, Rust, and smoke responsibilities
- expensive cross-platform packaging does not run on every feature-branch push
- superseded runs cancel through explicit concurrency groups
- workflows use least-privilege permissions and bounded timeouts
- repo-owned workflow tests fail against the current topology before implementation and pass afterward
- the local `ci:check` parity command remains available

### R4 — Provide separated development, staging, and production docs deployments

Acceptance criteria:

- GitHub environments exist for `development`, `staging`, `production`, and `release`
- docs builds run for relevant PRs without deployment credentials
- successful `dev`, `stage`, and `main` pushes select the development, staging, and production deployment targets respectively
- target names are `role-model-dev`, `role-model-stage`, and `role-model`
- production and release use protected approval gates where GitHub supports them
- deployment jobs expose explicit environment, branch, project, URL, and commit identity
- missing deployment credentials produce a visible non-fatal skip for validation-only contexts
- post-deployment health verification and rollback guidance are documented
- Cloudflare project/config changes are made only through authenticated, inspectable commands; unavailable credentials are reported without inventing successful deployment state

### R5 — Align binary candidate and production release promotion

Acceptance criteria:

- `stage` builds the full supported platform matrix and publishes unambiguous stage-candidate artifacts
- production tags remain the only path that publishes a stable GitHub release
- matrix jobs retain archive checks, checksums, attestations, retry behavior, and packaging diagnostics
- dev artifacts, when explicitly requested or configured, are named with channel and commit identity
- stage artifacts include channel and commit identity and cannot be mistaken for stable production artifacts
- the verified channel-neutral core payload hash is recorded so production promotion can prove which code payload was tested on stage
- release publication, installer scripts, checksum manifests, and recursive release notes remain aligned

### R6 — Add an explicit packaged-runtime channel profile

Acceptance criteria:

- production defaults to name `role-model`, port `3456`, state root `role-model-runtime`, and scope id `standalone-runtime`
- stage defaults to name `role-model-stage`, port `3457`, state root `role-model-runtime-stage`, and scope id `standalone-runtime-stage`
- development defaults to name `role-model-dev`, port `3458`, state root `role-model-runtime-dev`, and scope id `standalone-runtime-dev`
- the trusted packaging workflow passes the channel explicitly and rejects unsupported channel values
- local packaging has a safe, documented default and supports an explicit channel override
- the launcher derives runtime arguments, frontend URL, health polling, shutdown, and state location from the selected profile
- channel-specific launch profiles isolate logs, PID/lock files, process identity, launcher/shortcut naming, artifact name, and child-service port allocation where those surfaces exist
- the runtime health/version/control-plane response reports channel, commit/version identity, and effective endpoint
- channel configuration does not change the Pi package's production default endpoint

### R7 — Make channel identity visible and consistently named

Acceptance criteria:

- new display names, executables, launchers, shortcuts, artifacts, logs, and documentation use `role-model`, `role-model-stage`, or `role-model-dev`
- no newly introduced user-facing string uses `Role Model`
- artifact names clearly distinguish dev SHA builds, stage SHA/candidate builds, and production version builds
- documentation shows explicit `ROLE_MODEL_ENDPOINT` examples for stage `http://127.0.0.1:3457` and dev `http://127.0.0.1:3458`
- discovery and UI connections use the effective runtime endpoint instead of a second hard-coded port

### R8 — Update repository policy and operations documentation

Acceptance criteria:

- `CONTRIBUTING.md` instructs contributors to branch from and target `dev`
- the PR template asks authors to confirm the correct target branch and real-behavior evidence
- recursive-run guidance targets `dev` for future run branches
- CI/release operations documentation explains validation lanes, promotions, environments, releases, hotfixes, rollback, and branch resynchronization
- release checklist reflects the `dev -> stage -> main` path and channel artifact evidence
- documentation and workflow contract tests prevent silent drift back to direct-main development

### R9 — Prove migration safety and concurrent runtime operation

Acceptance criteria:

- focused workflow, launcher, packaging, runtime-version, and documentation tests pass
- repository lint/build/test validation required by the changed-path test matrix passes
- a deliberate invalid promotion-source fixture is rejected by the guard tests
- official or locally equivalent development, stage, and production packages start simultaneously on ports `3458`, `3457`, and `3456`
- each channel returns the correct name, channel, commit/version, and endpoint
- writes and restarts in one channel do not modify the other channels' state roots
- stopping one channel leaves the other two healthy
- each channel's UI and discovery surfaces point to its own endpoint
- migration evidence records original and final default branch, branch tips, protections, environments, and workflow status
- no direct push or destructive history rewrite is used to establish the branch topology

## Out of Scope

### OOS1 — Shared runtime state across channels

Development, stage, and production must not share configuration, SQLite, logs, or lock state.

### OOS2 — Automatic promotion after a failed or unapproved stage

No workflow may silently promote a failed, skipped, or unapproved staging candidate.

### OOS3 — Public API redesign unrelated to channel metadata

The run may add channel/build metadata but does not otherwise redesign routing or OpenAI-compatible APIs.

### OOS4 — New distribution ecosystems

No npm, package-manager, container-registry, or app-store publishing channel is introduced solely for this migration.

### OOS5 — Destructive rewrite of existing branch history

Existing `main`, `stage`, tag, and release history is preserved.

## Constraints

- All product and workflow edits occur in the isolated run-78 worktree and feature branch.
- Phase 3 follows RED-GREEN-REFACTOR for executable behavior; configuration-only changes use an explicit pragmatic TDD exception plus contract tests.
- GitHub writes are applied only after the repository workflows and documentation defining them are validated.
- Branch creation and protection changes must be recoverable without force pushing or deleting history.
- Existing unrelated user changes in the controller checkout are not modified or staged.
- Windows Node, Vite, Vitest, Playwright, Go, and packaging commands run from the real worktree path.
- Cloudflare and GitHub configuration is inspected immediately before mutation so the final receipt records actual state rather than assumptions.
- Product naming is exactly `role-model`; title-case variants are not accepted for newly introduced channel identity.

## Coverage Gate

- [x] R1 covers long-lived branches, default targeting, merge modes, and hotfix synchronization
- [x] R2 covers protections, required checks, source guards, approvals, and emergency policy
- [x] R3 covers CI trigger scope, frozen installs, lanes, concurrency, and testability
- [x] R4 covers distinct deployment environments and Cloudflare targets
- [x] R5 covers stage candidates, production releases, artifacts, checksums, and payload identity
- [x] R6 covers channel profiles, ports, state, scope, launch behavior, and runtime metadata
- [x] R7 covers canonical naming and endpoint selection
- [x] R8 covers contribution, PR, recursive-run, operations, and release documentation
- [x] R9 covers automated validation, GitHub migration receipts, and three-channel concurrency QA
- [x] OOS1-OOS5 prevent shared state, unsafe promotion, unrelated API/distribution expansion, and history rewrites

Coverage: PASS

## Approval Gate

- [x] GitHub tracker #61 was created before implementation as requested
- [x] The user approved the proposal and then explicitly instructed implementation
- [x] The port allocation and canonical lowercase `role-model` naming match the user's corrections
- [x] Acceptance criteria distinguish repository changes from external GitHub/Cloudflare state
- [x] No implementation code or repository settings were changed before this requirements artifact was created

Approval: PASS

