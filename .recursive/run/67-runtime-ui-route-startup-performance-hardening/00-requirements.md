Run: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-12T12:39:12Z`
LockHash: `bc79360aedc7c2479101991adb179c69de1d3e1b347805161435011a5ab1c6fe`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- user guidance in chat on `2026-07-12`:
  - `app/models` is extremely slow to load in the frontend
  - other pages may have the same class of startup issue
  - the cause is probably similar to the remote-page issue fixed in run 66
  - audit every route and page for load speed and provide an analysis
  - turn that audit into the requirement for a new recursive run
  - after approval, create the requirement doc but keep it in draft state and do not lock it
- current-session route startup audit and local rebuilt-runtime probing
- live packaged runtime probe on `http://127.0.0.1:3456`
- fresh QA runtime probe on `http://127.0.0.1:3472`
- direct read-only SQLite inspection of:
  - `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\memory\memory.sqlite`
  - `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-host-bridge\memory\memory.sqlite`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\logs\runtime-http.log`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/routes/local-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/routes/providers.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`
- `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `role-model-router/apps/runtime-ui/playwright.config.ts`
- `role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts`
- `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `role-model-router/apps/runtime-host-bridge/scripts/start.ts`
- `role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts`
- `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/cli-startup-readiness.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `package.json`
- `role-model-router/apps/runtime-ui/package.json`
- `role-model-router/apps/runtime-host-bridge/package.json`
Outputs:
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
Scope note: This document defines the route-startup performance remediation run for runtime-ui, including route-by-route startup inventory, first-paint deferral rules, full RED-GREEN-REFACTOR TDD, added regression-test coverage, and rebuilt-runtime verification requirements.

## TODO

- [x] Ground the run in the current route-startup audit, runtime bootstrap helpers, and startup wiring paths
- [x] Capture the approved route-startup remediation direction as explicit requirements
- [x] Specify the highest-priority slow routes and the production startup parity gap
- [x] Make strict TDD, targeted automated tests, and rebuilt-runtime verification explicit
- [x] Document out-of-scope boundaries and constraints
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `runtime-ui performance hardening + production startup parity`
- Primary subsystems:
  - `role-model-router/apps/runtime-ui/**`
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/packages/sqlite-memory/**`
- Secondary subsystems:
  - `role-model-router/packages/runtime-observability/**`
- User-visible outcome:
  - heavy runtime pages become visible and usable without waiting on avoidable request-ledger or telemetry fanout, and rebuilt production-style runtime startup paths expose the same deferred APIs that QA bootstrap paths already use
- Main risk theme:
  - a shallow fix could improve one page while preserving the same blocking bootstrap pattern elsewhere, or could rely on QA-only bridge wiring that still fails in rebuilt production-style runtime launches

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `66-remote-providers-deferred-request-id-loading` | establishes the approved deferred-bootstrap pattern for remote providers and surfaces the remaining production-path wiring gap for `latest-ids` |
| `63-router-backend-regression-and-telemetry-surface-hardening` | recent router and telemetry work already increased route-surface verification expectations that this run should extend |
| `60-runtime-ui-paper-linear-review-alignment` | the runtime-ui shell and route surfaces are already established and should be preserved while startup behavior changes |
| `51-runtime-testing-architecture-and-regression-matrix` | the repo already has named validator, Vitest, and Playwright runtime lanes that this run should reuse rather than inventing ad hoc verification |

## Problem Summary

The current runtime-ui route startup model is inconsistent in two different ways:

1. Several first-render routes still boot through `fetchRuntimeSnapshot()` or an equivalent broad control-plane fanout even when they only need a narrower subset to become visible.
2. The telemetry-heavy analytics routes still couple first visible render to advisory query fanout that can be deferred or staged.

This draft was validated against both the current codebase and live runtime processes. The current packaged runtime on `http://127.0.0.1:3456` is a real standalone `role-model-runtime.exe` release build backed by the persistent `standalone-runtime` SQLite state, not a tiny QA fixture. Against that live runtime, `/healthz`, `/api/role-model/runtime/summary`, `/api/role-model/requests/latest-ids?limit=10`, and `/api/role-model/requests` all timed out after 10 seconds during this audit. That does not prove a single root cause for every stall, but it does prove that final verification cannot rely only on seeded QA fixtures.

The code and direct database audit also confirmed the specific route/query-path debt behind the route startup problem:

- `fetchRuntimeSnapshot()` still fans out to runtime summary, providers, accounts, device auths, endpoints, roles, rich recent requests, and models.
- `/app/models` and `/app/router` are still the highest-priority route-level offenders.
- multiple second-tier operator routes still inherit the same rich request-ledger startup dependency through `fetchRuntimeSnapshot()`.
- the packed standalone runtime state is large enough to make light-fixture-only verification misleading.

Run 66 already established the desired deferred pattern on `/app/remote/providers`, but the audit also reconfirmed a remaining rebuilt-runtime parity gap: `GET /api/role-model/requests/latest-ids?limit=10` is implemented in the bridge server and wired in `scripts/start-for-qa.ts`, yet the non-QA startup paths flowing through `src/cli.ts`, `scripts/start.ts`, and `scripts/prod-launcher.ts` still omit `listRecentRequestIds`. The current packaging regression also does not explicitly prove that seam.

## Deep Validation Findings

- Live packaged runtime probe on `127.0.0.1:3456`:
  - `GET /healthz` timed out after `10s`
  - `GET /api/role-model/runtime/summary` timed out after `10s`
  - `GET /api/role-model/requests/latest-ids?limit=10` timed out after `10s`
  - `GET /api/role-model/requests` timed out after `10s`
- Fresh seeded QA runtime probe on `127.0.0.1:3472`:
  - `GET /healthz` returned `200` in about `459 ms`
  - `GET /api/role-model/requests/latest-ids?limit=10` returned `200` in about `448 ms`
  - `GET /api/role-model/requests` returned `200` in about `405 ms`
  - `GET /api/role-model/runtime/summary` returned `200` in about `448 ms`
- Persisted-state size and row-count audit:
  - `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\memory\memory.sqlite` is about `5.34 GB`
  - `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-host-bridge\memory\memory.sqlite` is about `283 MB`
  - current row counts observed during this audit:
    - standalone-runtime: `runtime_observations = 4592`, `runtime_telemetry_records = 4968`
    - runtime-host-bridge state: `runtime_observations = 885`, `runtime_telemetry_records = 1358`
- Direct SQL timing on persisted runtime state:
  - lightweight ids-only latest-request query completed in about `141 ms`
  - rich recent-observation query over `request_id`, `routing_decision_id`, `endpoint_id`, `created_at_ms`, and `observation_json` took about `10.8 s`
  - representative `observation_json` payload lengths in those rows were about `218-221 KB`
- Schema/index finding:
  - `runtime_observations` stores the raw `observation_json` inline
  - current indexes are the `request_id` primary key and `idx_obs_retain_until`
  - there is no dedicated `created_at_ms` index on `runtime_observations`
- Live QA route probes confirmed the current startup request sets:
  - `/app/models` requests the full runtime snapshot surfaces plus `role-policy`, `controller`, `router/candidates`, and follow-up telemetry
  - `/app/router` requests `router/summary`, the full runtime snapshot surfaces, `router/candidates`, and `runtime/config`
  - `/app/studio/chat`, `/app/studio/images`, `/app/connect`, `/app/connect/upstream`, `/app/router/controller`, and `/app/system/peers` all pull `/api/role-model/requests` through first-render snapshot startup today
  - `/app/system/runtime`, `/app/system/session-readiness`, `/app/router/strategy`, `/app/router/config`, `/app/system/runtime-config`, `/app/router/candidates`, `/app/router/decisions`, `/app/router/decisions/:requestId`, `/app/local/endpoints`, and `/app/models/benchmark` already use narrower route-specific startup reads or drill-down detail fetches and should be validated before being widened or rewritten

## Priority Route Inventory

### `P0` Mandatory remediation targets

- `/app/models`
- `/app/router`
- `/app/studio/chat`
- `/app/studio/images`
- `/app/studio/audio`
- `/app/studio/rerank`
- `/app/studio/advanced`
- `/app/connect`
- `/app/connect/upstream`
- `/app/router/controller`
- `/app/system/peers`

These routes currently either boot directly through `fetchRuntimeSnapshot()` or otherwise inherit rich recent-request startup cost on first render. They are the primary implementation scope for this run unless Phase 1 produces stronger contrary evidence.

### `P1` Validate-first narrow-shell routes

- `/app/system/runtime`
- `/app/system/session-readiness`
- `/app/router/strategy`
- `/app/router/config`
- `/app/system/runtime-config`
- `/app/router/candidates`
- `/app/router/decisions`
- `/app/router/decisions/:requestId`
- `/app/models/benchmark`
- `/app/models/roles`
- `/app/local/endpoints`
- `/app/local/peer-models`
- `/app/local/llama-swap/models`

These routes already use narrower route-specific startup reads, single-surface bootstraps, or drill-down detail fetches. This run must validate them explicitly, but should only widen their implementation scope if Phase 1 shows real blocking debt that still affects first visible render.

### `P2` Telemetry-first-mount routes

- `/app`
- `/app/observe/requests`
- `/app/observe/routing`

These routes are in scope because they still combine primary route readiness with analytics or stream fanout on first mount.

### Baseline / monitor-only routes

- `/app/remote/providers`
- `/app/observe/requests/:requestId`
- `/app/observe/activity`
- `/app/observe/logs`
- `/app/connect/downstream`
- `/app/local/choose`
- `/app/local/llama-swap/swap`
- `/app/local/llama-swap/policy`
- `/app/local/llama-swap/logs`
- `/app/local/llama-swap/matrix`
- redirects and not-found routes

These routes still belong in the Phase 1 inventory, but this draft does not require implementation changes on them unless a later approved addendum expands scope.

### Inventory completeness note

- Every concrete route path in `role-model-router/apps/runtime-ui/app/routes.ts` must land in exactly one of the buckets above or in the `redirects and not-found routes` catch-all.
- Phase 1 may rebucket routes based on stronger evidence, but no live route may remain omitted or implicitly uncategorized.

## Fixed Decisions

1. Every route under `role-model-router/apps/runtime-ui/app/routes/**` must be explicitly classified by Phase 1 as `static/redirect`, `critical-blocking`, or `deferable-secondary-data`.
2. First paint must depend only on critical route data; secondary telemetry, request-ledger, advisory, and drill-down reads must be deferred.
3. Run 66's deferred providers bootstrap is the baseline pattern to reuse where applicable.
4. This run must not close on QA-only behavior; rebuilt production-style runtime startup parity is mandatory.
5. Phase 3 for this run must use full `TDD Mode: strict` with executed RED-GREEN-REFACTOR evidence for every owned production-code slice.
6. This run must name and execute the concrete automated test and verification surfaces it owns.
7. This run must add or extend regression tests for every owned behavior change instead of relying only on pre-existing coverage.
8. Phase 5 must record rebuilt-runtime QA proof in `05-manual-qa.md`; Phase 4 automated evidence is necessary but not sufficient for closure.

## Requirements

### `R1` Record and validate a route-by-route startup inventory for every runtime-ui route

Description:
Phase 1 must inventory every route in `role-model-router/apps/runtime-ui/app/routes/**`, reconcile it against `app/routes.ts`, and validate the route startup classes against actual route traffic instead of relying only on anecdotal slow pages or static code reading.

Acceptance criteria:
- Phase 1 records every runtime-ui route and classifies it as `static/redirect`, `critical-blocking`, or `deferable-secondary-data`
- Phase 1 explicitly confirms or corrects the `P0`, `P1`, `P2`, and baseline route inventory in this requirements draft
- every concrete path from `role-model-router/apps/runtime-ui/app/routes.ts` is accounted for in exactly one inventory bucket or in the `redirects and not-found routes` catch-all; no live route remains unbucketed
- routes that remain unchanged despite avoidable blocking startup reads have an explicit justification
- the inventory identifies the highest-priority remediations, the routes that already follow the desired deferred pattern, and any routes intentionally deferred from this run

### `R2` `/app/models` must render visible model inventory before secondary diagnostics complete

Description:
The `/app/models` route is the clearest current startup bottleneck and must stop blocking first paint on avoidable secondary reads.

Acceptance criteria:
- the first visible `/app/models` state no longer waits on avoidable secondary reads such as request-ledger-derived model evidence, telemetry rollups, or other advisory follow-up data
- any remaining startup reads are limited to the minimum needed to render truthful model cards, selection state, and core operator actions
- the selected-model telemetry rollup or similar advisory reads happen after first visible route readiness
- failure of deferred follow-up reads does not clear or re-block an already loaded `/app/models` page

### `R3` `/app/router` and the `P0` full-snapshot route family must stop booting through rich request-ledger startup paths

Description:
`/app/router` and the `P0` route family currently inherit the same broad snapshot bootstraps that pull rich recent-request data into first render. This is the main route-family remediation scope beyond `/app/models`.

Acceptance criteria:
- `/app/router` no longer boots first render through the full runtime snapshot plus rich recent-request ledger
- the `P0` route family no longer requests `/api/role-model/requests` on first navigation unless a later approved addendum explicitly keeps a specific route on that dependency
- any shared replacement bootstrap helper introduced for the `P0` family is narrower than `fetchRuntimeSnapshot()` and is named/tested in a way that makes its ownership explicit
- each remediated route preserves truthful error handling for required primary data while treating deferred follow-up failures as degraded-but-visible states

### `R4` `P1` narrow-shell routes must be explicitly validated and must not regress back onto full snapshot startup

Description:
Several routes already use narrower route-specific startup paths. This run should validate those routes against live traffic and only narrow them further when Phase 1 shows real blocking debt.

Acceptance criteria:
- `/app/system/runtime` remains limited to runtime-shell data (`runtime/summary`, controller, runtime config, version) or a narrower equivalent
- `/app/system/session-readiness` remains limited to readiness-critical reads (`runtime/summary` plus health) or a narrower equivalent
- `/app/router/strategy`, `/app/router/config`, `/app/system/runtime-config`, `/app/router/candidates`, `/app/router/decisions`, `/app/router/decisions/:requestId`, and `/app/local/endpoints` remain on route-specific startup reads and do not regress back to `fetchRuntimeSnapshot()` or rich request-ledger startup
- `/app/models/benchmark`, `/app/models/roles`, `/app/local/peer-models`, and `/app/local/llama-swap/models` remain on route-owned startup reads and do not regress back to broad snapshot startup
- if Phase 1 finds that a `P1` route still blocks first visible render on non-critical data, the run may narrow it further, but validation is mandatory even when no code change is needed

### `R5` telemetry-heavy startup routes must bound first-mount fanout without losing stale/live visibility

Description:
The telemetry-heavy routes currently mix first render and advisory chart fanout in the same initial blocking startup path.

In-scope routes:
- `/app`
- `/app/observe/requests`
- `/app/observe/routing`

Acceptance criteria:
- each in-scope route becomes visible without waiting for the full current analytics fanout to settle
- primary route data is separated from deferred advisory chart or comparison reads
- stale-data diagnostics, live refresh behavior, and degraded refresh warnings remain truthful after the change
- failure of deferred analytics reads leaves the already-rendered route usable

### `R6` shared bootstrap and query paths must be validated against real persisted state, not only QA fixtures

Description:
The route problem is not just a UI sequencing issue. The actual runtime and database audit show that lightweight ids-only recent-request reads and rich recent-observation reads behave very differently on persisted state. This run must preserve or extend lightweight query paths where first paint still needs recent-activity hints.

Acceptance criteria:
- `P0` route first render does not depend on rich `/api/role-model/requests` or raw `observation_json` reads
- if any route still needs recent-activity information on first render, it uses a lightweight ids-only or metadata-only path that matches the route need
- Phase 4 or Phase 5 evidence records real-state query-path proof on non-trivial persisted state, not only seeded QA fixtures
- richer request-detail, request-ledger, and telemetry surfaces preserve their existing canonical contracts unless this run explicitly changes them
- the providers route remains on the deferred bootstrap pattern established by run 66 and does not regress back to a blocking request-history bootstrap

### `R7` rebuilt runtime and production-style startup paths must expose lightweight latest-request-id reads and prove that seam in packaging validation

Description:
The lightweight deferred latest-request-id path must work in rebuilt production-style runtime launches, not only in QA bootstrap paths.

Acceptance criteria:
- `GET /api/role-model/requests/latest-ids?limit=10` returns `200` from the rebuilt local runtime used in final verification
- wiring is present in the non-QA startup paths that flow through `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/scripts/start.ts`, and `role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts`
- QA-only support in `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts` is not sufficient for closure
- the lightweight latest-id contract remains separate from the richer recent-request ledger
- packaging validation or packaging-owned tests explicitly prove that the packaged-runtime startup path exposes the lightweight latest-id seam

### `R8` the run must use full RED-GREEN-REFACTOR TDD and add regression tests for every owned behavior change

Description:
This run must prove the startup improvements and startup-parity fix with full RED-GREEN-REFACTOR TDD. Production changes are not allowed to lead the work. Every owned behavior change must first be captured by an executed failing test, then repaired to GREEN, and then left behind with durable regression coverage that will fail again if the behavior regresses.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict`
- no owned production-code slice is added before its failing test is executed, captured, and recorded as RED evidence
- each owned behavior slice records the full sequence `RED -> GREEN -> REFACTOR`, or records an explicit no-op refactor note when the GREEN implementation already meets the desired structure without further code motion
- if no suitable existing automated test covers a behavior slice, the run must create the missing test surface before or alongside the first RED step rather than skipping TDD for that slice
- implementation-only patches without prior executed RED evidence are not acceptable for closure
- runtime-ui unit coverage includes the owning route/bootstrap surfaces:
  - `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - create or extend route-owned tests for `/app/router`, `/app/system/runtime`, `/app/system/session-readiness`, `/app/system/runtime-config`, `/app/router/candidates`, `/app/router/decisions`, `/app/router/decisions/:requestId`, `/app/local/endpoints`, `/app`, `/app/observe/requests`, and `/app/observe/routing` as needed
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` if stale/background chart behavior changes
- browser regression coverage includes:
  - `role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts`
  - `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
  - add or extend a targeted browser assertion if the final remediated `P0` family includes a concrete route outside `/app/models` and `/app/router` that is not already observed by the existing browser suites
- backend/runtime coverage includes:
  - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/cli-startup-readiness.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
  - `role-model-router/packages/sqlite-memory/test/index.test.ts`
- every owned behavior change leaves behind at least one added or extended regression test in the most local responsible test surface (`runtime-ui` unit/browser, `runtime-host-bridge`, `sqlite-memory`, or packaging-owned validation)
- Phase 4 records command-shaped verification for the owning suites, including:
  - `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/routes/control-models.test.ts` plus any newly added route-owned test files from this run
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/cli-startup-readiness.test.ts test/executable.test.ts`
  - `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- Phase 4 reruns the broader owning regression lanes after targeted GREEN proof so the final record includes both focused TDD evidence and post-change regression confirmation
- packaging-owned regression must add an explicit `latest-ids` seam assertion in the relevant packaging validator or executable/startup test surface if startup-path wiring changes
- Phase 4 traceability must map every remediated `P0` route to direct automated evidence or to an explicit shared-helper assertion that names the affected route(s)
- RED evidence exists before each owned production-code slice, and GREEN evidence proves the same slice afterward

### `R9` final verification and Phase 5 manual QA must use both deterministic QA proof and non-trivial persisted-state proof

Description:
Closure requires explicit validator, unit, browser, and rebuilt-runtime verification from the current worktree. Seeded QA proof is necessary for deterministic regression, but it is not sufficient because the actual packaged runtime and persisted-state audit in this draft are much heavier than the QA fixture data. Phase 4 owns the automated verification chain, and Phase 5 must separately prove rebuilt-runtime behavior in `05-manual-qa.md` against a freshly rebuilt runtime artifact rather than a stale prior process.

Acceptance criteria:
- Phase 4 records the actual targeted commands used for the owning unit and integration surfaces
- the verification chain includes:
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:test-browser`
  - route- and package-owned `vitest run` commands that explicitly include the runtime-ui and runtime-host-bridge/sqlite-memory surfaces changed by this run
- when the final diff touches packaged/runtime startup wiring or packaged bridge assets, the verification chain also includes `corepack pnpm run runtime:validate-packaging`
- Phase 5 records rebuilt-runtime verification in `05-manual-qa.md` and declares `QA Execution Mode: human|agent-operated|hybrid`
- Phase 5 rebuilt-runtime verification runs against a freshly rebuilt runtime from the current worktree and records the rebuild step plus the served URL or port used for that proof
- final verification includes both:
  - deterministic seeded QA runtime proof on an isolated port
  - rebuilt production-style runtime proof on the user's standalone persisted state or a documented equivalent copied large-state fixture, recorded in Phase 5
- Phase 4 command output alone does not satisfy the rebuilt-runtime closure requirement; `05-manual-qa.md` must contain the observed Phase 5 results from the rebuilt runtime
- the rebuilt runtime used for the Phase 5 large-state proof must answer `/healthz` and `/api/role-model/runtime/summary` before route-performance conclusions are recorded
- Phase 5 rebuilt-runtime proof covers at least:
  - `/app/models`
  - `/app/router`
  - one additional `P0` family route outside `/app/models` and `/app/router`
  - one telemetry-heavy route from this run's scope
  - `/app/remote/providers` as a non-regression checkpoint for the run-66 deferred baseline
- Phase 5 evidence explicitly names which concrete `P0` routes were remediated through shared helpers versus direct route changes, so route-level verification is not inferred only from helper names
- Phase 5 evidence confirms the newly added or extended regression tests correspond to the rebuilt-runtime behaviors being validated, so runtime proof and automated coverage stay aligned
- Phase 5 proof shows that deferred follow-up failures do not blank or re-block an already visible page

## Out of Scope

- `OOS1`: full visual redesign of runtime-ui pages
- `OOS2`: broad rewrite of all runtime-ui routes into React Router loaders
- `OOS3`: generic request-history or telemetry product redesign beyond startup-latency needs
- `OOS4`: historical cleanup of existing large observation payload rows unrelated to the startup path
- `OOS5`: generic runtime incident-response work that is unrelated to proven route-startup or startup-wiring debt in this run

## Constraints

- preserve operator-visible truth; do not fake readiness with placeholders that hide missing primary data
- prefer deferred secondary reads over removing data entirely
- preserve canonical rich request and telemetry surfaces outside the explicit startup optimization scope
- do not close the run on QA-only behavior; rebuilt runtime parity is mandatory
- if a new route-specific bootstrap helper is added, its naming and tests must make ownership explicit instead of hiding behavior inside ambiguous shared helpers
- the run must be implemented under full RED-GREEN-REFACTOR TDD with named automated verification surfaces
- every owned behavior change must add or extend durable regression coverage; manual QA alone is not sufficient regression protection
- seeded QA runtime proof is necessary but not sufficient; closure also needs documented proof against non-trivial persisted state
- Phase 5 manual QA must record rebuilt current-worktree runtime proof in `05-manual-qa.md`
- rebuilt-runtime closure must use a fresh current-worktree build; reusing a stale runtime process or stale artifacts is not sufficient
- if the final large-state proof uses a copied persistent state instead of the user's live standalone runtime process, the run must record the copied-state procedure and the reason it was used

## Assumptions

- the major perceived startup delays on the audited routes are primarily caused by avoidable bootstrap over-fetching and startup fanout rather than route-chunk size alone
- providers-page deferred latest-request-id behavior remains the correct baseline pattern for non-critical request-ledger follow-up
- other routes that still need rich request or telemetry detail can preserve those richer contracts while deferring them from first paint
- the current `:3456` packaged-runtime timeout is treated as a validation input, not as proof that every stall comes from the same root cause; the run still focuses on the proven route/query-path and startup-wiring debt captured above

## Coverage Gate

- Effective inputs reviewed:
  - user guidance in chat on `2026-07-12`
  - current-session route startup audit and rebuilt-runtime probing
  - live packaged runtime probe on `http://127.0.0.1:3456`
  - fresh QA runtime probe on `http://127.0.0.1:3472`
  - direct read-only SQLite inspection of the standalone and runtime-host-bridge persisted state databases
  - `C:\Users\erikb\AppData\Local\Role Model Runtime\logs\runtime-http.log`
  - `/.recursive/RECURSIVE.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
  - current runtime-ui route map, route implementation, runtime API, bridge startup wiring, test, Playwright, package, and persisted-state surfaces listed under `Inputs`
- Requirement coverage check:
  - `R1`: covered in `## Requirements`
  - `R2`: covered in `## Requirements`
  - `R3`: covered in `## Requirements`
  - `R4`: covered in `## Requirements`
  - `R5`: covered in `## Requirements`
  - `R6`: covered in `## Requirements`
  - `R7`: covered in `## Requirements`
  - `R8`: covered in `## Requirements`
  - `R9`: covered in `## Requirements`
- Out-of-scope confirmation:
  - `OOS1`: unchanged
  - `OOS2`: unchanged
  - `OOS3`: unchanged
  - `OOS4`: unchanged
  - `OOS5`: unchanged

Coverage: PASS

## Approval Gate

- Scope is concrete enough for Phase 0 and Phase 1 handoff
- The runtime-ui startup audit findings and the production startup parity gap are captured as explicit requirements
- The seed route inventory now accounts for every current runtime-ui route either directly or through the redirects/not-found catch-all
- Strict TDD, targeted automated tests, and rebuilt-runtime verification are explicit
- Out-of-scope and constraint boundaries are explicit
- The user approved this requirements draft and requested that it be created but left unlocked

Approval: PASS

Implementation approval note:

- the original draft stayed unlocked after creation because the user asked for requirement authoring first
- the later command `implement run 67 in a worktree` is the explicit approval to execute and lock this requirement
