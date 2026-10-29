# S477 — temporary packaged bootstrap instrumentation (diagnostic build)

Status: pending
TDD Mode: pragmatic (temporary diagnostics, no product behavior change; reverted after diagnosis)
Public basis 342fcd86; private b8733789.

Proven by probes: packaged operator routes stay runtime_initializing pending; 90s sidecar-startup timeout and 30s QA invoke timeout BOTH never fire; sidecar ticks normally (auto-replay) and standalone prints type:ready. So the hang is inside createPackagedProductionRuntime/awaitCliExtensionRuntime/beforeReady OUTSIDE the qaExtensions loop and outside the sidecar-ready line wait.

Task (PUBLIC worktree only, TEMPORARY, dirty unsealed diagnostic build): add bounded console.error markers (prefix [bootdiag]) at: before/after createPackagedProductionRuntime acquireRelease; after awaitCliExtensionRuntime; inside beforeReady at each step (qa loop start/end per extension, retryContributionAggregates start/end, schedulePostObservationDrain, advisory refresh); inside track-b-runtime createPackagedProductionRuntime after sidecar ready line parse and after each subsequent await (find and mark each await in that function). Do NOT change behavior/timeouts/contracts. Rebuild package-sea with ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=1 (unsealed test package) and run the packaged exe, capture [bootdiag] sequence to identify the LAST marker before the hang; record exact line of the unresolved await. Then REVERT all instrumentation and rebuild sealed. No provider/ports/operator state; no commit of instrumentation.
