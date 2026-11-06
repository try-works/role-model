# S628 / task-104 - CHARTS blank on overview + observe (fixed)

## Reproduction (pre-fix, http://127.0.0.1:3480)
- GET /api/role-model/telemetry/summary?windowMs=  (EMPTY windowMs emitted by the shell rail's dashboard read).
- Overview SVG survey: cache/cost charts rendered 0 series paths; 6 charts shared one global hasData flag, so
  charts with no bound series drew an empty axis area that read as measured data.
- Root cause 1 (data binding): view.ts built input/output/cache/cost series from emptyPoints() placeholders; only
  "Total tokens" and latency used bucket values. The per-request metrics items DO carry
  tokens.{input_tokens,output_tokens,cache_tokens}, so token/cache series were derivable but never bound.
- Root cause 2 (query): READBACK_SPECS.dashboard/overviewMetrics pathFor(undefined -> "") produced "windowMs=".
- Root cause 3 (empty state): telemetryChartCard rendered the empty copy BELOW the blank plot, never inside it.

## Fix
- view.ts: buckets now aggregate inputTokens/outputTokens/cacheTokens beside total/success/failure/avg/p95; the
  token/cache/latency/volume series are built from those buckets. Cost charts keep honest empty states because the
  metrics payload has no cost facts (verified: item keys carry tokens/duration/status only).
- telemetryChartCard: per-chart hasData; when there is no series the message renders INSIDE [data-chart-plot]
  (data-chart-empty-message) in loading/error/empty variants. A chart never shows an empty axis without a reason.
- readback.ts: dashboard + overviewMetrics pathFor default to 86400000 when the id is empty, so the shell rail never
  emits "?windowMs=". init.ts: the rail always passes 86400000 for the dashboard/metrics reads.
- Restored the chart DOM contract the overview tests depend on: data-overview-buckets (non-empty count),
  data-overview-items, data-overview-labels, chart tables and the original empty copy.

## Verification
- TDD: s628-charts-data-binding covers real token/cache/latency/volume paths, in-plot cost empty states,
  empty-window in-plot states, observe routing in-plot empty state, and the no-empty-windowMs URL contract.
  RED transcript: evidence/logs/s628-charts-red.log. The test file was authored in the fix commit bff0cb9a, so it
  does not exist at bff0cb9a^; the RED run used a clean detached worktree at bff0cb9a^ = f7939095 and copied the
  committed test from bff0cb9a into it, leaving product sources pre-fix. That run failed 5/5 (the data-binding, in-plot empty-state and empty-windowMs URL assertions all fail pre-fix).
  The canonical RED is the 5/5 transcript in s628-charts-red.log; the later GREEN run is
  evidence/logs/s628-charts-red-green.log. Git-history note: the initial commit message described an interim in-place
  harness run, which is not the committed evidence.
- Affected suites: s628 + s40b + s75a = 15/15 (evidence/logs/s628-charts-affected.log).
- Full UI suite: 102 files / 941 tests PASS, tsc 0 (the pnpm test chain runs tsc first);
  evidence/logs/s628-charts-full-ui.log.
- Post-fix browser evidence on an isolated packaged host (pid stopped after capture, state copied from ui-review7):
  - Token usage 3 paths, Cache 2, Latency 2, Success/failure 2 rects, buckets=1 items=1, both readback URLs
    windowMs=86400000.
  - Effective cost / Cost avoided: data-chart-plot > data-chart-empty-message inside the plot.
  - /observe/routing "Routing analytics volume" and /requests "Request volume": honest empty state inside the plot.
  - evidence/logs/s628-charts-after-3484.png, s628-charts-after-3484-dom.json, s628-charts-evidence.json.
- :3456 /app reference for the same Day window had no request items, so all its charts render the empty copy; the
  fixed Foldkit page now does the same when empty and draws real series when items exist
  (evidence/logs/s628-reference-3456-app.png).

## Honest remaining gap
- Observe requests/routing volume charts do not fetch the metrics page on those routes, so they render the in-plot
  honest empty state rather than a series. Binding them requires adding overviewMetrics to those routes' read plans
  (out of this fix's scope); recorded here instead of faking data.
