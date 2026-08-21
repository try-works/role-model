Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-08-21T09:58:07Z`
LockHash: `9c0b336af64bc96cf3135da29c4167ce4610759f9203c7d9940296013822ceb9`
Workflow version: `recursive-mode-audit-v2`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-worktree.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/01-as-is.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/01.5-root-cause.md` (LOCKED)
- `role-model-router/apps/runtime-host-bridge/src/{index.ts,configured-model-membership.ts,benchmark-runner.ts,benchmark-summary.ts,benchmark-artifacts.ts}`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`
- `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`
- `role-model-router/apps/runtime-ui/app/{lib/{runtime-api,view-models,candidate-space,format-score}.ts,routes/{control-models,control-benchmark,dashboard}.tsx,components/candidate-space-chart.tsx}`
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/02-to-be-plan.md`
Scope note: Converts the AS-IS defect clusters + root cause into one file-concrete, strict-TDD authority-chain repair. No product code is changed in Phase 2.

## TODO

- [x] Re-read locked requirements, worktree diff basis, AS-IS, and root-cause
- [x] Encode Fixed Decisions 1–8 into the plan
- [x] Map R1–R8 to implementation slices with verification owners
- [x] Define strict-TDD RED/GREEN evidence per owning change
- [x] Pin exact verification commands for Phase 4/5
- [x] Define agent-operated QA scenarios
- [x] Record public-only repository determination
- [x] Complete Coverage / Approval gates for DRAFT readiness
- [x] Lock Phase 2 after audit pass

## Audit Context

- Worktree: `D:\DEV\role-model\.worktrees\92-configured-model-pool-benchmark-convergence`
- Branch: `recursive/92-configured-model-pool-benchmark-convergence`
- Baseline commit: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Phase purpose: convert root-cause findings into a wave-ordered, file-concrete strict-TDD plan before any Phase 3 product edit.
- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: none required for planning; the plan is assembled from locked artifacts + first-hand source reads already verified in AS-IS/root-cause.
- Delegation Decision Basis: the plan requires the full cross-surface authority-chain view the controller holds; delegation adds no value at planning time.
- Audit Inputs Provided:
  - locked run-92 requirements, worktree, AS-IS, and root-cause artifacts
  - the source files listed in Inputs (first-hand reads)
- Delegation Override Reason: planning requires the full cross-surface authority-chain view already held by the controller from first-hand AS-IS/root-cause reads; delegation at plan time would fragment the file-concrete slice ordering without adding evidence.

## Effective Inputs Re-read

- `00-requirements.md` — R1–R8, Fixed Decisions 1–8, Required Evidence, Constraints.
- `00-worktree.md` — diff basis `d59f07b91e7b23c25e7297860a0f9c967b342b7a`, baseline test/build PASS.
- `01-as-is.md` — six defect clusters + code pointers (LOCKED).
- `01.5-root-cause.md` — single root cause (three partial waves never converged on one revision-stamped projection; fallbacks mask authority).

## Repository Boundary Determination (public-only)

Verified at plan time: the private repo `D:\DEV\role-model-internal` contains only
`role-model-router/packages/{runtime-observability,trace,usage}`. Every affected path in this run
(`apps/runtime-host-bridge`, `apps/runtime-ui`, `packages/{sqlite-memory,profile-aggregator,endpoint-registry}`)
exists in the **public** repo `role-model` only. Therefore:

- **Run 92 is public-only.** No private-repo change is required or planned.
- The two-repository handover rule is satisfied by explicit proof: no private-repo file is touched, and no private work is fabricated.

## Fixed Decision Encoding

- FD1 (endpoint variant is the unit): all slices key on `endpointId`; never collapse to base family.
- FD2 (one backend-owned projection): Slice 1 adds `membershipRevision` and stamps it on the canonical reads.
- FD3 (no fixture/mock/synthetic fallback): Slice 2 removes candidate-space + `?? 0`/`?? 0 ms` fallbacks.
- FD4 (atomic-enough completion; failed/stale/mismatched must not overwrite): Slice 3 filters benchmark reads by completion state + suite/version + membership revision.
- FD5 (explicit destructive last-controller eject): Slice 4 replaces the UI hard-disable with a confirmed eject calling the existing backend `auto-reassign-or-clear`.
- FD6 (0.00–1.00 vs 0–100%; missing ≠ 0): Slice 2 + Slice 5.
- FD7 (dev-targeted; stage/main immutable): no promotion work in code; delivery is PR + promotion commands only, never stage/main mutation in this run's product diff.
- FD8 (strict TDD + agent-operated QA): Slices 1–6 each produce RED/GREEN; Phase 5 is agent-operated.

## Implementation Sub-phases

### SP1 — Canonical membership revision + truthful models fallback

**Scope:** R1, R2 (partial). Backend owns a monotonic `membershipRevision`; UI stops using `/v1/models` as a pool source.

**Files:**
- `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts` — add `computeConfiguredMembershipRevision(accounts, endpoints): string` (content hash of canonical `(providerAccountId, modelId, endpointId, reasoningEffort)` tuples, stable order).
- `role-model-router/apps/runtime-host-bridge/src/index.ts` — stamp `membershipRevision` on `listRouterCandidateData` (21318-21391) and on the `/api/role-model/models` response (via `createRuntimeModelRecords` at 7672-7761 or its wrapper). Do NOT remove `/v1/models` (OpenAI-compat surface stays); only the UI pool reader must stop falling back to it.
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` — `fetchRuntimeModels` (1639-1647): remove the silent `/v1/models` fallback; return an explicit `modelsError`/empty state on `/api/role-model/models` failure. Add `membershipRevision` to the models + candidates response types.

**Strict-TDD RED/GREEN:**
- RED: `configured-model-membership.test.ts` — assert `computeConfiguredMembershipRevision` changes when a sibling effort variant is added/removed and stays stable across reorder.
- GREEN: implement the hash; same assert passes.
- RED: `runtime-api` / view-model test — assert `fetchRuntimeModels` does not fall back to `/v1/models` when `/api/role-model/models` returns 500.
- GREEN: remove fallback; test passes.

### SP2 — Truthful candidate-space + missing-as-`n/a` render

**Scope:** R2, R6. Remove synthesized Q/C/S and `?? 0`/`?? 0 ms` coercions; render missing honestly.

**Files:**
- `role-model-router/apps/runtime-ui/app/lib/candidate-space.ts` — `scoreQuality`/`scoreSpeed`/`scoreCost` return `null` on no evidence (no `0.55`/`0`/`0.88`/`0.58`); `CandidateSpacePoint` gains `qualityEvidence`/`speedEvidence`/`costEvidence` (or a single `evidence: "none"|"partial"|"complete"`); `buildCandidateSpacePoints` preserves `null` metrics instead of coercing.
- `role-model-router/apps/runtime-ui/app/components/candidate-space-chart.tsx` — render `—` (or muted/no-data) for null metrics; `formatCandidateMetricTriplet` renders `—` for missing.
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts` — `latencyLabel` (1040) and token/status labels (1147, 968-970) render `"n/a"` instead of `0`; reuse `formatLatencyMs`.
- `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts` — `resolveRoutingBenchmarkQuality` line 160: replace `?? 0` with `null` (return `null` when no scored samples); `applyRoutingBenchmarkQualityToProfile` synthetic defaults (302-306) become honest null/absent fields.
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx` — remove `?? 0` at 232 and per-bucket `score ?? 0`/`cases ?? 0` at 258-267; render `formatScoreWithCoverage`/`"n/a"`.

**Strict-TDD RED/GREEN:**
- RED: `candidate-space.test.ts` — un-scored candidate produces `quality === null`/`evidence === "none"`, no `0.55`.
- GREEN: implement; same assert passes.
- RED: `benchmark-candidates-routing-quality.test.ts` — no scored samples → `resolveRoutingBenchmarkQuality` returns `null` (not `{quality_score: 0}`).
- GREEN: implement; test passes.
- RED: `format-score.test.ts` / `view-models` test — missing latency/token renders `"n/a"`/`"—"`.
- GREEN: implement; test passes.

### SP3 — Endpoint-variant-exact benchmark persistence + latest-valid selection

**Scope:** R3, R4 (partial). Bind results to membership revision + completion state + suite/version; refuse stale/mismatched completion from overwriting a valid profile.

**Files:**
- `role-model-router/apps/runtime-host-bridge/src/benchmark-artifacts.ts` — add `membershipRevision` to `BenchmarkRunManifest` (and result).
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` — record `membershipRevision` at run start; `toObservedSample` (1436-1490) persists `membership_revision` + a `completion_state` (`completed`/`failed`/`cancelled`) on the sample.
- `role-model-router/packages/sqlite-memory/src/index.ts` — `readLatestBenchmarkProfilesByEndpointIds` (4799-4842): filter to `completion_state = 'completed'` and, when `suite/version` is present, `endpoint_version` compatible; add optional `membershipRevision` filter so a removed-endpoint completion cannot repopulate.
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts` — `readCurrentBenchmarkPortfolio` (590-645) + `listCompletedBenchmarkRuns` (400-424): skip runs whose `membershipRevision` does not match the current membership revision (or mark them quarantined, not "latest").

**Strict-TDD RED/GREEN:**
- RED: `benchmark-data-clear.test.ts` or new `benchmark-membership-revision.test.ts` — a failed/cancelled sample and a mismatched-membership run do NOT appear in `readLatestBenchmarkProfilesByEndpointIds`.
- GREEN: implement filters; test passes.
- RED: `benchmark-summary.test.ts` — `readCurrentBenchmarkPortfolio` skips a mismatched-revision run and keeps the latest valid one.
- GREEN: implement; test passes.

### SP4 — Explicit durable last-controller eject

**Scope:** R5. Replace the UI hard-disable with a destructive-confirmation eject that reuses the backend `auto-reassign-or-clear` path.

**Files:**
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` — `resolveConfiguredModelFooterAction` (349-370) returns an `"eject-controller"` action instead of `disabled` when `isController`; footer button (1303-1327) renders a destructive confirm ("This is the primary controller. Ejecting clears the controller assignment and leaves an empty pool.") and calls `removeConfiguredModel` (which already routes to `removeProviderAccountModel`); render the backend's returned `ConfiguredModelEjectResult` (controller-cleared + empty-pool) as the durable recovery state.
- Empty-pool state (1041-1055): ensure it shows a recovery action ("Add a model / Select a controller") after final-controller eject.

**Strict-TDD RED/GREEN:**
- RED: `control-models` view-model/logic test — selecting the sole controller-backed endpoint yields an eject action (not `disabled`) and the confirm flow, on confirm, clears controller + renders empty-pool recovery.
- GREEN: implement; test passes.
- Backend regression already GREEN (`remove-account-model.test.ts`); no backend change required for R5.

### SP5 — Routing decision carries profile/benchmark revision

**Scope:** R4, R6. A routing decision identifies the membership/profile revision used.

**Files:**
- `role-model-router/apps/runtime-host-bridge/src/index.ts` — `toRouterDecisionData` (21392-21416): add `membershipRevision` + `profileRevision` (the benchmark profile revision / receipt used at decision time).
- `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx` — display the revision (read-only, diagnostic) in the decision detail.

**Strict-TDD RED/GREEN:**
- RED: `benchmark-summary.test.ts` / decision test — a decision record carries a non-null `membershipRevision` and `profileRevision` after a benchmark completes.
- GREEN: implement; test passes.

### SP6 — Legacy/stale sample reconciliation + non-atomic clear hardening

**Scope:** R6. Deterministic legacy reconciliation; benchmark clear is atomic enough to avoid ghost profiles.

**Files:**
- `role-model-router/packages/sqlite-memory/src/index.ts` — wrap `clearObservedBenchmarkDataForEndpoint`/`clearAllObservedBenchmarkData` (4033-4109) in a transaction; add a migration/repair that quarantines `source_type='benchmark'` samples whose `endpoint_version`/`membership_revision` cannot be matched to a canonical endpoint (mark `completion_state='stale'`, not deleted).
- `role-model-router/apps/runtime-host-bridge/src/index.ts` — `clearBenchmarkData` (26895-26906): run sqlite clear + artifact clear in a coordinated step with a clear receipt.

**Strict-TDD RED/GREEN:**
- RED: `benchmark-data-clear.test.ts` — a mid-clear failure leaves no ghost benchmark profile; a legacy-mismatched sample is quarantined and not selected as latest.
- GREEN: implement transaction + quarantine; test passes.

## Planned Changes by File

| File | Change | Owner slice |
| --- | --- | --- |
| `apps/runtime-host-bridge/src/configured-model-membership.ts` | add `computeConfiguredMembershipRevision` | SP1 |
| `apps/runtime-host-bridge/src/index.ts` | stamp `membershipRevision` on candidates+models; decision revision; clear receipt | SP1, SP5, SP6 |
| `apps/runtime-host-bridge/src/benchmark-artifacts.ts` | manifest/result carry `membershipRevision` | SP3 |
| `apps/runtime-host-bridge/src/benchmark-runner.ts` | persist `membership_revision` + `completion_state` | SP3 |
| `apps/runtime-host-bridge/src/benchmark-summary.ts` | skip mismatched-revision runs | SP3 |
| `packages/sqlite-memory/src/index.ts` | completion-state/revision filter; transactional clear; stale quarantine | SP3, SP6 |
| `packages/profile-aggregator/src/benchmark-routing-quality.ts` | remove `?? 0` + synthetic defaults | SP2 |
| `apps/runtime-ui/app/lib/runtime-api.ts` | remove `/v1/models` fallback; revision types | SP1 |
| `apps/runtime-ui/app/lib/candidate-space.ts` | null metrics (no synthesized values) | SP2 |
| `apps/runtime-ui/app/components/candidate-space-chart.tsx` | `—`/muted for missing | SP2 |
| `apps/runtime-ui/app/lib/view-models.ts` | `"n/a"` for missing latency/token/status | SP2 |
| `apps/runtime-ui/app/routes/control-benchmark.tsx` | remove `?? 0` coercions | SP2 |
| `apps/runtime-ui/app/routes/control-models.tsx` | destructive-confirm final-controller eject + empty-pool recovery | SP4 |
| `apps/runtime-ui/app/routes/router-decisions.tsx` | show decision revision (diagnostic) | SP5 |

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: "The runtime must expose one backend-owned, endpoint-variant-aware projection for configured model membership and its current derived facts. Every page and routing consumer in scope must obtain membership from that projection or a documented derivative of it." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts; role-model-router/apps/runtime-host-bridge/src/index.ts; role-model-router/apps/runtime-ui/app/lib/runtime-api.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts; role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts | QA Surface: Overview/Models/Router pages agree on variant list | Rationale: SP1.
- R2 | Coverage: direct | Source Quote: "Production state must be truthful. Test fixtures remain allowed only in test modules or explicitly test-only factories, never as runtime or UI fallbacks." | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/candidate-space.ts; role-model-router/apps/runtime-ui/app/lib/view-models.ts; role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts; role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx | Verification Surface: role-model-router/apps/runtime-ui/app/lib/candidate-space.test.ts; role-model-router/apps/runtime-host-bridge/test/benchmark-candidates-routing-quality.test.ts; role-model-router/apps/runtime-ui/app/lib/format-score.test.ts | QA Surface: no synthetic row on Overview/Benchmark | Rationale: SP2.
- R3 | Coverage: direct | Source Quote: "Starting a benchmark must select only canonical configured endpoint variants, and each result must be persisted and attributed to the exact endpoint variant that executed it." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/benchmark-artifacts.ts; role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts; role-model-router/packages/sqlite-memory/src/index.ts; role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/benchmark-data-clear.test.ts; role-model-router/apps/runtime-host-bridge/test/benchmark-summary.test.ts | QA Surface: benchmark selects exactly the configured variants; result attributed to exact variant | Rationale: SP3.
- R4 | Coverage: direct | Source Quote: "After a valid benchmark completes, the endpoint-bound profile must be visible through the canonical pool and relevant downstream products without manual restart or stale synthetic values." | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts; role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts; role-model-router/apps/runtime-ui/app/lib/candidate-space.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/benchmark-summary.test.ts; role-model-router/apps/runtime-ui/app/lib/candidate-space.test.ts | QA Surface: completed benchmark visibly converges on Overview + Router decisions | Rationale: SP3+SP5.
- R5 | Coverage: direct | Source Quote: "The model-pool control must make an intentional final-controller eject safe and understandable while preserving existing configured-membership authority." | Implementation Surface: role-model-router/apps/runtime-ui/app/routes/control-models.tsx | Verification Surface: role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts; role-model-router/apps/runtime-ui/app/routes/control-models.test.tsx | QA Surface: final-controller eject confirm → clear controller → empty-pool recovery | Rationale: SP4.
- R6 | Coverage: direct | Source Quote: "The run must make score ownership and display coherent over new benchmarks, histories, partial telemetry, and upgrades." | Implementation Surface: role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts; role-model-router/packages/sqlite-memory/src/index.ts; role-model-router/apps/runtime-ui/app/lib/view-models.ts; role-model-router/apps/runtime-ui/app/lib/format-score.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/benchmark-candidates-routing-quality.test.ts; role-model-router/apps/runtime-host-bridge/test/benchmark-data-clear.test.ts | QA Surface: no missing-as-0 anywhere; latest-valid selection deterministic | Rationale: SP2+SP6.
- R7 | Coverage: direct | Source Quote: "The repair must leave durable tests for the authority chain, not only screenshots or isolated happy paths." | Implementation Surface: role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts; role-model-router/apps/runtime-host-bridge/test/benchmark-summary.test.ts; role-model-router/apps/runtime-ui/app/lib/candidate-space.test.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test; role-model-router/apps/runtime-ui/app/lib | QA Surface: RED/GREEN evidence under evidence/logs/red|green | Rationale: strict TDD across SP1–SP6.
- R8 | Coverage: direct | Source Quote: "The run cannot close on source-level tests alone. It must prove the rebuilt runtime and UI use the repaired authority path." | Implementation Surface: role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts; role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts | QA Surface: agent-operated browser/API receipts | Rationale: Phase 5.

## Implementation Steps

1. SP1 → commit (RED evidence first, then GREEN).
2. SP2 → commit.
3. SP3 → commit.
4. SP4 → commit.
5. SP5 → commit.
6. SP6 → commit.
7. Full host-bridge + runtime-ui suite; `tsc -p tsconfig.json` per package.
8. Phase 3.5 code review; Phase 4 test summary; Phase 5 agent-operated QA.

## Testing Strategy

- **Host bridge**: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run <owning files>`; then the full suite.
- **Runtime UI**: `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run <owning files>`; then full.
- **Build gate**: `corepack pnpm --filter @role-model-router/runtime-host-bridge build` and the runtime-ui build.
- **Strict TDD evidence**: each SP records RED log under `evidence/logs/red/` and GREEN under `evidence/logs/green/` (required by the audit-v2 lint for `TDD Mode: strict`).

## Playwright Plan (if applicable)

Not applicable for Run 92. The verification surface is rebuilt-runtime API + agent-operated browser
evidence via `scripts/start-for-qa.ts` (Phase 5), not a Playwright E2E suite. If a future wave adds
Playwright, the scenarios below are the seed.

## Manual QA Scenarios

Executed against a rebuilt runtime on an isolated state root (`scripts/start-for-qa.ts`), never the stage RC or user state:

Executed against a rebuilt runtime on an isolated state root (`scripts/start-for-qa.ts`), never the stage RC or user state:

1. **Overview Model Pool** — no synthetic Q/C/S; un-scored variants render `—`/no-data; completed benchmark updates the scatter.
2. **Models inventory** — configured variants agree with Benchmark selection and Router Candidates (endpoint-variant-exact).
3. **Benchmark selection/result** — selects exactly configured variants; a result is attributed to the exact variant; failed/cancelled runs do not overwrite a valid profile.
4. **Final-controller eject** — destructive confirm → controller cleared → durable empty-pool with recovery action; idempotent on repeat.
5. **Routing decision detail** — shows membership/profile revision.
6. **Missing ≠ 0** — no `0`/`0%` for missing latency/token/status/score anywhere in scope.
7. **Public-only** — no private-repo path is exercised.

## Idempotence and Recovery

- SP1 revision is content-addressed and order-stable (recompute-safe).
- SP2 null metrics are pure functions of input evidence (no hidden state).
- SP3 filters are read-side deterministic; transactional clear prevents ghost profiles.
- SP4 eject is idempotent (backend already returns `absent` on repeat) and never resurrects the endpoint/controller.
- SP5 revision is diagnostic-only, no routing behavior change.
- SP6 quarantine is non-destructive (marks stale, never fabricates).

## Plan Drift Check

- No merged obligations: every R# is implemented directly (no "merge" coverage) — each SP owns its requirement 1:1, so there is no lossless-merge rationale to defend. R1→SP1, R2→SP2, R3→SP3, R4→SP3+SP5, R5→SP4, R6→SP2+SP6, R7→all SPs (test ownership), R8→Phase 5.
- If a Phase 3 slice must deviate from this plan (e.g. a source file moved), the deviation is recorded in `03-implementation-summary.md` and reconciled against this plan before Phase 3 lock.

## Earlier Phase Reconciliation

- `00-worktree.md` (LOCKED) — diff basis `d59f07b91e7b23c25e7297860a0f9c967b342b7a` reused verbatim.
- `01-as-is.md` (LOCKED) — six defect clusters are the plan's input; every cluster maps to an SP.
- `01.5-root-cause.md` (LOCKED) — single root cause (three partial waves, no revision token, fallbacks mask authority) drives the authority-chain-first ordering (SP1 first, fallback removal SP2, then persistence/consumer convergence).

## Subagent Contribution Verification

- No subagents were delegated in this phase. All planned file paths and line cites are first-hand reads verified in `01-as-is.md` and `01.5-root-cause.md`. The plan is therefore fully controller-owned.

## Gaps Found

- none (planning phase). No unresolved planning gap blocks Phase 3; any Phase 3 drift is captured by Plan Drift Check.

## Repair Work Performed

- none (planning phase). Repair is executed in Phase 3 per this plan.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md` — the authority contract this run extends.
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md` — benchmark scoring ownership context.
- `/.recursive/memory/domains/role-model-router.md` — accumulated membership/benchmark/profile memory.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Comparison reference: `working-tree`
- Normalized baseline: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Base branch: `dev`
- Worktree branch: `recursive/92-configured-model-pool-benchmark-convergence`
- Worktree path: `D:\DEV\role-model\.worktrees\92-configured-model-pool-benchmark-convergence`
- Phase 2 planned product paths (Phase 3 ownership): the 14 files in "Planned Changes by File".
- No private-repo paths are planned (public-only, proven above).

## Traceability

- R1 → SP1 (canonical membership revision + truthful models fallback); R2 → SP2 (truthful candidate-space); R3 → SP3 (endpoint-variant-exact persistence); R4 → SP3+SP5 (propagation + decision revision); R5 → SP4 (final-controller eject); R6 → SP2+SP6 (score/freshness/reconciliation); R7 → SP1–SP6 (strict-TDD ownership); R8 → Phase 5 (rebuilt-runtime QA).
- Each defect cluster in `01-as-is.md` maps to an SP: cluster 1→SP1, 2→SP2, 3→SP3, 4→SP3+SP5, 5→SP4, 6→SP6.
- Fixed Decisions 1–8 encoded in "Fixed Decision Encoding".

## Requirement Completion Status

- R1 | Status: deferred | Rationale: implementation starts in Phase 3 (SP1); plan complete here. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R2 | Status: deferred | Rationale: implementation starts in Phase 3 (SP2). | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R3 | Status: deferred | Rationale: implementation starts in Phase 3 (SP3). | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R4 | Status: deferred | Rationale: implementation starts in Phase 3 (SP3+SP5). | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R5 | Status: deferred | Rationale: implementation starts in Phase 3 (SP4). | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R6 | Status: deferred | Rationale: implementation starts in Phase 3 (SP2+SP6). | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R7 | Status: deferred | Rationale: strict-TDD evidence is produced in Phase 3. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R8 | Status: deferred | Rationale: rebuilt-runtime QA is produced in Phase 5. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Effective inputs re-read (requirements, worktree, AS-IS, root-cause)
- [x] Every R1–R8 mapped to an implementation slice + verification + QA surface
- [x] Fixed Decisions 1–8 encoded
- [x] Strict TDD and agent-operated QA modes declared with exact commands
- [x] Repository boundary determined (public-only) with proof
- [x] Planned changes are file-concrete and diff-auditable

Coverage: PASS

## Approval Gate

- [x] Implementation order is concrete and authority-chain-first
- [x] Rebuilt-runtime QA path pinned for Phase 5
- [x] Traceability and Requirement Completion Status complete
- [x] No unresolved in-scope planning gaps

Approval: PASS
