Run: `/.recursive/run/59-observe-taxonomy-analytics-completion/`
Artifact: `00 Requirements Addendum`
Title: `Benchmark Taxonomy -> Routing + Assignment Follow-up Proposal`
Date: `2026-06-28`
Inputs:
- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/02-to-be-plan.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`
- `role-model-router/packages/core/src/taxonomy/benchmark-linkage.ts`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/core/src/types.ts`
- `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`
- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.ts`
- `role-model-router/packages/provider-account/src/index.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `ui-design-system` skill guidance
Status: `LOCKED`
LockedAt: `2026-06-28T21:02:00Z`
LockHash: `fb69b2097e5a4c52c7650a2be0854103b5e4184f9778b31dcd8b79f70a1e3d9a`
Addendum intent: This artifact began as a forward-looking follow-up proposal. The user later explicitly approved implementation inside the active run-59 worktree. It now serves as the locked requirement supplement for the benchmark-taxonomy routing and assignment slice implemented in run 59, and the rebuilt-runtime benchmark execution plus live Pi precedence proof are now complete in `05-manual-qa.md`.

## TODO

- [x] Record the benchmark-taxonomy routing and assignment requirement supplement
- [x] Preserve the hard scope boundaries that keep benchmark evidence advisory
- [x] Capture the future-run acceptance criteria that were implemented inside run 59 instead
- [x] Reconcile the addendum with the final rebuilt-runtime and Pi proof now recorded in Phase 5

## Purpose

The taxonomy benchmark work currently proves model quality by role/task/capability-style dimensions, but routing still only consumes:

- benchmark `overallScore`
- optional benchmark `taskScores[taskType]`

That leaves a structural gap between:

- benchmark taxonomy evidence
- runtime role/group assignment surfaces
- routing decisions that are supposed to respect model role availability

This addendum proposes a follow-up contract that makes benchmark taxonomy useful for routing and model assignment without letting benchmark data override hard policy.

## Current Code Reality

The current implementation already provides the raw building blocks:

- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`
  - computes `taxonomyScores.byRole`, `byTask`, `byVariant`, `byCapability`, `byModality`, and `byToolClass`
- `role-model-router/packages/core/src/taxonomy/benchmark-linkage.ts`
  - defines canonical benchmark taxonomy tags with `roleId`, `taskType`, `requiredCapabilities`, `requiredModalities`, and `toolClasses`
- `role-model-router/packages/core/src/types.ts`
  - limits `EndpointCandidate.benchmarkCapability` to `overallScore` and `taskScores`
- `role-model-router/packages/core/src/router.ts`
  - blends `overallScore` with optional per-task score in `getQualityMetric(...)`
  - does not consume benchmark role scores, group scores, or assignment-aware benchmark fit
- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.ts`
  - resolves runtime endpoint role availability from explicit model-role assignments
- `role-model-router/packages/provider-account/src/index.ts`
  - validates model role bindings as explicit policy-owned role lists and assignment modes
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - shows role assignments and a coarse capability benchmark pill, but not benchmark-backed role/group fit

The result is a mismatch:

- benchmarks know about taxonomy roles and tasks
- assignment surfaces know about runtime roles
- routing only partially links the two

## Problem Statement

The original proposal direction implies that benchmark taxonomy should inform routing. That only becomes correct if benchmark evidence is aligned with the same groups and roles that models can actually be assigned to.

Today the system cannot answer these operator questions cleanly:

- Which assigned roles does this model benchmark well for?
- Which taxonomy groups is this model benchmark-proven to serve?
- If a model benchmarks well for a role it is not assigned to, should routing use that signal?
- Why did a routing decision prefer one model over another for a role-driven request?

Without that layer, benchmark taxonomy remains informative but underused.

## Proposal Summary

Introduce an assignment-aware benchmark taxonomy fit layer with three explicit rules:

1. Benchmark taxonomy may boost routing preference only after hard filters and role bindings have already established eligibility.
2. Benchmark taxonomy may recommend model role/group assignments, but it must never create eligibility on its own.
3. All benchmark-to-role/group derivation must come from canonical taxonomy data, not duplicated ad hoc mappings in UI or runtime glue code.

## Scope Of The Follow-up

### In scope

- derive benchmark role-fit and group-fit signals from benchmark taxonomy scores
- constrain those signals by actual runtime-assignable roles
- use those signals as advisory routing preference inputs
- surface those signals in model assignment UI and routing diagnostics
- preserve explainability with concrete reason codes and coverage metadata

### Out of scope

- replacing policy-authored role bindings with benchmark automation
- making benchmark taxonomy a hard eligibility gate by default
- hand-maintaining a second benchmark-specific group taxonomy
- reworking run 59 Observe telemetry scope
- redesigning the whole benchmark suite authoring program

## Canonical Concepts

The follow-up should add these concepts to the runtime contract.

### `availableRoleIds`

The roles a model can actually serve under current runtime policy, after:

- runtime role catalog
- provider-account model role bindings
- local-model role assignment rules
- endpoint role-binding construction

### `benchmarkRoleScores`

Benchmark-derived role scores keyed by canonical `roleId`.

Source of truth:

- direct benchmark taxonomy `roleId` tags
- optional enrichment from task scores only where the role/task relationship is canonical and unambiguous

### `eligibleBenchmarkRoleScores`

`benchmarkRoleScores` filtered to `availableRoleIds`.

This is the primary routing input.

### `benchmarkGroupScores`

Group-level aggregates derived from `eligibleBenchmarkRoleScores` through canonical taxonomy membership:

- `primaryGroupId`
- `secondaryGroupIds`

Group scores must be derived, not hand-tagged per benchmark case.

### `benchmarkCoverage`

Coverage metadata that explains how much evidence exists behind a role/group score:

- benchmark case count
- distinct task count
- benchmark mode coverage (`quick`, `full`)
- latest benchmark timestamp
- sparse/low-confidence flags

Routing must treat low or absent coverage as neutral by default.

## Data Contract Changes

### Extend `EndpointCandidate.benchmarkCapability`

The current type should grow from:

- `overallScore`
- `taskScores`

to an assignment-aware shape such as:

```ts
benchmarkCapability?: {
  overallScore?: number;
  taskScores?: Record<string, number>;
  roleScores?: Record<string, number>;
  eligibleRoleScores?: Record<string, number>;
  groupScores?: Record<string, number>;
  coverage?: {
    overallCases: number;
    roleCases?: Record<string, number>;
    groupCases?: Record<string, number>;
    modes?: {
      quick: number;
      full: number;
    };
    lowCoverageRoleIds?: readonly string[];
    lowCoverageGroupIds?: readonly string[];
  };
}
```

The exact field names may differ, but the separation must remain explicit:

- raw benchmark role evidence
- role evidence filtered by assignment eligibility
- derived group evidence
- coverage and confidence metadata

### Preserve a single canonical derivation path

Derivation logic should live in shared runtime/core code, not be repeated in:

- router core
- host bridge
- UI view models

Recommended ownership:

- canonical taxonomy relationship resolution in `packages/core`
- runtime candidate enrichment in host-bridge/protocol-routing
- display-only formatting in runtime UI

### Do not duplicate group mappings

Group-fit must be derived from canonical taxonomy role membership:

- role -> primary group
- role -> secondary groups

That keeps the feature compatible with future taxonomy revisions.

## Routing Semantics

### Hard filters remain unchanged

Routing must continue to establish eligibility from:

- requested role
- task allowlists
- required capabilities/modalities/tools
- endpoint role bindings
- provider and endpoint policy

Benchmark taxonomy is not allowed to make an ineligible model eligible.

### Benchmark taxonomy enters after eligibility

After the candidate set is eligible, benchmark taxonomy should contribute to quality preference in this order:

1. direct task score for the requested `taskType`
2. eligible role score for the requested `requestedRoleId`
3. eligible group score for the role's `primaryGroupId` or classified group when direct role evidence is missing
4. fallback benchmark `overallScore`

The system should not jump directly from `overallScore` to role/group conclusions when better evidence exists.

### Neutral fallback behavior

If a candidate lacks benchmark role/group evidence:

- no automatic penalty by default
- fall back to current benchmark `overallScore` or neutral quality
- optionally emit a diagnostic that routing used weaker evidence

### Coverage-aware scoring

Role/group benchmark boosts should be suppressed or reduced when coverage is too weak.

Example policy:

- minimum case count per role/group before full boost
- lower boost for single-case role evidence
- zero boost for scores marked sparse unless explicitly enabled

The follow-up run should make the thresholds configurable, but safe defaults should remain advisory and conservative.

### Explainability requirements

Routing diagnostics should gain explicit benchmark taxonomy reasons, for example:

- `BENCHMARK_TASK_SCORE`
- `BENCHMARK_ROLE_SCORE`
- `BENCHMARK_GROUP_SCORE`
- `BENCHMARK_ROLE_SCORE_LOW_COVERAGE`
- `BENCHMARK_FALLBACK_OVERALL_SCORE`

The exact enum names can vary, but operators must be able to see whether the choice was driven by:

- direct task evidence
- role evidence
- broader group evidence
- coarse overall benchmark quality

## Assignment Semantics

### Role assignment remains policy-owned

Model role assignment is still operator policy.

Benchmark evidence may:

- recommend a role
- warn about weak evidence for an assigned role
- show evidence outside the current assignment

Benchmark evidence may not:

- auto-assign a new role silently
- widen `availableRoleIds`
- bypass provider-account or local-model assignment constraints

### Add an explicit recommendation layer

The model/operator surfaces should distinguish:

1. `Assigned`
2. `Benchmark-evidenced`
3. `Benchmark-evidenced but unassigned`
4. `Assigned with weak or no benchmark evidence`

That gives the operator a real review workflow instead of conflating evidence with policy.

### Group recommendations are derived from role assignments

The runtime does not need a separate group-assignment policy object. Group visibility can remain derived from:

- assigned roles
- role primary/secondary groups
- benchmark role scores

This avoids introducing a second policy layer that could drift from role assignment.

## UI Contract

UI work must use the existing runtime design system and the `ui-design-system` guidance.

### Implementation rules

- stay inside existing runtime shell and route families
- use `SectionCard`, `DisclosureSection`, `FactCard`, `StatusPill`, `EmptyState`, and shared chart primitives where possible
- keep chart colors on the existing runtime chart token system
- keep legends human-readable and deterministic
- avoid bespoke route-local styling systems or benchmark-only mini themes
- preserve keyboard and screen-reader clarity for assignment recommendations and evidence states

### Recommended surfaces

#### `/app/models`

Extend the inspect surface to show:

- assigned roles grouped by taxonomy group
- benchmark-backed role fit for assigned roles
- benchmark-evidenced but currently unassigned roles
- group-level fit summary derived from eligible roles
- evidence provenance and coverage details

#### `/app/remote/providers` and local role assignment surfaces

Where operators assign roles:

- show benchmark-backed role recommendations beside the assignment controls
- keep recommendations visually subordinate to policy controls
- never pre-check a role solely because of benchmark evidence

#### Router and decision detail surfaces

Show benchmark taxonomy reasoning in candidate comparison and request drill-in:

- direct task benchmark match
- role benchmark match
- group benchmark fallback
- low-coverage warnings

## Benchmark Authoring And Validation Rules

To support routing correctly, benchmark taxonomy data needs stricter invariants.

### Required for routing-influencing benchmark cases

- canonical `roleId`
- canonical `taskType`
- task/role pairing that resolves in taxonomy

### Derived, not duplicated

- group id must not be hand-authored on cases
- role-to-group derivation must come from canonical taxonomy

### Validation additions

Add validation that benchmark cases intended for routing influence:

- tag known roles and tasks
- do not reference impossible role/task combinations
- do not produce role evidence for roles outside taxonomy

## API And Runtime Surface Changes

The follow-up should prefer extending existing surfaces over creating parallel APIs.

### Recommended extensions

- benchmark summary/result payloads:
  - add role fit, eligible role fit, group fit, and coverage metadata
- router candidate payloads:
  - include benchmark taxonomy fit summary used in routing
- model inspect rollup payloads:
  - include assignment-aware benchmark role/group evidence
- routing decision detail payloads:
  - include the exact benchmark taxonomy contribution that affected ranking

If new endpoints are added, they should be justified by payload size or ownership boundaries, not by convenience alone.

## Verification And Testing

This proposal is only credible if the follow-up run is fully testable.

### Unit and contract tests

- `role-model-router/apps/runtime-host-bridge/test/benchmark-summary.test.ts`
  - derive role and group scores, not just dimension aggregates
- `role-model-router/packages/core/test/routing-intent.test.ts`
  - requested role prefers higher eligible role score
  - group fallback used only when direct role evidence is absent
  - ineligible role evidence does not affect ranking
  - low-coverage role evidence is neutral or reduced as configured
- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.test.ts`
  - benchmark evidence never changes computed role bindings
- `role-model-router/packages/provider-account/test/index.test.ts`
  - benchmark metadata never bypasses provider-account validation rules

### UI tests

- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - recommendation and warning rows render the right role/group evidence states
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.test.tsx`
  - assigned vs recommended roles are visually and semantically distinct
- route tests for `/app/models` and any role-assignment surfaces
  - no silent auto-selection
  - coverage warnings visible

### Integration tests

- runtime candidate enrichment includes eligible role scores filtered by actual assignments
- routing decision detail exposes benchmark taxonomy reasons with stable metadata
- model inspect rollups stay consistent with router candidate evidence

### Manual QA

- run a benchmark suite with canonical role/task tags
- inspect `/app/models` and confirm assigned-role evidence and unassigned-role recommendations
- route requests with `requestedRoleId` values that should differentiate between two eligible models
- confirm the selected model changes only when both are already eligible for the role
- verify decision detail clearly shows task, role, or group benchmark influence
- verify a model with strong benchmark evidence for an unassigned role is still not eligible for that role until an operator assigns it

## Future Run Requirements Seed

If this proposal becomes a new recursive run, the seed requirements should include at least:

- `BRR1` derive assignment-aware benchmark role and group fit from canonical taxonomy
- `BRR2` extend candidate enrichment and router scoring to consume role/group fit advisory signals
- `BRR3` preserve hard eligibility boundaries and add stable benchmark taxonomy reason codes
- `BRR4` extend model and role-assignment UI with benchmark-backed recommendations using the runtime design system
- `BRR5` add coverage/confidence semantics so sparse benchmark evidence is explicit and conservative
- `BRR6` extend decision detail and candidate inspection with explainable benchmark taxonomy provenance
- `BRR7` add focused tests, integration tests, and manual QA proving benchmark evidence never creates eligibility

## Acceptance Criteria For The Follow-up

The follow-up should not be considered complete unless all of these are true:

- benchmark taxonomy role and group scores are derived from canonical taxonomy data
- routing uses benchmark role/group evidence only after hard filters
- routing never treats benchmark evidence as a substitute for explicit role assignment
- model/operator UI cleanly separates assigned roles from benchmark recommendations
- routing diagnostics explain whether task, role, group, or overall benchmark evidence was used
- low or missing coverage is explicit and does not silently overfit routing
- the implementation uses the existing runtime design system and shared telemetry/chart primitives where applicable

## Recommended Architectural Guardrails

- do not store hand-authored benchmark group tags
- do not duplicate taxonomy relationship logic in runtime UI
- do not auto-promote benchmark evidence into role assignments
- do not collapse benchmark evidence and telemetry evidence into one unlabeled quality number
- do not let benchmark role/group fit bypass current `roleBindings` or provider-account assignment rules

## Open Design Questions

These should be resolved in Phase 1 of the future run, not improvised during implementation:

- Should group score be the max of eligible role scores, weighted mean, or coverage-weighted mean?
- Should task score contribute directly to role fit when the benchmark case already names a `roleId`, or stay separate?
- Should low-coverage benchmark evidence be neutral by default or weakly positive?
- Which existing payload should own the richest benchmark taxonomy fit object: candidate inventory, model rollup, or both?
- Should operators be able to opt into automatic assignment recommendations, while still keeping actual assignment as an explicit action?

## Recommendation

Treat this as a separate follow-up run after run 59 closes.

The implementation should not be folded into run 59 because:

- run 59 is scoped to telemetry/operator-surface completion and Pi parity
- this change alters router quality semantics and assignment UX
- it needs its own Phase 1 audit, TDD slices, and manual QA plan

The change is still important. It closes the gap between benchmark taxonomy, actual model role assignment, and the routing behavior the proposal implicitly expects.

## Coverage Gate

- [x] The benchmark-taxonomy routing supplement is preserved as a durable requirement addendum.
- [x] The addendum now reflects that the implemented slice and live precedence proof were completed inside run 59.

Coverage: PASS

## Approval Gate

- [x] This addendum remains a valid locked upstream input for the implemented benchmark-routing slice.

Approval: PASS
