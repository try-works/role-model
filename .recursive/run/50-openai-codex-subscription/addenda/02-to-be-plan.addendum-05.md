Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `05`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-05.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `/role-model-router/apps/runtime-host-bridge/test/`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-05.md`
- future runtime-host bridge code and test changes
Scope note: This addendum restores accurate post-restart health verification for OAuth-backed remote providers so live routing aliases can consider Kimi and DeepSeek together again.

## Objective

Make remote health probes honor OAuth refresh semantics so post-restart health state matches real execution state and mixed remote aliases can route across providers instead of collapsing to only the endpoints whose cached access tokens remain valid.

## Implementation Plan

### Phase 1: Probe auth retry contract

1. Extend the remote health probe contract to support an optional refreshed-authorization retry path.
2. Retry `/models` once when the first probe receives `401` or `403`.
3. Keep non-auth failures unchanged.

Acceptance:
- auth failure is retried once with refreshed authorization when the caller provides a refresh path

### Phase 2: Bridge-side OAuth alignment

1. Replace raw disk-token probe authorization with credential resolution that can pre-refresh expired OAuth tokens.
2. Add a bridge-side refresh callback for OAuth-backed probe targets that uses `refreshOauthAccessToken`.
3. Rebuild current runtime state after successful probe refresh so health and routing inventory rehydrate consistently.

Acceptance:
- OAuth-backed probe authorization follows the same refresh semantics as live execution

### Phase 3: TDD regression coverage

RED tests first for:

1. `remote-health-probe` retries after `401` using refreshed authorization and marks the endpoint healthy
2. `remote-health-probe` remains degraded when refreshed authorization still fails
3. bridge-level routing validation keeps the endpoint eligible once probe refresh succeeds

Acceptance:
- regression coverage fails before the implementation and passes after it

### Phase 4: Live verification

After rebuild and relaunch:

1. verify the Moonshot/Kimi endpoint no longer surfaces as degraded solely because of stale OAuth access tokens
2. send consumer requests through `controller.remote-only`
3. inspect recorded routing decisions and confirm Kimi is present in alias candidate pools and can be selected for coding-oriented traffic while DeepSeek remains available for API-backed routing

## Recommendation

Treat remote health probes as execution-adjacent credential consumers, not as a separate simplified auth path. If execution refreshes OAuth on failure, probes that gate routable inventory must do the same.
