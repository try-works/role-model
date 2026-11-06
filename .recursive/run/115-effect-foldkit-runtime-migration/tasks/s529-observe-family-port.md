# S529 - port the observe family to structural parity

Status: pending
TDD Mode: strict per page + structural acceptance gate
Public basis 50d251ab.

Reference sources: role-model-router/apps/runtime-ui/app/routes (requests.tsx, observe-*.tsx, activity, logs, queues), components/observe-chart-block.tsx, lib/observe-chart-adapter.ts, lib/telemetry-chart-config.ts; audit D:/DEV/rm-clean/audit/gaps-b.md keys _app_observe_*.

Deliver in order: /requests (Telemetry request ledger table with reference columns + full filter surface), /observe/activity (Host activity and metrics, Recent host activity, Capture inspector), /observe/logs (Structured log rows table), /observe/routing (Routing analytics filters + charts), /observe/observability-snapshot (measured-metrics explanation + Refresh), /observe/store-degradation-receipts (dual-store receipt rows). Reuse src/features/overview/charts.ts primitives; inline SVG only.

Strict RED per page: a structural test asserting the reference section titles and control envelope fails on HEAD. Acceptance per page: route-dump textLen >= 0.9 x reference and reference titles present. Suites + UI tsc 0 + s247 3/3 + nonempty anti_slop_lint zero added-line; freeze hashes; independent review; no commit. No other families.