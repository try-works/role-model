Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `08`
Status: `LOCKED`
LockedAt: `2026-07-08T16:08:00Z`
LockHash: `661350bda76cadaba23f28815b24d677c8b0e9b69b74420037b69308fea3202b`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-07.md` (DRAFT)
- live rebuilt-runtime investigation on `2026-07-08` against `http://127.0.0.1:3456`
- real `pi` CLI runs using the run-62 `pi-role-model` extension
- live Craft / local client traffic observed on `:3456`
- host-bridge stream handlers in `/role-model-router/apps/runtime-host-bridge/src/index.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-08.md`
Scope note: This addendum updates the remediation plan after live debugging showed that the user-facing slowness is not only alias overclassification. The rebuilt runtime can also become materially degraded under active OpenAI-compatible local clients, including Pi-driven and Craft-adjacent traffic, so the next fix slice must combine generic routing-policy correction with stream-lifecycle hardening and clean-room live verification. Pi, Craft, and LiteLLM are reference/verification surfaces for provider-consumer semantics; they are not targets for product-specific branches in Role-Model.

## TODO

- [x] Reconcile addendum-07 with the new live slowness evidence
- [x] Separate routing-policy defects from runtime-saturation defects
- [x] Record the environmental confounders discovered during live debugging
- [x] Define a strict TDD sequence for both defect families
- [x] Define live verification gates using the real `pi` CLI and real Craft client requests without making Role-Model behavior depend on client-specific names
- [x] Define rebuilt-runtime verification receipts required before trusting the implementation

## New Findings Since Addendum-07

### Finding 1: Live `:3456` was polluted by unrelated active clients

During live debugging, `:3456` had multiple established local clients unrelated to the immediate Pi alias reproduction:

- three concurrent background `side-by-side-ckpt.js` benchmark processes were still connected to `:3456`
- those processes were launched earlier from Pi-driven automation and were issuing direct `/v1/chat/completions` requests
- one benchmark log was already showing `fetch failed`
- several additional local clients were also attached, including Chrome network-service connections

This means some of the worst live latency was measured on a dirty runtime, not a clean verification environment.

### Finding 2: Killing the stray benchmark clients immediately improved runtime behavior

After terminating the stray `side-by-side-ckpt.js` processes:

- direct exact `deepseek/deepseek-v4-pro` non-stream requests returned successfully again
- direct alias stream requests to `difficulty.remote-only` started receiving headers and SSE chunks again

This confirms that runtime responsiveness can degrade materially when long-lived local clients or runaway benchmark scripts are attached to the rebuilt runtime.

### Finding 3: A real OpenAI-compatible alias request can still hang even after the benchmark cleanup

On the cleaned runtime:

- direct exact DeepSeek requests recovered
- a fresh real `pi.cmd` alias request to `baseline.remote-only` still remained stuck materially longer than the direct request path

So there is still a real OpenAI-compatible consumer path defect after removing the environmental confounder.

### Finding 4: Current host-bridge stream handlers have no explicit backpressure or client-abort handling

The current `/v1/chat/completions` and `/v1/responses` handlers in `/role-model-router/apps/runtime-host-bridge/src/index.ts`:

- call `response.write(...)` directly for SSE chunks
- do not wait for `drain`
- do not wire request/response close or abort events into execution cancellation
- do not explicitly stop upstream provider streaming when the downstream client disconnects or stops reading

That makes slow, wedged, or abandoned local clients a plausible runtime-owned cause for severe Pi and Craft latency.

## Updated Problem Statement

The next remediation slice must fix two coupled but distinct problems:

1. `OpenAI-compatible consumer alias overclassification`
   - consumer default alias requests can be treated as hard coder turns too early when declared/default tools are mistaken for active tool intent, which can collapse the eligible alias pool toward GPT/Codex-quality routes.

2. `Host-bridge stream-lifecycle starvation`
   - The rebuilt runtime can become sluggish or effectively jammed when local streamed OpenAI-compatible clients remain attached or stop making progress, and the current SSE handlers do not appear to defend against that.

## Generic Provider / Consumer Boundary

Role-Model must implement generic LLM provider and consumer contracts rather than client- or vendor-specific behavior:

- Provider identity records the actual model provider such as `openai`, `deepseek`, or `llama-swap`; execution intermediaries such as `litellm`, `ai-sdk-openai`, `codex-app-server`, and hosted bridge adapters are vendor/execution/adapter facts, not providers.
- OpenAI-compatible consumers may declare tools, pass abort signals, request streaming, request exact model IDs, or request aliases. Declared/default tools are capability metadata unless the turn includes active tool-use signals or concrete coding/workspace intent.
- Streaming handlers must respect downstream backpressure and cancellation for any consumer that uses OpenAI-compatible SSE, not only Pi or Craft.
- LiteLLM source is useful as a reference for preserving provider identity behind an OpenAI-compatible proxy, but Role-Model telemetry must never classify `litellm` as the provider.
- Pi and Craft source are useful as references for real OpenAI-compatible client behavior and for live verification, but Role-Model runtime code must not special-case Pi or Craft names.

The implementation is not trustworthy until both are addressed and then verified live on a clean rebuilt runtime.

## Root-Cause Refinement

### RC7: Dirty live-runtime verification can hide or amplify the real bug

The rebuilt runtime on `:3456` was not always in a clean verification state. Long-running benchmark scripts and other active local clients materially altered latency and responsiveness. Phase 5 verification must therefore include a runtime-cleanliness gate before any proof is accepted.

### RC8: Stream-lifecycle handling is under-specified in the host bridge

The runtime currently assumes that SSE clients are healthy readers. It does not clearly:

- apply backpressure-aware chunk forwarding
- cancel execution when the downstream client disconnects
- fail fast when a client session becomes abandoned
- prove that one slow local client cannot materially degrade unrelated requests

That gap can affect both Pi and Craft.

## TDD-Backed Remediation Plan

### Slice A: Clean-room verification gate first

Goal:
- make live verification fail closed if `:3456` is already polluted by unrelated clients

RED:
- add a failing verification helper or harness test that asserts Phase 5 cannot begin when:
  - stray `side-by-side-ckpt.js` clients are attached
  - multiple unexpected local `:3456` clients remain established

GREEN:
- add a preflight helper that records:
  - active local clients on `:3456`
  - suspicious benchmark processes
  - refusal/diagnostic output when the runtime is not clean

Verification target:
- the rebuilt runtime verification bundle must contain a clean-port receipt before Pi or Craft proofs are accepted

### Slice B: Host-bridge stream-lifecycle hardening

Goal:
- ensure slow or abandoned clients cannot wedge unrelated requests

Primary code targets:
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/v1/chat/completions` stream handler
  - `/v1/responses` stream handler
  - provider-stream forwarding helpers around the SSE transcript readers

RED:
- add failing integration tests for:
  - `client-abort cleanup`
    - open a streamed request, abort the client, then verify the runtime releases the request and remains responsive
  - `slow-reader isolation`
    - hold one streamed client open, then send an unrelated second request and assert the second request still gets response headers and completes within a bounded time
  - `multi-client responsiveness`
    - reproduce the prior benchmark-style pressure with multiple long-lived clients and assert the runtime does not stop serving simple direct requests

GREEN:
- introduce:
  - downstream connection-close / abort handling
  - execution cancellation propagation
  - backpressure-aware SSE writes
  - defensive cleanup for pending stream state when the client disconnects

REFactor constraint:
- do not change routing policy in this slice
- do not change provider semantics in this slice
- keep the change set scoped to lifecycle and fairness

### Slice C: OpenAI-compatible alias-routing de-overclassification

Goal:
- stop treating consumer default tool availability as sufficient proof that trivial alias prompts must be pinned into the high-quality coding path

Primary code targets:
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `shouldPreferOpenAICodexSubscriptionForTurn()`
  - `resolveOpenAICodexSubscriptionRoutingModel()`
  - heuristic / difficulty routing paths that elevate turns on `toolCount`

RED:
- add failing tests for:
  - `trivial alias prompt with default declared tools`
    - alias remains routable across the alias pool instead of being Codex-pinned solely because tools are available
  - `trivial alias prompt with no tools`
    - remains fast and routable
  - `actual coding/tool-bearing prompt`
    - still escalates appropriately toward the higher-capability route
  - `simple alias prompt from a second OpenAI-compatible consumer shape`
    - remains easy/cost-routed and does not regress

GREEN:
- adjust the heuristic so it distinguishes:
  - `tools available in the client`
  - `turn actually requires tool-capable routing`

REFactor constraint:
- exact model-id behavior must remain unchanged
- legitimate coding/tool prompts must still be able to prefer GPT/Codex-quality paths when warranted

### Slice D: Cooldown and failure-path responsiveness

Goal:
- ensure exact-model or alias failures do not degrade into long local hangs

RED:
- add failing tests for:
  - exact GPT request during endpoint cooldown returning a prompt failure quickly
  - alias request under cooldown pressure failing clearly or rerouting cleanly without long local stalls

GREEN:
- harden the failure path so cooldown-denied requests do not leave the client waiting materially longer than the router decision itself

## Required Live Verification

All live verification must use the rebuilt runtime and real clients, not only synthetic HTTP requests.

### Preflight

Before any proof run:

1. verify `:3456` is owned by the rebuilt run-62 runtime
2. verify there are no stray `side-by-side-ckpt.js` processes
3. capture active local `:3456` clients
4. fail verification if the runtime is already polluted by unrelated heavy clients

### Pi CLI verification

Use the real `pi` CLI with the run-62 `pi-role-model` extension.

Required cases:

1. alias `difficulty.remote-only`
2. alias `baseline.remote-only`
3. exact `deepseek/deepseek-v4-pro`
4. exact `chatgpt/gpt-5.4` when the endpoint is healthy and not in cooldown

Required receipts per case:

- elapsed CLI time
- runtime request id
- router decision id
- selected endpoint/model
- latency from telemetry
- proof that the request completed rather than stalling
- proof that the runtime remained responsive immediately afterward

### Craft verification

Use a real Craft client / Craft agent request path, not only handwritten HTTP.

The Craft verification setup must use Craft's generic OpenAI-compatible custom-endpoint contract:

- `providerType: "pi_compat"`
- `customEndpoint.api: "openai-completions"`
- `baseUrl` must point at the OpenAI-compatible API root, e.g. `http://127.0.0.1:3456/v1`, because OpenAI-compatible SDKs append `/chat/completions`
- `piAuthProvider: "openai"` as the protocol/auth-format hint Craft's own setup helper emits for OpenAI-compatible custom endpoints
- `permissionMode: "allow-all"` or another valid Craft permission-mode id; invalid shorthand modes are false-negative harness bugs
- no Role-Model runtime branch may inspect Craft-specific client names or headers
- any Craft session ending with an error message must fail the verification proof, even if the RPC lifecycle emits a terminal completion event

Required cases:

1. alias request through `difficulty.remote-only`
2. one exact-model control request if needed to separate Craft client behavior from alias behavior

Required receipts per case:

- client-observed completion
- runtime request id
- selected endpoint/model
- latency from telemetry
- post-request runtime responsiveness proof

### Runtime health proof after live traffic

After the Pi and Craft verification requests:

- direct exact `deepseek/deepseek-v4-pro` request still succeeds promptly
- direct alias stream request still receives headers promptly
- no stranded benchmark clients or leaked verification clients remain attached

## Acceptance Criteria For The Next Implementation

The next implementation is not acceptable unless all of the following are true:

- TDD is followed slice-by-slice with failing tests before production edits
- the rebuilt runtime remains responsive under the new multi-client tests
- real `pi` CLI alias requests complete without the prior hangs
- real Craft client requests no longer show the observed minute-plus stalls in the clean verification environment
- exact-model controls still work
- live verification receipts are recorded from the rebuilt runtime on `:3456`

## Requirement Impact Update

- `R2` | Reopened and expanded
  - alias semantics are still over-weighted for OpenAI-compatible consumers that declare default tools
  - stream-lifecycle handling can now also degrade Craft/Pi latency
- `R3` | Reopened
  - cross-endpoint routing proof is not trustworthy until slow-client saturation is handled
- `R4` | Reopened
  - Codex/GPT routing preference remains too eager for trivial OpenAI-compatible alias turns with declared default tools
- `R9` | Reopened
  - live proofs must include the real Pi CLI and real Craft client on a clean runtime
- `R10` | Reopened and tightened
  - rebuilt-runtime verification must reject dirty-port runs and include responsiveness receipts, not only correctness receipts

## Coverage Gate

- [x] The plan records the new environmental confounder discovered during live debugging
- [x] The plan separates runtime-saturation work from alias-policy work
- [x] The plan defines failing tests before production changes
- [x] The plan requires real Pi CLI and real Craft client verification
- [x] The plan requires rebuilt-runtime proof on `:3456`

Coverage: PASS

## Approval Gate

- [x] No further implementation should happen until this addendum drives the next slice
- [x] The next slice is specific and verifiable
- [x] The live verification bar is explicit enough to reject ambiguous proofs

Approval: PASS
