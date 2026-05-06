Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `07`
Inputs:
- user request to audit vendored llama-swap surfaces, propose a new frontend hierarchy first, and continue with the canonical page spec
- `role-model-router/vendor/llama-swap/proxy/proxymanager.go`
- `role-model-router/vendor/llama-swap/proxy/proxymanager_api.go`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Playground.svelte`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Activity.svelte`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Models.svelte`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/LogViewer.svelte`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `D:\DEV\role-model\.agents\skills\swiss-design\SKILL.md`
- `D:\DEV\role-model\.agents\skills\swiss-design\references\design-system.md`
- `D:\DEV\role-model\.agents\skills\swiss-design\references\components.md`
- `C:\Users\erikb\.agents\skills\ui-design-system\references\DESIGN_TOKENS.md`
- `C:\Users\erikb\.agents\skills\ui-design-system\references\RESPONSIVE_PATTERNS.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.runtime-ia-redesign.addendum-07.md`
Scope note: This addendum records the canonical information architecture, route tree, layout templates, data dependencies, and Swiss-style design contract for the next runtime frontend redesign slice. It does not implement the redesign; it defines the baseline the implementation must follow.

## Why This Addendum Exists

- The vendored `llama-swap` host already exposes a broader operator product than the current repo-owned runtime frontend, especially across multimodal playgrounds, activity telemetry, model lifecycle, logs, metrics, captures, and peer-backed model visibility.
- The current repo-owned runtime shell proves the runtime control-plane foundation, but its flat route hierarchy no longer matches the larger operator surface that run 14 now needs to expose.
- Before implementation, the runtime frontend needs one canonical design/system contract that combines:
  - the vendored-surface audit,
  - the current repo-owned runtime UI baseline,
  - the local Swiss-design skill rules,
  - and the repo `ui-design-system` guidance for structured tokens, templates, and responsive behavior.

## Design Contract

### Design-System Authorities

The redesign must follow these authorities in this order:

1. `D:\DEV\role-model\.agents\skills\swiss-design\SKILL.md`
2. `D:\DEV\role-model\.agents\skills\swiss-design\references\design-system.md`
3. `D:\DEV\role-model\.agents\skills\swiss-design\references\components.md`
4. `C:\Users\erikb\.agents\skills\ui-design-system\references\DESIGN_TOKENS.md`
5. `C:\Users\erikb\.agents\skills\ui-design-system\references\RESPONSIVE_PATTERNS.md`

### Mandatory Visual Rules

- **Grid first**: every page uses a mobile-first 12-column grid with 8px spacing units.
- **Rectilinear surfaces**: cards, inputs, badges, buttons, and shell containers remain `rounded-none` or at most `rounded-sm`.
- **Typography**: IBM Plex Sans for primary text, IBM Plex Mono for payloads and identifiers, light headings, uppercase tracked labels, tabular numerals for metric-heavy tables.
- **Palette**: stone-based neutrals with one accent only; hierarchy comes from opacity rather than extra hues.
- **Whitespace**: generous section spacing; overview and integration pages should feel deliberate rather than dashboard-cramped.
- **Narrow copy columns**: explanatory body text should stay near `max-w-[60ch]`.
- **Mobile first**: primary navigation collapses to a minimal section switcher; secondary page tabs become a horizontal scroller or stacked selector.

### Token Direction

The redesign should preserve the three-tier token model:

1. primitive tokens for stone/accent/spacing/type
2. semantic tokens for surface/text/border/interactive roles
3. component tokens for shell rails, registry tables, inspectors, workspace panes, and controls

The Swiss-style constraints override any previously softer runtime token choices.

### Interaction Rule for Model Management

- Every configured model must appear in one unified inventory surface, regardless of whether the model is local or remote.
- The default representation for configured models is a **card**, not a plain table row.
- Each model card must expose at least:
  - display name and model id
  - source classification (`local` or `remote`)
  - status / health
  - configured roles
  - capability summary
  - high-level metrics
  - bound endpoint or endpoint count
  - one settings action
- The settings action must open a shared **model settings modal** rather than route the operator to a different editing page.
- The modal must support the same information architecture for local and remote models, even if some controls are read-only or capability-limited for one source type.
- The modal should organize content into consistent sections:
  1. overview
  2. roles
  3. capabilities
  4. metrics
  5. routing / identifiers

## Information Architecture

### Primary Navigation

The flat current route list is replaced with six top-level operator sections:

1. `Overview`
2. `Studio`
3. `Control`
4. `Observe`
5. `Integrations`
6. `System`

### Secondary Navigation

Each primary section owns its own local page tabs:

| Section | Pages |
| --- | --- |
| `Overview` | `Summary` |
| `Studio` | `Chat`, `Images`, `Speech`, `Transcription`, `Rerank`, `Advanced APIs` |
| `Control` | `Providers`, `Accounts`, `Endpoints`, `Models` |
| `Observe` | `Activity`, `Requests`, `Logs`, `Metrics` |
| `Integrations` | `Downstream Provider`, `Upstream`, `Compatibility` |
| `System` | `Runtime`, `Peers`, `Version & Health` |

### Route Tree

```text
/app
/app/studio/chat
/app/studio/images
/app/studio/speech
/app/studio/transcription
/app/studio/rerank
/app/studio/advanced
/app/control/providers
/app/control/accounts
/app/control/endpoints
/app/control/models
/app/observe/activity
/app/observe/requests
/app/observe/requests/:requestId
/app/observe/logs
/app/observe/metrics
/app/integrations/downstream
/app/integrations/upstream
/app/integrations/compatibility
/app/system/runtime
/app/system/peers
/app/system/version
```

## Canonical Layout Templates

| Template | Purpose | Layout Contract |
| --- | --- | --- |
| `summary-board` | global overview | status strip, attention band, lower split summary zones |
| `studio-workspace` | protocol playgrounds | left settings rail, center composition/results workspace, right metadata/result inspector |
| `registry-detail` | control-plane pages | left registry/table, right detail/editor, optional lower diagnostics strip |
| `model-inventory` | model management | responsive card grid with modal-based detail/configuration for local and remote models |
| `ledger-inspector` | activity and request inspection | dense ledger/table with split detail pane or capture drawer |
| `dual-console` | log analysis | mode switch plus two resizable consoles on desktop, stacked consoles on narrow screens |
| `contract-reference` | integration pages | contract cards, example blocks, compatibility notes, operator guidance panel |
| `system-topology` | runtime/peer/version pages | status cards, topology tables, diagnostic panels, preserved host-surface links |

## Page-by-Page Specification

### Overview

#### `/app`

- Template: `summary-board`
- Responsibility:
  - runtime-wide status at a glance
  - degraded/offline attention items
  - quick-entry routes into Studio, Control, and Observe
- Must show:
  - lifecycle counts
  - inflight request summary
  - recent activity/request links
  - provider/account/endpoint rollups
- Must not become:
  - a duplicate of Observe tables
  - a catch-all card wall
- Data dependencies:
  - runtime summary
  - requests
  - providers
  - accounts
  - endpoints
  - models
- Endpoint contract:
  - `GET /api/role-model/runtime/summary`
  - `GET /api/role-model/providers`
  - `GET /api/role-model/accounts`
  - `GET /api/role-model/endpoints`
  - `GET /api/role-model/requests`
  - `GET /v1/models`
  - preferred future aggregation: `GET /api/role-model/ops/summary`

### Studio

#### `/app/studio/chat`

- Template: `studio-workspace`
- Source: current `/app/workbench`
- Responsibility:
  - routed chat inference playground
  - model selection and prompt composition
  - response display with endpoint/result metadata
- Endpoint contract:
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - optional context: `GET /api/role-model/endpoints`

#### `/app/studio/images`

- Template: `studio-workspace`
- Source: vendored playground image flows
- Responsibility:
  - OpenAI image generation and SDAPI image workflows in one workspace
  - mode switch between OpenAI-style and SDAPI-style requests
- Endpoint contract:
  - `GET /v1/models`
  - `POST /v1/images/generations`
  - `POST /v1/images/edits`
  - `POST /sdapi/v1/txt2img`
  - `POST /sdapi/v1/img2img`
  - `GET /sdapi/v1/loras`

#### `/app/studio/speech`

- Template: `studio-workspace`
- Source: vendored speech interface
- Responsibility:
  - text-to-speech request flow
  - voice selection and playable/downloadable result surface
- Endpoint contract:
  - `GET /v1/models`
  - `GET /v1/audio/voices`
  - `POST /v1/audio/speech`

#### `/app/studio/transcription`

- Template: `studio-workspace`
- Source: vendored audio interface
- Responsibility:
  - file upload for transcription
  - transcript output and raw response display
- Endpoint contract:
  - `GET /v1/models`
  - `POST /v1/audio/transcriptions`

#### `/app/studio/rerank`

- Template: `studio-workspace`
- Source: vendored rerank interface
- Responsibility:
  - submit query + candidate set
  - show ordered scores and raw rerank payload
- Endpoint contract:
  - `GET /v1/models`
  - `POST /rerank`
  - `POST /v1/rerank`

#### `/app/studio/advanced`

- Template: `studio-workspace`
- Responsibility:
  - structured workbench for protocol surfaces that do not deserve top-level nav slots
  - specifically: completions, responses, embeddings, Anthropic messages, infill, completion
- Endpoint contract:
  - `GET /v1/models`
  - `POST /v1/completions`
  - `POST /v1/responses`
  - `POST /v1/embeddings`
  - `POST /v1/messages`
  - `POST /infill`
  - `POST /completion`

### Control

#### `/app/control/providers`

- Template: `registry-detail`
- Source: current `/app/providers`
- Responsibility:
  - provider catalog and onboarding entry point
  - expose supported auth modes and supported capability families
- Must add capability labeling for:
  - chat
  - embeddings
  - rerank
  - image
  - speech
  - transcription
- Endpoint contract:
  - `GET /api/role-model/providers`
  - `GET /api/role-model/accounts`

#### `/app/control/accounts`

- Template: `registry-detail`
- Source: current `/app/accounts`
- Responsibility:
  - account identity/auth
  - device OAuth state
  - model allowlists
  - model-role bindings
  - health and status
- Internal visual subsections:
  1. account identity
  2. auth/credential path
  3. model access
  4. role assignment
  5. current state and OAuth session
- Endpoint contract:
  - `GET /api/role-model/providers`
  - `GET /api/role-model/accounts`
  - `POST /api/role-model/accounts`
  - `GET /api/role-model/roles`
  - `POST /api/role-model/accounts/device/start`
  - `POST /api/role-model/accounts/device/poll`
  - `GET /v1/models`

#### `/app/control/endpoints`

- Template: `registry-detail`
- Source: current `/app/endpoints`
- Responsibility:
  - endpoint activation
  - routing registry inspection
  - provider-account-to-endpoint relationship visibility
- Must show:
  - provider account
  - model
  - region
  - role bindings
  - health/status
- Endpoint contract:
  - `GET /api/role-model/accounts`
  - `GET /api/role-model/endpoints`
  - `POST /api/role-model/endpoints`
  - `GET /api/role-model/providers`

#### `/app/control/models`

- Template: `model-inventory`
- Source: vendored `Models.svelte` plus model lifecycle/admin APIs
- Responsibility:
  - first-class unified model-management surface
  - represent every configured model as a card
  - allow operators to inspect and configure both local and remote models in the same interface
- Inventory rules:
  - cards are the default visual unit
  - the page may support alternate density modes later, but card view is canonical
  - cards must include both local models and remote/provider-backed models in one collection
  - cards must visibly distinguish source type without splitting the experience into separate local and remote pages
- Every model card must show:
  - display name
  - model id
  - source badge: `local` or `remote`
  - lifecycle status
  - health state
  - configured roles
  - capability tags
  - high-level metrics summary
  - endpoint binding summary
  - settings button
- Settings modal requirements:
  - opens from the card without navigating away
  - same modal structure for local and remote models
  - must include:
    - roles configuration
    - capabilities view
    - high-level metrics
    - endpoint binding or endpoint summary
    - canonical identifiers (`model id`, source type, provider/account or local runtime source)
  - may expose source-specific controls, but the shell and information grouping stay shared
- Local/remote configuration stance:
  - local and remote models are configured in one interface
  - filtering by source is allowed
  - separate local-only and remote-only management pages are explicitly out of scope
- Supporting controls:
  - filter by source, capability, status, health, and role assignment
  - unload actions where supported
  - selected model logs or recent activity
- Endpoint contract:
  - preferred primary read: `GET /api/role-model/models`
  - supporting reads:
    - `GET /v1/models`
    - `GET /api/role-model/endpoints`
    - `GET /api/role-model/accounts`
    - `GET /api/events`
    - `GET /api/metrics`
    - `GET /running`
    - `GET /logs/stream/*logMonitorID`
  - source-specific actions where supported:
    - `POST /api/models/unload`
    - `POST /api/models/unload/*model`
  - preferred future modal writes:
    - `PATCH /api/role-model/models/:id`
    - `GET /api/role-model/models/:id/metrics`
    - `GET /api/role-model/models/:id/activity`

### Observe

#### `/app/observe/activity`

- Template: `ledger-inspector`
- Source: vendored `Activity.svelte`
- Responsibility:
  - real-time per-request activity and performance telemetry
  - capture access and column customization
- Canonical columns:
  - time
  - model
  - path
  - status
  - content type
  - cached tokens
  - prompt tokens
  - generated tokens
  - prompt speed
  - generation speed
  - duration
  - capture
- Endpoint contract:
  - `GET /api/metrics`
  - `GET /api/events`
  - `GET /api/captures/:id`
  - preferred future typed wrapper: `GET /api/role-model/activity`

#### `/app/observe/requests`

- Template: `ledger-inspector`
- Source: current `/app/requests`
- Responsibility:
  - structured request browser with richer filtering than the current bare ledger
- Filters should support:
  - model
  - endpoint
  - request path
  - status
  - capture presence
  - time range
- Endpoint contract:
  - `GET /api/role-model/requests`
  - optional correlation with `GET /api/metrics`

#### `/app/observe/requests/:requestId`

- Template: `ledger-inspector`
- Source: current `/app/requests/:requestId`
- Responsibility:
  - multi-pane request inspection
  - request artifact
  - endpoint profile
  - capture/response correlation where available
  - performance metadata
- Endpoint contract:
  - `GET /api/role-model/requests/:id`
  - `GET /api/role-model/endpoints/:id/profile`
  - optional `GET /api/captures/:id`

#### `/app/observe/logs`

- Template: `dual-console`
- Source: vendored `LogViewer.svelte`
- Responsibility:
  - proxy/upstream log streaming with a mode switch
  - support both merged and split reading modes
- Endpoint contract:
  - `GET /logs/stream`
  - `GET /logs/stream/proxy`
  - `GET /logs/stream/upstream`
  - `GET /logs/stream/*logMonitorID`

#### `/app/observe/metrics`

- Template: `ledger-inspector`
- Responsibility:
  - aggregate, not per-request, telemetry
  - histograms, percentiles, throughput summaries, and outlier zones
- Endpoint contract:
  - `GET /api/metrics`
  - `GET /api/events`
  - preferred future typed wrapper: `GET /api/role-model/metrics-summary`

### Integrations

#### `/app/integrations/downstream`

- Template: `contract-reference`
- Source: split from current `/app/runtime`
- Responsibility:
  - configure Role Model as an OpenAI-compatible downstream provider
  - preserve copyable contract rows and example requests
- Endpoint contract:
  - `GET /api/role-model/downstream/openai`
  - `GET /v1/models`

#### `/app/integrations/upstream`

- Template: `contract-reference`
- Responsibility:
  - explain vendored `/upstream/*` passthrough behavior
  - document auth, expected usage, and diagnostics value
- Endpoint contract:
  - primarily reference/documentation-backed
  - optional `GET /api/version`

#### `/app/integrations/compatibility`

- Template: `contract-reference`
- Responsibility:
  - capability matrix for all supported API families and aliases
  - document OpenAI, Anthropic, embeddings, rerank, image, speech, transcription, SDAPI, infill, and completion surfaces
- Endpoint contract:
  - `GET /api/role-model/providers`
  - `GET /v1/models`
  - static route inventory from vendored proxy registration

### System

#### `/app/system/runtime`

- Template: `system-topology`
- Source: split from current `/app/runtime`
- Responsibility:
  - runtime internals and host-boundary diagnostics
  - lifecycle state
  - inflight state
  - preserved host tools
- Endpoint contract:
  - `GET /api/role-model/runtime/summary`
  - `GET /api/events`
  - `GET /api/metrics`
  - `GET /health`

#### `/app/system/peers`

- Template: `system-topology`
- Responsibility:
  - peer-backed model visibility and federated topology
- Endpoint contract:
  - `GET /v1/models`
  - preferred future typed wrapper: `GET /api/role-model/peers`

#### `/app/system/version`

- Template: `system-topology`
- Responsibility:
  - version, build, and health diagnostics
- Endpoint contract:
  - `GET /api/version`
  - `GET /health`
  - optional `GET /wol-health`

## Merge / Split / Remove Decisions

- Current `/app/workbench` becomes `/app/studio/chat`.
- Current `/app/runtime` is split into:
  - `/app/integrations/downstream`
  - `/app/system/runtime`
- Current `/app/requests` stays, but moves under `Observe` and grows beyond raw request ids.
- Current `/app/requests/:requestId` stays, but becomes a richer inspector instead of a two-block raw JSON page.
- Current flat sidebar is removed in favor of:
  - a primary section rail
  - a local tab row per section
- Vendored `/ui` remains a preserved adjacent host tool, not a first-class route inside the repo-owned IA.
- Legacy `/v/*` compatibility aliases remain supported by the runtime, but they are not promoted to first-class UI pages.

## Data and Endpoint Strategy

### Rule

- `Studio` pages may talk directly to protocol endpoints.
- `Control`, `Observe`, `Integrations`, and `System` pages should prefer repo-owned typed surfaces, even when they are backed by vendored host APIs internally.

### New Typed Surface Backlog

The redesign should eventually normalize these vendored/operator surfaces behind repo-owned endpoints:

- `GET /api/role-model/ops/summary`
- `GET /api/role-model/activity`
- `GET /api/role-model/metrics-summary`
- `GET /api/role-model/models`
- `PATCH /api/role-model/models/:id`
- `GET /api/role-model/models/:id/metrics`
- `GET /api/role-model/models/:id/activity`
- `GET /api/role-model/peers`
- `GET /api/role-model/version`

That keeps the frontend from depending directly on a mixed surface of `/api`, `/logs`, `/running`, `/health`, and `/upstream`.

## Responsive Behavior

- Base/mobile:
  - primary navigation collapses to a section switcher
  - page tabs become horizontal scroll
  - split workspaces stack vertically
  - all dense tables must sit inside `overflow-x-auto`
- `md:`:
  - allow two-column registry/detail and workspace layouts
- `lg:`:
  - restore the full section rail and dominant desktop grid tension

## Implementation Guidance

Implementation should proceed in this order:

1. replace the flat app shell with the two-level section + tab hierarchy
2. move current workbench to `Studio > Chat`
3. split current runtime page into `Integrations > Downstream` and `System > Runtime`
4. add `Observe > Activity` and `Observe > Logs`
5. add `Control > Models`
6. add the multimodal `Studio` pages
7. add `Integrations > Compatibility`, `Integrations > Upstream`, `System > Peers`, and `System > Version`

## Acceptance Criteria for the Redesign Phase

- Every runtime frontend page belongs to one of the six canonical primary sections.
- No page mixes protocol playground responsibilities with observability or runtime/system diagnostics.
- The resulting design uses the local Swiss-design rules for typography, spacing, geometry, and color hierarchy.
- The resulting design uses the `ui-design-system` discipline for token layering and mobile-first templates.
- The new frontend hierarchy exposes the major vendored llama-swap operator surfaces without flattening them into one undifferentiated nav list.
