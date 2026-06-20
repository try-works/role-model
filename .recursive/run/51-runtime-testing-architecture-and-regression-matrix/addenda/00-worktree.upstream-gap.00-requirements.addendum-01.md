Run: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
Phase: `00 Worktree`
Addendum: `upstream-gap.00-requirements.01`
Status: `LOCKED`
LockedAt: `2026-06-20T07:51:37Z`
LockHash: `221bc4ca4aebc5a2f3945838219272c5219a73a8c8bfbb9813b120a25cca9e44`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md` (LOCKED)
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md` (DRAFT)
- `/README.md`
- User guidance in chat on 2026-06-20:
  - the README hero must mention hybrid local/cloud AI usage by routing between local and cloud models
  - the hero wording should explicitly say `route between local/local, local/cloud, and cloud/cloud models with traceable decisions`
  - the README should include an `Acknowledgements` section near the end that mentions `llama-swap` and `LiteLLM` as vendors
Outputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
Scope note: The locked Phase 0 requirements artifact for run 51 predates later user guidance about the repository README. This addendum preserves that guidance without mutating locked history. It records a concrete README update plan that downstream phases or a later dedicated README run can cite if root-repo presentation docs are touched.

## TODO

- [x] Record the post-lock README guidance gap discovered in chat
- [x] Preserve the exact hero and acknowledgements requirements
- [x] Capture a concrete README upgrade plan in repo-owned recursive artifacts
- [x] Keep the guidance additive without silently expanding the run-51 testing-architecture acceptance floor

## Effective Inputs Re-read

- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`
- `/README.md`
- user guidance in chat on 2026-06-20

## Earlier Phase Reconciliation

- `00-requirements.md` is `LOCKED`, so it cannot be edited directly.
- The new README guidance arrived after the lock and is therefore preserved here as a current-phase upstream-gap addendum.
- This addendum does not replace the run-51 testing-architecture contract. It supplements Phase 0 inputs with repo-presentation guidance that should be reused if this run or a follow-up run touches `/README.md`.

## Gap Summary

The locked requirements artifact for run 51 does not mention the newer user-directed README positioning for the repository. Specifically, it omits:

- hero copy that explicitly frames `role-model` as hybrid local/cloud AI routing
- explicit routing language for `local/local`, `local/cloud`, and `cloud/cloud` model pairings
- an `Acknowledgements` section near the end of the README that credits vendor components such as `llama-swap` and `LiteLLM`

## Discovery Evidence

- user chat on 2026-06-20 requested that the hero state the protocol and runtime allow hybrid local/cloud AI usage by routing between local and cloud models
- user chat on 2026-06-20 further refined the hero copy to explicitly say `route between local/local, local/cloud, and cloud/cloud models with traceable decisions`
- user chat on 2026-06-20 requested an `Acknowledgements` section near the end of the README that mentions `llama-swap` and `LiteLLM` as vendors

## Implications For Current And Later Phases

- Run 51 remains a testing-architecture run. This addendum does not by itself require product-code or test-surface expansion beyond the locked requirements.
- If run 51 later chooses to touch root contributor-facing docs and `/README.md` is in scope, the effective Phase 0 input now includes this README guidance.
- If a later dedicated README or repo-presentation run is created, this addendum should be cited as preserved user guidance so the same hero and acknowledgements requirements are not lost.

## Compensation In Current Phase

- Preserve the README guidance in a repo-owned recursive artifact instead of chat-only memory.
- Treat this addendum as part of the effective Phase 0 input set for run 51.
- Update `00-worktree.md` so the active Phase 0 artifact lists this addendum in its `Inputs`.

## Supplemental README Update Plan

### Hero positioning

The README hero should present `role-model` as both:

- an open protocol
- a reference runtime for hybrid local/cloud AI routing

Recommended hero copy:

> Open protocol and reference runtime for hybrid local/cloud AI routing.  
> Describe request needs, endpoint capabilities, and policy constraints, then route between local/local, local/cloud, and cloud/cloud models with traceable decisions.

### Recommended above-the-fold structure

The top section should be restructured into a more professional repository landing page shape:

1. repository name
2. one-line hybrid local/cloud value proposition
3. restrained badges
4. quick links row
5. short `Why role-model` section
6. compact `How it works` diagram or flow
7. fast-path `Get started`

### Recommended section outline

```md
# role-model

Hybrid local/cloud value proposition
Badges
Quick links

## Why role-model
## How it works
## Get started
## What you get
## Current status
## Repository layout
## Read next
## Acknowledgements
## License
```

### Content direction

- keep the tone professional and infrastructure-grade, not marketing-heavy
- prefer a compact architecture diagram or flow over a demo GIF
- move the current docs hub lower so the hero and system overview explain value first
- separate packaged-runtime usage from source-build guidance more clearly
- shorten dense explanatory paragraphs and make the first screen easier to scan

### Acknowledgements section

The README should include an `Acknowledgements` section near the end, preferably immediately before `License`.

Recommended content direction:

> `role-model` builds on vendor components including `llama-swap` and `LiteLLM`, which are used within the runtime to support parts of the routing and serving stack. We acknowledge and appreciate the work of those projects and their maintainers.

## Traceability

- README hybrid-routing hero guidance -> preserved from user chat on 2026-06-20
- README acknowledgements guidance -> preserved from user chat on 2026-06-20
- current-phase compensation -> this addendum plus the `00-worktree.md` input update

## Coverage Gate

- [x] The README guidance discovered after the requirements lock is preserved in a repo document
- [x] The exact hero-positioning requirement and acknowledgements requirement are captured
- [x] The guidance is concrete enough to reuse in a later README update without re-mining chat history
- [x] The addendum avoids mutating the locked requirements artifact directly

Coverage: PASS

## Approval Gate

- [x] The addendum records the gap in a workflow-compliant way
- [x] The preserved README plan is specific enough for downstream reuse
- [x] The run-51 testing-architecture scope remains explicit rather than silently rewritten

Approval: PASS
