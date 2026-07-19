Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-18T02:55:41Z`
LockHash: `a9e728e30b5d53a86d49c998b8d4cd09ce23dd2a31d1c1c3d47548765debe377`
Workflow version: `recursive-mode-audit-v2`
Inputs: rebuilt SEA package, clean staging, disposable runtime state, browser/API harnesses.
Outputs: live rebuilt-runtime QA receipt and cleanup proof.
Scope note: Executes the user-required rebuilt-runtime verification rather than treating package creation as sufficient.

## TODO

- [x] Build and stage the SEA from this worktree
- [x] Start it on an isolated port and state root
- [x] Exercise Models, mutation, Benchmark, request/health, streams, K3, and eject
- [x] Inspect logs/package assets
- [x] Stop process and delete disposable state/staging

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `primary Codex controller`
- Tools Used: PowerShell, packaged SEA, Edge/Playwright, Node/tsx harnesses, HTTP APIs.
- Rebuilt executable: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA-256: `b4c1592881622abe69e3847e098638f2fdab34ae68d2cd5aee28fde6692c6fb8`
- Version: `0.0.6-22-g7094a252-dirty`; commit `7094a252b7cab222f5ff12d1753e77cef83d6a22`.
- Runtime: `127.0.0.1:55724`, scope `run77-phase5`, disposable Windows temp staging/state root.
- Evidence Path: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`

## QA Scenarios and Results

1. Clean startup: staged SEA reached `healthy` with bootstrap `ready`; staged compact catalog was 2,089,147 bytes. PASS.
2. Models route: essential inventory rendered in 391 ms; candidate payload was 1,221 bytes; no `/api/role-model/requests` call occurred. PASS.
3. Save bindings/repeat save: POST completed in 100 ms; button cleared 39 ms later/139 ms total; the only mutation-owned model path was POST accounts. PASS.
4. Concurrent health/summary during save: 139/138 ms and HTTP 200. PASS.
5. Models -> Benchmark: essential heading and run control rendered in 324 ms. PASS.
6. Request-list/health loop: 30 samples; request p95 6.333 ms/max 6.413 ms; concurrent health p95 6.355 ms/max 6.868 ms. PASS.
7. Kimi K3 abnormal committed stream: disposable local K3-shaped upstream emitted a valid partial SSE delta then an invalid/truncated transport terminator. Packaged client terminated in 85.804 ms, selected endpoint `moonshot.run77.streamfail.global.kimi-k3`, model `moonshot/kimi-k3`, and wire model `k3` remained inspectable; post-stream health/summary were 200; zero header-sent errors appeared in logs. PASS for bounded termination/ownership.
8. Actual thrown post-commit execution path: owning real-server tests for both Chat Completions and Responses emitted a downstream chunk then threw; both terminated without second JSON/header write. PASS (automated real-server seam, because ordinary packaged startup intentionally exposes no QA fault-injection hook).
9. `/proc/1513/fd/63` negative control: 400 in 16.6 ms, then health 200; no runtime special-case/provider attribution. PASS.
10. Safe eject: account-managed last-model removal pruned one binding, endpoint, and activation; repeat removal returned already-absent/authority absent. PASS.
11. Package inspection: no `fetchRuntimeRequests` or `fetchRuntimeSnapshot` marker in staged UI, packaging validator passed, 60 clean staged asset files. PASS.
12. Cleanup: process absent, port closed, two attempted Phase-5 temp roots removed, no live/user state touched. PASS.

## Kimi K3 Live Credential Note

A real Kimi K3 provider success was not executed because no isolated QA OAuth/API credential was available. Accessing the user's live credentials would violate the isolation requirement. Exact `moonshot/kimi-k3 -> k3` wire/stream compatibility passed deterministic provider tests and the disposable K3-shaped upstream.

## Evidence and Artifacts

- `evidence/phase5-rebuilt-runtime-receipt.json`
- `evidence/phase5-live-browser.mts`
- `evidence/phase5-live-api.mts`
- `evidence/phase5-runtime.stdout.log`
- `evidence/phase5-runtime.stderr.log`
- `evidence/browser/sp8-runtime-responsiveness-2026-07-18.json`
- `evidence/perf/request-and-catalog-2026-07-18.json`
- `evidence/perf/candidate-scaling-2026-07-18.json`

## User Sign-Off

Not required: locked QA mode is agent-operated, and the user explicitly required the agent to run the rebuilt runtime in Phase 5.

## Traceability

- R1 -> reproduced causal scenarios and isolated live runtime.
- R2 -> scenarios 2 and 6.
- R3/R6/R8 -> scenarios 3 and 4.
- R4 -> scenario 5.
- R5 -> scenario 6 plus candidate scaling receipt.
- R7 -> scenario 10.
- R9 -> scenarios 1 and 11.
- R10 -> all scenarios plus Phase 4.
- A1/A2 -> scenarios 7 and 8.
- A3/A4 -> scenario 7 and exact deterministic K3/selected-target tests.
- A5 -> scenario 9.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: unavailable
Subagent Capability Probe: controlling developer instruction prohibited subagent use; controller operated the runtime/browser directly.
Delegation Decision Basis: Phase-5 process ownership, isolated state, and cleanup required controller execution.
Delegation Override Reason: subagent use was not authorized.
Audit Inputs Provided: rebuilt executable, release manifest/hash, runtime logs, browser/API output, staged assets, and cleanup checks.

## Earlier Phase Reconciliation

Live results match locked Phase 3/4 claims and do not require a product repair or upstream addendum.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: executable hash/version, process/readiness, browser timings/network, API timings, stream transcript, request inspection, logs, eject outcomes, and cleanup.
- Acceptance Decision: accepted.
- Refresh Handling: final receipt written after process and state cleanup.
- Repair Performed After Verification: none.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Comparison reference: `working-tree`
- Normalized baseline: `7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 7094a252b7cab222f5ff12d1753e77cef83d6a22` plus untracked-file enumeration.
- Actual changed files reviewed: all 23 product/test files in the canonical Phase-3.5 review bundle.
- Unexplained drift: none.

## Gaps Found

No blocking QA gap. Real-service Kimi success is explicitly blocked by isolated credential availability and is not falsely claimed.

## Repair Work Performed

None during Phase 5.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R2 | Status: verified | Changed Files: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Implementation Evidence: `role-model-router/packages/sqlite-memory/src/index.ts` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R3 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R4 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-benchmark.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R5 | Status: verified | Changed Files: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/candidate-profile-scaling.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/perf/candidate-scaling-2026-07-18.json`
- R6 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Implementation Evidence: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R7 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/e2e/recursive-77-catalog-json-size-and-ui-freeze.sp8.runtime-responsiveness.spec.ts` | Implementation Evidence: `role-model-router/apps/runtime-ui/e2e/recursive-77-catalog-json-size-and-ui-freeze.sp8.runtime-responsiveness.spec.ts` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R8 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `role-model-router/apps/runtime-ui/app/routes/startup-bootstrap-regression.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R9 | Status: verified | Changed Files: `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/data/normalized-catalog.json` | Implementation Evidence: `role-model-router/packages/catalog/src/index.ts` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`
- R10 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `role-model-router/packages/provider-openai/test/index.test.ts`, `role-model-router/apps/runtime-ui/e2e/recursive-77-catalog-json-size-and-ui-freeze.sp8.runtime-responsiveness.spec.ts` | Implementation Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-rebuilt-runtime-receipt.json`

## Audit Verdict

Audit: PASS
