# Runtime UI Design System

## Intent

The runtime UI is a repo-owned operator shell for the role-model router runtime. It uses the Swiss-design baseline from the repo-local skill material together with the current React/Tailwind runtime surfaces:

- grid first
- mobile first
- whitespace as structure
- opacity, not hue, for hierarchy
- one accent color
- rectilinear surfaces

This shell must not clone the vendored llama-swap UI. It should absorb the vendor's real operator workflows into the role-model information architecture so routing, tooling, multimodal APIs, host controls, and observability read as one system.

## Core rules

1. **No rounded structural elements.** Cards, inputs, buttons, nav items, badges, code blocks, and drawers stay rectilinear.
2. **One accent color.** Accent only marks primary action, active route, and a small number of high-attention states.
3. **Typography stays light and precise.** `IBM Plex Sans` is primary; `IBM Plex Mono` is reserved for ids, paths, payloads, and API shapes.
4. **12-column thinking, even when implemented as split panes.** Mobile stacks first; larger breakpoints introduce asymmetry and inspection tension.
5. **Body copy stays narrow.** Explanatory text should stay near `60ch`.
6. **Operator chrome stays quiet.** The shell may expose only structural metadata (`Section`, `Template`, `Route`) in addition to route title and description; no redundant note cards or fixed JSON/log quick-link strips.

## Tokens

### Typography

- Primary font: `IBM Plex Sans`
- Mono font: `IBM Plex Mono`
- Labels: uppercase with wide tracking
- Page titles: light or normal weight, never heavy display bolding

### Color

- Page background: `stone-50` (`#fafaf9`) in light mode and `stone-950` (`#0c0a09`) in dark mode
- Surface/card: `stone-100` (`#f5f5f4`) in light mode and `stone-900` (`#1c1917`) in dark mode
- Subtle surface/panel: `stone-200` (`#e7e5e4`) in light mode and `stone-800` (`#292524`) in dark mode
- Border: `stone-200` in light mode and `stone-800` in dark mode; subtle border uses `stone-100` / `stone-900`
- Primary text: `stone-900` in light mode and `stone-50` in dark mode
- Secondary text: foreground hue at `70%` opacity
- Tertiary text: foreground hue at `40%` opacity
- Placeholder/ghosted text: foreground hue at `20%` opacity
- Accent: Swiss red `#C8102E`
- Accent opacities:
  - full `#C8102E`
  - muted `rgba(200, 16, 46, 0.60)`
  - subtle `rgba(200, 16, 46, 0.20)`
  - ghost `rgba(200, 16, 46, 0.10)`

### Geometry

- Radius: `0`
- Border weight: hairline default, stronger only for active/focus states
- Shadows: subtle depth only on shell-level surfaces

### Token layers

- **Primitive tokens** define the Swiss baseline:
  - stone neutrals
  - Swiss red accent
  - 8px spacing rhythm
  - `IBM Plex Sans` / `IBM Plex Mono`
- **Semantic tokens** are the runtime CSS variables:
  - `--rm-bg`
  - `--rm-surface`
  - `--rm-surface-strong`
  - `--rm-panel`
  - `--rm-fg`
  - `--rm-secondary`
  - `--rm-muted`
  - `--rm-border`
  - `--rm-border-strong`
  - `--rm-accent`
  - accent opacity variants
  - telemetry semantic accents:
    - `--rm-telemetry-local`
    - `--rm-telemetry-remote`
    - `--rm-telemetry-healthy`
    - `--rm-telemetry-degraded`
    - `--rm-telemetry-raw`
- **Component tokens** sit above the semantic layer:
  - `--rm-shell-width`
  - `--rm-radius-*`
  - `--rm-shadow-card`
  - the shared shell/card/field/button/payload class contracts

## Shell layout

- Desktop: fixed primary left rail, main content region, and section-local top tabs
- Mobile: section rail stacks above content and secondary navigation becomes a horizontal scroll row
- The left rail contains the primary section list plus a quiet preserved-host-tools list for `/logs` and `/api/metrics`
- The shell header contains:
  - eyebrow
  - title
  - concise technical description
  - a three-card structural metadata strip for `Section`, `Template`, and `Route`
- Secondary navigation sits beneath the shell header metadata as section-local page tabs
- Preserve vendor-host escape hatches as contextual page actions or route-local references, not as a global `/ui` affordance in shell chrome

## Navigation model

The runtime hierarchy remains:

| Section | Purpose | Route family |
| --- | --- | --- |
| Overview | Runtime-wide posture and attention items | `/app` |
| Studio | Request composition and multimodal API workspaces | `/app/studio/*` |
| Control | Provider, account, endpoint, controller, and model configuration | `/app/control/*` |
| Local | Local inference runtime: loaded models, swap history, host policy, log streaming, matrix solver, and peer management | `/app/local/*` |
| Router | Routing explanation, policy visibility, candidate comparison, and decision drill-in | `/app/router/*` |
| Observe | Request ledgers, raw host activity, logs, metrics, and captures | `/app/observe/*` |
| Integrations | Downstream contracts, upstream passthrough, and compatibility references | `/app/integrations/*` |
| System | Host/runtime topology, peer inventory, version, auth, and policy posture | `/app/system/*` |

## Route and layout contract

| Route | Status | Template | Purpose |
| --- | --- | --- | --- |
| `/app` | live | `summary-board` | Lead with canonical local/remote telemetry KPIs, comparison rows, current controller assignment, recent requests, and major exceptions. |
| `/app/studio/chat` | live | `studio-workspace` | Routed chat workspace with assistant output, tool calls, execution receipts, usage, and raw payload inspection. |
| `/app/studio/images` | live | `studio-workspace` | Image workspace with two first-slice request modes in one page: OpenAI-style generation over `/v1/images/generations` and SDAPI generation over `/sdapi/v1/txt2img`; editing and img2img stay backlog-visible rather than first-slice requirements. |
| `/app/studio/audio` | live | `studio-workspace` | Unified audio workspace over `/v1/audio/speech`, `/v1/audio/voices`, and `/v1/audio/transcriptions` so voice discovery, speech generation, and transcript workflows remain one operator surface. |
| `/app/studio/rerank` | live | `studio-workspace` | Ranked-input evaluation workspace over `/v1/rerank` and `/v1/reranking` with a compact request rail, ordered score ledger, and raw payload inspection. |
| `/app/studio/advanced` | live | `studio-workspace` | Contract-and-request workspace for advanced families that stay under Studio: `/v1/responses`, `/v1/messages`, `/v1/messages/count_tokens`, `/v1/embeddings`, `/completion`, and `/infill`. |
| `/app/control/providers` | live | `registry-detail` | Primary provider onboarding route for choosing a provider from the effective runtime catalog, choosing that provider's models, and completing either API-key or OAuth setup without leaving the page. |
| `/app/control/routing-strategy` | live | `registry-detail` | Structured routing-strategy posture for execution mode, controller state, and handoff into advanced config plus request verification. |
| `/app/control/runtime-config` | live | `registry-detail` | Repo-owned editor for the unified runtime contract covering local llama-swap models, remote LiteLLM providers, and process policy. |
| `/app/control/endpoints` | live | `registry-detail` | Configured runtime registry for provider-model endpoint entries, health posture, and source visibility after provider onboarding. |
| `/app/control/controller` | live | `registry-detail` | Explicit controller assignment with candidate health, source type, role coverage, tooling posture, and an honest empty state before any endpoint is activated. |
| `/app/router` | live | `registry-detail` | First-class routing overview that summarizes active posture, recent decisions, and operator handoff into config, candidates, and decision interpretation. |
| `/app/router/config` | live | `registry-detail` | Consolidated routing configuration and provenance surface across strategy, execution mode, controller, and policy-source context. |
| `/app/router/candidates` | live | `ledger-inspector` | Unified local and remote candidate inventory with health, role coverage, and observed routing-signal posture. |
| `/app/router/decisions` | live | `ledger-inspector` | Explainable routing decision ledger keyed by request identity with direct drill-in to policy and scoring detail. |
| `/app/router/decisions/:requestId` | live | `ledger-inspector` | Request-keyed routing decision explanation with scored candidates, diagnostics, and Observe request-detail handoff. |
| `/app/local/models` | live | `registry-detail` | Local inference runtime state: currently loaded models, engine type, uptime, manual load/unload controls, and empty-state when no models are in memory. |
| `/app/local/swap` | live | `ledger-inspector` | Swap event ledger: chronological log of model swaps with timestamp, old/new model, and reason (request-driven or manual). |
| `/app/local/policy` | live | `registry-detail` | Local host policy: TTL configuration, auto-unload toggle, startPort, logLevel, and capture buffer settings. |
| `/app/local/logs` | target | `dual-console` | Real-time log streaming from llama-swap: live `/logs/stream` feed, historical `/logs` buffer, proxy/upstream source toggle, auto-scroll. |
| `/app/local/matrix` | target | `matrix-grid` | Concurrent model matrix: grid of loaded models with engine, memory, uptime; color-coded status; add/remove controls. |
| `/app/local/peers` | target | `registry-detail` | Peer llama-swap instance management: peer inventory, health, model availability, add/remove peer controls. |
| `/app/control/models` | live | `model-inventory` | Unified local/remote model inventory with inspect-only card drill-ins, explicit handoff to the runtime-config editor, and a non-error pre-activation state when no controller exists yet. |
| `/app/observe/activity` | live | `ledger-inspector` | Preserved raw-host activity ledger over `/api/metrics` with inline capture drill-ins from `/api/captures/:id` and adjacent access to `/api/events`. |
| `/app/observe/requests` | live | `ledger-inspector` | Canonical telemetry request ledger over `/api/role-model/telemetry/requests` with latency, token, cache, and source context. |
| `/app/observe/requests/:requestId` | live | `ledger-inspector` | Telemetry-first request inspector with usage, cache, captures, endpoint profile, tooling receipts, and raw observation detail. |
| `/app/observe/logs` | live | `dual-console` | Repo-owned log shell with preserved `/logs` history plus split proxy/upstream consoles over `/logs/stream/*`. |
| `/app/integrations/downstream` | live | `contract-reference` | Downstream OpenAI-compatible contract, auth, model discovery, and tool-calling expectations. |
| `/app/integrations/upstream` | live | `contract-reference` | Upstream passthrough reference with model-specific upstream target inventory, boundary guidance, and contextual raw `/upstream/*` escape hatches. |
| `/app/system/runtime` | live | `system-topology` | Runtime health, controller posture, version/provenance facts, host controls, validation floor, and vendor-policy summary. |
| `/app/system/peers` | live | `system-topology` | Peer inventory and policy page for `peers` config, including remote model sources, auth posture, timeouts, request filters, matrix/group/runtime-policy relationships, and a real empty-state contract when no peers are configured. |

Status note:

- `live` means the repo-owned page is implemented today.

## Page templates

| Template | Layout definition |
| --- | --- |
| `summary-board` | Two-tier dashboard: telemetry summary cards first, then a split between cross-vendor comparison and recent request/configuration posture. |
| `studio-workspace` | Left composition rail, dominant result surface, and secondary inspection region for payload, captures, or contracts. |
| `registry-detail` | Dense registry/editor split: compact editing or selection on one side, operational state ledger on the other. |
| `model-inventory` | Mobile-first card grid with modal drill-in; cards are the default object representation, not rows. |
| `ledger-inspector` | Dense sortable ledger plus adjacent inspector or drill-in drawer for telemetry facts, captures, payloads, and profile context. |
| `dual-console` | Two raw log consoles or stream panes with clear source labels and a small operator toolbar. |
| `contract-reference` | Narrow reference column plus implementation contract panels and example payloads. |
| `matrix-grid` | Dense grid of concurrent operational cells: status-first, then resource metrics, with add/remove controls and honest empty state. |
| `system-topology` | Layered operational summary: health and version first, then host/runtime policy panels and contextual host diagnostics. |

Temporary placeholder routes may render through `FutureSurface` only while a future route is being converted. That scaffold is a short-lived bridge, not the long-term design contract.

## Live template receipts

| Template | Implemented reading order |
| --- | --- |
| `summary-board` | `/app` leads with telemetry KPI cards, then a dominant local-vs-remote comparison/readiness split with recent request context below. |
| `studio-workspace` | `/app/studio/chat` uses a compact composer, dominant response stage, and adjacent usage/tooling/payload inspection. |
| `registry-detail` | Provider, runtime-config, controller, and endpoint pages keep the primary editor/ledger split and use summary chrome only when it changes the operator decision. |
| `model-inventory` | `/app/control/models` uses fact strips before a responsive configured-model card grid and an inspect-only modal. |
| `ledger-inspector` | Requests and request detail lead with telemetry facts while Activity remains the raw-host adjacency surface for metrics, captures, and payload drill-ins. |
| `dual-console` | `/app/observe/logs` and `/app/local/logs` start with combined history, then split proxy and upstream consoles into mirrored panes. |
| `contract-reference` | `/app/integrations/downstream` keeps connection facts in a narrow reference column and examples/compatibility in the larger contract pane. |
| `system-topology` | `/app/system/runtime` layers lifecycle, controller posture, live version facts, and preserved host diagnostics without extra note-only panels. |
| `matrix-grid` | `/app/local/matrix` shows a dense status-first grid of concurrently loaded models with resource metrics and add/remove controls. |

## Live route layouts

These routes are no longer vague placeholder ideas. Their layout contracts are implemented and should remain the baseline for future refinement.

### `Studio > Images`

- Compact left request rail
- Dominant image stage
- Secondary raw response / generation detail panel
- One workspace with OpenAI-style and SDAPI generation modes

### `Studio > Audio`

- Compact left mode/form rail
- Dominant transcript or player stage
- Secondary request/result detail stack
- One workspace for voices, speech synthesis, and transcription

### `Studio > Rerank`

- Compact query/candidate form rail
- Dominant ordered result ledger
- Secondary JSON/request inspector

### `Studio > Advanced APIs`

- Compact endpoint-family selector
- Dominant response/result stage
- Secondary example/template panel
- Only advanced families with real vendor/runtime backing belong here

### `Integrations > Upstream`

- Narrow contract/reference column
- Larger model/upstream target inventory pane
- Raw passthrough links stay contextual rather than global shell chrome

### `Local > Models`

- Loaded model cards first: model ID, engine type, uptime, status
- Load/unload actions per card
- Global "Unload All" action
- Model selector + "Load" control
- **Per-model override panel** (collapsed by default): TTL, context window, concurrency limit
- Overrides visually distinct via subtle border or muted panel
- Empty state when no models are in memory

### `Local > Swap`

- Chronological event ledger
- Filter by model ID
- Event detail: timestamp, old model, new model, reason

### `Local > Policy`

- Policy form: TTL, auto-unload toggle
- Read-only fields: startPort, logLevel
- Current values summary

### `Local > Logs`

- Split proxy/upstream console panes
- Live stream from `/logs/stream` (SSE or polling)
- Historical buffer from `/logs`
- Source toggle, auto-scroll toggle, clear/filter controls
- Empty state when llama-swap is not running

### `Local > Matrix`

- Grid of loaded models (from `GET /running`)
- Each cell: model ID, engine, memory, uptime
- Status: healthy (stone), loading (accent muted), error (accent full)
- Add/remove model controls
- Empty state when no models loaded

### `Local > Peers`

- Peer inventory list
- Peer health and model availability
- Add peer form (URL, auth token)
- Remove peer control
- Empty state when no peers configured

### `System > Peers`

- Concise topology overview first
- Split between peer inventory and peer contract/policy detail
- Real empty state when peers are absent

## Vendor exposure plan

The vendored llama-swap audit changes how the placeholder pages should be interpreted.

### First-class role-model pages

These are first-class runtime pages because they are part of the main operator loop:

1. **Local runtime state**
   - models (loaded state, load/unload controls, per-model overrides)
   - swap history (event ledger)
   - policy (TTL, auto-unload, host controls)
   - logs (real-time streaming from `/logs/stream` and `/logs`)
   - matrix (concurrent loaded model grid)
   - peers (peer instance inventory and management)
2. **Studio multimodal workspaces**
   - images
   - audio
   - rerank
   - advanced API families
2. **Observe raw host ledgers** (activity and logs are already live; captures remain drill-ins)
   - activity
   - logs
   - captures and metrics as drill-in from activity/request detail
3. **System runtime policy** (version facts are already live in `System > Runtime`)
   - `/health`
   - `/api/version`
   - config-watch posture
   - global TTL
   - start port
   - capture and metrics buffers
   - API-key/auth posture
4. **Peers and upstream contract surfaces**
   - peer model sources
   - peer filters and timeouts
   - upstream passthrough expectations

### Fold into existing pages instead of creating vendor-clone routes

These belong inside existing role-model pages, not in a separate vendor-style settings screen:

- model-level `aliases`
- `useModelName`
- `checkEndpoint`
- `ttl`
- `concurrencyLimit`
- `sendLoadingState`
- per-model `timeouts`
- request `filters`
- `cmdStop` presence and command ownership
- arbitrary model `metadata`
- startup preload hooks
- matrix/eviction policy summaries

Placement rules:

- **Control > Runtime Config** owns editable local/remote runtime policy and model/provider metadata.
- **Control > Models** owns inspect-first model inventory and links back to editable surfaces.
- **Control > Models** and **Control > Controller** must render honest pre-activation empty states when the runtime has zero configured endpoints.
- **Control > Endpoints** owns endpoint/runtime readiness and bound execution surfaces.
- **System > Runtime** owns global host policy and matrix summary.
- **System > Peers** owns remote-peer config and upstream auth posture.

### Preserve as adjacent host tools

These remain linked as preserved host surfaces until a repo-owned page fully supersedes them:

- raw `/upstream/*` passthrough targets
- direct log and capture endpoints for copy/paste/debug workflows
- raw `/health` and similar host diagnostics when they belong to a route-local system view

During the conversion window, some placeholder routes may still expose a contextual `/ui` link. `/ui` is not part of the long-term runtime shell contract and must not return to global shell chrome.

## Component rules

### Shell and shared primitives

- `AppShell` owns the section rail, the quiet preserved-host-tools list, the shell-level metadata strip, and the section-local tab row.
- `PageHeader` begins with a short accent rule, keeps body copy near `60ch`, and reserves actions for page-local JSON/raw-host links.
- `SectionCard` is the default sectional frame: one divider, one heading block, then content.
- `FactCard` is the default live summary primitive for top-of-page fact strips; prefer 3-4 cards and emphasize only the primary one.
- `CodeBlock` is the canonical payload/log container for mono transport artifacts.
- Long ids, endpoint ids, and routes must wrap rather than overflow summary cards or metadata cells.
- Global browser chrome must opt into both schemes:
  - `<meta name="color-scheme" content="light dark">`
  - paired light/dark `theme-color` meta tags
  - `html { color-scheme: light dark; }`

### Temporary conversion scaffolds

- `FutureSurface` is the only allowed temporary scaffold while an `implementation target` route is still being converted.
- Every temporary scaffold must show:
  - a template-specific blueprint
  - a clear route-local conversion note block
  - any preserved raw-host doorway relevant to that surface
- Generic placeholder cards with no template reading order are not allowed.

### Cards and panels

- Use borders and spacing for separation.
- Prefer internal dividers over nested decorative containers.
- Use accent rules only when a section truly needs emphasis.

### Configured model cards

- Every configured model appears in one unified inventory surface regardless of whether it is local, remote, or peer-backed.
- The default representation for configured models is a **card**, not a plain table row.
- The model inventory uses a mobile-first responsive grid:
  - `grid-cols-1` on mobile
  - `md:grid-cols-2` on medium screens
  - `lg:grid-cols-3` when readable density holds
- Each model card must expose at least:
  - display name and model id
  - source classification
  - state / health
  - configured roles
  - capability summary
  - high-level metrics
  - endpoint binding or peer source
  - controller state when applicable
  - one inspect action
- The inspect action opens a shared **model inspection modal** and links back to `Control > Runtime Config` rather than pretending inline edits are persisted here.
- The modal sections are:
  1. overview
  2. roles
  3. capabilities
  4. metrics
  5. routing / identifiers
  6. tooling / MCP
  7. host policy

### Ledgers, logs, and captures

- Activity, requests, metrics, and tooling execution read as ledgers first, not dashboards first.
- Dense tables may scroll horizontally, but request id, status, model, and primary action remain readable without opening a modal.
- Capture drill-ins open in an adjacent inspector or modal with mono payload blocks and explicit transport metadata.
- Capture bodies are treated as transport payloads; decode base64 request/response bodies for readable inspection while keeping headers and path explicit.
- Log views prefer split proxy/upstream consoles with source toggles rather than stacked accordions.

### Buttons

- Rectilinear only
- Minimum height `44px`
- Primary: filled foreground or accent
- Secondary: outlined

### Inputs

- Transparent or light surface
- Explicit focus border or ring
- No rounded treatments

### Badges

- Rectilinear labels
- Uppercase tracked text
- Use stone + accent only; never introduce amber, emerald, rose, or another semantic hue for shared states

### Tables and payload blocks

- Always allow horizontal overflow
- Use mono for ids, paths, models, and JSON
- Use tabular numerals where numeric comparison matters

## Tooling and MCP integration

The run-13 tool/MCP baseline remains part of the runtime design contract rather than a parallel subsystem.

### Cross-surface rules

- Tooling state uses the same stone hierarchy, mono identifiers, uppercase labels, and sparse accent.
- Tooling must be visible at three levels:
  1. capability
  2. configuration
  3. execution

### Control surfaces

- **Models** show tool-calling and MCP posture in the same card/modal system as roles, capabilities, metrics, endpoint binding, and controller state.
- **Controller** candidate views show whether a candidate is healthy and tooling-capable enough for adjudication work.

### Studio and observation surfaces

- **Chat** renders assistant `tool_calls`, execution receipts, and diagnostics as structured secondary content.
- **Requests** and request detail expose persisted tool execution receipts beside captures and endpoint/profile data.
- **Activity** should surface when a captured request included tool execution and whether a capture bundle is available.

### Runtime and integration surfaces

- Runtime/system pages acknowledge:
  - MCP connector-definition support
  - runtime tool registry posture
  - `runtime:validate-tools`
- `System > Runtime` renders live `/api/version` facts in-page rather than relying on a raw-link-only affordance.
- Downstream/integration pages state when OpenAI-compatible consumers can expect `tool_calls` and what compatibility limits still apply.

## Rollout order

1. **Observe**
   - complete: native activity and logs pages now expose metrics, captures, preserved history, and split raw consoles
2. **Studio**
   - replace multimodal placeholders with images, audio, rerank, and advanced workspaces
3. **System**
   - expose runtime policy, peers, and config-watch posture from the vendored host, with version facts folded into Runtime
4. **Integrations**
   - finish upstream reference surfaces after the operator pages are concrete, with compatibility guidance folded into Downstream
