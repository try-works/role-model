Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `06`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:45Z`
LockHash: `9a1ed3aeb872f191ea627d18d3b716aded85488123f8ab5d7776ea1a194e33b7`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-05.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/05-manual-qa.md` (LOCKED)
- live packaged-runtime investigation on `2026-07-08` against `http://127.0.0.1:3456`
- user-supplied Pi and Craft screenshots from `2026-07-08`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-06.md`
Scope note: This addendum narrows the current remediation to the runtime-owned `/v1/responses` streaming contract. The newly observed failure is not basic endpoint routing and not the Pi extension request shape; it is the runtime bridge leaking provider chat-completions SSE on the Responses surface and allowing reasoning-first startup to delay or confuse Pi.

## TODO

- [x] Re-read the locked requirements, root-cause artifact, plan, implementation summary, and manual QA artifact
- [x] Reduce the new live evidence to a runtime-owned defect statement
- [x] Define the strict-TDD regression target before production edits
- [x] Add RED tests for `/v1/responses` streamed normalization and reasoning-first suppression
- [x] Implement the runtime-side `/v1/responses` stream adapter fix
- [x] Capture GREEN evidence for the focused suites
- [x] Verify the rebuilt runtime with alias-routed Pi and Craft requests
- [x] Update the plan to require real Pi-client proof rather than a handcrafted HTTP substitute
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`
  - `R2` requires preserved downstream request semantics rather than provider-private leakage.
  - `R8` requires canonical request-detail and stream-surface diagnosability.
  - `R10` requires rebuilt-runtime proof with real Pi/Craft traffic.
  - `R11` requires trustworthy local verification before closeout.
- `01.5-root-cause.md`
  - `RC2` remains active because the wrong downstream contract is being emitted after provider execution.
  - `RC5` remains active because the current QA/telemetry proof did not catch the bad streamed surface.
  - `RC6` remains active because the regression anchors were too narrow.
- `02-to-be-plan.audit-remediation.addendum-05.md`
  - already reopened cooldown and reasoning-first stream compatibility issues.
  - did not yet isolate the stronger fact that `/v1/responses` is leaking `chat.completion.chunk` frames instead of Responses events.
- `03-implementation-summary.md`
  - claims the responses path and rebuilt-runtime proof are implemented.
  - that claim is too broad for the streamed `/v1/responses` surface and is reopened by this addendum.
- `05-manual-qa.md`
  - proved alias routing and rebuilt-runtime reachability.
  - did not prove that streamed `/v1/responses` traffic stays on the Responses contract for OpenAI-compatible providers such as DeepSeek.

## Earlier Phase Reconciliation

Earlier addenda stay in force:

1. use existing runtime aliases such as `difficulty.remote-only`
2. preserve provider versus vendor versus adapter identity
3. keep Phase 5 rebuilt-runtime verification authoritative

This addendum adds one narrower planning rule:

1. `/v1/responses` must be treated as its own downstream API contract, not as a raw pass-through for provider chat-completions SSE

## Problem Statement

The new live evidence on `2026-07-08` isolates the defect to the runtime bridge:

- Craft can send and receive through Role-Model and routed endpoints such as Codex.
- Pi times out on `difficulty.remote-only` through `:3456`, then reports that a direct `POST /v1/chat/completions` probe to `chatgpt/gpt-5.4` succeeds.
- direct `POST /v1/chat/completions` against `difficulty.remote-only` also streams promptly.
- non-stream `POST /v1/responses` can complete successfully.
- streamed `POST /v1/responses` against `difficulty.remote-only` can return provider payloads shaped like:
  - `object: "chat.completion.chunk"`
  - `delta.reasoning_content`
  - `delta.content = null`

That combination means:

1. routing itself is working
2. provider reachability itself is working
3. the broken surface is the runtime-owned `/v1/responses` stream adapter

## Root Cause Delta

The current `/v1/responses` handler in `role-model-router/apps/runtime-host-bridge/src/index.ts` writes any streamed backend chunk directly to the HTTP response once streaming begins.

That is only valid when the backend is already producing Responses events such as:

- `response.created`
- `response.output_text.delta`
- `response.completed`

It is invalid when the routed provider is OpenAI-compatible and emits chat-completions SSE:

- `chat.completion.chunk`
- reasoning-only or empty bootstrap deltas
- finish frames that must still be translated into a terminal Responses event

So the defect is:

- not the Pi extension choosing the wrong endpoint
- not the Craft request shape
- not basic GPT or DeepSeek health
- the runtime bridge failing to normalize provider stream frames onto the `/v1/responses` contract

## Canonical Remediation Goals

1. `/v1/responses` never leaks raw `chat.completion.chunk` frames to downstream clients
2. reasoning-only and empty bootstrap deltas from OpenAI-compatible providers do not become Pi-visible stalled output
3. native Responses streams still pass through unchanged
4. rebuilt-runtime proof uses alias-routed Pi/Craft traffic and rejects false positives from direct chat-completions probes
5. Pi verification must use the actual `pi` client with the run-62 `pi-role-model` extension loaded; handcrafted HTTP substitutes are not valid Pi proof

## Strict TDD Execution Contract

TDD Mode: `strict`

No production code may be written before the corresponding failing test has been run and recorded.

All RED and GREEN logs for this addendum must be written under:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-06/`

## Implementation Slices

### SP62-T1 - `/v1/responses` streamed contract regression

**RED-first targets**

- failing `runtime-host-bridge` server-level tests proving that when `executeResponses()` emits streamed `chat.completion.chunk` payloads, the HTTP `/v1/responses` surface must still emit Responses events only
- failing tests proving DeepSeek-style startup chunks with:
  - empty bootstrap assistant delta
  - `reasoning_content`
  - later visible `content`
  do not leak raw reasoning/private provider frames to downstream clients

**GREEN target**

- a streamed `/v1/responses` request returns:
  - `response.created`
  - `response.output_item.added`
  - one or more `response.output_text.delta`
  - `response.completed`
- and never returns `object: "chat.completion.chunk"` on that surface

**Primary files**

- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`

**Evidence**

- RED: `evidence/logs/addendum-06/sp62-t1-responses-stream-contract.red.log`
- GREEN: `evidence/logs/addendum-06/sp62-t1-responses-stream-contract.green.log`

### SP62-T2 - Runtime stream adapter implementation

**Implementation target**

Add a runtime-owned `/v1/responses` stream adapter that:

- passes through native `response.*` events unchanged
- converts OpenAI-compatible `chat.completion.chunk` frames into Responses events
- suppresses empty bootstrap and reasoning-only deltas from the downstream-visible stream
- emits one terminal `response.completed` event with usage when the provider stream finishes
- preserves the existing `/v1/chat/completions` streaming behavior unchanged

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`

### SP62-T3 - Rebuilt-runtime proof realignment

**RED-first targets**

- failing or missing proof if verification relies only on:
  - direct `chatgpt/gpt-5.4` chat-completions probes
  - Craft-only control traffic
  - non-stream `/v1/responses` responses

**GREEN target**

- authoritative rebuilt-runtime proof shows that alias-routed Pi traffic from the real `pi` client completes on a valid downstream contract

**Primary files**

- `packages/pi-role-model/test/validate-agent-path.test.ts` if a repo-owned regression harness is needed
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- run-local rebuilt-runtime evidence under `evidence/runtime/`

**Evidence**

- GREEN: `evidence/logs/addendum-06/sp62-t3-rebuilt-runtime-proof.green.log`

## Phase 4 Verification Floor

Run from `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening`.

Focused commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/validate-agent-path.test.ts`

Broader validation after focused suites:

- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-packaging`

Pass criteria:

- `/v1/responses` stream tests fail if raw `chat.completion.chunk` payloads leak
- `/v1/chat/completions` behavior remains green
- no provider/vendor identity regressions are introduced

## Phase 5 Rebuilt-Runtime Verification Matrix

All authoritative routing proof must continue using existing runtime aliases.
For Pi, authoritative proof must come from the real `pi` client with the run-62 extension loaded explicitly or installed from the run-62 package path. Raw `fetch()`/`curl` probes may be used only as control evidence and cannot replace Pi proof.

Proof root:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-06-responses-stream-rebuilt/`

| ID | Scenario | Required path | Pass criteria | Required evidence |
| --- | --- | --- | --- | --- |
| `Q-R1` | Pi alias-routed live request | actual `pi` client request using `difficulty.remote-only` with the run-62 extension loaded | the request completes without timeout, the runtime request/detail receipts show the alias route, and the downstream contract stays valid for the surfaced Pi transport | `pi` command transcript + request-detail + router-decision |
| `Q-R2` | Craft alias streamed chat-completions control | Craft-style alias request to `/v1/chat/completions` using `difficulty.remote-only` | control path remains healthy and does not regress while `/v1/responses` is fixed | request + streamed transcript + request-detail |
| `Q-R3` | Direct GPT chat-completions control | exact `chatgpt/gpt-5.4` request to `/v1/chat/completions` | proves endpoint health separately from the broken Responses surface | request + response + request-detail |
| `Q-R4` | Direct DeepSeek alias Responses normalization | streamed `/v1/responses` alias request that selects DeepSeek | downstream transcript shows `response.*` events only and no leaked reasoning-only startup | request + streamed transcript + request-detail + endpoint-profile |

## Requirement Completion Status

| Requirement | Current status after this addendum | Rationale | Addendum |
| --- | --- | --- | --- |
| `R2` | reopened | streamed `/v1/responses` does not currently preserve the correct downstream API contract when routed through OpenAI-compatible providers | `02-to-be-plan.audit-remediation.addendum-06.md` |
| `R8` | reopened | canonical runtime proof allowed a contract-incorrect stream surface to pass Phase 5 | `02-to-be-plan.audit-remediation.addendum-06.md` |
| `R10` | reopened | rebuilt-runtime proof must be refreshed with real alias-routed Pi `/v1/responses` traffic | `02-to-be-plan.audit-remediation.addendum-06.md` |
| `R11` | open | focused host-bridge and rebuilt-runtime verification remain pending | `02-to-be-plan.audit-remediation.addendum-06.md` |

## Out Of Scope

- patching the upstream Pi extension request shape
- patching Craft upstream behavior
- inventing new aliases
- changing `/v1/chat/completions` semantics to match `/v1/responses`
- treating direct chat-completions success as sufficient proof for the Responses surface

## Coverage Gate

- [x] The addendum isolates the defect to the runtime-owned `/v1/responses` stream surface
- [x] The addendum distinguishes routing health from downstream stream-contract correctness
- [x] The addendum defines strict RED/GREEN evidence before production edits
- [x] The RED tests have been added and run
- [x] The rebuilt-runtime Pi/Craft proof has been refreshed

Coverage: PASS

## Approval Gate

- [x] The remediation scope is specific enough to implement without new requirement discovery
- [x] The addendum gives a concrete TDD and rebuilt-runtime verification path
- [x] The implementation and verification work are no longer pending

Approval: PASS

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `multi-agent tools are available, but this turn only required a run-local corrective plan before code edits`
- Delegation Decision Basis: `the user explicitly requested an addenda doc for the fix plan first`
- Delegation Override Reason: `no delegated planning was requested`
- Audit Inputs Provided:
  - `00-requirements.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `addenda/02-to-be-plan.audit-remediation.addendum-05.md`
  - `03-implementation-summary.md`
  - `05-manual-qa.md`
  - live requests against `http://127.0.0.1:3456`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: reproduced `/v1/responses` versus `/v1/chat/completions` behavior on the live packaged runtime, inspected `runtime-host-bridge` stream-writing code, and matched the live Pi/Craft evidence against the current locked run artifacts
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-06.md`

Audit: PASS
