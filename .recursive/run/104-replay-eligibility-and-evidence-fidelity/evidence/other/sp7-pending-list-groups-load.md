# Run 104 SP7 (`R10`) — the `evaluation:list-groups` load: measurement and proposed fix (NOT applied)

The brief asked SP7 to reduce/relocate the ~293 KB `evaluation:list-groups` polling load. The
producer is **not** in SP7's write scope, so this file carries the measurement and a ready hunk for
the controller. Nothing here was applied.

## Who actually polls (the brief's premise is wrong)

The brief (and `01-as-is.md`) attributes the poll to "the private operator plane". The private
evaluation-core durable-output store says otherwise: every retained `evaluation:list-groups` call
carries the request prefix `finalization-signals`
(`role-model-router/apps/runtime-host-bridge/src/cli.ts:6466`, the post-finalization signals sweep
introduced by run 100 addendum 39 — `sweepFinalizationSignals`, `cli.ts:6481-6499`). The private
operator plane's own calls would carry `operator:`/other prefixes; there are none in the store.

Query (read-only, `node:sqlite`):

```
file: C:\Users\erikb\AppData\Local\role-model-runtime-stage\standalone-runtime-stage\
      track-b\extensions\workers\evaluation-core\durable-output.sqlite
select substr(request_id,1,instr(request_id,char(58))-1) prefix, count(*), min/max(created_at),
       min/max(byte_length)
  from durable_extension_outputs where capability='evaluation:list-groups' group by prefix;
```

Result (2026-10-01T11:2xZ): one prefix, `finalization-signals`, every row exactly **293,159 bytes**.

| window | calls | bytes | cadence |
| --- | --- | --- | --- |
| last 30 min (10:45:52Z–11:15:25Z) | 61 | 17,882,699 | ~2.03/min (one per ~30 s tick) |
| retained window (store trims) | 118 | 34,592,762 | first retained 10:20:07Z |

That is **~35.8 MB/h** of extension-host reads *and* durable-output writes (the store grew to
123.3 MB); the evaluation store itself holds only 21 finalized groups, i.e. ~14 KB of `result_json`
per group per tick. `R10`'s third criterion ("the sidecar's per-tick work is bounded so a large
already-finalized store cannot consume the whole tick budget") is therefore still open.

## Why a smaller `limit` alone does not fix it

`collectPagedComparisonGroups` walks the capability's cursor until `hasMore` is false, so reducing
`limit` only converts one 293 KB call into several smaller ones with the same total bytes. The
extension also answers `evaluation:list-groups` with the full group + `result_json`, and the
extension host persists every large answer durably (that is the 123 MB store).

## Proposed fix (controller to choose; cli.ts is not SP7's file)

Option A (best, private + public): have the `evaluation:list-groups` page project the fields a
listing caller needs (id, status, members/outcome/comparability) instead of the whole `result_json`,
and let the existing receipt/validation readers ask for the detail by filter. Expected page size
drops from 293 KB to single-digit KB; every caller benefits. (Private file: SP5/SP10 territory.)

Option B (public only, one hunk): cache the sweep's listing across ticks — the finalized set only
changes when an evaluation finalizes, and the sweep already holds `finalizationSignalsSettled`:

```ts
// cli.ts, inside sweepFinalizationSignals()
let finalizationSignalsGroupsCache: { atMs: number; groups: readonly Record<string, unknown>[] } | null = null;
const groups = await (async () => {
  const nowMs = Date.now();
  if (finalizationSignalsGroupsCache && nowMs - finalizationSignalsGroupsCache.atMs < 5 * 60_000) {
    return finalizationSignalsGroupsCache.groups;
  }
  const listed = (await collectPagedComparisonGroups({ /* unchanged readPage */ })).filter(...);
  finalizationSignalsGroupsCache = { atMs: nowMs, groups: listed };
  return listed;
})();
```

Measured effect of a 5-minute re-list interval: 293,159 B per 5 min instead of per 30 s →
**~3.5 MB/h** (a 10× reduction, 17.9 MB per 30 min → 1.8 MB per 30 min), with the sweep's per-tick
settle set unchanged. Freshly finalized groups are picked up within 5 minutes — the same order as
the sweep's own ~1.8-minute tick budget and the learner's derivation cadence.

## Live baseline measured alongside it (read-only, no restarts)

| endpoint / source | result |
| --- | --- |
| `GET :3457/api/role-model/operator/queues` ×3 | no response: curl `000` at 20.006/20.019/20.020 s |
| `GET :3457/api/role-model/operator/learning/activity?windowMinutes=60&limit=24` ×3 | no response: curl `000` at 20.017/20.002/20.006 s |
| `GET :3457/api/role-model/operator/learning/measurement` ×3 (control) | `200` in 0.221/0.222/0.181 s |
| `E:\tmp\run103-evidence\stage-3457.err.log` | 1,018 `contribution upload degraded … timed out after 5000ms` lines (337 at Phase 1, 120 at requirements time), still appending |
