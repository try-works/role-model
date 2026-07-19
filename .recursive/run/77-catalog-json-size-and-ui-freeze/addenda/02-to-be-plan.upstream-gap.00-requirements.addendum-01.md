Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-18T01:11:35Z`
LockHash: `568efdb0c00004526bb248a0045be788b879c945c0bf1b23d8ac1824c2754ca7`
Addendum: `01`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/01-as-is.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/02-to-be-plan.md` (DRAFT)
- user runtime-console evidence showing `ERR_HTTP_HEADERS_SENT` after response commit on `2026-07-18`
- user request telemetry for `req-d94ae513-b85e-414a-88ea-6e75f6a8ef3f`
- runtime observation for `req-484412e2-336c-45d3-9210-dadd7516c740`
- Pi parent session `D:/pi/agent/sessions/--C--Users-erikb--/2026-07-17T05-10-41-558Z_019f6e7b-e696-709e-ad9c-b511477b58ca.jsonl`
- Pi child session `D:/pi/agent/sessions/--C--Program Files-Git--/2026-07-17T05-53-22-309Z_019f6ea2-f985-70ad-9ea3-ddcb55c059b5.jsonl`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/adapter-execution/test/index.test.ts`
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/`
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/`
Outputs:
- This addendum
Scope note: Record the runtime streaming failure discovered after the run-77 requirements locked, distinguish it from the existing synchronous SQLite/UI freeze and the non-causal `/proc/1513/fd/63` request, and add bounded response-ownership, telemetry, and Kimi K3 verification obligations to the current Phase 2 plan.

## TODO

- [x] Record the locked-requirements gap
- [x] Separate the three observed failure signatures
- [x] Preserve the evidence and causal classification
- [x] Define bounded additional requirements and acceptance criteria
- [x] Identify implementation and verification surfaces
- [x] Define current- and later-phase compensation
- [x] Complete Coverage Gate and Approval Gate

## Gap Statement

The locked `00-requirements.md` covers the synchronous SQLite request-list scan that blocks the Node.js event loop, keeps Models mutations pending, and prevents other UI routes from loading. It does not cover a separate inference-stream failure reported after the requirements locked:

1. the bridge commits an SSE response;
2. the selected downstream stream later fails or is terminated;
3. the route-local catch attempts `writeJson(response, 400, ...)` after headers have already been sent;
4. Node raises `ERR_HTTP_HEADERS_SENT`;
5. Pi remains on `Working...` because the committed stream does not reach a deterministic terminal outcome.

This is a distinct causal chain from the request-list database scan. Run 77 must repair and verify both chains because the user-visible outcome overlaps: the runtime appears unusable, pages may not load, and Pi does not finish.

## Discovery Evidence

### E1 — Terminated inference stream and header-ownership failure

- Request: `req-d94ae513-b85e-414a-88ea-6e75f6a8ef3f`
- Correlation: `019f7273-07f5-74de-a577-9d5303279e20`
- Routing decision: `decision-req-d94ae513-b85e-414a-88ea-6e75f6a8ef3f`
- Recorded outcome: remote `400`, `terminated`, `248159 ms`, `0 tokens`
- Console outcome: `runtime host bridge request failed after response commit Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`
- Stack boundary: `writeJson` attempts `ServerResponse.setHeader` after the streaming response has committed.

Current source confirms the unsafe route-local ownership boundary:

- `apps/runtime-host-bridge/src/index.ts:13724-13740` commits and writes chat-completions SSE chunks.
- `apps/runtime-host-bridge/src/index.ts:13796-13806` catches a later execution/stream failure and unconditionally calls `writeJson(response, 400, ...)` unless the error is classified as `BridgeHttpError` or client disconnect.
- `apps/runtime-host-bridge/src/index.ts:13930-13940` has the equivalent unconditional JSON fallback for the Responses ingress surface.
- `apps/runtime-host-bridge/src/index.ts:8514-8525` already contains a safe outer `writeUnhandledBridgeError` guard, but the route-local catches consume the error before that guard can own it.
- `apps/runtime-host-bridge/src/index.ts:15284-15287` logs failures reaching the outer boundary after response commit instead of attempting a second response.

The existing outer guard is therefore insufficient for errors caught inside either streaming ingress handler.

### E2 — Kimi K3 remains plausible but is not proven as the selected target

- Kimi K3 support intentionally uses the OpenAI-compatible chat-completions request shape; use of `/chat/completions` is not itself a defect.
- Existing adapter coverage proves Kimi-shaped requests map to `/coding/v1/chat/completions`, but it does not prove long-lived streaming failure behavior through the live Pi -> Role Model -> selected target chain.
- The failed observation does not preserve enough selected endpoint/provider metadata to attribute `req-d94ae513-b85e-414a-88ea-6e75f6a8ef3f` to Kimi K3 conclusively.
- Run 77 must not encode an unproven Kimi attribution. It must add provider-shape coverage and preserve selected-target failure telemetry so a future incident is attributable.

### E3 — `/proc/1513/fd/63` is a malformed model ID, not a runtime filesystem failure

The `/proc/1513/fd/63` dashboard category came from this nested Pi command:

```bash
cd / && echo 'doctor' | timeout 10 pi --provider role-model --model <(echo "gpt-4o")
```

Git Bash expanded `<(echo "gpt-4o")` to `/proc/1513/fd/63`. Pi accepted the path as a custom model ID and forwarded it. The runtime rejected it in pre-execution:

- Request: `req-484412e2-336c-45d3-9210-dadd7516c740`
- Outcome: `400 no_eligible_target`
- Latency: `1 ms`
- Tokens: `0`
- Selected provider/endpoint: none
- Occurrences found: one

The parent Pi session records the malformed command and warning; the child session records `modelId: /proc/1513/fd/63`. This event did not reach Kimi K3 or any other downstream provider and did not cause the runtime/UI stall. Run 75's current model-discovery preflight is the owning hardening surface. Run 77 retains this event only as a negative control and must not add `/proc`-specific runtime routing behavior.

## Addendum Requirements

### `A1` Streaming response ownership must be commit-aware

Description:
Once either OpenAI-compatible ingress surface commits an SSE response, no later error path may attempt to replace it with a JSON response or mutate its headers.

Acceptance criteria:

- chat-completions and Responses route-local error handlers distinguish pre-commit from post-commit failures
- pre-commit failures retain the existing structured HTTP error behavior
- post-commit failures never call `writeJson`, `setHeader`, or `writeHead` again
- no covered post-commit failure emits `ERR_HTTP_HEADERS_SENT`
- response ownership is implemented through one reusable bridge helper or equivalent shared invariant, not duplicated ad hoc checks

### `A2` A committed stream must reach a deterministic terminal state

Description:
Pi and other streaming clients must not remain indefinitely pending after a downstream reader error, termination, or other post-commit execution failure.

Acceptance criteria:

- the bridge closes or destroys the committed response deterministically on post-commit failure
- pending stream writes are not allowed to continue after terminal failure
- request abort/disconnect semantics remain distinguishable from downstream failure
- tests prove the client observes termination within a bounded interval and does not wait for a second HTTP response
- normal `[DONE]` behavior remains unchanged for successful chat-completions streams

### `A3` Failed-stream telemetry must preserve selected-target truth

Description:
A failure after routing and stream commitment must retain enough execution identity to determine which endpoint, provider account, model, adapter, and request shape were selected.

Acceptance criteria:

- the terminal observation for a post-selection failure preserves selected endpoint ID, provider account ID when available, selected model ID, adapter family, and routing decision ID
- error classification distinguishes downstream stream/read termination from client disconnect and pre-execution routing failure
- partial-stream token/cost fields remain explicitly unknown or partial rather than silently reported as authoritative zeroes
- request inspection can attribute a future Kimi-shaped failure without relying on adjacency or routing-history inference

### `A4` Kimi K3 chat-completions streaming requires failure-path coverage

Description:
The newly cataloged Kimi K3/Kimi Code path must be verified on its intended `openai.chat.completions` shape, including a stream that fails after the first committed chunk.

Acceptance criteria:

- a focused fixture verifies Kimi's canonical `/coding/v1/chat/completions` request URL and streaming request shape
- a first-chunk-then-reader-error fixture proves `A1`, `A2`, and `A3`
- the fixture verifies tools/function-calling payload compatibility when the selected alias requires it
- a successful Kimi-shaped streaming control still emits normalized chunks and one terminal `[DONE]`
- live OAuth credentials are not required for deterministic unit/integration coverage; rebuilt-runtime QA may use a configured live account when available

### `A5` Failure analytics must not imply false causality

Description:
The failure trend may display the raw requested model ID, including malformed custom IDs, but incident analysis and verification must preserve causal class boundaries.

Acceptance criteria:

- `/proc/1513/fd/63` remains classified as `routing.failed.pre-execution` / `no_eligible_target`
- it is not attributed to a remote provider, chat-completions adapter, or stream failure
- no Run-77 product code special-cases `/proc` paths
- the Run-75 unknown-model preflight remains the owning Pi-side prevention mechanism

## Planned Changes by Surface

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - make chat-completions and Responses route-local error handling response-commit-aware
  - centralize post-commit termination behavior
  - preserve normal pre-commit JSON error semantics

- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add RED-first regression cases for first-chunk-then-error on both ingress surfaces
  - assert no second header/JSON write and bounded client termination
  - preserve successful SSE and client-disconnect controls

- runtime execution/telemetry surfaces identified during the RED trace
  - preserve selected-target metadata through post-selection stream failure
  - add a terminal error class that does not conflate downstream termination with client cancellation
  - update request inspection regression coverage

- `role-model-router/packages/adapter-execution/test/index.test.ts` and/or the closest owning provider fixture
  - add Kimi K3 chat-completions streaming success and post-commit failure controls without broadening provider semantics

## Implementation Sub-phase Additions

### `SP-E` — Bridge post-commit response ownership

- Requirements: `A1`, `A2`
- RED: a stream writer commits one chunk, execution rejects, and the current route attempts JSON/header mutation or leaves the client pending
- GREEN: introduce shared commit-aware terminal handling for chat-completions and Responses
- Gate: focused bridge tests prove no `ERR_HTTP_HEADERS_SENT`, bounded termination, and unchanged successful streaming

### `SP-F` — Selected-target failure telemetry

- Requirements: `A3`, `A5`
- RED: post-selection termination loses endpoint/provider/model identity or reports misleading authoritative zeroes
- GREEN: carry selected-target and partial-observation truth through terminal failure persistence and inspection
- Gate: focused telemetry/request-detail tests distinguish post-selection termination, client disconnect, and pre-execution failure

### `SP-G` — Kimi K3 streaming matrix

- Requirements: `A4`
- RED: Kimi-shaped first-chunk-then-error behavior lacks end-to-end adapter/bridge coverage
- GREEN: add deterministic Kimi chat-completions streaming success and failure fixtures
- Gate: Kimi URL, payload, normalized chunks, terminal behavior, and failure attribution all pass

## Impact

### Impact on current phase

- `02-to-be-plan.md` must list this addendum as an effective input before Phase 2 locks.
- The plan must map `A1-A5`, add `SP-E` through `SP-G`, and include the additional changed/test surfaces.
- Existing `R2-R9` database, UI, benchmark, and catalog work remains unchanged.
- `R1` expands from tracing the UI freeze alone to preserving the newly observed second causal chain.
- `R10` expands rebuilt-runtime verification to include a streaming failure recovery probe and a follow-up health/UI request.

### Impact on later phases

- Phase 3 must use strict RED-GREEN-REFACTOR for the new bridge, telemetry, and Kimi test slices.
- Phase 4 must report successful-stream, post-commit failure, pre-commit failure, and client-disconnect controls separately.
- Phase 5 must prove that a failed stream terminates Pi/client work, does not emit `ERR_HTTP_HEADERS_SENT`, and leaves the runtime responsive to `/healthz` and a UI route.
- Later artifacts must cite this addendum in their effective-input reread and earlier-phase reconciliation sections.

## Scope Boundaries

- In scope: bridge response ownership, deterministic stream termination, failure attribution, selected-target telemetry, and Kimi K3 chat-completions streaming regression coverage.
- Still in scope from the base run: request-list SQLite repair, mutation decoupling, benchmark progressive rendering/indexing, bounded post-mutation convergence, and catalog compaction.
- Out of scope: `/proc`-specific routing logic, changing Kimi away from its intended chat-completions shape, generic retry/failover redesign, or treating an unproven Kimi attribution as fact.

## Requirement Mapping

- `R1`, `A1`, `A2` -> preserve both confirmed runtime-stall causal chains and repair the bridge's post-commit response boundary
- `R10`, `A2` -> rebuilt-runtime recovery and continued health/UI responsiveness after stream failure
- `A3` -> execution telemetry and request-inspection failure attribution
- `A4` -> Kimi K3 chat-completions streaming matrix
- `A5` -> pre-execution malformed-model negative control and Run-75 ownership boundary

## Earlier Phase Reconciliation

- `00-requirements.md` remains authoritative for the original database/UI freeze and catalog objectives but is incomplete for the later reported inference-stream incident.
- `01-as-is.md` and `01.5-root-cause.md` remain correct for the synchronous SQLite event-loop stall; this addendum does not revise that root cause.
- The added stream incident is a second root cause with overlapping symptoms. The current phase compensates without unlocking earlier artifacts.
- `02-to-be-plan.md` is still DRAFT and must absorb this addendum before it can pass its final audit and lock.

## Coverage Gate

- [x] The locked-requirements gap is stated precisely
- [x] The SQLite/UI freeze and terminated-stream failure are kept causally distinct
- [x] The Kimi K3 hypothesis is recorded without asserting unproven endpoint selection
- [x] `/proc/1513/fd/63` is preserved as a non-causal negative control
- [x] `A1-A5` define bounded implementation and verification obligations
- [x] Current- and later-phase compensation is explicit

Coverage: PASS

## Approval Gate

- [x] The addendum follows the Phase-2 upstream-gap naming and immutability policy
- [x] No locked artifact is edited
- [x] The scope remains tied to the user's runtime/Pi failure report
- [x] The document is ready to be listed as an effective input by the Phase 2 plan

Approval: PASS
