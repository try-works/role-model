# Benchmark-page parity verification — 0.0.20-684-g41d60424

Build clean review-src24; distribution/package/verify-packaged-candidate PASS.
Root ui-review29: only real DeepSeek endpoints; no review.*/mock.*.
Suite 122 files / 1027 tests PASS.

## Real 3-endpoint run
runId e8cf403e-3be5-4100-8b8c-284b8e681c77
subjects deepseek-flash-low + deepseek-flash-max + deepseek-v4-pro-high; judge deepseek-flash-max.
requested 3 / executed 3 / skipped []; totalSteps 84 / completed 84.
completed, outcome PARTIAL, 36 cases / 34 passed / 2 failed.
Scores: flash-low 0.6917 (11/12), flash-max 0.7375 (11/12), v4-pro-high 0.8250 (12/12).

## Scores section
LAST RUN e8cf403e...; SUITE Quick; JUDGE deepseek/deepseek-flash; completed 2026-11-05 22:43:24.
Columns Model, Overall, Profile, Easy, Medium, Hard, p50, p95, Scope, Actions.
3 distinct rows: flash (low) 69%, flash (max) 74%, v4-pro (high) 83%; each row has runId/quick line,
endpoint path sub-line, "Exact (run artifact)", Clear action. No panel/summary mismatch.

## Taxonomy
Filter selects mutually exclusive: selecting task coder.edit reset role/capability to ""; selecting
role coder reset task/capability to "". Active role eyebrow "ROLE: CODER" + endpoint-keyed list:
flash-low 70%, flash-max 78%, v4-pro-high 87%; no merged table (0 taxonomy tables).
Empty-state: "Select a taxonomy dimension above to see per-model benchmark scores." rendered when
no dimension selected. Source no-data sentence:
"No taxonomy dimension data is available yet. Benchmark results with taxonomy-tagged cases will appear here."
(not triggerable with this populated run).

## History
e8cf403e-3be5-4100-8b8c-284b8e681c77
quick • 12 cases • 3 models
2026-11-05 22:43 • routing-capability-v2
Outcome: partial · 34/36 passed
QUICK / View details.

## Regressions
router baseline.remote-only + remote_only, no strategy.execution_mode; requests 9 charts;
routing 9 charts; queues renders; sidebar present.

## Secret scan
exe + build/client + evidence (2799 files): sk-key 0; bearer 0; api-key-assignment 3 false positives.
