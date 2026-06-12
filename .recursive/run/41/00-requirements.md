Run: `/.recursive/run/41/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-12T03:04:28Z`
LockHash: `383044572b041ce93f9778a8538a18361df4ea8d08e71fa54fbd7186126d1e2e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User request: dashboard latency display improvement
- Approved spec draft from session 260612-slim-meadow
Outputs:
- `/.recursive/run/41/00-requirements.md`
Scope note: UI-only change to the dashboard overview latency summary card. No backend telemetry aggregation changes.

## TODO

- [x] Elicit requirements from user/context
- [x] Define requirement identifiers (R1, R2, R3)
- [x] Write acceptance criteria for each requirement
- [x] Document out of scope items (OOS1, OOS2, OOS3, OOS4)
- [x] List constraints and assumptions
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Dashboard summary card shows both average and p95 latency

Description:
The dashboard overview currently displays a single "Latency" summary card where the headline value is the p95 latency and the average latency is shown in smaller detail text. When p95 latency is very high (e.g., 61,322 ms), this creates an alarming first impression even if the average latency per request is much lower (e.g., 1,240 ms). The card should present both numbers clearly so operators can see the typical per-request latency at a glance.

Acceptance criteria:
- The Latency summary card on `/app` (dashboard overview) displays both the average latency and the p95 latency.
- The average latency is visually prominent (primary value).
- The p95 latency remains visible as secondary context.
- The existing comparison rows (`/app/observe/requests` and `/app` comparison cards) already display both numbers as `"{p95} ms p95 / {avg} ms avg"` — this pattern should be consistent with or inform the summary card design.
- No changes to backend telemetry aggregation (`averageLatencyMs` and `p95LatencyMs` calculation in `runtime-host-bridge` and `sqlite-memory`).
- No changes to the `RuntimeTelemetrySummary` API contract.

### `R2` Latency detail text remains informative

Description:
The detail/sublabel text under the Latency card should continue to explain what the numbers mean, so new operators understand the difference between average and p95.

Acceptance criteria:
- The detail text beneath the Latency value clearly distinguishes average vs. p95.
- The text references "structured telemetry" or similar phrasing consistent with existing copy.

### `R3` View-model tests reflect the new display

Description:
The `view-models.test.ts` tests that assert on `summarizeTelemetryStats` output must be updated to match the new two-number display.

Acceptance criteria:
- `view-models.test.ts` tests for `summarizeTelemetryStats` pass with the new Latency card shape.
- No other tests are broken by the change.

## Out of Scope

- `OOS1`: Changing backend latency calculation logic. The backend already computes `averageLatencyMs = totalLatency / requestCount` correctly.
- `OOS2`: Adding new telemetry metrics (e.g., p50, p99, min, max).
- `OOS3`: Changing the comparison row latency labels (`latencyLabel` in `buildTelemetryComparisonCards` and `buildTelemetryRequestRows`). These already show both numbers.
- `OOS4`: Any changes to the `RuntimeTelemetrySummary` TypeScript interface or the REST API response shape.

## Constraints

- The change is UI-only, confined to `role-model-router/apps/runtime-ui/app/lib/view-models.ts` and its test file.
- Must preserve existing visual hierarchy patterns used by other summary cards (Requests, Failures, Tokens).
- Must not introduce new dependencies or design system changes.

## Coverage Gate

- [ ] Every requirement has a short title, description, and acceptance criteria.
- [ ] Acceptance criteria are observable and testable.
- [ ] Out-of-scope items are explicitly listed.
- [ ] Constraints are documented.

Coverage: PASS

## Approval Gate

- [x] Requirements are complete enough to guide AS-IS analysis and planning.
- [x] No unresolved open questions remain.

Approval: PASS
