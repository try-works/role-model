# S411 — M9 learning/local/operator/media characterization (ranking first)

Worktree: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration` · HEAD `5f53a3ae` · evidence doc only, no product edits, no commit.

## 1. Ranked surfaces and endpoint availability

| Surface | Original interaction | HTTP contract | Host availability | Current Foldkit UI |
| --- | --- | --- | --- | --- |
| Learning per-task endpoint ladder top-3 + full ranking | `learning.tsx:1026-1032` (row shows top-3 ranked endpoints + full-ranking detail), `1085-1146` (rank/denominator rows) | **Readback** GET `/api/role-model/operator/learning` (host `index.ts:17847`); packs `/operator/learning/records?kind=pack`; decisions `/operator/learning/decisions`; measurement `/operator/learning/measurement`; history `/operator/learning/history` (`runtime-endpoints.ts:21-26`) | **YES** (readback) | readback-only generic rows (`view.ts:825-831`); no top-3/full ranking rendering |
| Learning per-task Activate / Roll back | `learning.tsx:1188-1196` toggle, handler `toggleLadder` posts `{scopeId, roleId, taskTypeId, rolledBack, reason}`; original notes it rides the pack rollback route | **POST** `/api/role-model/operator/learning/rollback-pack` (host `index.ts:18219`); body verified in `learning-api.ts` `rollbackLearningLadder` doc comment + function | **YES** (no new route work) | **MISSING** — no writes/commands at all |
| Learning pack Activate / Rollback (scope-wide) | `activateLearningPack` / `rollbackLearningPack` (`learning-api.ts`), confirm at `learning.tsx` | POST `/operator/learning/activate-pack` (host `18208`), POST `/operator/learning/rollback-pack` (`18219`) | **YES** | **MISSING** |
| Learning other writes | kill switch, policy set/rollback, rescore, materialize route ladders, guardrail breach, scenario restore | host routes `17921-18284` (policy, rollback, rescore, rollout, records/decisions/measurement/activity/history, materialize-route-ladders, guardrail-breach, scenario-restore, kill-switch) | **YES** (host) | MISSING |
| Requests ranking metric/target filters | selects write URL `metric` and `rankBy` (`requests.tsx:227-230, 471-482`); definitions feed `fetchTelemetryAnalytics` POST `/api/role-model/telemetry/query` (`requests.tsx:349-364`; `runtime-api.ts` fetchTelemetryAnalytics) | **POST** `/api/role-model/telemetry/query` (host `index.ts`; `queryTelemetryAnalytics` required else 404) | **YES** (host) | **MISSING** — no `telemetry/query` usage in `apps/runtime-ui-next/src` (grep empty); Requests is GET readback `/api/role-model/telemetry/requests` (`runtime-endpoints.ts:40`, `view.ts:884`) |
| Requests ranked chart/list data | ranking charts from analytics query; requests page readback | GET `/telemetry/requests`, GET `/telemetry/requests/page` (host `19062/19071`), POST `/telemetry/query` | **YES** | readback only |
| Model pool / candidate ranking | original dashboard candidate space (no interaction handlers; computed `point.selected` only, `candidate-space-chart.tsx:128-129,210-285`) | readbacks `routerCandidates`, `configuredModels` | YES | readback/model pool present; no interaction (S408 scope) |

**Ranking endpoint verdict:** every write the original learning ranking/activate/rollback used already exists on the host; the per-task toggle needs **no new route** (`rollback-pack` with `rolledBack:false|true`). Requests ranking filters need the existing `/telemetry/query` POST; no host gap found.

## 2. What the current readback-only pages support

- `READBACK_PATHS` (`runtime-endpoints.ts:21-40`): `learning /operator/learning`, `learningConfiguration /operator/learning/policy`, `learningPacks /operator/learning/records?kind=pack`, `learningDecisions /operator/learning/decisions`, `learningEvidence /operator/learning/measurement`, `learningHistory /operator/learning/history`, `replayJobs /operator/replay/jobs`, `evaluationJobs /operator/evaluation/jobs`, `requests /telemetry/requests`, `localLogs /local/logs`, `localPeers /local/peers`, `systemPeers /local/peers`, `operatorStatus /operator/status`, `operatorTraceRoots /operator/trace-roots`, `extensions /extensions`, `localPeerModels`, `localSwap`.
- Rendering: `learningPage` renders three generic readback tables (`view.ts:825-831`); `Requests` is `renderReadbackPage` (`view.ts:884`); `LocalLogs` (`897`), `LocalPeers`/`SystemPeers` (`906-907`), `LocalLlamaSwapModels`/`SystemOperator`/`SystemExtensions` (`926-928`), `LocalSwap` (`941`) are readback/final-family pages; `LocalChoose` (`936`) is a static section. None has ranking rows, per-row toggles, filters, or writes.
- `parseLearning` / `parseLearningFamily` reduce host payloads to display rows, so ranking fields (rank, endpointId, status, rolledBack.reason) are not typed today.
- Studio/media: `studio` state + tab commands exist (`src/studio.ts` tabs chat/images/audio/rerank; `view.ts:914` `studioPage`) — this family is **not** readback-only; media scope here means verifying image/audio/rerank tab parity, not building ranking.

## 3. Caller / region table (first slice candidates)

| Region | File:line | Current | Needed |
| --- | --- | --- | --- |
| Learning page | `view.ts:825-831` | 3 generic readback tables | ranking table region for ONE surface |
| New learning ranking view | (new) `src/learning-ranking.ts` | — | typed ladder row view from JSON meta; per-row status/pending/error |
| Shell model | `src/model.ts` | no learning action state | optional learning-ranking state (rows, pending keys, errors) |
| Update | `src/update.ts` | readback only | per-task toggle handler, no-double-submit per (roleId,taskTypeId), refresh learning readback |
| Commands | `src/commands.ts` | none | one command POST `/operator/learning/rollback-pack` body `{scopeId,roleId,taskTypeId,rolledBack,reason}` |
| Client seam | `app.ts` | no learning write client | fetch impl injection for tests |
| Readback | `src/readback.ts` `parseLearning` | string rows | typed ladder rows (rank/top-3/rolledBack) |
| Tests | `apps/runtime-ui-next/test` | none for learning | exact payload, toggle states, error-keeps-row, no-double-submit, refresh |

## 4. Named first slice

**S412 — Learning per-task ranking table with Activate / Roll back.**

Scope: ONE ranking surface — the learning endpoint-ladder table (top-3 ranked endpoints + full ranking detail) with the real per-task toggle.

1. Parse the learning readback into typed ladder rows (`roleId`, `taskTypeId`, completeness, `topEndpoints[].{endpointId,rank,status}`, `rankedCount`, `rolledBack{on,reason}`) rather than generic strings (`readback.ts` `parseLearning`).
2. Render the top-3 ranked endpoints and the full-ranking disclosure in a Foldkit table (accessible headers/table, no new route).
3. Per-row **Activate / Roll back** button with a typed state `{status: "idle"|"confirming"|"pending"|"error", message?}`, keyed by `roleId\u0000taskTypeId`; second click confirms (replaces `window.confirm`), pending disables only that row (no double submit), error keeps the row and shows the message.
4. One command: POST `/api/role-model/operator/learning/rollback-pack` with exactly `{scopeId, roleId, taskTypeId, rolledBack, reason}` (reason `operator_ui_ladder_activate` / `operator_ui_ladder_rollback`), then re-read `/operator/learning` (token-fenced).
5. Tests: exact payload for both directions; second-click confirm; no-double-submit while pending; failure keeps the row and its prior state; refresh is token-fenced; readback empty/error honest.
6. Out of scope: pack-wide activate/rollback, policy/kill-switch/rescore writes, Requests ranking filters (next slice S413), local writes, Studio media parity.

## 5. Risks / unknowns

- The learning readback rows are generic JSON in the current shell; the exact host payload for the ladder index (where `topEndpoints`/`rolledBack` live) is only evidenced through the original page/types, not through a live host capture here — the first slice must add a typed parse against the real body and make unknown shapes explicit (not fabricated).
- Operator writes may require the operator token / loopback trust; the original uses the same `fetch` + optional bearer. The first slice should reuse the existing bearer seam and test the request shape, not invent auth.
- `window.confirm` cannot be ported literally; the typed confirming state is the honest replacement and must be tested.
- Requests ranking filters need the POST query + chart definitions, which belongs to a separate slice (S413); do not fold it into the learning ranking slice.
- Local/operator/media lack of actions is not a chart/ranking defect; those families need their own characterization per page before implementation.
