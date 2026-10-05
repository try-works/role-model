Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `00 Requirements` (addendum)
Status: `LOCKED`
LockedAt: `2026-10-03T03:13:27.145Z`
LockHash: `bea50dd7e421fdc1cd0f6be1a1d00881eee78e29582aba9b5961b57a5446148a`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/00-requirements.md` (LOCKED `f3b5c3fc`)
- `/.recursive/run/105-route-learning-matching-scope-activation/01-as-is.md` (LOCKED `9f16eb01`)
- Phase-2 planner reports (five packages A-E), which surfaced the two conflicts below.
Outputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/addenda/00-requirements.addendum-01.md`
Scope note: this addendum resolves two genuine contradictions between the locked requirements and the verified
baseline, plus one wording gap. It supplements, never edits, `00-requirements.md`.

## TODO

- [x] Identify the contradictions from the Phase-2 planner reports
- [x] Re-verify each against the baseline code first-hand
- [x] Record the operator-facing decision for each
- [x] Complete the Coverage Gate
- [x] Complete the Approval Gate

## A1. R1's "a taxonomyVersion difference does not block the advisory" contradicts the existing router gate

**The contradiction.** R1 says the advisory carries `taxonomyVersion` for provenance and that "a taxonomyVersion
difference does not block the advisory". The baseline router refuses exactly that case:
`packages/core/src/router.ts:128-131`

```ts
const requestTaxonomyVersion = normalizeScopeId(input.requestTaxonomyVersion);
if (requestTaxonomyVersion && requestTaxonomyVersion !== advisoryTaxonomyVersion) {
  return fallback("advisory_taxonomy_mismatch");
}
```

R5 simultaneously requires that "every gate, threshold, and fallback stays exactly as it is today". Written
literally, R1 and R5 cannot both hold.

**Decision (R1 clarified, R5 unchanged).** `taxonomyVersion` is **provenance, not a match key**. The run must NOT
relax the `advisory_taxonomy_mismatch` gate. Rationale: (a) the requirement's own intent is that matching is
`(roleId, taskTypeId)` exact only - adding a second match dimension was never the point; (b) relaxing an existing
fail-closed refusal is a behaviour change to the routing contract, which R5 forbids; (c) the gate is already
tested (run-99 R33).

**Effective wording.** R1's bullet becomes: "The advisory carries `taxonomyVersion` for provenance; the MATCH KEY
is `(roleId, taskTypeId)` exact. The existing router taxonomy gate (`advisory_taxonomy_mismatch`) is unchanged and
still fails closed on a version difference."

**Consequence for code.** Package B adds `taxonomyVersion` to the contract scope (storage/provenance) but must not
weaken the gate; Package C keeps `router.ts:128-131` byte-identical and its tests assert the refusal still fires.

## A2. R5's "falls through to the next rung" vs the single-shot swap and the score band

**The contradiction.** R5 says "a removed/unavailable/ineligible top rung falls through to the next". The verified
baseline mechanics are: the gate function resolves ONE advised endpoint (`router.ts:111-147`), the band check
compares that endpoint to the leader (`gap = leader - advised <= band`, `:145-147`), and `routeRequest` performs a
single-shot index swap (`:1788`). With a ladder [A, B, C], leader B, rung A eligible but OUTSIDE the band, and rung
B (the leader) routable, a walk that continued past the band would land on B and apply nothing
(`applied = preferred !== leader.endpoint_id`, `:153`) - i.e. the observable outcome is identical either way.

**Decision (fall-through is a PREFERENCE-level guarantee).** The walk skips a rung only when it is **not routable**
- `status: unavailable` (user removal, R4) or not in the request's `eligibleEndpointIds` (router eligibility, R4).
The walk does NOT skip a rung for being outside the score band; the band remains the gate that decides whether the
walked preference is APPLIED. The run keeps the single-shot swap and the exploration/propensity math unchanged.

Rationale: (a) R5's primary sentence is "the existing score-band, cohort and confidence gates still decide whether
the preference is applied" - the band is a GATE, not a walk filter; (b) making the walk band-aware would change the
propensity semantics (`selectionProbability` is computed for ONE advised arm, `:148-158`) and would make "considered
but not applied" indistinguishable from "applied"; (c) the acceptance criterion that matters - "a removed/
unavailable/ineligible top rung falls through to the next" - is satisfied exactly, and is what Phase 5 probes.

**Recorded consequence (must be surfaced in Phase 5).** With `explorationPercent = 0` (the live default,
`index.ts:26494`), the rung that is APPLIED is always rank 1 when rank 1 is routable and within band; a deeper rung
can be WALKED (visible as `advisoryRungWalked`) but will match the leader and therefore not change the selection.
The observation ledger must record the walked rung so this is measurable rather than invisible (R13/C13).

## A3. Wording gap: the Packs page shows the (role, task) IDENTIFIER, not a display name

The design doc's UI section says each row shows the task's "(role, task) name". No display-name plumbing exists
anywhere in the baseline: `resolvePackScope` (`runtime-operations-server.mjs:2213-2232`) resolves ids only, and every
other Learning surface renders raw ids (`learning.tsx:464-488`).

**Decision.** Stage 3 renders the raw `(roleId, taskTypeId)` ids (column header `Role . task (id)`). A taxonomy
display-name read is net-new plumbing outside R12's code-site list and is NOT in scope.

## Coverage Gate

- [x] Both contradictions were re-verified against the baseline first-hand (`router.ts:128-131`, `:145-147`, `:153`,
  `:1788`, `index.ts:26494`; `runtime-operations-server.mjs:2213-2232`).
- [x] Each addendum item states the decision, the rationale, the effective wording, and the consequence for the
  Phase-2 packages.
- [x] No locked artifact was edited; this addendum supplements them.

## Approval Gate

- The addendum removes the only two places where the locked requirements could not be implemented as literally
  written, without weakening any existing routing gate.
- Phase 2 can now lock: every package's plan is consistent with the effective wording above.
