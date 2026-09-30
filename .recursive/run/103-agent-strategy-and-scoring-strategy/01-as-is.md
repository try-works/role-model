Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-09-30T03:32:40Z`
LockHash: `2fe7df8e065a5e1ca1eba29d3423ee8dddb5e03fa18e10aac73e0a15acfd4b12`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md` (locked)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-worktree.md` (locked, diff basis)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/inputs/16-agent-strategy-and-scoring-strategy.md` (source design document, PR #288)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/other/analyst_t1.md` (delegated analyst pass)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/subagents/20260930T031524Z-analyst-t1-action.md` (action record)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` (locked phase-scope addendum)
Outputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/01-as-is.md`
Scope note: This artifact records what the runtime does today for every requirement, proving which obligations are satisfied and which are missing, so Phase 2 can plan concrete sub-phases.

## TODO

- [x] Read the locked requirements and the source design document
- [x] Inventory the source obligations and map them to requirement ids
- [x] Record current behaviour per surface with file:line anchors
- [x] Record the gaps per requirement
- [x] Re-read prior recursive evidence that binds this change
- [x] Complete the delegated analyst pass and verify it as the controller
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Source Requirement Inventory

Full per-obligation decomposition (including the §6 and §10 breakdown): `evidence/other/analyst_t1.md`.
Every requirement of `00-requirements.md` is indexed here with its source quote, a normalized summary and its
disposition for this run.

- R1 | Source Quote: Posture split and configuration contract | Summary: split routing mode from scoring strategy with schema-level invariants, a custom weight profile and write-time normalization | Disposition: in-scope
- R2 | Source Quote: Resolution and precedence | Summary: the saved strategy must rank candidates under the five-step precedence ladder, with pinning blocking difficulty and controller overrides | Disposition: in-scope
- R3 | Source Quote: Decision provenance and honest readback | Summary: decisions record effective strategy, source and weights digest, and no surface presents the raw config string as the strategy | Disposition: in-scope
- R4 | Source Quote: Intelligent mode keeps its contract and gains | Summary: the controller contract is unchanged, gains latency as a supported strategy, and never overrides pinned weights | Disposition: in-scope
- R5 | Source Quote: Agent strategy postures (role-bound) | Summary: role-bound postures materialise name.scope aliases with honest pools, collision checks and intent precedence | Disposition: in-scope
- R6 | Source Quote: Workload postures | Summary: workload postures materialise the same way with optional capability pins and batch/embedding examples | Disposition: in-scope
- R7 | Source Quote: Measured-latency override | Summary: the override stays off by default with the effective-latency metric, a 10 000 ms threshold and a 5..30 sample floor | Disposition: in-scope
- R8 | Source Quote: Operator surfaces | Summary: routing page controls plus separate Agent strategy and Workloads pages and decision provenance | Disposition: in-scope
- R9 | Source Quote: Effect-first implementation | Summary: routing modules use the landed Effect wrapper and prescribed primitives, with no Effect on the request path | Disposition: in-scope
- R10 | Source Quote: Extensibility and future-proofing | Summary: one vocabulary owner, exhaustive matching, config version migration and a reserved per-alias field | Disposition: in-scope
- R11 | Source Quote: Strict TDD discipline | Summary: strict TDD with RED and GREEN evidence for the P0 test list and for every requirement | Disposition: quality-gate
- R12 | Source Quote: Live verification of the rebuilt runtime with the pi CLI | Summary: packaged rebuild plus live pi-CLI verification on the development channel with honest evidence | Disposition: quality-gate

## Reproduction Steps (Novice-Runnable)

1. Use the worktree `D:\DEV\role-model\.worktrees\103-agent-strategy-and-scoring-strategy` (branch
   `recursive/103-agent-strategy-and-scoring-strategy`, diff basis `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`).
2. Install and build once (the dependency closure is required; a bare bridge build fails without the Effect wrapper):
   `corepack pnpm install --frozen-lockfile` then
   `corepack pnpm --filter @role-model-router/runtime-host-bridge... build`.
3. Reproduce the inert-strategy finding: search `runtime-host-bridge/src/index.ts` for
   `strategy: difficultyRouting.strategy` and for the `"balanced"` early return inside `maybeApplyDifficultyRouting`.
4. Reproduce the latency-override defaults: read `maxDeltaMs` and `minSamples` in
   `runtime-host-bridge/src/routing-latency-policy.ts`.
5. Reproduce the vocabulary duplication: search for the legacy spellings in
   `unified-runtime-config.ts`, `index.ts` and `runtime-ui/app/lib/routing-mode.ts`, and for the controller's
   `supportedStrategies`.
6. Read `evidence/other/analyst_t1.md` for the anchored inventory and per-surface detail.

## Current Behavior by Requirement

- R1 | Behavior: one persisted `routing.strategy` string decoded by two hand-written switches (`unified-runtime-config.ts:1464-1492`, `index.ts:5597-5623`); no schema, no normalization. | Status: not satisfied
- R2 | Behavior: the routing request strategy is difficulty-derived and hard-coded to `balanced` outside difficulty/hybrid (`index.ts:2089`, `:1966-1977`, `:10411`, `:10636`); no precedence ladder and no pin. | Status: not satisfied
- R3 | Behavior: no `strategy_source`, no weights digest; readback labels the mode and falls back to the raw config string (`index.ts:25442-25445`, `:25556-25559`); Overview derives the alias id from the raw string (`router.tsx:118-132`). | Status: not satisfied
- R4 | Behavior: controller contract present and validated (`controller-routing-contract.ts:90-96`); `latency` absent from the supported set and prompt (`:52`, `:285`, `:307`, `:323`); no pin interaction. | Status: partially satisfied
- R5 | Behavior: no posture block or alias-level role binding; the honest-pool mechanism already exists (`index.ts:8861-8869`, `runtime-observability/src/index.ts:19`). | Status: not satisfied
- R6 | Behavior: no workload block, no capability pin, no examples. | Status: not satisfied
- R7 | Behavior: the valve compares raw `p95LatencyMs` (`routing-latency-selection.ts:12`, `:84-90`) with `maxDeltaMs: 2_000` and `minSamples` bounds `3..1000` (`routing-latency-policy.ts:42`, `:55`). | Status: partially satisfied
- R8 | Behavior: mode-only routing page (`control-routing-strategy.tsx:66-103`) with a free-text custom path (`:133-165`); no posture pages; decision detail hides the latency receipt. | Status: not satisfied
- R9 | Behavior: the wrapper landed and is consumed by the queue path (`queue-runtime/index.ts:156`); no routing module imports `effect`; config state is a mutable binding (`index.ts:25094`, `:28126`). | Status: partially satisfied
- R10 | Behavior: the vocabulary is triplicated in the bridge/UI plus a fourth copy of the weights in core (`router.ts:183-219`, `:374-390`); no single owner, no migration, no reserved field. | Status: not satisfied
- R11 | Behavior: none of the design document's 18 P0 cases is asserted; the existing latency test encodes the old defaults. | Status: not satisfied
- R12 | Behavior: no live pi-CLI verification exists for this change; the SEA re-verification is a gate, not a proof. | Status: not satisfied

## Current behaviour by surface

- **Config, alias and mode (T1.2a).** One `routing.strategy` string drives mode decoding (`unified-runtime-config.ts:1464-1492`, `index.ts:5597-5623`) and primary alias ids (`unified-runtime-config.ts:1521-1535`); no `scoring_strategy`, `pin_weights`, `weights`, `agent_strategies` or `workloads` exists.
- **Scoring path (T1.2b).** The canonical weight tables exist in core (`router.ts:183-219`, `:374-390`) and are tested, but the saved config value never reaches them; `latency` is unreachable from config (`index.ts:1152-1160`).
- **Measured-latency override (T1.2c).** The bucket reader already returns p50 and p95 (`sqlite-memory/src/index.ts:5446-5452`); the valve uses raw p95 with the old defaults; the outcome is recorded (`index.ts:27718`) but not surfaced.
- **UI (T1.2d).** Mode-only page, free-text custom path, mode-labelled strategy readback with a raw-string fallback, and a raw-string-derived alias id on the Overview.
- **Effect wiring and packaging (T1.2e).** `role-model-router/packages/effect` re-exports the vendored tree and builds `dist/` with `build.mjs`; the bridge depends on it and imports it in the queue path, including a composition-root `ManagedRuntime` (`queue-runtime/index.ts:156`).

## Relevant Code Pointers

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
- `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts`
- `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts`
- `role-model-router/packages/core/src/router.ts`, `.../src/types.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/effect/*`, `.../apps/runtime-host-bridge/src/queue-runtime/*`
- `role-model-router/apps/runtime-ui/app/lib/routing-mode.ts`, `.../app/routes/control-routing-strategy.tsx`, `.../app/routes/router.tsx`

## Known Unknowns

- The design document's line anchors are stale relative to this baseline (`normalizeConfiguredRoutingMode` cited at 5345, actually 5597; `selectedStrategy` cited at 26541, actually 27158); Phase 2 must decide whether the doc PR is corrected in place or annotated.
- Whether the paired private registry (`role-model-internal/shared/route-learning/activation-policy.mjs`) is updated in the same release window is a release decision; R7 records it as a dependency.
- Phase 5's live channel availability (`:3458`) cannot be pre-verified here; QA must record a blocker rather than substitute an unverified claim.

## Evidence

- `evidence/other/analyst_t1.md` - delegated analyst artifact with 28 `file:line` anchors, the inventory, per-surface behaviour, gaps, prior evidence and commands.
- Controller verification: anchor sweep `28 / 28` resolve with sufficient length; symbol spot-check confirmed `toDifficultyStrategy`:1966, `maybeApplyDifficultyRouting`:2065, `maybeApplyControllerRouting`:2232, `normalizeConfiguredRoutingMode`:5597, `selectedStrategy`:27158, `STRATEGY_WEIGHTS`:183, `toPolicyStrategy`:374, `getRedistributedWeights`:1193; latency defaults confirmed at `routing-latency-policy.ts:42`, `:55`.
- `subagents/20260930T031524Z-analyst-t1-action.md` - durable action record.
- Diff basis `ca5c2126ca566086cfbe8f83cfdf339aba0879ff` vs `working-tree`; no product file changed in Phase 1.

## Prior Recursive Evidence Reviewed

- `.recursive/run/01-protocol-routing-obs/` - canonical four-strategy vocabulary and weight tables bind R2/R10.
- `.recursive/run/22-router-runtime-routing-strategy-lock/` and `.recursive/run/26-router-runtime-difficulty-guided-routing/`, `.recursive/run/28-router-runtime-controller-guided-routing/`, `.recursive/run/30-router-runtime-strategy-convergence-e2e/` - mode vocabulary, alias pool and difficulty/controller/hybrid behaviour bind R3-R6.
- `.worktrees/101-effect-mq-queue-rebuild/` and `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` - landed Effect wrapper, its build and the composition-root pattern bind R9/R12.

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: `analyst_t1` dispatched through the in-session subagent runtime; `.recursive/config/recursive-router.json` declares `analyst` as `external-cli` with a null CLI/model, so the effective route is local subagent plus controller verification (no external CLI resolved; `recursive-router-discovered.json` is absent).
Delegation Decision Basis: Phase 1 is an independent analytical pass over a complete bundle (requirements, source document, diff basis, targeted code paths).
Audit Inputs Provided:
- `00-requirements.md`, `00-worktree.md`, `inputs/16-agent-strategy-and-scoring-strategy.md`, `evidence/other/analyst_t1.md`
- diff basis `ca5c2126ca566086cfbe8f83cfdf339aba0879ff` vs `working-tree`
- changed files: run artifacts only
- targeted code references: the Relevant Code Pointers list above

## Effective Inputs Re-read

- `00-requirements.md` and `00-worktree.md` were re-read before authoring this artifact.
- The design document was read in full by the analyst and sampled by the controller for the sections cited above.
- `.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` (locked) was re-read; it supplies the approved phase-scope decision cited by `## Requirement Completion Status`.

## Earlier Phase Reconciliation

- Phase 0 tasks `T1.1`, `T1.2a-e` and `T1.3` are delivered exactly by this artifact.
- The Phase 0 worktree note about the dependency-closure build still holds; Phase 1 required no rebuild.
- Reconciliation: the locked requirements artifact had no analysis-only disposition for audited phases, so this
  phase records that gap in `.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md` and cites it as the approved scope decision instead of editing the locked artifact.

## Subagent Contribution Verification

Reviewed Action Records:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/subagents/20260930T031524Z-analyst-t1-action.md` (role `analyst`, tasks `T1.1`-`T1.3`).

Main-Agent Verification Performed: anchor sweep over all 28 anchors in `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/other/analyst_t1.md` (all resolve with at least the cited length); symbol spot-check of the key call sites, weight tables and latency defaults, recorded under `## Evidence`. File-impact reconciliation against the actual diff scope: the action record claims `role-model-router/apps/runtime-host-bridge/src/index.ts` and the other targeted sources as **reviewed** (read-only); none of them appears in the phase diff (`git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`) because Phase 1 changed no product file, and the only changed paths are the run artifacts under `.recursive/run/103-agent-strategy-and-scoring-strategy/`.
- Drift check: the design document's own anchors are stale; the live anchors are recorded here and the drift is carried into Phase 2.

Acceptance Decision: accepted

The additive corrections above (live anchors and the drift note) do not change the reviewed claims.
Refresh Handling: not required - the reviewed artifact was not materially changed after review.
Repair Performed After Verification: none

## Verification Handoff

- Inspect first: `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/other/analyst_t1.md`
- Reviewed artifact: `/.recursive/run/103-agent-strategy-and-scoring-strategy/01-as-is.md`
- Bundle: `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/review-bundles/01-as-is-analyst-dispatch.md`
- Diff basis command: `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Comparison reference: `working-tree`
- Normalized baseline: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Planned or claimed changed files: run artifacts only.
- Actual changed files reviewed: run artifacts under `.recursive/run/103-agent-strategy-and-scoring-strategy/`; no product file changed.

## Gaps Found

None. The AS-IS evidence is complete; product-level gaps are recorded as findings in `## Current Behavior by
Requirement` and are Phase 2 inputs rather than defects in this artifact.

## Repair Work Performed

None needed for product code. Run-artifact repairs: the analyst evidence was relocated to `evidence/other/` after
the lint showed that `subagents/` is reserved for action records.

## Requirement Completion Status

Status vocabulary note: this phase performs analysis only, so each requirement is recorded as out-of-scope for
Phase 1 with an explicit phase-scoped decision; none of them is excluded from the run.

- R1 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R2 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R3 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R4 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R5 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R6 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R7 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R8 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R9 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R10 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R11 | Status: out-of-scope | Rationale: Phase 1 performs no TDD cycle | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md
- R12 | Status: out-of-scope | Rationale: Phase 1 performs no packaged rebuild or live QA | Scope Decision: /.recursive/run/103-agent-strategy-and-scoring-strategy/addenda/01-as-is.upstream-gap.00-requirements.addendum-01.md

## Audit Verdict

Audit: PASS

The artifact is grounded in the recorded diff basis, every obligation maps to a requirement id, every claim is
anchored, and the delegated pass was verified by the controller.

## Traceability

- R1 -> Source Requirement Inventory; Current Behavior by Requirement.
- R2 -> Source Requirement Inventory; Current Behavior by Requirement.
- R3 -> Source Requirement Inventory; Current Behavior by Requirement.
- R4 -> Source Requirement Inventory; Current Behavior by Requirement.
- R5 -> Source Requirement Inventory; Current behavior by surface.
- R6 -> Source Requirement Inventory; Current behavior by surface.
- R7 -> Source Requirement Inventory; Current Behavior by Requirement.
- R8 -> Source Requirement Inventory; Current behavior by surface.
- R9 -> Source Requirement Inventory; Current behavior by surface.
- R10 -> Source Requirement Inventory; Current Behavior by Requirement.
- R11 -> Source Requirement Inventory; Current Behavior by Requirement.
- R12 -> Source Requirement Inventory; Current Behavior by Requirement.

## Coverage Gate

- [x] Every in-scope requirement has an AS-IS disposition with evidence
- [x] Every design-document section is inventoried and mapped
- [x] Prior recursive evidence is recorded
- [x] The delegated pass is verified against actual files

Coverage: PASS

## Approval Gate

- [x] AS-IS is complete and can be handed to Phase 2

Approval: PASS
