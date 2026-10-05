# R15 follow-up: actual dimensions_json repair

TDD Mode: strict. Scope: owned sqlite-memory/src/index.ts and legacy-migration.ts plus new run105-telemetry-failure-dimensions.test.ts. No commits, no host edits, no global cap change.

## Actual failure / RED before production edits

[r15-dimensions.red.log](./r15-dimensions.red.log):3/3 genuine assertion failures using exact saved live nonsensitive diagnostic-actual-observation.json, real temporary SQLite, graph/file-artifact and no-graph. Exact error:

> runtime telemetry dimensions_json exceeds 16384 bytes; externalize rich content via artifactRefs

The observation stub repair was working; independent dimensions_json copied input.dimensions unchanged. Captured dimensions240535B; two duplicated messages120022B each; essential classification metadata469B.

## Deliberate budget decision

Implementation was paused to evaluate16/256/1024KiB rather than presuming16optimal. [Cap recommendation](./r15-cap-recommendation.md), [measurement output](./r15-cap-measurement.json) and [reproducible script](./r15-cap-measurement.mjs) compare SQLite/page costs. Parent conveyed direct human approval to keep16KiB for SQLite footprint/latency **for this repair**, not a universal optimum or request-size limit.

Independent policies:16KiB metadata aggregate;512serialized UTF-8 JSON bytes/message;8failedAttempt entries;8KiB diagnostic preview aggregate. No global constant/other-column/IPC changes.

## Repair

- Only recognized structured dimensions.errorContext/errorPreview/failedAttempts are projected. Preserve allowlisted primary identifiers, class/code/type/status/retry/fallback/cooldown facts. Bound message previews by existing Unicode/JSON-safe512B helper with explicit original byte counts/truncation.
- Rich capture trees/prompts/raw responses under recognized diagnostics are excluded. Omitted field receipt bounded to32 entries; recursion bounded. The original SP48 malformed raw20KiB errorPreview scalar remains rejected; existing test unchanged.
- Necessary non-diagnostic metadata is preserved verbatim, not silently evicted. UTF-8 metadata16383/16384B succeeds unchanged;16385B fails explicitly with the existing dimensions byte guard. Primary-error bridge guard owns propagating original provider failure if persistence fails.
- Aggregate preview pressure sheds message bytes before diagnostic IDs/status/class. If diagnostic **facts** alone exceed8KiB, preserve facts and emit diagnostic_facts_budget / diagnosticFactsAvailable=true / measured size receipt as an honest budget exception; final16KiB metadata guard still applies. No invented claim that facts were truncated.
- GraphStore-generated artifact content stays additive/observation-compatible: {...observation,telemetryDimensions:originalDimensions}. Persist dimensions.artifactRef pointer; preserve original rich dimensions in artifact. Existing externally supplied artifactRef is treated as caller-owned authority; this repair does not rewrite caller artifacts or claim a second write occurred.

## Exact actual GREEN and verification

- [r15-dimensions.green.log](./r15-dimensions.green.log): actual3/3 plus original SP48 tests7/7.
- [r15-dimensions-diagnostic-budget.red.log](./r15-dimensions-diagnostic-budget.red.log): independent aggregate policy2 genuine assertion REDs before aggregate code edits.
- [r15-dimensions-final.green.log](./r15-dimensions-final.green.log):29/29 focused dimensions+original observation stub+SP48 tests.
- [r15-dimensions-boundaries-final.green.log](./r15-dimensions-boundaries-final.green.log):9dimensions +4SP48 tests13/13 after strengthening above-cap assertion to exact thrown guard.
- [r15-dimensions-suite.green.log](./r15-dimensions-suite.green.log):full SQLite suite **139/139 tests,24/24 files**, exit0.
- [r15-dimensions-typecheck.log](./r15-dimensions-typecheck.log):tsc --noEmit exit0.
- Scoped git diff --check clean.

Actual original dimensions240535B -> **1790B no graph /2014B graph**. Unicode100-attempt stress ->8969B final dimensions, diagnostic subtree<=8192B. Primary422execution_failed, request/route/endpoint IDs, retry2/reroute1 and stream789/3/7 counters verified exactly. No mutation of saved input; artifact retains full original dimensions.

## Source identity for next controller build

SHA256:
- sqlite-memory/src/index.ts:b909313595fc0fcdc36cde3b5c9df267c482a02e2633fe6371409f4534eb742a
- sqlite-memory/src/legacy-migration.ts:bd621547ad897ba77650eb19af8f861f501e6bd42ff6943070bae63ed8374a9e
- sqlite-memory/test/run105-telemetry-failure-dimensions.test.ts:de140881b613fc396cb42a15c863c0ab3637c170708b17a3ca856f9b3625be23

New test reads controller-owned nonsensitive saved evidence r15-hotfix-build/diagnostic-actual-observation.json: include fixture in controller commit/repro bundle. Parent notified. Live dev :3458 and hotfix rebuild/source identity verification remain controller-owned and are not claimed completed here.
