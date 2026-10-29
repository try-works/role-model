# S451 — pre-implementation scope review: S448 Learning action scope

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only design/caller review; no source writes, no commit, no provider/operator calls. Inputs: tasks/s448-repair.md, S420 finding 8 (s420-current-state-review.md:23), original runtime-ui learning.tsx/learning-api.ts, public UI-next readback/learning-ranking/update, public host routes, and the private records readback shape already present in the paired basis.

## Actual source/caller proof

1. **The authoritative owner scope is the records readback root `scopeId`, not `/operator/learning`.**
   - Original `apps/runtime-ui/app/routes/learning.tsx:1839-1841` fetches `/operator/learning/records` and reads the root: `asRecord(records.value).scopeId` for pack activation (`:1889`) and rollback (`:1956`). The same file's ladder rows are a sibling `ladders` array on that records readback (`:1855-1864`).
   - The private readback fixtures confirm the contract: `{schemaVersion: "role-model.knowledge-learning-records.v1", scopeId: SCOPE, records: [...]}` (e.g. private `run101-a49-learning-evidence-joins.test.mjs:144-145`, `run104-sp5-learner-floor-readback.test.mjs:139-140`, `run105-e5-ladder-index-readback.test.mjs:88-89`).
   - The current public host passes `/api/role-model/operator/learning/records` through to the same operator records call (`index.ts:17984-17995`; `track-b-operations.ts:2116-2120`). No new route is required.

2. **`/operator/learning` root has no owner scope.**
   - Its current UI-next readback is the state body: `parseLearning` requires `knowledge`, then consumes a sibling `ladders` array (`readback.ts:664-685`). `LearningLadderPayloadSchema` is only `{ladders}` (`learning-ranking.ts:55-57`); no `scopeId` is parsed or available.
   - Do not infer scope from `knowledge`, a ladder row, health/runtime-summary, or a hardcoded channel. The original code's fallback string is exactly the defect S420 finding 8 records (`update.ts:1154` in UI-next hardcodes `standalone-runtime-stage`).

3. **Current caller path:** `LearningLadderToggleRequested` builds `learningRollbackPayload(..., "standalone-runtime-stage")` and sends it through the existing rollback command (`update.ts:1145-1157`). Phase/confirmation state is keyed only by `roleId + NUL + taskTypeId` (`learning-ranking.ts:142-143,165-177`); `LearningLadderUpdated/Failed` validates only the per-row token (`update.ts:1160-1180`). A scope change is invisible to both the confirmation and the pending result.

## Required design (not implementation)

- **Scope authority:** read the records root `scopeId` from `/operator/learning/records` (the existing route/readback authority) into Learning state; validate it as a non-empty string. If missing/invalid, fail closed: disable mutation, show an honest unavailable/error state, never fall back to stage/runtime/health or another channel. Thread that exact value into the existing rollback payload. No new endpoint and no host schema change are needed.
- **Confirmation identity:** key the two-click phase by `scopeId + roleId + taskTypeId` (or store scopeId in the phase and explicitly invalidate all confirming phases when the authoritative scope changes). Capture the scope at the first click; the second click must not issue a command for a different scope. A scope change between clicks must require a fresh first click, not silently retarget.
- **Pending result identity:** carry `scopeId` (plus role/task and token) through the command callback; `LearningLadderUpdated/Failed` must ignore a result whose scope no longer matches. A pending result for old scope must not repaint or unlock a row under new scope. Per-row token alone is insufficient when scope changes.
- **No mutation without scope:** missing/invalid/unavailable records scope => no rollback command, disabled/error view. Keep the existing exact payload `{scopeId, roleId, taskTypeId, rolledBack, reason}` and existing route; preserve per-row tokens and original literals.
- **Tests (author):** real shellUpdate RED for custom scope still stage (current behavior); records-scope A -> action payload A; scope A confirm then B -> no A mutation, re-confirm required for B; old A pending result after B ignored; missing/invalid scope -> disabled/no command; exact payload and per-row token tests retained. A fixture that invents root scope on `/operator/learning` is not acceptable evidence.

## Pitfall summary

The repair must add the **records readback authority** (or equivalent already-authorized records source) rather than guessing scope from the ladders state. If the author proposes a new endpoint or a root scope field on `/operator/learning`, stop and bring the exact contract to the Lead first. The narrow fix is: records scope -> Learning state -> confirm/pending key -> exact rollback payload, fail-closed. No broad Learning/R13/R31 completion claim.

No product/test/config file was modified; no commit.

