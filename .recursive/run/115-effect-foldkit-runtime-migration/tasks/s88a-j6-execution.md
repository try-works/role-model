# S88a R17 J6 execution: create and drive a real replay job (public)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
J6 has been PASS only on its honesty half because no jobs existed. The host CAN create them: `POST /api/role-model/operator/replay/jobs` -> `createReplayJob` (`index.ts:17674`), with `GET` listing/cancel/results around `:17683+`, and evaluation jobs around `:17732`. Turn this from NOT RUN into a measured result.

## Method

1. Start the PACKAGED executable (the newest build) on an ephemeral port with a fresh temp state root on E: and a mock upstream you control; point one endpoint at the mock (same fixture approach as the earlier journeys).
2. Drive ONE chat request so a capture/request exists; record its request id and decision id.
3. `POST /api/role-model/operator/replay/jobs` with the smallest body the handler accepts, referencing that request/capture. If the host refuses, capture its exact error - that is a legitimate NOT RUN reason with the contract named.
4. Poll `GET /api/role-model/operator/replay/jobs` and the per-job results until the job is terminal or a bounded timeout; assert the terminal status, that the job id appears in the list, and that the results reference the SAME request/decision ids from step 2.
5. If the job runs the mock upstream again, assert the mock received the replay call (a replay that silently does nothing must fail).
6. Classify honestly: PASS only if a job actually executed and terminated; otherwise NOT RUN/FAIL with the exact host response.

## Evidence

Script plus logs under `evidence/journeys/`, the job id, request ids, the poll transcript, and `s88a-tdd.json` with per-assertion results. Never POST to :3456; ephemeral ports and temp state only.

NO packaging, no installs, no commits, no subagents.

## Report
The exact POST body accepted, the job lifecycle observed, the id joins proven, the mock's evidence that it was called, and the honest classification.