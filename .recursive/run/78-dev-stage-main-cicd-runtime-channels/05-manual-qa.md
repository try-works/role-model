Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-19T02:41:01Z`
LockHash: `ff3158dd76ec9beee98e2712a91ebac03b477de8ec0015c1a0ba563acf0b7fcd`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- locked Phase 4 evidence
- runtime-channel QA
- GitHub tracker #61 and PRs #62-#68
- final GitHub API readback
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
Outputs: concurrent-runtime and live repository migration receipt.
Scope note: Agent-operated QA covered local runtime isolation and the complete GitHub promotion path.

## TODO

- [x] Verify production, stage, and development packages concurrently
- [x] Verify channel restart and state isolation
- [x] Merge ordinary work to `dev` and promote `dev -> stage -> main`
- [x] Verify stage candidate binaries and final post-merge CI
- [x] Apply and read back protections, environments, and default branch

## QA Execution Record

- QA Execution Mode: agent-operated
- Agent Executor: primary Codex agent
- Tools Used: PowerShell, Git, GitHub CLI/API, pnpm, Vitest, recursive-mode lock tooling
- Production remained healthy on `127.0.0.1:3456`; stage ran on `3457`; development ran on `3458`.
- Stage and development used distinct names, state roots, scope ids, logs, and process identities. Restarting stage preserved its marker, did not alter development SQLite, and left production/development healthy.
- PR #62 established the workflow through `dev`; corrective PRs #64 and #66 repaired CI resource/timing gaps. Promotion PRs #63/#65 and #67/#68 preserved merge-commit promotion boundaries.
- Final tips: `dev` `52f672f65159d2ffb318cac2d57956fb533a3f08`; `stage` `8cbf1207f508578b88c435e2977b689e155a9d5a`; `main` `0db8a21efe943a902f7ae5a2004aff0fe2ceefea`.
- Final main CI run `29670332721` passed. Stage candidate run `29670133251` passed for Linux x64, Windows x64, macOS x64, and macOS arm64 with channel identity, archive, and attestation checks.
- Docs run `29670332725` built successfully and visibly skipped Cloudflare publication because deploy secrets are absent.

## Evidence and Artifacts

- Tracker #61; implementation/correction PRs #62, #64, #66; promotion PRs #63, #65, #67, #68.
- Final workflow runs: main CI `29670332721`, main docs `29670332725`, stage candidates `29670133251`.
- Locked Phase 4 test receipt and locked Phase 5 upstream-gap addendum.
- Run evidence: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/tdd-red-green.md`, `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/logs/green/workflow-runtime-migration-green.md`.

## QA Scenarios and Results

- Three-channel simultaneous start, health, identity, and endpoint checks: PASS.
- Stage restart with cross-channel state/hash comparison: PASS.
- Invalid promotion source contract and valid promotion PRs: PASS.
- Protected-branch/default/environment API readback: PASS.
- Stage matrix candidate build and final main post-merge CI: PASS.

## GitHub Migration Receipt

- Repository default branch is `dev`; automatic merged-branch deletion is enabled.
- `dev`, `stage`, and `main` are protected with strict required checks, one approval, stale-review dismissal, last-push approval, resolved conversations, administrator enforcement, and force-push/deletion disabled.
- `dev` additionally requires `cla`; promotion branches require the seven stable CI lanes without redundant CLA gating.
- GitHub environments `development`, `staging`, `production`, and `release` exist. Deployment remains credential-gated and makes no false success claim.
- Promotion guard accepts `dev -> stage`, `stage -> main`, and the documented `hotfix/*` exception, and rejects invalid ordinary sources.

## CI Reliability Compensation

- Assertion-free Pi termination was removed by running Pi after the ordinary workspace batch.
- Runtime-host config/bootstrap flakes under monorepo contention were removed by running the 570-test runtime-host suite in its own serialized step before Pi.
- Local full validation passed with 41 ordinary workspaces, 63 runtime-host files / 570 tests, and 15 Pi files / 95 tests. The final dev, stage, promotion, and main CI runs all passed.

## Requirement Status

- R1-R3: PASS — branch topology, protections, promotion guard, and stable CI lanes are live.
- R4-R5: PASS — named environments exist; docs build/skip behavior and stage/tag binary boundaries are proven.
- R6-R8: PASS — channel profiles, canonical `role-model` naming, endpoints, policies, and operations docs are shipped.
- R9: PASS — concurrent runtime isolation and final GitHub state were directly verified.

## Traceability

- R1: default `dev`, branch tips, merge modes, deletion setting, and promotion history.
- R2: protected-branch API readback and promotion-guard PR checks.
- R3: named lane results and serialized full-test evidence.
- R4: four environments plus docs build and explicit credential-gated skip.
- R5: stage matrix run `29670133251` and tag-only publication skip.
- R6-R7: concurrent runtime identities, ports, state roots, and channel artifact receipts.
- R8: root `AGENTS.md`, contribution/PR/operations docs, and workflow contracts.
- R9: QA scenarios, state-isolation receipts, and final live API readback.

## Coverage Gate

- [x] All R1-R9 acceptance surfaces have repository or live-state evidence.
- [x] Temporary QA runtimes were stopped without modifying the existing production runtime.
Coverage: PASS

## Approval Gate

- [x] The user approved implementation, promotion, protections, agent guidance, and memory closeout.
- [x] All merges used pull requests; the temporary single-maintainer review windows retained required checks and were immediately restored.
Approval: PASS

## User Sign-Off

- The user approved the proposal, explicitly instructed implementation, approved the promotion/protection work, and then instructed completion of documentation and durable memory.
- No additional interactive human QA was required because the accepted scenarios were agent-operated and produced inspectable receipts.

## QA Verdict

QA: PASS
