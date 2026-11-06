# S39 reference UI (0.0.20 at :3456/app) vs the Foldkit port

The owner pointed at the live reference. Captures in `evidence/reference/`. This is a READ-ONLY observation of the operator runtime: nothing was written to it and no operator port was bound by this run.

## What the reference shows

| Section | Reference (0.0.20, `:3456/app`) | Port (packaged candidate) |
|---|---|---|
| global shell | top nav: Overview, Studio, Local, Remote, Models, Router, Observe, Connect, System, Learning; right rail with MODELS / REQUESTS counts, CACHE %, ROUTER ENDPOINT, execution mode | equivalent nav (Overview/Diagnostics/Observability/Receipts/Queues/... flat list), no counts rail, no cache%, no execution-mode badge |
| Overview | "Runtime overview" with latency chart (average + p95), success-vs-failure volume chart, time-window filters (Day/Week/Month/90 days), source/status/bucket filters | Dashboard route is a READBACK TABLE (state empty in this artifact); no charts, no filters |
| Studio | "Chat workspace" with tabs Chat / Images / Audio / Rerank / Advanced APIs, model picker, request composer | absent (wave 4): `/v1/messages`, `/v1/images/generations`, `/v1/audio/*`, `/v1/rerank` return 404 JSON in the packaged host |
| Observe | "Telemetry request ledger" + "Recent telemetry requests" table | Requests / Observe logs / Observe routing as readback tables; no ledger detail columns observed yet |

## Consequence for the port

- The visual bar the owner set is not met by "route renders without error": the reference is a chart-and-filter product, and our Overview/Studio sections are tables or absent.
- Wave 4 is confirmed blocked by missing host endpoints, which the scoped fallback now reports honestly (404 JSON instead of 200 HTML).
- The chart surface the reference uses is the React `@role-model/ui` kit (recharts), which the review already flagged as the real gap behind the earlier "ECharts excluded" excuse.

## Next

The port needs, in this order: (1) the global shell rail (counts/cache/endpoint/mode) from data the host already exposes; (2) the Overview charts and window filters on top of the telemetry endpoints that exist; (3) the Studio tabs once the four `/v1` host endpoints exist; (4) the Observe ledger columns.
