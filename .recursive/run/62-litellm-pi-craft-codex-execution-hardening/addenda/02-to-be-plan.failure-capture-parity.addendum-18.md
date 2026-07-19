Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `18`
Status: `LOCKED`
LockedAt: `2026-07-10T02:12:23Z`
LockHash: `ca4b8ee14e4cab200f2c844a2de96df882cb99dac1792d17a8c40966569c9b73`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.provider-agnostic-routing-preferences.addendum-16.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-parameter-sanitization.addendum-17.md`
- Runtime code: `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- SQLite memory code: `/role-model-router/packages/sqlite-memory/src/index.ts`
- Runtime tests: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- SQLite memory tests: `/role-model-router/packages/sqlite-memory/test/index.test.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.failure-capture-parity.addendum-18.md`
Scope note: This addendum fixes the diagnostics gap where provider execution failures are persisted as sparse `routing.failed.pre-execution` telemetry even though the runtime knows the selected endpoint, provider, vendor, adapter, routing decision, and upstream error. It does not modify Pi, Craft, or provider-specific downstream consumer behavior.

# Addendum 18 Plan: Failure Capture Parity

## TODO

- [x] Record the observed failure mode from live telemetry.
- [x] Define provider-agnostic failure-capture requirements.
- [x] Define strict TDD coverage before production edits.
- [x] Define runtime implementation boundaries.
- [x] Define rebuilt-runtime verification, including live alias success after DeepSeek balance refill and induced failure inspection.

## Observed Failure Mode

Live run-62 telemetry showed several `difficulty.remote-only` rows as:

- endpoint: `routing.failed.pre-execution`
- status: `402`
- error class: `execution_failed`
- tokens: `0`
- selected endpoint: missing
- eligible endpoints: empty
- provider/vendor/adapter fields: missing
- request detail: telemetry-ledger fallback only

Manual inspection and a direct repro showed the actual upstream error was a DeepSeek provider execution failure:

- selected endpoint: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- provider: `deepseek`
- adapter family: `ai-sdk-openai-compatible`
- status: `402`
- upstream message: `Insufficient Balance`

The user confirmed the provider-account balance caused the immediate failures and has refilled the balance. The remaining product issue is observability: failures must be captured with the same routing and execution context as successes.

## Required Behavior

R18.1 Provider execution failures must not be persisted as anonymous pre-execution failures when the runtime has already selected an endpoint.

R18.2 Failure telemetry must preserve provider-agnostic identity fields:

- `endpointId`
- `modelId`
- `requestedModelId`
- `selectedModelId`
- `providerId`
- `providerFamily`
- `vendorId`
- `executionFamily`
- `adapterFamily`
- `providerAccountId` when known
- `endpointKind`
- `servingSource`
- `region`
- lifecycle and health state at request time

R18.3 Failure telemetry must preserve routing context:

- `routingDecisionId`
- eligible endpoint IDs
- eligible model IDs
- routing mode
- selected strategy
- role IDs
- cost snapshots when available
- selected endpoint and candidate count dimensions

R18.4 Failure telemetry must preserve execution semantics:

- source client surface
- payload byte measurements where available
- retry count
- reroute count
- cooldown decision
- failed-attempt receipts
- failure phase
- retryable/fallback-eligible flags
- sanitized error preview

R18.5 Failure request detail must be inspectable through the same request-detail API used for successful observations. If a full provider response body is unsafe or unavailable, the runtime must still persist a structured failure observation with redacted request/response captures and explicit observation-availability metadata.

R18.6 The failure path must remain provider-agnostic. It must work for DeepSeek, OpenAI/Codex Subscription, LiteLLM-executed providers, direct OpenAI-compatible providers, local providers, and future adapters through generic endpoint/provider/vendor/adapter metadata.

R18.7 `Insufficient Balance` and equivalent balance/credit wording must classify as `quota_exhausted` and fallback-eligible where another eligible endpoint exists. This is a generic billing/quota classification improvement, not a DeepSeek-specific rule.

R18.8 The outer Chat Completions catch path must not overwrite an already-persisted routed provider failure with a sparse `routing.failed.pre-execution` row.

## Implementation Plan

1. Extend the SQLite failure persistence API.

Add optional fields to `PersistRuntimeTelemetryFailureInput` for provider identity, routing context, execution semantics, payload sizes, snapshots, and a structured failure observation payload. Preserve current defaults for true pre-routing failures.

2. Persist failure observation rows.

When a structured failure observation is supplied, `persistRuntimeTelemetryFailure` must insert both:

- `runtime_telemetry_records`
- `runtime_observations`

It must not insert failed provider executions into observed-performance sample/profile tables as if they were successful latency/quality samples.

3. Capture routed provider failures inside `executeBridgePlan`.

When `executeCurrentExecutionRequest` throws an `UpstreamExecutionError` after routing:

- build failure telemetry from the current `routed` decision, execution snapshot, selected endpoint, plan, request options, and error
- persist it immediately with full metadata and structured failure observation
- mark the error as telemetry-persisted
- rethrow the original error response

4. Keep the outer failure path for true pre-routing failures.

`executeChatCompletions` should keep recording failures that occur before a selected endpoint exists, but it must skip errors already marked as persisted by the routed failure path.

5. Improve generic quota wording.

Extend quota/balance text matching so `Insufficient Balance` maps to `quota_exhausted` with fallback eligibility. This makes balance exhaustion behave like any other endpoint account/quota exhaustion when another endpoint is eligible.

## TDD Plan

Strict TDD applies.

RED 1: SQLite persistence parity.

Add a failing test in `/role-model-router/packages/sqlite-memory/test/index.test.ts` proving `persistRuntimeTelemetryFailure` can persist endpoint/provider/vendor/adapter/candidate fields and a failure observation row.

Expected RED failure before implementation:

- telemetry row lacks the new fields
- no `runtime_observations` row exists for the failure

GREEN 1: Extend `PersistRuntimeTelemetryFailureInput`, `toFailureRuntimeTelemetryRecord`, and insertion logic.

RED 2: Runtime routed provider failure capture.

Add a failing test in `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` with a single env-backed OpenAI-compatible provider endpoint returning a 402 balance/quota body. Assert:

- the thrown error remains an upstream provider error
- telemetry row uses the selected endpoint, not `routing.failed.pre-execution`
- provider/vendor/adapter/execution metadata is populated
- request detail is available and includes a structured failure observation

GREEN 2: Persist routed failure metadata inside `executeBridgePlan` and prevent sparse overwrite in the outer catch.

RED 3: Generic balance/quota classifier.

Add a failing test proving `Insufficient Balance` classifies as `quota_exhausted` and is fallback-eligible.

GREEN 3: Extend generic quota phrase matching.

## Verification Plan

Automated verification:

- Run the SQLite memory focused tests for failure persistence.
- Run the runtime-host focused tests for routed provider failure capture and quota classification.
- Run runtime critical tests if focused tests pass.
- Run TypeScript build for touched packages.

Live rebuilt-runtime verification:

- Rebuild/package the runtime after tests.
- Launch the rebuilt runtime on `127.0.0.1:3456`.
- Verify normal `difficulty.remote-only` alias routing succeeds now that DeepSeek balance is refilled.
- Induce a controlled generic provider failure without relying on user account depletion, preferably through a temporary invalid test endpoint/account or a local test harness path.
- Inspect `/api/role-model/telemetry/requests` and `/api/role-model/requests/<requestId>` for that failure.
- Confirm the failure row is attributed to the actual selected endpoint/provider/vendor/adapter and has inspectable structured failure detail.

Pi/Craft live verification:

- Send at least one real Pi CLI request through `difficulty.remote-only`.
- Send at least one real Craft client request through `difficulty.remote-only`.
- Confirm successful rows remain attributed to selected endpoints and failures, if induced, are not anonymous.

## Audit

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: no subagent tool is currently loaded in this turn.
Delegation Decision Basis: perform local audit because the task is scoped and the necessary evidence is available through code, tests, and runtime telemetry.
Delegation Override Reason: none.
Audit Inputs Provided:

- Addendum 18 requirements above
- current sparse failure telemetry rows from live SQLite/runtime telemetry
- `runtime-host-bridge/src/index.ts` routed execution and catch paths
- `sqlite-memory/src/index.ts` failure persistence path

### Self-Audit Findings

- The plan preserves provider/vendor/adapter separation.
- The plan avoids Pi/Craft-specific branches.
- The plan requires RED tests before production edits.
- The plan covers both storage-level and runtime-level failure capture.
- The plan includes rebuilt-runtime and live-client verification.

Audit: PASS

## Coverage Gate

- [x] Covers sparse `routing.failed.pre-execution` failure rows.
- [x] Covers selected endpoint/provider/vendor/adapter persistence.
- [x] Covers request-detail inspection parity.
- [x] Covers quota/balance classification.
- [x] Covers TDD.
- [x] Covers rebuilt-runtime verification with Pi and Craft clients.

Coverage: PASS

## Approval Gate

- [x] Plan is specific and verifiable.
- [x] Plan is provider-agnostic and consumer-agnostic.
- [x] Plan stays inside Role-Model runtime code, with no Pi or Craft source modifications.
- [x] Plan is ready for implementation.

Approval: PASS
