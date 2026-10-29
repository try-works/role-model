# S533 - port learning and models families to structural parity

Status: pending
TDD Mode: strict per page + structure gate (as S529/S530)
Public basis 259c7d4b.

Reference sources: role-model-router/apps/runtime-ui/app/routes/learning*.tsx and models*.tsx plus components/learning-*.tsx and page-primitives.tsx; audit D:/DEV/rm-clean/audit/gaps-a.md and gaps-c.md keys _app_learning_*, _app_models*.

Pages: /learning (Learning overview, Live replay and evaluation, Recent decisions), /learning/configuration (every activation parameter with current value/unit/default/range plus Operator token and Operator identity inputs), /learning/decisions (Decision receipts table with Role/Task/Outcome filters and Advisory state/Observation origin selectors), /learning/evidence (Cohort evidence metrics and guardrail verdict block, Evidence loss by reason table), /learning/history (history window surface), /learning/packs (Learned packs). Then /models (model inventory and detail), /models/roles (Role task allowlists, 21% now), /system/benchmark (Capability benchmark, Benchmark scores, Taxonomy dimensions, Run history).

Reuse src/features/overview/charts.ts for any chart; teal/dark styling from the existing design tokens; tables always render thead+tbody with honest empty rows; selects use AriaLabel.

Strict RED per page (reference titles absent on HEAD). Structure gate: reference titles present, SVG>=1 where the reference has charts, table>=1 where the reference has tables. Data-dependent textLen reported honestly, never fabricated. Suites + UI tsc 0 + s247 3/3 + nonempty lint zero added-line; freeze hashes; independent review; no commit. No other families.