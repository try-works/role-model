Run: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T16:29:56Z`
LockHash: `0e5eed01d11db2cc49657442d1bfdf20773674f58448f2da7fa4c7fe07b40608`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/RECURSIVE.md`
Outputs:
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
Scope note: Defines the implementation plan for explicit request rewriting, hybrid arbitration, per-request routing-mode overrides, additive compatibility guarantees, diagnostics, and local-plus-remote verification on top of the locked run-28 controller-guided baseline.

## TODO

- [x] Plan the RED tests that prove the rewrite, hybrid, and override gaps
- [x] Plan the bridge, diagnostics, and validator changes needed for explicit rewrite ownership and hybrid arbitration
- [x] Plan the per-request override surface and deterministic invalid-override behavior
- [x] Plan the mixed local-plus-remote end-to-end verification path
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add RED bridge tests for explicit rewrite receipts, hybrid arbitration precedence, per-request override parsing, exact-model compatibility, and same-pool divergent outcomes under different routing modes
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - add RED validator coverage for baseline, difficulty, controller, and hybrid mode execution over the same mixed pool plus one invalid-override scenario
- `/role-model-router/packages/runtime-observability/test/index.test.ts`
  - add RED coverage proving request observations persist selected routing mode, override provenance, rewrite-applied metadata, and hybrid arbitration receipts without regressing existing alias, difficulty, or controller diagnostics
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - implement per-request routing-mode override parsing, explicit hybrid arbitration, explicit rewrite receipt generation, and additive routing or execution plumbing
- `/role-model-router/packages/runtime-observability/src/index.ts`
  - extend routing diagnostics with routing-mode, override, arbitration, and rewrite metadata suitable for persistence and operator readback
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - extend the mixed local-plus-remote runtime validator with a same-pool mode matrix and invalid-override proof
- `/role-model-router/packages/adapter-execution/src/index.ts`
  - widen capture metadata only if RED proves existing request-capture structure cannot express explicit rewrite receipts cleanly
- `/role-model-router/packages/provider-openai/src/index.ts`
  - widen provider-specific request-capture metadata only if RED proves the bridge cannot derive rewrite receipts from existing target and capture data
- `/role-model-router/packages/provider-anthropic/src/index.ts`
  - widen provider-specific request-capture metadata only if RED proves the bridge cannot derive rewrite receipts from existing target and capture data

## Implementation Steps

1. Write RED tests first for explicit rewrite receipts, hybrid arbitration precedence, per-request override parsing, invalid-override handling, and mixed-pool end-to-end mode divergence.
2. Add a bridge-owned routing-mode resolver that determines the effective mode in this order:
   - per-request override from the request header `x-role-model-routing-mode`
   - configured alias routing mode
   - existing baseline behavior for exact-model requests
3. Parse per-request override values as `baseline | difficulty | controller | hybrid` and reject unknown values deterministically before execution continues.
4. Refactor bridge planning so difficulty routing and controller routing can be invoked independently or combined under one explicit hybrid arbitration helper rather than only as an implicit sequence.
5. Implement hybrid arbitration as a bridge-owned planning receipt that:
   - preserves baseline eligibility filters first
   - uses difficulty routing to derive the default strategy, exclusions, and observed-data guidance
   - applies controller guidance as an additive steering layer over the difficulty result
   - records which signal dominated or materially altered the final route input
6. Add an explicit rewrite receipt after route selection and before provider execution that records:
   - the client-visible requested model
   - the effective routing mode
   - the selected endpoint id and concrete downstream model id
   - whether rewrite was applied or skipped
   - whether rewrite was only a model-id substitution or also a provider-family request-shape translation
7. Prefer to derive rewrite receipts from existing `ResolvedExecutionTarget`, provider request capture, and bridge plan state. Only widen adapter or provider capture metadata if RED proves the bridge cannot explain the rewrite precisely enough.
8. Preserve additive compatibility:
   - exact-model requests stay valid and should report rewrite skipped when the selected target already matches the client-visible model
   - alias requests without overrides must preserve the current baseline behavior
   - local and remote endpoints remain equally eligible under baseline, difficulty, controller, and hybrid modes
9. Extend runtime observations so persisted diagnostics record:
   - effective routing mode
   - whether the mode came from alias default or per-request override
   - explicit rewrite-applied metadata
   - hybrid arbitration receipts showing which signal dominated or altered the plan
10. Extend the live vendor validator to run the same mixed local-plus-remote candidate pool through:
    - baseline mode
    - difficulty mode
    - controller mode
    - hybrid mode
    - one invalid override request
11. Re-run focused tests and runtime validators, then complete Phase 3 and Phase 4 receipts without widening into the run-30 convergence and UI work.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add bridge tests that fail until `x-role-model-routing-mode` is parsed, invalid values fail deterministically, and baseline or difficulty or controller or hybrid modes produce distinct execution plans
  - add bridge tests that fail until rewrite receipts distinguish alias expansion from post-route downstream rewrite and exact-model rewrite skipping
  - add runtime-observability tests that fail until selected routing mode, override provenance, hybrid arbitration receipts, and rewrite-applied metadata persist in request observations
  - extend vendor-validation tests so the same mixed pool yields different outcomes across baseline, difficulty, controller, and hybrid modes and fails until invalid overrides are handled safely
- GREEN plan:
  - implement bridge, diagnostics, and validator changes only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/runtime-observability test`
  - `corepack pnpm --filter @role-model-router/protocol-routing test`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run schemas:validate`

## Playwright Plan (if applicable)

- not applicable; this run remains runtime-level and API-level rather than browser-driven

## Manual QA Scenarios

1. Start the run-29 runtime with one mixed local-plus-remote alias pool that can plausibly route differently under baseline, difficulty, controller, and hybrid modes.
2. Send the same request four times:
   - no override
   - `x-role-model-routing-mode: difficulty`
   - `x-role-model-routing-mode: controller`
   - `x-role-model-routing-mode: hybrid`
3. Confirm request-detail diagnostics record the effective routing mode, whether it came from override or alias default, and whether the final route changed across modes.
4. Confirm rewrite diagnostics show the client-visible requested model, the selected endpoint, the concrete downstream model id, and whether rewrite was applied or skipped.
5. Send an exact-model request and confirm the runtime keeps the exact-model path additive and reports rewrite skipped unless provider-family shaping was still required.
6. Send one request with an invalid `x-role-model-routing-mode` value and confirm the runtime fails deterministically with explicit diagnostics rather than silently corrupting default routing.

## Idempotence and Recovery

- Invalid override values must fail deterministically and must not mutate any persistent runtime config or learned state.
- Hybrid arbitration must be deterministic for identical effective inputs so the same request and same runtime state yield the same route plan and diagnostics.
- Rewrite receipts must be derived from actual selected route and provider capture data rather than inferred heuristically after the fact.
- Exact-model requests remain additive. If rewrite is unnecessary, the runtime must record rewrite skipped rather than inventing a rewrite path.
- The implementation should prefer existing bridge, routing, and observation seams rather than widening protocol-routing or provider adapters unless RED proves they are insufficient.

## Implementation Sub-phases

### `SP1` RED tests for override parsing and rewrite receipts

- add failing bridge tests for `x-role-model-routing-mode`
- add failing bridge tests for rewrite-applied versus rewrite-skipped receipts
- add failing tests for exact-model additive behavior under explicit mode selection

### `SP2` RED tests for hybrid arbitration and durable diagnostics

- add failing bridge tests for hybrid precedence over the same mixed pool
- add failing runtime-observability tests for selected mode, override provenance, arbitration receipts, and rewrite diagnostics
- add failing validator tests for same-pool divergent outcomes and invalid-override handling

### `SP3` Bridge-owned routing-mode and arbitration implementation

- implement per-request override parsing
- implement effective routing-mode resolution
- implement explicit hybrid arbitration over difficulty and controller outputs

### `SP4` Rewrite receipt and persistence implementation

- implement explicit rewrite receipts in the bridge execution path
- persist routing-mode, override, arbitration, and rewrite diagnostics through runtime observations
- widen adapter or provider capture metadata only if RED proves current capture data is insufficient

### `SP5` Mixed local-plus-remote runtime proof

- extend the runtime vendor validator to prove baseline, difficulty, controller, and hybrid mode behavior over the same pool
- prove invalid override handling and exact-model additive behavior in the same end-to-end surface
- capture final evidence that explicit rewrite receipts and per-request mode selection work without widening into run-30 convergence scope

## Prior Recursive Evidence Reviewed

- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/05-manual-qa.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.`
- Delegation Decision Basis: `Phase 2 planning needed one coherent mapping from the locked requirements and Phase 1 findings to exact bridge, diagnostics, and validator changes while minimizing unnecessary widening into protocol-routing or adapter packages.`
- Delegation Override Reason: `The plan depends on already-read coupled execution-path surfaces, so splitting it into delegated fragments would add overhead and increase drift risk.`
- Audit Inputs Provided:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/.recursive/RECURSIVE.md`

## Effective Inputs Re-read

- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/RECURSIVE.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the identified lack of explicit rewrite ownership, hybrid arbitration, per-request override parsing, and rewrite or override or arbitration diagnostics while preserving the current implicit concrete-model adapter translation and additive exact-model behavior.
- `00-worktree.md`: the plan stays inside the isolated run-29 worktree and the baseline captured from committed run-28 commit `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each requirement to concrete bridge, diagnostics, validator, and conditional adapter widening changes
  - checked that the planned validation set covers rewrite receipts, hybrid precedence, invalid overrides, and same-pool divergent outcomes
  - narrowed the plan so protocol-routing and provider-adapter widening remain conditional on RED evidence
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Comparison reference: `working-tree`
- Normalized baseline: `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Base branch: `recursive/28-router-runtime-controller-guided-routing`
- Worktree branch: `recursive/29-router-runtime-request-rewriter-hybrid-mode`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/packages/runtime-observability/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/provider-openai/src/index.ts`
  - `/role-model-router/packages/provider-anthropic/src/index.ts`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/04-test-summary.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/05-manual-qa.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/06-decisions-update.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/07-state-update.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-init.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-post-baseline-status.log`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface so run 29 adds explicit rewrite ownership, hybrid arbitration, per-request mode overrides, and operator-readable receipts on top of the run-28 controller-guided baseline without prematurely widening into run-30 convergence and UI work

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans the explicit rewrite contract and rewrite receipt surface; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans bridge-owned hybrid arbitration and dominant-signal diagnostics; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: Phase 2 only plans the header-based per-request override surface and invalid-override handling; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: additive exact-model and alias compatibility under explicit rewrite and override semantics is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: rewrite, override, and arbitration diagnostics are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests and mixed local-plus-remote mode-matrix proof are planned but not yet executed. | Blocking Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, TDD-first, and narrow enough to add explicit rewrite ownership, hybrid arbitration, and per-request mode overrides on top of the run-28 baseline without prematurely widening into run-30 convergence work.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP4`, `SP5`
- `R2` -> `SP2`, `SP3`, `SP5`
- `R3` -> `SP1`, `SP3`, `SP5`
- `R4` -> `SP1`, `SP4`, `SP5`
- `R5` -> `SP2`, `SP4`, `SP5`
- `R6` -> `SP1`, `SP2`, `SP5`

## Coverage Gate

- [x] Every in-scope requirement has a concrete implementation and validation plan
- [x] The plan identifies the exact RED test surfaces, production seams, and fallback boundaries
- [x] The plan is specific enough to execute strict Phase 3 TDD without reopening run scope

Coverage: PASS

## Approval Gate

- [x] The Phase 2 plan is specific enough for implementation
- [x] No unresolved design blocker remains for starting strict Phase 3 TDD

Approval: PASS
