Run: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-17T01:26:22Z`
LockHash: `24bb98abbf5c7269ad616ddf3cebcbfa298ccd9c46b340da1aa358a020dc548e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`
Outputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md`
Scope note: Record live Kimi OAuth-backed verification through the repo's runtime-host execution path for K3 and K2.7 on Friday, July 17, 2026.

## TODO

- [x] Declare the QA execution mode and live runtime-path evidence
- [x] Record the provider-surface and endpoint-activation setup used for the copied runtime state
- [x] Capture real K3 and K2.7 repo-path request results plus upstream wire-body readback
- [x] Record any supplemental direct-wire evidence that informed the compatibility repair
- [x] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `Codex desktop agent`
- Tools Used: `corepack pnpm exec tsx`, `createRuntimeBridgeBackend()` from the worktree runtime-host bridge, copied runtime-state root under `%TEMP%`, persisted local Kimi OAuth credential file, live Kimi Code HTTPS requests
- Verification Artifact:
  - `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/evidence/logs/green/sp5-runtime-bridge-kimi.log`
- Supplemental Contract-Discovery Artifact:
  - `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/evidence/logs/green/sp4-live-kimi-api.log`

## QA Scenarios and Results

### Scenario 1: The copied runtime sees `moonshot/kimi-k3` on the Kimi Code provider surface

- A copied runtime-state scope was created from `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-host-bridge` so the live proof would use real persisted OAuth material without mutating the active local runtime state.
- `createRuntimeBridgeBackend()` from the implementation worktree loaded that copied runtime state.
- `listProviders()` on the copied runtime returned Kimi Code variant models:
  - `moonshot/kimi-k2.5`
  - `moonshot/kimi-k2.6`
  - `moonshot/kimi-k2.7-code`
  - `moonshot/kimi-k3`

**Result:** PASS

### Scenario 2: The copied provider-account state was updated to enable K3 before activation

- The copied persisted account state predated K3 and originally allowed only `moonshot/kimi-k2.7-code`.
- For isolated QA, the copied `moonshot.personal.kimi-code` provider-account record was updated through the backend's normal `upsertProviderAccount()` mutation to add:
  - `allowedModels += moonshot/kimi-k3`
  - `modelRoleBindings += moonshot/kimi-k3`
- This was a copied-state QA setup step, not a product-source code change.

**Result:** PASS

### Scenario 3: The repo runtime path activates and executes canonical `moonshot/kimi-k3`

- `activateEndpoint()` created live endpoint `moonshot.personal.kimi-code.global.kimi-k3`.
- `executeChatCompletions()` then ran a real request through the worktree backend with:
  - canonical model id `moonshot/kimi-k3`
  - caller `temperature: 0.2`
  - `reasoning.effort: "max"`
- The live backend result was:
  - `model: "moonshot/kimi-k3"`
  - `endpointId: "moonshot.personal.kimi-code.global.kimi-k3"`
  - `outputText: "K3_RUNTIME_OK"`
  - `finishReason: "stop"`
- The captured upstream wire body sent by the repo path was:
  - `model: "k3"`
  - `reasoning_effort: "max"`
  - no `temperature`

**Result:** PASS

### Scenario 4: The repo runtime path preserves K2.7 upstream identity while omitting fixed temperature

- `executeChatCompletions()` then ran a real request through the same copied runtime with:
  - canonical model id `moonshot/kimi-k2.7-code`
  - caller `temperature: 0.1`
- The live backend result was:
  - `model: "moonshot/kimi-k2.7-code"`
  - `endpointId: "moonshot.personal.kimi-code.global.kimi-k2.7-code"`
  - `outputText: "K27_RUNTIME_OK"`
  - `finishReason: "stop"`
- The captured upstream wire body sent by the repo path was:
  - `model: "kimi-k2.7-code"`
  - no `temperature`

**Result:** PASS

### Scenario 5: Supplemental direct-wire contract discovery confirms why the broader Kimi fixed-temperature repair was required

- The direct Kimi endpoint discovery from Friday, July 17, 2026, remained useful for explaining the Phase 3 repair boundary:
  - `GET /coding/v1/models` returned live `k3`
  - live `k3` reported `context_length: 1048576`
  - live `k3` reported `think_efforts.valid_efforts: ["max"]`
  - direct K3 and K2.7 requests with caller-supplied non-default `temperature` were rejected upstream

This direct-wire proof is supplemental. The run's required repo-path verification is satisfied by Scenarios 1 through 4 above.

**Result:** PASS

## Evidence and Artifacts

- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/evidence/logs/green/sp5-runtime-bridge-kimi.log`
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/evidence/logs/green/sp4-live-kimi-api.log`
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`

## User Sign-Off

Not required (`agent-operated` QA).

## Traceability

- `R1`: provider-surface QA confirmed K3 is visible on the copied runtime's Kimi Code variant
- `R2`: provider-surface QA and copied-state enablement confirmed K3 uses the same Moonshot/Kimi account and endpoint family patterns
- `R3`: provider-surface QA confirmed no new provider id was needed; K3 appeared on the existing `moonshot` and `kimi-code` flow
- `R4`: live repo-path execution proved canonical `moonshot/kimi-k3` resolved upstream to `k3`
- `R5`: live repo-path execution proved K3 and K2.7 requests omitted caller-supplied fixed `temperature`
- `R6`: manual QA relied on the locked Phase 3 and Phase 4 strict-TDD evidence
- `R7`: live repo-path Kimi OAuth verification completed on Friday, July 17, 2026
- `R8`: the copied runtime proof exercised the shared Kimi request-policy seam rather than a one-off K3 path

## Coverage Gate

- [x] The repo-path Kimi runtime proof used the implementation worktree backend and real OAuth-backed HTTPS requests
- [x] The artifact records both canonical runtime outcomes and captured upstream wire-body facts
- [x] The copied-state K3 account-enablement step is documented explicitly instead of being hidden

Coverage: PASS

## Approval Gate

- [x] Phase 5 now satisfies the locked run requirement for live repo-path Kimi verification
- [x] The evidence is sufficient to update shared decisions, state, and memory

Approval: PASS
