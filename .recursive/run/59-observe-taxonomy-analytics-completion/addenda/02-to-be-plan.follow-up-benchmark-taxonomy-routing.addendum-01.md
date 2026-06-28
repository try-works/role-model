Run: `/.recursive/run/59-observe-taxonomy-analytics-completion/`
Artifact: `02 TO-BE Plan Addendum`
Title: `Benchmark Taxonomy -> Routing + Assignment Follow-up Plan`
Date: `2026-06-28`
Inputs:
- `/.recursive/run/59-observe-taxonomy-analytics-completion/02-to-be-plan.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/addenda/00-requirements.follow-up-benchmark-taxonomy-routing.addendum-01.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/03-implementation-summary.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/04-test-summary.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/05-manual-qa.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/core/src/types.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`
- `role-model-router/packages/core/src/taxonomy/benchmark-linkage.ts`
- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.ts`
- `role-model-router/packages/provider-account/src/index.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `ui-design-system` skill guidance
Status: `LOCKED`
LockedAt: `2026-06-28T21:03:00Z`
LockHash: `6a0306d2b412e870d2eb0b8d8f087290a6235f909df13c64fb15884d1eae04f7`
TDD Mode: `strict`
Addendum intent: This addendum converted the benchmark-taxonomy routing proposal into a concrete execution plan. The user later explicitly approved implementation inside the active run-59 worktree, so this artifact now records the plan that drove the implemented slice. The rebuilt-runtime benchmark execution and Pi alias-routing precedence proof are now complete in `05-manual-qa.md`.

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed subagent-capable tooling in this environment, but the active developer policy still forbids delegation without an explicit user request.`
Delegation Decision Basis: `This audited plan addendum needed direct comparison against the implemented slice and the final live-proof receipts.`
Delegation Override Reason: `Subagent tooling is available, but current session policy forbids spawning subagents without explicit user approval.`
Audit Inputs Provided:
- `/.recursive/run/59-observe-taxonomy-analytics-completion/addenda/00-requirements.follow-up-benchmark-taxonomy-routing.addendum-01.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/03-implementation-summary.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/05-manual-qa.md`
- updated benchmark-routing code paths under `role-model-router/packages/core/**`, `role-model-router/apps/runtime-host-bridge/**`, and `role-model-router/apps/runtime-ui/**`

## TODO

- [x] Preserve the benchmark-taxonomy routing plan slices and hard boundaries
- [x] Reconcile the plan addendum against the implemented code paths
- [x] Reconcile the plan addendum against the final rebuilt-runtime and Pi precedence proof
- [x] Complete the audited-phase sections and gates needed for lock readiness

## Purpose

The requirement addendum established that benchmark taxonomy is currently disconnected from:

- runtime-assignable roles
- derived taxonomy groups
- routing preference inputs beyond `overallScore` and optional `taskScores`

This plan addendum defines how to implement that missing layer with strict TDD and how to prove it works using:

- benchmark execution on the rebuilt runtime
- live Pi requests sent through a routable alias so the runtime must make a real routing decision

## Planned Outcome

The follow-up implementation will:

1. derive benchmark role-fit, eligible-role-fit, and group-fit signals from canonical taxonomy benchmark data
2. constrain those signals by actual runtime role assignments and endpoint role bindings
3. feed those signals into routing as advisory quality inputs after hard eligibility has already been established
4. expose the resulting evidence in model assignment UI and routing/request diagnostics
5. prove the new behavior with automated tests, rebuilt-runtime benchmark runs, and live Pi alias-routing receipts

## Hard Scope Boundaries

### Must do

- use canonical taxonomy role/group relationships as the only derivation source
- preserve current hard role/task/capability eligibility logic
- add stable diagnostics showing whether task, role, group, or fallback benchmark quality influenced ranking
- keep model assignment operator-owned and benchmark recommendations advisory

### Must not do

- auto-assign roles based on benchmark results
- allow benchmark evidence to bypass `roleBindings`
- widen `availableRoleIds` from benchmark data
- duplicate taxonomy group mappings in UI-specific code
- weaken TDD by implementing router behavior before a failing test exists

## Requirement Slice Inventory

This addendum defines the follow-up run in seven bounded slices.

### `BRR1` Assignment-aware benchmark capability contract

Outcome:

- extend benchmark capability data from `overallScore` and `taskScores` to include:
  - `roleScores`
  - `eligibleRoleScores`
  - `groupScores`
  - `coverage`

Primary files:

- `role-model-router/packages/core/src/types.ts`
- `role-model-router/packages/core/src/taxonomy/benchmark-linkage.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`

Acceptance:

- contract distinguishes raw role evidence from assignment-filtered role evidence
- group scores are derived through canonical taxonomy role membership only
- coverage metadata is explicit and machine-readable

### `BRR2` Candidate enrichment and canonical derivation

Outcome:

- compute benchmark role/group fit in one shared derivation path
- attach assignment-filtered benchmark fit to runtime candidates before router scoring

Primary files:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/protocol-routing/src/index.ts`
- shared derivation helper under `role-model-router/packages/core/**` or another runtime-owned shared package

Acceptance:

- two models with identical raw benchmark role evidence but different role assignments expose different `eligibleRoleScores`
- ineligible role evidence is preserved for operator visibility but not used by routing

### `BRR3` Router scoring and diagnostics

Outcome:

- router quality uses benchmark evidence in this precedence order:
  1. direct task score
  2. eligible role score
  3. eligible group score
  4. fallback overall benchmark score

Primary files:

- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/core/test/routing-intent.test.ts`

Acceptance:

- no benchmark signal can change the eligible candidate set
- diagnostics emit stable benchmark-taxonomy reason codes
- low-coverage role/group evidence is neutral or reduced according to explicit rules

### `BRR4` Model assignment and inspect UI

Outcome:

- operator surfaces distinguish:
  - assigned roles
  - benchmark-evidenced assigned roles
  - benchmark-evidenced but unassigned roles
  - assigned roles with weak evidence

Primary files:

- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- related test files

Acceptance:

- UI uses runtime design-system primitives
- benchmark recommendation styling stays subordinate to assignment controls
- no role becomes selected automatically from benchmark evidence

### `BRR5` Routing and request explanation surfaces

Outcome:

- routing candidate/detail surfaces and request explanation surfaces show benchmark taxonomy influence clearly

Primary files:

- runtime request/routing APIs and view models
- router decision detail surfaces
- Pi runtime-inspection formatting if needed for explain output

Acceptance:

- operators can tell whether a decision used task, role, group, or fallback benchmark evidence
- low-coverage warnings are visible

### `BRR6` Validation and benchmark-data rules

Outcome:

- benchmark cases intended to influence routing must validate cleanly against canonical role/task relationships

Primary files:

- benchmark linkage validation helpers
- benchmark tests or schema-adjacent tests

Acceptance:

- impossible role/task combinations fail validation
- hand-authored group tags remain forbidden

### `BRR7` End-to-end rebuilt-runtime and Pi proof

Outcome:

- run benchmarks on the rebuilt runtime
- route live Pi prompts through a real alias and verify routing reflects benchmark role/group evidence

Primary surfaces:

- rebuilt runtime on the run-owned QA port
- benchmark UI/API
- Pi `role-model/*` command surface
- request detail and routing diagnostics

Acceptance:

- benchmark execution produces assignment-aware benchmark fit
- live Pi prompt traffic hits the alias and produces real routing receipts
- explain surfaces show the expected benchmark taxonomy reason codes

## TDD Plan

TDD is strict. Every slice must follow:

1. add or extend a failing test
2. run the failing test and capture RED evidence
3. implement the minimum production code required
4. rerun the target tests and capture GREEN evidence
5. refactor only with tests still green

No router scoring change may be written before the corresponding failing test exists.

### RED/GREEN evidence locations

- RED:
  - `/.recursive/run/<future-run-id>/evidence/logs/red/`
- GREEN:
  - `/.recursive/run/<future-run-id>/evidence/logs/green/`

### Mandatory RED-first slices

1. benchmark capability contract extension
2. eligible role/group derivation from canonical taxonomy + assignments
3. router quality precedence and diagnostics
4. UI recommendation/assignment distinction
5. benchmark validation invariants
6. rebuilt-runtime benchmark and Pi explain smoke regressions

## Planned Test Inventory

### Unit and contract tests

- `role-model-router/apps/runtime-host-bridge/test/benchmark-summary.test.ts`
  - role score derivation
  - group score derivation from role membership
  - coverage metadata emission
- `role-model-router/packages/core/test/routing-intent.test.ts`
  - prefers higher direct task score when eligible
  - falls back to eligible role score when task score absent
  - falls back to eligible group score when direct role evidence absent
  - ignores benchmark role evidence for roles the candidate is not assigned to
  - preserves eligibility boundaries even when an ineligible model has stronger benchmark evidence
  - emits stable benchmark taxonomy reason codes
- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.test.ts`
  - benchmark evidence does not mutate actual role binding computation
- `role-model-router/packages/provider-account/test/index.test.ts`
  - benchmark metadata cannot bypass provider-account role-binding validation

### UI tests

- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - recommendation and warning states
  - assigned vs unassigned benchmark evidence grouping
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.test.tsx`
  - no auto-selection from benchmark evidence
  - clear accessible distinction between assigned and recommended roles
- route-level tests for model inspect and assignment surfaces
  - benchmark-backed summaries render under the existing design system

### Integration tests

- candidate enrichment includes:
  - `roleScores`
  - `eligibleRoleScores`
  - `groupScores`
  - `coverage`
- routing decision detail returns benchmark-taxonomy contribution metadata
- model rollup and router candidate evidence stay consistent for the same model

## Verification Floor

The automated verification floor for the future run should include at least:

- `corepack pnpm run schemas:validate`
- `corepack pnpm --filter @role-model-router/core test`
- `corepack pnpm --filter @role-model-router/profile-aggregator test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm --filter @try-works/pi-role-model test`
- `corepack pnpm --filter @try-works/pi-role-model build`

If a new shared derivation helper is introduced under another package, that package’s tests/build must join the floor.

## Rebuilt-Runtime Benchmark Verification

Automated tests are not enough. This follow-up must prove that benchmark taxonomy affects real runtime routing preference.

### Runtime target

Use the rebuilt runtime, not the already-running production runtime process.

Expected QA shape:

- production runtime on `:3456` remains untouched
- rebuilt runtime starts on the replacement QA port used by the active run, currently `:3462`
- rebuilt runtime uses the real runtime-owned config/state already present on this device

### Benchmark prerequisites

Before live routing QA:

- at least two routable models must be available behind the tested alias or candidate pool
- those models must both be eligible for the targeted role
- the benchmark suite used must contain canonical taxonomy tags for the targeted role/task
- the models must produce different benchmark role/group fit so the routing choice is observable

### Benchmark proof steps

1. Start the rebuilt runtime against the real local runtime config and credentials.
2. Run the taxonomy-tagged benchmark suite against the candidate models to populate fresh benchmark role/task evidence.
3. Confirm benchmark summary or model-inspect surfaces show:
   - benchmark role scores
   - eligible role scores
   - group scores
   - coverage metadata
4. Record the benchmark evidence paths and the exact models compared.

### Expected benchmark verification evidence

- benchmark summary screenshots or JSON receipts
- request or benchmark logs stored under the future run’s `evidence/logs/phase5/`
- model-inspect screenshots showing benchmark-backed role/group evidence

## Live Pi Alias-Routing Verification

The follow-up must also prove the routing effect through real Pi traffic.

### Alias requirement

Use a real alias rather than a direct concrete model id, so the runtime must perform routing.

Preferred pattern:

- alias with at least two eligible remote candidates
- existing `hybrid.remote-only` may be reused if it still resolves to a multi-model routable pool
- if `hybrid.remote-only` no longer provides the needed candidate spread, Phase 1 must name a replacement alias explicitly

### Pi QA setup

- install or point Pi at the run-local `packages/pi-role-model`
- target the rebuilt runtime endpoint, not the production runtime port
- select the routing alias in Pi before prompt execution

### Required Pi command receipts

- `/role-model setup`
- `/role-model alias list`
- `/role-model alias use <qa-alias>`
- `/role-model requests`
- `/role-model explain latest`

### Live prompt proof

Send live Pi prompts that should classify into the benchmarked role/task family and therefore exercise the new benchmark role/group preference logic.

At minimum, manual QA must include:

1. one prompt whose targeted role/task has strong direct task benchmark evidence
2. one prompt where direct task evidence is absent but eligible role evidence exists
3. one prompt where direct role evidence is absent but eligible group evidence exists
4. one control prompt where a model has stronger benchmark evidence for an unassigned role and must still not become eligible

### Required runtime receipts per prompt

For each prompt, capture:

- request id
- selected alias
- selected endpoint/model
- requested role id
- task type
- benchmark-related routing reason codes
- whether the chosen path used task, role, group, or fallback benchmark evidence

### Required Pi-side receipts per prompt

- Pi command output proving the alias-routed request completed
- `/role-model explain latest` output showing runtime-owned explanation data

## Manual QA Pass Criteria

Phase 5 manual QA for the future run passes only if all of these are true:

- benchmark run on the rebuilt runtime completed successfully
- benchmark role/group fit is visible in operator surfaces
- live Pi alias-routed requests completed through the rebuilt runtime
- routing diagnostics show benchmark taxonomy reason codes on real requests
- benchmark evidence influences preference only among already-eligible candidates
- a stronger benchmark score for an unassigned role does not make that candidate eligible
- UI clearly separates assignment policy from benchmark recommendations

## Design-System Implementation Contract

UI work must use:

- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `ui-design-system` guidance

Required implementation approach:

- use shared page primitives and existing shell contract
- keep benchmark-backed recommendation chips, facts, and disclosures inside the current runtime visual language
- preserve keyboard accessibility and readable status language
- avoid bespoke benchmark-only styling systems

## Planned Execution Sequence

1. `SP1` failing tests for the benchmark capability contract
2. `SP2` failing tests for eligible role/group derivation
3. `SP3` failing router tests for scoring precedence and reason codes
4. `SP4` failing UI tests for assignment/recommendation distinction
5. `SP5` failing integration tests for candidate enrichment and explanation payloads
6. full automated verification floor
7. rebuilt-runtime benchmark execution
8. live Pi alias-routing QA

## Risks And Controls

### Risk: benchmark evidence is stale or too sparse

Control:

- explicit coverage metadata
- low-coverage behavior tested and visible

### Risk: benchmark evidence silently changes eligibility

Control:

- dedicated router tests proving eligibility set is unchanged
- manual QA control case with stronger benchmark evidence on an unassigned role

### Risk: UI confuses recommendation with assignment

Control:

- route and component tests
- design-system review of wording, status pills, and disclosure hierarchy

### Risk: rebuilt-runtime QA depends on the wrong port or stale runtime

Control:

- record the exact rebuilt runtime endpoint in Phase 5
- capture request ids and runtime version in receipts

## Approval Criteria For This Plan Addendum

This addendum is fit for future execution only if the eventual follow-up run:

- uses strict TDD
- has a concrete automated verification floor
- includes rebuilt-runtime benchmark execution as proof, not just unit tests
- includes live Pi alias-routing proof on real runtime requests
- proves benchmark taxonomy changes routing preference without changing hard eligibility

## Recommendation

Use this addendum as the Phase 2 planning seed for the dedicated follow-up run after run 59 closes.

Do not merge this work into the remaining run-59 scope. The benchmark-taxonomy routing change is a routing-semantics and operator-assignment feature, not a residual Observe telemetry repair.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: reread the implemented benchmark-routing slice in `03-implementation-summary.md`, the final live-proof closure in `05-manual-qa.md`, and the affected code paths cited in this addendum
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none beyond locking this addendum to the final implemented state

## Requirement Completion Status

- `BRR1-BRR7` | Status: verified | Changed Files: `/.recursive/run/59-observe-taxonomy-analytics-completion/addenda/02-to-be-plan.follow-up-benchmark-taxonomy-routing.addendum-01.md`, `/.recursive/run/59-observe-taxonomy-analytics-completion/03-implementation-summary.md`, `/.recursive/run/59-observe-taxonomy-analytics-completion/05-manual-qa.md` | Implementation Evidence: the planned benchmark-taxonomy routing contract, TDD slices, UI scope, and live rebuilt-runtime/Pi proof path were all carried out inside run 59. | Verification Evidence: locked `03-implementation-summary.md` and `05-manual-qa.md`. | Scope Decision: the follow-up plan is fully realized in the active run rather than deferred to another run.

## Audit Verdict

- Audit summary: this plan addendum now accurately reflects the benchmark-routing slice that was implemented and manually verified inside run 59.
- Follow-up required before lock: none
Audit: PASS

## Coverage Gate

- [x] The benchmark-routing plan slices remain preserved.
- [x] The addendum now matches the implemented code and final live-proof receipts.
- [x] The audited addendum records the exact verification artifacts that closed the slice.

Coverage: PASS

## Approval Gate

- [x] This locked plan addendum is consistent with the final implemented benchmark-routing slice.

Approval: PASS
