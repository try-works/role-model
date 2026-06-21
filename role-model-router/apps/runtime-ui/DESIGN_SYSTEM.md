# Runtime UI Design System

## Intent

The runtime UI is a repo-owned operator shell for the role-model router runtime. Its active styling authority is the Apple-inspired reference at `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`, adapted for a practical operator product rather than a marketing site.

This shell must not clone the vendored llama-swap UI, and it must not treat Swiss-design guidance as authoritative for runtime UI styling. The runtime information architecture, route ownership, and workflow structure stay repo-owned; the Apple reference informs theme tokens, typography, surface treatment, restraint, and control grammar.

## Core rules

1. **Light and Dark only.** The operator UI exposes exactly `Light` and `Dark`; system preference is initial-default logic only until the operator chooses.
2. **Quiet chrome, strong content.** Shell, cards, tables, and controls stay restrained so runtime facts, ledgers, and results remain primary.
3. **Action Blue is the main interactive accent.** Primary actions, active states, links, and focus treatment inherit the Apple blue family.
4. **Soft radii replace the old rectilinear contract.** Shared surfaces use `8px`, `11px`, and `18px` radii with pill actions where appropriate.
5. **Typography is Apple-inspired but platform-safe.** `SF Pro Display` / `SF Pro Text` lead, `Inter` is the first fallback, and mono is reserved for ids, paths, JSON, and transport artifacts.
6. **One shell header.** The shell header is the **only** route-level header. Route files do not duplicate eyebrow, title, or description blocks.
7. **Analytics routes and evidence routes stay distinct.** `/app` and charted Observe pages lead with analytics bands; raw-host and request-detail pages remain evidence-first.
8. **Status pills stay transparent.** Semantic status pills keep semantic text and border colors, with no tinted semantic background fill.

## Theme contract

### Typography tokens

| Token | Value |
| --- | --- |
| `--rm-font-display` | `"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--rm-font-body` | `"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--rm-font-mono` | `"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace` |

### Typography scale

| Use | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Hero display | `56px` | `600` | `1.07` | `-0.28px` |
| Display / shell title | `40px` | `600` | `1.10` | `0` |
| Section heading | `34px` | `600` | `1.47` | `-0.374px` |
| Lead | `28px` | `400` | `1.14` | `0.196px` |
| Lead airy | `24px` | `300` | `1.50` | `0` |
| Tagline | `21px` | `600` | `1.19` | `0.231px` |
| Body | `17px` | `400` | `1.47` | `-0.374px` |
| Body strong | `17px` | `600` | `1.24` | `-0.374px` |
| Dense link | `17px` | `400` | `2.41` | `0` |
| Caption | `14px` | `400` | `1.43` | `-0.224px` |
| Caption strong | `14px` | `600` | `1.29` | `-0.224px` |
| Button large | `18px` | `300` | `1.0` | `0` |
| Button utility | `14px` | `400` | `1.29` | `-0.224px` |
| Fine print | `12px` | `400` | `1.0` | `-0.12px` |
| Micro legal | `10px` | `400` | `1.3` | `-0.08px` |
| Nav link | `12px` | `400` | `1.0` | `-0.12px` |
| Utility label | `12px` | `400` | `1.0` | `-0.12px` |

### Surface and text tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-bg` | `#f5f5f7` | `#000000` |
| `--rm-surface` | `#ffffff` | `#272729` |
| `--rm-surface-strong` | `#ffffff` | `#2a2a2c` |
| `--rm-panel` | `#fafafc` | `#252527` |
| `--rm-fg` | `#1d1d1f` | `#ffffff` |
| `--rm-secondary` | `rgba(29, 29, 31, 0.72)` | `rgba(255, 255, 255, 0.72)` |
| `--rm-muted` | `rgba(29, 29, 31, 0.48)` | `rgba(255, 255, 255, 0.48)` |
| `--rm-border` | `#e0e0e0` | `rgba(255, 255, 255, 0.12)` |
| `--rm-border-strong` | `#d2d2d7` | `rgba(255, 255, 255, 0.18)` |

### Accent tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-accent` | `#0066cc` | `#0066cc` |
| `--rm-accent-focus` | `#0071e3` | `#0071e3` |
| `--rm-accent-on-dark` | `#2997ff` | `#2997ff` |
| `--rm-accent-muted` | `rgba(0, 102, 204, 0.72)` | `rgba(0, 102, 204, 0.72)` |
| `--rm-accent-subtle` | `rgba(0, 102, 204, 0.14)` | `rgba(41, 151, 255, 0.18)` |
| `--rm-accent-ghost` | `rgba(0, 102, 204, 0.08)` | `rgba(41, 151, 255, 0.10)` |
| `--rm-on-primary` | `#ffffff` | `#ffffff` |

### Semantic status tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-success` | `#166534` | `#86efac` |
| `--rm-success-muted` | `rgba(22, 101, 52, 0.72)` | `rgba(134, 239, 172, 0.72)` |
| `--rm-success-subtle` | `rgba(22, 101, 52, 0.14)` | `rgba(134, 239, 172, 0.18)` |
| `--rm-warning` | `#b45309` | `#fbbf24` |
| `--rm-warning-muted` | `rgba(180, 83, 9, 0.72)` | `rgba(251, 191, 36, 0.72)` |
| `--rm-warning-subtle` | `rgba(180, 83, 9, 0.14)` | `rgba(251, 191, 36, 0.18)` |
| `--rm-error` | `#c8102e` | `#fb7185` |
| `--rm-error-muted` | `rgba(200, 16, 46, 0.72)` | `rgba(251, 113, 133, 0.72)` |
| `--rm-error-subtle` | `rgba(200, 16, 46, 0.14)` | `rgba(251, 113, 133, 0.18)` |
| `--rm-error-ghost` | `rgba(200, 16, 46, 0.08)` | `rgba(251, 113, 133, 0.10)` |

### Telemetry semantic tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-telemetry-local` | `#1d1d1f` | `#ffffff` |
| `--rm-telemetry-remote` | `#0066cc` | `#2997ff` |
| `--rm-telemetry-healthy` | `#166534` | `#86efac` |
| `--rm-telemetry-degraded` | `#b45309` | `#fbbf24` |
| `--rm-telemetry-raw` | `#7a7a7a` | `#cccccc` |

### Radius, shadow, spacing, and shell tokens

| Token | Value |
| --- | --- |
| `--rm-radius-sm` | `8px` |
| `--rm-radius-md` | `11px` |
| `--rm-radius-lg` | `18px` |
| `--rm-radius-pill` | `9999px` |
| `--rm-radius-shell` | `18px` |
| `--rm-radius-panel` | `18px` |
| `--rm-radius-field` | `11px` |
| `--rm-radius-badge` | `9999px` |
| `--rm-shadow-card` | `none` |
| `--rm-shadow-ui` | `none` |
| `--rm-shadow-product` | `0 3px 5px 30px rgba(0, 0, 0, 0.22)` |
| `--rm-shell-width` | `1440px` |
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
| `--rm-divider-soft` | `#f0f0f0` | `rgba(255, 255, 255, 0.10)` |
| `--rm-hairline` | `#e0e0e0` | `rgba(255, 255, 255, 0.12)` |
| `--rm-chip-translucent` | `rgba(210, 210, 215, 0.64)` | `rgba(210, 210, 215, 0.24)` |

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
| `--rm-chart-cyan` | `#50e3c2` |
| `--rm-chart-highlight-pink` | `#ff0080` |
| `--rm-chart-violet` | `#7928ca` |
| `--rm-chart-link-blue` | `#0070f3` |
| `--rm-chart-link-deep` | `#0761d1` |
| `--rm-chart-link-soft` | `#d3e5ff` |
| `--rm-chart-error` | `#ee0000` |
| `--rm-chart-error-deep` | `#c50000` |
| `--rm-chart-error-soft` | `#f7d4d6` |
| `--rm-chart-warning` | `#f5a623` |
| `--rm-chart-warning-deep` | `#ab570a` |
| `--rm-chart-warning-soft` | `#ffefcf` |

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
- `/app` and charted Observe routes keep primary chart containers visible even when there is no data
- no fake sample series may be rendered in production empty states

## Shell layout

- Desktop: fixed primary left rail, main content region, and section-local top tabs
- Mobile: section rail stacks above content and secondary navigation becomes a horizontal scroll row
- The left rail contains the primary section list plus quiet preserved-host-tools links
- The shell header contains:
  - page title (from `RuntimeRouteDefinition.title`, overridable on detail routes)
  - concise technical description (from `RuntimeRouteDefinition.description`)
  - optional page actions (registered by the active route via `usePageActions()`)
- Secondary navigation sits beneath the shell header as section-local page tabs
- Page content begins immediately in `<main>` with template primitives (`FactCard`, `SectionCard`, …)
- Route files must **not** repeat title or description metadata
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
| description | `RuntimeRouteDefinition.description` | shell default; override rarely |
| page actions | active route component | `usePageActions()` only — not `RuntimeRouteDefinition` (actions are often dynamic, conditional, or stateful) |
| section tabs | `runtimeNavigationSections` | `AppShell` |

## Route and layout contract

| Route | Status | Template | Purpose |
| --- | --- | --- | --- |
| `/app` | live | `summary-board` | Lead with shared telemetry controls and a chart-led runtime overview, then keep current endpoint inventory beside a latest-interactions rail below the analytics band. |
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
| `summary-board` | Content starts under the shell header. Shared analytics controls and chart-led posture first, then current endpoint inventory beside a latest-request interaction rail. |
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
| `summary-board` | `/app` leads with telemetry controls plus a chart-led posture band for tokens, cost, avoided cost, latency, cache, and success/failure volume; current endpoint inventory and latest requests stay below as drill-in context rather than a competing KPI strip. Latest requests is an interaction rail, not a raw canonical request ledger. |
| `studio-workspace` | `/app/studio/chat` uses a compact composer, dominant response stage, and adjacent usage/tooling/payload inspection. |
| `registry-detail` | Provider, runtime-config, controller, and endpoint pages keep the primary editor/ledger split and use summary chrome only when it changes the operator decision. |
| `model-inventory` | `/app/models` uses fact strips before a responsive configured-model card grid and an inspect-only modal. |
| `ledger-inspector` | Requests and Observe Routing now lead with shared analytics controls plus chart-led history above their canonical ledgers or comparison bands, while request detail stays telemetry-first and Activity remains the raw-host adjacency surface for metrics, captures, and payload drill-ins. |
| `dual-console` | `/app/observe/logs` and `/app/local/logs` start with combined history, then split proxy and upstream consoles into mirrored panes. |
| `contract-reference` | `/app/connect/downstream` keeps connection facts in a narrow reference column and examples/compatibility in the larger contract pane. |
| `system-topology` | `/app/system/runtime` layers lifecycle, controller posture, live version facts, and preserved host diagnostics without extra note-only panels. |
| `matrix-grid` | Local Models grid view shows a dense status-first grid of concurrently loaded models with engine and loaded state. |

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
- Generic search or text inputs do not default to mono typography

### Badges and status pills

- Shared semantic status pills for `healthy`, `degraded`, `offline`, and similar runtime states keep transparent backgrounds
- semantic meaning is carried by text and border color
- no low-alpha semantic background fill is used for those shared pills

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
