Run: `/.recursive/run/11-router-runtime-observability-feedback/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T10:25:23Z`
LockHash: `b0ae09fe63d08398401a9327f30d9d4f1bac810d7baae0e26a60a3160ed7ec18`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
- `/.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`
- `/.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
Outputs:
- `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `11-router-runtime-observability-feedback` into a narrow implementation plan. The run will add one shared runtime-owned observability package, extend the SQLite baseline just enough to persist inspectable runtime feedback bundles and profile updates, wire the host path to persist and expose those bundles, and add one host-integrated validation path that proves structured diagnostics, profile updates, redaction-aware inspection, and canonical artifact preservation end to end. It must not widen into run-12 hardening/operations or protocol-schema redesign.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the run-11 roadmap slice
- [x] Choose the concrete package, persistence, and inspection-route surfaces
- [x] Define implementation steps that preserve run-11 scope discipline
- [x] Define verification commands and evidence expectations
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Package Split Decision

- Selected package split: `runtime-observability` as one new shared runtime-owned package plus narrow extensions to `sqlite-memory`, `runtime-host-bridge`, `gateway-smoke`, and the vendored host bridge seam.
- Reason this plan follows that split:
  - Phase 1 showed the missing behavior is composition, persistence, and inspection rather than the absence of the underlying artifacts. The repo already has routed execution, canonical trace/usage helpers, observed-performance aggregation, and host/operator primitives.
  - A shared `runtime-observability` package keeps structured diagnostics, profile-update derivation, capture-policy inspection, OpenTelemetry mapping, and inspection-read shaping in one place instead of duplicating the same logic across `gateway-smoke` and `runtime-host-bridge`.
  - Narrow `sqlite-memory` extensions keep SQLite as the authoritative first-milestone persistence baseline without forcing the observability package to own storage implementation details.
  - Narrow host and vendor seam changes preserve the run-10 decision to keep the vendored host as the primary operator/debug shell while still letting role-model own the canonical artifact and feedback semantics.
- Inspection-surface stance for run 11: keep existing vendor `/logs`, `/logs/stream`, `/api/events`, `/api/metrics`, and `/api/captures/:id` surfaces intact, then add role-model-owned structured inspection reads alongside them instead of replacing them.

## Planned Changes by File

- `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`: define the concrete write surface, sub-phases, validation path, and scope boundaries for run 11.
- `/role-model-router/packages/runtime-observability/package.json`: add the shared runtime-observability package to the workspace.
- `/role-model-router/packages/runtime-observability/tsconfig.json`: follow the repo TypeScript package convention for source and test separation.
- `/role-model-router/packages/runtime-observability/src/index.ts`: implement the shared runtime observation bundle, diagnostics shaping, profile-sample/profile-update derivation, capture-policy receipt shaping, and inspection-read helpers.
- `/role-model-router/packages/runtime-observability/src/otel.ts`: implement deterministic OpenTelemetry GenAI mapping from canonical role-model artifacts without replacing those artifacts.
- `/role-model-router/packages/runtime-observability/test/index.test.ts`: add focused tests that prove bundle shaping, profile updates, failure diagnostics, cache observability, and redaction-aware inspection behavior before production code is added.
- `/role-model-router/packages/runtime-observability/test/otel.test.ts`: add focused tests that prove the OpenTelemetry mapping stays derived from the canonical role-model artifacts.
- `/role-model-router/packages/sqlite-memory/src/index.ts`: extend the SQLite schema and helpers to persist runtime observation bundles, observed-performance samples/profile snapshots, and maintenance-policy reads needed by run 11.
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`: add focused tests for the new runtime-observability persistence helpers and maintenance-policy reads.
- `/role-model-router/packages/adapter-execution/src/index.ts`: expose any narrow additional execution metadata that the observability package needs to derive structured diagnostics, cache signals, and profile samples without reopening adapter semantics.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: persist one runtime observation bundle per bridged request, expose bridge-owned structured inspection routes, and keep chat/model behavior unchanged apart from richer diagnostic side effects.
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`: extend or split the current host validation path so it can read the new inspection surfaces and confirm structured observability output.
- `/role-model-router/apps/gateway-smoke/src/index.ts`: reuse the shared runtime-observability helper so smoke and host execution share one artifact/feedback shaping path.
- `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge.go`: add narrow bridge helper support for proxying role-model-owned structured inspection requests to the bridge.
- `/role-model-router/vendor/llama-swap/proxy/proxymanager.go`: register the new bridge-backed inspection routes without disturbing the preserved raw log/metric/capture paths.
- `/role-model-router/vendor/llama-swap/proxy/proxymanager_api.go`: keep vendor `/api` ownership centralized while routing the new role-model observation reads through the bridge seam.
- `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge_test.go`: add focused tests first for the new inspection-route proxying behavior.
- `/role-model-router/vendor/llama-swap/proxy/proxymanager_api_test.go` or the closest focused vendor API test file: add targeted tests for the new inspection routes if needed by the existing vendor test layout.
- `/testdata/router-runtime/observability-policy.json`: add pinned policy and redaction-mode fixture input used by tests and local validation.
- `/testdata/router-runtime/observability-history.json`: add pinned prior-sample/profile history used to prove deterministic live-request profile updates.
- `/package.json`: add one narrow root script such as `runtime:validate-observability` while preserving the existing validation and smoke commands.
- `/pnpm-lock.yaml`: record the new workspace importer and any coupled dependency updates.

## Implementation Steps

1. Add a dedicated shared package at `role-model-router/packages/runtime-observability` rather than scattering run-11 logic across `gateway-smoke`, `runtime-host-bridge`, and `sqlite-memory`, because the missing behavior is a reusable runtime-owned feedback and inspection layer, not just another validator or host-specific helper.
2. Model one shared runtime observation bundle in `runtime-observability/src/index.ts` that accepts, at minimum:
   - one routed decision from `protocol-routing`,
   - one routed execution result from `adapter-execution`,
   - current registry/account/envelope/receipt context,
   - current observed-profile history for the chosen endpoint,
   - maintenance/capture policy inputs from SQLite and validation fixtures.
   The shared bundle should expose, at minimum:
   - canonical router decision, trace artifacts, usage event, and updated observed-performance profile,
   - structured diagnostics grouped by routing, execution, auth/account, memory-quality, and operator-surface categories,
   - capture-policy and redaction receipts describing what was preserved, suppressed, or redacted,
   - cache observability signals covering routing cache affinity plus provider prompt-cache usage,
   - one deterministic OpenTelemetry GenAI export view derived from those canonical artifacts,
   - inspection-read models for request-scoped detail and endpoint-scoped profile history.
3. Keep SQLite authoritative for local feedback state by extending `sqlite-memory/src/index.ts` only enough to persist and reread:
   - request-scoped runtime observation bundles,
   - observed-performance samples and the latest profile snapshot per endpoint,
   - capture/maintenance policy reads needed for redaction-aware inspection.
   Store canonical artifact payloads as JSON text plus indexed request/endpoint identifiers rather than redesigning the canonical protocol schemas or inventing a second semantic model.
4. Keep structured failure tracking additive instead of schema-breaking:
   - synthesize auth/account diagnostics from existing provider-account validation plus endpoint runtime-eligibility flags,
   - synthesize memory-quality diagnostics from context-envelope diagnostics, retrieval-receipt summary ratios, and envelope/receipt omissions,
   - carry adapter diagnostics, normalized error class, prompt-cache usage, and routing diagnostics forward into the observation bundle,
   - do not redefine the existing protocol artifact schemas just to carry run-11-only inspection metadata.
5. Keep capture governance explicit but narrow in this run:
   - read the seeded SQLite maintenance defaults and the new pinned observability-policy fixture,
   - preserve the vendor host's raw request/response capture primitives as the operator-level raw surface,
   - add role-model-owned redacted inspection views and capture-policy receipts for structured browsing,
   - do not widen into run-12 retention/export/delete drills or app-layer encryption work.
6. Reuse the existing `profile-aggregator` contract rather than inventing a second profile model:
   - derive a live-request `ObservedPerformanceSample` from the execution result and request metadata,
   - merge it with pinned or persisted prior history,
   - re-aggregate the updated profile with the committed `measurement_window`, `endpoint_version`, and source-accounting semantics,
   - persist both the new sample and the updated profile snapshot for later inspection and later routing.
7. Wire the live host path in `runtime-host-bridge/src/index.ts` to the shared observability layer after `executeRoutedRequest()` returns:
   - persist the observation bundle to SQLite,
   - keep the existing chat response shape and headers stable,
   - add bridge-owned structured read routes for recent requests, per-request detail, and per-endpoint profile state,
   - avoid turning the bridge into a second raw log/metric/capture system.
8. Preserve the run-10 operator-shell decision by proxying the new role-model inspection reads through the vendored host instead of forcing operators onto the internal bridge port:
   - add narrow bridge-helper functions in `rolemodel_bridge.go`,
   - add focused proxy/API registration in `proxymanager.go` and `proxymanager_api.go`,
   - keep `/logs`, `/logs/stream`, `/api/events`, `/api/metrics`, and `/api/captures/:id` unchanged,
   - expose the new structured reads beside them under the host's `/api` surface.
9. Keep the smoke harness aligned with the live path by reusing the shared runtime-observability helper in `gateway-smoke/src/index.ts`. Smoke should continue to emit schema-valid canonical artifacts, but it should stop being the only place where profile updates and inspection shaping exist.
10. Add one focused local validation command, `runtime:validate-observability`, that:
    - starts the host-integrated path,
    - sends one real bridged request,
    - reads the new structured inspection routes,
    - reads `/logs`, `/api/metrics`, and `/api/captures/:id`,
    - confirms the profile update, diagnostics, capture-policy receipt, and OpenTelemetry mapping all exist and stay derived from the canonical artifacts,
    - fails loudly on missing, malformed, or unlinked output.
11. Keep the root command surface narrow and Phase-4 verification focused:
    - package tests/builds for `runtime-observability`,
    - focused `sqlite-memory` tests,
    - `runtime-host-bridge` tests/build,
    - `runtime:validate-observability`,
    - existing `runtime:validate-host`, `runtime:validate-adapter`, `runtime:validate-routing`, `schemas:validate`, and `smoke`,
    - inherited root `build` and `test`,
    - focused vendored Go tests for the new bridge-backed inspection routes.
    Record the inherited schema-tools/Biome and upstream Windows vendor caveats accurately unless run 11 introduces a distinct new regression.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/runtime-observability test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
- Direct run-11 validation path:
  - `corepack pnpm run runtime:validate-observability`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/runtime-observability build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/gateway-smoke build`
- Regression checks:
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-adapter`
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run smoke`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
- Focused vendor-host checks:
  - `C:\Program Files\Go\bin\go.exe test ./proxy -run 'Test.*RoleModel.*'`
  - `C:\Program Files\Go\bin\go.exe test ./...`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\11-router-runtime-observability-feedback --run-id 11-router-runtime-observability-feedback`
  - `git diff --name-only 44ac8f339e7c77921a75fc674e74ec6068637840`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 11 adds runtime-owned TypeScript packages, host inspection reads, SQLite persistence, and CLI/local validation surfaces only; it introduces no browser UI surface.

## Manual QA Scenarios

1. **Structured request inspection**
   - Steps:
     - run `corepack pnpm run runtime:validate-observability`
     - inspect the returned request detail view from the host-backed structured inspection surface
   - Expected:
     - one request-scoped view contains the canonical decision, trace, usage, profile-update summary, diagnostics, and capture-policy receipt
     - the request ids and routing-decision ids remain linked consistently across the returned payload

2. **Profile-update inspection**
   - Steps:
     - run the same local observability validation path twice
     - inspect the per-endpoint profile view
   - Expected:
     - the endpoint profile history shows at least one persisted live-request sample and an updated profile snapshot
     - `measurement_window`, `endpoint_version`, and source counts stay aligned with the existing protocol contract

3. **Raw capture versus redacted inspection sanity check**
   - Steps:
     - inspect `/api/captures/:id`
     - inspect the role-model-owned structured request detail for the same request
   - Expected:
     - the raw host capture remains available through the preserved vendor surface
     - the structured inspection view shows the redaction-aware receipt and any redacted/suppressed fields explicitly instead of pretending raw capture policy does not exist

4. **Scope-boundary sanity check**
   - Steps:
     - inspect the final diff
   - Expected:
     - canonical protocol schemas remain unchanged unless a strictly necessary bug fix emerges
     - the run adds persistence, diagnostics, profile updates, and inspection reads without widening into resilience drills, rollback playbooks, or broader UI productization

## Idempotence and Recovery

- Re-running `corepack pnpm run runtime:validate-observability` is safe and should deterministically emit one new request-scoped observation bundle plus a corresponding profile update without corrupting prior persisted state.
- Re-running `corepack pnpm run smoke` is safe and should continue to emit schema-valid canonical artifacts while reusing the shared observation shaping path.
- Re-running the package tests and focused vendor tests is safe and should remain green once the new persistence and inspection surfaces are implemented.
- If the diff grows into run-12 hardening work such as retention/export/delete drills, resilience playbooks, or multi-tenant operational procedures, stop and trim the widening before closing Phase 3.
- If the new host inspection reads start duplicating raw vendor logs/metrics/captures instead of complementing them, stop and pull the duplicate raw-surface logic back out.
- If the implementation starts weakening or replacing the existing canonical artifacts to satisfy OpenTelemetry mapping, stop and restore the role-model artifacts as the source of truth before continuing.

## Implementation Sub-phases

### SP1. Shared runtime-observability package and SQLite persistence

Scope and purpose:
Create the shared `runtime-observability` package, define the request-scoped observation bundle, and extend SQLite just enough to persist observation bundles plus profile-update history.

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Add `role-model-router/packages/runtime-observability/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/observability-policy.json`
- [ ] Add `testdata/router-runtime/observability-history.json`
- [ ] Add tests that describe bundle shaping, profile updates, failure diagnostics, and redaction-aware inspection behavior before production code
- [ ] Extend `sqlite-memory/src/index.ts` with runtime-observability persistence helpers and maintenance-policy reads
- [ ] Implement shared bundle, profile-update, and inspection-read helpers in `src/index.ts` plus OpenTelemetry mapping in `src/otel.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-observability test`
- `corepack pnpm --filter @role-model-router/runtime-observability build`
- `corepack pnpm --filter @role-model-router/sqlite-memory test`

Sub-phase acceptance:
- The repo can derive one deterministic runtime observation bundle from routed execution, persist it in SQLite, re-read it by request/endpoint id, and produce a deterministic OpenTelemetry mapping without changing the canonical artifact contracts.

### SP2. Host integration and structured inspection routes

Scope and purpose:
Wire the run-10 host path to persist observations and expose them through structured bridge-backed inspection reads while preserving the vendored raw operator surfaces.

Requirement mapping: `R1`, `R3`, `R4`

Implementation checklist:
- [ ] Update `runtime-host-bridge/src/index.ts` to persist one runtime observation bundle after each bridged request
- [ ] Add bridge-owned structured inspection routes for recent requests, per-request detail, and per-endpoint profile state
- [ ] Add focused tests first for the new bridge inspection behavior
- [ ] Update `vendor/llama-swap/proxy/rolemodel_bridge.go` with helper support for the new inspection-route proxying
- [ ] Register the new inspection routes in `proxymanager.go` / `proxymanager_api.go` while leaving `/logs`, `/logs/stream`, `/api/events`, `/api/metrics`, and `/api/captures/:id` unchanged
- [ ] Add focused vendor tests for the new route behavior

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `C:\Program Files\Go\bin\go.exe test ./proxy -run 'Test.*RoleModel.*'`

Sub-phase acceptance:
- One host-backed request can be inspected through preserved vendor raw surfaces and new role-model structured reads without bypassing the existing host/operator shell.

### SP3. Validation path, smoke alignment, and repair evidence

Scope and purpose:
Add the run-11 local validation path and align the smoke harness with the shared observation shaping so observability feedback stays validated in both the host-integrated and smoke contexts.

Requirement mapping: `R1`, `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `runtime:validate-observability` to `/package.json`
- [ ] Extend or split `runtime-host-bridge/src/validate-host.ts` so the new command sends one bridged request and reads both structured inspection routes and preserved raw host surfaces
- [ ] Update `gateway-smoke/src/index.ts` to reuse the shared runtime-observability helper
- [ ] Keep the emitted smoke artifacts schema-valid and linkage-valid
- [ ] Record inherited root and upstream vendor failures distinctly from any new run-11 regressions

Tests for this sub-phase:
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-adapter`
- `corepack pnpm run runtime:validate-routing`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run smoke`
- `corepack pnpm run build`
- `corepack pnpm run test`

Sub-phase acceptance:
- The repo has one deterministic host-integrated validation path that proves structured diagnostics, usage/profile feedback, redaction-aware inspection, preserved canonical artifacts, and preserved raw host operator surfaces together.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`
- `/.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`
- `/.recursive/run/10-router-runtime-host-integration/03-implementation-summary.md`
- `/.recursive/run/10-router-runtime-host-integration/04-test-summary.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/03-implementation-summary.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/04-test-summary.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills are available in this session.
Delegation Decision Basis: `Phase 2 required one controller-owned implementation plan spanning a new shared observability package, SQLite schema growth, bridge-host integration, and narrow vendored operator-route extensions while preserving the existing canonical artifact and host-surface boundaries.`
Delegation Override Reason: `Choosing the shared package boundary, the SQLite write surface, and the host-versus-vendor inspection split required tightly coupled reasoning across the locked run-11 contract and the merged run-10 handoff; splitting that plan into delegated chunks would have reduced traceability.`
Audit Inputs Provided:
- `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
- `/.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`
- `/.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Changed files:
  - `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
  - `/.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`
  - `/.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`
  - `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
- `/.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`
- `/.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`

## Earlier Phase Reconciliation

- `/.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`:
  - claim carried forward: canonical artifacts, host primitives, SQLite baseline state, and narrow diagnostics already exist, but they are still disconnected exactly where the run-11 requirements require durable feedback and inspection wiring.
  - current reconciliation: the selected package split and implementation steps keep the work inside that exact gap by adding shared observation shaping, SQLite persistence, host-side reads, and one host-integrated validation loop.
- `/.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`:
  - claim carried forward: downstream audited phases must execute from `D:\DEV\role-model\.worktrees\11-router-runtime-observability-feedback` using diff basis `44ac8f339e7c77921a75fc674e74ec6068637840`.
  - current reconciliation: this plan reuses that locked worktree and diff basis unchanged.
- `/docs/architecture/06-router-runtime-architecture-lock.md` and the roadmap run-11 section:
  - claim carried forward: OpenTelemetry is additive, SQLite remains authoritative locally, capture governance must be explicit, and the role-model protocol artifacts remain the source of truth.
  - current reconciliation: the selected `runtime-observability` package plus narrow SQLite/host extensions preserve those boundaries directly.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
  - `/.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`
  - `/.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`
  - `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/role-model-baseline.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `44ac8f339e7c77921a75fc674e74ec6068637840`
- Comparison reference: `working-tree`
- Normalized baseline: `44ac8f339e7c77921a75fc674e74ec6068637840`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 44ac8f339e7c77921a75fc674e74ec6068637840`
- Diff basis used: `git diff --name-only 44ac8f339e7c77921a75fc674e74ec6068637840`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/11-router-runtime-observability-feedback`
- Actual changed files reviewed:
  - `.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
  - `.recursive/run/11-router-runtime-observability-feedback/00-worktree.md`
  - `.recursive/run/11-router-runtime-observability-feedback/01-as-is.md`
  - `.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/install.log`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/schemas-validate.log`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/runtime-validate-routing.log`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/runtime-validate-adapter.log`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/runtime-validate-host.log`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/build.log`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/test.log`
  - `.recursive/run/11-router-runtime-observability-feedback/evidence/logs/baseline/smoke.log`
- Unexplained drift:
  - none; the current working diff is limited to intentional run-11 phase artifacts and baseline evidence logs

## Gaps Found

- none beyond the plan choices already captured in `## Package Split Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`; the plan is specific enough to drive strict TDD.

## Repair Work Performed

- Converted the run-11 scope from a broad observability wish list into one concrete runtime-owned package plus narrow bridge, SQLite, smoke, and vendor-host extensions.
- Separated structured inspection from preserved raw operator surfaces so implementation can add canonical reads without duplicating logs/metrics/captures.
- Recorded explicit boundaries for OpenTelemetry mapping, profile persistence, and capture governance so later implementation stays inside run-11 rather than leaking into run-12 hardening work.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines one shared `runtime-observability` package plus narrow host/smoke integration, but canonical diagnostics, profile updates, cache signals, and OpenTelemetry mapping are not implemented in code yet. | Blocking Evidence: `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/profile-aggregator/src/index.ts`, `/role-model-router/packages/trace/src/index.ts`, `/role-model-router/packages/usage/src/index.ts` | Audit Note: Phase 3 will derive the richer observability surfaces from existing routed execution rather than inventing new artifact semantics.
- R2 | Status: blocked | Rationale: the plan now defines how auth/account and memory-quality diagnostics will be synthesized and persisted, but no runtime-inspectable failure model or redaction-aware inspection path exists in the current code yet. | Blocking Evidence: `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`, `/role-model-router/packages/provider-account/src/index.ts`, `/role-model-router/packages/endpoint-registry/src/index.ts`, `/role-model-router/packages/context-envelope/src/index.ts`, `/role-model-router/packages/retrieval-receipt/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts` | Audit Note: Phase 3 will reuse the current account, registry, envelope, and receipt signals instead of reopening their contracts.
- R3 | Status: blocked | Rationale: the plan now preserves the existing raw vendor operator endpoints and defines new role-model-owned structured inspection routes, but those structured read surfaces are not implemented yet. | Blocking Evidence: `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`, `/role-model-router/vendor/llama-swap/proxy/proxymanager.go`, `/role-model-router/vendor/llama-swap/proxy/proxymanager_api.go`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts` | Audit Note: Phase 3 must add structured reads beside the preserved raw host primitives instead of replacing them.
- R4 | Status: blocked | Rationale: the plan now defines one host-integrated `runtime:validate-observability` path plus smoke alignment, but no run-11 validation flow currently emits and re-reads the richer observability bundle. | Blocking Evidence: `/.recursive/run/11-router-runtime-observability-feedback/02-to-be-plan.md`, `/package.json`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`, `/role-model-router/apps/gateway-smoke/src/index.ts` | Audit Note: Phase 4 must distinguish unchanged broader-baseline failures from any new run-11 observability regression.

## Audit Verdict

- Audit summary: the current plan is narrow, end-to-end, and consistent with the locked run-11 contract. It reuses the existing canonical artifact and host baselines, adds the missing persistence/inspection/feedback layer in one repo-owned package, and avoids widening into later hardening or operational policy work.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> the shared observation package, profile-update wiring, cache/OTEL mapping, and host/smoke integration are captured in `## Package Split Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`.
- `R2` -> the auth/account and memory-quality diagnostic synthesis plus policy-aware inspection are captured in `## Planned Changes by File`, `## Implementation Steps`, `## Gaps Found`, and `## Requirement Completion Status`.
- `R3` -> the preserved raw operator surfaces plus new structured inspection reads are captured in `## Package Split Decision`, `## Planned Changes by File`, `## Repair Work Performed`, and `## Requirement Completion Status`.
- `R4` -> the new host-integrated validation path and smoke alignment are captured in `## Implementation Steps`, `## Testing Strategy`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.

## Coverage Gate

- [x] Locked Phase 0 and Phase 1 artifacts plus the roadmap run-11 slice were re-read
- [x] Concrete package, persistence, and host inspection surfaces were selected
- [x] Verification, QA, and recovery expectations were defined
- [x] The plan stays inside run-11 scope and preserves the canonical artifact boundary

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to drive strict TDD implementation
- [x] The package split and write surface are concrete enough to avoid Phase 3 ambiguity
- [x] No unresolved planning question blocks implementation start

Approval: PASS
