# Subagent Action Record

## Metadata

- Subagent ID: `sp104_sp8_conformance`
- Run ID: 104-replay-eligibility-and-evidence-fidelity
- Phase: 03 Implementation
- Purpose: SP8 - wire the two unconsumed activation-policy fields (`perArmOutputEvidence`,
  `perArmOutputExclusionBound`) in the private worktree under strict TDD
- Execution Mode: in-session subagent (Codex delegation protocol; write scope limited to the private worktree)
- Timestamp: 2026-10-01T09:05:00Z

## Inputs Provided

- Current Artifact: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp8-report.md`
- Artifact Content Hash: `47c6131115badcbea7deb2dd7df02d57d74c0c30f22cb2f74f73bee5abf2f262`
- Upstream Artifacts: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- Addenda: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`
- Diff Basis: `git diff --name-only 5df90b6d12772f70bbdaff543b183fc5d312537b`
- Audit / Task Questions: brief `E:\tmp\collab\briefs\sp104_sp8_conformance.md` - reproduce the R33 RED, add a
  focused RED test, wire real consumers for the two fields, capture GREEN, report exact files and commands

## Claimed Actions Taken

Reproduced the conformance-lane RED (two unconsumed fields); wrote a focused contract test that pins the
documented behaviour seam; searched the private tree for consumers and found the two fields referenced only by
the policy registry, the published JSON, the run-100 bounds test and the docs; identified the capture-path
refusal the `perArmOutputEvidence` behaviour is meant to replace and the arm-output construction beside it;
found the policy-read precedent. Could not run the focused test at dispatch time: the private worktree had no
`node_modules`, so it reported PARTIAL rather than installing.

Controller completion after the child returned: installed the private workspace dependencies and built the
`effect`, `effect-mq` and `@effect/sql-sqlite-node` wrappers (the child's blocker); re-ran the focused test (RED
for the intended reason: the contract did not exist); implemented the seam in the private operator server -
`PER_ARM_OUTPUT_MAX_SERIALISED_BYTES` (4096), the bounded tool-call serialiser, `resolvePerArmComparableOutput`
(in-process buffer under `durable_preferred`, durable text, then the bounded serialisation; otherwise exclude by
name), and `applyPerArmOutputExclusionBound` (refuse above the bound with
`per_arm_output_exclusion_bound_exceeded`), plus the policy read with channel/scope precedence and documented
defaults on a degraded read - and wired it into the capture persist path: the branch response artifact now
carries the resolved comparable output (or the named exclusion) and the blanket tool-bearing-branch refusal is
replaced by the policy-driven decision.

## Claimed File Impact

### Created

- none

### Modified

- none (the production and test changes are in the private worktree: the private operator server and the
  focused consumer test)

### Reviewed

- `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`

### Relevant but Untouched

- `role-model-router/apps/runtime-host-bridge/src/cli.ts`

## Claimed Artifact Impact

### Read

- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp8-report.md`

### Updated

- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp8-report.md`

### Evidence Used

- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp8-focused-and-r33-green.txt`
- `.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/red/sp8-per-arm-contract-red.txt`

## Claimed Findings

The two fields have no runtime consumer in the private tree, and the behaviour they describe is not
implemented: tool-carrying branch sources were refused outright and the arm output was built from
`input.outputText ?? ""`, so a tool-call-shaped arm became a missing-output refusal instead of a bounded
durable serialisation, and no `counterfactualExclusions` receipt existed. Removal is not valid (the run-100
bounds test asserts both fields), so wiring is a real feature rather than a rename. Measured scope correction:
the ratchet fails on **two** fields, not the twenty-four the locked requirement text claimed (addendum 01).

## Verification Handoff

- Controller verification: re-ran the run-99 R33 policy-consumer lane in the private worktree with the SP8
  wiring in place and recorded **pass 1 / fail 0**; inspected the scoped diff of the two private files; the RED
  log (two fields unconsumed) and the GREEN log are stored under `evidence/logs/{red,green}/`.
- Deliverable to inspect: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp8-report.md`
- Diff basis command: `git diff --name-only 5df90b6d12772f70bbdaff543b183fc5d312537b`
