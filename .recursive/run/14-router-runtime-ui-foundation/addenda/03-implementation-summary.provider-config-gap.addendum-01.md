Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `03 Implementation`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-config-gap.addendum-01.md`
- `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.provider-config-gap.addendum-01.md`
Scope note: This addendum records the implementation-side repair for the post-closeout provider configuration gap: run 14 no longer stops at provider metadata and structural account upserts, and the worktree now supports executable Kimi device OAuth start/poll, operator-controlled model selection, and runtime-managed endpoint activation.

## TODO

- [x] Record the additional implementation scope without rewriting locked Phase 3 history
- [x] Capture the new backend persistence, API, and UI surfaces
- [x] Record strict TDD evidence for the extra scope
- [x] Attach the focused validation evidence paths
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - The original locked run-14 implementation receipt remains historically correct for the first UI foundation slice, but it did not cover executable provider onboarding after the user attempted live Moonshot/Kimi setup.
  - The worktree now closes the concrete operator gap in three places:
    1. **Kimi device OAuth is executable for local testing** through host bridge start/poll routes backed by the real Moonshot device-auth/token endpoints.
    2. **Provider account configuration is model-aware** instead of silently inheriting the variant preset list.
    3. **Endpoint activation is mutable at runtime** instead of being frozen to the checked-in `registry-sources.json` fixture.
- Remediation applied:
  - Extended `sqlite-memory` with:
    - `runtime_endpoints` persistence for runtime-managed endpoint activations
    - `provider_device_auth_sessions` persistence for device-auth state between start/poll calls
    - exported read/write helpers for both surfaces
  - Extended `runtime-host-bridge` with:
    - `POST /api/role-model/accounts/device/start`
    - `POST /api/role-model/accounts/device/poll`
    - `POST /api/role-model/endpoints`
    - startup merging of persisted runtime endpoints into the live registry build
    - file-backed OAuth token persistence under the runtime state root keyed by the generated credential ref
    - CLI/server wiring for the new mutable routes
  - Updated runtime UI data/client surfaces with:
    - `startRuntimeDeviceAuthorization(...)`
    - `pollRuntimeDeviceAuthorization(...)`
    - `activateRuntimeEndpoint(...)`
  - Repaired the runtime UI route surfaces:
    - `/app/providers` now links into executable setup flows
    - `/app/accounts` now supports model selection, Kimi device-auth start/check, and richer account state display
    - `/app/endpoints` now supports runtime-managed endpoint activation from configured accounts
  - Updated `provider-presets.json` to reflect the fuller Kimi header contract surfaced from `kimi-cli`.
- Important limitation that remains explicit:
  - The Kimi variant can now complete the initial device-auth connection for local testing, but the broader durable refresh/lifecycle productization is still not treated as fully complete. The UI/control plane therefore remains honest about the variant being a limited onboarding slice rather than a finished full-token-management system.
- Changed files:
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
  - `/testdata/router-runtime/provider-presets.json`
- TDD evidence:
  - RED:
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-ui-provider-config.addendum-01.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/sqlite-memory-provider-config.addendum-01.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-host-bridge-provider-config.addendum-01.log`
  - GREEN:
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-ui-provider-config.addendum-01.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/sqlite-memory-provider-config.addendum-01.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-host-bridge-provider-config.addendum-01.log`

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-config-gap.addendum-01.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- Additional implementation categories captured:
  - executable device OAuth
  - operator-chosen models
  - runtime-managed endpoint activation
  - UI route repair for setup actions
- Evidence attached:
  - focused RED/GREEN logs
  - changed-file list

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The implementation delta is preserved in the run-local addenda set
  - [x] The backend persistence/API work is named concretely
  - [x] The runtime UI route repairs are named concretely
  - [x] The TDD evidence paths are attached
- Remaining blockers:
  - full long-lived Kimi token refresh/lifecycle productization remains outside this repair slice

Approval: PASS
