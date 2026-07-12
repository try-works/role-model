Run: `/.recursive/run/65-codex-subscription-prompt-cache-parity/`
Phase: `03 Implementation upstream-gap addendum for 02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-12T02:55:23Z`
LockHash: `e6169284b1f68a6f2f57977f302a434b8ecd6f712ac8f78c5de653e21d7c886e`
Inputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/02-to-be-plan.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`
- user clarifications in chat on `2026-07-12`
Outputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This addendum amends the locked plan with the specific extra work needed to satisfy the later user clarifications around Pi endpoint targeting, live alias-backed verification, provider-doc crosswalk proof, and Kimi routing-blocker capture.

Implementation note: The amended plan steps below are fully implemented in the current worktree and evidence tree.

## TODO

- [x] Record the plan gaps exposed after the locked Phase 2 artifact
- [x] Convert those gaps into explicit remaining implementation or verification steps
- [x] Capture the evidence paths that satisfy the amended plan

## Gap Summary

The locked plan already covered provider-openai, host-bridge, routing, observability, and rebuilt-runtime Pi verification. The later user clarifications still required four planning amendments:

1. explicitly add Pi package endpoint-override regressions for both command and inspection flows
2. explicitly require live alias-backed verification through the router alias rather than exact-model-only proof
3. explicitly require official provider-doc crosswalk evidence, not only code-level reasoning
4. explicitly require the Kimi routing blocker and Pi session-history caveat to be recorded if they affect live proof

## Amended Plan Steps

1. add Pi package tests for `ROLE_MODEL_ENDPOINT` handling in:
   - `packages/pi-role-model/test/extension.test.ts`
   - `packages/pi-role-model/test/runtime-inspection.test.ts`
2. preserve Pi-facing prompt-cache and session-affinity compatibility hints through downstream discovery so the rebuilt-runtime Pi proof can use runtime-derived alias metadata truthfully
3. verify alias-backed continuity live through `difficulty.remote-only` with a same-session `A -> B -> A` sequence that restores the original warmed endpoint state on the return leg
4. materialize a canonical provider-doc crosswalk artifact under run-65 Phase 5 rebuilt-runtime evidence
5. materialize a canonical telemetry/API proof artifact that cross-checks request-detail, Observe/telemetry routes, and the screenshot proof
6. if Kimi remains non-routable, record the exact `no_eligible_target` blocker and benchmark-sample count instead of implying parity was live-verified
7. if an image-bearing alias turn alters the next turn's modality and route choice, record the caveat and use fresh local Pi session storage when proving continuity return-to-`A`

## Implementation Receipt

Added or repaired surfaces:

- `packages/pi-role-model/src/downstream-openai.ts`
- `packages/pi-role-model/src/extension.ts`
- `packages/pi-role-model/src/runtime-inspection.ts`
- `packages/pi-role-model/src/types.ts`
- `packages/pi-role-model/test/downstream-openai.test.ts`
- `packages/pi-role-model/test/extension.test.ts`
- `packages/pi-role-model/test/runtime-inspection.test.ts`

Added evidence surfaces:

- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/pi-live-cache-verification.v2.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/provider-doc-crosswalk.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/telemetry-cache-proof.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/observe-requests-cache-proof.png`

## Traceability

- `R4` -> alias-backed continuity proof via `difficulty.remote-only`
- `R7` -> explicit Pi endpoint-targeting tests
- `R8` -> provider-doc crosswalk, telemetry proof, Kimi blocker capture, Pi session-history caveat

## Coverage Gate

- [x] The amended plan names the missing work explicitly
- [x] Each amended step has a corresponding changed product or evidence surface
- [x] The amended plan is fully implemented

Coverage: PASS

## Approval Gate

- [x] The late-added planning obligations are now explicit and implemented
- [x] No extra product scope was introduced outside prompt-cache parity and verification truth

Approval: PASS
