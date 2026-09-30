Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `02 TO-BE plan`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md` (locked)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-worktree.md` (locked, diff basis)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/01-as-is.md` (locked)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/01.5-root-cause.md` (locked)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` (locked)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/other/analyst_t1.md` (verified delegated evidence)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/inputs/16-agent-strategy-and-scoring-strategy.md` (design document)
Outputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/02-to-be-plan.md`
Scope note: Defines the concrete, file-owned implementation plan, its sub-phases, its tests and its verification so
Phase 3 can execute under strict TDD.

## TODO

- [x] Map every requirement to a sub-phase and a surface
- [x] Own every planned change by file
- [x] Define the testing strategy, RED set and evidence paths
- [x] Define the manual QA scenarios, including the live pi-CLI matrix
- [x] Define idempotence and recovery
- [x] Complete the plan drift check
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Changes by File

| File | Change | Sub-phase |
| --- | --- | --- |
| `role-model-router/packages/core/src/router.ts` | Export `STRATEGY_WEIGHTS` as the single preset source (already done in the exploratory slice; re-derived here under TDD) | `SP1` |
| `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts` (new) | Own the strategy vocabulary, the weight-profile schema, the tagged plan type and the pure resolver | `SP1`, `SP2` |
| `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Decode/render `routing.mode`, `routing.scoring_strategy`, `routing.pin_weights`, `routing.weights`, `agent_strategies`, `workloads`; normalize legacy spellings on write | `SP1`, `SP5`, `SP6` |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | Feed the resolved strategy into the routing request; pin semantics; posture alias materialisation; provenance in diagnostics and telemetry | `SP2`, `SP3`, `SP4`, `SP5`, `SP6` |
| `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts` | Add `latency` to the supported controller set and prompt rubric | `SP4` |
| `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts` | Compare effective latency `p50 + 0.25 * (p95 - p50)` and record it | `SP7` |
| `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts` | New defaults and bounds (`max_delta_ms` 10000, `min_samples` 5 bound 5..30) | `SP7` |
| `role-model-router/packages/sqlite-memory/src/index.ts` | No change expected (buckets already expose p50/p95); verify only | `SP7` |
| `role-model-router/apps/runtime-ui/app/lib/routing-mode.ts` | Mode/scoring vocabulary and normalization; remove synonym persistence | `SP8` |
| `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx` | Mode, scoring, weights editor, pin checkbox, scope, resolved-posture line, latency card | `SP8` |
| `role-model-router/apps/runtime-ui/app/routes/agent-strategy.tsx` (new), `.../workloads.tsx` (new) | Separate posture pages | `SP8` |
| `role-model-router/apps/runtime-ui/app/routes/router.tsx`, `.../router-decisions.tsx`, `.../router-decision-detail.tsx` | Stop deriving alias ids and labels from raw strings; show strategy source and latency receipt | `SP3`, `SP8` |
| `docs/architecture/16-agent-strategy-and-scoring-strategy.md` (PR #288) | Correct the stale anchors found in Phase 1 | `SP8` (documentation) or follow-up PR |

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: Posture split and configuration contract | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP1`
- R2 | Coverage: direct | Source Quote: Resolution and precedence | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP2`
- R3 | Coverage: direct | Source Quote: Decision provenance and honest readback | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP3`
- R4 | Coverage: direct | Source Quote: Intelligent mode keeps its contract and gains | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/controller-routing-contract.test.ts` | QA Surface: `sub-phase SP4`
- R5 | Coverage: direct | Source Quote: Agent strategy postures (role-bound) | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP5`
- R6 | Coverage: direct | Source Quote: Workload postures | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP6`
- R7 | Coverage: direct | Source Quote: Measured-latency override | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts`, `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP7`
- R8 | Coverage: direct | Source Quote: Operator surfaces | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`, `role-model-router/apps/runtime-ui/app/routes/agent-strategy.tsx`, `role-model-router/apps/runtime-ui/app/routes/workloads.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/` | QA Surface: `sub-phase SP8`
- R9 | Coverage: direct | Source Quote: Effect-first implementation | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP1`
- R10 | Coverage: direct | Source Quote: Extensibility and future-proofing | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP1`
- R11 | Coverage: direct | Source Quote: Strict TDD discipline | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/` | Verification Surface: `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/logs/` | QA Surface: `Phase 3 TDD log`
- R12 | Coverage: direct | Source Quote: Live verification of the rebuilt runtime with the pi CLI | Implementation Surface: `role-model-router/packages/pi-role-model/`, `role-model-router/apps/runtime-host-bridge/src/` | Verification Surface: `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/` | QA Surface: `Phase 5 live matrix`

## Implementation Steps

1. `SP1` - vocabulary, weight profile and config schema (new module plus config decode/render).
2. `SP2` - pure resolver with the documented precedence and the routing-request plumbing.
3. `SP3` - provenance: `strategy_source`, weights digest, discarded directives, telemetry and readback.
4. `SP4` - Intelligent mode: `latency` in the controller set, pin interaction, prompt coverage.
5. `SP5` - agent strategies: config block, role binding, alias materialisation, collisions, intent precedence.
6. `SP6` - workloads: config block, capability pins, alias materialisation, batch/embedding examples.
7. `SP7` - measured-latency override: effective-latency metric, defaults, bounds, paired-registry dependency.
8. `SP8` - UI: routing page, Agent strategy page, Workloads page, decision detail.
9. Phase 3.5 review, Phase 4 tests, Phase 5 live QA, Phases 6-8 closeout.

## Testing Strategy

- Strict TDD for every production change: a failing test first, recorded under
  `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/logs/red/`, then the implementation, then GREEN
  evidence under `evidence/logs/green/`.
- Commands: `corepack pnpm --filter @role-model-router/core test`,
  `corepack pnpm --filter @role-model-router/runtime-host-bridge test`,
  `corepack pnpm --filter @role-model-router/runtime-ui test`, plus the focused vitest file per sub-phase.
- The design document's section 10.1 list (18 items) is the initial RED set; every requirement R1-R10 also needs at
  least one dedicated test, and R10 needs the extension drill.
- Same-candidate-set tests prove that different strategies choose different winners where the weight tables say
  they should.
- Config round-trip tests cover the legacy migration table and the `custom` weight invariants.

## Playwright Plan (if applicable)

Not applicable for new specs: this repository's browser lane is
`corepack pnpm --filter @role-model-router/runtime-ui run test:browser`, and it must stay green. New UI behaviour is
covered by the existing vitest component tests plus the Phase 5 live runtime pass; no new Playwright spec is
planned.

## Manual QA Scenarios

1. Save `scoring_strategy: quality`, route a live pi-CLI request, confirm the decision reports `quality` with
   `strategy_source: operator`.
2. Save a custom weight profile, route, confirm the effective weights digest and the winner match the profile.
3. Pin weights, send a hard request, confirm difficulty does not override; unpin and confirm it does.
4. Intelligent mode with controller guidance: confirm the accepted directive and the effective strategy.
5. Request an agent-strategy alias (`coder.<scope>`) and a workload alias (`batch.<scope>`, `embedding.<scope>`),
   confirm the posture and the honest pool.
6. Enable the measured-latency override where evidence exists, confirm the receipt; where evidence is absent,
   record that honestly.
7. UI walkthrough of the three pages and the decision detail, checked against what the decisions report.

## Idempotence and Recovery

- Config writes are idempotent: a second save of the same posture produces the same file (canonical spelling,
  sorted keys, normalized weights) and the same alias matrix.
- Migration is one-way and repeatable: an older file loads, is normalized on the next write, and re-loading the
  written file is a no-op.
- Rollback is branch-level: no data migration, no destructive schema change, and the protocol schema is untouched
  (custom weights stay in runtime diagnostics).
- If a sub-phase fails, the branch reverts to the last locked artifact; the run folder records the failed evidence.

## Implementation Sub-phases

| Sub-phase | Requirements | Write scope | Disjoint? |
| --- | --- | --- | --- |
| `SP1` | R1, R9, R10 | `runtime-host-bridge/src/scoring-strategy.ts`, `unified-runtime-config.ts`, `packages/core/src/router.ts` (export only) | yes |
| `SP2` | R2, R9 | `scoring-strategy.ts` resolver, `index.ts` routing-request plumbing | depends on `SP1` |
| `SP3` | R3 | `index.ts` diagnostics/telemetry, runtime-ui decision detail | depends on `SP2` |
| `SP4` | R4 | `controller-routing-contract.ts`, `index.ts` pin handling | depends on `SP2` |
| `SP5` | R5, R10 | `unified-runtime-config.ts` postures, `index.ts` materialisation | depends on `SP1` |
| `SP6` | R6 | same surfaces as `SP5`, workloads only | depends on `SP5` |
| `SP7` | R7 | `routing-latency-selection.ts`, `routing-latency-policy.ts` | independent of `SP2`-`SP6` |
| `SP8` | R8 | runtime-ui pages and lib | depends on `SP1`-`SP7` |

Sequencing: `SP1` -> `SP2` -> (`SP3`, `SP4`, `SP5` -> `SP6`, `SP7`) -> `SP8`. Only `SP7` is fully disjoint from the
strategy chain; no parallel write delegation is planned (the router policy has the implementer route disabled).

## Plan Drift Check

- Every Phase 1 source-inventory obligation maps to a requirement and a sub-phase; nothing is merged away, so no
  lossless-merge rationale is required.
- The design document's section 9 phase list (P0-P6) is superseded by this plan's `SP1`-`SP8` sequencing: the
  mapping is 1:1 for P0-P6 with the quality gates moved into Phases 4 and 5. Rationale: the repo's recursive
  workflow owns phase ordering, and the requirement ids are unchanged.
- The design document's stale code anchors are corrected in `01-as-is.md`; the document itself is repaired in
  `SP8`'s documentation step or a follow-up PR, recorded as a plan deviation.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Verification Surface: `runtime-host-bridge` unit tests | QA Surface: `SP1`
- R2 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `runtime-host-bridge` unit tests | QA Surface: `SP2`
- R3 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx` | Verification Surface: `runtime-host-bridge` and `runtime-ui` tests | QA Surface: `SP3`
- R4 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts` | Verification Surface: `controller-routing-contract` tests | QA Surface: `SP4`
- R5 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `runtime-host-bridge` tests | QA Surface: `SP5`
- R6 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `runtime-host-bridge` tests | QA Surface: `SP6`
- R7 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts`, `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts` | Verification Surface: `runtime-host-bridge` tests | QA Surface: `SP7`
- R8 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx` | Verification Surface: `runtime-ui` tests | QA Surface: `SP8`
- R9 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts` | Verification Surface: module tests plus the import/purity check | QA Surface: `SP1`
- R10 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts` | Verification Surface: extension-drill test | QA Surface: `SP1`
- R11 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/` | Verification Surface: `evidence/logs/red` and `evidence/logs/green` | QA Surface: Phase 3 log
- R12 | Status: planned | Implementation Surface: `role-model-router/packages/pi-role-model/`, `role-model-router/apps/runtime-host-bridge/src/` | Verification Surface: Phase 5 evidence tree | QA Surface: Phase 5 live matrix

## Verification Handoff

- Inspect first: `/.recursive/run/103-agent-strategy-and-scoring-strategy/02-to-be-plan.md`
- Upstream: `/.recursive/run/103-agent-strategy-and-scoring-strategy/01-as-is.md`, `/.recursive/run/103-agent-strategy-and-scoring-strategy/01.5-root-cause.md`
- Diff basis command: `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`

## Prior Recursive Evidence Reviewed

- `.recursive/run/01-protocol-routing-obs/` - canonical vocabulary and weights constrain `SP1`/`SP2`.
- `.recursive/run/22-router-runtime-routing-strategy-lock/` .. `.recursive/run/30-router-runtime-strategy-convergence-e2e/` - mode and alias behaviour constrain `SP2`, `SP4`, `SP5`, `SP6`.
- `.worktrees/101-effect-mq-queue-rebuild/` - the Effect wrapper and composition-root pattern constrain `SP1`/`SP2`
  and the SEA re-verification.
- `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` - owns the touched paths.

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: the `planner` role is dispatched for this phase (traceability audit); the router policy
declares it `external-cli` with a null CLI/model, so the effective route is a local subagent plus controller
verification.
Delegation Decision Basis: requirement-to-plan traceability is the failure mode this phase guards against, and the
planner role is the canonical independent check for it.
Audit Inputs Provided:
- the locked upstream artifacts listed in `Inputs`, this draft, the design document, the diff basis
- targeted surfaces: the Requirement Mapping, Implementation Sub-phases and Requirement Completion Status sections

## Effective Inputs Re-read

- `01-as-is.md`, `01.5-root-cause.md` and the locked addendum were re-read before authoring.
- `evidence/other/analyst_t1.md` supplies the AS-IS anchors reused in `Planned Changes by File`.

## Earlier Phase Reconciliation

- Phase 1's gaps and Phase 1.5's cause are both addressed: `SP1`/`SP2` implement the missing mapping, `SP3` makes it
  observable, and `SP10`'s extension drill removes the duplication cause.
- The locked addendum `.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` remains the phase-scope decision for analysis-only phases; this phase uses the plan-stage vocabulary instead.

## Subagent Contribution Verification

Reviewed Action Records:
- none yet (planner dispatch pending; the record path is added before locking this phase)

Main-Agent Verification Performed: Reviewed artifact: `/.recursive/run/103-agent-strategy-and-scoring-strategy/02-to-be-plan.md`; upstream recursive artifacts re-read: `/.recursive/run/103-agent-strategy-and-scoring-strategy/01-as-is.md`, `/.recursive/run/103-agent-strategy-and-scoring-strategy/01.5-root-cause.md`; planned surfaces checked against existing files and existing parent directories; diff-owned scope reconciled with `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff` (run artifacts only).

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Comparison reference: `working-tree`
- Normalized baseline: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Planned or claimed changed files: the files listed in `## Planned Changes by File`.
- Actual changed files reviewed: run artifacts only so far; product changes start in Phase 3.

## Gaps Found

None for this phase. The plan covers every requirement; the only carry-forward is the design document's stale
anchors, which are scheduled in `SP8`.

## Repair Work Performed

None. This phase plans; Phase 3 implements.

## Audit Verdict

Audit: PASS

Every requirement maps to a sub-phase and a concrete surface, the sub-phases are sequenced with disjoint write
scopes where possible, and the testing and QA strategies name exact commands and evidence paths.

## Traceability

- R1 -> Requirement Mapping; Implementation Sub-phases `SP1`.
- R2 -> Requirement Mapping; `SP2`.
- R3 -> Requirement Mapping; `SP3`.
- R4 -> Requirement Mapping; `SP4`.
- R5 -> Requirement Mapping; `SP5`.
- R6 -> Requirement Mapping; `SP6`.
- R7 -> Requirement Mapping; `SP7`.
- R8 -> Requirement Mapping; `SP8`.
- R9 -> Requirement Mapping; `SP1`, `SP2`.
- R10 -> Requirement Mapping; `SP1` extension drill.
- R11 -> Testing Strategy; Phase 3 TDD log.
- R12 -> Manual QA Scenarios; Phase 5 live matrix.

## Coverage Gate

- [x] Every requirement is mapped to a sub-phase with concrete surfaces
- [x] Testing, QA and evidence paths are concrete
- [x] Sub-phases are sequenced with disjoint scopes where possible

Coverage: PASS

## Approval Gate

- [x] Phase 3 can execute this plan under strict TDD

Approval: PASS
