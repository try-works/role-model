**Audit: PASS — plan-readiness only (client-ownership correction).**

Scope: correction 3 (`R12`/`SRC-014` client API/refresh ownership) only; no product claim; other clauses not reopened. Read-only — no files changed.

Verified:
- Traceability now maps **both** `R12` and `SRC-014` to **S14a** (`02-to-be-plan.md:205-206`).
- S8 Requirements are `R26` only and explicitly state “Client R12/SRC-014 exclusively S14a” (`implementation-slices.md:55`); S8’s owned surface stays backend/provider files (`:56`).
- New S14a slice row owns `R12/SRC-014` and names `runtime-ui/app/lib/runtime-api.ts` plus new `runtime-ui-next/src/api/client.ts`, `refresh.ts`, `client.test.ts`, `refresh.scene.test.ts` (`implementation-slices.md:95-99`).
- The repair clause mirrors this and closes with “S8 owns backend transports only” (`02-to-be-plan.md:146`); the finite-corrections summary repeats it (`implementation-slices.md:131`).
- Per-requirement rows now show QA Surface **S14a** (`02-to-be-plan.md:56-57`, `:292-293`), and the `R12` verification surface `runtime-ui/app/lib/runtime-api.test.ts` exists in the worktree.

No residual `S8` assignment for `R12`/`SRC-014` remains; the prior “S8 both owns and does not own client runtime-api” collision risk is eliminated, and mapping/traceability/slices/completion-status agree.

Non-blocking observation: S14a is still not named in the dependency-edge/sub-phase lines (`02-to-be-plan.md:172`, `implementation-slices.md:115`), so its scheduling position is implicit — not an ownership contradiction.

**Audit: PASS**
