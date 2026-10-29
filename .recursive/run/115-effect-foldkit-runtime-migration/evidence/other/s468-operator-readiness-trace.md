# S468 — packaged operator readiness stall trace (READ-ONLY)

Public host basis: `b9841f94`; private sidecar basis: committed `3d03ad78`. No source edits; this file only.

## 1. Readiness decision path

`GET /healthz` in `scripts/track-b/runtime-operations-server.mjs:9189-9215`:
- `:9201` `const operatorStatus = await operatorSurface.status();`
- `:9202` mandatory set `["trace","storage","replay","evaluation","learning"]`
- `:9203` `capabilitiesReady = every(capability => operatorStatus?.capabilities?.[capability] === "ready")`
- `:9204` `operatorReady = overall === "ready" && capabilitiesReady`; `:9205` 503 when false.

`operatorSurface` is created at `runtime-operations-server.mjs:9027-9038` with `service/stateRoot/channel/scope/authorizationEpoch/evaluationProcess/operatorProcess/replay` only. **No `status`, `storage`, or `traceRoots` callback is supplied.**

`status()` (`:3741-3800`) computes:
- supplied evidence is `{}` because no `status` callback was passed (`:3742`);
- overall evidence defaults to the storage-audit evidence (`:3747-3749`);
- trace: `capability === "trace" || !adapters[capability]` → **`unobservedOperatorEvidence()`** (`:3757-3758`), unconditionally; there is no trace adapter in `{replay,evaluation,learning}` (`:3751`);
- replay/evaluation probes call adapter `listJobs()` (`:3760-3763`), which for packaged hosts goes through `host.invoke` (`:1087`, `:1862`);
- capabilities map is the evidence state projection (`:3779-3781`).

## 2. Deterministic non-ready finding (not an await)

Because `trace` is always `"unobserved"`, `:9203` is always false for the auto surface, so `/healthz` always returns **503 / degraded** even when storage, replay, evaluation and learning are all ready. This is a **permanently unsatisfied condition**, not a promise that never settles. It explains a sidecar that runs and serves operator routes but never reports ready.

`operatorProcess.health()` (worker lifecycle) is defined at `:1415-1426` (all six `workerStates` require `lifecycle === "ready"` and integer pid) but is **not consulted by `/healthz`**; healthz only uses `replayComposition.scheduler.health()` (`:9195`). So a fully-ready packaged worker set does not by itself make operatorReady true.

## 3. Packaged-specific amplifier: missing staged manifest

- Public host resolves the manifest only for packaged profiles at `cli.ts:5313-5318` (`<exeDir>/track-b-runtime/track-b-runtime-manifest.json`), reads it at `:5319-5324`, and only passes `manifestPath` to the private sidecar when the text and path exist (`:12042-12043`).
- If the packaged dev layout lacks that file (or it is unreadable), the sidecar is launched without `--track-b-runtime-manifest`. The S426/S449 hardened scopes then return `null` early for a no-manifest open (private-layers evaluation/operator `open`), so `evaluationProcess`/`operatorProcess` are **null by design**.
- The sidecar still emits its `{type:"ready"}` line at `:9655-9665` after the server starts, so the public host launcher resolves (`track-b-runtime.ts:12972-12990`) and starts the host backend. But replay/evaluation adapter probes have no hosted worker, storage audit may be unobserved, and trace is unobserved, so healthz stays 503.
- This matches “sidecar runs, host ready, operator readiness never true.”

First never-satisfied item in this packaged case: the **operator `trace` capability** at `:3757-3758`; capability probes also fail/unobserved when the manifest was absent.

## 4. First unbounded await risk (if healthz itself hangs)

If `/healthz` never answers (rather than 503), the first unbounded await is `host.invoke` from the replay/evaluation `listJobs` probes:
- `packages/extension-host/index.mjs:221-274`: `invoke()` creates a `pending` promise and writes to the worker; there is **no per-invoke timeout**;
- pending resolves only when a worker frame arrives (`:170-181`);
- worker startup is bounded (`:150-169`, default `startupTimeoutMs = 2_000` at `:387`; registerProcess lifecycle `starting` at `:518` → `ready` at `:539`), but a worker that is already `ready` and silently ignores a request leaves `invoke` pending forever.

So: packaged 503 = trace unobserved (deterministic); packaged hang = a capability probe awaiting `host.invoke` with no response.

## 5. Proposed minimal diagnostic patch (NOT APPLIED)

Add bounded logs only; no behavior/timeout change:
1. `runtime-operations-server.mjs:9201` — wrap `operatorSurface.status()` with timing and log `{event:"operator-healthz-status", durationMs, overall, capabilities, readiness}` (capabilities only, no payloads).
2. `:3747-3775` — log `{event:"operator-status-probe", capability, state, durationMs}` per capability; for trace log the reason `"no supplied trace evidence"`.
3. `:1087` / `:1862` — log `{event:"operator-probe-invoke", domain, capability, requestId}` before `invoke` and on settle; this identifies the exact capability whose `host.invoke` does not return.
4. `packages/extension-host/index.mjs:263-272` — log `{event:"extension-host-invoke-pending", extensionId, requestId, capability}` after writing the frame (no timeout added).

## 6. Limitations

- Read-only source trace; no packaged exe run, no operator port, no provider call.
- The actual packaged dev state root/manifest presence was not inspected live; the missing-manifest branch is a code-path hypothesis consistent with the observed split.
- No claim that the trace capability should be removed or synthesized; that requires an owner decision/separate slice.

