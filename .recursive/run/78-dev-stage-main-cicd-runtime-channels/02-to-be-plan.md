Run: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-19T00:12:45Z`
LockHash: `d71ba14ab9f2d3cb710f7328f389197ac85de3c63e70413e567110d8df69298e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-requirements.md` (LOCKED)
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/00-worktree.md` (LOCKED)
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/01-as-is.md` (LOCKED)
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` (LOCKED)
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/patterns/github-ci-and-release-workflow.md`
- `/.recursive/memory/patterns/git-push-merge-workflow.md`
Outputs:
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/02-to-be-plan.md`
Scope note: Define the test-first repository, workflow, packaged-runtime, documentation, and recoverable GitHub migration sequence; docs remain a single main-only deployment.

## TODO

- [x] Reconcile locked requirements, AS-IS, and docs addendum
- [x] Map R1-R9 to implementation, verification, and QA surfaces
- [x] Define RED-GREEN-REFACTOR sub-phases and stop gates
- [x] Define cross-platform runtime profile and compatibility behavior
- [x] Define recoverable GitHub migration order
- [x] Define rollback, security, and failure handling
- [x] Run independent Phase 2 audit
- [x] Repair findings and re-audit to PASS
- [x] Complete Coverage and Approval gates

## Audit Context

Audit Execution Mode: `subagent`
Subagent Availability: `available`
Subagent Capability Probe: `the Phase 1 analyst completed a bounded review and re-audit using the canonical bundle`.
Delegation Decision Basis: `the plan has locked inputs, explicit file/test surfaces, and bounded external mutations suitable for independent audit`.
Audit Inputs Provided:
- all paths under `Inputs`
- diff basis `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4 -> working-tree`
- planned workflow, runtime, installer, docs, and GitHub settings surfaces below

## Effective Inputs Re-read

- `00-requirements.md`: R1-R9, OOS1-OOS5, exact ports, state/scope identities, naming, and migration constraints.
- `00-worktree.md`: isolated worktree and normalized baseline.
- `01-as-is.md`: current GitHub topology, workflow triggers, runtime hard-coding, manifest evidence, and Unix raw-SEA behavior.
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md`: docs are PR-build plus one strictly main-only deployment; no dev/stage Pages topology.

## Earlier Phase Reconciliation

- Phase 0 fixed decisions remain effective except original R4, which the locked addendum narrows.
- Phase 1 proved stage/dev defaults must be consumed by both the Windows launcher and raw SEA CLI.
- Phase 1 clarified OAuth compatibility mirroring is a misleading duplicate scope within a selected root, not proven cross-root leakage; the plan still removes it for non-production channels.
- No product files have changed; Phase 3 starts with executable RED tests.

## Prior Recursive Evidence Reviewed

- `/.recursive/memory/patterns/github-ci-and-release-workflow.md`: keep workflow contract tests and distinguish repository workflow definitions from external settings.
- `/.recursive/memory/patterns/git-push-merge-workflow.md`: verify branch, remote URL, ahead/behind, and ancestry immediately around every push or promotion.
- `/.recursive/STATE.md` and `/.recursive/DECISIONS.md`: retain attributable runtime lanes, tag-only stable release publication, attestation retries, and visible docs credential skips.

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Summary: dev integration and dev-to-stage-to-main promotion.
- `R2` | Disposition: `in-scope` | Summary: branch protection and promotion-source enforcement.
- `R3` | Disposition: `in-scope` | Summary: deliberate required CI lanes.
- `R4` | Disposition: `in-scope` | Summary: effective addendum requires PR build plus main-only docs deploy.
- `R5` | Disposition: `in-scope` | Summary: stage candidates, manual dev artifacts, and tag-only releases.
- `R6` | Disposition: `in-scope` | Summary: explicit cross-platform packaged-runtime profiles.
- `R7` | Disposition: `in-scope` | Summary: lowercase channel identity and endpoint visibility.
- `R8` | Disposition: `in-scope` | Summary: contribution and operations policy.
- `R9` | Disposition: `in-scope` | Summary: workflow/migration/concurrent-runtime proof.

## Requirement Mapping

- `R1` | Coverage: `direct` | Source Quote: "Establish the three-branch integration and promotion contract" | Implementation Surface: `CONTRIBUTING.md`, `.github/pull_request_template.md` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: GitHub API branch/default/ancestry reads.
- `R2` | Coverage: `direct` | Source Quote: "Protect branches and enforce promotion sources" | Implementation Surface: `.github/workflows/ci.yml` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: GitHub API protection reads and promotion-source matrix.
- `R3` | Coverage: `direct` | Source Quote: "Restructure CI into deliberate, diagnosable validation lanes" | Implementation Surface: `.github/workflows/ci.yml` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: GitHub checks on the implementation PR.
- `R4` | Coverage: `merged` | Source Quote: "Provide separated development, staging, and production docs deployments" | Implementation Surface: `.github/workflows/docs-site-deploy.yml` | Verification Surface: `apps/docs-site/scripts/docs-site-deploy-workflow.test.mjs` | QA Surface: main-only condition inspection and production URL health. | Merge Rationale: the approved addendum replaces three docs deployments with PR build plus one main deployment.
- `R5` | Coverage: `direct` | Source Quote: "Align binary candidate and production release promotion" | Implementation Surface: `.github/workflows/build-binaries.yml`, `role-model-router/apps/runtime-host-bridge/src/package-sea.ts` | Verification Surface: `scripts/build-binaries-workflow.test.mjs` | QA Surface: dev/stage/prod manifest and archive identity.
- `R6` | Coverage: `direct` | Source Quote: "Add an explicit packaged-runtime channel profile" | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/runtime-channel.ts`, `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/launcher/main.go` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-channel.test.ts`, `role-model-router/apps/launcher/main_test.go` | QA Surface: three live runtimes and isolated state roots.
- `R7` | Coverage: `direct` | Source Quote: "Make channel identity visible and consistently named" | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/runtime-channel.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `docs/public/install.md` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-version.test.ts` | QA Surface: health/version/UI identity on all ports.
- `R8` | Coverage: `direct` | Source Quote: "Update repository policy and operations documentation" | Implementation Surface: `CONTRIBUTING.md`, `.github/pull_request_template.md`, `docs/operations/02-ci-and-release-flow.md`, `docs/operations/03-release-checklist.md` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: rendered policy review.
- `R9` | Coverage: `direct` | Source Quote: "Prove migration safety and concurrent runtime operation" | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-channel.test.ts`, `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/` | Verification Surface: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/04-test-summary.md` | QA Surface: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/05-manual-qa.md`.

## Plan Drift Check

- The docs addendum removes development/staging Pages projects and environments from the original scope.
- Cross-platform profile consumption adds `cli.ts` and Unix installer coverage discovered in Phase 1; this is required to satisfy the original concurrent-runtime requirement.
- Production-only legacy compatibility is preserved; stage/dev never consult production state or compatibility scopes.
- No automatic promotion, history rewrite, shared state, unrelated API redesign, or new distribution ecosystem is introduced.

## Design Decisions

1. Runtime build channels are `production`, `stage`, and `development`; trusted workflow/local input is `ROLE_MODEL_BUILD_CHANNEL` and unknown values fail packaging.
2. Profiles are: production `role-model/3456/role-model-runtime/standalone-runtime`; stage `role-model-stage/3457/role-model-runtime-stage/standalone-runtime-stage`; development `role-model-dev/3458/role-model-runtime-dev/standalone-runtime-dev`.
3. Local packaging defaults to `development` as the collision-safe choice; explicit `production` is required for stable release packaging.
4. `manifest.json` is the portable profile contract. Both raw SEA startup and the Windows Go launcher read it; explicit CLI arguments remain test/operator overrides.
5. The packaged binary is channel-neutral. The manifest separates `source_tree` (Git tree OID), `executable_sha256` (final named executable bytes), and `core_payload_sha256` (the raw SEA executable bytes before thin profile/launcher staging). Source-tree equality is diagnostic only. Stage uploads attested per-target core payloads named by source tree; a production tag must retrieve the matching successful stage core and reuse it, or deterministically rebuild and byte-compare before proceeding. A missing/mismatched stage digest fails production packaging.
6. Default state roots use the platform user state/cache base plus the profile's exact root name. Production owns a copy-only, first-start cross-root migration from both legacy layouts: Windows `Role Model Runtime/standalone-runtime/**` and raw-SEA `Role Model Runtime/state/runtime-host-bridge/**`, mapped into canonical `role-model-runtime/standalone-runtime/**`. It covers credentials, codex-subscription state, memory SQLite/sidecars, and scoped `operator-intent.json`, plus the applicable root/state runtime config and policy/override/peer JSON. Destination files win; otherwise the Windows standalone source wins a conflicting raw-SEA source, byte-identical duplicates copy once, and every skipped conflict is recorded without deleting either source. Logs, PID/lock/temp files are excluded; stage/dev never inspect the title-case root.
7. Health/version/runtime summary expose channel, name, effective endpoint, commit/version/build date, source-tree hash, and executable hash when available.
8. CI jobs have stable names: `promotion-guard`, `quality`, `build-test`, `runtime-critical`, `runtime-router`, `rust`, and `smoke`. Each has read-only permissions, timeout, frozen install, and concurrency cancellation.
9. PRs to stage accept only `dev`; PRs to main accept only `stage`, except reviewed `hotfix/*` emergency PRs. Dev accepts ordinary short-lived branches.
10. Binary matrices run automatically for stage candidates and production tags; dev artifacts require explicit dispatch. Only tags publish stable releases through `release`.
11. Docs build on relevant PRs and deploy only when `github.ref == refs/heads/main`; manual runs from another ref cannot deploy.
12. External GitHub changes occur only after repository tests pass: create/update branches without force, configure protections, then change default to dev and verify. Cloudflare topology is not expanded.

## Planned Changes by File

- `.github/workflows/ci.yml`
- `.github/workflows/build-binaries.yml`
- `.github/workflows/docs-site-deploy.yml`
- `scripts/ci-workflow.test.mjs` (new)
- `scripts/build-binaries-workflow.test.mjs`
- `apps/docs-site/scripts/docs-site-deploy-workflow.test.mjs`
- `role-model-router/apps/runtime-host-bridge/src/runtime-channel.ts` (new)
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- focused host tests including `runtime-channel.test.ts`, `runtime-version.test.ts`, `executable.test.ts`, and `index.test.ts`
- `role-model-router/apps/launcher/main.go` and `main_test.go`
- `scripts/install.sh`, `scripts/install.ps1`, and installer assertions
- `CONTRIBUTING.md`, `.github/pull_request_template.md`, `.codex/AGENTS.md`
- `docs/operations/02-ci-and-release-flow.md`, `03-release-checklist.md`, and runtime testing/installation docs
- root/package script wiring only where needed for named contract tests.

## Implementation Steps

1. SP1: write failing workflow topology/promotion/docs/binary tests, then update workflows.
2. SP2: write failing runtime-profile/version/options tests, then add the canonical profile and manifest contract.
3. SP3: write failing Go/CLI/packaging/installer tests, then make all packaged launch paths consume the profile.
4. SP4: write failing metadata/isolation tests, then expose identity and restrict legacy compatibility to production.
5. SP5: update policy/operations docs with contract assertions.
6. SP6: run focused/full validation, build three local profiles, and execute concurrent-runtime QA.
7. SP7: apply recoverable GitHub topology/protections/settings and capture before/after evidence; leave Cloudflare project topology unchanged.

## Implementation Sub-phases

### SP1 — Workflow topology and promotion guard (`R1`-`R5`, `R8`)

- RED: add contract tests that fail on broad push triggers, mutable install, missing concurrency/permissions/timeouts, invalid promotion acceptance, arbitrary-ref docs deploy, absent stage matrix, and ambiguous artifact names.
- GREEN: split stable CI jobs; add promotion guard; make docs deploy strictly main-only; make binary channel selection explicit with stage candidates, manual dev artifacts, and tag-only releases.
- REFACTOR: centralize repeated workflow assertions in test helpers without hiding check names.
- Gate: invalid `feature -> stage`, `feature -> main`, and `dev -> main` fixtures fail; `feature -> dev`, `dev -> stage`, `stage -> main`, and `hotfix/* -> main` pass.
- Recovery: workflow-only changes can be reverted before any external setting requires their check names.

### SP2 — Canonical runtime channel/profile contract (`R5`-`R7`)

- RED: profile resolver rejects unknown channels and asserts all exact names/ports/state roots/scope IDs; version/profile manifest tests require channel/name/endpoint, `source_tree`, `executable_sha256`, and real `core_payload_sha256` identity; workflow tests fail production without a matching successful stage payload.
- GREEN: add `runtime-channel.ts`; package `manifest.json` with separated profile/source/executable/core identities; stage uploads attested per-target channel-neutral cores; production reuses or deterministically verifies exact stage core bytes; default local packaging to development and workflow packaging explicitly by ref/input.
- REFACTOR: one typed resolver owns channel constants; no duplicate TS port/name tables.
- Gate: production remains 3456 and Pi default is unchanged; stage/dev are 3457/3458.
- Recovery: manifest additions are backward compatible; missing manifests retain production source-development defaults.

### SP3 — Cross-platform packaged launch behavior (`R6`, `R7`, `R9`)

- RED: Go tests require manifest-derived args/base URLs/names; CLI tests execute an extracted Unix install layout outside `role-model-router/dist/release/*` and require adjacent-manifest package-root/static/vendor resolution; installer/package tests require lowercase channel executables and launchers. Missing manifest is allowed only for explicit source-development layout and fails visibly for an extracted official package.
- GREEN: raw CLI and Windows launcher read the adjacent manifest; packaged repoRoot resolves to the adjacent package directory so static and staged vendor assets remain addressable after installation; package executable/launcher/batch names follow profile; installers resolve channel-appropriate assets/commands without stable-channel regressions.
- REFACTOR: explicit CLI arguments override profile defaults consistently; one manifest schema is mirrored minimally in Go.
- Gate: Unix raw executable and Windows launcher produce the same effective profile.
- Recovery: malformed/missing manifest fails visibly for official packages; source-development fallback remains explicit and tested.

### SP4 — Runtime identity and state/credential isolation (`R6`, `R7`, `R9`)

- RED: health/version/summary tests require name/channel/endpoint/build identity; credential-location tests prove stage/dev return only active locations; state tests prove distinct roots; cross-root fixtures cover Windows `standalone-runtime` and raw-SEA `state/runtime-host-bridge` credentials, subscriptions, memory SQLite/sidecars, operator intent, root/state configs, destination-wins and standalone-over-raw precedence, byte-identical duplicates, excluded logs/locks, repeat start, and stage/dev zero reads of the title-case root.
- GREEN: thread profile metadata through backend/server responses and discovery; implement copy-only production migration before backend initialization; make legacy config/OAuth mirroring production-only; replace new identity strings with exact lowercase names.
- REFACTOR: metadata builders are pure and reusable by health/version/summary.
- Gate: a write/restart in one profile cannot change another root and stopping one process does not affect the other two.
- Recovery: production legacy migration is copy-once and never deletes the legacy source.

### SP5 — Repository and operations policy (`R1`, `R2`, `R5`, `R7`, `R8`)

- RED: documentation contract assertions fail until target branches, promotion, hotfix, rollback, artifact identity, endpoints, and docs exception are documented.
- GREEN: update contribution/PR/recursive guidance and CI/release/checklist/install/runtime testing docs.
- Gate: exact examples include `ROLE_MODEL_ENDPOINT=http://127.0.0.1:3457` and `:3458`; canonical spelling is `role-model`.
- Recovery: documentation follows tested workflow/profile constants and cannot broaden deployment scope.

### SP6 — Automated and concurrent-runtime validation (`R3`, `R5`-`R9`)

- Run focused workflow, TS, Go, installer, version, host, packaging, lint, schema, build, test, runtime, Rust, smoke, and docs checks according to changed-path matrix.
- Package production, stage, and development with fixed build identity into separate retained evidence directories.
- Start all three on 3456/3457/3458 with separate temporary state roots; verify metadata/UI/discovery; mutate and restart one; stop one; verify the other two.
- Gate: no shared state/log/lock/PID paths; source-tree identity is comparable; executable hashes are reported honestly.
- Recovery: processes use explicit PIDs and temporary roots; cleanup targets only verified run-78 evidence paths.

### SP7 — Recoverable GitHub migration (`R1`, `R2`, `R4`, `R9`)

- Snapshot remote/default/branch tips/protections/environments/settings and preserve the exact current main CLA-only protection payload for rollback.
- Create the missing `dev` ref once from the validated main baseline through the GitHub refs API/non-force creation. Do not change the default or main protection yet.
- Push this run branch, open its PR against `dev`, and observe a successful run of every stable check name. Apply dev protection only after those contexts exist; if checks or protection fail, dev remains non-default and main retains its original protection.
- Merge the reviewed run PR to dev, then open a reviewed `dev -> stage` promotion PR. Align stale stage only through that merge commit—never by direct ref update—and observe promotion checks on the actual PR.
- After dev/stage checks are proven, protect stage. Open/verify a `stage -> main` promotion PR and observe check names before replacing main's CLA-only protection with the complete main policy. On failure, restore the captured main payload exactly.
- Protect main, enable delete-on-merge, and change default to dev last. Each mutation is independently read back; a failed later step restores only settings already changed and leaves existing protected branches protected.
- Keep `release`; add only runtime candidate/production environments if workflows actually reference them. Do not create dev/stage docs Pages projects or move `role-model.dev`.
- Gate: final API receipt records default, tips, protections, environments, merge settings, and no destructive history rewrite.
- Recovery: default can be restored to main; protections/settings are captured before mutation; branches are never force-updated or deleted.

## Testing Strategy

- Workflow contract: Node tests for CI, promotion guard, docs main-only behavior, binary channel matrix/names/publication.
- Runtime unit: profile resolver, option precedence, manifest/version metadata, credential location, discovery identity.
- Launcher: `GO111MODULE=off go test ./...` with production/stage/dev manifest fixtures.
- Packaging: focused executable/package tests plus three profile packages; validate no QA artifacts.
- Regression: frozen install, lint, schemas, build, test, runtime critical/router, Rust, smoke, docs build.
- Live QA: three concurrent processes with fixed local ports and temporary state roots.
- External: GitHub API before/after receipt and first workflow check-name verification.
- Payload promotion: attested stage core download/reuse or deterministic core byte comparison; source-tree equality alone never passes the gate.

## Playwright Plan (if applicable)

- No new browser interaction behavior is planned, so a new Playwright spec is not the primary regression surface.
- Existing runtime browser smoke remains in the changed-path matrix. Live QA fetches each packaged `/app` page and verifies same-origin API/endpoint identity; if profile changes alter browser launch or visible UI behavior, add a focused Playwright case before implementation closeout.

## Manual QA Scenarios

1. Start production, stage, and development packages concurrently and verify 3456/3457/3458 metadata.
2. Write configuration in development, restart it, and prove production/stage state timestamps and contents remain unchanged.
3. Stop stage and prove production/development health and UI remain available.
4. Exercise Windows manifest-derived launcher arguments through Go tests and Unix raw-SEA startup through a local package.
5. Inspect allowed/rejected promotion-source fixtures and the final GitHub branch/protection/default state.
6. Verify the docs workflow cannot deploy a manually selected non-main ref and that the current production docs URL remains healthy.

## Idempotence and Recovery

- Re-running branch creation is a no-op when the expected tip already exists; mismatched tips stop the migration.
- Protection/settings writes use read-before-write payloads and are verified after each mutation.
- Runtime legacy migration copies only missing production configuration and never deletes the source; repeated starts do not recopy over canonical state.
- If a production migration copy fails, startup stops before opening the new database and leaves both source and already-existing destination files intact for inspection.
- Packaging removes only the selected release target and each channel's evidence copy is retained separately.
- QA cleanup records exact PIDs and temporary roots before stopping/removing them.

## Security and Permissions Plan

- Workflows declare least-privilege permissions; only attestation/release jobs receive write scopes already required.
- `pull_request_target` remains confined to the CLA workflow; promotion guard runs untrusted PR data without secrets.
- Docs deployment credentials are available only to a main-only deploy job and never to PR builds.
- Runtime manifests contain no secrets; channel identity cannot redirect state outside the platform-owned base directory.
- GitHub writes are repository-scoped, read-before-write, non-force, and independently verifiable.

## Failure and Recovery Plan

- A failing workflow contract blocks external migration.
- A failing channel package blocks GitHub protection/default-branch changes.
- A stage candidate never promotes automatically and a failed/skipped approval cannot publish production.
- If required check names differ on GitHub, leave protections unchanged until actual names are observed.
- If the Cloudflare production project/domain cannot be safely established, retain existing docs deployment target and report the external blocker; do not detach `role-model.dev`.
- Concurrent QA cleanup stops only recorded PIDs and removes only validated run-78 temporary roots.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`
- Comparison reference: `working-tree`
- Normalized baseline: `8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8863fdc5ab0afc43ed3e86dbcab35b2ca9d2c0b4` plus untracked status.
- Planned product files: paths under `## Planned Changes by File`.
- Actual product changes: none before plan lock.
- Unexplained drift: none; only run-78 recursive artifacts exist.

## Subagent Contribution Verification

- Reviewed Action Records: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/subagents/phase2-plan-audit.md`.
- Main-Agent Verification Performed:
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/02-to-be-plan.md`
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/review-bundles/phase2-plan-planner.md`
  - `/.github/workflows/ci.yml`
  - `/.github/workflows/build-binaries.yml`
  - `/.github/workflows/docs-site-deploy.yml`
  - `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`
  - `/role-model-router/apps/launcher/main.go`
  - `/scripts/install.sh`
  - `/scripts/install.ps1`
- Acceptance Decision: accepted
- Refresh Handling: `the canonical Phase 2 review bundle was regenerated after each material repair and the final bundle matched the accepted plan`.
- Repair Performed After Verification:
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/02-to-be-plan.md`
  - `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/review-bundles/phase2-plan-planner.md`

## Gaps Found

None. The independent audit's four initial gaps and one re-audit migration gap were repaired; no unmapped plan gap remains.

## Repair Work Performed

- Replaced source-tree-as-payload proof with separated source tree, executable digest, and attested real core payload digest plus a production reuse/byte-compare gate.
- Added extracted Unix installation layout, adjacent package-root, static/vendor, and missing-manifest behavior.
- Sequenced dev creation, PR checks, promotions, protections, main rollback, and default-branch change into recoverable steps.
- Defined copy-only migration from both Windows and raw-SEA legacy production layouts with durable-path inventory and precedence fixtures.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: `CONTRIBUTING.md`, `.github/pull_request_template.md` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: GitHub branch/default/ancestry receipt.
- R2 | Status: planned | Implementation Surface: `.github/workflows/ci.yml` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: GitHub protection and promotion-source receipt.
- R3 | Status: planned | Implementation Surface: `.github/workflows/ci.yml` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: GitHub required-check receipt.
- R4 | Status: superseded by approved addendum | Addendum: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` | Audit Note: effective behavior is planned in SP1/SP7 without extra Pages projects.
- R5 | Status: planned | Implementation Surface: `.github/workflows/build-binaries.yml`, `role-model-router/apps/runtime-host-bridge/src/package-sea.ts` | Verification Surface: `scripts/build-binaries-workflow.test.mjs` | QA Surface: channel artifact receipt.
- R6 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/runtime-channel.ts`, `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/launcher/main.go` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-channel.test.ts`, `role-model-router/apps/launcher/main_test.go` | QA Surface: concurrent runtime receipt.
- R7 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/runtime-channel.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `docs/public/install.md` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-version.test.ts` | QA Surface: exact identity/endpoint receipt.
- R8 | Status: planned | Implementation Surface: `CONTRIBUTING.md`, `.github/pull_request_template.md`, `docs/operations/02-ci-and-release-flow.md` | Verification Surface: `scripts/ci-workflow.test.mjs` | QA Surface: policy review receipt.
- R9 | Status: planned | Implementation Surface: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/evidence/` | Verification Surface: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/04-test-summary.md` | QA Surface: `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/05-manual-qa.md`.

## Audit Verdict

- Summary: independent planner audit returned PASS after all payload, installed-layout, migration-order, and legacy-state repairs.
Audit: PASS

## Traceability

- `R1` -> SP1, SP5, SP7.
- `R2` -> SP1, SP7.
- `R3` -> SP1, SP6.
- `R4` -> approved addendum, SP1, SP7.
- `R5` -> SP1, SP2, SP6.
- `R6` -> SP2-SP4, SP6.
- `R7` -> SP2-SP5, SP6.
- `R8` -> SP5.
- `R9` -> SP1-SP7.

## Coverage Gate

- [x] R1-R9 map to implementation, verification, and QA
- [x] Effective docs addendum is reconciled
- [x] Windows and Unix package launch paths are covered
- [x] GitHub migration is ordered, recoverable, and non-destructive
- [x] OOS1-OOS5 remain excluded

Coverage: PASS

## Approval Gate

- [x] User approved implementation after tracker creation
- [x] User narrowed docs topology and the plan honors it
- [x] External writes wait for repository validation
- [x] No destructive history or production-domain move is planned

Approval: PASS
