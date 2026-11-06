# S650 R20/R21 diagnostics calibration + authorized defect readback

Basis: public worktree HEAD 9e130eb7 plus working tree (R5/R14/R23/R27 and lockstep landed). Strict TDD. No installs, no operator ports, no private-repo edits.

## R20 — calibrated and enabled

Approved limits recorded in `module-health-writer.ts`:

| Bound | Value |
| --- | --- |
| record count | 128 |
| code byte cap | 96 |
| ingress rate | 32 records/second |
| TTL | 15 minutes |
| query page cap | 50 records |

`MODULE_HEALTH_LIMITS_ENABLED` is now true. The writer enforces a token-bucket ingress bound, the ring capacity, the code byte cap, TTL filtering and the query cap; its source reports `enabled: true` and normalizes missing build/instance identity to `unknown`. `createModuleHealthComposition` now enables the calibrated writer when no explicit config is supplied; an explicit `{ enabled: false }`, or an explicit enable without calibration approval, still returns the honest disabled state.

RED: `evidence/logs/s650-r20-calibration-red.log` — 2/2 failed on the disabled gate and the missing calibrated limits (not a setup failure).

GREEN: `evidence/logs/s650-r20-r21-diagnostics-green.log` — 6 files / 36 tests; host `tsc --noEmit` exit 0; anti-slop clean. Existing sqlite/queue/diagnostics suites outside this set were not touched by this slice.

## R21 — authorized defect through the real read path

`s650-r20-r21-diagnostics-live.test.ts` drives a real writer (Fail records + ring overflow), then calls the same authorized `handleLocalDiagnosticsRead` the operator route dispatches to. It asserts build identity `unknown`, `conditions: {dropped:true, stale:true}`, `state:"stale"`, exact loss count and the 50-record query bound. `s374-defect-readback.test.ts` already covers an injected genuine defect reading back without business telemetry contamination, and remains green.

Gap: a packaged/browser receipt through a freshly built candidate is NOT delivered. The worktree has no `role-model-router/dist/release/win32-x64` candidate, and the available E: candidate (`r14-release-e07b60c3`) predates this change. Building and running the packaged page is left to the Lead/build lane; this slice does not claim it.

## Files

- `role-model-router/apps/runtime-host-bridge/src/module-health-writer.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (enablement default)
- `role-model-router/apps/runtime-host-bridge/test/module-health-writer.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run115-s10b-module-health-wiring.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/s366-module-health-edge.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/s369-diagnostics-query-source.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/s374-defect-readback.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/s650-r20-r21-diagnostics-live.test.ts`

## Commits / shared-tree note

- `1f6a8881` (an R6 lane commit) swept the staged R20 source/tests: `module-health-writer.ts`, `index.ts`, `module-health-writer.test.ts`, `run115-s10b-module-health-wiring.test.ts`, `s366-module-health-edge.test.ts`. The changes are present at HEAD but are attributed to that commit; this worker did not intend the cross-lane stage.
- `c421d0d4` carries the R20/R21 evidence and `s650`/s374 tests.
- `3917e839` carries the final s369 expectation repair.
