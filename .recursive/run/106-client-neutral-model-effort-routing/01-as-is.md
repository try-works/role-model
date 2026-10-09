Run: /.recursive/run/106-client-neutral-model-effort-routing/
Phase: 01 AS-IS
Status: `LOCKED`
LockedAt: `2026-10-04T01:33:52Z`
LockHash: `4eb5dd07463e24b05ac886cf5b894980faba13814ec76a55df2f516d26583120`
Workflow version: recursive-mode-audit-v2
Inputs:
- /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md (LOCKED)
- /.recursive/run/106-client-neutral-model-effort-routing/00-worktree.md (LOCKED)
Outputs:
- /.recursive/run/106-client-neutral-model-effort-routing/01-as-is.md
Scope note: This document records how reasoning-effort routing works today at 701b8b8, mapped to R1-R15, so the Phase 2 plan and the Phase 1.5 root cause are grounded in the actual source.

## TODO

- [x] Reproduce the Pro-high/Flash-high asymmetry from the code path
- [x] Map current behavior to every R1-R15 with file:line citations
- [x] Index the source obligations (Source Requirement Inventory)
- [x] Record code pointers, known unknowns, and evidence
- [x] Record prior recursive evidence reviewed
- [x] Complete delegated phase-audit and repair
- [x] Complete Coverage and Approval gates

## Reproduction Steps (Novice-Runnable)

1. Configure a runtime with a provider-default endpoint and a fixed-effort endpoint for the same model (e.g. deepseek-flash provider-default plus deepseek-flash-max fixed max), plus a V4 Pro provider-default endpoint, all under one alias (difficulty.remote-only).
2. Send a high-effort request through the alias with tools and a large code/schema-bearing context.
3. Observe the router classifies the request hard (toolCount > 0 && codeOrSchemaBurden), so the effective strategy becomes quality with quality weight 0.5.
4. Observe the decision receipt: the winner is V4 Pro with benchmark-backed quality near 0.9, while the runner-up is provider-default Flash with default quality 0.5, even though Flash-max holds a stronger benchmark near 0.958.
5. Observe the measured-latency selector reports disabled: 'measured-latency selection input is not authorized'.

## Source Requirement Inventory

- R1 | Source Quote: Every client-facing ingress normalizes into one effort contract | Summary: no strict | preferred | router policy; a scalar effort is a pool preference and fixed-effort coercion is recorded as variant_coerced | Disposition: in-scope
- R2 | Source Quote: The router selects over executable model-endpoint-effort arms | Summary: endpoints carry fixed/declared effort but the router scores endpoints, not materialized arms | Disposition: in-scope
- R3 | Source Quote: Effort policy is resolved deterministically, with exact-effort arms primary | Summary: no policy vocabulary; no exact-primary/fallback/unsupported_fallback semantics | Disposition: in-scope
- R4 | Source Quote: Named effort, disabled reasoning, provider-default, and no client preference remain distinct | Summary: reasoning_effort is a nullable string; no total type for the four states | Disposition: in-scope
- R5 | Source Quote: Benchmark and operational evidence is keyed by the effort arm it measured | Summary: quality evidence is endpoint-keyed; provider-default falls to default 0.5 while a fixed-effort sibling holds the benchmark | Disposition: in-scope
- R6 | Source Quote: Existing ranking and lifecycle machinery consumes the resolved arm pool | Summary: strategy/difficulty/controller/cache/fallback operate on endpoints, not effort arms | Disposition: in-scope
- R7 | Source Quote: Difficulty classification stops saturating long agent sessions | Summary: toolCount > 0 && codeOrSchemaBurden short-circuits to hard | Disposition: in-scope
- R8 | Source Quote: Cost and latency stop collapsing meaningful differences | Summary: fixed 150/300 ms and 0.01 targets compress differences; no non-inferiority rule | Disposition: in-scope
- R9 | Source Quote: Discovery advertises effort capability at the arm level | Summary: discovery publishes effort_levels but no union/intersection, arm kind, or policy vocabulary | Disposition: in-scope
- R10 | Source Quote: Every decision and error explains the requested effort | Summary: provenance records effortSource/strategyLabel but no resolution vocabulary or arm counts | Disposition: in-scope
- R11 | Source Quote: Every operator surface shows model plus effective effort | Summary: surfaces show model and sometimes effort but not exact/borrowed evidence or coercion | Disposition: in-scope
- R12 | Source Quote: New modules follow the repository's Effect-first rule | Summary: effect@4.0.0-rc.117 already built; no new server dependency | Disposition: in-scope
- R13 | Source Quote: Production behavior is written test-first with RED/GREEN evidence | Summary: run 106 has not yet produced RED/GREEN evidence | Disposition: quality-gate
- R14 | Source Quote: Audited phases use delegated audit/review with complete bundles | Summary: per-phase action records/bundles do not exist yet | Disposition: quality-gate
- R15 | Source Quote: The change is proven on a rebuilt, packaged runtime driven by a real Pi CLI | Summary: nothing built yet; Phase 5 allocates an isolated non-3456/3457/3458 port | Disposition: quality-gate

## Relevant Code Pointers

- Effort instance selection: apps/runtime-host-bridge/src/index.ts:9489 (selectReasoningEffortInstanceIds), :9532 (filterRequestedModelPoolByReasoningEffort), :9605 (applyReasoningEffortToModelPool), :10573 (effort application in Chat Completions plan).
- Quality evidence: packages/core/src/router.ts:729 (getQualityMetric) — benchmark-first, else judge_score, else quality_score, else default 0.5.
- Weighted scoring: packages/core/src/router.ts:1531 (scoreCandidate), :188 (STRATEGY_WEIGHTS), :32 (ROUTER_SCORE_TIE_EPSILON), :1647 (compareTieBreak).
- Cost/latency: packages/core/src/router.ts:916 (getLatencyMetric), :1018 (getCostMetric).
- Difficulty: apps/runtime-host-bridge/src/index.ts:1336 (summarizeDifficultySignals), :1384 (classifyDifficultyFromSignals).
- Strategy precedence: apps/runtime-host-bridge/src/scoring-strategy.ts:152 (difficultyBucketStrategy), :170 (resolveStrategy).
- Measured-latency gate: apps/runtime-host-bridge/src/index.ts:26367 (latencySelectionAuthorized), :26603 (disabled receipt).
- Arm identity: packages/endpoint-registry/src/effort-instance-identity.ts (reasoningEffort normalization and endpoint identity).

## Current Behavior by Requirement

### R1 Client-neutral effort contract

Current state: there is a single internal effort application path but no client-neutral policy contract. Ingress shapes (Chat Completions and Responses) both read a reasoning effort value and feed applyReasoningEffortToModelPool (index.ts:10573, :10877), but there is no strict | preferred | router policy field; a scalar effort is treated as a preference over the pool and, on a fixed-effort endpoint, can be coerced (effortSource variant_coerced, recorded in trace/lineage). Client identity is not a routing input, but the normalized contract R1 requires does not exist yet.

Gap: requested_effort and effort_policy are not separate; omitted effort is not explicitly router-managed; no cross-client parity test exists.

### R2 Executable model-effort arms

Current state: endpoints already carry fixed reasoning_effort (effort-instance-identity.ts) and declared reasoning_effort_levels (packages/endpoint-registry/src/index.ts:63), and selectReasoningEffortInstanceIds (index.ts:9489) picks fixed-effort instances first, then provider-default instances that declare the level. However, the router still scores endpoints, not a materialized (model, endpoint, effort) arm; dynamic levels are not expanded into explicit arms with independent evidence keys.

Gap: no virtual arms for dynamic levels; no canonicalized arm identity beyond endpoint identity; evidence is not keyed by arm.

### R3 Strict, preferred, and router-managed resolution

Current state: no policy vocabulary. applyReasoningEffortToModelPool orders the pool by effort (index.ts:9605-9663) and filterRequestedModelPoolByReasoningEffort can empty a pool (index.ts:9532-9565) with a reasoning_effort_unavailable refusal, but there is no exact-primary/fallback semantics, no unsupported_fallback that ignores the hint, and no strict policy.

Gap: R3 semantics are entirely absent.

### R4 Lossless effort states

Current state: reasoning_effort is a nullable string; effortSource distinguishes none | client | variant | variant_coerced (trace lineage), but named effort, disabled reasoning, provider-default, and no-preference are not modeled as distinct states; serialization relies on the nullable string plus a separate effortSource.

Gap: no total type distinguishes the four states; migration of nullable rows is unproven.

### R5 Effort-scoped evidence and hierarchical priors (F6)

Current state: getQualityMetric (router.ts:729) reads candidate.benchmarkCapability?.overallScore and task/role/group scores keyed by endpoint, not by effective effort. A provider-default endpoint with no benchmark falls to default 0.5 (router.ts:887) even when a fixed-effort sibling holds benchmark evidence. There is no cross-effort prior or confidence discount.

Gap: this is the direct cause of the Pro-high/Flash-high asymmetry; evidence is endpoint-keyed, not arm-keyed, and no hierarchical prior exists.

### R6 Arm-aware strategy, controller, advice, cache, and fallback

Current state: strategy precedence (scoring-strategy.ts:170) and difficulty (index.ts:1384) operate on the endpoint pool; controller/advisory preferences are base-model/endpoint-scoped and are not expanded to effort arms; cache continuity and learned advice are endpoint-keyed.

Gap: no effort-aware expansion of controller/advisory/cache/fallback.

### R7 Turn-aware difficulty repair (F4)

Current state: classifyDifficultyFromSignals (index.ts:1384) short-circuits to hard when toolCount > 0 && codeOrSchemaBurden (index.ts:1400-1405), and the rubric adds points for large context, history, constraints, and decomposition keywords. This saturates nearly every agentic coding turn to hard. There is no turn-aware separation of conversation burden vs current-turn burden.

Gap: the saturation shortcut is the direct cause of hard classification dominating; R7's turn-aware model is absent.

### R8 Meaningful cost/latency and quality non-inferiority (F5)

Current state: getLatencyMetric (router.ts:916) normalizes against fixed 150/300 ms targets, so multi-second remote endpoints collapse near 0; getCostMetric (router.ts:1018) normalizes against a flat 0.01 target, so inexpensive models collapse near 1. There is no Pareto/non-inferiority rule; weighted total (scoreCandidate router.ts:1531) is the only selector, and the measured-latency selector (routing-latency-selection.ts) is separately stage-gated.

Gap: cost/latency compression and no non-inferiority rule; two latency mechanisms remain separate and confusing.

### R9 Heterogeneous-pool discovery

Current state: downstream OpenAI discovery publishes reasoning support and effort_levels at the model/alias level, and endpoints expose reasoning_effort_levels. There is no effort union vs portable intersection, no per-arm kind (fixed/dynamic/disabled/provider-default), and no published policy vocabulary or provider equivalence.

Gap: discovery does not express heterogeneous arm capability or policy semantics.

### R10 Decision, telemetry, trace, and error provenance

Current state: decisions record selectedModelId, reasoningEffort, effortSource (client | variant | variant_coerced), strategyLabel, and rewrite reason; telemetry/OTel/SQLite persist endpoint-level effort via effort_source. There is no resolution vocabulary (router_managed | exact_primary | unsupported_fallback | ...), no requested-vs-effective-effort pair, and no exact-arm counts before/after eligibility.

Gap: provenance is partial and endpoint-scoped; the R10 resolution vocabulary and arm provenance are absent.

### R11 Operator/UI truthfulness

Current state: the model pool, candidates, and decision surfaces show model and (sometimes) effort, but benchmark evidence is model-level and does not disclose exact vs borrowed arm evidence; the routing config shows the configured operator strategy without always co-displaying the effective per-request strategy or override source.

Gap: arm-level truthfulness (exact/borrowed/default evidence, coercion disclosure, configured-vs-effective strategy) is missing.

### R12 Effect-first and packaged-runtime safety

Current state: the vendored Effect workspace (role-model-router/packages/effect, built as effect@4.0.0-rc.117) is already the substrate; core routing remains a pure function. The packaged SEA dependency closure is validated by runtime:package-sea. No new server dependency is introduced by this run's scope.

Gap: none structural; Phase 3 must follow the Effect-first map and re-verify the SEA closure.

### R13 Strict TDD and regression discipline

Current state: the repository already enforces strict TDD for recursive runs; the touched suites (core, protocol-routing, endpoint-registry, adapter, sqlite-memory, runtime-observability, conformance, runtime-ui) exist and pass at baseline (core 82/82 confirmed).

Gap: run 106 has not yet produced RED/GREEN evidence; that is Phase 3.

### R14 Delegated audits with controller verification

Current state: the delegation plan (requirements) and the repository policy are in place; the implementer route is disabled, so the controller owns writes, and analysis/audit/review roles fall back to in-session subagents or self-audit.

Gap: run 106's per-phase action records and bundles do not exist yet; Phase 1 will record the analyst dispatch and its reconciliation.

### R15 Isolated rebuilt-runtime and real Pi CLI verification

Current state: the run-105 runtime on :3458 is owned by another agent and must not be touched; run 106 has no packaged SEA or isolated runtime yet. Phase 5 will allocate a non-3456/3457/3458 port and drive a separately launched Pi against the rebuilt runtime.

Gap: nothing built yet; this is Phase 5, with the port isolation and Pi binding recorded as hard constraints.

## Known Unknowns

- Exact effort-level vocabulary across all adapters (low/medium/high/xhigh/max/none/provider-default) and which adapters can execute which level dynamically vs only via a fixed endpoint.
- Whether the catalog declares reasoning_effort_levels for every provider-default endpoint, and the fidelity of that declaration for execution mapping.
- Whether effort-scoped evidence migration is safe across existing persisted endpoint-keyed profiles without losing historical attribution.

## Evidence

- Baseline evidence: Effect build PASS; @role-model-router/core vitest run 82/82 (Phase 0).
- Live decision receipts from the audited :3458 runtime (session audit) show the Pro-high (quality 0.9) vs provider-default Flash-high (default 0.5) asymmetry and the disabled measured-latency selector; these are runtime-owned observations, reproduced here as the motivating evidence, not as run-106 output.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md` - effort-aware instance identity and admission.
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md` - strategy precedence and the difficulty override.
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` - arm-effort comparability and evidence revision fencing.

## Traceability

- R1: Current Behavior by Requirement -> R1 (index.ts:10573, :10877).
- R2: -> R2 (effort-instance-identity.ts, index.ts:9489).
- R3: -> R3 (index.ts:9605-9663, :9532-9565).
- R4: -> R4 (trace lineage effortSource).
- R5: -> R5 (router.ts:729, :887).
- R6: -> R6 (scoring-strategy.ts:170, index.ts:1384).
- R7: -> R7 (index.ts:1384, :1400-1405).
- R8: -> R8 (router.ts:916, :1018).
- R9: -> R9 (downstream discovery effort_levels).
- R10: -> R10 (decision effortSource/strategyLabel).
- R11: -> R11 (candidate/decision surfaces).
- R12: -> R12 (effect@4.0.0-rc.117 build).
- R13: -> R13 (baseline 82/82).
- R14: -> R14 (delegation plan).
- R15: -> R15 (Phase 5 constraints).

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: in-session subagents available; analyst 323c261d and phase-auditor f4260377 were dispatched; the phase-auditor returned a complete R1-R15 verification.
Delegation Decision Basis: Phase 1 is audited; independent verification of the current-state claims against source is the default path, and the phase-auditor performed it.
Audit Inputs Provided: 01-as-is.md, 00-requirements.md, 00-worktree.md, and the cited worktree source files; the auditor verified every R1-R15 claim against source and returned two citation repairs (F1, F2).

## Effective Inputs Re-read

- 00-requirements.md (LOCKED)
- 00-worktree.md (LOCKED)
- /.recursive/RECURSIVE.md

## Earlier Phase Reconciliation

Phase 1 has no earlier run-106 artifact beyond Phase 0. The diff basis (remote ref origin/dev @ 701b8b8) and the run-105 exclusion are carried from 00-worktree.md unchanged.

## Subagent Contribution Verification

Reviewed Action Records: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/analyst-323c261d.md`, `/.recursive/run/106-client-neutral-model-effort-routing/subagents/auditor-f4260377.md`
Main-Agent Verification Performed: reconciled each action record's claimed file impact against the run diff and the worktree; reviewed code read-only and untouched in the diff: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/packages/core/src/router.ts`, `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`, `role-model-router/packages/trace/src/lineage.ts`, `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`; reviewed phase artifacts `/.recursive/run/106-client-neutral-model-effort-routing/01-as-is.md` and `/.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md`; re-derived the load-bearing claims (the 0.5-default fallback at router.ts:887, the hard short-circuit at index.ts:1400) before accepting each contribution.
Acceptance Decision: accepted
Refresh Handling: none required; artifact updated in place.
Repair Performed After Verification: `/.recursive/run/106-client-neutral-model-effort-routing/01-as-is.md`

## Worktree Diff Audit

Baseline type: remote ref
Baseline reference: origin/dev
Comparison reference: working-tree
Normalized baseline: 701b8b8fc0b0eeebdfe818b757f5702f50021488
Normalized comparison: working-tree
Normalized diff command: git diff --name-only 701b8b8fc0b0eeebdfe818b757f5702f50021488
Planned or claimed changed files: /.recursive/run/106-client-neutral-model-effort-routing/01-as-is.md
Actual changed files reviewed: HEAD bfd01851 (Phase 0 on 701b8b8); tracked diff = 5 Phase-0 control-plane files; untracked 01-as-is.md only; zero product-code drift
Unexplained drift: none expected at Phase 1 (no product code changed yet)

## Gaps Found

- F1 (auditor) [resolved]: R2 misattributed reasoning_effort_levels to effort-instance-identity.ts; corrected to packages/endpoint-registry/src/index.ts:63.
- F2 (auditor) [resolved]: R1/pointers/traceability cited index.ts:10569 (inside a doc comment); corrected to :10573.
- All other R1-R15 current-state claims were verified by the auditor against source.
- None remain after F1/F2 resolution.

## Repair Work Performed

- Applied F1 and F2 citation repairs; filled Subagent Contribution Verification and Worktree Diff Audit; set Requirement Completion Status to out-of-scope (Phase 1 analysis-only).

## Requirement Completion Status

- R1 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R2 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R3 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R4 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R5 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R6 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R7 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R8 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R9 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R10 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R11 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R12 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R13 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R14 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
- R15 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Independent audit confirms every R1-R15 current-state claim against the worktree source.

Coverage: PASS

## Approval Gate

- [x] Audit passes with no unresolved in-scope gap.

Approval: PASS
