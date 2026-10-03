# T2.5 Effect primitive audit (executed)

Run: `104-replay-eligibility-and-evidence-fidelity`, Phase 2, task `T2.5`.
Executor: controller (the dispatched child `sp104_t25_effect_audit` produced nothing - see
`evidence/retries/sp104_t25_effect_audit-attempt-01.md`).

Sketch: `tmp-t25-sketch.mts` executed inside
`role-model-router/apps/runtime-host-bridge` with `corepack pnpm exec tsx tmp-t25-sketch.mts` (the script was
removed after the run; the content is reproduced below by its sketch numbers). Runtime: vendored
`effect@4.0.0-rc.117` via the workspace package.

## Sketch results

| # | Primitive | Observed result | Verdict |
| --- | --- | --- | --- |
| 1 | `Schema.Literals` + `Schema.decodeUnknownSync` / `decodeUnknownEffect` | `{"ok":"replay","rejected":true,"eff":"benchmark"}` - decodes valid values, rejects `bogus`, and the effect decoder resolves | pass |
| 2 | `Match.value` / `Match.when` / `Match.exhaustive` over the decoded string union | `"REPLAY"` for input `replay` | pass |
| 3 | `Data.TaggedError` + `Effect.timeoutOrElse({ duration, orElse })` | `{"tag":"UploadTimeout","afterMs":20}` | pass |
| 3b | `Effect.timeout` + `Effect.catchTag("TimeoutError", ...)` | `{"tag":"UploadTimeout"}` | pass |
| 4 | `Semaphore.make(1)` + `SynchronizedRef.make` with three concurrent updates | final value `3` | pass |
| 5 | `Effect.retry` + `Schedule.min([exponential, spaced])` | `{"result":"ok","attempts":3}` | pass **after correction** |
| 6 | `Metric.counter` / `gauge` / `histogram` + `Metric.update` | `"recorded"` | pass **after correction** |
| 7 | `Config.schema` + `ConfigProvider.fromEnvRecord` + `nested("role_model")` + `constantCase` | resolves `ROLE_MODEL_T25_FLAG` -> `"on"` | pass **after correction** |
| 8 | `PersistedQueue` import path `effect/unstable/persistence` | `{"make":"function","layerStoreSql":"function","layerCleanup":"function"}` | pass |

## API corrections (the value of this task)

1. **`Effect.retry` retries typed failures only.** The first sketch threw inside `Effect.sync` (a defect) and
   `Effect.retry({ times, schedule })` did not retry it (`FAIL -> transient`). Rebuilt with
   `Effect.gen` + `Effect.fail(new Transient(...))` and the same schedule: 3 attempts, then success. Any retry
   added by this run must fail through the typed channel (a `Data.TaggedError`), not by throwing.
2. **`Metric.histogram` requires `boundaries` in rc.117**: `Metric.histogram(name, { boundaries: [...] })`.
   Calling it with only a name throws `Cannot read properties of undefined (reading 'boundaries')`.
3. **`Config.string` does not exist in rc.117**; the primitive is `Config.schema(Schema.String, path)`.
   `ConfigProvider.fromEnvRecord(record)` + `ConfigProvider.nested("role_model")` +
   `ConfigProvider.constantCase` compose as the design doc described, and the `ROLE_MODEL_*` variable resolves.

No correction was needed for `Schema.Literals`, `Match.exhaustive`, `Data.TaggedError`, `Effect.timeoutOrElse`,
`Effect.catchTag("TimeoutError", ...)`, `Semaphore`, `SynchronizedRef`, `Schedule.min`/`exponential`/`spaced`, the
other metrics, or the `PersistedQueue` import path.

## Effect on the plan

- `R15`'s primitive map stands; the plan's retry guidance now states the typed-failure rule, the required
  histogram boundaries, and the `Config.schema` form.
- No sub-phase may start until its Effect work follows these three corrections.

## Unverified

- A live `PersistedQueue` store was not constructed (the API surface was checked only).
- `ConfigProvider.fromEnv` (the options-object form) was not exercised; only `fromEnvRecord` was.
