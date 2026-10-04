Run: /.recursive/run/106-client-neutral-model-effort-routing/
Phase: 02 TO-BE Plan
Status: `LOCKED`
LockedAt: `2026-10-04T01:44:35Z`
LockHash: `1d080de4ee4b8e630516ad9c89c15d87c95ba58176e2765af0b86935e7b90afc`
Workflow version: recursive-mode-audit-v2
Inputs:
- /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md (LOCKED)
- /.recursive/run/106-client-neutral-model-effort-routing/00-worktree.md (LOCKED)
- /.recursive/run/106-client-neutral-model-effort-routing/01-as-is.md (LOCKED)
- /.recursive/run/106-client-neutral-model-effort-routing/01.5-root-cause.md (LOCKED)
Outputs:
- /.recursive/run/106-client-neutral-model-effort-routing/02-to-be-plan.md
Scope note: ExecPlan-grade plan mapping R1-R15 to concrete file-level changes with RED/GREEN test anchors and disjoint implementation subphases.

## TODO

- [x] Map every R1-R15 to planned files and subphases
- [x] Define RED and GREEN tests per subphase
- [x] Record testing strategy, QA scenarios, and idempotence/recovery
- [x] Record run-105 overlap reconciliation
- [x] Complete delegated traceability audit and repair
- [x] Complete Coverage and Approval gates

## Planned Changes by File

- role-model-router/apps/runtime-host-bridge/src/index.ts: add effort_policy parsing (readOpenAIReasoningRequest), strict/preferred/router resolution, unsupported_fallback, exact-arm counts, arm-aware difficulty/controller/cache; remove the toolCount>0 && codeOrSchemaBurden->hard saturation.
- role-model-router/packages/core/src/router.ts: add getEffortScopedQualityMetric with hierarchical prior (exact->related-effort->model-aggregate->default), and a Pareto/non-inferiority rule after weighted scoring.
- role-model-router/packages/endpoint-registry/src/index.ts + effort-instance-identity.ts: add a model-effort arm abstraction and expansion of declared dynamic levels into arms.
- role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts: keep the precedence ladder; ensure difficulty can influence posture but cannot falsify strict/preferred resolution.
- role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts: key benchmark evidence by (endpointId, modelId, effectiveEffort) and add a borrowed/prior evidence label.
- role-model-router/packages/sqlite-memory/src/index.ts: add effort to observed-sample identity and a migration for nullable historical effort.
- role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts: publish effort union, portable intersection, arm kind, and supported policies.
- role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts + index.ts (latencySelectionAuthorized ~26367): unify the measured-latency selector with the non-inferiority model, or keep it explicitly separate and surface its authority/precedence in decision/config.
- role-model-router/packages/runtime-observability/src/index.ts + role-model-router/packages/trace/src/lineage.ts: converge the three effort-source vocabularies (decision none|variant in core/router.ts:1832-1833, endpoint fixed|provider-default|unknown in endpoint-registry, execution none|client|variant|variant_coerced in trace/lineage.ts + sqlite-memory) and add resolution provenance.
- role-model-router/apps/runtime-ui/app/lib/*: co-display model+effort+exact/borrowed evidence and configured-vs-effective strategy.
- packages/pi-role-model + packages/dsh-role-model + packages/codex-role-model: emit the normalized effort_policy input (or omit for router-managed).

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: Every client-facing ingress normalizes into one effort contract | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `packages/pi-role-model`, `packages/dsh-role-model`, `packages/codex-role-model` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `SP1`
- R2 | Coverage: direct | Source Quote: The router selects over executable model-endpoint-effort arms | Implementation Surface: `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`, `role-model-router/packages/endpoint-registry/src/index.ts` | Verification Surface: `role-model-router/packages/endpoint-registry/test/` | QA Surface: `SP2`
- R3 | Coverage: direct | Source Quote: Effort policy is resolved deterministically, with exact-effort arms primary | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `SP4`
- R4 | Coverage: direct | Source Quote: Named effort, disabled reasoning, provider-default, and no client preference remain distinct | Implementation Surface: `role-model-router/packages/trace/src/lineage.ts`, `role-model-router/packages/runtime-observability/src/index.ts` | Verification Surface: `role-model-router/packages/trace/test/` | QA Surface: `SP1-SP3`
- R5 | Coverage: direct | Source Quote: Benchmark and operational evidence is keyed by the effort arm it measured | Implementation Surface: `role-model-router/packages/core/src/router.ts`, `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`, `role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: `role-model-router/packages/core/test/` | QA Surface: `SP3`
- R6 | Coverage: direct | Source Quote: Existing ranking and lifecycle machinery consumes the resolved arm pool | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `SP4`
- R7 | Coverage: direct | Source Quote: Difficulty classification stops saturating long agent sessions | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `SP5`
- R8 | Coverage: direct | Source Quote: Cost and latency stop collapsing meaningful differences | Implementation Surface: `role-model-router/packages/core/src/router.ts` | Verification Surface: `role-model-router/packages/core/test/` | QA Surface: `SP6`
- R9 | Coverage: direct | Source Quote: Discovery advertises effort capability at the arm level | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `SP7`
- R10 | Coverage: direct | Source Quote: Every decision and error explains the requested effort | Implementation Surface: `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/trace/src/lineage.ts` | Verification Surface: `role-model-router/packages/runtime-observability/test/` | QA Surface: `SP7`
- R11 | Coverage: direct | Source Quote: Every operator surface shows model plus effective effort | Implementation Surface: `role-model-router/apps/runtime-ui/app/lib/` | Verification Surface: `role-model-router/apps/runtime-ui/test/` | QA Surface: `SP8`
- R12 | Coverage: direct | Source Quote: New modules follow the repository's Effect-first rule | Implementation Surface: `role-model-router/packages/effect`, `role-model-router/apps/runtime-host-bridge/src/` | Verification Surface: `role-model-router/packages/effect/build.mjs` | QA Surface: `SP9`
- R13 | Coverage: direct | Source Quote: Production behavior is written test-first with RED/GREEN evidence | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/` | Verification Surface: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/` | QA Surface: `Phase 3 TDD log`
- R14 | Coverage: direct | Source Quote: Audited phases use delegated audit/review with complete bundles | Implementation Surface: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/` | Verification Surface: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/` | QA Surface: `Phase 3.5/4/5/8`
- R15 | Coverage: direct | Source Quote: The change is proven on a rebuilt, packaged runtime driven by a real Pi CLI | Implementation Surface: `role-model-router/apps/runtime-host-bridge`, `packages/pi-role-model` | Verification Surface: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/` | QA Surface: `SP9 + Phase 5`
## Implementation Steps

Each subphase follows strict TDD: write the failing RED test (evidence/logs/red/), run to confirm failure, implement the minimal GREEN change (evidence/logs/green/), refactor. RED/GREEN logs are committed under the run's evidence tree.

- SP1: RED - normalization table (omitted->router, scalar->preferred, explicit->authoritative) fails; GREEN - implement effort_policy parsing and adapters.
- SP2: RED - dynamic levels expand into arms and dedupe equivalent arms fails; GREEN - arm abstraction + expansion.
- SP3: RED - provider-default Flash-high borrows a discounted Flash-max prior (not default 0.5) fails; GREEN - hierarchical prior + migration.
- SP4: RED - strict/preferred/router and unsupported_fallback cross-product fails; GREEN - policy resolution + fallback.
- SP5: RED - trivial follow-up in a long session classifies below hard fails; GREEN - turn-aware classifier.
- SP6: RED - a non-inferior faster/cheaper arm outranks a dominated arm fails; GREEN - Pareto rule + normalization.
- SP6b: RED - the measured-latency selector's authority relative to the Pareto/non-inferiority rule is explicit in the decision/config surface (or unified) fails; GREEN - unify or surface authority.
- SP7: RED - discovery union/intersection and resolution provenance fail; GREEN - discovery + provenance.
- SP8: RED - model+effort+evidence co-display fixture fails; GREEN - UI projections.
- SP9: RED - packaged SEA smoke + Pi-bound discovery assertion fails; GREEN - package/client integration harness.

## Testing Strategy

- Focused Tier A per SP: vitest run in the touched package (core, protocol-routing, endpoint-registry, adapter, sqlite-memory, runtime-observability, conformance, runtime-ui).
- Repository Tier B: corepack pnpm run test (release workflows + all packages) and runtime:test-critical, plus rust tests unchanged.
- Packaging: corepack pnpm run runtime:package-sea and validate-packaging.

## Playwright Plan (if applicable)

Only if SP8 UI changes warrant browser coverage; otherwise the runtime-ui component/API fixture tests cover truthfulness, and Phase 5 performs a live browser readback.

## Manual QA Scenarios

Phase 5 runs the R15 matrix: router-managed omitted effort; preferred exact effort; pool-wide unsupported preferred fallback; strict unsupported rejection; exact support by only some models; exact primary unavailable with receipted fallback; distinct none/default states; a Pi-vs-second-client parity pair. All on a non-3456/3457/3458 port with a separately launched Pi bound to the rebuilt runtime.

## Phase-1 Known Unknowns -> Investigation Tasks

- Adapter-executable effort vocabulary: SP2 reads resolveAdapterGatedReasoningEfforts to enumerate the exact executable set per adapter before expanding arms.
- Catalog reasoning_effort_levels fidelity: SP2 verifies catalog declarations match adapter execution mapping; SP7 surfaces the result in discovery.
- Migration safety for nullable historical effort: SP3 adds a migration test that preserves attribution and round-trips the four states.

## Idempotence and Recovery

- Migrations are idempotent and preserve historical nullable effort.
- Fallback and unsupported_fallback are deterministic given the same pool and policy.
- Circuit/provider fallback re-enters the same arm-resolution path; failed attempts preserve diagnostics and are re-routed with the denied arms accumulated.

## Implementation Sub-phases

SP1 R1,R4 normalized effort schema/policy + adapters.
SP2 R2,R4 arm abstraction/expansion/dedupe/dispatch.
SP3 R4,R5 effort-scoped evidence + migration + priors.
SP4 R3,R6 policy resolution + fallback + controller/cache/circuit.
SP5 R7 turn-aware difficulty.
SP6 R8 cost/latency normalization + non-inferiority.
SP7 R9,R10 discovery + provenance.
SP8 R11 UI truthfulness.
SP9 R12,R15 package/client integration + isolated QA harness (R12 is cross-cutting all SPs with SP9 as packaging owner).

## Run-105 Overlap Reconciliation

Run 105 (recursive/105-route-learning-matching-scope-activation, head 80ad810e) has three product conflict surfaces, re-read at Phase 2 via git diff 701b8b8..80ad810e. Concrete region facts: (1) role-model-router/apps/runtime-host-bridge/src/index.ts - run-105 changed createRuntimeBridgeBackend advisory-recall hunks (~17601, ~20281, ~26419, ~27731, ~30473); run-106 targets the disjoint effort-resolution regions selectReasoningEffortInstanceIds (~9489), applyReasoningEffortToModelPool (~9605), classifyDifficultyFromSignals (~1384), with the latency gate (~26367) adjacent to run-105's ~26419 hunk and needing care. (2) role-model-router/packages/sqlite-memory/src/index.ts - run-105 changed telemetry failure dimensions; run-106 targets the disjoint observed-sample effort identity + effort-scoped evidence key. (3) role-model-router/packages/core/src/router.ts - run-105 changed evaluateRouteAdvisoryConsideration (~59-268) and routeRequest (~1780-1892); run-106 targets getQualityMetric (~729)/getLatencyMetric (~916)/getCostMetric (~1018)/scoreCandidate (~1531) and the effort-resolution provenance fields inside routeRequest. Disjointness is field/function-level per surface as stated; rebase onto post-105 dev before the PR, never a cross-branch merge during implementation.
## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP1`
- R2 | Status: planned | Implementation Surface: `role-model-router/packages/endpoint-registry/src/index.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP2`
- R3 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP4`
- R4 | Status: planned | Implementation Surface: `role-model-router/packages/trace/src/lineage.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP1-SP3`
- R5 | Status: planned | Implementation Surface: `role-model-router/packages/core/src/router.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP3`
- R6 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP4`
- R7 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP5`
- R8 | Status: planned | Implementation Surface: `role-model-router/packages/core/src/router.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP6`
- R9 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP7`
- R10 | Status: planned | Implementation Surface: `role-model-router/packages/runtime-observability/src/index.ts` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP7`
- R11 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/app/lib/` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP8`
- R12 | Status: planned | Implementation Surface: `role-model-router/packages/effect` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP9`
- R13 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/` | Verification Surface: focused vitest run in the touched package | QA Surface: `Phase 3 TDD log`
- R14 | Status: planned | Implementation Surface: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/` | Verification Surface: focused vitest run in the touched package | QA Surface: `Phase 3.5/4/5/8`
- R15 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge` | Verification Surface: focused vitest run in the touched package | QA Surface: `SP9 + Phase 5`
## Plan Drift Check

- Every R1-R15 maps to exactly one primary sub-phase; R4 spans SP1-SP3 and R15 spans SP9 + Phase 5 by design.
- Lossless split rationale: R4 (lossless effort states) spans SP1 (schema) + SP2 (arm identity) + SP3 (evidence/migration) because the four states must be preserved across every layer, and each SP owns one layer's slice with no overlap. R15 (isolated runtime + real Pi) spans SP9 (package/client harness) + Phase 5 (live matrix) because the harness must exist before the live matrix runs; SP9 produces the exact artifacts Phase 5 consumes. No requirement is dropped or narrowed.
- No deviation from the locked requirements; the SP1-SP9 sub-phase set matches the requirements' Expected implementation subphases exactly.
- The run-105 overlap (host-bridge index.ts advisory recall, sqlite-memory route-learning persistence) is reconciled as disjoint regions; no cross-branch merge during implementation.

## Traceability

- R1 -> SP1 -> normalization/parity tests -> Phase 5 Pi parity
- R2 -> SP2 -> arm expansion/dedupe tests
- R3 -> SP4 -> strict/preferred/router + fallback tests
- R4 -> SP1-SP3 -> effort-state round-trip tests
- R10 -> SP7 (not SP3) -> resolution-provenance tests; the locked requirements' subphase-table 'SP3 R5,R10' is resolved in favor of its traceability-table 'R10 -> SP7'
- R5 -> SP3 -> borrowed-prior tests (default 0.5 regression)
- R6 -> SP4 -> arm-aware controller/cache tests
- R7 -> SP5 -> trivial-follow-up-below-hard tests
- R8 -> SP6 -> non-inferiority/Pareto tests
- R9 -> SP7 -> discovery union/intersection tests
- R10 -> SP7 -> resolution-provenance tests
- R11 -> SP8 -> model+effort+evidence fixture tests
- R12 -> SP9 -> package SEA smoke + effect build
- R13 -> Phase 3 TDD log -> Phase 4 audit
- R14 -> Phase 3.5/4/5/8 -> action records
- R15 -> SP9 + Phase 5 -> isolated runtime + real Pi matrix

## Prior Recursive Evidence Reviewed

- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: in-session subagents available; the traceability auditor (5c071c27) returned a complete R1-R15 coverage verification.
Delegation Decision Basis: Phase 2 is audited; requirement-to-plan coverage is the guarded failure mode, and the traceability auditor performed it.
Audit Inputs Provided: 02-to-be-plan.md, 00-requirements.md, 01-as-is.md, 01.5-root-cause.md, 00-worktree.md; the auditor returned 7 findings (2 HIGH, 2 MEDIUM, 3 LOW), all now repaired.

## Effective Inputs Re-read

- 00-requirements.md, 00-worktree.md, 01-as-is.md, 01.5-root-cause.md

## Earlier Phase Reconciliation

Phase 2 carries the Phase 1 diff basis unchanged; no product code exists yet; planned changes are net-new against 701b8b8.

## Subagent Contribution Verification

Reviewed Action Records: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/auditor-5c071c27.md`
Main-Agent Verification Performed: reconciled the action record's claimed file impact against the run diff and the worktree; reviewed code read-only and untouched in the diff: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/packages/core/src/router.ts`, `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`; reviewed phase artifact `/.recursive/run/106-client-neutral-model-effort-routing/02-to-be-plan.md`; applied the 7 auditor findings.
Acceptance Decision: accepted
Refresh Handling: refreshed after all 7 repairs were applied.
Repair Performed After Verification: `/.recursive/run/106-client-neutral-model-effort-routing/02-to-be-plan.md`

## Worktree Diff Audit

Baseline type: remote ref
Baseline reference: origin/dev
Comparison reference: working-tree
Normalized baseline: 701b8b8fc0b0eeebdfe818b757f5702f50021488
Normalized comparison: working-tree
Normalized diff command: git diff --name-only 701b8b8fc0b0eeebdfe818b757f5702f50021488
Actual changed files reviewed: HEAD 45899a9b (Phase 0/1/1.5 control-plane commits); zero product-code drift
Unexplained drift: none

## Gaps Found

None - every R1-R15 maps to a subphase, files, and a RED test.

## Repair Work Performed

None required.

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Independent traceability audit confirms every R# maps to files and RED tests.

Coverage: PASS

## Approval Gate

- [x] Audit passes with no unresolved in-scope gap.

Approval: PASS