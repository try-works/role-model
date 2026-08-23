Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `2-to-be-plan`
Status: `LOCKED`
LockedAt: `2026-08-23T13:33:59Z`
LockHash: `42f58a5467d241c668138b5a1dcff9daf4efc9c16d8548f0b06ad0a84f9fb34b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md` (LOCKED)
- `/.recursive/run/93-variant-admission-model-pool-integrity/01-as-is.md` (LOCKED)
- `/.recursive/run/93-variant-admission-model-pool-integrity/01.5-root-cause.md` (LOCKED)
- `role-model-router/apps/runtime-host-bridge/src/{index.ts,benchmark-runner.ts,benchmark-summary.ts,execution-circuit-breaker.ts,remote-health-probe.ts,routable-inventory.ts,package-sea.ts,validate-packaging.ts,cli.ts}`
- `role-model-router/packages/{sqlite-memory/src/index.ts,endpoint-registry/src/effort-instance-identity.ts,provider-anthropic/src/index.ts,provider-openai/src/index.ts}`
- `role-model-router/apps/runtime-ui/app/{lib/{candidate-space.ts,router-candidate-labels.ts,effort-identity.ts,telemetry-analytics.ts,view-models.ts,sidebar-footer.ts,runtime-api.ts},components/candidate-space-chart.tsx,routes/{dashboard.tsx,router.tsx,router-candidates.tsx,control-models.tsx,control-benchmark.tsx,providers.tsx,connect.tsx,endpoints.tsx}}`
- `role-model-router/apps/runtime-ui/app/styles/rm3-tokens.css` (RM3 palette reference)
- `docs/public/install.md`, `README.md`
- `role-model-router/apps/runtime-ui/test/candidate-space.test.ts` (existing test gaps)
Outputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/02-to-be-plan.md`
Scope note: Converts the root causes (01.5) into a coherent authority/health/projection repair plan for R1-R9. Declares TDD Mode: strict for Phase 3 and QA Execution Mode: agent-operated for Phase 5 (approval policy `never`).

## TODO

- [x] Re-read locked requirements, AS-IS, and root-cause
- [x] Map each root cause to a planned change by file
- [x] Define implementation sub-phases (TDD red/green per unit)
- [x] Define testing strategy, Playwright plan, and manual QA scenarios
- [x] Define idempotence and recovery behavior
- [x] Plan-drift check against locked requirements
- [x] Complete audit sections
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Changes by File

### A. Runtime-host-bridge authority/health chain (R1, R2, R3, R4)

1. **`apps/runtime-host-bridge/src/runtime-endpoint-lifecycle.ts`** (NEW)
   - Add an explicit lifecycle state machine: `pending-admission → active → (degraded | removed)`.
   - `transitionRuntimeEndpointLifecycle(state, endpointId, { status, healthStatus, reason })` with validation that only legal transitions occur (e.g. no `removed → pending-admission`), monotonic guardrails, and an `admittedAtMs`/`lastHealthUpdateMs` timestamp.
   - Pure function; unit-testable.

2. **`apps/runtime-host-bridge/src/index.ts`**
   - `activateRuntimeEndpoint` (18542-18715): change the persistence to insert as `status:"pending-admission"` + `healthStatus:"unknown"` with an admission record, instead of immediately `"active"`+`"healthy"` (18677-18678).
   - Add an **admission probe** that runs an effort-bearing chat-completion probe against the new endpoint instance (using its `endpointId` which encodes `reasoningEffort` via `createEndpointInstanceIdentity`) before flipping to `active`+`healthy`. On probe failure → `degraded` + a diagnosable `healthStatus`/reason (R2/R3).
   - After the admission probe, transition to `active`+`healthy` and call `applyRemoteHealthProbeResults`/`rebuildCurrentState` so `listRouterCandidateData` reflects the admission state.
   - `applyRemoteHealthProbeResults` (17977-18007): keep as the probe writer but also fold execution-circuit state into candidate `healthStatus` (see #3), so it becomes the single authoritative health aggregator.
   - `listRouterCandidateData` (21389-21391): compute candidate `healthStatus` from the **new unified health policy** (admission state + probe health + circuit state), not just `runtimeEndpoints[].healthStatus`.
   - Add a `pending-admission` and `admitted` surface so the UI can render the admission phase (R1).

3. **`apps/runtime-host-bridge/src/health-policy.ts`** (NEW)
   - Single authoritative predicate `resolveEndpointHealthState({ admissionState, probeHealthStatus, circuitState, failureRate }): CandidateHealthState` where `CandidateHealthState ∈ { healthy, degraded, provider-unavailable, offline, policy-blocked, unknown }`.
   - Define the degradation rules: any `provider_5xx`/`quota`/`auth` circuit `open|probation|blocked_*` on an active instance → `degraded`; consecutive execution 503s (e.g. ≥3) → `degraded`/`provider-unavailable`; bootstrap probe `provider-unavailable` → `provider-unavailable`.
   - This policy is consumed by `isHealthyEndpoint`, `routable-inventory` (its `UNROUTABLE_HEALTH_STATUSES` vocabulary), candidate `healthStatus`, and benchmark eligibility, so all four agree (root-cause H2).
   - **Couple circuit denials into candidate `healthStatus`**: currently `listRouterCandidateData` (index.ts:21389-21391) reads only `runtimeEndpoints[].healthStatus`; execution 503s reach only the routing deny set (`readDeniedExecutionCircuitEndpointIds` index.ts:4197-4205 → `routeExecutionRequest` index.ts:21630-21659). The policy must fold the circuit/execution-failure ledger into the candidate health read so a false-healthy candidate becomes `degraded`.
   - `isHealthyEndpoint(healthState)` (benchmark-runner.ts:330-332): change to return true **only** for `healthy`, excluding `degraded`, `offline`, `policy-blocked`, `unknown` (and `provider-unavailable` for benchmark targeting). This is the R2/R3/R4 fix.

4. **`apps/runtime-host-bridge/src/execution-circuit-breaker.ts`**
   - `recordExecutionCircuitFailure` (372-374): when `trafficClass !== "live"`, still record the failure into a **benchmark/execution failure ledger** (or fold into the health policy) so non-live 503s inform candidate `healthStatus`/`degraded` without tripping the live circuit state. Keep live-circuit behavior unchanged. This is the Flash High 503 diagnosis (R3).
   - `recordExecutionCircuitSuccess`/recovery: on sustained success, allow recovery to `healthy` (existing recovery schedule at 401-418 is reused).

5. **`apps/runtime-host-bridge/src/benchmark-runner.ts` / `benchmark-start-guards.ts`**
   - Target selection (1652-1669): filter by `resolveEndpointHealthState(...) === "healthy"`, so `degraded`/`pending-admission` instances are **not** benchmark-eligible (R2/R4).
   - `isHealthyEndpoint` (330-332): delegate to `health-policy.ts` (single source of truth).
   - `evaluateBenchmarkTargetEligibility` (benchmark-start-guards.ts:39-65): extend to consume the unified policy (it currently only blocks `benchmarkEligible === false`, index.ts:21325 derives from routing routability, which ignores `pending-admission`).

6. **`apps/runtime-host-bridge/src/benchmark-summary.ts` / benchmark manifest**
   - Preserve run-92 membership/provenance semantics (completed + membership-match + non-empty `profileRevisionByEndpointId`); no regression. `readCurrentBenchmarkPortfolio` (593-660) unchanged except health-eligibility wiring.

7. **`packages/provider-anthropic/src/index.ts`**
   - `buildAnthropicRequest` (87-120): serialize the effort payload. Anthropic extended thinking uses `thinking: { type:"enabled", budget_tokens }` (there is no generic `reasoning_effort` string). Map normalized `reasoningEffort ∈ { low, medium, high, max }` to a `budget_tokens` budget, or forward `executionRequest.reasoning.raw`/`thinking` verbatim when the client supplied an Anthropic-native shape (matching the sibling `toOpenAIReasoning` at provider-openai/src/index.ts:261-305).
   - Add `ai-sdk-anthropic` to `REASONING_EFFORT_SERIALIZER_VERSION_BY_ADAPTER` (index.ts:287-291) so an Anthropic effort variant is activatable (currently rejected at activation index.ts:18659-18666 because no serializer is gated).

### B. Cross-page refresh (R4)

8. **`apps/runtime-host-bridge/src/index.ts`** — add a **shared revision/version channel** reusing the existing SSE plumbing (`subscribeTelemetry`/`telemetryListeners` index.ts:3169,19234,26472-26477; `GET /api/role-model/telemetry/stream` index.ts:14980-14999). After a benchmark completes (write sqlite + manifest), emit a new `revision.update` event (analogous to `emitTelemetryUpdate` index.ts:20762) carrying the affected endpoint identities + new `profileRevisionByEndpointId` + `membershipRevision`, so subscribed surfaces re-fetch.
9. **`apps/runtime-ui/app/lib/runtime-api.ts`** — expose the revision (e.g. return `revision`/`version` alongside candidate data); **`apps/runtime-ui/app/routes/control-benchmark.tsx`** on completion: after local refresh, invalidate the shared cache key / call the global refresh so Overview/Router/Observe re-fetch. Implement a small `runtimeRefreshBus` (module-level pub/sub) so one completion updates all subscribed surfaces.
10. **`apps/runtime-ui/app/routes/control-benchmark.tsx`** (75,109): render the **effort-bearing endpoint display path** (via `formatEndpointDisplayPath`/`formatModelIdentity`) instead of raw `currentEndpointModelId`, so a "high" variant progress row shows the variant identity (R4).

### C. UI Model Pool projection (R5, R6)

11. **`apps/runtime-ui/app/lib/candidate-projection.ts`** (NEW) — single canonical projection from `RouterCandidate` to `{ endpointId, modelId, upstreamModelId, reasoningEffort, key, label, displayPath, sourceType, healthState, readiness, sampleCount, hasBenchmark, selected, degraded, excluded, candidateState }`, built on `effort-identity.ts` formatters + one health resolver. This is the R5 "shared canonical projection across six surfaces" fix.
12. **`apps/runtime-ui/app/lib/candidate-space.ts`**
    - `buildCandidateSpacePoints` (248-250): change default `limit = 5` → `Infinity` (match `selectOverviewRouterCandidates` full-pool contract); `dashboard.tsx:223` pass `Infinity` (or omit).
    - `.slice(0, Math.max(0, limit))` (291): keep only when `limit` finite; full pool when `Infinity`.
    - Add `CandidateState` enum + `deriveCandidateState(candidate)` (see R5 8-state) reading `telemetryScores.taskRollups.sampleCount`/`minimumSampleCount`, `benchmarkCapability` presence+`overallScore`, `selected`, `degraded`/circuit. Replace `evidenceOf`/`candidateTags`/`isExcluded` (197-241) free-text with enum-driven labels.
    - Color (312): replace `COLOR_CYCLE[index % length]` with `assignCandidateColorToken(endpointId, usedColorTokens)` — deterministic by `endpointId` hash into the RM3 palette, with distinctness guarantee (no two simultaneously-visible share a color). Adopt the `pickDistinctSeriesColorToken` pattern (telemetry-analytics.ts:115-125).
13. **`apps/runtime-ui/app/lib/candidate-space-chart.tsx`** (NEW) — add a `total`/`disclosure` field ("Showing N of M") and make the legend a bounded scrollable list (replace `overflow-hidden` at 178-180); extend token→CSS-var maps (16-38) to the RM3 palette.
14. **`apps/runtime-ui/app/lib/router-candidate-labels.ts`**, **`sidebar-footer.ts`** (SIDEBAR_MODEL_LIMIT=8 at 19,134), **`view-models.ts`**, **`telemetry-analytics.ts`**, **`routes/{router.tsx,router-candidates.tsx,control-models.tsx,connect.tsx,endpoints.tsx}`** — route through `candidate-projection.ts` so labels/status/truncation are single-sourced (R5). Keep sidebar cap explicit as a policy with a total disclosure, not a silent default.

### D. Clean install / packaging (R7)

15. **`apps/runtime-host-bridge/src/validate-packaging.ts`** — add a **synthetic-sentinel absence scan** over the release bundle (assert no `SP7_MOONSHOT_API_KEY` or fixture markers remain) and an **empty-fresh-root assertion** (fresh DB root yields empty registry + catalog, mirroring `cli.ts` EMPTY_REGISTRY/EMPTY_CATALOG at 230-250). Extend `runRuntimePackagingValidation` (522-654).
16. **`docs/public/install.md`** — document the fresh-install expectations (empty registry/catalog, sentinel-absence guarantee, fixture rejection) so an operator can verify (R9 support).

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: "A durable state machine exposes `pending-admission`, `active`, `degraded`, and `removed` (or documented equivalents), with timestamp, reason code, and sanitized receipt/reference per transition." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts; role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/runtime-endpoint-lifecycle.test.ts | QA Surface: Add a provider/effort variant → pending-admission → active | Rationale: root cause #1 (no durable lifecycle state machine).
- R2 | Coverage: direct | Source Quote: "Add/re-add creates `pending-admission`; the instance is not routing-eligible or benchmark-eligible until its instance-bound readiness probe succeeds." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/runtime-endpoint-lifecycle.test.ts | QA Surface: pending-admission until probe succeeds; probe failure → degraded with reason | Rationale: root cause #1/#2 (immediate active, no admission probe).
- R3 | Coverage: direct | Source Quote: "Flash High's 503 failure path has a deterministic adapter/transport test and, when a live credential is available in Phase 5, one bounded admission attempt. It must produce either verified success or truthful degraded state—not a false healthy claim." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts; role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts; role-model-router/packages/provider-anthropic/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/execution-circuit-breaker.test.ts; role-model-router/apps/runtime-host-bridge/test/benchmark-runner.test.ts; role-model-router/packages/provider-anthropic/test/index.test.ts | QA Surface: Flash High 503 → degraded, not healthy, not benchmark-eligible | Rationale: root cause #2/#3 (503 never folds into health; isHealthyEndpoint misclassifies; anthropic omits effort).
- R4 | Coverage: direct | Source Quote: "Non-active instances are rejected before benchmark traffic; failed/skipped instances cannot appear as successful benchmark evidence." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts; role-model-router/apps/runtime-ui/app/lib/runtime-api.ts; role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx | Verification Surface: role-model-router/apps/runtime-ui/app/lib/runtime-refresh-bus.test.ts; role-model-router/apps/runtime-host-bridge/test/benchmark-summary.test.ts | QA Surface: completion refreshes Overview/Router/Observe without reload | Rationale: root cause #4 (no cross-page refresh).
- R5 | Coverage: direct | Source Quote: "No API or presentation silently truncates candidates at five. Bounded viewports disclose a total and retain all candidates via accessible scrolling/pagination." | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/candidate-space.ts; role-model-router/apps/runtime-ui/app/components/candidate-space-chart.tsx | Verification Surface: role-model-router/apps/runtime-ui/app/lib/candidate-space.test.ts | QA Surface: 7 configured variants all visible, no silent 5-cap | Rationale: root cause #5 (limit=5 + call-site 5).
- R6 | Coverage: direct | Source Quote: "No simultaneously visible candidates share a color; assignment scales beyond the current seven without cycling a four-color palette." | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/candidate-space.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/candidate-space.test.ts | QA Surface: colors distinct and stable across re-ranking | Rationale: root cause #5 (COLOR_CYCLE[index%4]).
- R7 | Coverage: direct | Source Quote: "A fresh isolated state root has zero configured endpoint instances and an empty Model Pool." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts; docs/public/install.md | Verification Surface: role-model-router/apps/runtime-host-bridge/test/validate-packaging.test.ts; role-model-router/apps/runtime-host-bridge/test/executable.test.ts | QA Surface: fresh install → empty registry/catalog, no sentinel | Rationale: root cause (no sentinel-absence scan, no empty-fresh-root, docs gap).
- R8 | Coverage: direct | Source Quote: "Every production behavior change has RED-GREEN-REFACTOR evidence: focused failure first, minimal fix, then affected regression suite." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts; role-model-router/apps/runtime-ui/app/lib/candidate-space.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test; role-model-router/apps/runtime-ui/app/lib | QA Surface: Phase 4 rebuild + Phase 5 isolated-port Pi CLI | Rationale: strict-TDD gate across A1-A6.
- R9 | Coverage: direct | Source Quote: "Provider-add, Models, Benchmark, Connect, and Overview explain admission status, readiness reason, retry consequences, and degraded exclusion." | Implementation Surface: role-model-router/apps/runtime-ui/app/routes/control-models.tsx; role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx; docs/public/install.md | Verification Surface: docs/public/install.md; role-model-router/apps/runtime-ui/app/routes | QA Surface: operator sees admission status, reason, retry consequences | Rationale: root cause (operator-facing explanation gap).

## Implementation Steps

**Sub-phase A1 — Lifecycle + admission (R1, R2).**
1. Write failing unit tests for `runtime-endpoint-lifecycle.ts` (legal/illegal transitions, admission→active→degraded, timestamps). RED.
2. Implement `runtime-endpoint-lifecycle.ts`; run tests GREEN.
3. Modify `activateRuntimeEndpoint` to insert `pending-admission` + run admission probe + transition. Add tests asserting add/re-add enters pending, probe success → active, probe failure → degraded. RED then GREEN.

**Sub-phase A2 — Health policy (R3).**
4. Write failing tests for `health-policy.ts` (degraded on provider_5xx circuit open; provider-unavailable on probe; healthy only when all clear). RED.
5. Implement `health-policy.ts`; GREEN.
6. Wire `isHealthyEndpoint` + `routable-inventory` + candidate `healthStatus` + benchmark eligibility to the policy. Update tests asserting a degraded/503 instance is not benchmark-eligible and not shown healthy. RED then GREEN.
7. Modify `recordExecutionCircuitFailure` to fold non-live failures into the health ledger (without changing live circuit behavior). Add Flash High 503 test: consecutive 503s → candidate `degraded`/not benchmark-eligible. RED then GREEN.

**Sub-phase A3 — Anthropic effort (R3).**
8. Write failing test: `buildAnthropicRequest` with `reasoningEffort="high"` serializes `thinking`/`budget_tokens`. RED.
9. Implement effort serialization in `provider-anthropic/src/index.ts`; GREEN.

**Sub-phase A4 — Cross-page refresh + progress label (R4).**
10. Add `runtimeRefreshBus` (module pub/sub) in runtime-ui; write failing test that a benchmark-complete event triggers subscribed surface refresh. RED.
11. Wire `control-benchmark.tsx` completion → bus → Overview/Router/Observe. Add test asserting completion bumps revision and surfaces re-fetch. GREEN.
12. Fix `control-benchmark.tsx:75,109` progress label to use effort display path; test asserts variant identity shows. RED then GREEN.

**Sub-phase A5 — Model Pool projection (R5, R6).**
13. Add `candidate-projection.ts` canonical projection; test with 7 variants (distinct labels/keys/health/state). RED.
14. Add `CandidateState` enum + `deriveCandidateState`; one test per required state (no-requests, failed-only, insufficient-samples, usable, no-benchmark, benchmark-available, selected, degraded). RED then GREEN.
15. Change `buildCandidateSpacePoints` default/dashboard to full pool; add disclosure field. Test: 7 input → all 7 present with `total`; `limit=5` → length 5 + disclosure. RED then GREEN.
16. Replace index color with identity-distinct RM3 assignment. Tests: ≥7 variants distinct colors; ordering-stable; palette-exceeding no repeats (mirror telemetry distinctness assertion). RED then GREEN.
17. Extend `candidate-space-chart.tsx` legend (scrollable + total); route surfaces through projection; remove silent 8/5 caps (explicit policy + disclosure). Tests for each surface label/status. RED then GREEN.

**Sub-phase A6 — Packaging / install (R7).**
18. Add sentinel-absence scan + empty-fresh-root assertion to `validate-packaging.ts`; failing test for a bundle that still contains the sentinel/fixture. RED.
19. Implement; GREEN. Update `docs/public/install.md` (fresh-install expectations + operator explanation). No new failing test for docs (manual QA).

## Testing Strategy

- **TDD Mode: strict** — every unit change starts with a failing (RED) test, then minimal implementation to GREEN, in the listed sub-phases. Red/green evidence recorded in Phase 3.
- **Unit (vitest)**:
  - `runtime-endpoint-lifecycle.test.ts` (NEW) — transition legality, timestamps, admission→active→degraded.
  - `health-policy.test.ts` (NEW) — health-state derivation from admission/probe/circuit/failureRate.
  - `execution-circuit-breaker.test.ts` — non-live failure folding; live behavior unchanged.
  - `benchmark-runner.test.ts` — isHealthyEndpoint now health-only; degraded/provider-unavailable not benchmark-eligible.
  - `provider-anthropic.test.ts` — effort payload serialization.
  - `candidate-space.test.ts` — full-pool (7 variants, total disclosure), 8-state derivation, distinct/order-stable colors (new suites + extend fixture helper).
  - `candidate-projection.test.ts` (NEW) — canonical projection across surfaces.
  - `runtime-refresh-bus.test.ts` (NEW) — completion→surface refresh.
  - `validate-packaging.test.ts` — sentinel-absence + empty-fresh-root.
- **Regression**: run 92's benchmark/membership tests remain green (no membership/provenance regression); run baseline host-bridge (26) + runtime-ui (15) suites stay green.
- **Rebuild**: `pnpm build` for affected packages (host-bridge, endpoint-registry, provider-anthropic, runtime-ui) to prove compile + packaging validity.
- **Extensions**: no new providers/extensions in scope; the health-policy + projection changes are additive.

## Playwright Plan (if applicable)

Not required by requirements or prior runs for this change set. The changes are validated via unit tests + manual QA (Phase 5) in the running runtime-ui dev server. If a Playwright run exists for runtime-ui, it is executed as a smoke check but is not a gate.

## Manual QA Scenarios

QA Execution Mode: `agent-operated` (approval policy `never`; no human sign-off prompt).

1. **Add a provider/effort variant** → status shows `pending-admission`, then transitions to `active` after admission probe; UI renders the pending badge (R1/R2).
2. **Force a Flash High 503** (mock adapter returns 503 for `reasoningEffort="high"`) → candidate transitions to `degraded`, no longer benchmark-eligible, not shown healthy; error reason surfaced (R3).
3. **Configure 7 variants** → Overview Model Pool shows all 7 (no 5-cap), with "Showing N of M" disclosure and a scrollable legend; colors are distinct and stable across re-ranking (R5/R6).
4. **Run a benchmark on one variant** → completion bumps revision; Overview/Router/Observe update without manual refresh; progress row shows the effort variant identity (R4).
5. **Fresh install** → empty registry/catalog, no synthetic sentinel; docs match observed behavior (R7/R9).
6. **Anthropic effort variant execution** → request payload contains `thinking`/`budget_tokens` (verified via test + telemetry) (R3).

## Idempotence and Recovery

- **Lifecycle transitions** are validated; re-running an admission probe for an already-active instance is a no-op (state-guarded). `activateRuntimeEndpoint` on an existing id re-enters `pending-admission` only when appropriate (idempotent add/re-add).
- **Health policy** is a pure derivation from admission/probe/circuit/failure-rate; recomputing it is idempotent and converges on restart (`runtimeEndpoints` rehydrated from DB; circuit rehydrated; policy recomputed).
- **Benchmark eligibility** recomputed each snapshot via `buildEffectiveEligibilitySnapshot`; no sticky state.
- **Refresh bus**: versioned; a stale surface with an old revision re-fetches once; duplicate completion events are deduplicated by revision.
- **Packaging sentinel scan** is deterministic (absence asserted); a bundle that fails the scan is rejected before release (fail-closed).
- **Recovery**: if the admission probe times out, the instance stays `pending-admission` with a diagnosable reason (not silently `healthy`); operator can re-trigger probe or remove.

## Implementation Sub-phases

| # | Sub-phase | Requirements | TDD |
| --- | --- | --- | --- |
| A1 | Lifecycle + admission | R1, R2 | strict |
| A2 | Health policy + circuit + benchmark eligibility | R3, R4 | strict |
| A3 | Anthropic effort payload | R3 | strict |
| A4 | Cross-page refresh + progress label | R4 | strict |
| A5 | Model Pool projection + colors | R5, R6 | strict |
| A6 | Packaging sentinel scan + docs | R7, R9 | strict |

## Plan Drift Check

- The plan addresses every root cause identified in 01.5 and maps to every locked requirement R1-R9 with no unplanned scope.
- No change alters the run-92 membership/provenance semantics; those tests stay green.
- Effort-variant identity (run 91) is the foundation, preserved; changes build on `endpointId` (effort-encoded), never re-derive it.
- Backend already returns the full candidate set; the UI truncation fix is purely projection-side (no API change needed for R5).
- Approval policy `never`: gates are set autonomously; no user prompt required.

## Traceability

- R1, R2 → A1 (`runtime-endpoint-lifecycle.ts`, `activateRuntimeEndpoint`, admission probe, pending surface).
- R3 → A2+A3 (`health-policy.ts`, `isHealthyEndpoint`, circuit non-live folding, Anthropic effort; Flash High 503 test).
- R4 → A2+A4 (benchmark eligibility health-only; `runtimeRefreshBus`; progress label effort identity).
- R5 → A5 (`candidate-projection.ts`, `deriveCandidateState`, full pool, surface routing).
- R6 → A5 (identity-distinct RM3 colors, distinctness tests).
- R7 → A6 (`validate-packaging.ts` sentinel scan + empty-fresh-root; `docs/public/install.md`).
- R8 → Phases 3/4/5 (strict TDD, regression, rebuild, manual QA).
- R9 → `docs/public/install.md` + plan-drift rationale.

## Audit Context

- Worktree: `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity`
- Branch: `recursive/93-variant-admission-model-pool-integrity`
- Baseline commit: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Phase purpose: produce the concrete implementation plan (files, steps, tests, sub-phases) that satisfies R1-R9.
- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: one R5-R6 root-cause subagent completed with a detailed source-verified report confirming the controller's reads (RM3 palette, distinct-color model, 8-state raw facts, sidebar cap). Its file:line evidence was folded into this plan. The R1-R4 root-cause subagent was still running; the plan uses the controller's first-hand R1-R4 evidence (circuit non-live guard, candidate healthStatus, bootstrap-only probe, isHealthyEndpoint), all verified by direct reads.
- Delegation Decision Basis: parallelize independent subsystem root-cause reduction; the controller independently verified every planning claim against the source.
- Delegation Override Reason: `self-audit` chosen because the plan requires exact source-line citations the controller verified directly; delegated reports are supplementary.
- Audit Inputs Provided: locked 00/01/01.5 + source files cited in Inputs.

## Effective Inputs Re-read

- Locked `00-requirements.md` (R1-R9), `01-as-is.md`, `01.5-root-cause.md` — re-read.
- `candidate-space.ts`, `dashboard.tsx`, `candidate-space-chart.tsx`, `router-candidate-labels.ts`, `sidebar-footer.ts`, `telemetry-analytics.ts`, `runtime-api.ts`, `effort-identity.ts` — re-read for projection/color/8-state planning.
- `index.ts` (activateRuntimeEndpoint, listRouterCandidateData, applyRemoteHealthProbeResults), `execution-circuit-breaker.ts`, `benchmark-runner.ts`, `provider-anthropic/src/index.ts`, `validate-packaging.ts`, `cli.ts` — re-read for authority/health/packaging planning.

## Earlier Phase Reconciliation

- 01-as-is LOCKED (LockHash `20774d6b…`), 01.5 LOCKED (LockHash `daecba0e…`). No product code changed between phases, so all line cites remain valid. This plan is the direct output of the 01.5 root-cause summary; no root cause is unaddressed.

## Subagent Contribution Verification

- The R5-R6 root-cause subagent (58d094b8) delivered a source-verified report on clusters 1-5 (UI). Its claims (RM3 palette `rm3-tokens.css:34-70`, `pickDistinctSeriesColorToken` at `telemetry-analytics.ts:100-125`, `SIDEBAR_MODEL_LIMIT=8` at `sidebar-footer.ts:19,134`, 8-state raw facts in `runtime-api.ts`) were cross-checked against the controller's reads and adopted. The R1-R4 runtime evidence in this plan is the controller's first-hand verification. No subagent-authored claim is the sole basis for any planned change.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Comparison reference: `working-tree`
- Normalized baseline: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 1aab0512ce23aacc50cea66c2926e374be1e249e`
- Changed files reviewed: no product changes yet; planning phase. Planned files are new/modified as listed above and will be tracked in Phase 3.

## Gaps Found

- none (no unresolved planning gaps). Every root cause has a planned change; R1-R9 are all mapped.

## Repair Work Performed

- None (planning phase). The plan is the deliverable; implementation is Phase 3.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/92-configured-model-pool-benchmark-convergence/01-as-is.md` and `01.5-root-cause.md` — membership/provenance semantics to preserve (readCurrentBenchmarkPortfolio, readLatestBenchmarkProfilesByEndpointIds).
- `/.recursive/run/91-adaptive-execution-cooldown-policy/` — adaptive execution cooldown context.
- `/.recursive/run/78-dev-stage-main-cicd-runtime-channels/` — clean subagent-mode planning artifact structure.
- Product files (effort identity foundation): `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts` (createEndpointInstanceIdentity, effort-encoded endpointId); `role-model-router/apps/runtime-ui/app/lib/effort-identity.ts` (formatters).

## Requirement Completion Status

- R1 | Status: deferred | Rationale: planned (A1); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R2 | Status: deferred | Rationale: planned (A1); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R3 | Status: deferred | Rationale: planned (A2/A3); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R4 | Status: deferred | Rationale: planned (A2/A4); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R5 | Status: deferred | Rationale: planned (A5); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R6 | Status: deferred | Rationale: planned (A5); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R7 | Status: deferred | Rationale: planned (A6); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R8 | Status: deferred | Rationale: strict-TDD/regression/rebuild/extension gate in Phases 3/4/5. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R9 | Status: deferred | Rationale: planned (A6 docs); executed in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every root cause (01.5) has a planned change by file
- [x] Every locked requirement R1-R9 maps to a planned change
- [x] Implementation sub-phases are TDD-scoped (strict)
- [x] Testing strategy, Playwright, manual QA, idempotence defined
- [x] Plan drift check against locked requirements passed
- [x] Traceability maps each plan item to a requirement

Coverage: PASS

## Approval Gate

- [x] Plan is concrete (files, lines, tests, sub-phases) to implement in Phase 3
- [x] No unresolved in-scope planning gaps remain

Approval: PASS
