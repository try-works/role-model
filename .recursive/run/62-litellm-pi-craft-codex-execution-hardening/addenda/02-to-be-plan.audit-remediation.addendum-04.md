Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `04`
Status: `LOCKED`
LockedAt: `2026-07-08T12:02:28Z`
LockHash: `34a9591e624bf2b2e4322539ad5033fc240fb010d7a8e7405c8f35fcd09f684a`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03.5-code-review.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-02.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-03.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-02.md` (DRAFT)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.audit-remediation.addendum-01.md` (DRAFT)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-03-canonical-alias-rebuilt/`
- operator follow-up on `2026-07-08` clarifying that LiteLLM and `ai-sdk-openai` are execution-layer facts, not provider identity
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-04.md`
Scope note: This addendum corrects the effective remediation plan for run 62 after a semantic audit found that current telemetry, request-detail, validator, and QA receipts still classify execution adapters as if they were providers. It keeps addenda 02 and 03 in force for strict TDD and alias-routed rebuilt-runtime proof, but it redefines the identity contract that those proofs must satisfy.

## TODO

- [x] Re-read the locked requirements, locked Phase 3.5 review, and current plan addenda
- [x] Re-audit the current implementation and rebuilt-runtime evidence for provider versus vendor versus adapter semantics
- [x] Define the canonical identity contract that future telemetry, request-detail, validator, and UI work must implement
- [x] Reopen the invalid `R8`, `R9`, and `R10` verification claims from the current draft remediation receipts
- [x] Convert the correction into strict-TDD implementation slices with explicit RED and GREEN evidence paths
- [x] Make rebuilt-runtime alias verification prove provider identity separately from vendor and adapter identity
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: `R3`, `R4`, `R8`, `R9`, `R10`, and `R11` are the governing requirements for this semantic correction because they define LiteLLM ownership boundaries, Codex-native behavior, telemetry/request-detail facts, corpus truth, and rebuilt-runtime verification.
- `03.5-code-review.md`: the locked review already leaves `R8`, `R9`, `R10`, and `R11` open because proof quality and telemetry truth were insufficient; this addendum tightens the semantic contract that those later phases must satisfy.
- `02-to-be-plan.audit-remediation.addendum-02.md`: remains authoritative for strict TDD and rebuilt-runtime hard gates.
- `02-to-be-plan.audit-remediation.addendum-03.md`: remains authoritative for the rule that Pi and Craft routing proof must call runtime aliases such as `difficulty.remote-only`, not invented aliases or direct targets.
- `03-implementation-summary.audit-remediation.addendum-02.md`: useful as evidence of the current state, but its `R8` and `R10` verification claims are semantically invalid because they treat `providerFamily` as the selected adapter path.
- `05-manual-qa.audit-remediation.addendum-01.md`: useful as evidence of the current alias-routed receipt set, but its proof matrix still labels adapter families as provider families.
- `packages/pi-role-model/src/runtime-inspection.ts`: Pi inspection currently keys on `providerId` and does not require `providerFamily`, `adapterFamily`, or `vendorId`, which makes additive compatibility feasible.
- `role-model-router/packages/vendor-litellm/src/index.ts`: the LiteLLM execution path already knows `vendorId: "litellm"` at execution time, so the primary gap is persistence and presentation rather than vendor discovery.

## Earlier Phase Reconciliation

The earlier addenda established three correct rules that still stand:

1. strict TDD is mandatory
2. authoritative rebuilt-runtime proof must use actual Pi and Craft emitter paths
3. routing proof must call runtime aliases such as `difficulty.remote-only`

This addendum changes the semantic acceptance criteria for those same proofs:

- a receipt is no longer acceptable merely because `providerFamily` matches the selected execution adapter
- a receipt is acceptable only when provider identity, vendor identity, execution family, and adapter family are distinct and truthful
- any future proof that still records `providerFamily: "litellm-proxy"` or `providerFamily: "ai-sdk-openai"` for a remote provider request fails this plan

## Problem Statement

The current implementation still collapses four different concepts into one misleading field:

- actual provider identity such as `openai` or `deepseek`
- optional intermediary vendor identity such as `litellm`
- high-level execution path such as `vendor-litellm` or `remote-service`
- adapter implementation such as `litellm-proxy`, `ai-sdk-openai`, or `ai-sdk-openai-compatible`

That collapse appears in the current code and receipts:

- `role-model-router/packages/adapter-execution/src/index.ts` writes response-capture `providerFamily` from `target.adapterFamily`
- `role-model-router/packages/runtime-observability/src/index.ts` persists `executionTelemetry.providerFamily` from `input.execution.normalized.providerFamily`
- `role-model-router/packages/sqlite-memory/src/index.ts` stores and replays that value through `provider_family`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` and `app/lib/view-models.ts` render that adapter label as provider-facing identity
- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts` synthesizes fallback `vendorId` from `providerFamily`, which repeats the same semantic bug

The rebuilt-runtime evidence under `evidence/runtime/addendum-03-canonical-alias-rebuilt/` proves the mismatch:

- alias-routed OpenAI Codex cases show `providerId: "openai"` but `providerFamily: "ai-sdk-openai"`
- alias-routed LiteLLM-backed text cases show `providerId: "openai"` but `providerFamily: "litellm-proxy"`
- prior direct DeepSeek evidence shows `providerId: "deepseek"` but `providerFamily: "ai-sdk-openai-compatible"`

Those receipts are not provider truth. They are adapter truth mislabeled as provider truth.

## Canonical Identity Contract

The effective contract for this run is now:

1. `providerId`
   - canonical actual provider identity
   - examples: `openai`, `deepseek`, `anthropic`
   - does not change when execution goes through LiteLLM or a direct adapter

2. `providerAccountId`
   - canonical configured account identity for the actual provider
   - remains the join key for account-scoped credentials and endpoint ownership

3. `providerFamily`
   - provider semantic family, not execution adapter family
   - for the current runtime this should default to the same durable value as `providerId` unless the runtime explicitly owns a broader provider-family taxonomy
   - must never be populated with adapter values such as `litellm-proxy`, `ai-sdk-openai`, or `ai-sdk-openai-compatible`

4. `vendorId`
   - optional intermediary managed service or execution vendor
   - examples: `litellm`
   - null or absent for direct provider execution paths such as native Codex Subscription

5. `executionFamily`
   - high-level routed execution path
   - examples: `vendor-litellm`, `remote-service`, `local-runtime`

6. `adapterFamily`
   - concrete adapter implementation used to shape and execute the provider request
   - examples: `litellm-proxy`, `ai-sdk-openai`, `ai-sdk-openai-compatible`

7. presentation rule
   - request-detail, runtime-ui, validator corpus, and rebuilt-runtime summaries must show provider, vendor, execution, and adapter as separate facts
   - no UI label, summary row, or test fixture may imply that LiteLLM or `ai-sdk-openai` is the provider

## Migration And Compatibility Rules

This plan preserves compatibility while correcting semantics:

1. The existing `providerFamily` field remains in the contract for now because `R8` and `R9` explicitly require it.
2. New writes must populate `providerFamily` from provider semantics, not adapter semantics.
3. The telemetry and request-detail contract must add durable `vendorId` wherever execution already knows it.
4. Old rows that predate the correction may retain legacy `provider_family` values in storage, but new readers must not prefer those legacy adapter labels over `providerId` when presenting provider identity.
5. Pi inspection compatibility remains backward compatible because Pi currently consumes `providerId`; additive parsing for `vendorId`, `executionFamily`, and `adapterFamily` is allowed but not required to preserve compatibility.
6. No migration may infer a fake `vendorId` from `providerFamily`. If a historical row does not have deterministic vendor evidence, `vendorId` stays null.

## Plan Delta From Earlier Addenda

Addenda 02 and 03 remain in force. This addendum adds four new implementation slices and reopens the semantic closeout burden for the current draft remediation receipts.

Effective change:

- `R8` is reopened until telemetry, request-detail, and UI prove the corrected provider/vendor split
- `R9` is reopened until the validator corpus and Pi/Craft proof fixtures stop asserting adapter labels as provider truth
- `R10` is reopened until rebuilt-runtime alias proof shows the corrected fields in raw per-request receipts
- `R11` remains open until the same corrected proof and CI both pass

## Strict TDD Execution Contract

TDD Mode: `strict`

The Iron Law remains absolute:

- no production TypeScript change before a failing test
- no SQLite migration change before a failing persistence or read-compatibility test
- no request-detail or runtime-ui display change before a failing view-model or route test
- no rebuilt-runtime verification-helper change before a failing harness assertion

Every slice below must record focused RED and GREEN logs under:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-04/`

## Implementation Slices

### SP62-L — Canonical Provider, Vendor, Execution, And Adapter Separation

**RED-first targets**

- failing `adapter-execution` tests proving provider-backed requests must not emit adapter values in provider fields
- failing `runtime-observability` tests proving `executionTelemetry.providerFamily` must equal provider semantics rather than adapter semantics
- failing `runtime-host-bridge` tests proving native Codex requests keep `providerId/providerFamily = openai`, `vendorId = codex-app-server`, `executionFamily = remote-service`, and `adapterFamily = ai-sdk-openai`
- failing tests proving LiteLLM-backed requests keep actual provider identity while carrying `vendorId = litellm`

**GREEN target**

- carry distinct provider, vendor, execution, and adapter facts through routed execution normalization without conflation

**Primary files**

- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/adapter-execution/test/index.test.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

**Evidence**

- RED: `evidence/logs/addendum-04/sp62-l-provider-vendor-contract.red.log`
- GREEN: `evidence/logs/addendum-04/sp62-l-provider-vendor-contract.green.log`

### SP62-M — Durable Telemetry, SQLite, And Runtime-UI Contract Migration

**RED-first targets**

- failing `sqlite-memory` tests proving new rows persist `vendorId` and corrected `providerFamily` while old rows remain readable
- failing request-ledger and telemetry-query tests proving provider-facing filters no longer classify adapter families as providers
- failing `runtime-ui` `view-models` and `runtime-api` tests proving provider labels derive from real provider semantics and vendor or adapter details render separately
- failing request-detail tests proving the UI no longer titles an adapter label as the provider family fact

**GREEN target**

- persist the corrected fields through `runtime_telemetry_records`, observation/request-detail surfaces, and runtime-ui models without breaking existing request-ledger or Pi-inspection compatibility

**Primary files**

- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`

**Evidence**

- RED: `evidence/logs/addendum-04/sp62-m-telemetry-ui-migration.red.log`
- GREEN: `evidence/logs/addendum-04/sp62-m-telemetry-ui-migration.green.log`

### SP62-N — Validator, Pi Compatibility, Corpus, And Docs Realignment

**RED-first targets**

- failing `validate-vendors` assertions that currently expect `providerFamily` to equal adapter labels
- failing `validate-agent-path` assertions that currently treat `litellm-proxy` or `ai-sdk-openai` as provider-family truth
- failing Pi inspection compatibility assertions if any request-list or request-detail changes regress the existing `providerId`-based contract
- failing documentation or fixture assertions proving the current docs still describe LiteLLM as a provider/runtime layer rather than a vendor/execution layer

**GREEN target**

- align repo-owned validator corpus, Pi proof fixtures, compatibility helpers, and architecture docs to the corrected contract without inventing new aliases or provider taxonomies

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `packages/pi-role-model/src/runtime-inspection.ts`
- `packages/pi-role-model/test/validate-agent-path.test.ts`
- `docs/architecture/13-litellm-pi-role-model-integration-proposal.md`
- `docs/architecture/14-routed-execution-semantics-and-receipts.md`

**Evidence**

- RED: `evidence/logs/addendum-04/sp62-n-validator-pi-docs.red.log`
- GREEN: `evidence/logs/addendum-04/sp62-n-validator-pi-docs.green.log`

### SP62-O — Alias-Routed Rebuilt-Runtime Provider/Vendor Proof

**RED-first targets**

- failing rebuilt-runtime harness assertions that reject alias-routed receipts where `providerFamily` equals a known adapter family
- failing assertions that LiteLLM-backed alias cases must emit `vendorId = litellm`
- failing assertions that native Codex alias cases must emit `vendorId = codex-app-server` and keep provider identity as `openai`
- failing summary assertions that do not expose provider, vendor, execution family, and adapter family separately per request

**GREEN target**

- rebuilt-runtime Pi and Craft alias requests produce raw per-request receipts and summary rows that prove routing, provider identity, vendor identity, and adapter identity separately

**Primary files**

- `scripts/validate-agent-path.ts`
- `packages/pi-role-model/test/validate-agent-path.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- repo-owned rebuilt-runtime verification helpers under `scripts/` as required

**Evidence**

- RED: `evidence/logs/addendum-04/sp62-o-live-provider-vendor-proof.red.log`
- GREEN: `evidence/logs/addendum-04/sp62-o-live-provider-vendor-proof.green.log`

## Phase 4 Verification Floor

Run from `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening`.

Focused commands:

- `corepack pnpm --filter @role-model-router/adapter-execution exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/validate-vendors.test.ts test/alias-capability-routing.test.ts test/openai-codex-subscription-matrix.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/lib/view-models.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/validate-agent-path.test.ts`

Broader validation after focused suites:

- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-packaging`

Aggregate evidence:

- `evidence/logs/addendum-04/phase4-provider-vendor-floor.green.log`

Pass criteria:

- no deterministic test treats LiteLLM or `ai-sdk-openai` as the provider
- `vendorId` persists where execution already knows it
- request-detail and telemetry APIs expose provider, vendor, execution, and adapter facts distinctly
- Pi request inspection remains backward compatible on `providerId`

## Phase 5 Rebuilt-Runtime Verification Matrix

All authoritative routing proof must use protocol or runtime aliases already defined by the system. `difficulty.remote-only` remains the required alias for the canonical mixed-family proof where it is applicable. No invented aliases are allowed.

The rebuilt runtime must be launched from the run-62 worktree against isolated temp state, and all proof receipts for this addendum must live under:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-04-provider-vendor-semantics-rebuilt/`

| ID | Scenario | Required path | Pass criteria | Required evidence |
| --- | --- | --- | --- | --- |
| `Q-C1` | Pi alias-routed easy text request on `difficulty.remote-only` | actual `@try-works/pi-role-model` path | receipt shows the actual selected provider in `providerId` and `providerFamily`; if the selected endpoint is LiteLLM-backed then `vendorId = litellm`, `executionFamily = vendor-litellm`, and `adapterFamily = litellm-proxy` | request + response + request-detail + telemetry-row + router-decision + endpoint-profile |
| `Q-C2` | Craft alias-routed easy text request on `difficulty.remote-only` | repo-owned Craft path | same semantic separation as `Q-C1` using the Craft emitter path | request + response + request-detail + telemetry-row + router-decision + endpoint-profile |
| `Q-C3` | Pi alias-routed tool-bearing or image-bearing request on `difficulty.remote-only` | actual Pi path | receipt keeps `providerId/providerFamily = openai`, `vendorId = codex-app-server`, `executionFamily = remote-service`, and `adapterFamily = ai-sdk-openai` for native Codex selection | request + response + request-detail + telemetry-row + router-decision + endpoint-profile |
| `Q-C4` | Craft alias-routed declared-tools or inline-image request on `difficulty.remote-only` | repo-owned Craft path | same semantic separation as `Q-C3` using the Craft emitter path | request + response + request-detail + telemetry-row + router-decision + endpoint-profile |
| `Q-C5` | Alias-routed non-OpenAI provider proof | Pi or Craft path calling an existing runtime alias that can legitimately route to a non-OpenAI provider | preferred provider is `deepseek`; pass only if the receipt shows actual provider identity in `providerId/providerFamily` while keeping any LiteLLM intermediary in `vendorId` and any OpenAI-compatible shim in `adapterFamily` | request + response + request-detail + telemetry-row + router-decision + endpoint-profile |

### Rebuilt-Runtime Summary Rules

- the summary must list provider, vendor, execution family, and adapter family as separate fields
- any authoritative case with `providerFamily` equal to `litellm-proxy`, `ai-sdk-openai`, or `ai-sdk-openai-compatible` fails
- direct-target requests may still be collected as supplemental diagnostics, but they must not be used as the primary closeout proof for this addendum
- if the active runtime catalog does not expose a non-OpenAI alias for `Q-C5`, the summary must record that environment limitation explicitly and keep non-OpenAI live-proof closure open rather than fabricating coverage

## Requirement Completion Status

| Requirement | Current status after this addendum | Rationale | Addendum |
| --- | --- | --- | --- |
| `R3` | planned | LiteLLM remains the vendor/execution layer for broad provider translation, but its identity must be recorded as `vendorId`, not as the provider | `02-to-be-plan.audit-remediation.addendum-04.md` |
| `R4` | planned | Codex-native OpenAI execution must stay provider-true while still exposing its adapter path | `02-to-be-plan.audit-remediation.addendum-04.md` |
| `R8` | reopened | current receipts still mislabel adapter truth as provider truth | `02-to-be-plan.audit-remediation.addendum-04.md` |
| `R9` | reopened | validator corpus and Pi/Craft proof fixtures still assert the wrong provider-family semantics | `02-to-be-plan.audit-remediation.addendum-04.md` |
| `R10` | reopened | current rebuilt-runtime alias proof is structurally useful but semantically invalid on provider identity | `02-to-be-plan.audit-remediation.addendum-04.md` |
| `R11` | open | CI and non-targeted provider safety cannot be trusted until the corrected contract lands and validates | `02-to-be-plan.audit-remediation.addendum-04.md` |

## Out Of Scope

- inventing new runtime aliases for proof convenience
- redefining `adapterFamily` or `executionFamily` away from their existing meanings
- backfilling historical rows with guessed `vendorId` values when deterministic evidence is absent
- broad provider onboarding unrelated to the provider/vendor contract correction
- treating direct-target requests as a substitute for alias-routed rebuilt-runtime proof

## Coverage Gate

- [x] The addendum corrects the provider versus vendor versus adapter contract explicitly
- [x] The addendum preserves addenda 02 and 03 while tightening the semantic acceptance criteria
- [x] Strict RED and GREEN evidence is defined for each new remediation slice
- [x] Rebuilt-runtime alias verification now requires provider and vendor truth, not only routing success
- [x] The addendum reopens invalid draft `R8`, `R9`, and `R10` verification claims without editing locked history

Coverage: PASS

## Approval Gate

- [x] The canonical identity contract is specific enough to implement and audit
- [x] The TDD plan is explicit enough to enforce a real RED-first remediation pass
- [x] The rebuilt-runtime verification burden is specific enough to reject false provider classification
- [x] The addendum remains compatible with the locked requirements and earlier alias-proof rule

Approval: PASS

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `multi-agent tools remain available, but this turn required direct run-local planning rather than delegated implementation or review`
- Delegation Decision Basis: `the user requested a corrective addenda plan, and the necessary evidence was already present in the local run artifacts and code`
- Delegation Override Reason: `no delegated planning or review was requested for this turn`
- Audit Inputs Provided:
  - `00-requirements.md`
  - `02-to-be-plan.md`
  - `03.5-code-review.md`
  - `addenda/02-to-be-plan.audit-remediation.addendum-02.md`
  - `addenda/02-to-be-plan.audit-remediation.addendum-03.md`
  - `addenda/03-implementation-summary.audit-remediation.addendum-02.md`
  - `addenda/05-manual-qa.audit-remediation.addendum-01.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the locked requirements and current plan addenda, inspected the current Role Model, Pi, and LiteLLM integration surfaces, and reconciled the rebuilt-runtime evidence against the corrected provider/vendor contract
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-04.md`

Audit: PASS
