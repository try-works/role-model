# S512 — flat Model/routeContent/createUpdate decomposition design (read-only)

Status: pending
Public basis 4537248b.

Produce evidence/other/s512-flat-model-decomposition-design.md mapping a bounded decomposition plan for the remaining Workspace items: the flat Model (model.ts:17-40), the 15-arg routeContent map (view.ts:929-1045) and the 1456-line createUpdate (update.ts:208-223). Requirements: per-route view/module registry with named args instead of positional 15-arg calls; update dispatch partitioned per family (delegating to the extracted feature plans); Model slices grouped per feature; stepwise slices with behavior-preservation strategy (same compensation pattern: no test edits, rendered audits per route, tsc, lint); risk list (scene selectors, s247 click budget, route order). NO code changes. Live Flash verify.
