# S579 — visual Models page rebuild

Reference pair read side by side (:3456 vs :51970): the reference Model inventory is a two-column card — left MODELS list (bordered rows, name + controller/healthy badge, "source · tools · N endpoints") followed by RUNTIME · <model> fact rows, COST and BENCHMARK blocks; right ROLES panel with per-role checkmark rows and task counts. The port rendered a plain table plus metric tiles.

## Rebuilt (src/features/models/routes.ts)
- Model inventory card with the reference description and two-column xl grid.
- Left: bordered model list with selection rail, controller/status badges, provider/tools/endpoint subline; RUNTIME fact rows (Source, Status, Endpoints, Tool use, Context, Mode), COST (Input/Output), BENCHMARK (Overall, Live latency p50/p95, Live failure rate).
- Right: ROLES header (model name + "tasks under each role") with explanation, and per-role rows (check, role, N tasks, chevron).
- Empty state matches the reference: "No configured models are available yet." plus Open Local Models / Open Local Endpoints / Open Providers links.

## Tests
- s533 models inventory retargeted to the reference empty state; s71b rewritten for the reference inventory (two-column structure, badges, runtime facts, role task counts, loading/empty behavior).
- Screenshot verified: D:/DEV/rm-clean/audit/vis-fold-models2.png vs vis-ref-models.png.

## Remaining on this page
- Controller badge is derived from the first model (no controller readback in the port yet); COST uses "—" because pricing is not read; BENCHMARK has no evidence because the benchmark readback is not wired here.
