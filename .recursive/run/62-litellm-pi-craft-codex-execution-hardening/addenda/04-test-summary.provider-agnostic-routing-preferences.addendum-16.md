Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `16`
Status: `LOCKED`
LockedAt: `2026-07-09T14:02:41Z`
LockHash: `c27990fafb922169a42f9c14ca6854773746a998174292c3504aa6f066a6cae6`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.provider-agnostic-routing-preferences.addendum-16.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.provider-agnostic-routing-preferences.addendum-16.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.provider-agnostic-routing-preferences.addendum-16.md`
Scope note: This test summary covers addendum 16 provider-agnostic routing preference removal only. It records automated TDD, CI, validation, and packaging evidence; live Pi/Craft runtime verification is recorded in the Phase 5 manual QA addendum.

# Addendum 16 Test Summary

## TODO

- [x] Record RED test evidence.
- [x] Record targeted GREEN test evidence.
- [x] Record full local CI evidence.
- [x] Record packaged-runtime rebuild evidence.
- [x] Record validation helper and vendor-validator evidence.
- [x] Record known harness or environment issues without claiming them as product failures.

## RED Evidence

Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "provider agnostic|provider-specific routing pin"
```

Evidence:

- `evidence/logs/addendum-16/red/provider-agnostic-routing.red.log`

Expected failures:

- Ordinary tool/code alias mapping still narrowed `difficulty.remote-only` to the Codex Subscription endpoint only.
- Source still contained `applyOpenAICodexSubscriptionInitialPin`, `resolveOpenAICodexSubscriptionRoutingModel`, `shouldPreferOpenAICodexSubscriptionForTurn`, `preferredCodexRoutingModel`, and `fallbackAllowEndpoints`.

RED Result: PASS

## Targeted GREEN Evidence

Provider-agnostic routing and source guard:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "provider agnostic|provider-specific routing pin"
```

Evidence:

- `evidence/logs/addendum-16/green/provider-agnostic-routing.green.log`

Capability metadata guard:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/alias-capability-routing.test.ts
```

Evidence:

- `evidence/logs/addendum-16/green/alias-capability-routing.green.log`

Core advisory routing guard:

```powershell
corepack pnpm --filter @role-model-router/core exec vitest run test/routing-intent.test.ts
```

Evidence:

- `evidence/logs/addendum-16/green/core-routing-intent.green.log`

Full host-bridge index suite:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts
```

Evidence:

- `evidence/logs/addendum-16/green/runtime-host-bridge-index.green.log`

Result:

- 182 tests passed.
- Runtime: 105.58s.

GREEN Result: PASS

## Validation Helper Evidence

Pi validation helper:

```powershell
corepack pnpm --filter @try-works/pi-role-model exec vitest run test/validate-agent-path.test.ts
```

Evidence:

- `evidence/logs/addendum-16/green/pi-validate-agent-path.green.log`

Result:

- 7 tests passed.
- Tests assert provider-agnostic eligibility for compatible text and function-tool alias cases.

Vendor validation:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts
```

Evidence:

- `evidence/logs/addendum-16/green/validate-vendors.green.log`

Result:

- 2 tests passed.
- Tests accept either compatible selected endpoint for hard/tool alias cases and verify provider/vendor/adapter identity based on the selected endpoint.

Debug agent-path run:

```powershell
corepack pnpm exec tsx scripts/validate-agent-path.ts --out-dir <addendum-16 debug dir> --runtime-state-root <addendum-16 debug state> --scope-id run62-addendum16-debug
```

Evidence:

- `evidence/logs/addendum-16/green/debug-agent-path.log`
- `evidence/logs/addendum-16/green/debug-agent-path/summary.json`

Result:

- Text and function-tool cases kept both compatible endpoints eligible.
- Image cases narrowed by endpoint metadata with `missing_input.image`, not by provider name.

Validation Result: PASS

## Build And CI Evidence

Runtime host bridge build:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge build
```

Evidence:

- `evidence/logs/addendum-16/green/runtime-host-bridge-build.green.log`

Focused formatting/static check:

```powershell
corepack pnpm exec biome check role-model-router/apps/runtime-host-bridge/src/index.ts role-model-router/apps/runtime-host-bridge/test/index.test.ts docs/architecture/09-runtime-routing-strategy-interactions.md .recursive/STATE.md .recursive/DECISIONS.md .recursive/memory/domains/runtime-routing-and-provider-capabilities.md
```

Evidence:

- `evidence/logs/addendum-16/green/biome-focused.green.log`

Full local CI:

```powershell
corepack pnpm run ci:check
```

Evidence:

- `evidence/logs/addendum-16/green/ci-check.green.log`

Result:

- Full CI passed.
- Runtime-host critical tests passed.
- Runtime UI critical tests passed.
- UI and observability validation passed.
- Rust tests passed.
- Gateway smoke passed.

CI Result: PASS

## Packaged Runtime Evidence

Initial package attempt:

```powershell
corepack pnpm run runtime:package-sea
```

Evidence:

- `evidence/logs/addendum-16/green/runtime-package-sea.green.log`

Result:

- Failed because an old `role-model-runtime.exe` process was still holding the output executable open.
- This was an environment/process isolation issue, not a product test failure.

Corrective action:

- Identified PID `62776` as the old runtime process.
- Stopped PID `62776`.
- Confirmed no listener remained on `127.0.0.1:3456`.

Successful package attempt:

```powershell
corepack pnpm run runtime:package-sea
```

Evidence:

- `evidence/logs/addendum-16/green/runtime-package-sea.after-stop.green.log`

Artifact:

- Executable: `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\role-model-router\dist\release\win32-x64\role-model-runtime.exe`
- SHA256: `355eeb6dbed726f2c329d877bf1e7d50c998c04c8e01378c212dff764b06ddd9`

Package Result: PASS

## Harness Notes

- The first rebuilt-runtime launch failed because the state-root path containing spaces was passed without correct process-level quoting. Relaunch used quoted arguments and succeeded. Evidence: `evidence/logs/addendum-16/live/runtime-3456.stderr.log` and `evidence/logs/addendum-16/live/runtime-3456-relaunch.stderr.log`.
- The first headless Craft launch was interrupted by an overbroad cleanup query that matched its own PowerShell wrapper. The successful verification used an isolated user-data directory and excluded the active launcher. Evidence: `evidence/logs/addendum-16/live/craft-headless-2/`.
- These are harness/process-management issues. They did not require product code changes.

## Requirement Completion Status

- R0 | Status: verified | Evidence: provider-agnostic routing RED/GREEN logs and host-bridge index suite. | Addendum: addendum-16.
- R1 | Status: verified | Evidence: source guard and host-bridge execution routing tests. | Addendum: addendum-16.
- R2 | Status: verified | Evidence: no upstream Pi/Craft changes; real Pi and Craft verification recorded in Phase 5 addendum. | Addendum: addendum-16.
- R3 | Status: verified | Evidence: vendor validation accepts selected endpoint identity and keeps provider/vendor split. | Addendum: addendum-16.
- R4 | Status: verified | Evidence: Codex adapter remains covered by existing host-bridge tests while pre-routing pin is removed. | Addendum: addendum-16.
- R8 | Status: verified | Evidence: validation helper emits eligible endpoint IDs and router decisions record eligibility/scoring. | Addendum: addendum-16.
- R10 | Status: verified | Evidence: packaged runtime and live verification in Phase 5 addendum. | Addendum: addendum-16.
- R11 | Status: verified | Evidence: full `ci:check` passed. | Addendum: addendum-16.
- R12 | Status: verified | Evidence: docs, state, decisions, and durable memory updated. | Addendum: addendum-16.

## Coverage Gate

- [x] RED evidence recorded.
- [x] GREEN targeted test evidence recorded.
- [x] Full host-bridge suite evidence recorded.
- [x] Pi helper validation evidence recorded.
- [x] Vendor validation evidence recorded.
- [x] Build evidence recorded.
- [x] Full CI evidence recorded.
- [x] Runtime packaging evidence recorded.
- [x] Harness/environment issues documented separately from product behavior.

Coverage: PASS

## Approval Gate

- [x] Tests prove the former provider-specific pin fails and the new provider-agnostic behavior passes.
- [x] CI passed after stale Codex-winner assumptions were removed.
- [x] Packaged runtime was rebuilt from this worktree.

Approval: PASS
