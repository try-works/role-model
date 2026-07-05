# Runtime UI Design System

## Intent

The runtime UI is a repo-owned operator shell for the role-model router runtime. The intended visual source of truth for both the design system and the actual runtime page implementations is the Paper Linear review file `01KW9C35N2G5PZRS4SBJ5678Q6`. This document is the repo-owned canonical translation of that Paper source into tokens, shared primitives, route contracts, and implementation receipts.

This shell must not clone the vendored llama-swap UI, and it must not treat Swiss-design guidance or the older Apple reference as current runtime UI authority. The runtime information architecture, route ownership, and workflow structure stay repo-owned; the Paper Linear review design-system board informs theme tokens, typography, surface treatment, restraint, and control grammar.

## Authority and sync policy

1. **Paper is the intended visual source of truth.** The Paper Linear review file is the design authority for shared design-system decisions and for the layout/content of actual runtime pages.
2. **This document is the repo-owned canonical translation.** `DESIGN_SYSTEM.md` records the exact token values, component rules, and page contracts that engineering implements in the repo.
3. **Approved runtime implementation may temporarily lead Paper.** When Paper is known to be out of date relative to the latest approved runtime UI, the repo-owned implementation plus this document become the temporary reconciliation source until Paper is updated.
4. **Paper must be resynced after approved design/code changes.** Any approved runtime-shell, token, component, or page-layout change must be reflected back into Paper so visual authority and repo implementation converge again.
5. **Apple reference remains historical only.** `DESIGN_APPLE_REFERENCE.md` is not allowed to override Paper, this document, or the live runtime UI.

## Core rules

1. **Light and Dark only.** The operator UI exposes exactly `Light` and `Dark`; system preference is initial-default logic only until the operator chooses.
2. **Quiet chrome, strong content.** Shell, cards, tables, and controls stay restrained so runtime facts, ledgers, and results remain primary.
3. **Linear accent is the main interactive accent.** Primary actions, active states, links, and focus treatment inherit the current Paper Linear purple-blue family.
4. **Soft radii follow the Paper runtime shell grammar.** Shared surfaces use `8px`, `12px`, `16px`, and `28px` radii with pill actions where appropriate.
5. **Typography is Inter-led and tokenized.** `Inter` is the shared sans family for display and body roles, and `IBM Plex Mono` remains reserved for ids, paths, JSON, and transport artifacts.
6. **One shell header.** The shell header is the **only** route-level header. Route files do not duplicate eyebrow, title, or description blocks.
7. **Analytics routes and evidence routes stay distinct.** `/app` and charted Observe pages lead with analytics bands; raw-host and request-detail pages remain evidence-first.
8. **Status pills use solid token-backed backgrounds.** Semantic status pills use shared pill background and text tokens with explicit contrast, not transparent borders.
9. **The shell viewport stays fixed.** Sidebar and shell header remain fixed inside the shell; only the page-content frame scrolls, and that internal scrollbar stays visually hidden.

### Shell receipts

- Sidebar navigation is text-only. Section links never render route icons inside the rail.
- No visible divider separates the sidebar from the content column; both live on the same shell surface.
- The header title and the `role-model` brandmark share the same display token scale.
- The light/dark toggle sits on the right edge of the visible content frame, not the outer shell edge.
- The shell viewport is fixed-height. Scrolling happens only inside the main content frame.
- The content-frame scrollbar is hidden while preserving scroll behavior.
- Overview analytics empty states stay compact and never fabricate synthetic chart data to fill space.
- Configured-model detail code blocks show the compact preview payload (`modelId` plus `endpointIds`) instead of dumping full endpoint records into the first screen.

## Theme contract

### Typography tokens

| Token | Value |
| --- | --- |
| `--rm-font-display` | `"Inter", "Segoe UI", sans-serif` |
| `--rm-font-body` | `"Inter", "Segoe UI", sans-serif` |
| `--rm-font-mono` | `"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace` |

### Typography scale

| Use | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Hero display | `56px` | `400` | `62px` | `-0.032em` |
| Display / shell title | `22px` | `400` | `28px` | `-0.018em` |
| Section heading | `22px` | `600` | `28px` | `-0.018em` |
| Lead | `20px` | `400` | `28px` | `-0.015em` |
| Body | `16px` | `400` | `24px` | `-0.003em` |
| Body strong | `14px` | `600` | `21px` | `0` |
| Caption | `14px` | `400` | `21px` | `0` |
| Caption strong | `14px` | `600` | `21px` | `0` |
| Button large | `15px` | `600` | `20px` | `-0.01em` |
| Button utility | `13px` | `600` | `16px` | `-0.01em` |
| Fine print | `12px` | `400` | `17px` | `0` |
| Nav link | `14px` | `400` | `21px` | `0` |
| Utility label | `12px` | `400` | `16px` | `0.08em` |

### Surface and text tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-bg` | `#ffffff` | `#010102` |
| `--rm-surface` | `#f7f8f8` | `#0f1011` |
| `--rm-surface-strong` | `#ffffff` | `#141516` |
| `--rm-panel` | `#f3f4f6` | `#18191a` |
| `--rm-panel-muted` | `#eceef2` | `#191a1b` |
| `--rm-fg` | `#0f1115` | `#f7f8f8` |
| `--rm-secondary` | `#3a4150` | `#d0d6e0` |
| `--rm-muted` | `#69707d` | `#8a8f98` |
| `--rm-border` | `#e3e6ec` | `#23252a` |
| `--rm-border-strong` | `#ced3de` | `#34343a` |

### Accent tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-accent` | `#5e6ad2` | `#5e6ad2` |
| `--rm-accent-ink` | `#5e6ad2` | `#f7f8f8` |
| `--rm-accent-focus` | `#828fff` | `#828fff` |
| `--rm-accent-on-dark` | `#828fff` | `#828fff` |
| `--rm-accent-muted` | `rgba(94, 106, 210, 0.78)` | `rgba(130, 143, 255, 0.86)` |
| `--rm-accent-subtle` | `rgba(94, 106, 210, 0.14)` | `rgba(94, 106, 210, 0.20)` |
| `--rm-accent-ghost` | `rgba(94, 106, 210, 0.08)` | `rgba(94, 106, 210, 0.12)` |
| `--rm-on-primary` | `#ffffff` | `#ffffff` |

### Semantic status tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-success` | `#27a644` | `#27a644` |
| `--rm-success-muted` | `rgba(39, 166, 68, 0.76)` | `rgba(39, 166, 68, 0.82)` |
| `--rm-success-subtle` | `rgba(39, 166, 68, 0.10)` | `rgba(39, 166, 68, 0.14)` |
| `--rm-warning` | `#b67a11` | `#d9a441` |
| `--rm-warning-muted` | `rgba(182, 122, 17, 0.78)` | `rgba(217, 164, 65, 0.82)` |
| `--rm-warning-subtle` | `rgba(182, 122, 17, 0.14)` | `rgba(217, 164, 65, 0.12)` |
| `--rm-error` | `#d84f6a` | `#e06c89` |
| `--rm-error-muted` | `rgba(216, 79, 106, 0.76)` | `rgba(224, 108, 137, 0.82)` |
| `--rm-error-subtle` | `rgba(216, 79, 106, 0.14)` | `rgba(224, 108, 137, 0.20)` |
| `--rm-error-ghost` | `rgba(216, 79, 106, 0.10)` | `rgba(255, 125, 166, 0.10)` |
| `--rm-info` | `#3f87f5` | `#6ea8ff` |
| `--rm-advisory` | `#9664e8` | `#b479ff` |

### Telemetry semantic tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-telemetry-local` | `#0f1115` | `#9da8c8` |
| `--rm-telemetry-remote` | `#5e6ad2` | `#5e6ad2` |
| `--rm-telemetry-healthy` | `#27a644` | `#27a644` |
| `--rm-telemetry-degraded` | `#b67a11` | `#d9a441` |
| `--rm-telemetry-raw` | `#69707d` | `#62666d` |

### Radius, shadow, spacing, and shell tokens

| Token | Value |
| --- | --- |
| `--rm-radius-sm` | `8px` |
| `--rm-radius-md` | `12px` |
| `--rm-radius-lg` | `16px` |
| `--rm-radius-pill` | `9999px` |
| `--rm-radius-shell` | `28px` |
| `--rm-radius-panel` | `16px` |
| `--rm-radius-field` | `12px` |
| `--rm-radius-badge` | `9999px` |
| `--rm-shadow-card` | `none` |
| `--rm-shadow-ui` | `none` |
| `--rm-shadow-product` | `0 3px 5px 30px rgba(0, 0, 0, 0.22)` |
| `--rm-shell-width` | `1840px` |
| `--rm-space-xxs` | `4px` |
| `--rm-space-xs` | `8px` |
| `--rm-space-sm` | `12px` |
| `--rm-space-md` | `17px` |
| `--rm-space-lg` | `24px` |
| `--rm-space-xl` | `32px` |
| `--rm-space-xxl` | `48px` |
| `--rm-space-section` | `80px` |
| `--rm-nav-height-global` | `44px` |
| `--rm-nav-height-sub` | `52px` |
| `--rm-sticky-bar-height` | `64px` |
| `--rm-field-height` | `44px` |
| `--rm-icon-button-size` | `44px` |
| `--rm-button-pill-padding` | `11px 22px` |
| `--rm-button-utility-padding` | `8px 15px` |
| `--rm-button-pearl-padding` | `8px 14px` |
| `--rm-button-hero-padding` | `14px 28px` |
| `--rm-chip-padding` | `12px 16px` |
| `--rm-search-padding` | `12px 20px` |
| `--rm-card-padding` | `24px` |
| `--rm-sticky-bar-padding` | `12px 32px` |

### Border and utility surface tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-divider-soft` | `#e3e6ec` | `rgba(247, 248, 248, 0.06)` |
| `--rm-hairline` | `#e3e6ec` | `#23252a` |
| `--rm-chip-translucent` | `rgba(9, 11, 17, 0.06)` | `rgba(247, 248, 248, 0.08)` |

### Pill tokens

Status pills use solid token-backed backgrounds with contrasting text.

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-pill-neutral-bg` | `#e3e6ec` | `#23252a` |
| `--rm-pill-neutral-ink` | `#0f1115` | `#d0d6e0` |
| `--rm-pill-accent-bg` | `#5e6ad2` | `#5e6ad2` |
| `--rm-pill-accent-ink` | `#ffffff` | `#010102` |
| `--rm-pill-success-bg` | `#27a644` | `#27a644` |
| `--rm-pill-success-ink` | `#ffffff` | `#010102` |
| `--rm-pill-warning-bg` | `#b67a11` | `#d9a441` |
| `--rm-pill-warning-ink` | `#ffffff` | `#010102` |
| `--rm-pill-error-bg` | `#d84f6a` | `#e06c89` |
| `--rm-pill-error-ink` | `#ffffff` | `#ffffff` |
| `--rm-pill-info-bg` | `#3f87f5` | `#6ea8ff` |
| `--rm-pill-info-ink` | `#ffffff` | `#010102` |
| `--rm-pill-advisory-bg` | `#9664e8` | `#b479ff` |
| `--rm-pill-advisory-ink` | `#ffffff` | `#010102` |

## Chart system contract

Charts inherit the same theme and typography system as the rest of runtime UI. There is no separate chart mini-theme.

### Semantic chart tokens

- `--rm-chart-local`
- `--rm-chart-remote`
- `--rm-chart-tokens`
- `--rm-chart-cache-hit`
- `--rm-chart-cache-rate`
- `--rm-chart-latency`
- `--rm-chart-cost`
- `--rm-chart-failure`
- `--rm-chart-success`
- `--rm-chart-neutral-1`
- `--rm-chart-neutral-2`

### Categorical chart palette

| Token | Value |
| --- | --- |
| `--rm-chart-ink` | `#171717` |
| `--rm-chart-cyan` | `#9da8c8` |
| `--rm-chart-highlight-pink` | `#d95d7b` |
| `--rm-chart-violet` | `#8a78ff` |
| `--rm-chart-link-blue` | `#5e6ad2` |
| `--rm-chart-link-deep` | `#4653c2` |
| `--rm-chart-link-soft` | `#d7dbff` |
| `--rm-chart-error` | `#e06c89` |
| `--rm-chart-error-deep` | `#b84361` |
| `--rm-chart-error-soft` | `#ffd8e2` |
| `--rm-chart-warning` | `#e2a93b` |
| `--rm-chart-warning-deep` | `#b57918` |
| `--rm-chart-warning-soft` | `#fff1cd` |

### Chart behavior rules

- legends display explicit human-readable labels for endpoint, model, provider, role, strategy, and source series
- horizontal ranking charts place category labels in a bottom legend, not on the left axis, so long endpoint/model names do not compete with the bar plot area
- ranked comparisons remain horizontal bars rather than pie charts because ordered bars preserve rank, magnitude, and outlier comparison more clearly for long technical labels
- color assignment is deterministic where feasible so the same series identity keeps the same token across charts
- a single chart must not reuse the same resolved visual color for different visible metrics or series
- chart containers define explicit height or minimum-height values to prevent collapse on first render
- tooltips, legends, axis labels, and helper copy inherit runtime caption/body roles
- grids, axes, and separators use the runtime hairline family
- loading, empty, and error states are distinct
- telemetry chart states are canonical and shared across charted routes: `loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, and `populated`
- `unsupported`, `partial`, and `truncated` states come from backend analytics metadata, not frontend inference from zeroes or missing series
- background refresh keeps the last populated chart visible and adds a calm refreshing affordance instead of replacing the chart with a loading skeleton
- `empty`, `unsupported`, and `error` replace the chart body with an explicit state panel
- `partial` and `truncated` keep the populated chart visible and add a warning notice
- initial chart-request failures render per-card error states instead of collapsing the entire analytics page
- `/app` and charted Observe routes keep primary chart containers visible even when there is no data
- no fake sample series may be rendered in production empty states

## Shell layout

- Desktop: fixed primary left rail, main content region, and section-local top tabs
- Mobile: section rail stacks above content and secondary navigation becomes a horizontal scroll row
- The left rail contains the primary section list plus quiet preserved-host-tools links
- The shell viewport itself does not scroll; only the content frame under the shell header scrolls
- The content frame keeps scroll behavior but hides the native scrollbar chrome
- The shell header contains:
  - page title (from `RuntimeRouteDefinition.title`, overridable on detail routes)
  - optional page actions (registered by the active route via `usePageActions()`)
  - the shared light/dark icon toggle aligned to the visible content width, not the outer shell edge
- Secondary navigation sits beneath the shell header as section-local page tabs
- Page content begins immediately in `<main>` with template primitives (`FactCard`, `SectionCard`, …)
- Route files must **not** repeat title metadata inside page content
- Preserve vendor-host escape hatches as contextual page actions or route-local references, not as global shell chrome

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
| `/app` | live | `summary-board` | Lead with shared telemetry controls and a chart-led runtime overview, then place a horizontal latest-requests strip above current endpoint inventory so charts retain the dominant width. |
| `/app/studio/chat` | live | `studio-workspace` | Routed chat workspace with assistant output, tool calls, execution receipts, usage, and raw payload inspection. |
| `/app/studio/images` | live | `studio-workspace` | Image workspace with two first-slice request modes in one page: OpenAI-style generation over `/v1/images/generations` and SDAPI generation over `/sdapi/v1/txt2img`; editing and img2img stay backlog-visible rather than first-slice requirements. |
| `/app/studio/audio` | live | `studio-workspace` | Unified audio workspace over `/v1/audio/speech`, `/v1/audio/voices`, and `/v1/audio/transcriptions` so voice discovery, speech generation, and transcript workflows remain one operator surface. |
| `/app/studio/rerank` | live | `studio-workspace` | Ranked-input evaluation workspace over `/v1/rerank` and `/v1/reranking` with a compact request rail, ordered score ledger, and raw payload inspection. |
| `/app/studio/advanced` | live | `studio-workspace` | Contract-and-request workspace for advanced families that stay under Studio: `/v1/responses`, `/v1/messages`, `/v1/messages/count_tokens`, `/v1/embeddings`, `/completion`, and `/infill`. |
| `/app/remote/providers` | live | `registry-detail` | Primary remote-provider onboarding and maintenance route for choosing a LiteLLM-backed provider, selecting provider models, completing API-key or OAuth setup, and repairing saved accounts in place with explicit **Reconnect** and **Update API key** actions. |
| `/app/models` | live | `model-inventory` | Unified local/remote model inventory with inspect-only card drill-ins, explicit handoff to the runtime-config editor, and a non-error pre-activation state when no controller exists yet. |
| `/app/models/roles` | live | `registry-detail` | Runtime role policy authoring and task allowlist management over the live router policy surface. |
| `/app/models/benchmark` | live | `registry-detail` | Capability benchmark for configured models with judge grading, persisted scores, and routing-impact explanation. |
| `/app/router` | live | `registry-detail` | First-class routing overview that summarizes active posture, recent decisions, and operator handoff into config, candidates, and decision interpretation. |
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

All templates assume the shell header is already visible. Page content begins directly with template primitives (`FactCard`, `SectionCard`, …) and never with a duplicate page-title block.

| Template | Layout definition |
| --- | --- |
| `summary-board` | Content starts under the shell header. Shared analytics controls and chart-led posture first, then a horizontal latest-requests strip above current endpoint inventory. |
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
| `summary-board` | `/app` leads with telemetry controls plus a chart-led posture band for tokens, cost, avoided cost, latency, cache, and success/failure volume; a horizontal latest-requests strip sits immediately above current endpoint inventory as drill-in context rather than a competing KPI strip. Latest requests is an interaction rail, not a raw canonical request ledger. |
| `studio-workspace` | `/app/studio/chat` uses a compact composer, dominant response stage, and adjacent usage/tooling/payload inspection. |
| `registry-detail` | Provider, runtime-config, controller, and endpoint pages keep the primary editor/ledger split and use summary chrome only when it changes the operator decision. |
| `model-inventory` | `/app/models` uses fact strips before a responsive configured-model card grid and an inspect-only modal. |
| `ledger-inspector` | Requests and Observe Routing now lead with shared analytics controls plus chart-led history above their canonical ledgers or comparison bands, while request detail stays telemetry-first and Activity remains the raw-host adjacency surface for metrics, captures, and payload drill-ins. |
| `dual-console` | `/app/observe/logs` and `/app/local/logs` start with combined history, then split proxy and upstream consoles into mirrored panes. |
| `contract-reference` | `/app/connect/downstream` keeps connection facts in a narrow reference column and examples/compatibility in the larger contract pane. |
| `system-topology` | `/app/system/runtime` layers lifecycle, controller posture, live version facts, and preserved host diagnostics without extra note-only panels. |
| `matrix-grid` | Local Models grid view shows a dense status-first grid of concurrently loaded models with engine and loaded state. |

## Per-page layout and content contracts

This section is the repo-owned page-by-page source of truth for live runtime pages. The intended visual authority for these contracts remains the Paper Linear review file, but the contracts below are the canonical implementation record when Paper temporarily lags the latest approved runtime UI. The route/template tables define route ownership; the contracts below define the required reading order, major regions, and content obligations per page.

Redirect-only routes inherit the contract of their live destination and do not define independent page content.

| Route | Layout contract | Required content contract |
| --- | --- | --- |
| `/app` | Telemetry controls first, chart band second, horizontal latest-requests strip third, endpoint inventory last. The old right-hand request rail is not allowed. | Must show time-range controls, primary telemetry filters, token/cost/latency/cache/success charts, recent requests with analytics handoffs, and current routable endpoint inventory. |
| `/app/studio/chat` | Two-column studio workspace with composer rail left and result workspace right; secondary receipts may stack below result. | Must show model/endpoint/routing controls, prompt entry, request submission, result summary, tooling receipts, usage, and raw payload inspection. |
| `/app/studio/images` | Studio workspace with request-mode controls first, composition controls next, output gallery/result stage beside or below controls depending on width. | Must show OpenAI-style and SDAPI generation modes, model selection, generation controls, output/result stage, and payload/response detail. |
| `/app/studio/audio` | Studio workspace with speech/transcription controls leading, result stage adjacent, and secondary receipts below. | Must show provider/model/voice or transcription controls, audio or transcript result surfaces, and request/response detail. |
| `/app/studio/rerank` | Single dominant result column is preferred when the score list would otherwise feel cramped; controls stay above results. | Must show query/candidate inputs, model selection, rerank execution, ordered scores, and payload inspection. |
| `/app/studio/advanced` | Studio workspace with compact operation selector and request form first, then result/contract panes. | Must show advanced API family selection, operation-specific inputs, response area, and raw contract/payload detail. |
| `/app/remote/providers` | Registry-detail split with onboarding/editor rail on one side and saved-account operational state on the other. Role groups default collapsed. | Must show provider selection, connection method, credentials/account metadata, model selection, grouped role binding controls, saved provider connections, and repair actions like reconnect or API-key update. |
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
| `/app/observe/requests` | Ledger-inspector page with analytics controls and charts above the canonical request ledger. Advanced controls stay behind a compact expand/collapse row. | Must show time-range/filter controls, structured request analytics, request ledger rows, and request-detail handoffs. |
| `/app/observe/routing` | Ledger-inspector analytics page with routing controls first, comparison charts second, and current-slice summary adjacent or below. | Must show routing mix, avoided cost, difficulty, strategy/model/role analytics, and compact advanced controls behind disclosure. |
| `/app/observe/requests/:requestId` | Ledger-inspector detail page with top telemetry facts first, then taxonomy/cost/tooling/capture evidence in readable sections. | Must show request identity, usage, cache, endpoint profile context, routing receipts, taxonomy classification, capture links, and stored cost metadata. |
| `/app/observe/logs` | Dual-console preserved-host log surface with history and stream panes. | Must show request-correlated raw logs, split log sources, and Observe detail handoffs when correlation exists. |
| `/app/connect/downstream` | Contract-reference page with narrow reference facts and broader downstream compatibility/content pane. | Must show auth, endpoint/model discovery, compatibility notes, request examples, and downstream tool-calling expectations. |
| `/app/connect/upstream` | Contract-reference page with passthrough boundaries first and model/provider specifics second. | Must show upstream targets, auth posture, passthrough limitations, raw escape hatches, and model-specific routing implications. |
| `/app/system/runtime` | System-topology layered summary with lifecycle/health first, version and policy second, diagnostics last. | Must show lifecycle summary, controller posture, validation floor, version/provenance facts, vendor policy, and host-level diagnostics. |
| `/app/system/runtime-config` | Registry-detail runtime editor with unified config form on one side and current effective runtime posture on the other. | Must show local/remote runtime config inputs, saved/current config context, and policy/runtime implications. |
| `/app/system/session-readiness` | System-topology page with bootstrap/readiness ladder first, blockers next, and operator-intent diagnostics after. | Must show bootstrap status, lifecycle authority, blockers, routing readiness, alias drift, and operator-intent outcomes. |
| `/app/system/peers` | System-topology inventory page with peer cards/rows first and topology/policy context second. | Must show peer sources, auth posture, live model matches, topology relationships, timeout/filter policy, and empty-state guidance. |

## Runtime, session readiness, and provider-maintenance rules

- The route keeps the existing onboarding form on one side and saved-account operational state on the other.
- Saved-account cards must expose:
  - lifecycle badge from the canonical backend lifecycle contract
  - normalized storage-mode/credential posture
  - explicit **Reconnect** for repairable OAuth accounts
  - explicit **Update API key** for API-key accounts
- **Update API key** uses a restrained modal with explicit **Save** and **Cancel** controls, clear saving/error states, and no secret echo/backfill.
- Archived stale legacy artifacts are never shown as current blocking setup rows on the saved-account surface; if surfaced, they appear only as bounded diagnostics separate from active accounts.
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

- Shared semantic status pills for `healthy`, `degraded`, `offline`, and similar runtime states use solid token-backed backgrounds
- semantic meaning is carried by token choice plus contrasting text
- transparent semantic-outline pills are not part of the active runtime grammar
- pill fill, pill text, and pill emphasis come from shared theme tokens, never route-local hardcoded colors

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
