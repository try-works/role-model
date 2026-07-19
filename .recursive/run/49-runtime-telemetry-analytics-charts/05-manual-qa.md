# Phase 5 Manual QA

Run: `49-runtime-telemetry-analytics-charts`  
Phase: `5 - manual qa`  
Status: `LOCKED`
Inputs:
- `.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/02-to-be-plan.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/03-implementation-summary.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-03.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-04.md`
Outputs:
- `.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/`
- `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/`
Scope note: This artifact records hybrid Phase 5 QA for the rebuilt runtime UI and backend analytics surfaces, including agent-operated API/browser checks, same-phase addenda repairs, and explicit operator sign-off.

## TODO

- [x] Record QA execution mode and runtime target
- [x] Record agent-operated API and browser QA evidence
- [x] Reconcile all Phase 5 addenda and follow-up repairs
- [x] Record operator manual QA pass
- [x] Complete coverage and approval gates

## Runtime Under Test

- QA runtime URL: `http://127.0.0.1:3456`
- Runtime launcher:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-launch.ts`
- Runtime evidence log:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/phase5-qa-runtime.log`

## Agent-Operated QA Completed

### API Proof

- `GET /healthz`
  - Result: `healthy`
  - Inventory readback: `3` endpoints, `1` local, `2` remote
- `GET /api/role-model/telemetry/summary`
  - Result: `6` requests, `5` success, `1` failure, `16320` total tokens, `1` cached request, `$0.145` effective cost
- `GET /api/role-model/telemetry/requests?limit=10`
  - Result: seeded records present for:
    - `openai/gpt-4.1-mini-fast`
    - `gpt-5.4`
    - `anthropic/claude-3.7-sonnet`
  - Result includes:
    - baseline / difficulty / controller / hybrid routing
    - easy / medium / hard difficulty
    - cache-hit token row
    - cost + avoided-cost fields
- `POST /api/role-model/telemetry/query`
  - Verified after correcting the payload shape to use `granularity` + `metrics`
  - Result: bucketed analytics response returned successfully

Evidence files:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-summary.json`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-requests.json`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-query-models.json`

### Browser Proof

Verified on the rebuilt runtime with the in-app browser:

1. `/app`
   - Overview analytics controls rendered
   - Charts rendered with seeded data:
     - Token Usage Over Time
     - Effective Cost Over Time
     - Cost Avoided Over Time
     - Latency Trend
     - Cache Efficiency Trend
     - Success vs Failure Volume
   - Endpoint inventory and latest-request cards reflected seeded telemetry state

2. `/app/observe/requests`
   - Analytics controls rendered
   - Charts rendered with seeded data:
     - Request Volume Over Time
     - Token Usage Over Time
     - Effective Cost Over Time
     - Latency Trend
     - Cache Efficiency Trend
     - Failure Trend
     - Ranked Comparison
   - Recent telemetry ledger rendered all six seeded requests with model, endpoint, cost, and status detail

3. `/app/observe/routing`
   - Routing analytics controls rendered
   - Charts rendered with seeded data:
     - Cost Avoided By Routing
     - Routing Decision Volume
     - Difficulty Distribution
     - Strategy Selection Trend
     - Role Demand
     - Model Selection

### Agent Findings During QA

- The shared QA bridge helper was initially missing `queryTelemetryAnalytics`, which made `POST /api/role-model/telemetry/query` unavailable during live runtime QA.
  - Fixed in `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- An initial manual POST probe used the wrong payload shape (`range` / `groupBy`) and correctly returned `400`.
  - Correct payload shape uses `granularity`, `metrics`, optional `breakdown`, and time bounds.

## Operator QA Requested

Please review the rebuilt runtime on:

- `http://127.0.0.1:3456/app`
- `http://127.0.0.1:3456/app/observe/requests`
- `http://127.0.0.1:3456/app/observe/routing`

Requested operator checks:

- visual alignment and chart density
- token / cost / avoided-cost readability
- chart color separation against the Apple-themed dark surface
- usefulness of legends, labels, and ranked comparison surfaces
- any route-specific regressions not covered by the seeded QA dataset

## Phase Boundary

- Stop here pending operator manual QA.
- Phases `6-8` are intentionally not started yet.

## Addendum 01 Agent QA Update

Addendum:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`

Implementation repairs completed after the upstream-gap addendum:

- Restored the run-48 Apple-theme shell contract for shared panels, product shadow, header eyebrow removal, status-pill background behavior, sidebar theme placement, provider-form cleanup, and themed select ownership.
- Repaired shared route-stability risks in shell header action registration and local peer health refresh state.
- Added QA-safe runtime startup so the rebuilt runtime loads seeded config and fixtures without blocking on local vendor process startup.
- Wired benchmark APIs into the QA bridge so `/app/models/benchmark` and `/app/control/benchmark` no longer render shell-only 404 states.

Verification evidence:

- RED design-system regression tests:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-design-system-red.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-shell-eyebrow-red.log`
- RED QA startup/API regressions:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-qa-vendor-startup-red.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-qa-startup-env-red.log`
- GREEN tests/builds:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-design-system-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-shell-eyebrow-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-design-system-after-qa-fix-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-build-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-qa-env-build-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-benchmark-api-build-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-qa-options-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/build/addendum-01-runtime-ui-build-03.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/build/addendum-01-runtime-ui-final-build-green.log`
- Rebuilt runtime evidence:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa-runtime-3456.log`
  - `GET http://127.0.0.1:3456/api/role-model/benchmark/suite` returned `200`
- Browser route sweep:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/browser-route-sweep-3456-final.json`
  - Result: `55 / 55` routes passed, including previously broken routes and legacy redirects.
- Representative screenshots:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/screenshot-overview.png`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/screenshot-remote-providers.png`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/screenshot-models-benchmark.png`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/screenshot-observe-requests.png`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/screenshot-observe-routing.png`

Late Phase 5 regression follow-up:

- Finding: charts were present under `/app/observe/requests` and `/app/observe/routing`, but the primary sidebar `Observe` entry pointed to `/app/observe/activity`, a preserved raw-host ledger with no charts.
- Root cause: `runtimeNavigationSections` ordered the Observe section as Activity, Requests, Routing, Logs; `AppShell` uses the first section item as the primary sidebar link.
- Fix: reordered Observe navigation to Requests, Routing, Activity, Logs so entering Observe lands on charted analytics first while preserving raw-host Activity and Logs as adjacent tabs.
- RED evidence:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-observe-entry-red.log`
- GREEN evidence:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-observe-entry-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/build/addendum-01-observe-entry-runtime-ui-build-green.log`
- Browser proof:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/addendum-01-observe-entry-browser.json`
  - Result: sidebar Observe href is `/app/observe/requests`; Requests rendered `12` Recharts wrappers / `6` SVGs; Routing rendered `6` Recharts wrappers / `3` SVGs.

Current operator review target:

- `http://127.0.0.1:3456/app`
- `http://127.0.0.1:3456/app/observe/requests`
- `http://127.0.0.1:3456/app/observe/routing`

Status:

- Agent QA for addendum 01 is complete.
- Rebuilt runtime is running on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 02 Agent QA Update

Addendum:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`

Implementation repairs completed after the addendum 02 gap audit:

- Hardened `POST /api/role-model/telemetry/query` validation so unsupported metric aliases, unsupported dimensions, invalid ranking metrics, and non-positive ranking limits fail with `400` instead of silently producing misleading analytics.
- Corrected cache-hit token-rate semantics so mixed support states return `null`; supported filtered slices still return a concrete rate.
- Made request detail consume stored authoritative cost fields (`effectiveCostUsd`, calculation basis/version, selected uncached cost, baseline, routing/cache savings, total avoided cost, support metadata) instead of recomputing display from raw actual/estimated fallback fields.
- Added a telemetry-only request-detail fallback so seeded ledger rows without a persisted observation bundle can still be inspected from `/app/observe/requests/:requestId`.

Verification evidence:

- API probe:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/addendum-02-live-api-probes-final.json`
  - Result: seeded runtime returned `6` requests; overview totals included `$0.145` effective cost, `$0.252` avoided cost, `1400` cache-hit tokens; invalid `totalEffectiveCostUsd` query returned `400`; `req-phase5-006` detail returned authoritative stored cost fields.
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/addendum-02-browser-route-verification-final.json`
  - Result: passed for `/app`, `/app/observe/requests`, `/app/observe/routing`, `/app/observe/activity`, `/app/observe/logs`, `/app/local/endpoints`, and `/app/observe/requests/req-phase5-006`.
  - Chart proof: `/app` rendered the overview chart set; `/app/observe/requests` rendered request-volume, token, cost, latency, cache, failure, and ranked-comparison charts; `/app/observe/routing` rendered cost-avoidance, routing-volume, difficulty, strategy, role-demand, and model-selection charts.

Current operator review target:

- `http://127.0.0.1:3456/app`
- `http://127.0.0.1:3456/app/observe/requests`
- `http://127.0.0.1:3456/app/observe/routing`
- `http://127.0.0.1:3456/app/observe/requests/req-phase5-006`

Status:

- Agent QA for addendum 02 is complete.
- Rebuilt runtime is running on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 03 Agent QA Update

Addendum:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-03.md`

Implementation repairs completed after the design-system route/component audit:

- Added the missing `--rm-on-primary` token and replaced hardcoded primary foreground `text-white` usage in shared controls.
- Tokenized telemetry chart axis tick typography and bar radii through shared design-system exports.
- Removed production route/component leaks for raw semantic Tailwind colors, `rounded-none`, and unsupported `font-medium` typography weight.
- Replaced benchmark and request-detail decorative interior divider rules with spacing and rounded metadata grouping.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-03-design-system-token-contract.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-03-design-system-token-contract.log`
- GREEN runtime UI suite:
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - Result: `11` files, `146` tests passed
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-03-runtime-ui-build.log`
- Browser route sweep:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-03-route-sweep.json`
  - Result: `36 / 36` routes loaded, no runtime errors, no loading routes, no targeted raw-class leaks.
  - Chart proof: `/app` rendered `6` chart wrappers; `/app/observe/requests` rendered `7`; `/app/observe/routing` rendered `6`.

Current operator review target:

- `http://127.0.0.1:3456/app`
- `http://127.0.0.1:3456/app/observe/requests`
- `http://127.0.0.1:3456/app/observe/routing`
- `http://127.0.0.1:3456/app/remote/providers`

Status:

- Agent QA for addendum 03 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 04 Agent QA Update

Addendum:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-04.md`

Implementation repair completed after provider dropdown manual QA:

- Replaced the shared `SelectField` native `<select>` implementation with an app-owned themed button/listbox primitive.
- Preserved the existing `<option>` caller API so provider and telemetry select callers do not need route-local rewrites.
- Styled the opened dropdown menu with Apple-theme runtime tokens for surface, border, radius, selected option fill, and on-primary text.
- Added basic ARIA and keyboard support: `aria-haspopup="listbox"`, `aria-expanded`, popup `role="listbox"`, option `role="option"`, Escape close, arrow navigation, and Enter/Space selection.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-04-themed-select-listbox-red.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-04-themed-select-listbox-green.log`
- GREEN runtime UI suite:
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - Result: `11` files, `146` tests passed
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-04-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-04-themed-select-browser.json`
  - Result: `/app/remote/providers` had `0` native selects in `main`; provider popup rendered as a themed listbox with `231` options; selected option used accent/on-primary colors; selecting `Abacus` updated the provider and dependent connection method.

Current operator review target:

- `http://127.0.0.1:3456/app/remote/providers`

Status:

- Agent QA for addendum 04 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 05 Agent QA Update

Manual QA finding:

- Header-level `Refresh` controls remained visible on local runtime routes, including `/app/local/llama-swap/models`.

Implementation repair completed after the header-refresh manual QA finding:

- Removed refresh-only `usePageActions()` registrations from local endpoints, peer models, and llama-swap models routes.
- Preserved automatic initial loading and post-mutation refresh behavior inside the affected route bodies.
- Added a design-system regression test that fails if those local routes register refresh copy as shell header actions again.

Verification evidence:

- RED/GREEN regression:
  - RED: `routes do not register refresh controls as shell header actions` failed before production edits.
  - GREEN: `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-05-no-header-refresh-green.log`
  - Result: `11` files, `147` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-05-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-05-no-header-refresh-browser.json`
  - Result: `/app/local/llama-swap/models`, `/app/local/peer-models`, and `/app/local/endpoints` all showed `0` shell-header buttons after reload on `127.0.0.1:3456`; only local section tab links remained.

Current operator review target:

- `http://127.0.0.1:3456/app/local/llama-swap/models`
- `http://127.0.0.1:3456/app/local/peer-models`
- `http://127.0.0.1:3456/app/local/endpoints`

Status:

- Agent QA for addendum 05 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 06 Agent QA Update

Manual QA finding:

- `/app/system/session-readiness` rendered sentence-length fact-card values with the same large display typography used for short numeric/status facts. The lifecycle authority value overflowed/wrapped poorly inside its card.

Implementation repair completed after the session-readiness fact-card typography finding:

- Added an optional `valueClassName` override to the shared `FactCard` primitive while preserving the existing large value typography as the default.
- Applied the shared `bodyStrongTextClassName` role to long session-readiness fact values: lifecycle authority and execution mode.
- Kept short fact values such as bootstrap status, host health, and routable endpoint count on the existing display value role.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-06-session-readiness-fact-value-red.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-06-session-readiness-fact-value-green.log`
  - Result: `11` files, `148` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-06-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-06-session-readiness-fact-value-browser.json`
  - Result: lifecycle authority and execution mode values rendered at `17px` / `21px` with no horizontal overflow; short fact values remained at `34px` / `40px`.

Current operator review target:

- `http://127.0.0.1:3456/app/system/session-readiness`

Status:

- Agent QA for addendum 06 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 07 Agent QA Update

Manual QA finding:

- `/app` rendered a standalone `Telemetry controls` card directly below the route header. Those controls were route-level controls and should live in the shell header on the overview route.

Implementation repair completed after the overview controls placement finding:

- Moved the overview time-range, breakdown, and source-filter controls from the standalone body `SectionCard` into the shell header action area via `usePageActions`.
- Preserved the existing control state, analytics query wiring, chart refresh behavior, and themed select primitive.
- Added a bounded `className` pass-through for `TelemetrySelectField` so header select controls can stay compact inside the route header.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-07-overview-controls-header-red.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-07-overview-controls-header-green.log`
  - Result: `11` files, `148` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-07-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-07-overview-controls-header-browser.json`
  - Result: `/app` had header telemetry controls for day/week/month/90 days, breakdown, and source filter; `main` no longer contained a `Telemetry controls` heading; the first body section was `Token Usage Over Time`.

Current operator review target:

- `http://127.0.0.1:3456/app`

Status:

- Agent QA for addendum 07 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 08 Agent QA Update

Manual QA finding:

- Native dropdown option lists still bypassed the Apple-themed design-system surface on `/app/router/strategy`, and the same risk applied to every remaining raw `<select>` in runtime-ui routes.

Implementation repair completed after the native-select theming finding:

- Migrated all remaining production route-level native `<select>` controls to the shared `SelectField` design-system primitive.
- Covered router strategy, benchmark controls, role policy editor, Studio chat, Studio images, Studio audio, Studio rerank, and Studio advanced request rails.
- Preserved the existing option sets and state/update callbacks while moving the rendered dropdown menus to repo-owned listbox panels.
- Added a design-system regression test that fails if these production UI surfaces reintroduce raw native `<select>` elements.

Verification evidence:

- RED design-system contracts:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-08-router-strategy-themed-select-red.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-08-all-themed-selects-red.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-08-router-strategy-themed-select-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-08-all-themed-selects-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-08-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-08-all-themed-selects-browser.json`
  - Result: `/app/remote/providers`, `/app/studio/images`, `/app/studio/audio`, `/app/studio/rerank`, `/app/studio/advanced`, `/app/studio/chat`, `/app/models/benchmark`, `/app/models/roles`, and `/app/router/strategy` all reported `0` native selects after rebuild. Representative provider, image mode, benchmark mode, and execution mode menus opened as themed listboxes with Apple dark surface, border, accent-selected options, and no browser-native option popup.

Current operator review target:

- `http://127.0.0.1:3456/app`
- `http://127.0.0.1:3456/app/remote/providers`
- `http://127.0.0.1:3456/app/router/strategy`
- `http://127.0.0.1:3456/app/studio/images`
- `http://127.0.0.1:3456/app/models/benchmark`

Status:

- Agent QA for addendum 08 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 09 Agent QA Update

Manual QA finding:

- `/app/connect` rendered adjacent `Configured providers` and `Runtime endpoint rows` tables that repeated provider, model, health, readiness, and endpoint information.

Implementation repair completed after the Connect table duplication finding:

- Replaced the two-table layout with one `Runtime connections` table.
- Merged provider rollups and endpoint rows into one route-local connection model.
- Kept the most relevant fields only: provider, connection, model, endpoint, source, health, and readiness.
- Preserved provider-only rows for configured providers that do not yet have active endpoint rows.
- Added a design-system regression contract that requires the combined table and forbids the old duplicated section titles.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-09-connect-dedup-table-red.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-09-connect-dedup-table-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-09-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-09-connect-dedup-table-browser.json`
  - Result: `/app/connect` had one `Runtime connections` table with `Provider`, `Connection`, `Model`, `Endpoint`, `Source`, `Health`, and `Readiness` headers; old `Configured providers` and `Runtime endpoint rows` headings were absent; main content did not overflow horizontally at the checked viewport.

Current operator review target:

- `http://127.0.0.1:3456/app/connect`

Status:

- Agent QA for addendum 09 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 10 Agent QA Update

Manual QA finding:

- `/app/connect/upstream` rendered a redundant `Boundary notes` component below the provider/account and upstream target inventory sections.

Implementation repair completed after the upstream boundary-notes finding:

- Removed the standalone `Boundary notes` `SectionCard` from the upstream integration route.
- Removed the now-unused code block styling import from the route.
- Added a design-system regression contract that preserves the two useful upstream sections and forbids the redundant boundary notes copy.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-10-upstream-boundary-notes-red.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-10-upstream-boundary-notes-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-10-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-10-upstream-boundary-notes-browser.json`
  - Result: `/app/connect/upstream` rendered only `Provider accounts in scope` and `Upstream target inventory`; `Boundary notes` and `When to use /upstream/` copy were absent; main content did not overflow horizontally at the checked viewport.

Current operator review target:

- `http://127.0.0.1:3456/app/connect/upstream`

Status:

- Agent QA for addendum 10 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 11 Agent QA Update

Manual QA finding:

- `/app/connect/downstream` rendered a redundant `Compatibility posture` component below the connection contract and consumer setup sections.

Implementation repair completed after the downstream compatibility-posture finding:

- Removed the standalone `Compatibility posture` `SectionCard` from the downstream integration route.
- Preserved the useful `Connection contract` and `Consumer setup` sections.
- Added a design-system regression contract that forbids the redundant `Compatibility posture`, `API family`, `Tool calling`, and `MCP boundary` copy.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-11-downstream-compatibility-posture-red.log`
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-11-downstream-compatibility-posture-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-11-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-11-downstream-compatibility-posture-browser.json`
  - Result: `/app/connect/downstream` rendered `Connection contract` and `Consumer setup`; `Compatibility posture`, `API family`, `Tool calling`, and `MCP boundary` copy were absent. Existing horizontal overflow from long command/code content was observed and left unchanged because it is outside this addendum scope.

Current operator review target:

- `http://127.0.0.1:3456/app/connect/downstream`

Status:

- Agent QA for addendum 11 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 12 Agent QA Update

Manual QA finding:

- `/app/connect/downstream` still allowed the `Consumer setup` `Available models` and `Example commands` content to overflow the card/container, creating horizontal page scroll from long model identifiers and curl commands.

Implementation repair completed after the downstream overflow finding:

- Updated the downstream consumer setup grid to use explicit zero-min columns: `minmax(0,0.9fr)` and `minmax(0,1.1fr)`.
- Added `min-w-0` containment to the nested downstream cards and right-hand column so long descendants cannot set the page min-content width.
- Extended `StatusPill` with an opt-in `className` prop and constrained downstream model pills with `max-w-full`, normal wrapping, and breakable model text.
- Updated the shared `codeBlockClassName` primitive to include `max-w-full`, `whitespace-pre-wrap`, `break-words`, and `[overflow-wrap:anywhere]` so long command/code examples wrap inside panels instead of widening the page.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-12-downstream-overflow-red.log`
  - Expected failure: downstream route lacked zero-min grid columns and the shared code block primitive lacked wrapping containment.
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-12-downstream-overflow-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-12-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-12-downstream-overflow-browser.json`
  - Result: `/app/connect/downstream` document width matched viewport width (`723`/`723`), `Consumer setup` did not overflow (`689`/`689`), `Available models` did not overflow (`648`/`648`), and `Example commands` did not overflow (`648`/`648`). Both command blocks used `pre-wrap` and had `scrollWidth === clientWidth`.

Current operator review target:

- `http://127.0.0.1:3456/app/connect/downstream`

Status:

- Agent QA for addendum 12 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 13 Agent QA Update

Manual QA finding:

- `/app/system/session-readiness` rendered a redundant `Related surfaces` component below `Alias drift warnings`.

Implementation repair completed after the session-readiness related-surfaces finding:

- Removed the standalone `Related surfaces` `SectionCard` from the session readiness route.
- Removed the now-unused React Router `Link` import from the route.
- Added a design-system regression contract that forbids the removed `Related surfaces`, `Runtime topology`, and `Remote providers` shortcut copy on session readiness.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-13-session-readiness-related-surfaces-red.log`
  - Expected failure: session readiness source still contained `Related surfaces`.
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-13-session-readiness-related-surfaces-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-13-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-13-session-readiness-related-surfaces-browser.json`
  - Result: `/app/system/session-readiness` no longer contained `Related surfaces`, `Runtime topology`, or `Remote providers`; no horizontal document overflow was introduced.

Current operator review target:

- `http://127.0.0.1:3456/app/system/session-readiness`

Status:

- Agent QA for addendum 13 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 14 Agent QA Update

Manual QA finding:

- `/app/system/runtime` rendered a redundant `Preserved host surfaces` component with raw host shortcut links for `/logs`, `/api/metrics`, and `/health`.

Implementation repair completed after the runtime preserved-host-surfaces finding:

- Removed the standalone `Preserved host surfaces` `SectionCard` from the runtime topology route.
- Preserved the useful `Version and boundary facts` section and its repo-owned runtime summary link.
- Added a design-system regression contract that forbids the removed `Preserved host surfaces`, `Raw host log output`, `Vendor metrics and capture ids`, and `Raw host health endpoint` copy on the runtime route.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-14-runtime-preserved-host-surfaces-red.log`
  - Expected failure: runtime source still contained `Preserved host surfaces`.
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-14-runtime-preserved-host-surfaces-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-14-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-14-runtime-preserved-host-surfaces-browser.json`
  - Result: `/app/system/runtime` no longer contained `Preserved host surfaces`, `Raw host log output`, `Vendor metrics and capture ids`, or `Raw host health endpoint`; no horizontal document overflow was introduced.

Current operator review target:

- `http://127.0.0.1:3456/app/system/runtime`

Status:

- Agent QA for addendum 14 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 15 Agent QA Update

Manual QA finding:

- `/app/system/peers` rendered a redundant `Runtime policy boundary` component with `Groups and matrix`, `Empty-state rule`, and `Raw diagnostics` cards below the peer inventory and contract fields.

Implementation repair completed after the system peers policy-boundary finding:

- Removed the standalone `Runtime policy boundary` `SectionCard` from the system peers route.
- Preserved the useful `Peer inventory` and `Peer contract fields` sections.
- Added a design-system regression contract that forbids the removed `Runtime policy boundary`, `Groups and matrix`, `Empty-state rule`, and `Raw diagnostics` copy on the peers route.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-15-system-peers-policy-boundary-red.log`
  - Expected failure: system peers source still contained `Runtime policy boundary`.
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-15-system-peers-policy-boundary-green.log`
  - Result: `11` files, `150` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-15-runtime-ui-build.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-15-system-peers-policy-boundary-browser.json`
  - Result: `/app/system/peers` no longer contained `Runtime policy boundary`, `Groups and matrix`, `Empty-state rule`, or `Raw diagnostics`; `Peer inventory` and `Peer contract fields` remained visible; no horizontal document overflow was introduced.

Current operator review target:

- `http://127.0.0.1:3456/app/system/peers`

Status:

- Agent QA for addendum 15 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 16 Agent QA Update

Manual QA finding:

- Some chart legends reused the same resolved visual color for different visible metrics in the same chart, including cost and token charts.

Implementation repair completed after the chart color finding:

- Added a chart view-model regression that requires all visible metric series in a chart to receive distinct color tokens.
- Added a design-system CSS regression that verifies token groups commonly rendered together resolve to distinct actual colors in both light and dark themes.
- Updated the shared telemetry chart model builder to reserve colors per chart and fall back to unused chart palette tokens when semantic defaults collide.
- Updated chart semantic token values so `--rm-chart-tokens` and the light-mode `--rm-chart-cost` do not visually collapse into adjacent series colors.
- Updated `DESIGN_SYSTEM.md` to state that a single chart must not reuse the same resolved visual color for different visible metrics or series.

Verification evidence:

- RED chart model contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-16-chart-series-distinct-colors-red.log`
  - Expected failure: effective-cost and avoided-cost chart models had three visible series but only one unique color token.
- RED CSS visual-token contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-16-chart-css-distinct-colors-red.log`
  - Expected failure: chart tokens used together resolved to duplicate visual colors.
- GREEN focused chart/design-system contracts:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-16-chart-distinct-colors-green.log`
  - Result: `11` files, `152` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-16-runtime-ui-rebuild.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-16-chart-distinct-colors-browser.json`
  - Result: `/app`, `/app/observe/requests`, and `/app/observe/routing` rendered `15` chart legends total; no chart reused a resolved visible legend color within the same chart; no horizontal document overflow was introduced.

Current operator review targets:

- `http://127.0.0.1:3456/app`
- `http://127.0.0.1:3456/app/observe/requests`
- `http://127.0.0.1:3456/app/observe/routing`

Status:

- Agent QA for addendum 16 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 17 Agent QA Update

Manual QA finding:

- `/app/system/session-readiness` rendered inconsistent top fact-card value typography; `Bootstrap status` and `Host health` were oversized compared with `Lifecycle authority`.

Implementation repair completed after the session readiness fact-card typography finding:

- Updated the `Bootstrap status`, `Host health`, and `Routable endpoints` fact cards to use the same `bodyStrongTextClassName` value role already used by `Lifecycle authority` and `Execution mode`.
- Tightened the design-system regression so every session-readiness `FactCard` must explicitly use the compact value role.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-17-session-factcard-compact-values-red.log`
  - Expected failure: only `2` of `5` session-readiness fact cards used `valueClassName={bodyStrongTextClassName}`.
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-17-session-factcard-compact-values-green.log`
  - Result: `11` files, `152` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-17-runtime-ui-rebuild.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-17-session-factcard-compact-values-browser.json`
  - Result: all five top session-readiness fact-card values rendered with `17px` font size, `21px` line height, and `600` weight; no horizontal document overflow was introduced.

Current operator review target:

- `http://127.0.0.1:3456/app/system/session-readiness`

Status:

- Agent QA for addendum 17 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 18 Agent QA Update

Manual QA finding:

- The owned themed select dropdown lists did not preserve native-select style typeahead navigation; for example, opening the provider list on `/app/remote/providers` and typing `m` should move focus to providers beginning with `M`.

Implementation repair completed after the select typeahead finding:

- Added a shared `SelectField` typeahead matcher that finds the next enabled option by typed prefix.
- Wired printable-key handling into the shared select button and listbox option key handlers.
- Preserved repeated same-letter cycling across enabled matches and skipped disabled options.
- Kept the behavior in the shared primitive so provider, router strategy, and analytics dropdowns inherit the same keyboard behavior.

Verification evidence:

- RED component primitive contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-18-select-typeahead-red.log`
  - Expected failure: `getSelectTypeaheadMatchIndex` was not implemented.
- GREEN focused component primitive contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-18-select-typeahead-green.log`
  - Result: `2` tests passed.
- GREEN full runtime UI tests:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-18-runtime-ui-tests.log`
  - Result: `12` files, `154` tests passed.
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/build/addendum-18-runtime-ui-rebuild.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-18-select-typeahead-browser.json`
  - Result: on `/app/remote/providers`, the Provider listbox remained open after typing `m`, the selected value stayed `302.AI`, and the active option moved to `Meganova`.

Current operator review target:

- `http://127.0.0.1:3456/app/remote/providers`

Status:

- Agent QA for addendum 18 is complete.
- Rebuilt runtime remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 19 Agent QA Update

Manual QA finding:

- Saving routing strategy from `/app/router/strategy` failed with `Request to /api/role-model/runtime/config failed with 400: Unified runtime config editing requires unifiedRuntimeConfigPath.`

Root cause:

- The live Phase 5 QA server was launched by `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-launch.ts`.
- That launcher bypassed the canonical QA backend options and called `createRuntimeBridgeBackend` without `unifiedRuntimeConfigPath`.
- The runtime-config API therefore loaded `{ path: null, config: null }`, and the routing strategy UI correctly hit a backend 400 on save.

Implementation repair completed after the routing-strategy save finding:

- Updated the Phase 5 QA launcher to seed `runtime-config.yaml`.
- Reused `createQaRuntimeBridgeBackendOptions` so `unifiedRuntimeConfigPath` is passed to the backend.
- Restarted the live QA server on `127.0.0.1:3456` from the patched launcher.
- Updated stale memory notes that previously documented the QA launcher as lacking `unifiedRuntimeConfigPath`.

Verification evidence:

- RED QA-launcher contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-19-qa-launch-runtime-config-red.log`
  - Expected failure: the Phase 5 launcher did not contain `createQaRuntimeBridgeBackendOptions` or runtime-config seeding.
- GREEN QA-launcher contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-19-qa-launch-runtime-config-green.log`
  - Result: `1` test passed.
- GREEN live QA launch:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-19-phase5-qa-launch.out.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-19-phase5-qa-launch.err.log`
- API verification:
  - `GET /api/role-model/runtime/config` now returns `path: C:\Users\erikb\AppData\Local\Temp\role-model-runtime-qa-phase5\runtime-config.yaml`.
  - `PUT /api/role-model/runtime/config` succeeds and returns `applied: true`.
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-19-routing-strategy-runtime-config-save.json`
  - Result: `/app/router/strategy` shows `Routing strategy saved and applied.` after clicking `Save and apply strategy`; the `unifiedRuntimeConfigPath` error is absent.

Current operator review target:

- `http://127.0.0.1:3456/app/router/strategy`

Status:

- Agent QA for addendum 19 is complete.
- Fresh QA server is running on `127.0.0.1:3456` with an editable unified runtime config path.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 20 Agent QA Update

Manual QA finding:

- `/app/router` did not clearly reflect the configured routing posture and configured alias model hints.
- `/app/router/strategy` leaked JSX control-flow text inside the benchmark-informed difficulty advisory.

Root cause:

- `/app/router` loaded the runtime config but displayed `RouterSummary` posture fields and prioritized summary-expanded alias inventory, which made every routable candidate appear like a configured alias model.
- The benchmark advisory ternary in `control-routing-strategy.tsx` was plain text inside `SectionCard` instead of a JSX expression.

Implementation repair completed after the router overview and strategy findings:

- Changed `/app/router` fact cards to display the runtime config record's `routingStrategy` and `executionMode`.
- Changed the alias inventory table to display runtime-config `Configured models` and a diagnostic `Candidate expansion` count instead of a misleading `Resolved models` configured list.
- Wrapped the benchmark advisory candidate conditional in JSX braces so control-flow syntax no longer renders into the page.

Verification evidence:

- RED design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-20-router-overview-strategy-red.log`
  - Expected failure: router overview did not expose the runtime-config source-of-truth contract, and the strategy page did not wrap the candidate conditional in JSX.
- GREEN focused design-system contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-20-router-overview-strategy-focused-green.log`
  - Result: `2` tests passed.
- GREEN full runtime UI tests:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-20-runtime-ui-test-green.log`
  - Result: `12` files, `156` tests passed.
- GREEN TypeScript check:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-20-runtime-ui-tsc-green.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-20-runtime-ui-build-green.log`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-20-router-overview-and-strategy-browser.json`
  - Result: `/app/router` shows `baseline`, `local_only`, the two configured model hints, and `Candidate expansion`; `/app/router/strategy` no longer shows `candidates.length` or `) : (` as visible text.

Current operator review targets:

- `http://127.0.0.1:3456/app/router`
- `http://127.0.0.1:3456/app/router/strategy`

Status:

- Agent QA for addendum 20 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 21 Agent QA Update

Manual QA finding:

- `/app/router` still reported `local_only` even after the operator selected `hybrid` on `/app/router/strategy`.
- `/app/router` did not list concrete routing candidate endpoints/models, only aggregate alias expansion counts.

Root cause:

- `unified-runtime-config.ts` ignored explicit `executionMode` API payloads and `execution_mode` YAML values, deriving execution mode only from populated `llama_swap` and `litellm_proxy` sections.
- `renderUnifiedRuntimeConfigText` did not persist an explicit execution-mode field, so a saved operator choice could be lost after config normalization.
- `/app/router` did not fetch `/api/role-model/router/candidates`, so it could not show the actual endpoint/model/source/health rows backing the route posture.

Implementation repair completed after the router execution-mode finding:

- Added explicit `execution_mode` / `executionMode` parsing, validation, API normalization, and canonical YAML rendering.
- Preserved legacy derived execution mode when the explicit field is absent.
- Added `/app/router` candidate inventory rendering with model, endpoint, source, health, and routing badges.
- Patched a TypeScript build blocker in the telemetry observation fallback cast so the rebuilt runtime can compile.

Verification evidence:

- RED explicit execution-mode contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-21-explicit-execution-mode-red.log`
  - Expected failure: explicit `hybrid` was normalized as `local_only`.
- GREEN explicit execution-mode contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-21-explicit-execution-mode-green.log`
  - Result: `2` files, `29` tests passed.
- RED router candidate inventory contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-21-router-candidates-red.log`
  - Expected failure: `/app/router` did not fetch or render concrete candidates.
- GREEN router candidate inventory contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-21-router-candidates-green.log`
  - Result: `1` file, `50` tests passed.
- GREEN runtime host bridge build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-21-runtime-host-bridge-build.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-21-runtime-ui-build.log`
- Browser/API verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-21-router-execution-mode-and-candidates.json`
  - Result: after applying `controller` + `hybrid`, `GET /api/role-model/router/summary` reports `executionMode: hybrid`, and `/app/router` shows `Routing candidates` with the concrete model and endpoint row.

Current operator review target:

- `http://127.0.0.1:3456/app/router`

Status:

- Agent QA for addendum 21 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- The QA launcher resets runtime state on restart; the current verified state was reapplied through `PUT /api/role-model/runtime/config` after rebuild.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 22 Agent QA Update

Manual QA finding:

- Routing strategy settings must persist both the routing strategy and execution mode.
- The saved strategy and execution mode must be surfaced consistently on `/app/router/strategy` and `/app/router`.
- After changing the visible strategy card and saving, the previous implementation could persist the new execution mode while leaving the old routing strategy in place.

Root cause:

- `/app/router/strategy` mixed saved posture and draft state in one side card, which made stale or unsaved state hard to distinguish.
- The save path did not reload all derived route state after the runtime config update.
- The visible routing-strategy card click could toggle the hidden radio input in the DOM without updating the controlled React draft state used by `save()`.

Implementation repair completed after the routing-strategy persistence finding:

- Added explicit `Saved routing settings` and `Draft selection` cards.
- Changed save to await `updateRuntimeConfig(nextConfig)` and then `await loadState()` so config, controller, snapshot, and candidates refresh after persistence.
- Patched the visible `RoutingStrategyOptionCard` click path so the selected strategy updates React state before save.

Verification evidence:

- RED saved/draft refresh contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-22-routing-settings-ui-red.log`
- GREEN saved/draft refresh contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-22-routing-settings-ui-green.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-22-runtime-ui-build.log`
- RED visible card click contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-22-routing-card-click-red.log`
- GREEN visible card click contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-22-routing-card-click-green.log`
- GREEN rebuilt runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-22-routing-card-click-build.log`
- Browser/API verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-22-routing-settings-save-surface.json`
  - Result: after selecting `Strategy B - Intelligent` and `Hybrid` through the rebuilt UI, `GET /api/role-model/runtime/config` reports `routingStrategy: controller` and `executionMode: hybrid`; `GET /api/role-model/router/summary` reports `strategy: controller` and `executionMode: hybrid`; `/app/router/strategy` shows `CONFIG APPLIED`, `STRATEGY B - INTELLIGENT`, `HYBRID`, and `MATCHES SAVED`; `/app/router` shows `controller` and `hybrid`.

Current operator review targets:

- `http://127.0.0.1:3456/app/router/strategy`
- `http://127.0.0.1:3456/app/router`

Status:

- Agent QA for addendum 22 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- Current verified runtime state is `controller` + `hybrid`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 23 Agent QA Update

Manual QA finding:

- `http://127.0.0.1:3456/` returned raw JSON `{ "error": "not found" }` instead of the runtime UI.

Root cause:

- The bridge already serves `index.html` for `/` when `staticRoot` exists.
- The Phase 5 QA server had been restarted after generated runtime-ui build assets were removed, so `role-model-router/apps/runtime-ui/build/client/index.html` was missing and the server fell through to the JSON 404 handler.

Implementation and operational repair:

- Added a runtime-host-bridge regression test proving `/`, `/app`, and `/app/router/strategy` serve the SPA shell when `staticRoot` exists.
- Rebuilt `@role-model-router/runtime-ui` to restore the generated `build/client` review artifact.
- Restarted the Phase 5 QA server against the rebuilt client.

Verification evidence:

- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-23-root-route-runtime-ui-build.log`
- GREEN static shell regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-23-root-route-static-shell-green.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-23-root-route.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-23-root-route.err.log`
- Browser/API verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-23-root-route-static-shell.json`
  - Result: `/`, `/app`, and `/app/router/strategy` return `200` HTML; opening `http://127.0.0.1:3456/` in the browser lands on `/app`, shows `Runtime overview`, and no longer shows JSON `not found`.

Current operator review target:

- `http://127.0.0.1:3456/`

Status:

- Agent QA for addendum 23 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- `role-model-router/apps/runtime-ui/build/client` is intentionally present for live review only and should remain untracked.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 24 Agent QA Update

Manual QA finding:

- With routing strategy `hybrid` and execution mode `remote_only`, `/app/router` still surfaced local candidates and displayed raw configured alias hints in the alias table.
- The router overview needed to reflect the effective router posture, not the unfiltered endpoint registry.

Root cause:

- The runtime-host bridge built router summary, guidance, alias expansion, candidate counts, and candidate rows from `currentRegistry.endpoints` without filtering by explicit `executionMode`.
- The runtime UI alias table derived model rows from raw runtime config plus raw endpoint snapshot, which reintroduced local alias hints even after the backend exposed the effective remote-only expansion.

Implementation repair:

- Added `filterRouterRegistryByExecutionMode()` to centralize router effective-registry filtering.
- Updated router default guidance, summary alias expansion, configured candidate counts, and candidate listing to use the effective registry for `remote_only` and `local_only`.
- Updated `/app/router` alias inventory to display `Effective models` from backend `summary.aliasInventory` instead of raw configured model hints.

Verification evidence:

- RED effective-registry contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-24-remote-only-router-effective-candidates-red.log`
  - Expected failure: `filterRouterRegistryByExecutionMode` was missing.
- GREEN effective-registry contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-24-remote-only-router-effective-candidates-green.log`
  - Result: focused regression passed.
- GREEN runtime host bridge build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-24-runtime-host-bridge-build.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-24-runtime-ui-router-effective-models-build.log`
- Browser/API verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-24-remote-only-router-effective-candidates.json`
  - Result: after applying `hybrid` + `remote_only` with one local and one remote model hint, `/api/role-model/router/summary` reports `configuredCandidateCount: 1`, alias `localEndpointCount: 0`, alias `remoteEndpointCount: 1`; `/api/role-model/router/candidates` returns only `remote`; `/app/router` shows `Effective models` with `moonshot/kimi-k2.7-code` and the candidate table contains no `llama-swap.local` endpoint.

Current operator review target:

- `http://127.0.0.1:3456/app/router`

Status:

- Agent QA for addendum 24 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- Current verified runtime state is `hybrid` + `remote_only` with one effective remote candidate.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 25 Agent QA Update

Manual QA finding:

- The routing strategy, execution mode, and alias-mode contract needed a complete backend/UI map and systematic verification across supported combinations.
- `/app/router/strategy` still surfaced a stale persisted local controller through `/api/role-model/controller` after `remote_only` made that endpoint ineffective.

Root cause:

- Router summary and candidates had been repaired to use the effective execution-mode registry, but the public controller endpoint and live request/model-list paths still had raw-registry exposure points.
- Persisted controller assignment was returned before validating that the controller endpoint remained available under the current execution mode.

Implementation repair:

- Added explicit effective-routing backend accessors: `effectiveRegistry` and `getEffectiveRoutableInventory()`.
- Routed chat completions, responses, controller guidance, `/v1/models`, QA/CLI server options, and validation harnesses through effective execution-mode-scoped registry/inventory inputs.
- Filtered persisted controller readback through `getCurrentControllerAssignment()` so stale local controllers are replaced by an allowed remote default under `remote_only`.
- Preserved raw `backend.registry` for diagnostics/setup surfaces that need complete inventory.

Routing contract map:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-25-routing-contract-map.md`

Verification evidence:

- RED focused regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-25-routing-execution-mode-matrix-red.log`
- GREEN focused regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-25-routing-execution-mode-matrix-green.log`
  - Result: `2` focused tests passed.
- GREEN runtime host bridge build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-25-runtime-host-bridge-build.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-25-routing-matrix.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-25-routing-matrix.err.log`
- Live API matrix:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-25-routing-config-matrix.json`
  - Result: `80 / 80` strategy/execution-mode/alias-mode combinations passed.
  - Stale-controller check passed: forced persisted local controller was not surfaced under `remote_only`; router summary and public controller endpoint both returned `moonshot.personal.kimi-code.global.kimi-k2.7-code`.
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-25-routing-browser-verification.json`
  - Result: `/app/router` and `/app/router/strategy` showed `hybrid`, `remote_only`, the remote Moonshot controller/candidate, no local routing candidate, and no JSX code leak.

Current operator review targets:

- `http://127.0.0.1:3456/app/router`
- `http://127.0.0.1:3456/app/router/strategy`

Status:

- Agent QA for addendum 25 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- Current verified runtime state is `hybrid` + `remote_only`, with a mixed alias resolving effectively to the remote Moonshot endpoint only.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 26 Agent QA Update

Manual QA finding:

- `/app/router` and `/app/connect/downstream` displayed the stale configured alias `mixed.local-remote` after the operator selected `hybrid` routing strategy with `remote_only` execution mode.
- The router should continue to display and serve an alias, but the alias must be derived from the selected routing strategy and execution mode.

Root cause:

- The routing strategy page updated `routingStrategy` and `executionMode`, but the persisted `model_aliases` key remained `mixed.local-remote`.
- Router summary, downstream setup, and `/v1/models` correctly consumed the backend alias config, so they all propagated the stale alias from the config layer.

Implementation repair:

- Added backend canonical routing-alias derivation: `<normalized-routing-strategy>.<normalized-execution-mode>`.
- Example: `hybrid` + `remote_only` now produces `hybrid.remote-only`.
- Canonicalization preserves the primary alias model pool while updating the primary alias ID and alias routing mode.
- Canonicalization runs through config parsing/normalization so YAML edits, API updates, router summary, downstream setup, and `/v1/models` share the same alias contract.

Verification evidence:

- RED config regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-26-routing-alias-config-red.log`
- RED backend regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-26-routing-alias-backend-red.log`
- GREEN focused config/backend regressions:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-26-routing-alias-config-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-26-routing-alias-backend-green.log`
- GREEN broader config suites:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-26-unified-runtime-config-full.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-26-backend-unified-runtime-config-full.log`
- GREEN TypeScript and builds:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-26-runtime-host-bridge-tsc.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-26-runtime-host-bridge-build.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-26-runtime-ui-build.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-26-routing-alias.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-26-routing-alias.err.log`
- Live API/config verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-26-routing-alias-api-verification.json`
  - Result: after submitting a payload containing stale `mixed.local-remote`, persisted runtime config, router summary, downstream setup, and serialized API payloads no longer contained `mixed.local-remote`; the persisted alias was `hybrid.remote-only`.
- Route availability verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-26-routing-alias-html-verification.json`
  - Result: `/app/router` and `/app/connect/downstream` returned HTTP 200 after the rebuilt runtime was refreshed.

Current operator review target:

- `http://127.0.0.1:3456/app/router`

Status:

- Agent QA for addendum 26 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- Current verified alias contract is `hybrid` + `remote_only` -> `hybrid.remote-only`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 27 Agent QA Update

Manual QA finding:

- The Runtime overview header had a poor filter layout: the obsolete `Summary` header button consumed the lower header row while telemetry filters were forced into the header action area.

Implementation repair:

- Removed the overview `Summary` button from the dashboard header.
- Reused that reclaimed header row for telemetry filters.
- Updated the dashboard action block to a single responsive filter grid:
  - time range control
  - breakdown select
  - source filter select

Verification evidence:

- RED focused UI source contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-27-overview-header-filters-red.log`
- GREEN focused UI source contract:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-27-overview-header-filters-green.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-27-runtime-ui-build.log`
- GREEN runtime host bridge TypeScript check:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-27-runtime-host-bridge-tsc.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-27-overview-header-filters.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-27-overview-header-filters.err.log`
- Browser refresh:
  - In-app browser refreshed to `http://127.0.0.1:3456/app` after rebuild.
  - Local Playwright CLI was unavailable in the workspace, so visual verification remains operator-facing in the in-app browser.

Current operator review target:

- `http://127.0.0.1:3456/app`

Status:

- Agent QA for addendum 27 is complete.
- Rebuilt QA server remains available on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 28 Agent QA Update

Manual QA finding:

- The Runtime overview header still displayed the old layout after rebuild: the `Summary` subnav pill remained visible and telemetry filters were still positioned in the top header action area.

Root cause:

- Addendum 27 patched the dashboard route action block, but the visible `Summary` pill was produced by the shared shell header from the Overview section's one-item subnavigation.
- The shared shell also rendered page actions in a two-column title/action header grid, so filters could not occupy the intended lower header rail.

Implementation repair:

- Updated the shared app shell to suppress secondary header navigation when the active section only has one route.
- Moved page actions out of the title grid and into the lower header rail.
- Kept the Overview route registered for `/app` lookup while preventing its single route item from rendering as a redundant visible `Summary` pill.

Verification evidence:

- RED focused UI shell regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-28-overview-header-actions-red.log`
- GREEN focused UI shell regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-28-overview-header-actions-green.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-28-runtime-ui-build.log`
- GREEN runtime host bridge TypeScript check:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-28-runtime-host-bridge-tsc.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-28-overview-header-actions.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-28-overview-header-actions.err.log`
- Browser refresh:
  - In-app browser opened a fresh tab at `http://127.0.0.1:3456/app` after rebuild.

Current operator review target:

- `http://127.0.0.1:3456/app`

Status:

- Agent QA for addendum 28 is complete.
- Rebuilt QA server is listening on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 29 Agent QA Update

Manual QA finding:

- The Runtime overview filter rail still split the date range buttons across two rows and did not align controls as intended.

Implementation repair:

- Updated the telemetry time range control to keep date buttons on a single no-wrap row.
- Updated the Runtime overview header action rail to use two zones:
  - left-aligned, bottom-aligned time range buttons
  - right-aligned dropdown filter group

Verification evidence:

- RED focused UI filter rail regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-29-overview-filter-rail-red.log`
- GREEN focused UI filter rail regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-29-overview-filter-rail-green.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-29-runtime-ui-build.log`
- GREEN runtime host bridge TypeScript check:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-29-runtime-host-bridge-tsc.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-29-overview-filter-rail.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-29-overview-filter-rail.err.log`
- Browser refresh:
  - In-app browser opened a fresh tab at `http://127.0.0.1:3456/app` after rebuild.

Current operator review target:

- `http://127.0.0.1:3456/app`

Status:

- Agent QA for addendum 29 is complete.
- Rebuilt QA server is listening on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 30 Agent QA Update

Manual QA finding:

- `/app/models/benchmark` did not accurately reflect the configured model inventory shown on `/app/models`.

Root cause:

- `/app/models` builds its model inventory from the full runtime snapshot.
- `/app/models/benchmark` built its benchmark subject list only from `/api/role-model/router/candidates`.
- Router candidates can be filtered by current routing strategy, execution mode, alias posture, and controller eligibility, so benchmarkable configured endpoints disappeared from the benchmark page even though they were correctly configured and visible on `/app/models`.

Implementation repair:

- Added a benchmark inventory helper that derives benchmark endpoint candidates from the configured runtime endpoints and merges router-candidate metadata when available.
- Updated `/app/models/benchmark` to fetch the runtime snapshot and router candidates, then render/select benchmark endpoints from the full configured endpoint inventory rather than only the currently filtered router candidate list.

Verification evidence:

- RED focused benchmark inventory regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-30-benchmark-configured-models-red.log`
- GREEN focused benchmark inventory regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-30-benchmark-configured-models-green.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-30-runtime-ui-build.log`
- GREEN runtime host bridge TypeScript check:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-30-runtime-host-bridge-tsc.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-30-benchmark-configured-models.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-30-benchmark-configured-models.err.log`
- Browser refresh:
  - In-app browser opened a fresh tab at `http://127.0.0.1:3456/app/models/benchmark` after rebuild.

Current operator review target:

- `http://127.0.0.1:3456/app/models/benchmark`

Status:

- Agent QA for addendum 30 is complete.
- Rebuilt QA server is listening on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 31 Agent QA Update

Manual QA finding:

- The addendum 30 repair made `/app/models/benchmark` merge runtime snapshot endpoints with router candidates, but that left two frontend sources for configured/available models.
- `/api/role-model/router/candidates` itself should be the canonical configured candidate source used by router and benchmark UI.

Root cause:

- The backend candidate API was built from `getRouterEffectiveRegistry()`, which filters the endpoint registry by current execution mode.
- That filtering is correct for execution handoff, but incorrect for the candidate inventory API because it can hide configured endpoints that are valid but currently excluded by execution mode.

Implementation repair:

- Changed `/api/role-model/router/candidates` backend data to enumerate the full configured runtime endpoint registry.
- Added `executionModeEligible` to each candidate so the UI can show whether a configured endpoint is currently eligible for the active execution mode without dropping it from the canonical list.
- Updated the router UI to show `excluded by mode` for configured candidates outside the active execution mode.
- Reverted the addendum 30 frontend split-source workaround so `/app/models/benchmark` again consumes only `/api/role-model/router/candidates` for benchmark subjects.

Verification evidence:

- RED focused backend canonical-source regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-31-router-candidates-canonical-red.log`
- GREEN focused backend canonical-source regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-31-router-candidates-canonical-green.log`
- GREEN runtime UI candidate contract tests:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-31-runtime-ui-candidate-contract-green.log`
- GREEN runtime host bridge TypeScript check:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-31-runtime-host-bridge-tsc.log`
- GREEN runtime UI build:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-31-runtime-ui-build.log`
- Rebuilt QA server:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-31-router-candidates-canonical.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-server-addendum-31-router-candidates-canonical.err.log`
- Direct API evidence:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-31-router-candidates-api.json`
- Browser verification:
  - `/app/models/benchmark` renders benchmark subjects from the canonical router candidates API.
  - `/app/router` renders the same candidate source and exposes routing eligibility state.

Current operator review target:

- `http://127.0.0.1:3456/app/router`
- `http://127.0.0.1:3456/app/models/benchmark`

Status:

- Agent QA for addendum 31 is complete.
- Rebuilt QA server is listening on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Addendum 32 Agent QA Update

Manual QA finding:

- Running the full benchmark suite for three remote models on `/app/models/benchmark` failed instantly for every case and every endpoint.
- Per-case benchmark artifacts showed `benchmark_execution_failed` with low latency, indicating a synchronous routing/execution rejection rather than remote model execution.

Root cause:

- Addendum 31 correctly changed `/api/role-model/router/candidates` to expose the full configured endpoint inventory and mark excluded endpoints with `executionModeEligible: false`.
- `/app/models/benchmark` still selected all healthy candidates by default and allowed an ineligible remote endpoint to be selected as a benchmark subject and judge.
- The backend `runBenchmark()` start path accepted those endpoint IDs and returned `202 running`; only the asynchronous benchmark runner rejected them later because chat execution uses the execution-mode-filtered effective registry.
- `runCaseOnEndpoint()` swallowed execution errors and persisted blank benchmark failures, hiding the concrete endpoint rejection from artifacts.

Implementation repair:

- Added a shared benchmark target eligibility guard that rejects endpoints with `executionModeEligible: false`.
- Wired the backend benchmark start path to run that guard synchronously before creating a run id or returning `202`.
- Kept the runner-level eligibility guard as a second safety net for direct runner callers.
- Updated benchmark execution failure persistence to retain the thrown error message in `actualResponse` and `rawResponse`.
- Added frontend benchmark helpers so the benchmark page only selects runnable candidates, excludes ineligible endpoints from judge choices, and displays disabled ineligible rows with `Excluded by current execution mode`.

Verification evidence:

- RED focused backend guard regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-32-benchmark-guards-red.log`
- RED focused frontend selection regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-32-benchmark-selection-red.log`
- RED backend `runBenchmark()` integration regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-32-backend-runbenchmark-red.log`
- GREEN focused backend guard regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-benchmark-guards-green.log`
- GREEN focused frontend selection regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-benchmark-selection-green.log`
- GREEN backend `runBenchmark()` integration regression:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-backend-runbenchmark-green.log`
- GREEN broader benchmark host suite:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-host-benchmark-suite-after-api-fix.log`
- GREEN broader UI benchmark/API suite:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-ui-benchmark-suite.log`
- GREEN type/build checks:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-host-typecheck.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-ui-typecheck.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-host-build-after-api-fix.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-32-ui-build.log`
- Direct API evidence:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-32-pre-restart-runtime-config.json`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-32-pre-restart-candidates.json`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-32-post-fix-seeded-remote-candidates.json`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-32-post-fix-invalid-benchmark-start.json`
- Browser verification:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-32-browser-benchmark-ui-verification.json`
  - `/app/models/benchmark` shows the ineligible remote Moonshot endpoint disabled and unchecked.
  - `/app/models/benchmark` excludes the ineligible remote endpoint from judge options.
  - `/api/role-model/benchmark/runs` rejects a benchmark start containing the ineligible remote endpoint with `400` and `execution_mode_ineligible_endpoints`.

Current operator review target:

- `http://127.0.0.1:3456/app/models/benchmark`

Status:

- Agent QA for addendum 32 is complete.
- Rebuilt QA server is listening on `127.0.0.1:3456`.
- Stop remains at Phase 5 pending operator manual QA approval.

## Dashboard Graph E2E Agent QA Update

User-requested QA scope:

- Test the different dashboard graphs end to end.
- Verify the rebuilt runtime in the browser.
- Exercise graph data by running test requests through the router endpoint.

Router endpoint traffic:

- Runtime under test: `http://127.0.0.1:3456`
- Router endpoint used: `POST /v1/chat/completions`
- Requested model alias: `baseline.local-only`
- Probe set:
  - `baseline-easy` with `x-role-model-routing-mode: baseline`
  - `difficulty-medium` with `x-role-model-routing-mode: difficulty`
  - `controller-hard` with `x-role-model-routing-mode: controller`
  - `hybrid-cache` with `x-role-model-routing-mode: hybrid`
- Result:
  - The QA runtime only exposed an inactive local llama-swap backend at this point, so the four probes returned expected router/execution errors (`503 VENDOR_NOT_CONFIGURED` or `400` validation errors).
  - A local OpenAI-compatible mock upstream was then started on `127.0.0.1:45679`, registered through the runtime account and endpoint APIs, and added to runtime config as `openai.litellm`.
  - The runtime accepted the mock account, endpoint, and `litellm_proxy.providers` config, and `/v1/models` exposed `baseline.hybrid` plus `openai/gpt-4.1-mini-fast`.
  - Four additional direct-model router probes and four post-config router probes still returned `503 VENDOR_NOT_CONFIGURED`, because this Phase 5 QA launcher keeps runtime vendor startup disabled and remote execution remains unavailable in the running server.
  - The analytics query window increased from the six seeded rows to `18` request-count rows, proving the router probes were visible to the dashboard analytics backend.
  - `GET /api/role-model/requests?limit=12` still returned the six seeded inspection rows; that is expected because the chart route reads analytics telemetry, while the request ledger only exposes fully persisted inspection records.

Telemetry API graph verification:

- API endpoint: `POST /api/role-model/telemetry/query`
- Query window: 24 hours
- Granularity: `hour`
- Result: all `19` chart query contracts returned bucketed data with nonzero expected metrics or ranking rows.

Verified chart contracts:

- `/app`
  - `Token Usage Over Time`
  - `Effective Cost Over Time`
  - `Cost Avoided Over Time`
  - `Latency Trend`
  - `Cache Efficiency Trend`
  - `Success vs Failure Volume`
- `/app/observe/requests`
  - `Request Volume Over Time`
  - `Token Usage Over Time`
  - `Effective Cost Over Time`
  - `Latency Trend`
  - `Cache Efficiency Trend`
  - `Failure Trend`
  - `Ranked Comparison`
- `/app/observe/routing`
  - `Cost Avoided By Routing`
  - `Routing Decision Volume`
  - `Difficulty Distribution`
  - `Strategy Selection Trend`
  - `Role Demand`
  - `Model Selection`

Browser verification:

- In-app browser verification ran against the rebuilt runtime.
- `/app`
  - Expected chart headings visible: `6/6`
  - Chart/SVG surfaces present: yes
  - Empty chart states visible: no
  - Telemetry load error visible: no
- `/app/observe/requests`
  - Expected chart headings visible: `7/7`
  - Chart/SVG surfaces present: yes
  - Empty chart states visible: no
  - Telemetry load error visible: no
- `/app/observe/routing`
  - Expected chart headings visible: `6/6`
  - Chart/SVG surfaces present: yes
  - Empty chart states visible: no
  - Telemetry load error visible: no

Status:
LockedAt: `2026-06-18T11:02:19Z`
LockHash: `c4dc676b414b851c3ec9211eaaf4d6c66f2cc6130913e6484694c6c7cfaf9770`

- Dashboard graph E2E agent QA is complete.
- All graph contracts and rendered chart pages passed verification on `127.0.0.1:3456`.
- Remaining caveat: the rebuilt QA runtime did not have an active vendor execution backend, so fresh router probes verified analytics ingestion through failed router requests. Successful token/cost/cache chart metrics were verified from the launcher-seeded telemetry rows, not from fresh successful completions.

## QA Execution Record

- QA Execution Mode: hybrid
- Agent Executor: Codex
- Tools Used: PowerShell, in-app browser, direct HTTP API probes, runtime QA launcher, recursive lock script
- Agent-operated runtime target: `http://127.0.0.1:3456`
- Agent-operated execution included direct API checks, rebuilt runtime browser verification, route sweeps, dashboard graph verification, and router endpoint probes.
- Human/operator execution: user reviewed the rebuilt runtime iteratively during Phase 5 and explicitly approved manual QA in chat on `2026-06-18` with the instruction to mark Phase 5 manual QA as pass.
- Final QA scope includes the base run plus all effective addenda and same-phase updates:
  - `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
  - `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`
  - `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-03.md`
  - `.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-04.md`
- Those four files are the standalone addenda documents. This same `05-manual-qa.md` artifact also contains internal `Addendum 01` through `Addendum 32` agent QA updates, and those internal updates are part of the final Phase 5 QA scope.

## QA Scenarios and Results

- Base analytics scenario: PASS. `/app`, `/app/observe/requests`, and `/app/observe/routing` rendered all required charts against seeded historical telemetry.
- Route stability scenario: PASS. Broken routes found during manual QA were repaired and rebuilt before final sign-off.
- Apple-theme adherence scenario: PASS. Run 48 shell/theme regressions were repaired, including typography, quiet panels, dropdowns, status pills, chart palette, sidebar theme toggle, and redundant panel removal.
- Native/custom select scenario: PASS. Provider and routing strategy dropdown selection lists were themed and keyboard-searchable after repairs.
- Chart color scenario: PASS. Same-chart metric color reuse was audited and repaired.
- Routing strategy persistence/readback scenario: PASS. Strategy/execution mode settings save, read back, and drive effective routing alias/candidate display.
- Benchmark candidate scenario: PASS. `/api/role-model/router/candidates` is the canonical configured candidate source; benchmark UI excludes execution-mode-ineligible endpoints and backend rejects invalid benchmark starts synchronously.
- Dashboard graph E2E scenario: PASS with caveat. All chart query contracts and rendered chart pages passed; fresh router probes created analytics-visible failed rows because vendor startup is intentionally disabled in the QA launcher, while successful cost/token/cache data came from seeded rows.

## Evidence and Artifacts

- Runtime launcher: `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-launch.ts`
- Runtime logs: `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/phase5-qa-runtime.log`
- API evidence: `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-summary.json`, `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-requests.json`, `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-query-models.json`
- Addenda API/browser evidence: `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/`
- Test and build evidence: `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/`, `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/`, `.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/build/`

## User Sign-Off

- Approved by: operator/user
- Date: 2026-06-18
- Operator manual QA result: PASS.
- Sign-off source: user message on `2026-06-18`: "ok lets mark phase 5 manual qa as pass. continue with the recursive run. make sure that ll of the addenda docs are considered when closing out the run".
- Scope of approval: base analytics implementation plus all same-phase addenda and repairs visible in the rebuilt runtime at `127.0.0.1:3456`.

## Traceability

- R1 -> PASS via persisted telemetry rows, summary/query APIs, and seeded/fresh request telemetry evidence.
- R2 -> PASS via analytics charts reading historical telemetry rows rather than live registry state.
- R3 -> PASS via `POST /api/role-model/telemetry/query` direct API verification and all chart query contracts.
- R4 -> PASS via preserved runtime boundary: chart display only on `/app` and Observe analytics routes; setup/config pages remain non-chart operational surfaces.
- R5 -> PASS via Apple-theme chart design-system QA, dropdown theming, typography repairs, chart color uniqueness, and removal of Swiss-era/eyebrow/divider regressions.
- R6 -> PASS via `/app` overview chart/browser verification.
- R7 -> PASS via `/app/observe/requests` chart/browser verification.
- R8 -> PASS via `/app/observe/routing` chart/browser verification and evidence-oriented adjacent Observe routes.
- R9 -> PASS via RED/GREEN test evidence for base work and addenda repairs.
- R10 -> PASS via rebuilt runtime browser verification, direct API checks, route sweeps, graph E2E QA, and operator sign-off.

## Coverage Gate

- [x] All approved chart routes were verified in the rebuilt browser runtime.
- [x] All four standalone addenda documents and all internal Phase 5 `Addendum 01` through `Addendum 32` updates were considered in Phase 5 closeout.
- [x] Agent-operated QA evidence and user manual QA sign-off are both recorded for hybrid mode.

Coverage: PASS

## Approval Gate

- [x] Phase 5 manual QA is approved by the operator.
- [x] No unresolved Phase 5 acceptance blockers remain.
- [x] The vendor-startup-disabled caveat is explicitly documented and does not invalidate chart contract/browser verification.

Approval: PASS
