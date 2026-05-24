# Run 34 Planned Route Layouts

**Run:** `34-router-runtime-role-policy-and-ui-fixture-reduction`  
**Purpose:** Illustrate the planned layout for the retained runtime UI route families and their pages after the route-taxonomy correction.

## Scope

This document turns the route-taxonomy addendum into a page-layout blueprint. It keeps the required top-level route families:

1. Overview
2. Studio
3. Local
4. Remote
5. Models
6. Router
7. Endpoints
8. Observe
9. System

It also shows how current `Control` and `Integrations` pages are redistributed into the retained navigation.

## Global Shell

All retained pages should use one shared shell with a stable left nav, a route header, a primary working area, and a secondary inspector/readback rail.

```text
+--------------------------------------------------------------------------------------------------+
| App bar: route title | runtime health | environment badges | quick links | primary action        |
+-------------------------------+------------------------------------------------------------------+
| Left nav                       | Route header                                                     |
| - Overview                     | eyebrow | title | summary | active filters | page actions        |
| - Studio                       +--------------------------------------+---------------------------+
| - Local                        | Primary work area                    | Secondary inspector       |
| - Remote                       | forms / ledgers / tables / boards    | live readback / detail    |
| - Models                       |                                      | JSON / health / receipts  |
| - Router                       +--------------------------------------+---------------------------+
| - Endpoints                    | Optional lower rail: logs / traces / request receipts / empty    |
| - Observe                      | state guidance / validation status                              |
| - System                       +------------------------------------------------------------------+
+--------------------------------------------------------------------------------------------------+
```

## Shared Layout Rules

- **Design-system first:** every page uses an existing runtime template (`summary-board`, `studio-workspace`, `registry-detail`, `model-inventory`, `ledger-inspector`, `dual-console`, `contract-reference`, `matrix-grid`, `system-topology`).
- **Mobile first:** header stacks first, then primary/secondary columns collapse into one reading order.
- **Honest states:** no seeded placeholder models, endpoints, aliases, logs, or requests.
- **Operator split:** Local is **llama-swap-backed**; Remote is **LiteLLM-backed**.
- **Page structure:** each page should have:
  1. page header,
  2. current-state summary,
  3. primary editing or reading surface,
  4. secondary inspector or diagnostics rail,
  5. explicit empty/loading/error states.

## Route Remap

| Current route | Planned family | Planned page | Notes |
| --- | --- | --- | --- |
| `/app` | Overview | Summary | Existing dashboard becomes the Overview home |
| `/app/studio/chat` | Studio | Chat | Keep |
| `/app/studio/images` | Studio | Images | Keep |
| `/app/studio/audio` | Studio | Audio | Keep |
| `/app/studio/rerank` | Studio | Rerank | Keep |
| `/app/studio/advanced` | Studio | Advanced APIs | Keep |
| `/app/local/models` | Local | Models | Keep |
| `/app/local/swap` | Local | Swap history | Keep |
| `/app/local/policy` | Local | Policy | Keep |
| `/app/local/logs` | Local | Logs | Keep |
| `/app/local/matrix` | Local | Matrix | Keep |
| `/app/local/peers` | Local | Endpoints | Rename page within Local |
| `/app/control/providers` | Remote | Providers | Move from Control to Remote |
| `/app/control/models` | Models | Inventory | Move from Control to Models |
| `/app/control/roles` | Models | Roles and bindings | Move from Control to Models |
| `/app/control/routing-strategy` | Router | Strategy | Move from Control to Router |
| `/app/control/controller` | Router | Controller | Move from Control to Router |
| `/app/control/endpoints` | Endpoints | Registry | Move from Control to Endpoints |
| `/app/control/runtime-config` | System | Runtime config | Move from Control to System |
| `/app/router` | Router | Overview | Keep and rebuild |
| `/app/router/config` | Router | Config | Keep |
| `/app/router/candidates` | Router | Candidates | Keep |
| `/app/router/decisions` | Router | Decisions | Keep |
| `/app/router/decisions/:requestId` | Router | Decision detail | Keep |
| `/app/observe/activity` | Observe | Activity | Keep |
| `/app/observe/requests` | Observe | Requests | Keep |
| `/app/observe/requests/:requestId` | Observe | Request detail | Keep |
| `/app/observe/logs` | Observe | Logs | Keep and rebuild |
| `/app/integrations/downstream` | Endpoints | Downstream | Rename family from Integrations to Endpoints |
| `/app/integrations/upstream` | Endpoints | Upstream | Rename family from Integrations to Endpoints |
| `/app/system/runtime` | System | Runtime | Keep |
| `/app/system/peers` | System | Peers | Keep |

## 1. Overview

### Family intent

Operator landing surface for runtime health, readiness, recent change, and "where to go next."

### Page: Summary

- **Planned path:** `/app`
- **Template:** `summary-board`
- **Primary zones:**
  - KPI strip: local health, remote health, router posture, recent requests
  - readiness board: missing setup, degraded components, active controller, last validation
  - recent activity: latest requests, latest endpoint/model changes, latest routing decisions
  - action rail: "Add local model", "Connect remote provider", "Inspect router", "Open requests"
- **Required data contract:**
  - KPI strip must be computed from live telemetry summary data
  - endpoint comparison rows must show endpoint/model label, source class, status, request count, latency, tokens, cost, provider label, cache/reliability, and role summary when present
  - latest requests must show request id, endpoint id, source class, status, latency, token summary, provider family, finish reason, cache summary, and deep-link to request detail
  - dashboard must not show sample rows, seeded KPIs, or explanatory filler in place of real telemetry

```text
+----------------------------------------------------------------------------------------------+
| Overview header | runtime posture | primary actions                                          |
+---------------------------+---------------------------+--------------------------------------+
| KPI strip                 | readiness board           | recent changes                        |
+---------------------------+---------------------------+--------------------------------------+
| local vs remote summary   | router/controller status  | recent requests / decisions           |
+-------------------------------------------------------+--------------------------------------+
| recommended next steps / empty state guidance                                              |
+----------------------------------------------------------------------------------------------+
```

## 2. Studio

### Family intent

Execution surfaces for chat, images, audio, rerank, and advanced request families.

### Page set

#### Chat

- **Path:** `/app/studio/chat`
- **Template:** `studio-workspace`
- **Layout:** left request composer, center transcript/result stage, right execution receipts.

#### Images

- **Path:** `/app/studio/images`
- **Template:** `studio-workspace`
- **Layout:** left mode/form, center gallery or image stage, right generation diagnostics.

#### Audio

- **Path:** `/app/studio/audio`
- **Template:** `studio-workspace`
- **Layout:** left mode/input, center transcript/player/output, right request metadata.

#### Rerank

- **Path:** `/app/studio/rerank`
- **Template:** `studio-workspace`
- **Layout:** left query/candidate editor, center ranked results, right raw scoring payload.

#### Advanced APIs

- **Path:** `/app/studio/advanced`
- **Template:** `studio-workspace`
- **Layout:** left API selector and request form, center response body, right diagnostics and raw payload.

```text
+----------------------------------------------------------------------------------------------+
| Studio header | mode selector | model / endpoint / role targeting                            |
+---------------------------+--------------------------------------+--------------------------+
| Request form              | Result stage / transcript / output   | Metadata / receipts      |
+---------------------------+--------------------------------------+--------------------------+
| Optional lower rail: raw payload, tool calls, validation, diagnostics                        |
+----------------------------------------------------------------------------------------------+
```

## 3. Local

### Family intent

Local runtime setup and monitoring for **llama-swap-backed** endpoints and models.

### Page: Models

- **Path:** `/app/local/models`
- **Template:** `registry-detail`
- **Layout:** model loader/form, loaded-model cards, selected-model inspector, llama-swap state.

### Page: Endpoints

- **Path:** `/app/local/endpoints` (from current `local/peers`)
- **Template:** `registry-detail`
- **Layout:** local endpoint list, health/readiness, attached models, endpoint detail rail.

### Page: Swap history

- **Path:** `/app/local/swap`
- **Template:** `ledger-inspector`
- **Layout:** swap-event ledger left, selected event detail right.

### Page: Policy

- **Path:** `/app/local/policy`
- **Template:** `registry-detail`
- **Layout:** editable host policy form with applied snapshot and validation feedback.

### Page: Logs

- **Path:** `/app/local/logs`
- **Template:** `dual-console`
- **Layout:** local proxy log and llama-swap log in parallel consoles.

### Page: Matrix

- **Path:** `/app/local/matrix`
- **Template:** `matrix-grid`
- **Layout:** dense resource-first grid of loaded and available local models.

```text
+----------------------------------------------------------------------------------------------+
| Local header | llama-swap status | host health | add/load model                               |
+--------------------------------------+---------------------------+--------------------------+
| Primary local workflow               | Secondary inspector       |                          |
| models / endpoints / policy / logs   | selected model/endpoint   |                          |
+--------------------------------------+---------------------------+--------------------------+
| lower rail: health events / swap history / empty state guidance                              |
+----------------------------------------------------------------------------------------------+
```

## 4. Remote

### Family intent

Remote onboarding and management for **LiteLLM-backed** providers and remote model access.

Ownership rule:

- **LiteLLM provides functionality** on this page: provider onboarding, auth state, remote execution availability, and requestable model coverage
- **Models.dev provides additional metadata only**: enriched endpoint/model facts, labels, capability metadata, and advisory readback that supplement LiteLLM-backed rows without replacing live functional state

### Page: Providers

- **Planned path:** `/app/remote/providers`
- **Source:** current `control/providers`
- **Template:** `registry-detail`
- **Layout:**
  - provider selector and search
  - model availability and supported auth modes
  - credential/onboarding form
  - connection and readiness status rail
  - LiteLLM gateway/readback block
  - Models.dev metadata enrichment block for the selected provider/model rows

```text
+----------------------------------------------------------------------------------------------+
| Remote header | LiteLLM status | connected providers | primary action                           |
+---------------------------+--------------------------------------+--------------------------+
| Provider catalog          | Provider onboarding / auth           | Readback inspector       |
| search + provider cards   | model selection + credential form    | LiteLLM health / errors  |
+---------------------------+--------------------------------------+--------------------------+
| lower rail: Models.dev metadata enrichment, compatibility notes, unresolved setup, honest    |
| empty state                                                                                  |
+----------------------------------------------------------------------------------------------+
```

## 5. Models

### Family intent

Unified registry for configured models, their backing endpoints, capabilities, role bindings, and metadata-enriched readback.

### Page: Inventory

- **Planned path:** `/app/models`
- **Source:** current `control/models`
- **Template:** `model-inventory`
- **Layout:** inventory table/grid, filters for local vs remote, binding summaries, model detail inspector.
- **Metadata note:** this page can show Models.dev-enriched model/endpoint metadata for both local and remote rows, but execution and provider-control actions still live on Local or Remote.

### Page: Roles and bindings

- **Planned path:** `/app/models/roles`
- **Source:** current `control/roles`
- **Template:** `registry-detail`
- **Layout:** role catalog, task allowlist editor, selected role detail, model/endpoint assignment readback.

```text
+----------------------------------------------------------------------------------------------+
| Models header | filters | local/remote split | role posture                                     |
+--------------------------------------+---------------------------+--------------------------+
| model inventory / grouped rows       | selected model inspector  | role/binding inspector    |
+--------------------------------------+---------------------------+--------------------------+
| lower rail: assignment history / policy diagnostics / empty state                           |
+----------------------------------------------------------------------------------------------+
```

## 6. Router

### Family intent

Routing strategy, controller posture, candidate inventory, and explainable routing decisions.

Routing preservation rule:

- alias-based routing and routing-strategy behavior across mixed local and remote endpoints/models must remain behaviorally equivalent to the current runtime/router contract after the navigation/layout refactor
- router observability must stay explainable: alias resolution, candidate filtering/scoring, chosen target, and linked request inspection must remain visible

### Page: Overview

- **Path:** `/app/router`
- **Template:** `registry-detail`
- **Layout:** current routing posture, controller summary, recent decisions, quick links to config/candidates/decisions.

### Page: Strategy

- **Planned path:** `/app/router/strategy`
- **Source:** current `control/routing-strategy`
- **Template:** `registry-detail`
- **Layout:** strategy presets, execution mode, applied config, save/reset actions.

### Page: Controller

- **Planned path:** `/app/router/controller`
- **Source:** current `control/controller`
- **Template:** `registry-detail`
- **Layout:** controller selector, candidate controller list, applied controller summary.

### Page: Config

- **Path:** `/app/router/config`
- **Template:** `registry-detail`
- **Layout:** persisted config snapshot, provenance, policy-source readback, effective values.

### Page: Candidates

- **Path:** `/app/router/candidates`
- **Template:** `ledger-inspector`
- **Layout:** comparable candidate ledger, role coverage, health, performance signals, detail rail.

### Page: Decisions

- **Path:** `/app/router/decisions`
- **Template:** `ledger-inspector`
- **Layout:** recent decision ledger with route-to-detail affordance.

### Page: Decision detail

- **Path:** `/app/router/decisions/:requestId`
- **Template:** `ledger-inspector`
- **Layout:** chosen endpoint, candidate scoring, fallback chain, links to Observe request detail.
- **Required data contract:**
  - show request id, routing decision id, effective routing mode, alias resolution when present, chosen endpoint/model, source class, candidate comparison/scoring context, and drill-in to request detail

```text
+----------------------------------------------------------------------------------------------+
| Router header | strategy | controller | execution mode                                         |
+---------------------------+--------------------------------------+--------------------------+
| routing summary / config  | candidates / decisions ledger        | selected detail          |
+---------------------------+--------------------------------------+--------------------------+
| lower rail: policy-source, alias resolution, request trace links, empty-state explanation    |
+----------------------------------------------------------------------------------------------+
```

## 7. Endpoints

### Family intent

Endpoint inventory, readiness, alias consumption, downstream usage, and upstream passthrough boundaries.

Preservation note:

- this family must continue to expose alias and endpoint usage in a way that supports existing routing behavior across both local and remote candidates

### Page: Registry

- **Planned path:** `/app/endpoints`
- **Source:** current `control/endpoints`
- **Template:** `registry-detail`
- **Layout:** endpoint registry table, health badges, attached models, alias visibility, endpoint detail rail.
- **Required data contract:**
  - endpoint rows must show endpoint id, source class, health/readiness, attached model ids, alias visibility, and any live operational summary actually available from runtime state
  - no synthetic request traffic or fake health rows may be introduced

### Page: Downstream

- **Planned path:** `/app/endpoints/downstream`
- **Source:** current `integrations/downstream`
- **Template:** `contract-reference`
- **Layout:** downstream base URLs, auth contract, model discovery behavior, copy-ready snippets.

### Page: Upstream

- **Planned path:** `/app/endpoints/upstream`
- **Source:** current `integrations/upstream`
- **Template:** `contract-reference`
- **Layout:** upstream target inventory, passthrough boundaries, auth mode support, provider-specific caveats.

```text
+----------------------------------------------------------------------------------------------+
| Endpoints header | endpoint count | alias count | downstream compatibility                     |
+---------------------------+--------------------------------------+--------------------------+
| endpoint registry         | endpoint / alias / URL detail        | contract/reference rail   |
+---------------------------+--------------------------------------+--------------------------+
| lower rail: copy examples, readiness warnings, honest empty states                           |
+----------------------------------------------------------------------------------------------+
```

## 8. Observe

### Family intent

Operational telemetry, requests, traces, logs, and recent activity.

### Page: Activity

- **Path:** `/app/observe/activity`
- **Template:** `ledger-inspector`
- **Layout:** host activity ledger plus metric/capture detail.
- **Required data contract:**
  - event rows must show timestamp, source classification, event type/category, and expandable detail payload
  - preserved raw host activity must be labeled as such

### Page: Requests

- **Path:** `/app/observe/requests`
- **Template:** `ledger-inspector`
- **Layout:** request ledger with latency, tokens, source, endpoint, tools.
- **Required data contract:**
  - each row must show request id, endpoint id, routing decision id, source class, status, latency, token summary, cost when available, creation time, and request-detail link

### Page: Request detail

- **Path:** `/app/observe/requests/:requestId`
- **Template:** `ledger-inspector`
- **Layout:** telemetry facts, capture payloads, role policy, routing and tool receipts.
- **Required data contract:**
  - summary facts: request id, endpoint id, model id, provider family, source class, created time, latency/tokens/cost
  - routing diagnostics: mode, alias resolution when present, rewrite summary, difficulty/controller/hybrid details
  - execution telemetry: finish reason, stream support, cache state
  - captures: request/response capture and capture-policy receipt
  - tooling/diagnostics groups
  - trace-linked execution context directly or via explicit drill-in

### Page: Logs

- **Path:** `/app/observe/logs`
- **Template:** `dual-console`
- **Layout:** raw log streams with source toggles, filters, and explicit preserved-host context.
- **Required data contract:**
  - logs must show timestamp, source, severity/stream kind when available, raw line body, and request correlation when available
  - unavailable sources render truthful empty/unavailable states instead of example logs

## Observability Display Map

| Artifact | Capture requirement | Primary surface | Secondary surface |
| --- | --- | --- | --- |
| Structured telemetry summary | live summary window, local/remote split, health, request totals | Overview | System Runtime |
| Endpoint comparison rows | endpoint/model, source, status, request count, latency, tokens, cost, cache/reliability | Overview | Endpoints Registry |
| Recent request rows | request id, endpoint id, source, status, latency, tokens, finish reason, cache, detail link | Overview | Observe Requests |
| Request ledger rows | request id, routing decision id, endpoint id, source, status, latency, tokens, cost, created time | Observe Requests | Router Decisions |
| Request diagnostics bundle | routing diagnostics, execution telemetry, captures, tooling, diagnostic groups | Observe Request detail | Router Decision detail |
| Trace linkage | trace id, span/event linkage, request/routing decision linkage | Observe Request detail | Router Decision detail |
| Raw host activity | timestamp, source, event type/category, payload | Observe Activity | System Runtime |
| Raw logs | timestamp, source, severity/stream, raw body, request correlation when available | Observe Logs | Local Logs / System Runtime |
| Endpoint operational posture | health/readiness, aliases, attached models, live operational summary | Endpoints Registry | Overview |
| Runtime lifecycle / validation | version, validation posture, system state | System Runtime | Overview |

```text
+----------------------------------------------------------------------------------------------+
| Observe header | time range | filters | export / inspect                                      |
+---------------------------+--------------------------------------+--------------------------+
| activity / request ledger | request or event detail              | raw diagnostics / payload |
+---------------------------+--------------------------------------+--------------------------+
| lower rail: logs / traces / empty states                                                 |
+----------------------------------------------------------------------------------------------+
```

## 9. System

### Family intent

Runtime topology, process configuration, peer inventory, and system-level control-plane facts.

### Page: Runtime

- **Path:** `/app/system/runtime`
- **Template:** `system-topology`
- **Layout:** runtime lifecycle, versions, validation state, controller posture, core system links.

### Page: Runtime config

- **Planned path:** `/app/system/runtime-config`
- **Source:** current `control/runtime-config`
- **Template:** `system-topology`
- **Layout:** editable runtime config payload, applied snapshot, validation feedback, reload guidance.

### Page: Peers

- **Path:** `/app/system/peers`
- **Template:** `system-topology`
- **Layout:** peer inventory, timeouts/filters, auth posture, selected peer detail.

```text
+----------------------------------------------------------------------------------------------+
| System header | bridge health | version facts | validation                                    |
+---------------------------+--------------------------------------+--------------------------+
| runtime topology / config | peer inventory / system controls     | selected detail          |
+---------------------------+--------------------------------------+--------------------------+
| lower rail: lifecycle events, restart guidance, empty states                                |
+----------------------------------------------------------------------------------------------+
```

## Navigation Notes

- The current **Control** family disappears from the primary nav; its pages are absorbed into **Remote**, **Models**, **Router**, **Endpoints**, and **System**.
- The current **Integrations** family is renamed to **Endpoints**.
- The current **Local > Peers** page should be relabeled to **Local > Endpoints**.
- **Roles** remains a first-class page, but it lives under **Models** rather than becoming its own top-level family.
- Any compatibility redirects from old `control/*` or `integrations/*` URLs should be treated as migration helpers, not the final information architecture.

## Delivery Order

1. Update route metadata and the shared design system.
2. Move/rename route families in navigation.
3. Rebuild Router, Endpoints, Overview, Observe, and System landing pages.
4. Make the Local/Remote execution-stack split explicit in UI copy and readback.
5. Make the LiteLLM-functionality vs Models.dev-metadata split explicit on Remote and metadata surfaces.
6. Rehome Models and Roles pages under the final taxonomy.
7. Add and pass observability coverage for dashboard, requests, request detail, logs, and cross-page data consistency.
8. Add and pass the mixed local/remote alias-and-routing-strategy end-to-end routing parity test.
9. Verify all retained pages with honest empty/loading/error states.
