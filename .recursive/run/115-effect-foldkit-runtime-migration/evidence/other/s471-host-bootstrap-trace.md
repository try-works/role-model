# S471 — packaged host bootstrap stall trace (READ-ONLY)

Public host basis `b9841f94`; private sidecar basis `3d03ad78`. No source edits; this file only.

## 1. Where packaged readiness is actually marked

The packaged branch does **not** use `cli.ts:12208-12209` (those are inside the non-manifest `else` branch). Packaged readiness comes from `awaitCliExtensionRuntime` (`cli.ts:3441-3473`), called at `cli.ts:12097-12110` with `bootstrapState`. It sets `bootstrapState.status = "ready"` only **after** `extensionRuntimePromise` resolves, `assertProductionExtensionRuntimeReady` passes, and `beforeReady(runtime)` resolves (`:3457-3464`). There is **no timeout around `beforeReady`**.

## 2. The only bootstrap-blocking awaits inside `beforeReady`

`beforeReady` starts at `cli.ts:12103`. In order:

1. `cli.ts:12141` — `await runtime.invoke(extension.descriptor.id, ...)` for each QA extension (`for` loop at `:12132`). Only blocks if `qaExtensions` is non-empty; the host extension invoke path has no per-call timeout (see S468 host invoke).
2. `cli.ts:12157` — **`await currentPostObservationOperations()?.retryContributionAggregates();`** — the only unconditional network await in `beforeReady`.
3. `cli.ts:12154` `schedulePostObservationDrain(runtime)` — returns `void` (`:8905-8909`), not awaited.
4. `cli.ts:12165` `startDurableRouteAdvisoryRefresh({...})` — returns a stop function synchronously (`:4078-4093`); its `refresh()` is launched in the background, not awaited.
5. `packagedRuntime.backend` — already created at `cli.ts:12028` via `createPackagedProductionRuntime` (it awaits sidecar `type:"ready"` and `createBackend` before reaching this point); not a pending await here.

`startCliExtensionRuntimeWatchdog` (`:12178`) is synchronous and cannot block startup.

## 3. Exact await that can never settle

**Primary: `cli.ts:12157` -> host `track-b-operations.ts:3091-3097` `retryContributionAggregates()` -> private `runtime-operations-server.mjs:9272` `POST /contribution/retry` -> `service.recordContributionAggregate({retryOnly:true})` (`:7800`).**

When a contribution client is configured and active, that path calls `contributionClient.flushAsync(sendEnvelope)` (`:7906`). The sender does `await (contribution.fetcher ?? fetch)(contribution.endpoint, { ... signal: controller.signal })` (`:7840-7845`) with an **AbortController that is never timed** — its signal is only aborted by revocation (`cancelActiveContributionDeliveries`). A pending outbox item against an unreachable/half-open cloud endpoint therefore leaves the sidecar request open.

The host call uses `requestPrivate(..., boundedContributionDeliveryTimeoutMs)` (`track-b-operations.ts:3092-3096`); that bound is `max(operationsTimeoutMs, 30s, 30s)` where the operations default is **600_000 ms** (`DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS`, `:974`; max at `:1735-1738`). So the host eventually rejects after ~10 minutes; `awaitCliExtensionRuntime` then sets `bootstrapState.status = "failed"` (`:3469`), not ready. Until that point (and forever if the request never aborts / the private fetch hangs and the timer path is not reached), `/healthz` stays `runtime_initializing`.

**Secondary (if `qaExtensions` is non-empty):** `cli.ts:12141` `runtime.invoke` has the same no-timeout hazard documented in S468 (`packages/extension-host/index.mjs:221-274`, pending resolves only on a worker frame `:170-181`). The first QA extension whose worker accepts but never answers blocks before `retryContributionAggregates` is reached.

**Not the cause:** extension `type:"ready"` from the private sidecar only resolves `trackB.start()` (`track-b-runtime.ts:12972-12990`); it does not mark host readiness. The host waits on its own extension runtime + `beforeReady`.

## 4. Diagnostic/isolation commits

`71151644` (diagnostic isolation) touches `composition-dag.ts`, `index.ts`, and diagnostics tests only; `bd1b9a52` (observation cache) touches `composition-dag.ts` and observation tests. **Neither touches `cli.ts`, `track-b-operations.ts`, or the post-observation/contribution contract.** `git show --stat` confirms no `cli.ts`/`track-b-operations.ts` changes, so they did not introduce the stalled await.

## 5. Proposed minimal diagnostic logging (NOT APPLIED)

No timeouts; diagnostics only:
1. `cli.ts:12103` — log `bootstrap-beforeReady-start`; at `:12140`/`:12150` log each QA `extensionId` before/after invoke; at `:12157` log `bootstrap-retry-contribution-start`, then `bootstrap-retry-contribution-end {durationMs}`; at `:12173` log `bootstrap-beforeReady-end`.
2. `track-b-operations.ts:3091` — log route `contribution/retry` start/end with timeout budget; `:3096` logs when the bounded request rejects.
3. `runtime-operations-server.mjs:9272` — log `sidecar-contribution-retry-start` and `...-end {status}`; `:7906` log `flushAsync-start {queued}` and `...-end {delivered}`; `:7840` log `aggregate-fetch-start {attempt}` and `...-settle {outcome}` without endpoint/payload.
4. `awaitCliExtensionRuntime` (`:3462`) — log `extension-runtime-ready-beforeReady-start/end`; this proves whether the stall is `beforeReady` or the runtime promise itself.

## 6. Limitations

- Read-only source trace; no packaged exe run, operator port, or provider call.
- The concrete pending-outbox/cloud state in the packaged dev root was not inspected; the retry path is the only unconditional blocking await and matches a pending-forever host when the sidecar holds the request.
- The QA-invoke path is a second candidate only when `qaExtensions` is non-empty at runtime.

