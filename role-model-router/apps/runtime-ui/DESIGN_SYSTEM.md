# Runtime UI Design System

## Intent

The runtime UI is a repo-owned operator shell for the role-model router runtime. The intended visual source of truth for both the design system and the actual runtime page implementations is the **Paper RM3** design file `01KW9C35N2G5PZRS4SBJ5678Q6` (pages `4-0` design system, `5-0` runtime specimens, `6-0` grid templates, `7-0` Production RuntimeOverview). This document is the repo-owned canonical translation of that Paper source into tokens, shared primitives, route contracts, and implementation receipts.

This shell must not clone the vendored llama-swap UI, and it must not treat Swiss-design guidance, the older Apple reference, or the superseded **Paper Linear review** board as current runtime UI authority. Linear/`--rm-*` and Apple references remain historical only. The runtime information architecture, route ownership, and workflow structure stay repo-owned; Paper RM3 informs theme tokens (`--rm3-*` / `--rm3-light-*`), typography (Geist), shell grammar, charts, and control chrome.

## Authority and sync policy

1. **Paper RM3 is the intended visual source of truth.** Pages `4-0` / `5-0` / `6-0` / `7-0` plus file-level `--rm3-*` tokens are the design authority for shared design-system decisions and for the layout/content of actual runtime pages.
2. **This document is the repo-owned canonical translation.** `DESIGN_SYSTEM.md` records the exact token values, component rules, and page contracts that engineering implements in the repo.
3. **In-repo kit `@role-model/ui`** (`role-model-router/packages/ui`) is the shared implementation SoT for shell, filters, SegmentedControl, MetricStrip, and chart primitives once Wave 2 lands.
4. **Approved runtime implementation may temporarily lead Paper.** When Paper is known to be out of date relative to the latest approved runtime UI, the repo-owned implementation plus this document become the temporary reconciliation source until Paper is updated.
5. **Paper must be resynced after approved design/code changes.** Any approved runtime-shell, token, component, or page-layout change must be reflected back into Paper so visual authority and repo implementation converge again.
6. **Apple reference remains historical only.** `DESIGN_APPLE_REFERENCE.md` is not allowed to override Paper, this document, or the live runtime UI.
7. **Linear review remains historical only.** Prior Paper Linear / `--linear-*` / purple accent contracts are not live authority on migrated surfaces.
8. **Anti-drift for charts:** production Recharts behavior is SoT once implemented; Paper SVG plots are visual reference only.

## Core rules

1. **Light and Dark only.** The operator UI exposes exactly `Light` and `Dark`; system preference is initial-default logic only until the operator chooses.
2. **Quiet chrome, strong content.** Shell, cards, tables, and controls stay near-neutral grayscale so runtime facts, ledgers, and charts remain primary.
3. **No brand hue in chrome.** Primary actions use near-black / near-white primary fills (`--rm3-primary` / `--rm3-light-primary`). The only non-grayscale chrome accent is **destructive** red. Chart hues never paint buttons, borders, or shell chrome.
4. **Radii follow RM3.** Shared surfaces use `--rm3-radius-sm|md|lg|xl` = `5px` / `6px` / `8px` / `11px` (plus pill `9999px` where needed). Soft Linear `12/16/28` shell radii are historical.
5. **Typography is Geist-led and startup-safe.** `--rm3-font-sans` / `--rm3-font-display` = `"Geist", ui-sans-serif, system-ui, sans-serif`; `--rm3-font-mono` = `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace`. Packaged runtime startup must not depend on remote font fetches. The runtime ships **bundled font assets**.
6. **One shell header (48px).** Page title left + theme toggle (sun/moon) top-right. No route-id / mono subtitle. Route files do not duplicate eyebrow, title, or description blocks. The shell header is the **only** route-level header.
7. **Fullscreen shell.** Sidebar flush left (224px) + main column; no empty outer canvas / inset `1840px` card chrome. Content uses default **12-col** track (`max-w-[1216px]`, pad `16`, gutter `16`).
8. **Secondary nav is SegmentedControl.** Bordered secondary track + primary fill on the active segment — not Tabs `line`, primary pills, or bare text.
9. **Happy-path pages omit FactCard / StatusPill walls.** Prefer MetricStrip, SectionCard + PanelHeader, Badge, Button, Table, Select `34px`.
10. **Analytics routes and evidence routes stay distinct.** `/app` and charted Observe pages lead with analytics bands; raw-host and request-detail pages remain evidence-first. Canonical telemetry pages must not embed a redundant “Adjacent raw-host tools” panel.
11. **The shell viewport stays fixed.** Sidebar and shell header remain fixed; only the page-content frame scrolls, and that internal scrollbar stays visually hidden.

### Shell receipts

- Sidebar navigation is text-only. Section links never render route icons inside the rail.
- No visible divider separates the sidebar from the content column; both live on the same shell surface.
- Sidebar brandmark (`role-model`) uses Geist **sans** `14/18` semibold with `-0.02em` tracking — never mono.
- Sidebar footer (pinned, shrink-0): **Model inventory → Cache → Router endpoint** with reduced-motion-safe live-update motion.
- Cache / healthy status greens use chart-cache / deep emerald — not neon emerald-50/100.
- The light/dark toggle sits on the right edge of the 48px page header strip.
- Overview analytics empty states stay compact and never fabricate synthetic chart data to fill space.
- Configured-model detail code blocks show the compact preview payload (`modelId` plus `endpointIds`) instead of dumping full endpoint records into the first screen.
- Compact advanced-filter rows use `DisclosureSection` in compact mode.
- Role / category selectors use grouped category rows with a leading checkbox.
- Soft-fill Badges (muted surface + hairline + semantic ink) when a specimen still requires a pill-equivalent chip (happy-path pages prefer Badge / MetricStrip, not StatusPill walls). Documented migration aliases during Wave 2: `--rm-pill-info-bg`, `--rm-pill-advisory-bg` (historical Linear) → RM3 soft badge tokens.

## Theme contract

### Typography tokens

| Token | Value |
| --- | --- |
| `--rm3-font-display` | `"Geist", ui-sans-serif, system-ui, sans-serif` |
| `--rm3-font-sans` | `"Geist", ui-sans-serif, system-ui, sans-serif` |
| `--rm3-font-mono` | `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace` |

### Typography scale (prefer tokens)

| Token / use | Notes |
| --- | --- |
| `--rm3-text-{xs,sm,md,lg,xl}` | Prefer over ad hoc px |
| `--rm3-font-weight-{regular,medium,semibold}` | Two weights per view (400/500; 600 headings) |
| `--rm3-tracking-{tight,mono}` | Tight on display; mono tracking on section labels |
| `--rm3-leading-{xs,sm,md,lg,xl}` | Prefer tokens |

### Semantic chrome (dark `--rm3-*` / light `--rm3-light-*`)

| Role | Dark | Light |
| --- | --- | --- |
| background | `#0A0A0A` | `#FFFFFF` |
| foreground | `#EDEDED` | `#111111` |
| card | `#0F0F0F` | `#FFFFFF` |
| primary | `#FFFFFF` | `#0A0A0A` |
| primary-foreground | `#0A0A0A` | `#FFFFFF` |
| muted-foreground | `#9A9A9A` | `#666666` |
| border | `#1F1F1F` | `#EAEAEA` |
| destructive | `#E0726A` | `#B4261A` |
| sidebar | `#0A0A0A` | (light sidebar family) |
| sidebar-active | `#141414` | (light sidebar-active) |

Full families (popover, secondary, accent surface, input, ring, scrollbar, sidebar-*) are Paper file tokens on `01KW9C35N2G5PZRS4SBJ5678Q6` and must be implemented in Wave 2 CSS. Route code references tokens — never raw hex for covered roles. Also keep transitional `--rm-on-primary` documented until Wave 2 retires Linear aliases.

### Spacing and radii

| Family | Values |
| --- | --- |
| `--rm3-space-{4,8,12,16,24,32,40}` | 4px base rhythm |
| `--rm3-radius-sm` | `5px` |
| `--rm3-radius-md` | `6px` |
| `--rm3-radius-lg` | `8px` |
| `--rm3-radius-xl` | `11px` |

### Machine-readable twin (`runtimeTheme`)

Wave 1 authority twin uses:

- `maxContentWidth: "1216px"` (main content track; shell itself is fullscreen)
- radii sm/md/lg/xl = 5/6/8/11; panel/field follow lg/md; pill/badge `9999px`; shell no longer uses Linear `28px` inset
- chrome accent fields map to RM3 primary (near-black light / near-white dark) — **not** Linear purple `#5E6AD2`

### Semantic equivalence (Linear → RM3)

| Historical Linear | RM3 |
| --- | --- |
| `--linear-accent-primary` / `--rm-accent` purple | `--rm3-primary` / `--rm3-light-primary` (grayscale CTA) |
| `--rm-font-*` Inter / IBM Plex | `--rm3-font-sans|mono|display` Geist |
| `--rm-shell-width` `1840px` inset | fullscreen + `1216px` content |
| `--rm-chart-*` Linear hues | `--rm3-chart-*` / `--rm3-light-chart-*` (Wave 2 CSS; Wave 1 docs name the target) |

## Chart system contract

### Palette families (Paper `RM v3 · Graph palette`)

- Scale ramps: `--rm3-royal-blue-*`, `--rm3-emerald-*`, `--rm3-di-serria-*`, `--rm3-black-*` (`50…1900`)
- Categorical: `--rm3-chart-{1…8}` / `--rm3-light-chart-{1…8}`
- Semantic metrics: `--rm3-chart-{local,remote,throughput,latency,cache,cost,queue,anomaly}` (+ light mirrors)
- Superlog: `--rm3-chart-{green,blue,purple,pink,orange,error,nodata}`
- Failures use **chart-error** (not coral); cache fills use deep emerald / chart-cache

Example semantic stops (dark): `--rm3-chart-local` → `var(--rm3-black-100)`; `--rm3-chart-remote` → `var(--rm3-royal-blue-400)`; `--rm3-chart-cache` → `var(--rm3-emerald-600)`; `--rm3-chart-latency` → `var(--rm3-di-serria-300)`; `--rm3-chart-error` → `#F04646`.

Live CSS may still expose transitional `--rm-chart-*` aliases until Wave 2/SP5 flips production bindings; **documented authority is `--rm3-chart-*`**.

### RM3 chart composition rules

1. **Titles** — sentence case only (`Token usage over time`), never Title Case for chart titles.
2. **Legends** — required on every multi-series chart (swatch + metric key/label); inset to match plot/X (`pl-10` / left **56**).
3. **Width** — plot fills the card content width (or the span between Y axes when present); TimeAxis aligns to plot width; no centered stubs.
4. **Color** — `--rm3-chart-*` / `--rm3-light-chart-*` only on plots; prefer semantic series tokens; never on chrome.
5. **ChartCard** — shared shell (`padding 16` / `height auto`): Header (full-bleed title band + `border-b`) → YAxisLeft + Plot (+ optional YAxisRight) → TimeAxis → Legend. Default plot height **192**.
6. **Y gutter** — left Y default `width 40` + `tickMargin 6`; widen up to **88** when formatted ticks need it (e.g. `$0.10`). Legend inset = Y width + **16** (56 at default). Dual-Y: plot width = rightAxis.left − left inset.
7. **Bars** — width matches the time-grid column exactly (day: `plotWidth · 4/24`; window: `plotWidth / n`). No `maxBarSize` cap; `barCategoryGap` / `barGap` **0**.
8. **Time axis** — mono X labels at 7 ticks on a 24h domain: `00:00`…`20:00` plus end `24:00`. Required on every time-series chart.
9. **Grid** — solid horizontals ≈5% ink + baseline ≈8%; verticals at those 7 time ticks. Never dashed. `vector-effect: non-scaling-stroke`.
10. **Value axes / Y domain** — every chart has at least one Y axis (left). Same unit → left only; incompatible units → dual-Y. Y domain always includes **0** at the plot baseline.

### Voice · component titles

- **Sentence case** for page titles, SectionCard / panel titles, chart titles, and tabs (`Runtime overview`, `Request volume over time`).
- **PageFilters field labels** are sentence-case sans (`Breakdown`, `Time range`) — Geist Sans 12/16 muted — not mono uppercase eyebrows.
- Never Title Case component titles (`Request Volume Over Time`).
- Chart composition rule 1 is the same contract for plot headers.

### Chart behavior rules (operations)

- Shared layout contracts own gutters/margins; route-local axis widths are not allowed once ChartCard/ChartGrid land.
- legends display explicit human-readable labels for endpoint, model, provider, role, strategy, and source series
- ranked comparisons remain horizontal bars rather than pie charts
- color assignment is deterministic where feasible
- a single chart must not reuse the same resolved visual color for different visible metrics or series
- loading, empty, and error states are distinct
- telemetry chart states remain canonical: `loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, and `populated`
- background refresh keeps the last populated chart visible and adds a calm refreshing affordance instead of replacing the chart with a loading skeleton
- initial chart-request failures render per-card error states instead of collapsing the entire analytics page
- no fake sample series may be rendered in production empty states

## Shell layout

- **Fullscreen:** root `h-screen` / `100dvh`; no outer canvas gutter outside Sidebar + main
- Sidebar width **224px**, absolute/flush left; MainPane offset `marginLeft: 224px`
- SidebarNav `flex-grow: 1`; SidebarFooter `flex-shrink: 0` with Model inventory → Cache → Router endpoint
- Page header strip **48px**: title left, theme toggle right
- Page content: `max-w-[1216px]`, `px-4 py-5`, `gap-6`; place `PageFilters` then grid rows
- Default grid: **Template · 12-col · default** (col 84 · gutter 16 · track 1184). Allowed counts: 8 / 9 / 12 / 16 / 18 / 24
- Mobile: section rail stacks above content; secondary navigation becomes a horizontal SegmentedControl scroll row
- The shell viewport itself does not scroll; only the content frame under the shell header scrolls
- The content frame keeps scroll behavior but hides the native scrollbar chrome — only the page-content frame scrolls; content-frame scrollbar is hidden
- Route files must **not** repeat title metadata inside page content
- Preserve vendor-host escape hatches as contextual page actions or route-local references, not as global shell chrome

### Kit package

| Package | Path | Role |
| --- | --- | --- |
| `@role-model/ui` | `role-model-router/packages/ui` | Shared RM3 shell, PageFilters, SegmentedControl, MetricStrip, ChartCard/time-series/ranking/composition, Observe helpers |

Exports map to Paper inventory §A in run requirements. Kit README points at this document + Paper pages as authority.

### Shared composites (Wave 2 owners)

- `PageShell` / `SubPageHeaderBar` / `PageContent`
- `PageFilters` / `TimeRangeControl` / `FilterSelect` (time range left; labeled selects right; trigger `h-[34px]` · `w-[150px]` (or `w-full` in Advanced grids) · `bg-secondary` · `px-2.5`; value `14px` / `leading 18` / Geist Sans; labels sentence-case sans `12/16` muted — match Paper **Runtime overview**; secondary fill so selects still read on card/surface panels; `hideLabel` when a table/column header already names the field — e.g. Extensions Mode)
- `SegmentedControl` (`size="md"` / `14px` for Studio · Local · Models · Observe · System · Router page nav **and** Overview PageFilters time range — same text size on every route; `size="sm"` / `13px` is compact-only and must not be used for shell page nav; same bordered secondary track in the 12-col content lane)
- `MetricStrip` variants: `inline` · `inventory` · `badge` · `panel` (`panel` = card fill · `h-54` · mono uppercase labels · sans `18/22` semibold values — Paper System · Readiness)
- `ChartCard` / `ChartGrid` / time-series / ranking / composition charts
- SectionCard + PanelHeader (`px-5 py-4` title band + `border-b`; description `12px` muted; body `p-5`)
- Form fields (`fieldClassName` / `SelectField`): `bg-background` · `34px` · `13px` / `18px`; labels `12px` medium foreground; Remote Save uses compact `34px` primary (not Studio full-width `36px`)

### Rollout order

1. Wave 1 — this document + `design-system.ts` authority twin + kit README scaffold
2. Wave 2 — kit port, `--rm3-*` CSS/theme, fullscreen shell, shared primitives, charts
3. Wave 3 — migrate §B routes; `/app/router/config` becomes redirect → `/app/router/strategy`
4. Wave 4 — rebuilt-runtime hybrid QA

Router SegmentedControl (Paper): **Overview · Strategy · Controller · Candidates · Decisions** only. `/app/router/config` is **redirect-only** → `/app/router/strategy` (no Paper Config artboard). Runtime JSON editing stays at `/app/system/runtime-config`.


## Navigation model

| Section | Purpose | Route family |
| --- | --- | --- |
| Overview | Runtime-wide posture and attention items | `/app` |
| Studio | Request composition and multimodal API workspaces | `/app/studio/*` |
| Local | Two local inference backends: **peer** (you run the server) and **llama-swap** (role-model runs the swap manager). Peer and llama-swap pages are never combined. Role assignment happens on the model page for the backend in use. | `/app/local/*` |
| Remote | LiteLLM-backed remote provider onboarding and remote model availability | `/app/remote/*` |
| Models | Unified configured-model inventory and runtime role policy surfaces | `/app/models*` |
| Router | Routing explanation, policy visibility, candidate comparison, and decision drill-in | `/app/router/*` |
| Observe | Request ledgers, raw host activity, logs, metrics, captures, and analytics | `/app/observe/*` |
| Connect | How client applications use role-model as an inference provider: registry, downstream contract, upstream passthrough | `/app/connect*` |
| System | Host/runtime topology, peer inventory, version, auth, and policy posture | `/app/system/*` |

## Header metadata ownership

| Field | Owner | API |
| --- | --- | --- |
| title | `RuntimeRouteDefinition.title` | shell default; `useShellHeaderOverride()` on detail routes |
| page actions | active route component | `usePageActions()` only — not `RuntimeRouteDefinition` (actions are often dynamic, conditional, or stateful) |
| section tabs | `runtimeNavigationSections` | `AppShell` |

## Route and layout contract

| Route | Status | Template | Purpose |
| --- | --- | --- | --- |
| `/app` | live | `summary-board` | Lead with shared telemetry controls, Model pool, then the chart-led runtime overview stack (token → cache → cost → latency/success). |
| `/app/studio/chat` | live | `studio-workspace` | Routed chat workspace with assistant output, tool calls, execution receipts, usage, and raw payload inspection. |
| `/app/studio/images` | live | `studio-workspace` | Image workspace with two first-slice request modes in one page: OpenAI-style generation over `/v1/images/generations` and SDAPI generation over `/sdapi/v1/txt2img`; editing and img2img stay backlog-visible rather than first-slice requirements. |
| `/app/studio/audio` | live | `studio-workspace` | Unified audio workspace over `/v1/audio/speech`, `/v1/audio/voices`, and `/v1/audio/transcriptions` so voice discovery, speech generation, and transcript workflows remain one operator surface. |
| `/app/studio/rerank` | live | `studio-workspace` | Ranked-input evaluation workspace over `/v1/rerank` and `/v1/reranking` with a compact request rail, ordered score ledger, and raw payload inspection. |
| `/app/studio/advanced` | live | `studio-workspace` | Contract-and-request workspace for advanced families that stay under Studio: `/v1/responses`, `/v1/messages`, `/v1/messages/count_tokens`, `/v1/embeddings`, `/completion`, and `/infill`. |
| `/app/remote/providers` | live | `registry-detail` | Primary remote-provider onboarding route for choosing a LiteLLM-backed provider, selecting provider models, completing API-key or OAuth setup, and reviewing configured provider connections. |
| `/app/models` | live | `model-inventory` | Unified local/remote model inventory with inspect-only card drill-ins, explicit handoff to the runtime-config editor, and a non-error pre-activation state when no controller exists yet. |
| `/app/models/roles` | live | `registry-detail` | Runtime role policy authoring and task allowlist management over the live router policy surface. |
| `/app/models/benchmark` | live | `registry-detail` | Capability benchmark for configured models with judge grading, persisted scores, and routing-impact explanation. |
| `/app/router` | live | `registry-detail` | First-class routing overview that summarizes active posture, recent decisions, and operator handoff into strategy, candidates, and decision interpretation. |
| `/app/router/config` | redirect | — | Legacy redirect → `/app/router/strategy` (Fixed Decision #15). No Paper Config artboard; Router SegmentedControl has no Config segment. |
| `/app/router/strategy` | live | `registry-detail` | Structured routing-strategy posture for execution mode, controller state, and handoff into advanced config plus request verification. |
| `/app/router/controller` | live | `registry-detail` | Explicit controller assignment with candidate health, source type, role coverage, tooling posture, and an honest empty state before any endpoint is activated. |
| `/app/router/candidates` | live | `ledger-inspector` | Unified local and remote candidate inventory with health, role coverage, and observed routing-signal posture. |
| `/app/router/decisions` | live | `ledger-inspector` | Explainable routing decision ledger keyed by request identity with direct drill-in to policy and scoring detail. |
| `/app/router/decisions/:requestId` | live | `ledger-inspector` | Request-keyed routing decision explanation with scored candidates, diagnostics, and Observe request-detail handoff. |
| `/app/local/choose` | live | `registry-detail` | Backend chooser: peer-backed vs llama-swap workflows with handoff links to endpoints, model pages, and runtime config. |
| `/app/local/endpoints` | live | `registry-detail` | Peer endpoint inventory for OpenAI-compatible servers you operate. Required before registering peer models. |
| `/app/local/peer-models` | live | `registry-detail` | Register peer-backed models with the router and assign runtime roles for routing. |
| `/app/local/llama-swap/models` | live | `registry-detail` | Load llama-swap-managed models, assign runtime roles, and edit per-model overrides. |
| `/app/local/llama-swap/swap` | live | `ledger-inspector` | Chronological llama-swap load and swap events. |
| `/app/local/llama-swap/policy` | live | `registry-detail` | TTL, auto-unload, and concurrency for the managed llama-swap runtime. |
| `/app/local/llama-swap/logs` | live | `dual-console` | Live proxy and upstream logs from the llama-swap process. |
| `/app/local/llama-swap/matrix` | live | `matrix-grid` | Grid of concurrently loaded llama-swap models. |
| `/app/local/models` | redirect | — | Redirects to `/app/local/choose`. |
| `/app/local/swap` | redirect | — | Redirects to `/app/local/llama-swap/swap`. |
| `/app/local/policy` | redirect | — | Redirects to `/app/local/llama-swap/policy`. |
| `/app/local/logs` | redirect | — | Redirects to `/app/local/llama-swap/logs`. |
| `/app/local/matrix` | redirect | — | Redirects to `/app/local/llama-swap/matrix`. |
| `/app/connect` | live | `registry-detail` | Consumer-facing registry of models and endpoints client applications can call after provider onboarding, with provider rollups and readiness posture sourced from the canonical backend lifecycle contract. |
| `/app/observe` | redirect | — | Redirects to `/app/observe/requests`. |
| `/app/observe/activity` | live | `ledger-inspector` | Preserved raw-host activity ledger over `/api/metrics` with inline capture drill-ins from `/api/captures/:id` and adjacent access to `/api/events`. |
| `/app/observe/requests` | live | `ledger-inspector` | Canonical telemetry request ledger with a primary structured telemetry analytics band above it. |
| `/app/observe/routing` | live | `ledger-inspector` | Routing analytics surface for avoided cost, difficulty mix, strategy selection, requested-role demand, and historical model-selection trends from persisted request-time telemetry facts. |
| `/app/observe/requests/:requestId` | live | `ledger-inspector` | Telemetry-first request inspector with usage, cache, captures, endpoint profile, tooling receipts, and raw observation detail. |
| `/app/observe/logs` | live | `dual-console` | Preserved raw-host log shell with `/logs` history, request-level handoffs, and raw `/logs/stream/*` access. |
| `/app/connect/downstream` | live | `contract-reference` | Downstream OpenAI-compatible contract, auth, model discovery, and tool-calling expectations for client applications. |
| `/app/connect/upstream` | live | `contract-reference` | Upstream passthrough reference with model-specific upstream target inventory, boundary guidance, and contextual raw `/upstream/*` escape hatches. |
| `/app/system/runtime` | live | `system-topology` | Runtime health, controller posture, canonical lifecycle/readiness rollups, version/provenance facts, host controls, validation floor, and vendor-policy summary. |
| `/app/system/runtime-config` | live | `registry-detail` | Repo-owned editor for the unified runtime contract covering local llama-swap models, remote LiteLLM providers, and process policy. |
| `/app/system/peers` | live | `system-topology` | Peer inventory and policy page for `peers` config, including remote model sources, auth posture, timeouts, request filters, matrix/group/runtime-policy relationships, and a real empty-state contract when no peers are configured. |

Status note:

- `live` means the repo-owned page is implemented today.

## Page templates

All templates assume the shell header is already visible. Page content begins directly with template primitives (`SectionCard`, `MetricStrip`, `ChartCard`, …) and never with a duplicate page-title block. Happy-path pages omit FactCard/StatusPill walls.

| Template | Layout definition |
| --- | --- |
| `summary-board` | Content starts under the shell header. Shared analytics controls, Model pool, then the chart-led posture stack. |
| `studio-workspace` | Content starts under the shell header. Left composition rail, dominant result surface, and secondary inspection region for payload, captures, or contracts. |
| `registry-detail` | Content starts under the shell header. Dense registry/editor split: compact editing or selection on one side, operational state ledger on the other. |
| `model-inventory` | Content starts under the shell header. Mobile-first card grid with modal drill-in; cards are the default object representation, not rows. |
| `ledger-inspector` | Content starts under the shell header. Dense sortable ledger plus adjacent inspector or drill-in drawer for telemetry facts, captures, payloads, and profile context. |
| `dual-console` | Content starts under the shell header. Two raw log consoles or stream panes with clear source labels and a small operator toolbar. |
| `contract-reference` | Content starts under the shell header. Narrow reference column plus implementation contract panels and example payloads. |
| `matrix-grid` | Content starts under the shell header. Dense grid of concurrent operational cells: status-first, then resource metrics, with add/remove controls and honest empty state. |
| `system-topology` | Content starts under the shell header. Layered operational summary: health and version first, then host/runtime policy panels and contextual host diagnostics. |

No current runtime route may rely on `FutureSurface`, fixture rows, or other placeholder scaffolds; live routes must render honest data or explicit empty states.

## Live template receipts

| Template | Implemented reading order |
| --- | --- |
| `summary-board` | `/app` leads with telemetry controls plus Model pool and a chart-led posture band for tokens, cache, cost, latency, and success/failure volume. |
| `studio-workspace` | `/app/studio/chat` uses a compact composer, dominant response stage, and adjacent usage/tooling/payload inspection. |
| `registry-detail` | Provider, runtime-config, controller, and endpoint pages keep the primary editor/ledger split and use summary chrome only when it changes the operator decision. |
| `model-inventory` | `/app/models` uses MetricStrip / inventory summary before a responsive configured-model card grid and an inspect-only modal (no FactCard strip). |
| `ledger-inspector` | Requests and Observe Routing now lead with shared analytics controls plus chart-led history above their canonical ledgers or comparison bands, while request detail stays telemetry-first. Activity and Logs remain the dedicated raw-host surfaces; telemetry pages do not duplicate them with an in-page adjacent-tools card. |
| `dual-console` | `/app/observe/logs` and `/app/local/logs` start with combined history, then split proxy and upstream consoles into mirrored panes. |
| `contract-reference` | `/app/connect/downstream` keeps connection facts in a narrow reference column and examples/compatibility in the larger contract pane. |
| `system-topology` | `/app/system/runtime` layers lifecycle, controller posture, live version facts, and preserved host diagnostics without extra note-only panels. |
| `matrix-grid` | Local Models grid view shows a dense status-first grid of concurrently loaded models with engine and loaded state. |

## Per-page layout and content contracts

This section is the repo-owned page-by-page source of truth for live runtime pages. The intended visual authority for these contracts remains Paper RM3 pages `4-0`/`5-0`/`6-0`/`7-0`, but the contracts below are the canonical implementation record when Paper temporarily lags the latest approved runtime UI. The route/template tables define route ownership; the contracts below define the required reading order, major regions, and content obligations per page.

Redirect-only routes inherit the contract of their live destination and do not define independent page content.

| Route | Layout contract | Required content contract |
| --- | --- | --- |
| `/app` | Telemetry controls first, Model pool second, then the chart band. | Must show time-range controls, primary telemetry filters (Breakdown / Source / Status / Difficulty), Model pool, and token/cache/cost/latency/success charts. |
| `/app/studio/chat` | Two-column studio workspace with composer rail left and result workspace right; secondary receipts may stack below result. | Must show model/endpoint/routing controls, prompt entry, request submission, result summary, tooling receipts, usage, and raw payload inspection. |
| `/app/studio/images` | Studio workspace with request-mode controls first, composition controls next, output gallery/result stage beside or below controls depending on width. | Must show OpenAI-style and SDAPI generation modes, model selection, generation controls, output/result stage, and payload/response detail. |
| `/app/studio/audio` | Studio workspace with speech/transcription controls leading, result stage adjacent, and secondary receipts below. | Must show provider/model/voice or transcription controls, audio or transcript result surfaces, and request/response detail. |
| `/app/studio/rerank` | Single dominant result column is preferred when the score list would otherwise feel cramped; controls stay above results. | Must show query/candidate inputs, model selection, rerank execution, ordered scores, and payload inspection. |
| `/app/studio/advanced` | Studio workspace with compact operation selector and request form first, then result/contract panes. | Must show advanced API family selection, operation-specific inputs, response area, and raw contract/payload detail. |
| `/app/remote/providers` | Registry-detail split with onboarding/editor rail on one side and configured provider connections on the other. Role groups default collapsed. | Must show provider selection, connection method, credentials/account metadata, model selection, grouped role binding controls, and configured provider connections. Saved-provider maintenance and archived diagnostics are intentionally omitted. |
| `/app/models` | Model-inventory card grid with summary facts above and inspect-first modal/detail drill-in behind cards. | Must show configured model counts, inventory cards, controller/coverage/capability pills, and inspect-only detail with role/group evidence. |
| `/app/models/roles` | Registry-detail page with collapsed create-role disclosure above the main role catalog; catalog gets the dominant width. | Must show role definitions, grouped task/category content, create/edit role flows, and bounded advanced policy fields behind disclosure controls. |
| `/app/models/benchmark` | Single-column benchmark flow with controls first and broad content sections below so score surfaces do not get squeezed. | Must show benchmark scope controls, run-capability summary, benchmark score rows, historical/latest run detail, and clear empty/error states without fixture data. |
| `/app/router` | Registry-detail overview with posture summary first, alias posture second, candidate preview after, and handoff links last. | Must show active strategy/mode/controller posture, active alias visibility, collapsible alias pool inventory, recent candidate/readiness context, and routing handoffs. |
| `/app/router/strategy` | Registry-detail editor split with saved strategy posture and editable controls visible together. | Must show execution mode, routing strategy, saved-vs-draft posture, verification/handoff actions, and contextual benchmark/controller receipts. |
| `/app/router/controller` | Registry-detail selection surface with controller assignment on one side and candidate comparison on the other. | Must show controller selection, source type, health, tool-calling posture, role coverage, and honest pre-activation empty states. |
| `/app/router/candidates` | Ledger-inspector inventory with dense candidate rows/cards and comparison-ready metadata. | Must show local and remote candidates, health, readiness, role coverage, tool posture, and routing-related status markers. |
| `/app/router/decisions` | Ledger-inspector chronology with dense recent decision list and concise diagnostic context. | Must show recent routing decisions, selected source/model, status, failure/ignore/exclusion posture, and drill-in links to detail. |
| `/app/router/decisions/:requestId` | Ledger-inspector detail page with scored candidates and request reasoning prioritized above secondary diagnostics. | Must show chosen endpoint, candidate score breakdown, routing diagnostics, request metadata, and Observe request-detail handoff. |
| `/app/local/choose` | Registry-detail chooser page with two prominent backend options and direct handoff actions. | Must show peer vs llama-swap distinction, route handoffs, and concise explanation of what each backend path owns. |
| `/app/local/endpoints` | Registry-detail page with endpoint registration/editor on one side and endpoint inventory/health on the other. | Must show OpenAI-compatible local endpoints, health/posture, registration/edit controls, and empty-state guidance when no endpoints exist. |
| `/app/local/peer-models` | Registry-detail page with model registration/editor first and loaded peer-backed inventory second. | Must show endpoint-backed model registration, grouped runtime-role assignment, saved peer models, and lifecycle or validation receipts. |
| `/app/local/llama-swap/models` | Registry-detail page with model loading/override controls and grouped role binding below or beside according to width. | Must show loaded/available llama-swap models, overrides, grouped role bindings, model state pills, and save/eject actions. |
| `/app/local/llama-swap/swap` | Ledger-inspector chronology focused on swap/load events rather than summary KPI chrome. | Must show swap history, timing/status, source model identity, and supporting operational metadata. |
| `/app/local/llama-swap/policy` | Registry-detail policy editor with host-policy form first and resulting posture or saved config context second. | Must show TTL, unload, concurrency, policy toggles, and current effective host-policy state. |
| `/app/local/llama-swap/logs` | Dual-console layout with mirrored or paired log panes and a small operator toolbar. | Must show proxy/upstream log separation, history/stream posture, and raw operational evidence without decorative chrome. |
| `/app/local/llama-swap/matrix` | Matrix-grid page with dense loaded-model cells; no unrelated sidebar index or layout-mode widgets. | Must show concurrent model cells, load state, engine/runtime facts, and honest empty-state guidance when nothing is loaded. |
| `/app/connect` | Registry-detail consumer-facing registry with inventory first and readiness/provider posture adjacent. | Must show models/endpoints available to clients, readiness state, provider rollups, and canonical lifecycle guidance. |
| `/app/observe/activity` | Ledger-inspector raw-host adjacency page with activity ledger first and capture/metrics drill-in secondary. | Must show preserved host activity, metrics-adjacent entries, capture links, and event/raw observation context. |
| `/app/observe/requests` | Ledger-inspector page with analytics controls and charts above the canonical request ledger. Advanced controls stay behind a compact expand/collapse row. No redundant adjacent raw-host tools card. | Must show time-range/filter controls, structured request analytics, request ledger rows, and request-detail handoffs. Must not embed Activity/Logs/Routing shortcut panels that duplicate shell Observe navigation. |
| `/app/observe/routing` | Ledger-inspector analytics page with routing controls first, comparison charts second, and current-slice summary adjacent or below. | Must show routing mix, avoided cost, difficulty, strategy/model/role analytics, and compact advanced controls behind disclosure. |
| `/app/observe/requests/:requestId` | Ledger-inspector detail page with top telemetry facts first, then taxonomy/cost/tooling/capture evidence in readable sections. No redundant adjacent raw-host tools card. | Must show request identity, usage, cache, endpoint profile context, routing receipts, taxonomy classification, capture links, and stored cost metadata. Must not embed Activity/Logs shortcut panels that duplicate shell Observe navigation. |
| `/app/observe/logs` | Dual-console preserved-host log surface with history and stream panes. | Must show request-correlated raw logs, split log sources, and Observe detail handoffs when correlation exists. |
| `/app/connect/downstream` | Contract-reference page with narrow reference facts and broader downstream compatibility/content pane. | Must show auth, endpoint/model discovery, compatibility notes, request examples, and downstream tool-calling expectations. |
| `/app/connect/upstream` | Contract-reference page with passthrough boundaries first and model/provider specifics second. | Must show upstream targets, auth posture, passthrough limitations, raw escape hatches, and model-specific routing implications. |
| `/app/system/runtime` | System-topology layered summary with lifecycle/health first, version and policy second, diagnostics last. | Must show lifecycle summary, controller posture, validation floor, version/provenance facts, vendor policy, and host-level diagnostics. |
| `/app/system/runtime-config` | Registry-detail runtime editor with unified config form on one side and current effective runtime posture on the other. | Must show local/remote runtime config inputs, saved/current config context, and policy/runtime implications. |
| `/app/system/session-readiness` | System-topology page with bootstrap/readiness ladder first, blockers next, and operator-intent diagnostics after. | Must show bootstrap status, lifecycle authority, blockers, routing readiness, alias drift, and operator-intent outcomes. |
| `/app/system/peers` | System-topology inventory page with peer cards/rows first and topology/policy context second. | Must show peer sources, auth posture, live model matches, topology relationships, timeout/filter policy, and empty-state guidance. |

## Runtime and session-readiness rules

- The provider route keeps onboarding and configured provider connections visible without duplicating saved-account maintenance or archived diagnostics.
- `System > Runtime`, `System > Session readiness`, `Connect`, `Workbench`, and `Studio > Advanced` must use the same canonical lifecycle/readiness vocabulary.
- Blocking banners and provider rollups come from the backend lifecycle contract, not route-local inference from raw account fields.
- Provisional-vs-authoritative bootstrap posture must read consistently across these surfaces.

## Component rules

### Shell and shared primitives

- `AppShell` owns the section rail, shell header, and section-local tab row
- shell section links and section-local tabs use shared design-system helpers rather than route-local class strings
- `ShellHeaderProvider` plus `usePageActions()` and `useShellHeaderOverride()` let active routes register page-local actions or dynamic titles without reintroducing duplicate page headers
- `SectionCard` is the default sectional frame: one heading block, then content
- `DisclosureSection` collapses dense secondary detail; default closed unless a route needs primary content expanded
- route descriptions stay one sentence; shell chrome stays quiet
- long ids, endpoint ids, and routes must wrap rather than overflow
- global browser chrome must opt into:
  - `<meta name="color-scheme" content="light dark">`
  - paired light/dark `theme-color` meta tags
  - `html { color-scheme: light dark; }`

### Cards and panels

- Use restrained borders and spacing for separation
- Prefer surface contrast and spacing over decorative divider rules
- Default UI shadows stay off; only the explicit product-shadow token exists, and it is not general shell chrome

### Buttons

- Primary actions use the accent blue family with pill radius and `11px 22px` padding
- Secondary actions use neutral or outline styling with the same radius grammar
- Utility controls may use the compact `8px 15px` padding grammar
- Active/pressed scale may be used consistently across shared button primitives

### Inputs and filters

- Shared fields target `44px` height
- Inputs, selects, and filter controls use the field radius and border grammar from the shared token set
- Search/select affordances may use pill or field treatment, but they must stay consistent across light and dark themes
- Closed select fields, expanded select options, and telemetry filter pills all use the same nav-scale `13px / 18px` label styling
- Generic search or text inputs do not default to mono typography
- Compact advanced-filter rows use `DisclosureSection` in compact mode rather than repurposed dropdown selects

### Badges and status pills

- Paper RM3 Badge geometry is fixed: height `22px`, padding-inline `8px`, `rounded-full`, mono `11px / 14px` regular (System Readiness SoT)
- Soft tones (`neutral` / `success` / `warning` / `error` / `info` / `advisory`) use muted fill + **semantic ink** (e.g. healthy = chart-cache green text — never a solid green capsule); no hairline on soft chips
- Accent tone (`selected`) keeps solid primary fill + contrast ink
- Transparent outline-only semantic pills are not the grammar
- pill fill / ink come from shared `--rm-pill-*` theme tokens, never route-local hardcoded colors

### Role and category selectors

- Role-binding surfaces use grouped category rows with a leading checkbox, a nearby expand/collapse affordance, and child role rows nested only when expanded
- Group rows default collapsed on provider and model binding surfaces unless the current workflow needs a primary group already open
- Group-level selection must drive the member-role selection state; categories are not allowed to drift into visually linked but logically independent checkbox state

### Ledgers, logs, and payload blocks

- Activity, requests, metrics, and tooling execution read as ledgers first, not dashboards first
- Dense tables may scroll horizontally, but request id, status, model, and primary action remain readable without opening a modal
- Capture drill-ins open in an adjacent inspector or modal with mono payload blocks and explicit transport metadata
- Log views prefer split proxy/upstream consoles with source toggles rather than stacked accordions

## Vendor exposure plan

These are first-class runtime pages because they are part of the main operator loop:

1. **Local runtime state**
   - models
   - swap history
   - policy
   - logs
   - matrix
   - peers
2. **Studio multimodal workspaces**
   - images
   - audio
   - rerank
   - advanced API families
3. **Observe raw host ledgers**
   - activity
   - logs
   - captures and metrics as drill-ins from activity or request detail
4. **System runtime policy**
   - `/health`
   - `/api/version`
   - config-watch posture
   - global TTL
   - start port
   - capture and metrics buffers
   - API-key/auth posture
5. **Peers and upstream contract surfaces**
   - peer model sources
   - peer filters and timeouts
   - upstream passthrough expectations

Placement rules:

- **Control > Runtime Config** owns editable local/remote runtime policy and model/provider metadata
- **Control > Models** owns inspect-first model inventory and links back to editable surfaces
- **Connect > Registry** owns consumer-facing endpoint/model visibility after onboarding; alias adjudication defers to **Router**
- **System > Runtime** owns global host policy and matrix summary
- **System > Peers** owns remote-peer config and upstream auth posture

## Rollout order

1. **Observe**
   - complete: native activity and logs pages expose metrics, captures, preserved history, and split raw consoles
2. **Studio**
   - multimodal workspaces replace placeholders with repo-owned implementations
3. **System**
   - runtime policy, peers, and config-watch posture stay visible from the repo-owned shell
4. **Integrations**
   - upstream reference surfaces remain contextual and subordinate to the operator workflow
