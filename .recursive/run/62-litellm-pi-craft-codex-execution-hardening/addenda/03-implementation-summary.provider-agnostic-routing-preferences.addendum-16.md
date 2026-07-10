Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `16`
Status: `LOCKED`
LockedAt: `2026-07-09T14:02:13Z`
LockHash: `198b2d85cab4478ce4e0c50fe49fff89c3db53a463795b7e027ebb521533c54e`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.provider-agnostic-routing-preferences.addendum-16.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.provider-agnostic-routing-preferences.addendum-16.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `/packages/pi-role-model/test/validate-agent-path.test.ts`
- `/scripts/validate-agent-path.ts`
- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.provider-agnostic-routing-preferences.addendum-16.md`
Scope note: This addendum removes provider-specific routing preference and policy narrowing. It does not remove provider-specific execution adapters after endpoint selection. It does not modify upstream Pi or Craft code.

# Addendum 16 Implementation Summary

## TODO

- [x] Add failing tests for provider-agnostic alias candidate preservation.
- [x] Add a source guard against reintroducing Codex-specific routing-pin helpers.
- [x] Remove Codex Subscription first-attempt hard pinning from the host bridge.
- [x] Remove `fallbackAllowEndpoints` as a Codex-pin fallback-pool mechanism.
- [x] Preserve endpoint metadata capability filtering.
- [x] Preserve native Codex Subscription execution after endpoint selection.
- [x] Update validator and Pi helper tests so they assert provider-agnostic eligibility, not a hard Codex winner.
- [x] Update docs, state, decisions, and durable memory to supersede the provider-specific routing preference.
- [x] Verify with rebuilt runtime, real Pi CLI requests, and real Craft client requests.

## Implemented Changes

`/role-model-router/apps/runtime-host-bridge/src/index.ts` no longer creates a provider-specific Codex Subscription routing preference for ordinary tool/code or non-text turns.

Removed routing-layer concepts:

- `shouldPreferOpenAICodexSubscriptionForTurn`
- `resolveOpenAICodexSubscriptionRoutingModel`
- `applyOpenAICodexSubscriptionInitialPin`
- `preferredCodexRoutingModel`
- `fallbackAllowEndpoints`

The host bridge now passes the provider-agnostic routing request forward after alias resolution, role policy, difficulty routing, controller routing, endpoint health, cooldown, and capability filters. `routeExecutionRequest()` applies only explicit deny endpoints on top of the existing routing request instead of using a Codex-specific fallback pool.

Provider-specific execution remains in place after endpoint selection:

- OpenAI Codex Subscription endpoints still execute through `codex-subscription-responses`.
- DeepSeek endpoints still execute through the configured OpenAI-compatible path.
- LiteLLM remains a vendor or execution path, not a provider.
- ai-sdk OpenAI-compatible remains an adapter path, not a provider.

## Test Implementation

`/role-model-router/apps/runtime-host-bridge/test/index.test.ts` now asserts that ordinary tool/code alias requests keep compatible endpoints in the candidate pool. The test uses the canonical `difficulty.remote-only` alias shape and expects both DeepSeek and OpenAI Codex Subscription endpoint IDs to remain in `routingRequest.allowEndpoints` when both declare the required capabilities.

The same file includes a source guard that fails if the removed provider-specific pin helpers or `fallbackAllowEndpoints` return.

`/packages/pi-role-model/test/validate-agent-path.test.ts` now validates provider-agnostic routing invariants instead of expecting Codex to win every hard/tool request. Text and function-tool alias cases require both compatible endpoint IDs to remain eligible; image cases can narrow by endpoint metadata because the mock LiteLLM endpoint does not declare `input.image`.

`/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` and `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` now accept either compatible execution family for hard/tool alias validation where the route is supposed to be score-driven. The assertions still verify provider/vendor/adapter identity based on the selected endpoint.

`/scripts/validate-agent-path.ts` now emits `eligibleEndpointIds` into the validation summary so addendum and live-runtime checks can prove candidate preservation without scraping large decision documents.

## Docs And Memory

Updated docs and durable memory record the corrected boundary:

- Routing eligibility and preference cannot be hardcoded by provider family.
- Provider-specific implementation belongs inside the adapter after endpoint selection.
- Benchmark performance, measured performance, endpoint metadata, request requirements, policy, health, cooldown, and explicit constraints drive routing.
- Advisory routing-model or controller guidance can influence scoring, but must not rewrite `allowEndpoints` unless it came from an explicit hard user/operator constraint.

Updated files:

- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`

## TDD Compliance

RED evidence:

- `evidence/logs/addendum-16/red/provider-agnostic-routing.red.log`

The RED run failed for the expected reasons:

- `difficulty.remote-only` ordinary tool/code mapping produced a Codex-only hard allow list.
- Source still contained Codex Subscription routing-pin helpers.

GREEN evidence:

- `evidence/logs/addendum-16/green/provider-agnostic-routing.green.log`
- `evidence/logs/addendum-16/green/alias-capability-routing.green.log`
- `evidence/logs/addendum-16/green/core-routing-intent.green.log`
- `evidence/logs/addendum-16/green/runtime-host-bridge-index.green.log`
- `evidence/logs/addendum-16/green/pi-validate-agent-path.green.log`
- `evidence/logs/addendum-16/green/validate-vendors.green.log`
- `evidence/logs/addendum-16/green/runtime-host-bridge-build.green.log`
- `evidence/logs/addendum-16/green/ci-check.green.log`

TDD Compliance: PASS

## Requirement Completion Status

- R0 | Status: implemented | Changed Files: host bridge routing plan, tests, docs, decisions, memory. | Scope Decision: provider-specific execution remains; provider-specific routing preference is removed. | Addendum: addendum-16.
- R1 | Status: implemented | Changed Files: host bridge request mapping and execution routing. | Scope Decision: shared request contract carries capabilities and policy, not provider preference. | Addendum: addendum-16.
- R2 | Status: implemented | Changed Files: no upstream Pi or Craft code changed. | Verification Evidence: real Pi CLI and real Craft headless requests after rebuild. | Addendum: addendum-16.
- R3 | Status: implemented | Changed Files: validator expectations and helper summary output. | Scope Decision: LiteLLM remains vendor/execution path, not provider. | Addendum: addendum-16.
- R4 | Status: implemented | Changed Files: Codex pre-selection pin removed; Codex adapter preserved. | Scope Decision: Codex executes when selected, not because it is privileged by routing. | Addendum: addendum-16.
- R8 | Status: implemented | Changed Files: validation summaries include eligible endpoint IDs. | Verification Evidence: router decisions and telemetry prove eligibility. | Addendum: addendum-16.
- R10 | Status: implemented | Verification Evidence: rebuilt runtime on `127.0.0.1:3456`, process isolation, Pi CLI logs, Craft logs, telemetry rows, and router decisions. | Addendum: addendum-16.
- R11 | Status: implemented | Verification Evidence: `corepack pnpm run ci:check` passed. | Addendum: addendum-16.
- R12 | Status: implemented | Changed Files: decisions, state, architecture docs, and routing memory supersede the old pinning rule. | Addendum: addendum-16.

## Worktree Diff Audit

- Product code changed only inside Role-Model runtime and repo-owned verification support.
- No upstream Pi AI code was modified.
- No upstream Craft code was modified.
- No new runtime alias was invented for verification.
- The implementation removes a Codex-specific routing shortcut rather than adding a DeepSeek-specific counter-preference.
- Existing addenda and evidence from earlier run-62 work remain in the worktree and are not normalized by this addendum.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: source trace, test RED/GREEN review, live Pi CLI verification, live Craft verification, process isolation check, and CI log review.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: no delegated action records were created.
- Repair Performed After Verification: validator and Pi helper expectations were updated after full CI exposed stale Codex-winner assumptions.

## Coverage Gate

- [x] Provider-specific routing pin removed.
- [x] Provider-specific execution adapters preserved after endpoint selection.
- [x] Strict RED evidence exists before production change.
- [x] GREEN targeted tests passed.
- [x] Full host-bridge index suite passed.
- [x] Full local CI passed.
- [x] Runtime packaged and relaunched.
- [x] Real Pi CLI alias requests passed.
- [x] Real Craft alias request passed.
- [x] Router decisions prove both compatible endpoints eligible.
- [x] Process isolation proves the rebuilt runtime owns `127.0.0.1:3456`.

Coverage: PASS

## Approval Gate

- [x] Implementation follows the addendum 16 plan.
- [x] Implementation is provider-agnostic and verifiable.
- [x] No consumer-specific runtime branches were introduced.
- [x] Current runtime on `:3456` is the rebuilt binary from this worktree.

Approval: PASS
