Run: `/.recursive/run/12-router-runtime-hardening-operations/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T12:01:30Z`
LockHash: `52790323f7e61ea058ec162ab4ea9a8a3af27408a5b2a4699000a48eb38cd444`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
- `/.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`
- `/.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`
- `/.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/docs/architecture/05-memory-model.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/role-model-router/README.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/cli.ts`
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- `/role-model-router/vendor/llama-swap/proxy/ui_embed.go`
- `/role-model-router/vendor/llama-swap/README.md`
Outputs:
- `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 and Phase 1.5 findings for `12-router-runtime-hardening-operations` into a narrow implementation plan. The run will make clean host startup reproducible without leftover vendored UI output, add one stronger runtime-operations validation path and SQLite maintenance drill layer, and publish durable operator guidance for vendor updates, deployment/upgrade, validation/repair, and runtime-data backup/export/delete. It must not widen into run-13 MCP/tools work or broader frontend productization.

## TODO

- [x] Re-read the locked Phase 0, Phase 1, and Phase 1.5 artifacts plus the roadmap run-12 slice
- [x] Choose the concrete clean-startup repair strategy for the vendored host
- [x] Choose the operational validation and SQLite maintenance surfaces for run 12
- [x] Choose the operator-guidance document placement and README linkage
- [x] Define implementation sub-phases, verification commands, and manual QA scope
- [x] Complete the audited-phase sections and gates

## Repair Strategy Decision

- Selected startup-repair stance: keep the vendored host clean-startup-safe by embedding a small tracked fallback UI surface in the vendored proxy package and preferring the real upstream-built `proxy/ui_dist` tree only when it is present.
- Selected operations stance: keep the runtime-host bridge as the execution entrypoint, add one stronger `runtime:validate-operations` harness there, and extend `sqlite-memory` with explicit maintenance helpers for backup, restore, export, and delete drills rather than inventing a second persistence layer.
- Selected documentation stance: add one new repo-owned runtime-operations document under `docs/operations/` and link it from `role-model-router/README.md` so vendor refresh, deployment/upgrade, validation/repair, and SQLite maintenance instructions live beside the existing architecture docs rather than in ad hoc session notes.
- Reason this plan follows those choices:
  - Phase 1.5 proved the broken line is reproducibility of vendored host startup, not the runtime bridge or canonical artifact model.
  - A tracked fallback avoids committing large generated vendor assets and removes the hidden requirement that a previous worktree must have already built `ui_dist`.
  - Existing run-11 code already persists runtime observations and exposes structured inspection reads, so run 12 should build operational drills on top of those stable surfaces instead of redesigning persistence.
  - The roadmap requires durable operator guidance, not just a one-off fix, so the plan must leave behind one obvious runtime-operations reference and one strongest end-to-end validation command.

## Planned Changes by File

- `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`: define the concrete repair strategy, ops-doc placement, validation surface, and sub-phases for run 12.
- `/package.json`: add `runtime:validate-operations` and keep `runtime:validate-host`, `runtime:validate-observability`, `runtime:validate-state`, `runtime:validate-routing`, `runtime:validate-adapter`, and `smoke` intact.
- `/role-model-router/README.md`: link the new runtime-operations guide and summarize the clean-startup and validation command expectations for the runtime baseline.
- `/docs/operations/01-router-runtime-hardening-playbook.md`: add the durable operator-facing guide covering vendor update procedure, deployment/upgrade guidance, validation/repair playbooks, backup/restore drills, and deletion/export drills for runtime data.
- `/role-model-router/vendor/llama-swap/proxy/ui_embed.go`: replace the unreproducible `ui_dist`-must-exist startup assumption with logic that serves a tracked fallback surface when generated upstream UI assets are absent and serves the real `ui_dist` tree when it is present.
- `/role-model-router/vendor/llama-swap/proxy/ui_stub/index.html`: add the minimal tracked fallback UI artifact that guarantees vendored host compilation and a stable operator landing page on clean worktrees.
- `/role-model-router/vendor/llama-swap/proxy/ui_embed_test.go`: add focused Go tests first for fallback-versus-real UI selection so the clean-startup repair is proven before vendor production code is changed.
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`: preserve the existing host-integrated validation path while surfacing actionable host stdout/stderr on startup failures and reusing any shared host-start helper extracted for run 12.
- `/role-model-router/apps/runtime-host-bridge/src/validate-operations.ts`: add the stronger run-12 operational validator that exercises clean startup, host/operator log review, multi-scope isolation, replay/shadow routing evaluation, and SQLite maintenance drills.
- `/role-model-router/apps/runtime-host-bridge/test/validate-operations.test.ts`: add focused tests first for any extracted helper logic used by the new operational validator.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: add only the narrow helper exports needed for the new validator to reuse stable bridge/backend setup without changing request-serving semantics.
- `/role-model-router/packages/sqlite-memory/src/index.ts`: add explicit runtime-data maintenance helpers for backup, restore, export, and delete drills over the existing SQLite-first runtime state.
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`: add focused tests for the new SQLite maintenance helpers and scope-bounded runtime-data handling.
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`: update only if the chosen documented vendor-refresh procedure needs an explicit new recorded capture point or metadata field; otherwise keep the existing pinned `llama-swap` and `models.dev` entries unchanged.

## Implementation Steps

1. Repair the clean-startup defect at the actual boundary identified in Phase 1.5:
   - remove the hard assumption that generated `proxy/ui_dist` already exists in a fresh worktree,
   - embed one tracked fallback UI surface in the vendored proxy package,
   - prefer the real upstream-generated `proxy/ui_dist` tree when it exists,
   - keep the vendored host compiling and serving a sane landing surface even when no UI build has been run locally.
2. Add focused Go tests before the vendor repair so the clean-startup contract is explicit:
   - one test proving clean fallback behavior when `proxy/ui_dist` is absent,
   - one test proving the real generated `proxy/ui_dist` tree still wins when present,
   - one test proving the fallback continues to expose an index page rather than crashing the proxy package.
3. Improve operational failure evidence in the existing validator:
   - keep `runtime:validate-host` as the current host-integrated baseline check,
   - surface captured vendored host stdout/stderr on startup failure instead of only reporting a `/health` timeout,
   - factor any reusable host-start helper out of `validate-host.ts` only if that reduces duplication with the stronger run-12 validator.
4. Extend `sqlite-memory` with explicit maintenance helpers rather than inventing a new data store:
   - expose deterministic helpers for backup creation, restore-from-backup, runtime observation export, and scoped delete drills,
   - keep those helpers rooted in the existing SQLite-first store and current observation tables,
   - preserve existing maintenance-default semantics such as `backup.policy`, `deletion.policy`, `redaction.level`, and `retention.class`,
   - keep the drills scope-bounded by the existing runtime state root and scope identifiers.
5. Add one stronger operational validator at `runtime-host-bridge/src/validate-operations.ts` that uses the already-stable run-11 observation surfaces:
   - start from a clean worktree/runtime-state root,
   - run the strongest local host-integrated request path available,
   - read preserved raw host surfaces such as `/logs`, `/api/metrics`, and `/api/captures/:id`,
   - read structured role-model observation routes for recent requests and request/profile detail,
   - exercise multi-scope isolation by running the flow with at least two distinct `scopeId` values and proving their runtime data stays separated,
   - perform replay/shadow routing evaluation by re-routing persisted request input through the current deterministic router without pretending a second live execution path exists,
   - perform backup, restore, export, and delete drills against the runtime SQLite state and verify the expected post-drill read behavior,
   - record cache-observability receipts and explicitly document any still-nondeterministic cache-hit limits instead of faking warm-hit success.
6. Keep run-12 hardening honest about degraded behavior:
   - use the operational validator to force at least one degraded or unsupported-path outcome that still produces actionable diagnostics and log evidence,
   - treat that as evidence of the repair loop and explainable failure handling rather than as a new protocol or adapter redesign,
   - do not widen into new provider families or run-13 tool/MCP behavior.
7. Publish durable operator guidance as repo docs, not session-only knowledge:
   - document the vendor update procedure around the pinned vendor ledger and optional upstream UI refresh path,
   - document local-machine deployment and upgrade expectations for the single-host runtime baseline,
   - document the validation/repair loop, including which commands to run and which logs or structured reads to inspect first,
   - document backup/restore and deletion/export drills for runtime SQLite data,
   - document any remaining first-milestone limitations, especially if actual prompt-cache hits or shadow execution remain partially simulated rather than fully live.
8. Preserve the committed validation floor while strengthening it:
   - add `runtime:validate-operations`,
   - keep `runtime:validate-host` and `runtime:validate-observability` green on clean worktrees,
   - rerun `runtime:validate-state`, `runtime:validate-routing`, `runtime:validate-adapter`, `schemas:validate`, and `smoke`,
   - record inherited broader-baseline failures accurately if `build`, `test`, or upstream full `go test ./...` still fail for reasons outside run 12.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `C:\Program Files\Go\bin\go.exe test ./proxy`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`
- Direct run-12 validation paths:
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-operations`
- Regression checks:
  - `corepack pnpm run runtime:validate-state`
  - `corepack pnpm run runtime:validate-adapter`
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run smoke`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\12-router-runtime-hardening-operations --run-id 12-router-runtime-hardening-operations`
  - `git diff --name-only 16f0ddf9328f3578344fe8bf32c4d7f0ec983871`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 12 hardens host startup, operational validation, SQLite maintenance drills, and runtime/operator documentation; it does not add a browser UI workflow that requires Playwright.

## Manual QA Scenarios

1. **Fresh-worktree host startup**
   - Steps:
     - ensure `role-model-router/vendor/llama-swap/proxy/ui_dist` is absent in the active worktree
     - run `corepack pnpm run runtime:validate-host`
   - Expected:
     - the vendored host starts cleanly on the fresh worktree
     - the validator no longer depends on leftover generated UI assets
     - if startup fails, the validator prints actionable host stdout/stderr instead of only timing out on `/health`

2. **Operational validation and scope isolation**
   - Steps:
     - run `corepack pnpm run runtime:validate-operations`
     - inspect the emitted summary for the two distinct scope ids used by the drill
   - Expected:
     - the command proves two scope-bounded runtime-state paths remain isolated
     - logs, captures, structured request reads, and profile reads all remain attributable to the correct scope

3. **Runtime-data maintenance drills**
   - Steps:
     - run `corepack pnpm run runtime:validate-operations`
     - inspect the reported backup, export, delete, and restore drill results
   - Expected:
     - one export artifact is produced before deletion
     - scoped delete removes the targeted runtime-data slice only
     - restore repopulates the expected records from backup

4. **Ops-guide sanity check**
   - Steps:
     - read `docs/operations/01-router-runtime-hardening-playbook.md`
     - compare its commands and file references against `package.json`, `role-model-router/README.md`, and the vendor ledger
   - Expected:
     - the guide reflects the actual repo command surface and pinned vendor baseline
     - the guide explains what to inspect first when validation fails

## Idempotence and Recovery

- Re-running `runtime:validate-host`, `runtime:validate-observability`, and `runtime:validate-operations` must be safe; the validators should use temp runtime-state roots or isolated scopes so repeated runs do not corrupt durable local runtime state.
- Re-running the new vendored host fallback tests must not require an upstream UI build; the tracked fallback surface is the reproducible baseline, while the real `ui_dist` tree is only an optional higher-fidelity override.
- Backup, export, delete, and restore helpers must be safe to execute repeatedly in validation contexts; if a drill leaves state behind, the validator should clean it explicitly before succeeding.
- If a replay/shadow drill cannot reconstruct the needed routing input from persisted runtime observations without inventing new semantics, stop and explicitly document the remaining limitation in the new operations guide rather than faking coverage.
- If a real prompt-cache hit or local warm-state reuse cannot be produced deterministically in the current fixture path, record the limitation and validate the explicit observability receipts instead of manufacturing success-shaped output.

## Implementation Sub-phases

### SP1. Clean host startup reproducibility and failure evidence

Scope and purpose:
Repair the vendored host's clean-startup dependency on missing `proxy/ui_dist` and improve validator failure evidence so run 12 starts from a reproducible host-integrated baseline.

Requirement mapping: `R1`, `R3`, `R4`

Implementation checklist:
- [ ] Add focused Go tests first for fallback-versus-real UI selection
- [ ] Add the tracked fallback UI artifact under `vendor/llama-swap/proxy/ui_stub/`
- [ ] Update `vendor/llama-swap/proxy/ui_embed.go` to prefer real `ui_dist` when present and fallback UI when absent
- [ ] Update `runtime-host-bridge/src/validate-host.ts` to surface actionable startup evidence on failure

Tests for this sub-phase:
- `C:\Program Files\Go\bin\go.exe test ./proxy`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm run runtime:validate-host`

Sub-phase acceptance:
- A clean worktree with no prebuilt `proxy/ui_dist` can still start the vendored host and complete the host-integrated validation path, or at minimum emits actionable startup evidence instead of only a timeout symptom.

### SP2. SQLite maintenance helpers and strongest local operations validator

Scope and purpose:
Add the runtime-data drill layer required by run 12 and prove it through one stronger operational validator built on the existing host bridge and run-11 observation surfaces.

Requirement mapping: `R1`, `R3`, `R4`

Implementation checklist:
- [ ] Add focused tests first for SQLite backup, restore, export, and delete helpers
- [ ] Extend `sqlite-memory/src/index.ts` with explicit maintenance helpers
- [ ] Add `runtime-host-bridge/src/validate-operations.ts`
- [ ] Add focused tests first for the new operational-validator helper logic
- [ ] Reuse the existing bridge/backend setup to exercise multi-scope isolation, replay/shadow routing evaluation, degraded diagnostics, and runtime-data drills
- [ ] Add `runtime:validate-operations` to `/package.json`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/sqlite-memory test`
- `corepack pnpm --filter @role-model-router/sqlite-memory build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm run runtime:validate-operations`

Sub-phase acceptance:
- The repo has one deterministic local command that proves clean startup, host/operator evidence reads, scope isolation, replay/shadow routing comparison, and SQLite maintenance drills without weakening the existing runtime observation model.

### SP3. Durable operator guidance and final hardening validation

Scope and purpose:
Leave behind durable run-12 guidance and confirm the repaired runtime still preserves the committed validation floor while closing the router-runtime sequence honestly.

Requirement mapping: `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `docs/operations/01-router-runtime-hardening-playbook.md`
- [ ] Update `role-model-router/README.md` to point at the new playbook and current runtime validation commands
- [ ] Document the vendor update procedure using the existing vendor ledger and upstream build/update expectations
- [ ] Document deployment/upgrade guidance, validation/repair playbooks, backup/restore drills, deletion/export drills, and first-milestone caveats
- [ ] Rerun the committed runtime validation floor and distinguish inherited broader-baseline failures from new run-12 regressions

Tests for this sub-phase:
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:validate-operations`
- `corepack pnpm run runtime:validate-state`
- `corepack pnpm run runtime:validate-adapter`
- `corepack pnpm run runtime:validate-routing`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run smoke`
- `corepack pnpm run build`
- `corepack pnpm run test`

Sub-phase acceptance:
- The repo contains one durable run-12 operations guide, the repaired host-integrated validators are green on a clean worktree, and any remaining broader-baseline failures are explicitly evidenced rather than silently ignored.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`
- `/.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`
- `/.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`
- `/.recursive/run/11-router-runtime-observability-feedback/03-implementation-summary.md`
- `/.recursive/run/11-router-runtime-observability-feedback/04-test-summary.md`
- `/.recursive/run/10-router-runtime-host-integration/03-implementation-summary.md`
- `/.recursive/run/10-router-runtime-host-integration/04-test-summary.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills are available in this session.
Delegation Decision Basis: `Phase 2 required one controller-owned plan spanning vendored Go startup repair, runtime-host validation, SQLite maintenance drills, and repo operations documentation while preserving the locked architecture and observability boundaries.`
Delegation Override Reason: `Choosing the startup fallback strategy, the operational validator scope, and the durable doc placement required tightly coupled reasoning across the locked Phase 1 findings, the roadmap run-12 slice, and the existing run-11 observation surfaces.`
Audit Inputs Provided:
- `/.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
- `/.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`
- `/.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`
- `/.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/docs/architecture/05-memory-model.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/role-model-router/README.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/cli.ts`
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- `/role-model-router/vendor/llama-swap/proxy/ui_embed.go`
- `/role-model-router/vendor/llama-swap/README.md`
- Changed files:
  - `/.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
- `/.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`
- `/.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`
- `/.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/docs/architecture/05-memory-model.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/role-model-router/README.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/cli.ts`
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- `/role-model-router/vendor/llama-swap/proxy/ui_embed.go`
- `/role-model-router/vendor/llama-swap/README.md`

## Earlier Phase Reconciliation

- `/.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`:
  - claim carried forward: the clean merged baseline is blocked by a hidden vendored UI build dependency and both red runtime validators are downstream symptoms of that same starting-line defect.
  - current reconciliation: the selected plan repairs that exact defect first, then builds run-12 operational drills and docs on top of the already-stable run-11 observation surfaces.
- `/.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`:
  - claim carried forward: the root cause is an undeclared dependency on ignored/generated `proxy/ui_dist` assets plus symptom-only validator reporting.
  - current reconciliation: the plan fixes both lines directly by making vendored startup deterministic and by surfacing actionable startup evidence in the validator.
- `/.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`:
  - claim carried forward: downstream audited phases must execute from `D:\DEV\role-model\.worktrees\12-router-runtime-hardening-operations` using diff basis `16f0ddf9328f3578344fe8bf32c4d7f0ec983871`.
  - current reconciliation: the plan reuses that locked worktree and diff basis unchanged.
- `/docs/architecture/05-memory-model.md`, `/docs/architecture/06-router-runtime-architecture-lock.md`, and the roadmap run-12 section:
  - claim carried forward: run 12 must preserve SQLite-first state, explicit maintenance responsibilities, and the committed validation floor while adding operator guidance and hardening evidence.
  - current reconciliation: the selected SQLite maintenance helpers, operations validator, and docs/playbook placement preserve those boundaries without widening into new runtime architecture work.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`
  - `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/role-model-baseline.md`
  - `/docs/architecture/05-memory-model.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
  - `/package.json`
  - `/role-model-router/README.md`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/cli.ts`
  - `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
  - `/role-model-router/vendor/llama-swap/proxy/ui_embed.go`
  - `/role-model-router/vendor/llama-swap/README.md`
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `16f0ddf9328f3578344fe8bf32c4d7f0ec983871`
- Comparison reference: `working-tree`
- Normalized baseline: `16f0ddf9328f3578344fe8bf32c4d7f0ec983871`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 16f0ddf9328f3578344fe8bf32c4d7f0ec983871`
- Diff basis used: `git diff --name-only 16f0ddf9328f3578344fe8bf32c4d7f0ec983871`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/12-router-runtime-hardening-operations`
- Actual changed files reviewed:
  - `.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
  - `.recursive/run/12-router-runtime-hardening-operations/00-worktree.md`
  - `.recursive/run/12-router-runtime-hardening-operations/01-as-is.md`
  - `.recursive/run/12-router-runtime-hardening-operations/01.5-root-cause.md`
  - `.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`
- Unexplained drift:
  - none; the current working diff is limited to intentional run-12 recursive artifacts

## Gaps Found

- none beyond the concrete plan choices already captured in `## Repair Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`; the plan is specific enough to drive strict TDD implementation.

## Repair Work Performed

- Converted the run-12 defect from a vague “host hardening regression” into a concrete startup-fallback repair plus operator-guidance deliverable set.
- Chose one stronger runtime-operations validation command instead of scattering ad hoc hardening checks across unrelated packages or docs.
- Kept the plan grounded in the already-stable run-11 observation surfaces and SQLite-first memory model so run 12 hardens the assembled runtime rather than redesigning it.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines clean-startup repair, multi-scope validation, degraded diagnostics, replay/shadow evaluation, and cache-observability checks, but none of those hardening behaviors are implemented yet. | Blocking Evidence: `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts` | Audit Note: Phase 3 will harden the existing assembled runtime path rather than reopen protocol, routing, or provider-family scope.
- R2 | Status: blocked | Rationale: the plan now defines one runtime-operations guide plus README linkage, but the repo does not yet contain the durable vendor-update, deployment/upgrade, validation/repair, backup/restore, or deletion/export guidance required by run 12. | Blocking Evidence: `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`, `/role-model-router/README.md`, `/docs/architecture/05-memory-model.md`, `/role-model-router/packages/catalog/data/vendor-version-ledger.json` | Audit Note: Phase 3 will add one repo-owned playbook instead of scattering guidance across session artifacts.
- R3 | Status: blocked | Rationale: the plan now defines one stronger `runtime:validate-operations` path and the clean-startup fix needed before it can pass, but that stronger end-to-end validation surface does not exist in code yet. | Blocking Evidence: `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`, `/package.json`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts` | Audit Note: Phase 4 must distinguish unchanged broader-baseline failures from any new run-12 regression after the stronger local path is added.
- R4 | Status: blocked | Rationale: the plan now defines how host, adapter, SQLite, and control-plane evidence will be reviewed during validation, but the actual operational log-review and repair loop is not yet codified in code or docs. | Blocking Evidence: `/.recursive/run/12-router-runtime-hardening-operations/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`, `/docs/architecture/06-router-runtime-architecture-lock.md` | Audit Note: Phase 3 must make the repair loop executable, and the new playbook must tell operators where to look first when it fails.

## Audit Verdict

- Audit summary: the current plan is narrow, end-to-end, and consistent with the locked run-12 contract. It repairs the real clean-startup defect first, adds one stronger operational validation path over the existing runtime surfaces, and leaves behind durable runtime guidance without widening into later deferred work.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> the clean-startup repair, multi-scope/degraded/replay/shadow/cache hardening path, and operational validator are captured in `## Repair Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`.
- `R2` -> the vendor-update, deployment/upgrade, validation/repair, backup/restore, and deletion/export guidance plan is captured in `## Planned Changes by File`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R3` -> the strongest local end-to-end validation command and clean-worktree repair are captured in `## Repair Strategy Decision`, `## Implementation Steps`, `## Testing Strategy`, and `## Requirement Completion Status`.
- `R4` -> the required host/adapter/SQLite/control-plane review loop is captured in `## Implementation Steps`, `## Manual QA Scenarios`, `## Idempotence and Recovery`, and `## Requirement Completion Status`.

## Coverage Gate

- [x] Locked Phase 0, Phase 1, and Phase 1.5 artifacts plus the roadmap run-12 slice were re-read
- [x] The clean-startup repair strategy was selected concretely
- [x] The operational validation and SQLite maintenance surfaces were selected concretely
- [x] Durable runtime-doc placement and README linkage were selected concretely
- [x] The plan stays inside run-12 scope and preserves the SQLite-first, single-host runtime boundary

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to drive strict TDD implementation
- [x] The chosen repair and validation surfaces are concrete enough to avoid Phase 3 ambiguity
- [x] No unresolved planning question blocks implementation start

Approval: PASS
