# S278 (R12) telemetry refresh — native slice report (FROZEN)

Native implementer: **deepseek-flash** (verified live via `list_agents`: target `s5-health-wait`, model
`deepseek-flash`, status running — not inferred from inactive metadata). Shared task: task-9 (rev 2,
in_progress, owner s5-health-wait).
Baseline: public HEAD `1cf15b85bf44ca6b2dee3c6d03c4f19a3ebd219d`; private `0c5216b69ea44126a67654bfe44655acb9d97eee`.
Mode: bounded native implementation, strict TDD, no children, no CLI, no commits, no provider/operator
calls, no full suite (Lead's integrated R12 job owns that). TMP/TEMP = `E:/rm-tmp`.

## Defect (verified source)

The original client subscribed both runtime events on one EventSource
(`apps/runtime-ui/app/lib/runtime-api.ts:3021-3026`); the telemetry payload is
`{ eventName, emittedAtMs, request, summary? }` with **no revision** (`runtime-api.ts:693-698`).
The Foldkit shell (`src/refresh.ts:61-78` before this slice) subscribed only `revision.update`, so a
newly persisted request never invalidated a telemetry page. Restoring it must not synthesize a
revision or disturb the revision gap/resync watermark.

## Product diff (frozen; 3 source files + 1 new test)

| File | numstat | What |
|---|---|---|
| `src/message.ts` | +5 / -0 | typed `RuntimeTelemetryReceived: { emittedAtMs: number; requestId: string }` (schema type map + `defineMessageUnion`) |
| `src/refresh.ts` | +57 / -4 | typed telemetry contract via `Schema.Struct({ emittedAtMs, eventName: Literals(["telemetry.update"]), request: Struct({ requestId }) })`; `Number.isSafeInteger(emittedAtMs)` and non-empty `requestId` guards; the SAME single source gets a `telemetry.update` listener; every offer guarded by the stream instance's `active` flag (set false in the finalizer before `source.close()`); revision decode untouched |
| `src/update.ts` | +33 / -0 | `RuntimeTelemetryReceived` branch -> `invalidateCurrentRoute(model)`: the current route's real read only (readback key -> `readReadback` token+1 with detail id; `Observability` -> `readObservability` token+1; other routes -> no command). Writes nothing to `refresh`: no `lastAppliedRevision`, no `resyncToken`, no status/message synthesis |
| `test/s278-telemetry-refresh.test.ts` | new | 6 behavioural tests (below) |

No other file changed. `git diff --numstat` exactly: message.ts `5 0`, refresh.ts `57 4`, update.ts `33 0`.

## RED (before production, actual)

`evidence/logs/s278-red.log` — `node ../../../node_modules/vitest/vitest.mjs run test/s278-telemetry-refresh.test.ts`
exit **1**, `Tests 5 failed | 1 passed (6)`. Failures (one root defect, no setup failure):
- "re-reads exactly the current data route for one telemetry event and never advances the watermark" -> `Error: the refresh subscription must listen for telemetry.update`
- "fences a late telemetry read by the per-key token and never touches the active route" -> same
- "preserves an existing stale gap watermark when telemetry arrives" -> same
- "ignores malformed telemetry instead of inventing a revision" -> same
- "disposes the one source exactly once and delivers nothing afterwards" -> `Error: the refresh subscription must register both listeners on one source`
- PASSED in RED (existing behaviour guard): "preserves revision decoding, dedupe and gap semantics".

## GREEN / types

`evidence/logs/s278-green.log` — same command, exit **0**, `Tests 6 passed (6)`, 189 ms.
`evidence/logs/s278-tsc.log` — `node ../../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`, exit **0**, empty output.

The six tests: (1) exactly one current-route `ReadReadback` + one real client GET executed through
`defineReadReadback(createReadbackClients({ fetchImpl }))`, readback `ok` with the seeded row, watermark
`0`/`resyncToken 0`/status `idle` unchanged; (2) revision decode/dedupe/gap preserved; (3) nine
malformed telemetry payloads (broken JSON, `null`, `[]`, missing request, missing requestId, string
`emittedAtMs`, wrong eventName, missing `emittedAtMs`, array request, `1e999` -> Infinity, fractional,
empty requestId) produce no message while the subsequent revision still applies; (4) late read fenced by
the per-key token after away/back, plus the explicitly documented inherited slot behaviour; (5) stale gap
preserved verbatim at the telemetry transition, with the inherited readback-resolution transition pinned;
(6) one source, close exactly once, retaining fake source invoking callbacks after dispose does **not**
throw and publishes nothing.

## Targeted regression lane (per file, sequential; no full suite)

`evidence/logs/s278-regression.log`:
- `test/s25b-refresh-owner-gap.test.ts` exit 0, 9/9
- `test/s26h-stale-clear.test.ts` exit 0, 13/13
- `test/s269-canonical-url.test.ts` exit 0, 81/81
- `test/s269-canonical-url.scene.test.ts` exit 0, 10/10
- `test/s26e-readback-routes.test.ts` exit 1, **24 failed | 25 passed (49)** — NOT a product regression:
  the shared refresh-loop assertion at `test/s26e-readback-routes.test.ts:478`
  `expect([...listeners.keys()]).toEqual(["revision.update"]);` now observes
  `["revision.update", "telemetry.update"]`, which is exactly the original wire contract this slice
  restores. The DOM/state tests for the same routes pass. This one assertion needs a **Lead-owned
  semantic update** (assert both keys, exact list, no weakening) — it is outside this slice's write
  scope (`refresh.ts`, `message.ts`, `update.ts`, new test only) and the Lead already owns an edit in
  that file (s279 signal-identity hunk at :360).

## Contract / design notes

- Consumed telemetry subset only: `eventName` must be `telemetry.update`, `emittedAtMs` a safe integer,
  `request.requestId` a non-empty string. The full request body is not re-declared (no fabricated
  fields); `summary` is ignored.
- No revision is invented anywhere: the message carries `emittedAtMs`/`requestId` only, and the
  reducer branch never writes `lastAppliedRevision`, `resyncToken`, or the refresh status/message.
- One source, close-once, and post-finalizer publication guard: the finalizer sets the instance
  `active` flag false before `source.close()`; a retaining source's late callback is a no-op.
- Scope boundary: current-route invalidation for the real data readers plus Observability. Control and
  learning routes are intentionally **not** invalidated by telemetry in this slice (no reader wired),
  stated explicitly rather than fabricated.
- INHERITED LIMITATION (recorded, not claimed as preserved): when a telemetry-triggered read completes,
  the shared `ReadbackLoaded` transition (`src/update.ts:481-484`) auto-marks refresh `live` and clears
  its message — identical to a revision-triggered read. The watermark and resync token stay untouched;
  the stale banner clears only on that successful completion, never in the telemetry transition itself.

## Anti-slop

Tool: `anti_slop_lint` (this session). New test file: **clean**. `src/message.ts`: clean. New telemetry
code (`refresh.ts:50-76`, `update.ts` `invalidateCurrentRoute`/`RuntimeTelemetryReceived`): clean.
Pre-existing findings only, untouched by this slice and reported rather than normalised away:
`src/refresh.ts:32` (`typeof EventSource`), `:80-81` (`decodeRevision` cast + `typeof`);
`src/update.ts:116-119, 470-510` (runtimeConfig snapshot/parse/overview branches).

## Frozen hashes / bytes

| File | Bytes | SHA-256 |
|---|---|---|
| `src/message.ts` | 7673 | 3B5540B924571A209D7042F49EA8A76D2B7998D7D6C98F75F3A604312A90C5A6 |
| `src/refresh.ts` | 5455 | A48BE129D57B2FB661F5E448EE6FE51F6E90D001B366400A9D350B39655981BC |
| `src/update.ts` | 33155 | 1F451AE71943B04373402927155D1A3F8506FBDF5FE27496FD2A6F4F47E643A2 |
| `test/s278-telemetry-refresh.test.ts` | 15853 | C45BC893D752B70FE7B5DD493B2D89947383D9C2BB85754F0A210C899001B5ED |

## S280A repair (post-freeze HOLD) — supersedes the update.ts + test hashes above

Formal reviewer HOLD (S280A): the new telemetry invalidator re-read the current route with
`readReadback({ id: detailId, key, token })` and no query. For the Index route
(`readbackKeyForRouteTag("Index") = "overviewMetrics"`, readback.ts:1169-1170) that produced
`/api/metrics/page?windowMs=` — an EMPTY window — dropping the selected `overviewWindowMs` and
`overviewFilters`; for the Dashboard route (`"dashboard"`, readback.ts:1175-1176, spec
readback.ts:757-763) it dropped the window `id`. The shell's own reads pass
`overviewQuery(filters, windowMs)` (update.ts:493/503) and `id: "86400000"` (init.ts:146, 198-202).

Strict RED (before the fix, `evidence/logs/s278-red-2.log`, exit 1, 2 failed | 6 passed):
- `expected undefined to be '?windowMs=3600000&sourceTypes=local&s…'` (Index command query)
- `expected undefined to be '7200000'` (Dashboard command id)

Minimal production change (ONLY `src/update.ts` `invalidateCurrentRoute`, now 44 insertions / 0
deletions vs baseline; no revision-branch refactor, no other file): inside the readback-key branch,
`const windowMs = model.overviewWindowMs ?? 86_400_000;` then
`const id = readbackKey === "dashboard" ? String(windowMs) : detailId;` and
`const query = readbackKey === "overviewMetrics" ? overviewQuery(model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS, windowMs) : undefined;`,
forwarded as `readReadback({ id, key: readbackKey, query, token })` — the command args are typed optional,
so `undefined` forwards as absent with no conditional empty-object spread (lint-clean; no behaviour
change). Detail ids and all other readback keys are unchanged.

GREEN after the fix: `evidence/logs/s278-green.log` exit 0, **8/8 tests** (6 original + Index window+
filters wire case incl. default `86400000`/no-empty-windowMs/stale-token fence, and Dashboard window id
case incl. default). `evidence/logs/s278-tsc.log` exit 0.

Fresh frozen hashes (supersede the table above for these two files):
- `src/update.ts` 33917 B 5C4232A2465407E979D11644EF158C8A8CD3ACE58E0EF36AC126D6DD218485CD (+44/-0)
- `test/s278-telemetry-refresh.test.ts` 21015 B E96B1845995E7020CD405740C49A1951AE4A646F22A9C06BD9F2B2E74C11460B
- unchanged: `src/message.ts` 7673 B 3B5540B9…A6, `src/refresh.ts` 5455 B A48BE129…BC

## Limits

No full suite (Lead's `pwsh-5605c31df81241a4` integrated job owns it), no packaging, no browser/client
trace evidence, no provider/operator calls, no commits. `s26e:478` needs the Lead-owned two-listener
assertion update before any integrated green can be claimed. This PASS is bounded to the R12 telemetry
invalidation slice, not full R12/R11 acceptance.
