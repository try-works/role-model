# S284 packaged-gate studio-run FAIL — read-only diagnosis (bounded)

Gate 0.0.20-266 log `E:/rm-tmp/s284-packaged-gate.log`: 20/20 routes PASS, 20/20 click sweeps PASS,
control 400 PASS, **1 failure**: `studio run: clicked -> raw:loading` at the audit's bound.
No product/runtime/provider writes; no code edit. Read-only.

## What the bound actually is

The 15 s is the AUDIT's wait, not a product timeout: `scripts/runtime/audit-rendered-ui.mjs:394`
`AUDIT_STUDIO_TIMEOUT_MS ?? 15000`, polled every 300 ms (:395-400), after a fixed 1.5 s settle
(:390). The product command has **no client-side timeout**: `defineDispatchStudio`
(`apps/runtime-ui-next/src/commands.ts:306-330`) is a plain `Effect.tryPromise` around the client
`fetch` with no `Effect.timeout`. A slow fixture therefore holds `raw:loading` forever; the gate's
wait is the only bound. The 25 s direct success and the 264 ms known-catalogue POST are observations of
**different requests** on the same artifact; neither measured the failed gate POST, so an under-measured
gate wait remains a HYPOTHESIS, not an established cause.

## Evidence status: measured vs unmeasured (correction)

**Measured** (Lead, fresh same artifact, browser): a `POST /v1/chat/completions` with body model
`claude-3.7-sonnet`, HTTP 200, latency **264 ms — after the catalogue was already known**. That is one
request under one state, and it is NOT the request that failed.

**Unmeasured**: the failed gate POST's body model, its response status and its latency. The audit records
none of them (`audit-rendered-ui.mjs:391-400` clicks and reads only the DOM state). Consequences:

- the **default-model race is a HYPOTHESIS**, not resolved: the 264 ms success does not prove the failed
  gate sent the default model (or vice versa);
- **latency for the unmeasured request is NOT refuted**: a different model/state could still be deferred or
  slow, and the 25 s direct success was also a different request;
- readiness state at click, and race vs sidecar contention, are **unknown** from the current evidence.

Settling any of these needs the failed request itself captured, not another successful run.

## Token-keyed cancellation hypothesis — REFUTED by the code

- `DispatchStudio` declares **no `interrupt`** (`commands.ts:306-330`), so it is not in the runtime's
  interrupt registry; a token change cannot cancel it.
- Telemetry/revision updates never touch `studio`: the S278 `RuntimeTelemetryReceived` branch only
  re-reads the current route's reader and for `Studio` (`readbackKeyForRouteTag("Studio") === null`)
  returns `{ model }` unchanged. `RuntimeRevisionReceived`'s branches likewise leave `studio` alone.
- Re-clicks while loading are ignored: `StudioRunRequested` returns `{ model }` when
  `current.status === "loading"` (`update.ts:571-573`), so a repeated-click/duplicate-dispatch storm is
  not how this fails.
- A tab/state reset would set the model back to `studioIdle(...)` (status `idle`), not leave it
  `loading`; the observed `raw:loading` therefore means the reducer never received
  `StudioLoaded/StudioFailed` at all, not that a stale token dropped it
  (`update.ts:582-598` only fences *mismatched* tokens).

## Model-selection hypothesis — PLAUSIBLE, UNPROVEN (needs the failed request captured)

`StudioRunRequested` sends `current.model` unless the catalogue readback is `ok`:
`configuredModels.status === "ok" ? rows : []` and it falls back to `current.model` when the default is
absent (`update.ts:574-578`). On a direct `/studio` load the Studio branch does request
`configuredModels` (`update.ts:191-213`), but the audit clicks Run only 1.5 s later
(`audit:390-391`); if that readback is still `loading`/`error` at click time, the body uses the fixed
default `moonshot/kimi-k2.5` (`studio.ts:82`), not the fixture's served model. Whether the fixture
defers or errors for that model is unproven: the gate records neither the POST body nor the response
latency/status, and the measured 264 ms success used a different model with the catalogue already known.

## Exact measurement needed (Lead's fixture; read-only, no code change)

In the gate's studio step, capture for the `POST /v1/chat/completions`:
(a) request body `model` and path; (b) `readbacks.configuredModels.status` at click time;
(c) click -> response latency; (d) fixture response status/body; and (e) the same for the direct
browser run that succeeded within 25 s.
Decision rule:
- response <25 s with the **same** model body as the direct run -> the gate's 15 s wait is
  under-measured; set `AUDIT_STUDIO_TIMEOUT_MS` from measured latency (not blindly), and record the
  measurement.
- body model differs from the fixture's served model while `configuredModels` was not `ok` at click ->
  it is the S207 default-model path race, not latency: the run must wait for the catalogue readback
  (or the fixture must serve the default) before clicking Run.

Do not increase the timeout without (a)-(d): one gate failure is a FAIL, not a PASS, and a blind bump
would hide a wrong-model request.

## Cross-checks

- `s284-packaged-gate.log` shows `/studio` route and click-sweep PASS, so routing/tab rendering works;
  only the run response is missing.
- No evidence in the current log of an HTTP error: `StudioFailed`/`StudioLoaded(>=400)` would render
  `error:...` and the audit would stop with `error:` (`audit:398`) — it reported `raw:loading`, i.e. the
  reply never arrived inside the window.
