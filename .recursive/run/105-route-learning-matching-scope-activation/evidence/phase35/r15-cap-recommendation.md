# R15 independent cap evaluation (production implementation paused)

The user questioned whether 16KiB rather than 256KiB/1MiB is appropriate. No follow-up production edits made while evaluating. The earlier observation-stub repair and bridge primary-error safeguard remain unchanged.

## Actual input histogram

Measured from diagnostic-actual-observation.json using reproducible [measurement script](./r15-cap-measurement.mjs); full numerical output [here](./r15-cap-measurement.json).

- dimensions JSON: **240535 bytes**.
- Both errorContext.message and errorContext.errorPreview.message: **120022 serialized bytes each** / 120020 UTF-8 text bytes.
- Removing those two messages leaves **469 bytes** of classification/endpoint/provider metadata. Message fields account for **240066 bytes, 99.8%** of the row.
- String-leaf histogram: 10 <=512-byte strings (max57 bytes), 2 >16KiB strings (both messages). This is one captured case, not a representative production metadata histogram.

## SQLite measurement

Single local Node24/SQLite run; 200 transaction-batched inserts and 100-row read/parse/serialize; synthetic at-cap padding measures capacity costs only. No changes to production guards or running DBs.

| Candidate | Row bytes | Insert200 ms | Read+serialize100 ms | SQLite200 bytes | 100-row serialized page bytes |
|---|---:|---:|---:|---:|---:|
|16KiB, actual messages external|469|2.3|1.6|110592|47013|
|256KiB, actual messages inline|240535|536.3|201.3|48340992|24053613|
|1MiB, actual messages inline|240535|450.2|122.5|48340992|24053613|
|16KiB at cap|16384|24.2|11.1|3387392|1638513|
|256KiB at cap|262144|482.7|157.9|52539392|26214513|
|1MiB at cap|1048576|2465.3|602.7|209997824|104857713|

These are illustrative local measurements, not a performance SLA or universal p95. SQLite physically accepts all tested sizes; a256KiB targeted writer cap would let this actual case through. That establishes technical feasibility, **not permission to retain raw provider content inline**.

## Independent boundaries / existing assumptions

- observation_json: schema INSERT/UPDATE triggers enforce16KiB compact classification. Original run94 compact tests rely on this; raising dimensions alone does not change these.
- JSON telemetry columns: writer uses16KiB for each independently; dimensions has no equivalent SQLite schema CHECK in current table. A targeted dimensions change is technically separable, no need to raise other columns.
- SP48 test explicitly expects20KiB dimensions.errorPreview raw string to throw. This is content-boundary behavior as well as numeric assumption. New R15 tests currently assume <=16KiB and require bounded structured errorContext/failedAttempts; revise intentionally if another budget is chosen, not hide incompatibility.
- Extension SDK frame ceiling was independently raised to1MiB (run104 addendum24). Frame limit is an **envelope**, not a per-record storage policy. Four actual240535-byte records nearly fill it before any other telemetry fields; at-cap256KiB fits at most3 rows with overhead; at-cap1MiB cannot fit a single row plus envelope. 100-record pages would exceed it even at16KiB worst case.
- Host input and worker output externalization remain separate16KiB policies. Raising persisted dimensions does not adjust them or paginated/filtered APIs. Host listTelemetryRequestRecords maps whole records, and filtering can read the complete set before pagination (index.ts24843-24849), so larger rows increase heap/read costs even without IPC.

## Recommendation pending controller/user decision

Keep budgets separate: (1) message preview512 serialized UTF-8 bytes, (2) bounded failed-attempt diagnostics8 entries, (3) metadata aggregate independently configurable/constant, (4) artifact original rich dimensions, (5) output/page/IPC independent.

**For this captured case:** recommend16KiB dimensions metadata aggregate with explicit projection/truncation and artifact pointer because469-byte essential metadata does not need256KiB; retaining duplicated120KiB raw messages defeats the original privacy/content policy and inflates read pages. This is not proof16KiB is optimal for all metadata. If legitimate metadata (not provider bodies) is measured beyond16KiB,256KiB targeted metadata cap can be reasonable **with byte-paged or artifact-backed downstream output and corresponding guards/tests**;1MiB per-row provides no evidenced benefit here and collides with1MiB envelope limits. Do not merely enlarge the cap to accommodate a content-projection bug.

## Precise RED already captured

[r15-dimensions.red.log](./r15-dimensions.red.log):3 genuine assertion failures before production follow-up edits, exact saved input in real temp SQLite both graph/no-graph plus Unicode/list aggregate stress:

> runtime telemetry dimensions_json exceeds16384bytes; externalize rich content via artifactRefs

Production follow-up still paused awaiting decision. Primary error422 execution_failed remains preserved in live backend evidence by the already-integrated caller safeguard.
