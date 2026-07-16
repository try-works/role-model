Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `05 Manual QA`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-worktree.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/04-test-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md` (LOCKED)
Outputs:
- This file.
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/`

Scope note: Records browser verification against the SEA runtime built from the final implementation commit on isolated port `3483`; human-mode approval remains pending explicit user sign-off.

## TODO

- [x] Package the final implementation commit
- [x] Seed isolated deterministic telemetry through canonical runtime persistence
- [x] Start the SEA runtime on a non-`3456` port
- [x] Verify explicit and synthesized prompt-cache truth
- [x] Verify measured, normalized, estimated, unavailable, and genuine-zero token truth
- [x] Verify single-axis, dual-axis, area, and bar chart geometry in Chromium
- [x] Capture routes, request IDs, DOM measurements, API receipts, and screenshots
- [x] Stop only the test runtime and prove port `3456` is unchanged
- [ ] Obtain explicit human sign-off

## Audit Context

- Audit Execution Mode: self-audit plus human approval gate
- Subagent Availability: unavailable
- Subagent Capability Probe: no recursive router or delegated browser-review transport is configured in this worktree.
- Delegation Decision Basis: browser automation, screenshots, API receipts, process records, and package manifest are directly reproducible; the declared human sign-off cannot be self-issued.
- Audit Inputs Provided: lock-valid Phase 3/4, both locked addenda, package manifest, startup logs, browser script/output, request evidence, screenshots, and process isolation log.

## Effective Inputs Re-read

- Addendum `02` SP7 requires a named implementation commit, `runtime:package-sea`, isolated state, port `3483`, deterministic request evidence, exact browser routes, screenshots, and proof that `3456` was untouched.
- R9 requires the rebuilt runtime itself, not source preview or mocked component rendering.
- `05-manual-qa.md` declares `QA Execution Mode: human`; browser execution may be recorded by the agent, but lock approval requires explicit human sign-off.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` records strict TDD through the SEA compressed-asset fallback repair.
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/04-test-summary.md` records 547 host tests, 349 UI tests, six Playwright regressions, builds, schemas, and validators.
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md` provides the prior rebuilt-runtime/isolation discipline.
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/` remains the cache-efficiency metric ownership baseline.

## Earlier Phase Reconciliation

- Phase 3 is locked at `cd3a29f1d9cfeb66e7bec5afd7f87af9c5440fefa559349398e35536b8554c47`.
- Phase 4 is locked at `99216aa54b87196c3d929e7706f8b910319ce7c3f327861d2197e6240ed8ca23`.
- The first SEA startup exposed a real compressed-asset fallback defect. Phase 3/4 were canonically reopened, repaired under RED/GREEN TDD, retested, and relocked before QA resumed.
- Final implementation commit: `67f1ec95068523b8655970137d0bea381b9e8951`.

## QA Execution Record

### Environment

- QA Execution Mode: human
- Worktree: `D:/DEV/role-model/.worktrees/73-telemetry-surface-integrity-contract-fix/`
- Package command: `corepack pnpm run runtime:package-sea`
- Package result: PASS
- Packaged executable: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- Manifest version: `0.0.6-9-g67f1ec95`
- Manifest commit: `67f1ec95068523b8655970137d0bea381b9e8951`
- Executable SHA-256: `814e370d7a9413b7c500ee5ac842f14306dc59278401a79c633f6af4b0990ca5`
- Runtime state: `C:/Users/erikb/AppData/Local/Temp/role-model-runtime-qa`
- Runtime scope: `runtime-qa`
- Browser: Microsoft Edge Chromium through Playwright, headless, 1600x1100 viewport
- Verification URL: `http://127.0.0.1:3483`
- Test runtime PID: `26172`
- Protected runtime: `127.0.0.1:3456`, PID `4640`

### Startup Command

```powershell
role-model-runtime.exe `
  --repo-root <release>/win32-x64 `
  --runtime-state-root C:\Users\erikb\AppData\Local\Temp\role-model-runtime-qa `
  --scope-id runtime-qa `
  --host 127.0.0.1 `
  --port 3483 `
  --fixture-root <worktree>/testdata/router-runtime/fixtures `
  --static-root <release>/win32-x64/build/client
```

### QA Execution Status

Status: EXECUTED - all agent-verifiable scenarios pass; explicit human sign-off is pending.

## QA Scenarios and Results

### Scenario 1: Package provenance and startup

- Expected: package comes from the final implementation commit and initializes on a port other than `3456`.
- Actual: manifest identifies commit `67f1ec95`, SHA-256 `814e370d...`; SEA backend initialized successfully on `3483` as PID `26172`.
- Evidence: `evidence/phase5/package-manifest.json`, `packaged-runtime-launch.log`, `packaged-runtime.stderr.log`.
- Status: PASS

### Scenario 2: Prompt-cache request truth

- Routes: `/app/observe/requests/qa-telemetry-measured-001`, `/app/observe/requests/qa-telemetry-estimated-001`.
- Actual: measured request shows `explicit`; estimated request shows `synthesized`. API evidence records `promptCacheRequested: true` with matching sources.
- Explicit authority and synthesized fallback are both visible after packaged-runtime restart.
- Evidence: `packaged-request-evidence.json`, `packaged-qa-telemetry-measured-001.png`, `packaged-qa-telemetry-estimated-001.png`.
- Status: PASS

### Scenario 3: Token truth and provenance

- Measured: `qa-telemetry-measured-001` -> `120000 · measured`.
- Estimated: `qa-telemetry-estimated-001` -> `107 · estimated`.
- Unavailable: `qa-telemetry-unavailable-001` -> `n/a · unavailable`, with no fabricated `0 · measured`.
- Genuine zero: `qa-telemetry-zero-001` -> `0 · measured`.
- Normalized: `qa-telemetry-measured-002` -> `400 · normalized`.
- Evidence: `browser-observations.json`, `packaged-request-evidence.json`, and matching request screenshots.
- Status: PASS

### Scenario 4: Overview shared chart geometry

- Route: `/app`.
- Consumers: latency line, cache-efficiency dual-axis line, token-usage area, success/failure bar.
- Actual: every Y tick bounding box remains inside its card; axis counts are 1/2/1/1; legend inset is 12px; plot left/right insets are 25px/25px.
- Wide labels include the 140,000/105,000/70,000/35,000 scale and are visibly complete in the screenshot.
- Evidence: `browser-observations.json`, `packaged-overview.png`.
- Status: PASS

### Scenario 5: Observe dual-axis chart geometry

- Route: `/app/observe/requests`.
- Consumer: Cache Efficiency Trend.
- Actual: two rendered Y axes, ten tick labels, 12px legend inset, and balanced 25px/25px plot insets.
- Evidence: `browser-observations.json`, `packaged-observe-requests.png`.
- Status: PASS

### Scenario 6: Runtime isolation and teardown

- Before: port `3456` PID `4640`; port `3483` PID `26172`.
- Action: stopped only PID `26172`.
- After: port `3456` still PID `4640`; port `3483` has no listener.
- Evidence: `process-isolation.log`.
- Status: PASS

## Evidence and Artifacts

- Package log: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/verification/runtime-package-sea.log`
- Browser script: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/verify-packaged-runtime.mjs`
- Browser output: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/browser-verification.log`
- DOM measurements: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/browser-observations.json`
- API truth: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/packaged-request-evidence.json`
- Package provenance: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/package-manifest.json`
- Process isolation: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/process-isolation.log`
- Screenshots: seven `packaged-*.png` files under `evidence/phase5/`.
- Initial SEA failure receipts are retained as `initial-sea-failure.*.log` and correspond to the strict-TDD SP7 repair.

## User Sign-Off

- Approved by: PENDING
- Date: PENDING
- [x] Scenario 1: package provenance/startup agent-verified
- [x] Scenario 2: cache request truth agent-verified
- [x] Scenario 3: token provenance agent-verified
- [x] Scenario 4: Overview geometry agent-verified
- [x] Scenario 5: Observe geometry agent-verified
- [x] Scenario 6: process isolation agent-verified
- [ ] Human reviewer accepts the rebuilt-runtime evidence
- [ ] Overall human QA approved

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/packaged-request-evidence.json`
- R2 | Status: verified | Changed Files: `role-model-router/packages/provider-openai/src/index.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/packaged-request-evidence.json`
- R3 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/browser-observations.json`
- R4 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/packaged-request-evidence.json`
- R5 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/browser-observations.json`
- R6 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/browser-observations.json`
- R7 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/runtime-assets.ts`, `role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/verification/runtime-host-bridge.log`
- R8 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/verification/runtime-ui-browser.log`
- R9 | Status: verified | Changed Files: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/verify-packaged-runtime.mjs` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/package-manifest.json` | Verification Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/browser-observations.json`

## Traceability

- R1/R2/R4 -> packaged request API evidence and explicit/synthesized browser surfaces.
- R3 -> all four token truth sources plus genuine-zero browser and API evidence.
- R5/R6 -> five shared time-series consumers with exact DOM measurements and screenshots.
- R7/R8 -> strict TDD logs, full automated suites, and reproducible packaged-browser script.
- R9 -> implementation commit manifest, isolated SEA startup, exact routes/IDs, screenshots, and process-isolation receipt.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `67f1ec95`
- Comparison reference: `working-tree`
- Normalized baseline: `67f1ec95`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 67f1ec95`
- Planned or claimed changed files: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/05-manual-qa.md`, `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/verification/runtime-package-sea.log`, and `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/phase5/`.
- Actual changed files reviewed: same as planned or claimed changed files.
- Unexplained drift: none.

## Audit Verdict

Audit: PASS

All executable R9 evidence is present and internally consistent. The packaged runtime is tied to the final implementation commit, browser assertions and screenshots agree, and process isolation is proven.

## Coverage Gate

- [x] Package commit and SHA-256 are recorded.
- [x] Cache and token truth are verified on exact deterministic request IDs.
- [x] Single-axis, dual-axis, area, bar, Overview, and Observe geometry are verified.
- [x] Exact routes, measurements, API facts, and screenshots are retained.
- [x] Port `3456` remained PID `4640`; port `3483` is free after teardown.

Coverage: PASS

## Approval Gate

- [x] Agent-executable QA is complete.
- [x] Audit and coverage gates pass.
- [ ] Human-mode sign-off is explicit.

Approval: FAIL

Approval remains pending only because `QA Execution Mode: human` requires the user to accept the recorded rebuilt-runtime evidence.
