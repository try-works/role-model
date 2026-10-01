# Subagent Action Record

## Metadata

- Subagent ID: `sp104_sp8_conformance`
- Run ID: 104-replay-eligibility-and-evidence-fidelity
- Phase: 03 Implementation (wave W1)
- Purpose: SP8 - wire the two unconsumed activation-policy fields (`perArmOutputEvidence`,
  `perArmOutputExclusionBound`) in the private worktree under strict TDD
- Execution Mode: in-session subagent (Codex delegation protocol; write scope limited to the private worktree)
- Timestamp: 2026-10-01T09:05:00Z

## Inputs Provided

- Current Artifact: `.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- Artifact Content Hash: `6b516655e1f57a01b3dceedd5c933cc91ec80facc4e323f6257c3b14c7c7295d`
- Upstream Artifacts: `.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`, `.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`
- Diff Basis: `git diff --name-only 5df90b6d12772f70bbdaff543b183fc5d312537b`
- Audit / Task Questions: brief `E:\tmp\collab\briefs\sp104_sp8_conformance.md` - reproduce the R33 RED, add a
  focused RED test, wire real consumers for the two fields, capture GREEN, report exact files and commands

## Claimed Actions Taken

Reproduced the conformance-lane RED (two unconsumed fields); wrote a focused contract test
`tests/track-b/run104-sp8-per-arm-output-consumer.test.mjs` that pins the documented behaviour seam
(`resolvePerArmComparableOutput`, `applyPerArmOutputExclusionBound`, `PER_ARM_OUTPUT_MAX_SERIALISED_BYTES`);
searched the private tree for consumers and found the two fields referenced only by the policy registry, the
published JSON, the run-100 bounds test and the docs; identified the capture-path refusal that the
`perArmOutputEvidence` behaviour is meant to replace (`runtime-operations-server.mjs:5890`) and the arm output
construction at `:5827`; found the policy-read precedent at `:7211-7248`. Could not run the focused test at
dispatch time: the private worktree had no `node_modules`, so it reported PARTIAL rather than installing.

Controller completion after the child returned: installed the private workspace dependencies and built the
`effect`, `effect-mq` and `@effect/sql-sqlite-node` wrappers (the child's blocker); re-ran the focused test
(RED for the intended reason: the contract did not exist); implemented the seam in
`scripts/track-b/runtime-operations-server.mjs` - `PER_ARM_OUTPUT_MAX_SERIALISED_BYTES` (4096), the bounded
tool-call serialiser, `resolvePerArmComparableOutput` (in-process buffer under `durable_preferred`, durable text,
then the bounded serialisation; otherwise exclude by name), `applyPerArmOutputExclusionBound` (refuse above the
bound with `per_arm_output_exclusion_bound_exceeded`), and `readPerArmOutputPolicy` (channel/scope precedence
with the documented defaults on a degraded read) - and wired it into `persistRouteCapture`: the branch response
artifact now carries the resolved comparable output (or the named exclusion) and the blanket
tool-bearing-branch refusal is replaced by the policy-driven decision. Result files:
`scripts/track-b/runtime-operations-server.mjs`,
`tests/track-b/run104-sp8-per-arm-output-consumer.test.mjs`.

## Claimed File Impact

### Created

- none

### Modified

- none

### Reviewed

- `scripts/track-b/runtime-operations-server.mjs`
- `shared/route-learning/activation-policy.mjs`
- `shared/route-learning-activation-policy.json`
- `tests/track-b/run100-policy-bounds.test.mjs`
- `docs/route-learning/shadow-to-active.md`

### Relevant but Untouched

- `extensions/evaluation-core/index.mjs`

## Claimed Artifact Impact

### Read

- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`

### Updated

- `E:\tmp\run104-evidence\sp8-report.md` (controller-copied to `evidence/other/sp8-report.md`)

### Evidence Used

- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`
- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp8-report.md`

## Claimed Findings

The two fields have no runtime consumer in the private tree, and the behaviour they describe is not implemented:
tool-carrying branch sources are refused outright (`runtime-operations-server.mjs:5890`) and the arm output is
built from `input.outputText ?? ""` (`:5827`), so a tool-call-shaped arm becomes a missing-output refusal instead
of a bounded durable serialisation; no `counterfactualExclusions` receipt exists. Removal is not valid (the
run-100 bounds test asserts both fields). Wiring is therefore a real feature, not a rename.

## Verification Handoff

- Deliverable to inspect: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp8-report.md`
- Controller verified: the consumer-absence claim (repo-wide grep), the RED lane (two fields), the private
  toolchain blocker (no `node_modules`), and the capture-path citations at `:5827`/`:5890`.
- Controller action after the child returned: installed the private workspace dependencies and built the
  `effect`, `effect-mq` and `@effect/sql-sqlite-node` wrappers, then re-ran the focused test - it now fails for
  the intended reason (missing exports), which is the SP8 RED contract to implement.
- Diff basis command: `git diff --name-only 5df90b6d12772f70bbdaff543b183fc5d312537b`
