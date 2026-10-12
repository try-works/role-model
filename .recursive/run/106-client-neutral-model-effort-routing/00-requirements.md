Run: /.recursive/run/106-client-neutral-model-effort-routing/
Phase: 00 Requirements
Status: `LOCKED`
LockedAt: `2026-10-04T01:04:39Z`
LockHash: `9be64e945082f71fd7f93376c739ea49d90f002dfaf6e7d71e45dd16f764928f`
Workflow version: recursive-mode-audit-v2
Inputs:
- Operator-approved decisions from the 2026-10-03 routing audit and follow-up (client-neutral model-effort routing; strict/preferred/router policies; unsupported-effort fallback; F4/F5/F6 repairs; isolated-port Pi verification)
- Prior recursive evidence: /.recursive/run/93-variant-admission-model-pool-integrity/ (effort-aware instance identity and admission), /.recursive/run/103-agent-strategy-and-scoring-strategy/ (strategy precedence and scoring), /.recursive/run/104-replay-eligibility-and-evidence-fidelity/ (arm-effort comparability)
- /AGENTS.md, /.recursive/RECURSIVE.md, /.recursive/STATE.md, /.recursive/DECISIONS.md, /.recursive/memory/MEMORY.md, /.recursive/memory/skills/SKILLS.md
Outputs:
- /.recursive/run/106-client-neutral-model-effort-routing/00-requirements.md
Scope note: This document defines the stable requirement set for making reasoning effort a first-class, client-neutral routing dimension, scoring executable model-endpoint-effort arms with effort-scoped evidence, and proving the result with strict TDD, delegated audits, and live Pi-CLI verification of the rebuilt runtime on an isolated port.

# Run 106 — Client-neutral model-effort routing

## Intent

Reasoning effort becomes a first-class routing dimension. The runtime routes over executable model-endpoint-effort arms, uses evidence for the effort considered, honors exact effort when available, falls back transparently when a non-strict effort is absent, and records the outcome. The normalized contract is client-neutral across Pi, DSH, Codex, OpenAI-compatible clients, and future adapters.

## Motivating evidence

On the audited :3458 runtime, high-effort traffic mostly selected V4 Pro although Flash appeared faster, cheaper, and strongly benchmarked. V4 Pro-high received benchmark-backed quality near 0.9, while executable provider-default Flash-high fell to 0.5 because the displayed Flash evidence belonged to fixed Flash-max. Hard difficulty also overrode the saved latency scoring, while the measured-latency selector was separately unauthorized. The arithmetic was consistent; the arm/evidence identity and its presentation were not.

## TODO

- [x] Elicit requirements from the operator decisions and the routing audit
- [x] Map every operator decision and finding to requirement identifiers
- [x] Define requirement identifiers (R1..R15)
- [x] Write observable acceptance criteria for each requirement
- [x] Record a verification method per requirement (tests, evidence, live QA)
- [x] Document out-of-scope items (OOS1..OOS6)
- [x] List constraints and assumptions
- [x] Break the requirements into phases, tasks and subphases with stable identifiers
- [x] Define the delegation plan and the controller verification protocol
- [x] Record the run-104 baseline and run-105 merge coordination
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Operator decision coverage map

Every fixed operator decision and every approved finding maps to at least one requirement; nothing is left to the Phase 2 plan alone.

| Source obligation | Covered by |
| --- | --- |
| D1 Joint model-endpoint-effort arms | R2, R3, R5, R6 |
| D2 Omitted effort is router-managed | R1, R3 |
| D3 Legacy scalar effort is preferred | R1, R3 |
| D4 Exact-effort arms form the primary pool | R3, R6 |
| D5 Zero exact arms -> unsupported fallback | R3, R10 |
| D6 strict requires an exact arm or fails | R3, R10 |
| D7 No implicit nearest-effort mapping | R3, R9, OOS1 |
| D8 none / omitted / provider-default distinct | R4 |
| D9 Client identity cannot change semantics | R1, R15 |
| D10 Phase 5 isolated port, real Pi process | R15, Constraints |
| F4 Turn-aware difficulty repair | R7 |
| F5 Cost/latency + quality non-inferiority | R8 |
| F6 Effort-scoped evidence and priors | R5 |

## Requirements

### R1 Client-neutral effort contract

Description: Every client-facing ingress normalizes into one effort contract where the requested value is separate from the routing policy, and client identity never changes the decision.

Acceptance criteria:
- Canonical input separates requested_effort from effort_policy (strict | preferred | router); the policy vocabulary is closed and validated, while provider effort labels remain forward-compatible data.
- Omitted effort normalizes to router; a legacy scalar effort normalizes to preferred; an explicit policy is authoritative.
- Chat Completions, Responses, Pi, DSH, Codex, direct SDK, header, and request-option paths produce equivalent normalized input or the same typed error.
- Client identity is diagnostic only and cannot alter candidates, fallback, preference, or scoring.

Verification: schema/normalization tables and cross-ingress decision parity tests.

### R2 Executable model-effort arms

Description: The router selects over executable model-endpoint-effort arms rather than base endpoints, so a model's advertised effort levels become explicit routing candidates.

Acceptance criteria:
- Fixed-effort endpoints create one fixed arm; dynamic provider-default endpoints create one arm per adapter-executable declared level plus a distinct provider-default arm when supported.
- Every arm carries model, endpoint/provider/account/region identity, requested/effective effort state, source, execution mapping, and a revisioned evidence key.
- A catalog declaration alone cannot make an arm routable; a valid adapter execution mapping is mandatory.
- Equivalent physical/virtual arms are canonicalized, or retained only for materially distinct execution/admission properties; duplicates cannot double ranking opportunity.
- Eligibility and scoring consume arms before selection; the selected effort reaches provider dispatch.
- Run-93 identities and historical evidence remain readable without destructive merging.

Verification: expansion, deduplication, payload, dispatch, and migration tests.

### R3 Strict, preferred, and router-managed resolution

Description: Effort policy is resolved deterministically, with exact-effort arms primary and non-exact arms as receipted fallback; a non-strict unsupported effort degrades gracefully.

Acceptance criteria:
- router jointly selects from all otherwise eligible arms.
- strict considers exact-effort arms only and otherwise returns reasoning_effort_unavailable with sanitized requested/available facts.
- preferred with exact arms routes in that primary pool; non-exact arms enter only after a named hard-eligibility or provider-attempt fallback, with a receipt.
- preferred with zero exact executable arms records unsupported_fallback, ignores the hint, and performs router-managed selection.
- Exact-arm counts before and after hard eligibility distinguish unsupported from temporarily unavailable.
- Unsupported fallback never reports the client effort as applied or exact.
- No nearest-label mapping occurs absent explicit, versioned provider equivalence.

Verification: cross-product tests over policies, exact support by all/some/none, hard gates, fixed/dynamic arms, provider failure, and equivalence.

### R4 Lossless effort states

Description: Named effort, disabled reasoning, provider-default, and no client preference remain distinct through every layer.

Acceptance criteria:
- Internal types distinguish named effort, disabled reasoning, provider-default, and no client preference.
- Serialization, SQLite, discovery, API, telemetry, trace, and UI preserve the distinction.
- Adapters reject unrepresentable strict states instead of silently dropping them.
- Nullable historical rows migrate deterministically without losing attribution.

Verification: schema round-trip, migration, adapter-wire, and projection tests.

### R5 Effort-scoped evidence and hierarchical priors (F6)

Description: Benchmark and operational evidence is keyed by the effort arm it measured; cross-effort evidence only ever acts as a labeled, discounted prior.

Acceptance criteria:
- Evidence keys include endpoint/model identity, effective effort, membership/profile revision, and current provenance dimensions.
- Resolution order: exact endpoint+effort; same model/provider exact effort; same endpoint related effort; model aggregate; catalog prior; neutral default.
- Non-exact evidence is labeled and confidence-discounted; borrowed evidence never appears as exact benchmark evidence.
- Cross-effort priors regress toward neutral by a documented symmetric rule.
- Exact evidence monotonically supersedes priors as samples grow; stale or mismatched revisions cannot overwrite it.
- UI cannot claim model-level parity without disclosing exact versus borrowed arm evidence.

Verification: evidence/shrinkage tables, revision fencing, cold-start tests, and an audited Pro-high/Flash-high reproduction.

### R6 Arm-aware strategy, controller, advice, cache, and fallback

Description: Existing ranking and lifecycle machinery consumes the resolved arm pool and stays effort-aware.

Acceptance criteria:
- Existing strategy precedence (run 103) consumes the resolved arm pool.
- Difficulty may influence posture or router-managed effort but cannot falsify strict/preferred resolution.
- Controller/advisory preferences for a base model/endpoint expand deterministically to eligible arms and cannot invent effort.
- Cache continuity and learned advice are effort-aware.
- Circuit/provider fallback preserves the effort policy and receipts expansion beyond the exact primary arms.

Verification: precedence, controller, advisory, continuity, circuit, and provider-failure tests.

### R7 Turn-aware difficulty repair (F4)

Description: Difficulty classification stops saturating long agent sessions and becomes turn-aware.

Acceptance criteria:
- Classification separates current-turn burden, bounded/diminishing conversation burden, operation risk, required quality, and latency sensitivity.
- The unconditional toolCount > 0 && codeOrSchemaBurden => hard saturation is removed or narrowed by a documented risk rule.
- A trivial follow-up in a long coding session can classify below hard; genuinely risky tool/code/schema work remains hard.
- Cache invalidation follows the revised features and refuses materially stale classification.
- Receipts expose the decisive features and the classifier version.

Verification: a corpus covering audited long sessions, trivial follow-ups, fresh hard tasks, tool-free asks, and cache invalidation.

### R8 Meaningful cost/latency and quality non-inferiority (F5)

Description: Cost and latency stop collapsing meaningful differences, and a Pareto/non-inferiority rule can let a cheaper, faster, non-inferior arm win.

Acceptance criteria:
- Cost uses arm/workload expected request cost, including effort-sensitive output/cache economics when known, and preserves absolute values.
- Latency uses effort- and prompt-size-specific distributions with samples/confidence; multi-second candidates do not collapse indistinguishably.
- Normalization is documented, bounded, stable under irrelevant candidates, and robust to sparse evidence/outliers.
- A configured Pareto/non-inferiority rule lets a statistically non-inferior, materially faster and cheaper arm outrank a dominated arm unless a named hard policy blocks it.
- The rule records thresholds, confidence, arms, and whether it changed weighted selection; missing quality cannot establish non-inferiority.
- Measured-latency selection is unified with this model or remains explicitly separate with authority/precedence shown in decision/config surfaces.

Verification: ranking, sparse/outlier, Flash/V4 counterfactual, and eligibility-invariance property tests.

### R9 Heterogeneous-pool discovery

Description: Discovery advertises effort capability at the arm level so clients can omit effort safely or prevalidate strict effort.

Acceptance criteria:
- Discovery publishes the effort union, the portable intersection, per-model/per-endpoint support, and fixed/dynamic/disabled/provider-default kind.
- It publishes supported policies and explicit provider equivalence with version/provenance.
- Discovery derives from executable arms and refreshes with admission/config changes.
- An empty intersection is valid and does not hide usable union levels.
- Clients can omit effort safely and can prevalidate a strict effort before sending.

Verification: discovery schema, alias aggregation, admission refresh, and multi-client consumption tests.

### R10 Decision, telemetry, trace, and error provenance

Description: Every decision and error explains the requested effort, the policy, the resolution, and the selected arm with honest evidence.

Acceptance criteria:
- Decisions record client provenance, requested effort, policy, union/intersection, exact counts before/after hard eligibility, resolution, selected model/endpoint/effective effort, source, and reason.
- The resolution vocabulary includes router_managed | exact_primary | exact_fallback_expanded | unsupported_fallback | strict_rejected | equivalent_mapped.
- Candidate diagnostics expose metrics, exact/borrowed/default evidence, confidence/samples, revision, strategy/weights, Pareto result, and exclusions without secrets or prompts.
- Telemetry, OTel, SQLite, request detail, decision detail, and errors agree.
- Historical variant_coerced remains readable; new outcomes never conceal coercion.
- Errors distinguish unsupported strict effort, no executable arm, exact arms temporarily ineligible, and provider failure after fallback.

Verification: contracts, migrations, SQLite/OTel projections, errors, and API consistency tests.

### R11 Operator/UI truthfulness

Description: Every operator surface shows model plus effective effort and exact/prior evidence, and never hides coercion.

Acceptance criteria:
- Candidate, model pool, benchmark, request, and decision surfaces show model plus effective effort and exact/prior evidence.
- Routing configuration co-displays configured/effective strategy, override source, effort policy/resolution, and measured-latency authority.
- Counts disclose window, total, truncation/pagination, and aggregation across arms.
- Unsupported fallback and exact-pool expansion are prominent and accessible; color is not the sole distinction.
- No credential, prompt, or raw provider body is exposed.

Verification: component/API fixture/accessibility tests and a Phase 5 browser readback when UI changes.

### R12 Effect-first and packaged-runtime safety

Description: New modules follow the repository's Effect-first rule without breaking packaged-runtime constraints.

Acceptance criteria:
- Before Effect edits, implementation reads the effect-ts skill and applicable vendored guidance.
- New schemas/services/state/concurrency use the vendored Effect workspace when possible and suitable; pure scoring remains pure.
- Any obvious non-Effect choice records a concrete suitability/packaging rationale.
- No new server dependency, secret exposure, cross-state-root coupling, or SEA-incompatible dynamic dependency is introduced.
- Vendored pin verification and packaged dependency closure pass.

Verification: focused tests, dependency review, vendor verification, SEA build, clean-start/restart checks.

### R13 Strict TDD and regression discipline

Description: Production behavior is written test-first with RED/GREEN evidence, preserving prior-run regressions.

Acceptance criteria:
- Phase 3 declares TDD Mode: strict and logs every RED-GREEN-REFACTOR cycle (test file, command, evidence path).
- RED evidence lives under /.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/red/ and GREEN evidence under evidence/logs/green/; no production change precedes its focused failing test.
- Every R1-R12 behavior has at least one dedicated test or a named, justified non-code verification.
- Run-93 identity/admission, run-103 strategy, run-104 comparability, conformance, adapter, SQLite, observability, UI, and packaging suites remain green.
- Phase 4 runs the focused Tier A suite and repository Tier B unless an approved addendum narrows it with evidence.

Verification: Phase 3 TDD log/transcripts, Phase 4 implementation audit, delegated adequacy audit, and controller reruns.

### R14 Delegated audits with controller verification

Description: Audited phases use delegated audit/review with complete bundles, action records, and controller verification; failures preserve-repair-retry.

Acceptance criteria:
- Phase 1 analyst, Phase 2 traceability, bounded Phase 3 reviews, Phase 3.5 full review, Phase 4 test audit, Phase 5 QA review/execution, and Phase 8 memory audit are delegated when a complete bundle and a usable route/subagent exist.
- Meaningful delegation creates an action record under subagents/; raw routed output stays under evidence/router/.
- The controller independently checks files, diff, artifacts, and commands before acceptance.
- Failed or nonzero delegated attempts are preserved, repaired, retried, and never count as pass evidence.
- If discovery/routing is absent or unusable, the phase records the fallback and performs a full self-audit with unchanged rigor.

Verification: action records, bundles, phase audit contexts, controller fields, and recursive lint.

### R15 Isolated rebuilt-runtime and real Pi CLI verification

Description: The change is proven on a rebuilt, packaged runtime driven by a real Pi CLI explicitly bound to an isolated port, never 3456/3457/3458.

Acceptance criteria:
- Phase 5 declares QA Execution Mode: agent-operated (or hybrid with recorded operator sign-off) and packages the exact worktree with corepack pnpm run runtime:package-sea, capturing manifest, source/commit identity, executable hash, and Effect/Track-B closure.
- QA allocates and records a free loopback port from an approved non-reserved range; ports 3456, 3457, and 3458 are forbidden; availability is re-checked immediately before launch.
- The runtime proves PID, executable path/hash, endpoint, isolated run-scoped state root/scope, and build identity.
- A separately launched Pi CLI is installed/configured from this worktree's packages/pi-role-model (or the exact artifact) and explicitly bound to the chosen runtime URL; Pi discovery/status plus matching runtime request/decision IDs prove the request reached that port/build, not an unverified environment variable.
- Existing listeners on 3456/3457/3458 are never stopped, restarted, reconfigured, mutation-probed, or reused; cleanup kills only the PID launched by this run after PID/executable/port verification.
- Live Pi scenarios cover router-managed omitted effort, preferred exact effort, pool-wide unsupported preferred fallback, strict unsupported rejection, exact support by only some models, exact primary unavailable with receipted fallback, and distinct none/default states where supported.
- Two semantically identical requests through Pi and a second client path prove normalized parity.
- The live/controlled pool has heterogeneous effort sets and proves joint model-effort choice; decision and telemetry APIs are inspected for exact arm evidence and fallback receipts.

Verification: Phase 5 artifact and evidence binder, runtime/Pi process metadata, request IDs, decision/telemetry/discovery readbacks, and optional browser readbacks.

## Out of Scope

- OOS1: Provider-specific invention of an effort ordering or automatic high-to-xhigh/max mapping without published provider equivalence.
- OOS2: Re-benchmarking every provider/model/effort combination as a release prerequisite; exact gaps use honest priors until measured.
- OOS3: Changing provider pricing/catalog facts except where needed to key existing economics by effort arm.
- OOS4: Stage/main promotion, RC publication, or mutation of production/stage/development runtimes.
- OOS5: Redesigning Track B learning beyond effort-aware package identity and receipts needed by this run.
- OOS6: Guaranteeing identical text across clients; parity is normalized routing semantics and arm selection under identical inputs/snapshot/seed.

## Constraints

- Ordinary development begins in a dedicated worktree from the current origin/dev tip; never implement on long-lived dev.
- The pre-existing modified llama-swap binaries in the controller checkout are not run-106 changes and must not enter the worktree diff.
- Node is >=24 <25; use corepack pnpm and the existing vendored Effect/Effect-MQ pins.
- Secrets, authorization headers, raw prompts/provider bodies, and real credentials are never committed or copied into evidence. Live credentials are operator-provided through existing credential references only.
- Runtime channels, state roots, scopes, logs, locks, and artifacts remain isolated. Ports 3456, 3457, and 3458 are reserved and forbidden for run-106 QA.
- Phase 5 must exercise the packaged SEA, not the source-only QA server. The Pi process must be explicitly connected to the run-106 port and proven by request receipt.
- QA may allocate an ephemeral/free port, but must record it durably before starting requests and re-check it immediately before bind.
- No existing runtime process may be killed or modified. Cleanup is identity-checked and limited to run-106 processes.
- Public contracts evolve additively where compatibility permits; legacy scalar effort and historical variant_coerced records remain readable.
- The router remains live-input-driven. Replay/evaluation/learner data cannot become a hidden hard dependency for serving.
- Any UI work follows the existing role-model design system and accessibility contract.

## Baseline and merge coordination

- Run 106 branches from origin/dev @ 701b8b8fc0b0eeebdfe818b757f5702f50021488, which is the merged run 104 tip. Run 105 (recursive/105-route-learning-matching-scope-activation, head 80ad810e at audit time) is an in-flight sibling branch and is NOT a baseline.
- Run 106 never branches from, or merges, a recursive/105-* branch. If run 105 reaches dev first, run 106 rebases onto the new dev tip before its PR; if run 106 lands first, run 105 rebases onto it. Either way, the two are reconciled at promotion time, not during Phase 1-4.
- Known conflict-prone overlap (Phase 1/2 must re-check against run 105's actual diff before locking): apps/runtime-host-bridge/src/index.ts (advisory/learning recall vs effort resolution), packages/sqlite-memory/src/index.ts (route-learning persistence vs effort-scoped evidence keys), and decision/observability provenance surfaces.
- Phase 1 records which run-105 changed paths intersect run 106's planned surface; Phase 2 states the rebase/merge order and the specific conflict resolution strategy before implementation begins.
- Run 106's Phase 5 isolated runtime and Pi process are independent of run 105's runtime instances and use their own run-scoped state root and a non-reserved port.

## Assumptions

- Configured endpoint metadata and adapters can authoritatively state which effort values are executable; when they cannot, the arm is not advertised as executable.
- Controlled provider/test doubles may prove rare failure paths, but at least one successful live Pi route must traverse a real configured provider through the packaged runtime when credentials are authorized.
- The existing alias pool, admission, health, role/task, capability, modality, context, budget, and circuit rules remain hard eligibility authorities.
- Existing run-103 strategy precedence remains unless an approved addendum explicitly changes it; R7/R8 improve signals and ranking, not hidden policy ownership.

## Delivery phases, tasks and subphases

The breakdown maps the operator decisions and the audit findings onto the recursive-mode phases. Every Phase 1/2 task carries the same four fields (Scope, Inputs, Outputs, Verification) so a task can be handed to a subagent without re-deriving context. Task ids are stable and reused by the Phase 2 plan, the Phase 3 sub-phases, the evidence tree, and the delegation records.

### Phase 0 - Worktree isolation

Create /.worktrees/106-client-neutral-model-effort-routing from origin/dev @ 701b8b8, record the exact diff basis in 00-worktree.md, install/build dependencies, and capture a clean baseline or pre-existing failures. All later phases execute in the worktree.

### Phase 1 - AS-IS and root cause (analyst-delegable)

| Task | Scope | Inputs | Outputs | Verification |
| --- | --- | --- | --- | --- |
| T1.1 Source requirement inventory | Index every obligation of the operator decisions and findings with a source quote, a normalized summary, and a disposition | This artifact, the routing-audit findings | 01-as-is.md ## Source Requirement Inventory | Every decision/finding appears exactly once; each entry names a requirement id |
| T1.2 Ingress effort trace | Record how every client shape (Chat Completions, Responses, Pi, DSH, Codex, SDK, header, request-option) reaches effort resolution, with file:line anchors | apps/runtime-host-bridge/src/index.ts, packages/pi-role-model | 01-as-is.md subsection | Each claim cites a file and line; reproducible from the recorded diff basis |
| T1.3 Arm and evidence identity inventory | Record fixed/dynamic/provider-default identity and effort-scoped evidence keys from runs 93, 103, 104 and current source | packages/core/src/router.ts, packages/sqlite-memory/src/index.ts, prior-run docs | 01-as-is.md subsection | Each identity/evidence-key claim names its source run and current path |
| T1.4 Reproduce Pro-high/Flash-high asymmetry | Reproduce the evidence asymmetry and the strategy/latency-gate interaction with sanitized fixtures or live read-only evidence | Live decision receipts, candidate profiles | 01-as-is.md + 01.5-root-cause.md evidence | The observed quality gap (0.9 vs 0.5) and the disabled latency selector are demonstrated end to end |
| T1.5 Root cause analysis | Prove the root causes (arm/evidence identity mismatch, difficulty override, unauthorized latency selector) before planning fixes | 01-as-is.md | 01.5-root-cause.md | Root causes are demonstrated, not hypothesised |

### Phase 2 - ExecPlan and ownership (planner-delegable audit)

| Task | Scope | Inputs | Outputs | Verification |
| --- | --- | --- | --- | --- |
| T2.1 Requirement mapping | Map every R1-R15 and every Phase-1 source item with ## Requirement Mapping, ## Plan Drift Check, and plan-stage ## Requirement Completion Status | 01-as-is.md, 01.5-root-cause.md | 02-to-be-plan.md | No requirement unmapped; no sub-phase without a requirement id |
| T2.2 Sub-phase definition | Define SP1-SP9 with file ownership, disjointness, ordering, RED tests, GREEN evidence, rollback, migrations, and package/QA commands | 02-to-be-plan.md | 02-to-be-plan.md | Write scopes are disjoint; each SP lists its RED tests first |
| T2.3 Verification and QA plan | Fix exact Tier A/B suites, the isolated-port allocation, the identity-safe cleanup, and the Pi matrix | R13, R15 | 02-to-be-plan.md | Every R# acceptance criterion has a named command or observed artefact |
| T2.4 Delegation and risk register | Confirm the delegation plan, re-read router policy/discovery, define complete bundles and controller verification | .recursive/config/recursive-router*.json | 02-to-be-plan.md | Each delegated task names role, bundle path, and controller verification |

Expected implementation subphases (Phase 2 may refine without losing coverage):

| Sub-phase | Requirement coverage | Scope | RED evidence | GREEN evidence |
| --- | --- | --- | --- | --- |
| SP1 | R1, R4 | Normalized effort schema/policy and client adapters | evidence/logs/red/sp1-*.log | evidence/logs/green/sp1-*.log |
| SP2 | R2-R4 | Executable arm identity, expansion, dedupe, dispatch mapping | evidence/logs/red/sp2-*.log | evidence/logs/green/sp2-*.log |
| SP3 | R5, R10 | Effort-scoped evidence, migration, priors, confidence | evidence/logs/red/sp3-*.log | evidence/logs/green/sp3-*.log |
| SP4 | R3, R6 | Policy resolution, fallback, controller/advisory/cache/circuit | evidence/logs/red/sp4-*.log | evidence/logs/green/sp4-*.log |
| SP5 | R7 | Turn-aware difficulty classifier and cache receipts | evidence/logs/red/sp5-*.log | evidence/logs/green/sp5-*.log |
| SP6 | R8 | Cost/latency normalization and non-inferiority/Pareto | evidence/logs/red/sp6-*.log | evidence/logs/green/sp6-*.log |
| SP7 | R9-R10 | Discovery, APIs, telemetry, trace, SQLite errors/provenance | evidence/logs/red/sp7-*.log | evidence/logs/green/sp7-*.log |
| SP8 | R11 | Operator/UI truthfulness and accessibility | evidence/logs/red/sp8-*.log | evidence/logs/green/sp8-*.log |
| SP9 | R12, R15 | Package/client integration and isolated QA harness | evidence/logs/red/sp9-*.log | evidence/logs/green/sp9-*.log |

### Phase 3 - Strict TDD implementation

Controller owns production writes unless a future resolved implementer route explicitly authorizes bounded disjoint work. Each SP begins with failing tests and RED evidence, then minimal implementation, GREEN, refactor, and a bounded code-review audit. Phase 3 maintains the R13 compliance log.

### Phase 3.5 - Canonical code review

Generate a fresh recursive-review-bundle, delegate code review, verify every finding against the actual diff, repair in Phase 3, regenerate the bundle after material change, and re-review before lock.

### Phase 4 - Implementation and test audit

Audit requirements against changed files before trusting tests. Run the focused and broad suites, packaging checks, migrations, conformance, and test-adequacy delegation. The controller reruns accepted commands and records exact logs.

### Phase 5 - Agent-operated isolated runtime QA

1. Package the exact worktree SEA.
2. Select a currently free loopback port excluding 3456-3458; record port/PID/path/hash/state root/scope.
3. Start only the run-106 runtime with a fresh run-scoped state root.
4. Install/configure a separate Pi instance from the exact worktree/package to this runtime URL.
5. Run pi --no-session --provider role-model --model <alias> -p "<prompt>" scenarios for R15.
6. Prove each Pi request reached the chosen port/build using Pi discovery/status and matching runtime request/decision IDs.
7. Run a second-client parity scenario, inspect discovery/decision/telemetry/UI, preserve evidence, and clean up only identity-verified run-106 processes.

### Phases 6-8 - Closeout

Update decisions, state, and memory using final validated code/evidence. Phase 8 captures run-local skill usage and delegates memory audit when possible.

## Delegation plan

Current router policy makes orchestrator local-only; analyst/planner/code-reviewer/tester/memory-auditor request external routing but have null CLI/model with self-audit fallback; implementer is disabled; discovery inventory is absent in this controller checkout. Every phase must re-read actual policy/discovery rather than inherit this snapshot.

| Task | Delegated? | Role | Why | Required artefacts | Controller verification |
| --- | --- | --- | --- | --- | --- |
| T1.1-T1.5 | Yes (draft + audit) | analyst | Independent AS-IS/root-cause pass catches drift | subagents/analyst-t1.md + review bundle | Re-read every cited file; confirm claims against the diff basis |
| T2.1-T2.4 | Yes (traceability audit) | planner | Requirement-to-plan coverage is the guarded failure mode | subagents/planner-t2.md | Every R# mapped; spot-check mappings against the plan |
| Phase 3 SP audits | Yes (bounded, read-only) | code-reviewer | Cheap bounded verification of one SP diff | subagents/code-reviewer-spN.md | Controller re-runs named commands and re-reads the diff |
| Phase 3.5 review | Yes | code-reviewer | High-risk change; full bundle review | evidence/review-bundles/03-5-code-review.md + action record | Findings verified against actual files; repairs recorded |
| T4 test-adequacy audit | Yes | tester | Tests are the R13 evidence base | subagents/tester-t4.md | Controller re-runs accepted commands and compares logs |
| T5 Pi matrix | Yes (supervised execution) | tester | Mechanical matrix; controller monitors | subagents/tester-t5.md + transcripts | Controller verifies every process identity, request ID, receipt, and cleanup |
| T8 memory audit | Yes | memory-auditor | Memory/status drift is easy to miss | subagents/memory-auditor-t8.md | Compare touched paths and statuses with the final diff |

Rules this plan keeps: one active phase at a time; subagents never authorize parallel phases; write-capable delegation is prohibited (implementer disabled); every delegated dispatch cites a bundle or explicit context list; any failure, success:false, or nonzero routed exit triggers an audit-repair-retry loop with the failed attempt preserved as evidence.

## Controller verification of delegated work

No delegated result is accepted on its own word. For every delegated task the controller:

1. Confirms the task was dispatched with a complete bundle (phase, artifact path, upstream artifacts, diff basis, changed files, targeted code refs, audit questions, output shape).
2. Verifies the claim against the actual worktree: re-reads the named files, re-runs the named commands, and diffs the claimed scope against the normalized diff command recorded in 00-worktree.md.
3. Rejects any output that lacks a verdict, cites no changed files, ignores addenda, or cannot be turned into a durable action record.
4. Repairs in-scope gaps itself, refreshes the bundle when repairs change reviewed scope, and re-dispatches the same role before accepting.
5. Records Reviewed Action Records, Main-Agent Verification Performed, Acceptance Decision, Refresh Handling, and Repair Performed After Verification in the phase artifact.

Action records live under /.recursive/run/106-client-neutral-model-effort-routing/subagents/; routed transcripts live under evidence/router/.

## Requirement-to-task traceability

| Requirement | Phase 1 task | Sub-phase / phase | Delegated verification |
| --- | --- | --- | --- |
| R1 | T1.2 | SP1 | code-reviewer-sp1 |
| R2 | T1.2-T1.3 | SP2 | code-reviewer-sp2 |
| R3 | T1.2/T1.4 | SP4 | code-reviewer-sp4 |
| R4 | T1.2-T1.3 | SP1-SP3 | code-reviewer-sp2 |
| R5 | T1.3-T1.5 | SP3 | code-reviewer-sp3 |
| R6 | T1.2 | SP4 | code-reviewer-sp4 |
| R7 | T1.4-T1.5 | SP5 | code-reviewer-sp5 |
| R8 | T1.4-T1.5 | SP6 | code-reviewer-sp6 |
| R9 | T1.2 | SP7 | code-reviewer-sp7 |
| R10 | T1.2-T1.4 | SP7 | code-reviewer-sp7 |
| R11 | T1.2 | SP8 | code-reviewer-sp8 |
| R12 | T1.3 | all SPs, SP9 | Phase 3.5 review |
| R13 | - | Phase 3 TDD log, Phase 4 | tester-t4 |
| R14 | all audited phases | Phase 3.5, 4, 5, 8 | controller acceptance |
| R15 | T1.4 | SP9 and Phase 5 | tester-t5 + controller acceptance |

## Coverage Gate

- [x] Every operator decision (D1-D10) and finding (F4/F5/F6) maps to at least one R# via the coverage map.
- [x] Every R1-R15 has a Description, observable Acceptance criteria, and a stated Verification method.
- [x] Strict TDD (R13), delegated audits (R14), Effect/packaging safety (R12), and effort-scoped evidence (R5) are explicit requirements.
- [x] Isolated packaged-runtime + real Pi proof on a non-3456/3457/3458 port is R15 and Constraints.
- [x] Run 104 baseline and run 105 merge coordination are recorded.
- [x] Every requirement is broken into phases, tasks, and subphases with stable ids and subagent handoff fields.

Coverage: PASS

## Approval Gate

- [x] The operator authorized run 106 creation and approved the effort-routing semantics.
- [x] No unresolved in-scope gap remains; the requirement set is stable for Phase 1.

Approval: PASS

Approval basis: operator instructions in this session approved the client-neutral model-effort contract, strict/preferred/router policies, unsupported-effort fallback, F4/F5/F6 repairs, strict TDD, delegated audits, and isolated-port rebuilt-runtime + real-Pi verification. The structure now mirrors run 103 (Description + Acceptance criteria per R#, four-field task tables, delegation plan table, controller verification protocol, and traceability table).


