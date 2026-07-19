Run: `/.recursive/run/65-codex-subscription-prompt-cache-parity/`
Phase: `03 Implementation upstream-gap addendum for 00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-12T02:55:23Z`
LockHash: `6aff57e27e5cd11c904c79fb74bde4c995bab163d40f993abe2756672a5ea78d`
Inputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/02-to-be-plan.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`
- user clarifications in chat on `2026-07-12`
Outputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/addenda/03-implementation-summary.upstream-gap.00-requirements.addendum-01.md`
Scope note: This addendum records the later requirement clarifications that arrived after the locked Phase 0 artifact: explicit Pi endpoint-override TDD cases plus additional live verification obligations for alias-backed routing, provider-doc crosswalk proof, the Kimi routing blocker, and the Pi session-history caveat.

Implementation note: Addendum 01 is fully implemented in the current worktree and Phase 5 evidence set.

## TODO

- [x] Record the requirement gaps exposed by the later user clarifications
- [x] Convert those gaps into explicit late-added T and V case IDs
- [x] Tie the additional cases to concrete product and evidence surfaces
- [x] Confirm the addendum remains inside the original run scope

## Gap Summary

The locked requirements already enumerated `T1` through `T24` and `V1` through `V16`, but later user clarification made four additional obligations explicit:

1. the Pi package verification path needed explicit regression tests proving `ROLE_MODEL_ENDPOINT` is honored by both command execution and runtime inspection when no endpoint override is passed
2. the rebuilt-runtime proof needed an explicit live alias-backed `A -> B -> A` Pi verification case, not only deterministic routing coverage
3. the final verification set needed a required provider-doc crosswalk against official OpenAI, LiteLLM, DeepSeek, and Kimi documentation
4. the Kimi live-proof path and the Pi alias session-history caveat both needed to be recorded as required verification outcomes rather than incidental notes

## Requirement Amendment

Late-added TDD cases:

- `T25`: `packages/pi-role-model/src/extension.ts` must honor `ROLE_MODEL_ENDPOINT` for runtime request commands when no explicit endpoint is passed
- `T26`: `packages/pi-role-model/src/runtime-inspection.ts` must honor `ROLE_MODEL_ENDPOINT` when no explicit endpoint override is provided

Late-added verification cases:

- `V17`: live Pi alias-backed `difficulty.remote-only` verification must prove `A -> B -> A` continuity restore with the same logical session id, a restored endpoint-`A` continuity state, and non-zero cache reuse on the return leg when eligible
- `V18`: final evidence must include a provider-doc crosswalk grounded in the official provider documentation used for the run
- `V19`: if Kimi cannot be live-verified, final evidence must record the exact routing blocker, including the canonical request id and the benchmark-data or eligibility condition that prevented routing
- `V20`: final evidence must record the Pi session-history carry-forward caveat when an image-bearing alias turn changes downstream modality and therefore changes later alias routing behavior

## Implementation Receipt

Changed product surfaces:

- `packages/pi-role-model/src/extension.ts`
- `packages/pi-role-model/src/runtime-inspection.ts`
- `packages/pi-role-model/test/extension.test.ts`
- `packages/pi-role-model/test/runtime-inspection.test.ts`

Changed evidence surfaces:

- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/pi-live-cache-verification.v2.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/provider-doc-crosswalk.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/telemetry-cache-proof.json`

Implemented outcomes:

- added and passed `T25` and `T26` through the Pi package test suite
- captured the live alias-backed `A -> B -> A` proof under `pi-live-cache-verification.v2.json`
- created the official provider-doc crosswalk artifact
- recorded the exact Kimi routing blocker and the Pi alias session-history caveat in canonical Phase 5 evidence

## Traceability

- `R7` -> `T25`, `T26`
- `R8` -> `V17`, `V18`, `V19`, `V20`

## Coverage Gate

- [x] Late-added requirement cases are explicit
- [x] Each added case is tied to a concrete product or evidence surface
- [x] The addendum stayed within the original prompt-cache parity scope

Coverage: PASS

## Approval Gate

- [x] The requirement amendment removes ambiguity for Pi endpoint targeting and alias-backed verification
- [x] The added cases are implemented and evidenced in the current run state

Approval: PASS
