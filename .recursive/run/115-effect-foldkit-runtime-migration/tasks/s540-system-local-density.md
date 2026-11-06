# S540 - deepen system/local readback pages to reference density

Status: pending
TDD Mode: strict per page + density gate
Public basis e29d8fc2; methodology in evidence/other/s539-corrected-audit.md and S538 (5s settle, fixture traffic).

Targets and current ratios (port/ref text): /system/session-readiness 0.27, /control/endpoints 0.40, /system/runtime 0.45, /router/agent-strategy 0.46, /observe/queues 0.64, /system/peers 0.81, /router/workloads 0.82, /local/llama-swap/models 0.54, /local/llama-swap/policy 0.59, /local/llama-swap/swap 0.63, /local/llama-swap/matrix 0.54, /local/peers 0.45.

For each page read the reference React route source and the reference captured text (D:/DEV/rm-clean/audit/ref/<key>.json) and render every reference sub-section, table column set, stat row, control and empty-state message verbatim in the port page. Keep existing suites green (s383/s389/s26n/s458/s530/s534 and s247).

Strict RED per page: a density test asserting the reference sub-section labels + a minimum row/column envelope fails on HEAD. Acceptance per page: all reference headings present AND route-dump textLen >= 0.9x reference after seeding 40 fixture chat requests on a local packaged instance with a 5s settle. Record the table in evidence/logs/s540-audit.log. Suites + UI tsc 0 + s247 3/3 + nonempty lint zero added-line; freeze hashes; independent review; no commit.