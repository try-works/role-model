# Run 104 SP8 - private conformance unblocker: PARTIAL (box expired)

Receipt token: r104-sp8-conformance-2W9F
Agent: /root/sp104_sp8_conformance
Worktree: D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity

## What was done

1. RED lane captured (step 1, mandatory): `node --test tests/track-b/run99-r33-policy-consumers.test.mjs`
   -> `pass 0 / fail 1`, `published policy fields with no consumer: perArmOutputEvidence,
   perArmOutputExclusionBound`. Log: `E:\tmp\run104-evidence\sp8-red.txt`.

2. Consumer hunt (step 2). References to the two fields exist in exactly four files in the whole
   private worktree: the registry (`shared/route-learning/activation-policy.mjs:59-60`), the shipped
   JSON (`shared/route-learning-activation-policy.json:14-15`), the run-100 bounds test
   (`tests/track-b/run100-policy-bounds.test.mjs:33,38`) and the docs table
   (`docs/route-learning/shadow-to-active.md:144-145`). `counterfactualExclusions` - the receipt the
   field description says travels with the result - appears **only** in the docs table. There is no
   per-arm comparable-output resolution anywhere in the private tree.

3. Focused RED test written (step 3): `tests/track-b/run104-sp8-per-arm-output-consumer.test.mjs`.
   It pins the required seam: `resolvePerArmComparableOutput` (durable_required vs
   durable_preferred, bounded tool-call serialisation, `missing_comparable_output` exclusion) and
   `applyPerArmOutputExclusionBound` (within-bound exclusions travel; over-bound refuses with
   `per_arm_output_exclusion_bound_exceeded`). Log: `E:\tmp\run104-evidence\sp8-red-focused.txt`.
   It does not fail on the seam: it fails on `ERR_MODULE_NOT_FOUND: Cannot find package 'effect'`,
   because this worktree has no `node_modules` and the runtime module imports
   `shared/queues/queue-store.mjs` -> `effect` (workspace dep). Installs are out of scope for this
   brief, so the wiring could not be executed or green-lit here.

## What the wiring has to attach to (identified, not implemented)

The behaviour R2 describes is currently a **refusal** in the private runtime:
`scripts/track-b/runtime-operations-server.mjs:5890`

    if (branchKind !== null && normalizedMessages.some(message =>
        Array.isArray(message.toolCalls) && message.toolCalls.length > 0 || message.toolCallId)) {
      throw new Error("route capture branch source contains tools and cannot be replayed
                       through the transcript-free path");
    }

and the arm's output artifact is built from `input.outputText ?? ""` at `:5827`, so a
tool-call-shaped arm carries an empty assistant text and ends in a missing-output refusal - exactly
the class `perArmOutputEvidence: durable_required` is documented to resolve with "a bounded
serialisation of the captured tool calls". `perArmOutputExclusionBound` has no counter to bound:
the capture path refuses at the first tool-shaped arm instead of excluding arms by name up to the
published bound.

Precedent to copy for the policy read: `recordReplayDisposition`
(`scripts/track-b/runtime-operations-server.mjs:7211-7248`) resolves `replayDeferralBound` through
`createPolicyStore({ stateFilePath: <stateRoot>/learning/activation-policy-state.json })`
`describePolicy({ channel, scope }).effective`, falls back to the documented default, and never
fails the write on a degraded read.

## Not the correct alternative: removal

Removal is not available as the cheap fix: `tests/track-b/run100-policy-bounds.test.mjs:22-45,60-70`
asserts both fields exist as registry entries with bounds/defaults/descriptions and that the shipped
JSON and `DEFAULT_ACTIVATION_POLICY` carry the documented defaults. Deleting them breaks run-100's R7
evidence as well as the docs.

## Why `perArmOutputEvidence` is not consumed in the public bridge either

The public bridge consumes the *other* two run-100 R7/R1 fields (`maxCounterfactualArms` at
`role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts:11583-11586`, `judgeArmExclusion`
at `role-model-router/apps/runtime-host-bridge/src/cli.ts:2148-2160`) - that is why those two pass the
R33 lane and these two do not. The R2 fields were published without ever landing a consumer on
either side.

## Recommendation to the controller

1. Wire in `scripts/track-b/runtime-operations-server.mjs` at the branch-capture guard
   (`:5890`) plus the per-arm output artifact (`:5827`): under `durable_required` (default) resolve a
   tool-call-shaped arm's comparable output to the bounded serialisation instead of refusing, under
   `durable_preferred` prefer the in-process buffer and fall back to the durable capture, and record
   exclusions by name; enforce `perArmOutputExclusionBound` where the capture's arms are collected.
2. Run the focused test in an installed worktree (this worktree has no `node_modules`; the brief
   forbids installs), then the R33 lane.
3. Treat the focused test as a draft: it names the seam the wiring must expose; adjust names if the
   implementation chooses a different module boundary, but keep the three pinned behaviours.

## Disclosure

Read-only outside the deliverable plus the one new test file; no commits, no dependency installs, no
runtime restarts, no spawns. Box: the 20-minute box expired during step 4, so the wiring was not
attempted rather than half-done.
