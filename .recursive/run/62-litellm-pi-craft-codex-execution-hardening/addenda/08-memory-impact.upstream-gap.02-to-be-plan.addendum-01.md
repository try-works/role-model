Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `08 Memory Impact upstream-gap for 02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-07-08T00:12:46Z`
LockHash: `2567c20f6304250fc446c77bd3188b3dad085f5993b92ec06c990fb91a183ab8`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01-as-is.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/04-test-summary.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/05-manual-qa.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/08-memory-impact.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/request-results.summary.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-fallback-002/request-detail.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-fallback-002/telemetry-row.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-01-live-agent-path/summary.json`
- post-lock repository audit findings on `2026-07-08`
- operator follow-up requiring rebuilt-runtime verification through Pi and Craft agent request paths on `2026-07-08`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: Current-phase plan-amendment addendum for locked `02-to-be-plan.md`. Records the post-lock remediation plan for payload-hop accounting, Pi/Craft ingress fidelity, retry/reroute/idempotency receipts, and rebuilt-runtime proof quality without rewriting the locked run-62 history.

## TODO

- [x] Re-read the locked run-62 requirements, plan, implementation, test, QA, and memory-impact artifacts
- [x] Trace each audit finding to concrete code/evidence boundaries
- [x] Convert the findings into bounded strict-TDD implementation slices
- [x] Define the rebuilt-runtime verification matrix using Pi and Craft request paths
- [x] Define the local verification floor and the closeout CI expectation
- [x] State the current-phase compensation for the locked plan gap
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Upstream Gap

- Locked `02-to-be-plan.md` did not force:
  - distinct ingress/translated/canonical/wire hop accounting for `R5` / `R9`
  - actual retry/reroute/idempotency receipts instead of defaulted recovery fields for `R6` / `R8` / `R10`
  - authoritative rebuilt-runtime proof through Pi- and Craft-path emitters instead of payload-shape HTTP requests for `R10` / `R11`
- That gap was discovered only after the locked implementation/test/QA artifacts were audited against the concrete code and rebuilt-runtime receipts.
- Because `02-to-be-plan.md` is locked, this addendum records the follow-up implementation plan amendment in the current phase instead of retroactively editing the base plan.

## Effective Inputs Re-read

- `00-requirements.md`: `R1`, `R2`, `R4`, `R5`, `R6`, `R8`, `R9`, `R10`, and `R11` remain the governing contract for the follow-up work.
- `01-as-is.md` and `01.5-root-cause.md`: the original run already identified the missing Pi transport/session semantics, the missing execution-semantics telemetry facts, and the continuation/idempotency risk boundaries.
- `02-to-be-plan.md`: the locked base plan covered shared propagation, LiteLLM config, native Codex compatibility ownership, observability persistence, and corpus generation, but it did not force distinct hop accounting, real retry/reroute receipts, or actual Pi/Craft emitter proof in Phase 5.
- `03-implementation-summary.md`: the implemented change set concentrated in `runtime-host-bridge`, `adapter-execution`, `provider-openai`, `runtime-observability`, `sqlite-memory`, `vendor-litellm`, and validator tests.
- `04-test-summary.md`: focused suites passed, but `R5`, `R6`, `R7`, `R10`, and `R11` were partly deferred to Phase 5.
- `05-manual-qa.md`: the authoritative rebuilt-runtime proof used local HTTP requests, proved non-text routing and a tool-bearing exact Codex case, but its degraded-primary case was pre-dispatch selection rather than non-zero reroute behavior.
- `08-memory-impact.md`: the locked run is already complete, so the only workflow-valid way to record the plan correction is a current-phase upstream-gap addendum.
- `phase5-rebuilt/request-results.summary.json`: the summary records only four representative cases and omits the degraded-primary recovery case from the machine-readable top-level receipt.
- `requests/pi-alias-fallback-002/request-detail.json` and `telemetry-row.json`: the recovery proof shows `retryCount: 0`, `rerouteCount: 0`, `cooldownDecision: "not_applied"`, and `idempotencyDecision: "not_needed"` even though Phase 5 used the case as recovery evidence.
- `evidence/runtime/addendum-01-live-agent-path/summary.json`: fresh live-runtime Pi and Craft requests on `http://127.0.0.1:3456` both succeeded, both left request-detail/telemetry receipts in the run-62 worktree, and both persisted `clientRequestIdObserved: null` despite sending `x-client-request-id`, strengthening the ingress-fidelity gap with live agent-path evidence.
- `packages/pi-role-model/**`, `.tmp/pi-ref/packages/ai/**`, and existing Craft ask-mode fixtures/tests: Pi still expects `transport`, `sessionId`, `previous_response_id`, `prompt_cache_key`, `session-id`, and `x-client-request-id`, while Craft fixtures remain the checked-in source of truth for preambles, declared tools, active tool turns, and inline-image routing.

## Live agent-path verification snapshot (`2026-07-08`)

- `pi-chat-alias-001`
  - request path: actual `@try-works/pi-role-model` `before_provider_request` hook injected `role_model.intent` into a live `chat.completions` alias request before transport
  - persisted runtime request id: `req-5e767978-9415-4fec-bdad-92f118a807e7`
  - evidence: `evidence/runtime/addendum-01-live-agent-path/pi-chat-alias-001/request.json`, `request-detail.json`, `router-decision.json`, `telemetry-row.json`
  - live finding: request-detail proves the Pi path injected normalized taxonomy intent, but the runtime request ledger stored `clientRequestIdObserved: null` even though the request sent `x-client-request-id: run62-addendum-live-pi-001`
- `craft-chat-declared-tools-001`
  - request path: repo-owned Craft dual-user preamble + declared-tools fixture family posted to the live runtime through `chat.completions`
  - persisted runtime request id: `req-288f5a01-76c1-48b6-aeff-50b86f484811`
  - evidence: `evidence/runtime/addendum-01-live-agent-path/craft-chat-declared-tools-001/request.json`, `request-detail.json`, `router-decision.json`, `telemetry-row.json`
  - live finding: the Craft-path request remained tool-capable and succeeded, but the runtime again stored `clientRequestIdObserved: null` despite sending `x-client-request-id: run62-addendum-live-craft-001`
- follow-up impact:
  - these live receipts strengthen `F2` by proving that a real Pi extension path and a real Craft fixture-derived path still lose the correlating request-id ingress field at runtime-host ingress
  - these live receipts strengthen `F4` by replacing assumption with concrete agent-path proof inside the run-62 worktree, while still leaving rebuilt-runtime isolated-state proof as the follow-up acceptance bar

## Problem statement

Post-lock audit found that run 62 improved the shared contract and receipts, but it did not close several of the requirements as mechanically as the locked artifacts claimed:

1. `R5` / `R9`: payload-growth evidence is still collapsed to one provider request byte count plus one provider response byte count, so ingress, translated, canonical-provider, wire-provider, continuation, and retry growth remain unprovable.
2. `R1` / `R2` / `R4`: Pi/Codex session-affinity and transport semantics are still only partially preserved at runtime-host ingress; the shared contract now has additive fields, but the host bridge does not populate all of them from real request surfaces.
3. `R6` / `R8` / `R10`: retry/reroute/idempotency semantics exist in execution code, but the canonical observation/telemetry path still defaults most recovery facts instead of recording actual behavior, and the rebuilt-runtime proof overclaimed fallback coverage.
4. `R10` / `R11`: the authoritative rebuilt-runtime QA used payload-shape HTTP requests from local operator code rather than actual Pi- and Craft-path emitters, so the follow-up proof must close that gap explicitly.

## Root-cause refinement

### F1 — payload-hop accounting is still collapsed at both receipt and corpus layers

- `runtime-observability` currently measures only `providerRequest` and `providerResponse` bytes from the final provider capture.
- `validate-vendors` then copies the same provider request byte count into `translated`, `providerCanonical`, and `providerWire`.
- The current corpus therefore cannot distinguish ingress growth from translated-growth or canonical-vs-wire differences, and it cannot prove continuation or retry growth bounds per hop.

**Planning consequence**

- The follow-up must introduce explicit hop metrics and, where needed, a bounded hop-history structure:
  - ingress bytes
  - translated execution bytes
  - provider canonical request bytes
  - provider wire bytes
  - provider response bytes
  - continuation/retry/reroute hop bytes where applicable
- The machine-readable corpus artifact must stop reusing one provider byte count for multiple required fields.

### F2 — the shared contract widened, but host ingress still drops Pi/Codex session and transport semantics

- `adapter-execution` now declares `reasoning`, `sessionAffinity`, `transportPreference`, and `continuation`.
- `provider-openai` can forward `session-id`, `x-client-request-id`, `reasoning`, `previous_response_id`, and `prompt_cache_key` when the shared contract contains them.
- `runtime-host-bridge` still only reads a generic request id plus routing overrides into `BridgeExecutionRequestOptions`, and `mapResponsesRequest()` only turns that request id into `sessionAffinity.clientRequestId`.
- Pi upstream still expects `options.transport`, `options.sessionId`, and session-affinity headers for its Codex/WebSocket/SSE continuation behavior.
- The fresh live agent-path receipts under `evidence/runtime/addendum-01-live-agent-path/` show the same gap concretely: both Pi and Craft requests sent `x-client-request-id`, but both persisted runtime request records still report `clientRequestId: null`.

**Planning consequence**

- The follow-up must extend ingress parsing and mapping so the runtime preserves the Pi/Codex fields that the shared contract already knows how to carry.
- The Craft path must be regression-checked in the same slices so the new Pi ingress preservation does not become a Pi-only dialect.

### F3 — recovery behavior exists in execution flow, but the canonical receipts still report defaults

- The live execution loop can same-endpoint retry transient failures and reroute to a new endpoint when policy allows.
- The observation bundle call site currently supplies only `sourceClient`, so `retryCount`, `rerouteCount`, `cooldownDecision`, `idempotencyDecision`, and `toolSideEffectState` mostly fall back to synthesized defaults.
- The rebuilt degraded-primary proof selected a surviving family before dispatch and therefore did not prove an in-flight retry or reroute, yet Phase 5 still marked `R6` and `R10` verified.

**Planning consequence**

- The follow-up must thread actual recovery facts from the execution loop into observation + telemetry persistence.
- The follow-up must add deterministic fault-injection cases that force:
  - same-endpoint retry before tool execution
  - reroute to a second eligible endpoint after an execution failure
  - tool-side-effect replay guard behavior when a failure happens after observable tool work

### F4 — rebuilt-runtime proof needs actual Pi/Craft emitter paths, not only shaped HTTP requests

- The locked Phase 5 receipt explicitly used local HTTP requests plus runtime APIs.
- The representative request JSON files prove payload shape, but they do not prove that the current Pi package or the Craft agent-path emitter still preserves the same semantics end to end.

**Planning consequence**

- The follow-up must add a repo-owned rebuilt-runtime verification harness that issues requests through:
  - the `@try-works/pi-role-model` path for Pi-originated traffic
  - the repo-owned Craft request emitter/harness path seeded from the checked-in Craft fixture families
- These rebuilt-runtime receipts become the authoritative proof for the repaired findings.

## Current-phase compensation

- This Phase 8 upstream-gap addendum is the authoritative plan amendment for the locked `02-to-be-plan.md`.
- Later follow-up implementation work for run 62 must treat this addendum as an effective input alongside the locked base plan.
- The compensation does not change the locked receipts' historical claims in place; it records the concrete remediation path the next implementation pass must follow.

## Requirement delta

| Finding | Locked requirement linkage | Disposition |
| --- | --- | --- |
| `F1` payload-hop collapse | `R5`, `R8`, `R9` | remediate |
| `F2` Pi/Codex ingress fidelity gap | `R1`, `R2`, `R4`, `R7` | remediate |
| `F3` recovery receipts and overclaimed proof | `R6`, `R8`, `R10` | remediate |
| `F4` synthetic-only rebuilt-runtime proof | `R10`, `R11` | remediate |
| GitHub CI still deferred | `R11` | re-verify on follow-up change set |

## Worktree execution context

| Field | Value |
| --- | --- |
| Worktree | `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening` |
| Branch | `recursive/62-litellm-pi-craft-codex-execution-hardening` |
| Run control plane | `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/` in the run-62 worktree |
| Primary product paths | `role-model-router/apps/runtime-host-bridge/**`, `role-model-router/packages/adapter-execution/**`, `role-model-router/packages/provider-openai/**`, `role-model-router/packages/provider-litellm/**`, `role-model-router/packages/runtime-observability/**`, `role-model-router/packages/sqlite-memory/**`, `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `packages/pi-role-model/**` |

## Implementation slices

### SP62-H — canonical hop accounting and corpus artifact truth (`F1`)

**TDD mode:** strict

**Plan**

1. Extend the canonical execution-semantics model so it can record distinct byte facts for:
   - ingress payload
   - translated shared-contract payload
   - provider canonical request payload
   - provider wire payload
   - provider response payload
2. Add additive hop-history data for continuation/retry/reroute where one aggregate number is insufficient to prove the growth bound.
3. Persist the new facts through the existing request-detail and telemetry-ledger pipeline; do not create a second trace store.
4. Repair the validator corpus writer so `translated`, `providerCanonical`, and `providerWire` are populated from their real measurements rather than copied from one provider request size.
5. Add regression tests that fail if:
   - a successful case aliases multiple hop fields to the same source without an explicit reason
   - continuation/retry cases omit the hop bytes needed to evaluate `R5`
   - corpus receipts lack the required hop facts for successful cases

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/addendum-01/sp62-h-hop-accounting.red.log`
- GREEN: `evidence/logs/addendum-01/sp62-h-hop-accounting.green.log`

### SP62-I — Pi/Craft ingress fidelity for session, transport, and continuation semantics (`F2`)

**TDD mode:** strict

**Plan**

1. Extend `BridgeExecutionRequestOptions` and request parsing to preserve the ingress facts that the shared contract already supports:
   - `session-id`
   - `x-client-request-id`
   - transport preference where the request surface provides it
   - any additive session-affinity/cache-affinity headers the current Pi/Codex contract requires
2. Preserve those facts through `mapResponsesRequest()` and any relevant chat/completions translation helpers without creating a Pi-only branch.
3. Add request-mapping regression tests using Pi-shaped and Craft-shaped requests that prove:
   - Pi continuation/session-affinity metadata survives ingress translation
   - Craft declared-tools and active-tool-turn semantics are unchanged
   - non-tool requests that mention tools remain non-tool-bearing
4. Keep `provider-openai` and `provider-litellm` request-building tests aligned so the new ingress fields reach the provider surfaces when configured.
5. Update `packages/pi-role-model` only if additive request-detail/inspection parsing is required for the new receipts; preserve backward compatibility otherwise.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/packages/provider-litellm/test/index.test.ts`
- `packages/pi-role-model/test/**` (only if additive compatibility coverage is needed)

**RED/GREEN evidence**

- RED: `evidence/logs/addendum-01/sp62-i-ingress-fidelity.red.log`
- GREEN: `evidence/logs/addendum-01/sp62-i-ingress-fidelity.green.log`

### SP62-J — actual retry/reroute/idempotency receipts and deterministic fault proof (`F3`)

**TDD mode:** strict

**Plan**

1. Thread actual recovery facts from the execution loop into the canonical observation bundle:
   - retry count
   - reroute count
   - cooldown decision
   - failure class at the failed attempt
   - idempotency decision
   - tool side-effect state
2. Introduce explicit attempt accounting so request-detail evidence can distinguish:
   - same-endpoint quick retry before tool execution
   - reroute to a new endpoint after a failure
   - failure after observable tool work where automatic replay is blocked
3. Add deterministic upstream fault harnesses that force:
   - transient same-endpoint retry success
   - first-endpoint failure plus successful reroute to a second eligible endpoint
   - tool-bearing failure after a persisted tool receipt, proving replay guard behavior
4. Extend the validator corpus and focused tests so recovery cases must carry non-default receipts and machine-readable evidence.
5. Repair Phase-5-style top-level summaries so recovery cases cannot be silently omitted from the authoritative rebuilt-runtime receipts.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/addendum-01/sp62-j-recovery-receipts.red.log`
- GREEN: `evidence/logs/addendum-01/sp62-j-recovery-receipts.green.log`

### SP62-K — rebuilt-runtime Pi/Craft agent-path verification harness (`F4`)

**TDD mode:** strict for new harness logic; pragmatic only for external live-provider instability with explicit compensating evidence

**Plan**

1. Add repo-owned operator verification helpers that issue rebuilt-runtime requests through actual downstream emitter paths:
   - Pi path through `@try-works/pi-role-model` discovery/provider flow
   - Craft path through a repo-owned Craft ask-mode emitter/harness derived from the checked-in Craft fixture families
   - use the `2026-07-08` live agent-path pilot under `evidence/runtime/addendum-01-live-agent-path/` as the minimum parity seed, then extend it to isolated rebuilt-runtime proof
2. Keep payload-shape HTTP probes as supplemental diagnostics, not the authoritative Phase 5 proof.
3. Ensure the rebuilt-runtime receipts for Pi/Craft agent-path cases capture:
   - request JSON
   - response JSON
   - telemetry row
   - request detail
   - router decision
   - endpoint profile
4. Require recovery cases in the rebuilt-runtime summary so the top-level Phase 5 machine-readable receipt includes the non-zero retry/reroute/idempotency scenarios.
5. Re-run the local critical validation floor and keep `R11` explicit:
   - required local suites and packaging/runtime validation must pass before live QA
   - GitHub CI remains required on the follow-up changeset before final closeout claims

**Primary files**

- `packages/pi-role-model/**` (verification harness only if needed)
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `scripts/operator-inspect-craft-agent-payload.ts` or a new repo-owned Craft emitter helper if the existing script is insufficient
- new addendum-scoped runtime verification scripts under `scripts/` if needed
- Phase 5 rebuilt-runtime evidence outputs under `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-01/`

**RED/GREEN evidence**

- RED: `evidence/logs/addendum-01/sp62-k-agent-path-runtime.red.log`
- GREEN: `evidence/logs/addendum-01/sp62-k-agent-path-runtime.green.log`

## TDD compliance summary

TDD Mode: `strict`

Policy:

- No production TypeScript change is accepted without a failing focused test first.
- New rebuilt-runtime verification helpers may be implemented after the failing harness/spec assertions are recorded.
- Live-provider instability does not waive RED/GREEN discipline; it only affects how Phase 5 external variability is interpreted after the deterministic proof is green.

| Slice | RED required | GREEN / follow-up proof |
| --- | --- | --- |
| `SP62-H` | yes | hop-accounting persistence + corpus artifact verification |
| `SP62-I` | yes | Pi/Craft request-mapping + provider-shaping verification |
| `SP62-J` | yes | deterministic retry/reroute/idempotency verification |
| `SP62-K` | yes | rebuilt-runtime Pi/Craft agent-path verification |

## Phase 4 verification floor (addendum)

Run from worktree `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening`.

Focused commands:

- `corepack pnpm --filter @role-model-router/adapter-execution exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/provider-litellm exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/openai-codex-subscription-matrix.test.ts test/craft-ask-difficulty.test.ts test/alias-capability-routing.test.ts test/validate-vendors.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model run test`

Broader local validation after focused suites:

- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-packaging`

Pass criteria:

- the repaired suites prove distinct hop accounting, actual recovery receipts, and ingress fidelity
- validator artifacts fail if recovery cases or required hop fields are missing
- local packaging/runtime validation passes before rebuilt-runtime QA begins

Aggregate log:

- `evidence/logs/addendum-01/phase4-verification-floor.green.log`

## Phase 5 rebuilt-runtime re-verification matrix (addendum)

All scenarios run against a rebuilt runtime started from the run-62 worktree under an isolated addendum-specific state root. The authoritative Phase 5 proof must use Pi- and Craft-path requests, not only hand-authored JSON posts.

| ID | Scenario | Request path | Pass criteria | Evidence |
| --- | --- | --- | --- | --- |
| `Q-B1` | Pi exact Codex tool-bearing turn | actual `@try-works/pi-role-model` path to the rebuilt runtime | request succeeds on the native Codex family; request-detail/telemetry show the agent-path request, tool-bearing semantics, and distinct hop bytes | request bundle + request-detail + telemetry-row |
| `Q-B2` | Pi continuation with session affinity and transport preference | actual Pi Codex/Responses path using `sessionId`, continuation metadata, and the configured transport preference | request-detail shows `sessionAffinity.sessionId`, `x-client-request-id`, continuation metadata, and bounded continuation growth across the hop receipts | request bundle + request-detail + telemetry-row + hop-bytes summary |
| `Q-B3` | Craft declared-tools ask-mode request | actual Craft emitter/harness path derived from the checked-in Craft preamble + declared-tool fixtures | request stays tool-capable before first tool call, routes to the expected family, and retains declared tools in request-detail evidence | request bundle + router-decision + request-detail |
| `Q-B4` | Craft inline-image request | actual Craft emitter/harness path derived from the checked-in inline-image fixtures | non-text capability routing excludes incompatible endpoints before scoring and selects an eligible endpoint/family | request bundle + router-decision + telemetry-row |
| `Q-B5` | Pi transient retry case | actual Pi path against a deterministic transient-failure harness | request succeeds after same-endpoint retry with `retryCount >= 1`, `rerouteCount = 0`, and no tool side effects | request bundle + request-detail + telemetry-row |
| `Q-B6` | Craft reroute case | actual Craft path against a deterministic first-endpoint failure with an alternate eligible endpoint | request succeeds after reroute with `rerouteCount >= 1`, selected endpoint changed, and failure/reroute facts visible in receipts | request bundle + request-detail + telemetry-row + router-decision |
| `Q-B7` | Tool replay guard case | Pi or Craft tool-bearing path with a deterministic failure after a persisted tool receipt | request-detail shows `idempotencyDecision` / `toolSideEffectState` blocking stale replay, and tool-execution evidence proves no duplicate side effect | request bundle + request-detail + telemetry-row + tool receipt evidence |

Phase 5 summary requirements:

- the addendum-specific rebuilt-runtime summary must include the recovery cases; they cannot live only in per-request folders
- each successful representative case must have request-detail and telemetry evidence with non-default hop/recovery facts where applicable
- the repaired Phase 5 receipt must distinguish:
  - pre-dispatch degraded-family selection
  - same-endpoint retry
  - post-failure reroute

## Implementation order

1. `SP62-H` first, because the hop-accounting contract must exist before the validator corpus or live receipts can prove `R5` / `R9`.
2. `SP62-I` second, because the ingress fidelity fix is the smallest shared-contract correction and it enables the Pi-path live proof.
3. `SP62-J` third, because the execution loop already retries/reroutes and now needs actual receipt plumbing plus deterministic proof.
4. `SP62-K` fourth, because the rebuilt-runtime harness must consume the repaired hop/recovery receipts and prove them through Pi/Craft emitter paths.
5. Re-run the focused/local validation floor.
6. Rebuild the runtime and execute `Q-B1` through `Q-B7`.
7. Treat GitHub CI as still required before any final closeout claim that `R11` is fully green.

## Traceability

| Requirement / finding | Slice | Verification |
| --- | --- | --- |
| `R1`, `R2`, `F2` | `SP62-I` | host-bridge/provider regression tests + Pi/Craft agent-path rebuilt-runtime cases |
| `R4`, `F2` | `SP62-I`, `SP62-K` | native Codex agent-path verification + non-text routing proof |
| `R5`, `F1` | `SP62-H`, `SP62-K` | hop-accounting persistence + continuation-growth rebuilt-runtime proof |
| `R6`, `F3` | `SP62-J`, `SP62-K` | deterministic retry/reroute/idempotency tests + rebuilt-runtime recovery cases |
| `R8`, `F1`, `F3` | `SP62-H`, `SP62-J` | request-detail/telemetry field expansion with non-default recovery facts |
| `R9`, `F1`, `F3` | `SP62-H`, `SP62-J` | repaired corpus artifact + recovery-case inclusion |
| `R10`, `F3`, `F4` | `SP62-J`, `SP62-K` | rebuilt-runtime Pi/Craft agent-path verification with recovery cases |
| `R11`, `F4` | `SP62-K` | local verification floor + explicit GitHub CI follow-up requirement |

## Out of scope

- editing locked base run-62 artifacts outside this addendum path
- patching Pi upstream or Craft upstream to compensate for runtime defects
- replacing the native Codex Subscription execution family with a generic LiteLLM wrapper
- broad provider onboarding or unrelated runtime UI work outside the verification helpers needed for the repaired proof

## Coverage Gate

- [x] The audit findings are mapped to concrete follow-up slices
- [x] The missing hop-accounting and corpus-artifact truth problem is explicitly addressed
- [x] The missing Pi/Craft ingress fidelity fields are explicitly addressed
- [x] The recovery receipt and overclaimed fallback-proof problem is explicitly addressed
- [x] The rebuilt-runtime matrix now requires Pi- and Craft-path requests rather than synthetic payloads alone
- [x] The local verification floor and `R11` closeout expectation are explicit
- [x] The locked run-62 history remains supplemented by a current-phase upstream-gap addendum only

Coverage: PASS

## Approval Gate

- [x] The remediation plan is concrete enough to start strict-TDD implementation
- [x] The addendum records the plan amendment without rewriting locked run-62 history
- [x] The rebuilt-runtime verification burden is explicit enough to judge `R5`, `R6`, `R8`, `R9`, `R10`, and `R11` mechanically on the follow-up work

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: `tool_search` resolved `multi_agent_v1.spawn_agent` and `multi_agent_v1.wait_agent` on `2026-07-08`
- Delegation Decision Basis: this current-phase addendum required repo-document planning, artifact reconciliation, and direct traceability work more than parallel code changes
- Delegation Override Reason: the current session did not include explicit user authorization for delegated/subagent work, so the audited planning artifact remained local
- Audit Inputs Provided:
  - `00-requirements.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `08-memory-impact.md`
  - `addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
  - the Phase 5 rebuilt-runtime receipts and the implementation/test code refs cited above

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the locked run-62 requirements, plan, implementation, test, manual-QA, and memory-impact artifacts; verified the current implementation/evidence seams against the changed code paths and rebuilt-runtime receipts; reconciled the follow-up slices against the original run requirements
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

Audit: PASS
