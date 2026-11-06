# S631 / task-110 - chart cards show plots only; the per-bucket table is sr-only

## Problem
Every telemetry chart card rendered a full visible per-bucket <table> under the SVG (Latency trend, token usage,
etc.). The :3456 reference cards show the plot only; a visible table is not part of the chart surface.

## Change
- charts.ts chartTable(): the table keeps data-chart-part="table" and its caption/rows (the accessible numeric
  representation) but its only styling class is "sr-only", so it is visually hidden while still present for
  screen readers and tests.
- s628: new regression test asserts every [data-overview-card] table[data-chart-part='table'] has the sr-only
  class and there is no visible chart table (table:not(.sr-only)) in any chart card.
- s612: the visible-table contract test is updated to the hidden contract (svg visible; table sr-only; no visible
  table), keeping the SVG point/bar assertions.

## TDD
- RED: evidence/logs/s631-chart-tables-red.log - new s628 test fails "chart table must be sr-only".
- GREEN: evidence/logs/s631-chart-tables-green.log - s628 8/8 and s40b 7/7.

## Verification every chart surface (isolated packaged host, stopped after capture)
- Overview: 6 chart cards, each 1 table (sr-only), 0 visible tables; global visible table count 0.
- Requests: Request volume card 1 sr-only table, 0 visible.
- Observe routing: Routing analytics volume card 1 sr-only table, 0 visible.
- Evidence: s631-charts-no-tables-evidence.json, s631-charts-no-tables-{overview,requests,routing}-dom.json and
  the matching PNG screenshots. Reference :3456 chart cards are recharts SVGs with no table
  (s629-reference-3456-requests.png / -routing.png already committed).
- s612 targeted green (evidence/logs/s631-s612.log).
- S247 4/4 (evidence/logs/s631-s247.log), no click changes.
- Full UI suite: 105 files / 957 tests PASS (evidence/logs/s631-chart-tables-full-ui.log).
