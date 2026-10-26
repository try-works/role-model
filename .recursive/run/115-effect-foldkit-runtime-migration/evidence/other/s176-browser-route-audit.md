# S176 Browser audit of every port route (per-slice visual gate evidence)

Proposal 17 line 103: *"M11 is the final UI/visual gate. Browser evidence begins at M4; acceptance is per slice and final packaged cutover is M12."* This is that per-slice evidence for the current candidate.

Target: packaged `role-model-dev.exe` `0.0.20-163-g6ed7ece9` (sha `e3181d50`), port 6201, own state root, fixture config. Screenshots in `evidence/other/ui-audit/`.

## Method

For every route in the port route table: navigate, wait for render, then read from the live DOM

- rendered text length and the first 90 characters (does the page have content?),
- any control whose **computed text colour equals its own background** (invisible control),
- placeholder artefacts (`undefined`, `NaN`, `[object Object]`, `TODO`, `lorem`).

The invisible-control check is the one that found the Studio defect in S175; it is now part of the audit rather than a one-off.

## Results - 25 routes

| Route | What renders | text chars | invisible controls |
|---|---|---|---|
| `/` | Overview | 327 | — |
| `/diagnostics/42` | Diagnostics (disabled state) | 198 | — |
| `/runtime` | Runtime readback | 438 | — |
| `/models` | Models (3 configured) | 1201 | — |
| `/router` | Router summary | 247 | — |
| `/router/candidates` | Candidates (3 rows) | 784 | — |
| `/router/decisions` | Decisions (empty state) | 157 | — |
| `/control/providers` | Providers (2 rows) | 144 | — |
| `/control/endpoints` | Endpoints (3 rows) | 177 | — |
| `/control/controller` | Controller (6 rows) | 507 | — |
| `/observe/observability-snapshot` | Observability snapshot | 253 | — |
| `/observe/store-degradation-receipts` | Store receipts | 145 | — |
| `/observe/queues` | Queues (5 rows) | 344 | — |
| `/observe/activity` | Activity (empty) | 154 | — |
| `/observe/logs` | Observe logs (empty) | 149 | — |
| `/observe/routing` | Observe routing (empty) | 152 | — |
| `/local/logs` | Local logs (empty) | 145 | — |
| `/local/peers` | Local peers (empty) | 149 | — |
| `/local/swap` | Local swap (empty) | 152 | — |
| `/system/peers` | System peers (empty) | 151 | — |
| `/requests` | Requests (empty) | 151 | — |
| `/session-readiness` | Session readiness (loading) | 151 | — |
| `/dashboard` | Dashboard (empty) | 152 | — |
| `/studio` | Studio form + Run | 121 | 0 |
| `/learning` | Learning (capabilities) | 806 | — |

**25/25 render content. 0 invisible controls. 0 placeholder artefacts.** The empty states are real empty states (`No router decisions recorded yet`), not failures - the fixture host has no traffic.

## Two findings a route audit cannot settle

1. **Information architecture differs from the shipped operator UI.** The port groups destinations as OVERVIEW / OBSERVE / ROUTER / CONTROL / LOCAL / SYSTEM; the operator (`:3456`, `0.0.20`) shows Overview, Studio, Local, Remote, Models, Router, Observe, Connect, System, Learning. Every destination I checked exists in both, but grouping and composition differ.
2. **The operator Overview is richer.** It renders a model-pool scatter plot (quality / cost / speed) and a token-usage chart; the port Overview renders the stat panel, time-range control, four filters and the telemetry empty state. Styled and functional, but without those two visualisations.

Neither is a rendering defect; both are scope questions. I record them rather than deciding them, because "complete port" against the shipped UI is an acceptance judgement and this is the evidence it would rest on.

## Also still true

`apps/runtime-ui` (the React app) is still in the tree. Decision D-U1 says *"React is deleted at cutover"*, so the cutover is not complete by that definition even though the dev package serves the Foldkit shell.

## Screenshots

| File | Page |
|---|---|
| `overview.png` | Overview with stat panel and filters |
| `models.png` | Models - three configured models with provider/endpoint |
| `router-candidates.png` | Router candidates - three rows from the live host |
| `learning.png` | Learning capabilities |