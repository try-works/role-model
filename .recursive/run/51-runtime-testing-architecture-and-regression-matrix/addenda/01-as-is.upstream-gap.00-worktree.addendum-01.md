Run: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
Phase: `01 AS-IS`
Addendum: `upstream-gap.00-worktree.01`
Status: `LOCKED`
LockedAt: `2026-06-20T12:00:39Z`
LockHash: `3e5751f2a5737023ec880de032a7610e68883c48e0197a5054705cf0e6ca2a5c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md` (LOCKED)
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md` (LOCKED)
- User guidance in chat on 2026-06-20:
  - add the provided runtime overview screenshot to the repository README near the top section
Outputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
Scope note: This addendum preserves new README screenshot guidance that arrived after Phase 0 locked. It keeps the screenshot requirement attached to the existing README upgrade guidance without mutating locked Phase 0 history.

## TODO

- [x] Record the new README screenshot requirement from chat
- [x] Preserve the requested placement near the README top section
- [x] Keep the new README visual guidance additive to the already-locked README addendum

## Gap Summary

The locked Phase 0 README addendum preserves hero, hybrid-routing, acknowledgements, and structure guidance, but it does not yet capture the newer request to include the provided runtime overview screenshot near the top of the README.

## Discovery Evidence

- user chat on 2026-06-20 requested that the provided runtime overview screenshot be added to the repository README near the top section

## Implications For Current And Later Phases

- This run remains a testing-architecture run; the screenshot request does not widen the product-testing scope of Phase 1.
- If run 51 or a later dedicated README run touches `/README.md`, the effective README guidance now includes a screenshot requirement in addition to the previously preserved hero and acknowledgements requirements.

## Compensation In Current Phase

- Preserve the new screenshot requirement in a current-phase upstream-gap addendum rather than editing the locked Phase 0 artifacts.
- Treat the effective README guidance for later phases as:
  - hybrid local/cloud hero positioning
  - acknowledgements for `llama-swap` and `LiteLLM`
  - a runtime overview screenshot placed near the top section of the README

## Preserved README Screenshot Guidance

- Add the provided runtime overview screenshot to the repository README.
- Placement should be near the top section, after the hero or immediate overview content rather than buried lower in the document.
- The screenshot should reinforce the runtime/operator nature of the project and visually support the hybrid local/cloud routing story.
- The screenshot content is the dark-theme runtime overview UI with the left navigation rail plus telemetry charts and cost panels.

## Traceability

- README screenshot guidance -> preserved from user chat on 2026-06-20
- current-phase compensation -> this addendum plus the Phase 1 effective-input update

## Coverage Gate

- [x] The new screenshot requirement is preserved in a repo document
- [x] The placement guidance near the README top section is explicit
- [x] The addendum avoids editing locked Phase 0 history directly

Coverage: PASS

## Approval Gate

- [x] The new README screenshot guidance is specific enough for downstream reuse
- [x] The addendum keeps run-51 testing scope intact while preserving the visual README requirement

Approval: PASS
