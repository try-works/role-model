# S70b R16 UI comparison — R (0.0.20 :3456) vs C (0.0.20-29-gd45ba6ff :5802)

Read-only GET navigation only. Screenshots: evidence/reference/c-vs-r/ (r-*.png, c-*.png). Raw titles/headings/text: c-vs-r/extract.json.

## Delta table

| Section | R page (heading) | C page (heading) | Comparison | Classification | Evidence |
|---|---|---|---|---|---|
| Overview | /app — Runtime overview; model-pool quality/cost/speed, Time range, Breakdown, Source, Status, Difficulty, rail counts | / — Runtime overview; two aggregate chart cards, Time range only, rail counts | C lacks model-pool quality/speed and 4 filters; adds bucket charts | **regression** | r-overview.png / c-overview.png |
| Studio | /app/studio/chat — Chat workspace | /studio — Studio, five tabs | Both workspaces; C adds tabs but no successful generation | different | r-studio.png / c-studio.png |
| Local | /app/local/choose — Choose local backend | /local/choose — Local choose | Same two-choice surface | **same** | r-local.png / c-local.png |
| Remote | /app/remote/providers — Remote providers; provider rows + controls | /control/providers — Providers; readback table | C is read-only; no provider setup/edit | **regression** | r-remote.png / c-remote.png |
| Models | /app/models — Configured models | /models — NotFound | C has no equivalent route | **missing** | r-models.png / c-models.png |
| Router | /app/router/strategy — Routing strategy; controls | /router — Router; summary readback | C shows summary only, no strategy editor | **regression** | r-router.png / c-router.png |
| Observe | /app/observe/requests — Telemetry request ledger | /requests — Requests; compact readback list | Both list requests; C fewer ledger columns | different | r-observe.png / c-observe.png |
| Connect | /app/connect — Available models & endpoints; connect controls | /control/endpoints — Endpoints; readback only | C lost connect/account actions | **regression** | r-connect.png / c-connect.png |
| System | /app/system/runtime-config — Runtime config; editable | /runtime — Runtime; readback | C lost runtime configuration editing | **regression** | r-system.png / c-system.png |
| Learning | /app/learning — Learning overview | /learning — Learning; knowledge/replay/eval | C adds honest API-backed sections | different | r-learning.png / c-learning.png |

## Counts

| Classification | Count |
|---|---|
| same | 1 |
| different | 3 |
| intentional approved change | 0 |
| regression | 5 |
| missing | 1 |
| environment/config/state | 0 |
| not-comparable | 0 |
| **total** | **10** |

## Top 5 differences

1. **Models is missing**: R /app/models -> C /models is NotFound. No alias or dropped-with-reason decision exists.
2. **Overview filters/model pool lost**: C keeps Time range but drops Breakdown/Source/Status/Difficulty and R's quality/cost/speed pool, replacing it with aggregate charts and a 1-D cost strip.
3. **Remote/Connect/System are read-only**: R offers provider setup, connect/account actions and runtime-config editing; C exposes readbacks only.
4. **Router strategy controls lost**: R has strategy editing; C renders router summary.
5. **Duplicate h1 on C routes**: Studio, Local choose, Providers, Endpoints and NotFound each render two h1s; this is C-only content R does not have.

## Flags

- **R behaviour C cannot reproduce**: model-pool quality/speed/route-score; Breakdown/Source/Status/Difficulty filters; configured-models page; provider setup; connect/account actions; runtime-config editor; router strategy editor.
- **C invents content R does not have**: duplicate content h1 on five routes; five Studio tabs with no R equivalent (they render honest 404/400 but the tab set itself is new); /learning job sections are additive and API-backed.
- **State-derived values** differ (models 2 vs 3, requests 25 vs 0, eval jobs 241 vs 0) — environment/config/state, not UI defects.

## Verdict

The replacement **does not yet preserve the operator's surfaces**. Navigation, Overview readbacks, Learning, Local and a request list are preserved; five interactive surfaces are lost (Overview filters/model pool, provider controls, models, router strategy, connect/system editors). Empty/readback honesty is generally good; missing controls and duplicate h1s are regressions.
