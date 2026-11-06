# S365 — B1 (R20/R21) real diagnostics: precise gap characterization

Read-only characterization (no product edits, no RED/GREEN). Worktree public `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, HEAD 997c8d46.

## Exists today (default-off diagnostics API/page)

| Region | Citation | What exists |
| --- | --- | --- |
| Read contract (server half) | `apps/runtime-host-bridge/src/local-diagnostics-read.ts:1-130` | bounded read: path `:26`, 50-record/short 16 KiB caps `:27-29`, staleness rule `:30`, bounded record `{atMs,level,code,count}` `:35-41`, states `ok/empty/stale/dropped/disabled` `:65`, identity/loss/cursor/bounds types `:44-120`, explicit DEFERRED WIRE note `:20-25`. |
| Route / auth / CORS | `apps/runtime-host-bridge/src/index.ts:17548-17568` | GET only; dispatches BEFORE generic operator gate; `handleLocalDiagnosticsRead` reuses the one operator gate (`host/deviceOwnerTrust/operatorAuthToken/operatorContext`) `:17556-17562`; strips all Access-Control-* headers `:17563-17565`; source injected only when composed `:17561`. |
| Writer (R20 boundary) | `apps/runtime-host-bridge/src/module-health-writer.ts` (records/loss/ring) | four-scalar records, capacity/code caps, `recordError` + `recordCause`; tests show it distinguishes **Fail/Die/Interrupt** and keeps original causes: `test/module-health-writer.test.ts:54`, single report owner `:251`. |
| Composition / default-off | `apps/runtime-host-bridge/src/index.ts:20526-20625` | one writer built once; `diagnostics.enabled !== true` → undefined (default OFF) `:20563-20564`; `wireModuleHealth` injects `readDiagnosticsSource` by identity `:20612-20625`; the recorded R20 GAP `:20545-20551`. Option surface (placeholder limits, calibration is the decision): `index.ts:3526-3535`. |
| Live-socket tests | `test/run115-s15a-local-diagnostics-read.test.ts`, `test/s15h-live-socket-diagnostics.test.ts` | states/bounds/cursor/loss and "no fibers in body" (`:94`); reused auth, spoofed forwarded owner header rejected, spoofed Host not trusted, wildcard/reflected CORS never emitted (`:131-178`); real ephemeral-socket peer/auth/header tests (`s15h...:16-23, 110-127`). |
| UI client | `apps/runtime-ui-next/src/diagnostics-client.ts:1-130` | real fetch reader for `/api/role-model/operator/diagnostics` `:37`; bearer read credential `:62-86`; explicit 401/403 refusals `:59,115-126`; same-origin claim demoted to an assumption `:6-18`. |
| UI page / Foldkit | `apps/runtime-ui-next/src/diagnostics.ts`, `src/app.ts:57-76` | schema/parse (`diagnostics.ts:25-66`), states `ok/empty/disabled/stale/dropped/denied` (`:103`), render text `:237`, cause label `:226`; injected reader + default snapshot resync `app.ts:57-76`. |
| UI tests | `test/diagnostics-client.test.ts`, `diagnostics-e2e.test.ts`, `diagnostics.test.ts` | real-client states loop `:103`, denied 401/403 and spoofed owner headers, non-loopback refusal `:149`; real page mount over fetch client `diagnostics-e2e:112+`; narrow layout + visible focus `diagnostics.test.ts:382-407`, live-region semantics `:489-507`. |

## Required gaps (exists vs missing)

### (1) Calibrated Cause/error edge reporting — MISSING
- Exists: writer can classify Fail/Die/Interrupt (`module-health-writer.ts`, tests `:54`) and record causes.
- Missing: the ONLY report edge is the transport catch; it calls `recordError` which records **every escape as the coarse code "error"**, the Fail/Die/Interrupt `recordCause` classification is **not wired** to the edge, and a client-caused 4xx-ish escape is still counted as a module failure (explicit R20 GAP: `index.ts:20545-20551`; wrapper at `:20572-20574`).
- Missing: no calibrated ingestion/formatting/TTL/query decision in production — `diagnostics.enabled` is never set by the CLI (`cli.ts` has no diagnostics config; its `diagnostics` hits are comments and registry diagnostics `:3825`), so the "calibration is the decision" step at `index.ts:3526-3535` has not been taken.

### (2) Production query source — MISSING
- Exists: an in-memory writer source can be injected into the route when `diagnostics.enabled === true` (`index.ts:20612-20625`).
- Missing: `local-diagnostics-read.ts:20-25` records "DEFERRED WIRE — no runtime composition root supplies records, so outside tests the route answers disabled"; there is no persisted/SQLite/telemetry query source, no cross-instance/peer query, and production never enables the writer. Net: the production route always answers the explicit `disabled` state.

### (3) Real defect readback — MISSING
- Exists: the UI page and real fetch client render a live diagnostics route, including states, loss, staleness, identity and a cause label.
- Missing: nothing reads real defects through it: records are module-health counts only (`{atMs,level,code,count}`, `local-diagnostics-read.ts:35-41`); "defect" in `src` appears only in comments (no defect record/readback contract); with no production source (gap 2) the page cannot read real runtime defects at all.

## R21 clause check (satisfied / missing)

| Clause | Status | Evidence |
| --- | --- | --- |
| bounded local query + instance/build/loss/cursor | SATISFIED (contract + tests) | `local-diagnostics-read.ts:26-120`; s15a tests. |
| peer / trust / read-credential / Host / Origin / redaction | SATISFIED (tests) | s15a `:131-178`; s15h `:16-23,110-127`; client `:59-126,149`. |
| denied / stale / dropped / empty / disabled | SATISFIED (states + tests) | read states `:65`; client states loop `:103`; writer loss/staleness tests. |
| mobile / focus | SATISFIED (page tests) | `diagnostics.test.ts:382-407` (narrow layout + focus-visible), `:489-507` (live region). |
| no global fiber dump | SATISFIED | s15a `:94` asserts no `fibers` in body; bounded record shape. |
| reject spoofed forwarded owner headers / wildcard or reflected CORS | SATISFIED (tests) | s15a `:152-178`; real-socket s15h. |
| diagnostics cannot contaminate business/live aggregates | PARTIAL / UNTESTED | structurally separate in-memory writer, not wired into telemetry/business writes (composition at `index.ts:20526-20578`), but no explicit non-contamination test was found in the diagnostics suites. |

## Named first slice: S365a — calibrated module-health edge (gap 1)

Bounded, test-first slice: classify and calibrate the ONE reporting edge instead of widening the page.
- Wire the transport catch's report wrapper to classify Fail/Die/Interrupt via the existing `recordCause` path (not the coarse `recordError`), and stop counting client-caused 4xx escapes as module failures.
- Introduce the explicit calibration gate in the `diagnostics` option (approved capacity/code/ingress/TTL/query limits) so `enabled: true` requires calibrated values rather than writer placeholders.
- Tests (host): edge classifies Fail/Die/Interrupt; 4xx escape not counted; default-off unchanged; calibration missing → remains disabled; one report owner preserved.

Caller/region table for the first slice:

| Region | Role | Cite |
| --- | --- | --- |
| transport catch / report wrapper | the single report edge | `index.ts:20639-20720` (`createBridgeRequestListener`, report call) |
| composition report | coarse `recordError` today | `index.ts:20572-20574` |
| writer classification | `recordCause` (Fail/Die/Interrupt) | `module-health-writer.ts`; tests `module-health-writer.test.ts:54,251` |
| option calibration surface | placeholder limits + enabled | `index.ts:3526-3535` |
| route/read contract | unchanged by this slice | `local-diagnostics-read.ts`, `index.ts:17548-17568` |
| tests | edge classification/calibration | new host test beside `run115-s15a-local-diagnostics-read.test.ts` |

## State

No product edits. No RED/GREEN for a characterization. Follow-ons after S365a: S365b production query source (gap 2), S365c real defect readback (gap 3).
