# S478 — mark readiness ready in the packaged branch

Status: pending
TDD Mode: strict
Public basis 342fcd86; private b8733789.

Root cause (S477 bootdiag, evidence/other/s477-bootstrap-hang-location.md): every packaged await completes (sidecar ready parsed, createBackend done, beforeReady steps done, no qaExtensions), but the readiness owner stays pending forever because bootstrapState.status="ready"; readinessOwner.markReady(); lives ONLY in the non-packaged else branch (cli.ts:12208-12210 region) and the packaged branch (ends ~12210-12183) never calls markReady. Hence packaged operator routes 503 runtime_initializing pending forever despite a fully working sidecar and UI.

Repair (PUBLIC src/cli.ts ONLY + test): after the packaged/non-packaged if/else completes (before the watchdog/close registrations that must stay inside the packaged branch), perform the shared ready transition once: bootstrapState.status = "ready"; delete bootstrapState.message; readinessOwner.markReady(); and remove the duplicate transition from the else branch (or make it idempotent - prefer single shared call site). Keep failExtensionRuntime/markFailed catch path unchanged; packaged branch-specific registrations (packagedRuntime/extensionRuntime closers, watchdog) stay where they are.

Strict RED first: extend cli-startup-readiness.test.ts (existing injectable seams) with a packaged-branch case asserting readinessOwner.markReady is called exactly once and bootstrapState becomes ready; today packaged path leaves it pending (test fails before fix). Then minimal wiring; run host tsc + UI tsc + cli-startup-readiness/watchdog/S475/S120 suites + nonempty anti_slop_lint abs scans; freeze hashes; independent review by a different member (s9b-eventlog); no commit. No whole R27/R36 claim.
