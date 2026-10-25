## Run 115 Phase 1 — AS-IS client analysis (public worktree, read-only)

**Evidence status:** static source observation at public baseline `f0d50fab` in this worktree. No tests executed, no build, no browser, no provider, no file edits, no delegation. Nothing below is a reproduced failure; all counts come from `Select-String`/reads on the files cited. Unknowns are marked **UNKNOWN**, not inferred.

### 1. Route inventory — file count ≠ URL count

`role-model-router/apps/runtime-ui/app/routes.ts` (98 lines) is the single route table:

- **75 route entries** = 73 `route()` + 2 `index()`; of these **1** is the `app` layout parent (`routes.ts:5`), **1** is the wildcard `*` → `routes/not-found.tsx` (`:97`), and **20** are `legacy-redirect.tsx` stubs.
- **53 concrete canonical URL patterns** remain (including `/` from `:4` and `/app` from `:6`).
- **20 legacy redirects**, all one module (`app/routes/legacy-redirect.tsx`, 29 lines): `local/{swap,policy,logs,matrix,peers}` (`:20-25`), `control/providers` (`:27`), `control/routing-strategy` (`:32`), `control/runtime-config` (`:36`), `control/controller` (`:40`), `endpoints`, `control/endpoints` (`:44-45`), `control/roles` (`:47`), `control/benchmark`, `control/models` (`:50-51`), `observe` (`:57`), `endpoints/{downstream,upstream}`, `integrations/{downstream,upstream}` (`:68-79`), `control/session-readiness` (`:90`).
- Three detail patterns carry params: `/app/router/decisions/:requestId` (`:56`), `/app/observe/requests/:requestId` (`:66`), plus the 8 `learning/*` paths all served by one module with per-route ids (`:82-87`).

Second truth source: `app/lib/design-system.ts` exposes `runtimeNavigationSections` (`:739`) — **10 sections, 46 nav items, 2 `hubTo`** (Local → `/app/local/choose`, Learning → `/app/learning`) — and `getRuntimeRouteDefinition` (`:1282`), a hand-written `if (pathname === ...)` alias chain that re-maps ~10 legacy paths (e.g. `/app/control/providers`, `/app/providers`, `/app/local/peers`). 53 `to: "/` literals exist in that file.

**Consequence:** route truth is split across three places (routes.ts, nav sections, alias chain) with **no parity test binding them found in this pass**. `routes.ts` has 53 canonical paths vs 46 nav items; the delta includes `/`, `router/config`, the two `:requestId` details, `system/operator` (has id `system-operator`, absent from nav), and `local/choose` (hub, not item). That delta is a requirement (R11), not a bug — but any Foldkit route table must be generated from one authority.

### 2. Route family ownership map

| Family | Canonical URLs | Route module(s) | Nav items |
|---|---|---|---|
| Overview | `/app` | `routes/dashboard.tsx` | 1 |
| Studio | `/app/studio/{chat,images,audio,rerank,advanced}` | `workbench`, `studio-images`, `studio-audio`, `studio-rerank`, `studio-advanced` | 5 |
| Local | `/app/local/{choose,models,peer-models,llama-swap/{models,swap,policy,logs,matrix},endpoints}` | 9 modules; `local-models.tsx` / `local-matrix.tsx` are 4–5-line modules consistent with re-export shims (**UNKNOWN** until disassembled) | 7 + hub |
| Remote | `/app/remote/providers` | `routes/providers.tsx` | 1 (`controlProvidersRoute`) |
| Models | `/app/models`, `/models/roles`, `/models/benchmark` | `control-models`, `control-roles`, `control-benchmark` | 3 |
| Router | `/app/router`, `/router/{config,candidates,decisions,decisions/:id,strategy,agent-strategy,workloads,controller}` | 9 modules; `router-config.tsx`, `workloads.tsx`, `agent-strategy.tsx` are 5-line modules, yet `workloads`/`agent-strategy` are real nav targets | 7 |
| Observe | `/app/observe`, `/observe/{activity,requests,requests/:id,routing,queues,logs,store-degradation-receipts,observability-snapshot}` | 8 modules | 7 |
| Connect | `/app/connect`, `/connect/{downstream,upstream}` | `endpoints.tsx` (nav `connectRegistryRoute`), `integrations-*` | 3 |
| System | `/app/system/{runtime,runtime-config,session-readiness,peers,extensions,storage-retention,operator}` | 7 modules | 6 (no `operator`) |
| Learning | `/app/learning[,/{configuration,packs,decisions,evidence,history}]` | one `learning.tsx`, 6 route ids | 6 + hub |
| Ungrouped | `/`, `*` | `routes/index.tsx` (4 lines), `not-found.tsx` | — |

Note the naming drift already present: URL segment `remote/` ↔ symbol `controlProvidersRoute`; URL `connect` ↔ symbol `connectRegistryRoute`; URL `system/runtime-config` ↔ `controlRuntimeConfigRoute`. Any migration that derives ids from symbols will change URLs.

### 3. Root, shell, and subscription lifecycle

`app/root.tsx` (187 lines) owns document-level behavior that a Foldkit shell must reproduce exactly:

- 3 Geist font preloads (`:15-38`); theme bootstrap inline script keyed on `localStorage["role-model-runtime-theme"]`, writing `data-theme`, `dark`/`light` classes, `color-scheme`, `--rm-*` and `--rm3-*` custom properties, and `<meta name="theme-color">` (`:40-72`). Values are injected from `BOOT_THEME_PALETTES`/`BOOT_RM3_TOKEN_KEYS` (`lib/theme.ts`).
- `Layout` (`:74`), pass-through `App` (`:99`), `HydrateFallback` (`:103`), and `ErrorBoundary` that renders `NotFoundRoute` on 404 (`:166-187`).
- `ScrollRestoration` (`:92`) — scroll restoration is framework-owned today, not shell logic.

`app/components/app-shell.tsx` (302 lines) is the command/shell owner:

- Private, non-exported resolvers `resolveSecondaryPath` (`:49-56`, longest-`to` prefix match) and `isSecondaryNavPath` (`:58-62`) — the only logic deciding which sub-page is active for detail URLs.
- Section/title resolution `:103-110` via `getRuntimeRouteDefinition` with fallback to `/app`; handlers `:112-132` (`navItems`, `secondaryOptions`, `secondaryValue`).
- Effects: initial theme + `syncDocumentTheme` (`:134-138`); scroll-to-top on pathname (`:140-144`); footer/inventory load with a **7-way `Promise.all`** (`:155-177`), `startDeferredLiveRefresh` (`:214-236`), a **10 s `setInterval` poll** (`:239-241`), and cleanup (`:243-247`) — with **dependency `[pathname]` (`:248`)**, so the SSE subscription and poll are torn down and recreated on every navigation.
- Theme change handler `:250-256` (`startTransition` + DOM sync + localStorage).
- Render `:258-301`: `Sidebar` desktop-only (`hidden md:flex`), separate mobile `<nav aria-label="Primary navigation">` with `aria-current`, `SubPageHeaderBar`, `PageContent` whose children are keyed by `contentRevision` (`:284-297`) so every revision remounts the route subtree.

**Source observations for R12 (not reproduced):** the stream is per-shell-instance and per-pathname, not a single owned subscription; `runtime-refresh-bus.ts` defines a deduping `createRuntimeRefreshBus()` factory (revision `<=` last is dropped, `:44-53`) but no owned singleton was found in this pass — **UNKNOWN** whether any page instantiates one. `subscribeRuntimeRefreshStream` (`runtime-api.ts:3016`) parses JSON inside the EventSource listener with no try/catch; a malformed frame throws in the listener. `startDeferredLiveRefresh` (`live-refresh.ts:8-31`) connects only after the first load settles and never reconnects after `close` — reconnect semantics on network loss are **UNKNOWN**.

### 4. Facade: runtime-api.ts

`app/lib/runtime-api.ts` is 3,946 lines (read total) with **143 exported `async function`s**, 0 exported consts, 5 `EventSource` references, and **0 literal `fetch(` calls** (all I/O goes through injected `RuntimeFetcher`):

- `RuntimeFetcher` type + `RuntimeEventSourceFactory = (url) => RuntimeEventSourceLike` (`:904`) — the injectable seam R12 requires **already exists**.
- `fetchJson(path, fetcher, init?)` (`:1656`): rejects on `!response.ok` with `Error(await extractErrorMessage(...))`, clones response twice, detects HTML-instead-of-JSON and invalid JSON with distinct messages. **No typed error union, no AbortSignal handling observed in this helper** (init is passed through, so a caller *could* pass one — usage **UNKNOWN**).
- `postJson` (`:1784`): `POST` + `content-type: application/json` + `JSON.stringify`; optional `headers`, plus `withOperatorToken` (`:1799+`) for operator writes.
- Retry: `withRuntimeStartupRetry` (`:1707`) with delays `[200,500,1000,2000]ms` gated on `runtime_initializing`; a separate `RUNTIME_SUMMARY_RETRY_DELAYS_MS = [150,300]` (`:1674`) exists. Two retry policies live in one module → per-operation disposition work under R19/R27.
- All paths are absolute `/api/role-model/*` (e.g. `/api/role-model/runtime/config`, `/downstream/openai`, `/controller`, `/telemetry/stream`); no base-URL/env indirection observed.

**Facade migration scope:** 143 operations × their callers across `app/routes/**` and `app/components/**`, plus 2 chart adapters and `telemetry-analytics`, `view-models`, `design-system`, `live-refresh`, `runtime-refresh-bus`, `theme`, `sidebar-footer`, `stale-refresh-diagnostics`. That is the R19 enumeration surface; it is not a module split.

### 5. Pure domain logic vs React-specific state

**Pure / framework-free today:** `runtime-api.ts` (fetch functions; DOM-free except `EventSource` in the 3 subscribe helpers), `observe-chart-adapter.ts` (imports only types + `adaptOverviewChartBlock`/`resolveOverviewChartFormatters` + `buildTelemetryRankingChartModel`; exports `resolveObserveChartSpan` `:17`, `resolveRankingStatus` — private `:42-67`, `adaptObserveChartBlock` `:96-181`), `overview-chart-adapter.ts` (same import graph), `telemetry-analytics.ts`, `telemetry-chart-config.ts`, `telemetry-route-models.ts`, `view-models.ts`, `runtime-refresh-bus.ts` (Map pub/sub, no DOM), `live-refresh.ts` (plain closures), and the data tables in `design-system.ts`.

**React-coupled:** `root.tsx`, `app-shell.tsx` (`useState/useEffect/useRef/useMemo/startTransition`), all `app/components/*` chart and page modules, and `packages/ui` itself.

**Key extraction blocker in `packages/ui`:** `src/index.ts:27-38` exports `ChartContainer`, `useChart`, `ChartTooltip*`, `ChartLegend*` and `ChartStyle` from one module; `:59-91` mixes `TimeSeriesAreaChart`/`LineChart`/`BarChart` components with pure helpers (`chartBarBucketCenter`, `chartWindowBoundaryTicks`, `chartValueDomain`, `resolveSeriesColor`, `seriesToChartConfig`, `seriesNeedsDualY`, `resolveChartYAxisLayout`, `collectChartAxisTickLabels`); `:93-99` `RankingBarChart` + `rankingPlotHeight`/`resolveRowColor`; `:101-109` `CompositionChart` + `defaultRanks`/`totalValue`. The header (`:1-7`) states the package *is* the React design system, with specimens deep-import-only. A React-free chart core therefore requires **module boundary moves**, not just new exports — the pure functions are currently reachable only by importing modules that pull `recharts`/React.

### 6. Chart semantics, ARIA, and theme

Evidence from `packages/ui/src` grep (`aria-`, `role="`, `prefers-reduced-motion`, `data-theme`, `ResizeObserver`, `tabular-nums`):

- Theme is CSS-variable driven and keyed on `html[data-theme]`: `chart.tsx:7-8` — `light: '[data-theme="light"]'`, `dark: '[data-theme="dark"]'`, with a comment that runtime-ui uses `data-theme`, not a class. This matches `root.tsx:53` (`root.dataset.theme`) and `syncDocumentTheme` in `app-shell.tsx:137/254`. Themes are consistent; whether charts recompute on theme change is **UNKNOWN** (no theme-dependent JS path observed in the grepped regions).
- Accessibility present: decorative icons `aria-hidden` (`chart-card.tsx:107`, `page-filters.tsx:36/45`, `page-shell.tsx:21/35`), `metric-strip` `role="group"` + `aria-label` (`:102-103`, `:141-142`), `segmented-control` `role="group"` + `aria-pressed` (`:49-62`), `page-filters` listbox `role/aria-expanded/aria-selected` (`:151-197`), `observe-shared.tsx:185` `aria-label="Observe pages"`, `observe-requests.tsx:142` per-row label.
- **No `role="img"`, no chart-level `aria-label`, no `sr-only`/`<table>` numeric alternative, and no `role="table"` found in any chart module.** Charts expose only `tabular-nums` on numeric spans (`chart-ranking.tsx:153`, `chart-time-series.tsx:689`, `chart.tsx:302`, `chart-composition.tsx:209`, `metric-strip.tsx:63/152`). R9's "meaningful numeric HTML alternative with actual accessible names" and R10's chart semantics are therefore **not met by current source**.
- Motion: `usePrefersReducedMotion` is exported (`index.ts:206`) but only used in `sidebar.tsx:73`; no `prefers-reduced-motion` reference in any chart module. Whether animation is enabled at all in charts is **UNKNOWN**.
- Resize: `ResizeObserver` at `chart.tsx:88-91` and `chart-time-series.tsx:920-921`; hidden/zero-size behavior untested here.
- Loading/empty/error/stale/partial/truncated/unsupported states are typed in `observe-chart-adapter.ts:42-67` (`resolveRankingStatus`) and `:104-148`; `ObserveChartBlockModel` (`:21-40`) carries `status`/`statusMessage`. This is the best existing "distinct states" seam for the pilot.

### 7. Current tests and parity/browser setup

- **Vitest**: `app/lib/*.test.ts` is the dominant layer (runtime-api, view-models, design-system, telemetry-analytics, candidate-space, agent-strategy, routing-mode, stale-refresh-diagnostics, live-refresh, runtime-refresh-bus, theme, both chart adapters). `app/routes/*.test.tsx` includes route-level suites for control-models, control-benchmark, providers, learning, extensions, storage-retention, startup bootstrap, request-detail, router-decision-detail. `app/components/*.test.tsx` covers page-primitives, telemetry-charts, device-authorization, local-model-role-picker, learning-visuals.
- `packages/ui` has only 7 test files (`badge`, `chart`, `chart-composition`, `chart-grid`, `observe`, `runtime-overview`, `sidebar`). **No `chart-time-series` test, no `chart-ranking` test, no `page-filters`/`metric-strip`/`segmented-control`/`page-shell` tests** — the largest chart module is the least tested.
- `app-shell.test.ts` (116 lines) contains a **source-text assertion**: `run105 Phase5` reads `app-shell.tsx` with `node:fs.readFileSync` and regexes `hidden…md:flex`, `md:hidden`, `overflow-x-auto` (`:70-80`). Its other 3 tests pin `resolveFooterCacheHitRate` live-only sampling (`:82-116`). Source-text tests will silently pass/fail on a Foldkit rewrite and are a poor R14 parity signal.
- **Browser**: `playwright.config.ts` — `testDir: ./e2e`, base URL `http://127.0.0.1:3462`, packaged `webServer` = `runtime-ui build && runtime-host-bridge exec tsx scripts/start-for-qa.ts` with `RUNTIME_QA_RESET_STATE=1` and a per-PID tmp state root; browser channel defaults to `msedge` on Windows outside CI. 24 e2e specs, all run-numbered (`recursive-77/79/81/84/87/94/96/98/101`) plus `runtime-shell`, `shared-surface-regression`, `track-b-*`.
- **Parity harness: absent.** `role-model-router/packages` contains 43 packages and **no `ui-parity`**. `apps/runtime-ui/package.json` exposes only `build`, `dev`, `test`, `test:browser`, `test:critical`. Root-level `runtime:parity`, `runtime:verify-client-journeys`, `runtime:compare-release` (R39) were **not verified** in this bounded pass (UNKNOWN) — but nothing in the UI package provides an M4 React-baseline/selfcheck lane.

### 8. Smallest strict-TDD pilot, then sequencing

**Pilot P1 (pure route model — recommended first):** extract a framework-free `app/lib/runtime-route-model.ts` from the trio (routes table, `runtimeNavigationSections`, `getRuntimeRouteDefinition`), exporting `resolveRuntimeShellState(pathname)` returning `{route, section, secondaryValue, hasSecondaryNavigation}` plus a `ROUTE_PARITY` table. RED seams, all assertion-level and DOM-free:

1. all 20 legacy paths map to the same section/title the alias chain gives today (one test per legacy id, not a loop over a table the test itself imports);
2. longest-prefix selection for `/app/observe/requests/<id>` and `/app/router/decisions/<id>` (pins `resolveSecondaryPath` `:49-56`);
3. `/app` index must not be treated as a prefix of everything (`item.to !== "/app"` guard, `:53`/`:60`);
4. every nav `to` resolves to a canonical URL in the route table — this immediately surfaces symbol/URL drift (`controlProvidersRoute` vs `remote/providers`).

Then GREEN by making `app-shell.tsx` call the new module and deleting the private copies; no visual change, so a byte-level `app-shell` render test is unnecessary.

**Pilot P2 (chart core):** move `chart-time-series` pure helpers (`chartWindowTickIndices`, `chartBarBucketCenter`, `resolveChartYAxisWidth`, `chartValueDomain`, `collectChartAxisTickLabels`) into a React-free module with numeric RED tests at fixed DPR/widths, then re-export from `chart-time-series.tsx`. This is the only path that satisfies R9's "no React/duplicate Effect" without a behaviour rewrite, and it creates the missing test file.

**Ordering after the pilots:** route model → shell state (theme/scroll/header intents as data) → commands (nav/theme/secondary selection as pure messages) → single owned refresh subscription (one `createRuntimeRefreshBus` instance + one SSE source with reconnect, injected `RuntimeEventSourceFactory`) → per-family route waves → chart waves. Reason: every later wave consumes route identity and the refresh signal; changing those later multiplies rework. Concurrency findings to carry in: the 7-way `Promise.all` + 10 s poll (`:155-241`) must become Effect-managed lifecycle (one scope, interrupt on leave, no per-pathname SSE churn) before route waves scale it.

### 9. Gaps, risks, unknowns for reproduction/QA

1. **Three route truths, no parity test** (routes.ts / nav sections / alias chain) — highest-value RED seam; also the largest silent-regression risk for a Foldkit port.
2. **20 legacy redirects' targets were not read** (`legacy-redirect.tsx` has no per-id mapping inspected) — **UNKNOWN** whether all 20 have distinct, correct targets; a Foldkit table must preserve them verbatim.
3. **7 thin route modules** (4–5 lines: `index`, `local-models`, `local-matrix`, `router-config`, `workloads`, `agent-strategy`, plus 12-line `app-layout`) are re-export shims by size, not verified — route-file count overstates owned UI implementations; two of them (`workloads`, `agent-strategy`) are nav targets.
4. **Subscription semantics**: per-pathname reconnect, unguarded `JSON.parse` in the SSE listener, unknown reconnect-after-close, 10 s poll independent of SSE. R12's "one owned Refresh Subscription" is not satisfied structurally.
5. **No chart accessibility alternative** in any `packages/ui` chart module, and `usePrefersReducedMotion` unused by charts — directly blocks R9/R10 acceptance; needs new tests, cannot be "parity" only.
6. **No parity package / no React selfcheck lane**; the one shell "responsive" test asserts source text. R14 and R39 need net-new harness, and 24 run-numbered e2e specs may encode superseded UI assumptions.
7. **Test asymmetry**: 143-function facade is well covered in `runtime-api.test.ts` (3,227 lines read total) while the largest chart module has no test file; the 00-worktree baseline records 752 UI tests, not re-run here.
8. **Two retry policies in one module** (`[150,300]` vs `[200,500,1000,2000]`) and generic `Error` messages instead of typed failures — per-operation disposition before any automated conversion; a blanket rewrite would flatten retry/cancel contracts.
9. **Command surface unverified**: no `*palette*` file appears in the `app/` inventory; the only overlays are `device-authorization-modal.tsx` and `llama-swap-setup-modal.tsx`. Whether a command palette lives inside `app-shell`/`design-system` needs a targeted grep before R13 plans "palette" journeys.
10. **Server/API ownership** (`runtime-host-bridge`, `/api/role-model/*` handlers, SSE producer) was out of scope here — **UNKNOWN**; all provider/method claims above are client-side only, with `fetch` injected per call and no base URL indirection.
