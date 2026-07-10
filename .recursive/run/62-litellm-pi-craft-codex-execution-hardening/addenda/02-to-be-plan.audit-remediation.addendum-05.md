Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `05`
Status: `LOCKED`
LockedAt: `2026-07-08T12:02:29Z`
LockHash: `f80b440b78af78612d1c7f2d3814e7fb2ed3eeae500561216bb9856fb0cf05b2`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-02.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-03.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-04.md` (DRAFT)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-04.md` (DRAFT)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.audit-remediation.addendum-02.md` (DRAFT)
- live rebuilt-runtime investigation on `2026-07-08` against `http://127.0.0.1:3456`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-05.md`
Scope note: This addendum corrects the remediation plan after a live rebuilt-runtime audit exposed two post-implementation blind spots: exact GPT targets can be quarantined by execution-failure cooldowns without preserving or surfacing the failed upstream attempt clearly enough, and alias-routed Pi/Craft streaming requests can inherit DeepSeek reasoning-first deltas that leave downstream clients appearing stuck.

## TODO

- [x] Re-read the locked requirements, root-cause artifact, and current remediation addenda
- [x] Reduce the new live defects to requirement-level plan deltas instead of ad hoc runtime tweaks
- [x] Reopen the affected verification claims from the current draft remediation artifacts
- [x] Define strict-TDD implementation slices for cooldown provenance, cooldown diagnostics, streaming normalization, and rebuilt-runtime proof
- [x] Update the rebuilt-runtime verification matrix so Pi and Craft alias requests cover streamed as well as non-streamed paths
- [x] Keep the provider/vendor addendum intact while adding a separate plan for the new live defects
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`:
  - `R6` governs retry, reroute, cooldown, and side-effect-aware recovery semantics.
  - `R8` governs canonical tracing and request-detail diagnosability.
  - `R9` governs durable corpus coverage.
  - `R10` governs rebuilt-runtime Pi/Craft verification.
  - `R11` governs local and CI trust before closeout.
- `01.5-root-cause.md`:
  - `RC4`, `RC5`, and `RC6` remain the active failure families for the new live findings because the defects are still at the continuation, observability, and verification boundaries rather than in provider identity.
- `02-to-be-plan.audit-remediation.addendum-04.md`:
  - remains authoritative for provider versus vendor versus adapter semantics.
  - does not yet cover cooldown provenance or reasoning-first stream compatibility.
- `03-implementation-summary.audit-remediation.addendum-04.md`:
  - documents the provider/vendor correction, but does not preserve the failing upstream attempt that triggered cooldown nor prove streamed alias behavior.
- `05-manual-qa.audit-remediation.addendum-02.md`:
  - remains authoritative for the corrected provider/vendor alias proof.
  - did not exercise reasoning-first stream startup or exact-model cooldown diagnostics.

## Earlier Phase Reconciliation

Earlier addenda stay in force:

1. strict TDD is still mandatory
2. authoritative Pi/Craft routing proof must use existing runtime aliases such as `difficulty.remote-only`
3. provider identity, vendor identity, execution family, and adapter family must remain distinct

This addendum adds two new acceptance burdens on top of those rules:

1. if a retryable upstream failure triggers cooldown, the runtime must persist and surface the failed attempt clearly enough that operators can explain why an exact model is temporarily unavailable
2. if a routed alias stream selects a provider that emits provider-private reasoning deltas before text content, the runtime must not expose only that provider-private stream contract to Pi/Craft

## Problem Statement

The live rebuilt-runtime audit on `2026-07-08` exposed three linked issues:

### 1. Cooldown provenance is persisted too weakly

- exact `chatgpt/gpt-5.4` requests returned `503 no_eligible_target` even though `/v1/models` and `/api/role-model/endpoints` still exposed the endpoint as healthy and active
- runtime SQLite maintenance state held:
  - `maintenance_key = routing.execution-failure-cooldowns.v1`
  - endpoint `openai.personal.openai-codex-subscription.global.gpt-5.4`
  - `failureCount = 2`
  - `lastErrorClass = upstream_error`
- the canonical telemetry surfaces preserved:
  - later pre-execution denials
  - the successful rerouted DeepSeek request
- the canonical telemetry surfaces did not preserve:
  - the actual failed upstream OpenAI attempt
  - the redacted upstream failure body or summary
  - the exact attempt-level cooldown decision that created the quarantine

### 2. Operator-facing health and eligibility truth diverge

- endpoint health still reported `healthy`
- exact-model routing could still be denied by active cooldown
- the current runtime does not expose that cooldown as a first-class operator-visible state on the same surfaces used for model discovery and request diagnosis

### 3. Reasoning-first alias streams are not downstream-safe enough

- alias-routed `difficulty.remote-only` streaming can select DeepSeek
- DeepSeek can emit early SSE chunks with:
  - `delta.reasoning_content`
  - `delta.content = null`
- Pi can remain on `Working...` because the runtime forwards provider-private reasoning-first deltas before any downstream-safe content signal is guaranteed
- the current manual QA proof covered alias routing and provider/vendor truth, but it did not prove safe streamed startup behavior for Pi or Craft on a reasoning-first provider path

## Canonical Remediation Goals

1. preserve every retryable upstream failure that materially affects routing, even if the request later succeeds on another endpoint
2. surface active execution cooldown as distinct operator truth rather than making operators infer it from SQLite state
3. guarantee that Pi/Craft alias-routed streaming requests receive a downstream-safe stream contract
4. expand deterministic and rebuilt-runtime proof so these failure families cannot regress silently

## Plan Delta From Earlier Addenda

Addenda 02, 03, and 04 remain in force. This addendum adds four new remediation slices and reopens the affected requirement claims:

- `R6` is reopened until cooldown-triggering failed attempts are preserved with enough structured provenance to support replay, reroute, and side-effect reasoning
- `R8` is reopened until cooldown truth and reasoning-first stream behavior are visible through canonical telemetry or request-detail surfaces
- `R9` is reopened until the deterministic corpus includes cooldown-provenance and reasoning-first stream cases
- `R10` is reopened until rebuilt-runtime Pi/Craft proof covers streamed alias behavior and exact-model cooldown diagnostics
- `R11` remains open until the corrected proof and validation floor pass

## Strict TDD Execution Contract

TDD Mode: `strict`

No production code may be written before the corresponding failing test has been run and recorded.

All RED and GREEN logs for this addendum must be written under:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-05/`

## Implementation Slices

### SP62-P - Failed-attempt and cooldown receipt persistence

**RED-first targets**

- failing `runtime-host-bridge`, `runtime-observability`, and `sqlite-memory` tests proving that a retryable upstream failure is persisted even when the final request reroutes and succeeds
- failing tests proving the failed-attempt receipt records at minimum:
  - `requestId`
  - `routingDecisionId`
  - `routedAttemptId`
  - `failedEndpointId`
  - `providerId`
  - `providerFamily`
  - `vendorId`
  - `executionFamily`
  - `adapterFamily`
  - `statusCode`
  - `failureClass`
  - `retryable`
  - `fallbackEligible`
  - `failurePhase`
  - `cooldownRecorded`
  - `cooldownFailureCount`
  - `cooldownUntilMs`
  - redacted upstream error summary or safe preview metadata
- failing tests proving pre-execution denials caused by active cooldown can point back to structured cooldown provenance rather than only returning opaque `no_eligible_target`

**GREEN target**

- preserve failed upstream attempts and cooldown provenance in the canonical observation/telemetry path without logging full sensitive provider bodies or secrets

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`

**Evidence**

- RED: `evidence/logs/addendum-05/sp62-p-cooldown-receipts.red.log`
- GREEN: `evidence/logs/addendum-05/sp62-p-cooldown-receipts.green.log`

### SP62-Q - Cooldown diagnostics and operator-visible endpoint truth

**RED-first targets**

- failing endpoint/discovery/request-detail tests proving an endpoint can be `healthStatus = healthy` while also carrying additive `executionCooldown` truth
- failing tests proving exact `chatgpt/gpt-5.4` temporary denial exposes:
  - denied endpoint id
  - active cooldown state
  - cooldown reason or failure class
  - cooldown expiry metadata
- failing runtime-ui or request-detail tests proving provider health must not be presented as if it implies current exact-model eligibility when cooldown is active

**GREEN target**

- surface active execution cooldown as first-class operator truth on the canonical endpoint and request-detail surfaces without redefining base health status

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`

**Evidence**

- RED: `evidence/logs/addendum-05/sp62-q-cooldown-diagnostics.red.log`
- GREEN: `evidence/logs/addendum-05/sp62-q-cooldown-diagnostics.green.log`

### SP62-R - Reasoning-first stream normalization or compatibility gating

**RED-first targets**

- failing `provider-openai` or `runtime-host-bridge` tests using a reasoning-first DeepSeek stream fixture where early chunks contain only `reasoning_content` and `content = null`
- failing Pi/Craft alias-path tests proving `difficulty.remote-only` streamed requests must not expose only provider-private reasoning deltas as the downstream-visible stream contract
- failing tests proving the runtime must either:
  - buffer provider-private reasoning-only chunks until it can emit the first downstream-safe assistant delta, or
  - normalize the early stream into a downstream-safe progress/content contract, or
  - mark the endpoint family ineligible for that streamed alias request if safe normalization is impossible

**GREEN target**

- Pi/Craft alias-routed streamed requests receive a downstream-safe startup contract while provider-private reasoning remains available only as additive observation/debug context

**Primary files**

- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `packages/pi-role-model/test/validate-agent-path.test.ts`

**Evidence**

- RED: `evidence/logs/addendum-05/sp62-r-stream-normalization.red.log`
- GREEN: `evidence/logs/addendum-05/sp62-r-stream-normalization.green.log`

### SP62-S - Corpus and rebuilt-runtime proof realignment

**RED-first targets**

- failing deterministic harness assertions for:
  - exact `chatgpt/gpt-5.4` temporary-unavailable cooldown diagnostics
  - Pi alias streamed text request on `difficulty.remote-only`
  - Craft alias streamed text request on `difficulty.remote-only`
  - rerouted success preserving both the failed-attempt receipt and the successful-attempt receipt
- failing rebuilt-runtime summary assertions that do not report:
  - stream startup mode
  - first downstream-safe content or progress status
  - cooldown state when present
  - provider/vendor/execution/adapter identity separately

**GREEN target**

- deterministic and live rebuilt-runtime proof cover both cooldown provenance and reasoning-first streamed alias behavior without inventing new aliases or using only direct-target fallbacks

**Primary files**

- `scripts/validate-agent-path.ts`
- `packages/pi-role-model/test/validate-agent-path.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `role-model-router/scripts/probe-downstream-ingress.py`

**Evidence**

- RED: `evidence/logs/addendum-05/sp62-s-rebuilt-proof.red.log`
- GREEN: `evidence/logs/addendum-05/sp62-s-rebuilt-proof.green.log`

## Phase 4 Verification Floor

Run from `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening`.

Focused commands:

- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/validate-vendors.test.ts test/openai-codex-subscription-matrix.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/view-models.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/validate-agent-path.test.ts`

Broader validation after focused suites:

- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-packaging`

Aggregate evidence:

- `evidence/logs/addendum-05/phase4-cooldown-stream-floor.green.log`

Pass criteria:

- retryable failed attempts are preserved even when fallback succeeds
- operator-facing request/endpoint surfaces expose active cooldown truth separately from base health
- Pi/Craft alias stream tests cannot pass if the runtime forwards only provider-private reasoning deltas
- provider/vendor/execution/adapter truth from addendum 04 remains intact

## Phase 5 Rebuilt-Runtime Verification Matrix

All authoritative routing proof must use existing runtime aliases. `difficulty.remote-only` remains the canonical alias for mixed-family proof.

The rebuilt runtime must be launched from the run-62 worktree against isolated state, and all proof receipts for this addendum must live under:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-05-cooldown-stream-rebuilt/`

| ID | Scenario | Required path | Pass criteria | Required evidence |
| --- | --- | --- | --- | --- |
| `Q-D1` | Exact GPT healthy path | direct exact model `chatgpt/gpt-5.4` against rebuilt runtime after clean state | request returns `200`; provider identity remains `openai`; no stale cooldown metadata remains active | request + response + request-detail + telemetry-row |
| `Q-D2` | Exact GPT temporary-unavailable cooldown path | seeded or induced retryable failure against rebuilt runtime | exact `chatgpt/gpt-5.4` denial exposes active cooldown facts and links to preserved failed-attempt provenance | request + response + request-detail + telemetry-row + endpoint snapshot |
| `Q-D3` | Pi alias streamed text request | actual `@try-works/pi-role-model` path calling `difficulty.remote-only` with `stream: true` | if a reasoning-first provider is selected, downstream receives a safe startup contract and terminal completion without indefinite `Working...` behavior | request + streamed response capture + request-detail + telemetry-row + endpoint-profile |
| `Q-D4` | Craft alias streamed text request | repo-owned Craft payload path calling `difficulty.remote-only` with `stream: true` | same pass criteria as `Q-D3` for the Craft emitter path | request + streamed response capture + request-detail + telemetry-row + endpoint-profile |
| `Q-D5` | Alias reroute with preserved failed-attempt receipt | Pi or Craft alias request on `difficulty.remote-only` under a controlled retryable-failure scenario | final success receipt and failed-attempt receipt both exist, and cooldown state is operator-visible | request + response + request-detail + telemetry-row + failed-attempt receipt + router-decision |

### Rebuilt-Runtime Summary Rules

- the summary must list provider, vendor, execution family, adapter family, stream startup status, and cooldown state separately
- any authoritative streamed case that forwards only provider-private reasoning deltas without a downstream-safe startup contract fails
- any exact-model denial that cannot show preserved cooldown provenance fails
- direct-target requests may still be collected as supplemental diagnostics, but alias-routed Pi/Craft proof remains the primary closeout surface

## Requirement Completion Status

| Requirement | Current status after this addendum | Rationale | Addendum |
| --- | --- | --- | --- |
| `R6` | reopened | current cooldown behavior can quarantine exact GPT endpoints without preserving the failed upstream attempt clearly enough for safe operator reasoning | `02-to-be-plan.audit-remediation.addendum-05.md` |
| `R8` | reopened | canonical telemetry/request-detail surfaces do not yet explain cooldown-triggered denials or reasoning-first stream startup clearly enough | `02-to-be-plan.audit-remediation.addendum-05.md` |
| `R9` | reopened | the deterministic corpus does not yet cover cooldown provenance or reasoning-first alias stream cases | `02-to-be-plan.audit-remediation.addendum-05.md` |
| `R10` | reopened | current rebuilt-runtime proof does not yet prove safe streamed alias startup or exact-model cooldown diagnosability | `02-to-be-plan.audit-remediation.addendum-05.md` |
| `R11` | open | local trust improved, but implementation and validation are incomplete until the new proof floor passes | `02-to-be-plan.audit-remediation.addendum-05.md` |

## Out Of Scope

- patching Pi upstream or Craft upstream
- inventing new runtime aliases for proof convenience
- disabling cooldowns purely to make exact GPT routing appear healthy
- dumping raw upstream error bodies, tokens, or secret headers into telemetry
- reworking the provider/vendor contract already handled by addendum 04

## Coverage Gate

- [x] The addendum isolates the new live defects from the earlier provider/vendor remediation work
- [x] The addendum reopens the affected requirements explicitly instead of silently relying on invalid proof
- [x] Strict RED and GREEN evidence is defined for cooldown provenance, cooldown diagnostics, streaming normalization, and rebuilt-runtime proof
- [x] The rebuilt-runtime matrix now covers exact-model cooldown truth and streamed alias startup behavior
- [x] The plan preserves the existing alias, provider/vendor, and strict-TDD rules from earlier addenda

Coverage: PASS

## Approval Gate

- [x] The remediation slices are specific enough to implement without inventing new requirements
- [x] The new verification matrix is specific enough to reject false-positive rebuilt-runtime proof
- [x] The addendum keeps the earlier provider/vendor plan intact while adding the missing cooldown and streaming work
- [x] The reopened requirements map directly to the live rebuilt-runtime defects observed on `2026-07-08`

Approval: PASS

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `multi-agent tools remain available, but this turn required a run-local corrective plan rather than delegated implementation or review`
- Delegation Decision Basis: `the user requested an addenda plan in the worktree run folder, and the necessary evidence was already present in the local runtime investigation plus existing recursive artifacts`
- Delegation Override Reason: `no delegated planning or review was requested for this turn`
- Audit Inputs Provided:
  - `00-requirements.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `addenda/02-to-be-plan.audit-remediation.addendum-02.md`
  - `addenda/02-to-be-plan.audit-remediation.addendum-03.md`
  - `addenda/02-to-be-plan.audit-remediation.addendum-04.md`
  - `addenda/03-implementation-summary.audit-remediation.addendum-04.md`
  - `addenda/05-manual-qa.audit-remediation.addendum-02.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the locked requirements and current remediation addenda, inspected the live rebuilt-runtime behavior on `127.0.0.1:3456`, and reduced the new defects to cooldown-provenance and streamed-alias compatibility plan deltas
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-05.md`

Audit: PASS
