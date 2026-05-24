Run: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Addendum: `01`
Inputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/addenda/planned-route-layouts.md`
- runtime-ui route audit covering placeholder/stub-heavy surfaces performed during run-34 follow-up
- operator route-taxonomy correction requiring nine retained route families
Outputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/addenda/02-to-be-plan.route-taxonomy-and-endpoints-remediation.addendum-01.md`
Scope note: This addendum revises the frontend cleanup plan so run 34 preserves the required runtime route taxonomy, adopts `planned-route-layouts.md` as the page-layout blueprint, preserves current user-facing functionality during route re-homing, and removes stub-heavy behavior, scaffolds, placeholders, and fixture-backed layouts through design-system-first, strict-TDD implementation with end-to-end verification.

## TODO

- [x] Record the corrected required route taxonomy
- [x] Replace the earlier remove/merge proposal with a retain-and-rebuild plan for the required route families
- [x] Define the Integrations -> Endpoints rename and ownership split
- [x] Integrate the route-layout blueprint into the addendum as an authoritative planning input
- [x] Record the no-function-loss and no-scaffold rules for the route remap
- [x] Record design-system-first sequencing for the revised route work
- [x] Record strict TDD obligations for route taxonomy, navigation, rename, and stub-remediation work
- [x] Record browser and runtime end-to-end verification expectations for the retained routes
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Audit Baseline

- The runtime UI audit confirmed that the repo already has substantial live functionality, but several route families still contain placeholder-heavy landing pages, static guidance cards, or weak ownership boundaries that do not match the intended operator information architecture.
- The operator-corrected route taxonomy is authoritative for the next remediation pass. The runtime UI must retain these top-level route families:
  1. Overview
  2. Studio
  3. Local
  4. Remote
  5. Models
  6. Router
  7. Endpoints
  8. Observe
  9. System
- This means the cleanup plan must no longer treat Router, Observe, or System as removable route families. Instead, their weak pages must be rebuilt so the retained taxonomy is useful and backed by live runtime data.
- The previous `Integrations` label is no longer acceptable as the operator-facing route family name. That route family must become `Endpoints`, and the underlying pages must be adjusted to match endpoint/model/alias ownership rather than generic integration prose.
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/addenda/planned-route-layouts.md` now captures the proposed shell, route remap, and per-page layout zones for every retained route family. The remediation plan must treat that document as the concrete layout companion to this addendum rather than as an optional sketch.

## Layout Blueprint Integration

Authoritative companion artifact:

- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/addenda/planned-route-layouts.md`

Integration rule:

- this addendum owns the requirement and sequencing contract
- `planned-route-layouts.md` owns the route-by-route shell and page-layout blueprint
- implementation and later audited phases must read both together when changing runtime UI navigation, route ownership, page structure, or empty-state behavior

Blueprint obligations:

1. every retained route family and planned page in `planned-route-layouts.md` must map to live runtime functionality, preserved current functionality, or an honest empty/loading/error state
2. the layout blueprint must not be implemented as decorative scaffolding; each planned zone must either:
   - expose an existing live capability,
   - expose newly implemented live readback/control behavior,
   - or render an honest non-fake state when no data exists
3. route re-homing from current `Control` and `Integrations` surfaces must preserve user-visible capability rather than silently dropping it during navigation cleanup

## Function Preservation Rule

The route-taxonomy cleanup is a re-architecture of information layout, not a feature-reduction pass.

Non-negotiable rule:

- no currently working runtime UI capability may be removed unless the same capability is preserved in the final retained taxonomy with equal or better usability and explicit verification evidence

Required preservation outcomes:

1. **Studio**
   - keep the existing chat, images, audio, rerank, and advanced request workflows
2. **Local**
   - keep the existing llama-swap-backed local model, policy, logs, matrix, swap, and local-endpoint workflows
3. **Remote**
   - keep remote provider onboarding and remote-model access, re-homed under the LiteLLM-backed Remote family
4. **Models**
   - keep configured-model inventory and role-binding workflows
5. **Router**
   - keep routing strategy, controller, config, candidate, and decision inspection workflows
6. **Endpoints**
   - keep endpoint registry, downstream contract, and upstream passthrough/reference workflows while renaming the family from Integrations
7. **Observe**
   - keep activity, requests, request detail, and logs inspection workflows
8. **System**
   - keep runtime and peers/system-topology workflows

Forbidden implementation shortcuts:

- scaffold-only sections that exist to fill space
- static placeholder cards that restate navigation instead of exposing state or actions
- fake seed rows, fake telemetry, fake endpoint inventories, fake model inventories, or fixture-backed display content in production runtime UI code
- removing an existing functional workflow just because its old page was weakly designed

## Corrected Route Taxonomy

The retained route-family contract for the remediation pass is:

1. **Overview**
   - Keep as the operator landing surface.
   - Must summarize live runtime state honestly and avoid placeholder cards that only restate navigation.
2. **Studio**
   - Keep as the execution/workbench family.
   - Preserve its current role as the request authoring and execution surface.
3. **Local**
   - Keep as the place to add and manage local endpoints and local models.
   - Must remain the primary operator entrypoint for llama-swap-managed local execution.
4. **Remote**
   - Keep as the place to add and manage remote providers and remote models.
   - Must remain the primary operator entrypoint for LiteLLM-managed remote execution and separate remote onboarding/configuration from local-runtime concerns.
   - LiteLLM owns remote execution functionality, provider auth/onboarding, and requestable remote model availability; Models.dev may enrich the same remote rows with additional endpoint/model metadata but must not replace or obscure LiteLLM as the functional execution layer.
5. **Models**
   - Keep as the unified live model and endpoint configuration/readback surface.
   - Must show configured models/endpoints honestly and support real configuration/readback workflows rather than placeholder inventory.
   - May display Models.dev-enriched endpoint/model metadata for local and remote rows, but must not become the execution-control surface for remote provider behavior that belongs on Remote.
6. **Router**
   - Keep as the place to configure routing strategy and inspect router-owned behavior.
   - The top-level Router page must become a real router home instead of a static shell.
7. **Endpoints**
   - Replace the current `Integrations` route family.
   - Must own endpoint inventory/readiness, alias/downstream-consumer usage, and endpoint-facing setup/readback where operators need to see usable endpoint URLs, model ids, and alias behavior.
8. **Observe**
   - Keep as the diagnostics and history family.
   - Logs, traces, requests, and dashboard-style operational readback stay here, but must prefer live runtime evidence over placeholder explanatory panels.
9. **System**
   - Keep as the runtime/system administration family.
   - Runtime, peers, and adjacent system pages must expose real system diagnostics and controls rather than filler copy.

## Requirement Delta

### `R6` Frontend route and design-system contract

Current disposition: `partially complete`

Confirmed delta:

- run 34 already established the design-system-first rule, but the route audit and taxonomy correction show that the design system and navigation contract still need another explicit pass to reflect the required nine-route information architecture
- Router and Endpoints need clear shared ownership boundaries so router strategy, alias behavior, model bindings, and endpoint consumption guidance appear in the correct operator surface
- Local and Remote also need explicit execution-stack ownership in the UI contract so Local remains llama-swap-backed and Remote remains LiteLLM-backed
- Remote and Models also need explicit metadata-vs-functionality boundaries so LiteLLM remains the remote functional backend while Models.dev is used only for additional endpoint/model metadata enrichment

Required plan adjustment:

- update the existing design system and navigation metadata first so the retained route families, renamed Endpoints family, and required shared states are defined before page rewrites begin
- align those design-system changes with the shell, route remap, and per-page layout zones documented in `planned-route-layouts.md`

### `R7` Fixture-free, non-placeholder runtime UI

Current disposition: `partially complete`

Confirmed delta:

- touched pages already removed some fake runtime content, but several route-family landing pages and secondary surfaces still behave like placeholders because they provide static explanatory cards, low-value wrappers, or duplicated summary text instead of live runtime readback and actionable controls
- the cleanup now needs to target these stub patterns while preserving the required route families rather than deleting them wholesale

Required plan adjustment:

- replace static placeholder/handoff content with honest empty states, live readback, or actionable operator controls across the retained Overview, Router, Endpoints, Observe, and System families
- ensure the new layout zones introduced by `planned-route-layouts.md` are implemented without stubs, placeholders, scaffolds, or fixture-backed display data
- ensure any Models.dev-enriched metadata shown on Remote, Models, or Endpoints pages is additive readback only and never fake filler or a replacement for live LiteLLM/llama-swap/runtime state

### `R8` Strict TDD

Current disposition: `carry forward with expanded frontend scope`

Required plan adjustment:

- add failing coverage first for route-taxonomy metadata, Integrations -> Endpoints rename behavior, retained route-family navigation, real-vs-placeholder page states, and any backend APIs added to support the rebuilt pages
- add failing coverage first for Remote page ownership boundaries between LiteLLM functionality and Models.dev metadata enrichment

### `R9` Browser and runtime end-to-end proof

Current disposition: `carry forward with expanded operator-surface scope`

Required plan adjustment:

- end-to-end verification must now prove the retained route families are navigable, truthfully populated, and useful in the running runtime, including the renamed Endpoints surfaces and the rebuilt Router home
- end-to-end verification must explicitly prove that alias-based and routing-strategy-based routing across local and remote endpoints/models continues to work after the route remap, with Remote still backed functionally by LiteLLM

### `R1` - `R5`

Current disposition: `carry forward unchanged`

Carry-forward rule:

- this addendum does not reopen the completed runtime-owned role-policy and execution-enforcement backend work
- any backend changes from this addendum must stay narrowly scoped to supporting truthful route-family readback or control behavior for the retained runtime UI taxonomy

## Remediation Target

The next remediation pass must make the runtime UI acceptable under the corrected route taxonomy by:

1. preserving the nine required top-level route families
2. renaming `Integrations` to `Endpoints` and moving endpoint-facing ownership there
3. rebuilding weak route-family landing pages and stub-heavy subpages so they present live runtime information or real controls
4. removing frontend fixture and placeholder dependence from every touched route
5. making Local and Remote truthful operator homes for their respective execution stacks: llama-swap for Local and LiteLLM for Remote
6. preserving the existing routing contract so aliases and routing strategies continue to route across local and remote endpoints/models as before
7. preserving all current runtime UI functionality while re-homing pages into the final retained taxonomy
8. proving the result through strict RED -> GREEN implementation and browser/runtime end-to-end verification

## Routing Specification

This cleanup must preserve and make inspectable the repo-owned routing contract already frozen in `/docs/architecture/07-router-runtime-routing-strategy-lock.md`.

### Routing goals

1. exact-model requests keep working
2. alias-based requests can route across:
   - local-only pools
   - remote-only pools
   - mixed local-plus-remote pools
3. routing eligibility, role/capability checks, and endpoint readiness remain authoritative
4. responses and diagnostics expose the real chosen model/endpoint rather than rewriting the result back to the alias
5. UI and navigation changes do not alter the underlying routing semantics

### Routing inputs

The planned routing flow must read from these sources:

- request target:
  - exact model id
  - or alias id
- runtime config:
  - routing strategy / execution mode
  - controller settings
  - alias pool definitions
  - local llama-swap and remote LiteLLM runtime posture
- runtime candidate state:
  - endpoint health/readiness
  - configured models
  - local vs remote source class
  - current observed/telemetry data
- runtime policy state:
  - role/task policy
  - capability requirements
  - tool/output/safety policy where applicable
- additive metadata enrichment:
  - Models.dev endpoint/model metadata may inform operator readback and candidate metadata display
  - Models.dev must not replace live runtime-owned eligibility, health, or execution state

### Required routing flow

1. **Resolve request target**
   - if the request names an exact model id, keep exact-model compatibility and start from that target set
   - if the request names an alias id, expand it into the configured candidate model pool
2. **Build candidate set**
   - collect candidate endpoint/model rows across local and remote sources according to the alias pool or exact-model match
   - keep mixed local-plus-remote pools valid
3. **Apply hard eligibility filters**
   - endpoint health/readiness
   - execution-mode restrictions
   - role/task compatibility
   - capability and policy constraints
   - any alias-pool or request-level restrictions
4. **Apply routing strategy / mode**
   - use the persisted routing posture and request-time routing inputs
   - allow the current repo-owned strategy contract to score candidates using deterministic rules, observed data, controller guidance, difficulty logic, or hybrid arbitration as configured
5. **Choose execution target**
   - select the best eligible candidate
   - if no candidate remains, surface a truthful no-eligible-candidate outcome with inspectable reasons
6. **Execute through the correct backend**
   - local target -> llama-swap-backed execution path
   - remote target -> LiteLLM-backed execution path
7. **Persist truthful diagnostics**
   - requested alias or exact model
   - effective routing strategy / mode
   - evaluated candidates
   - selected endpoint/model
   - real source class (local or remote)
   - policy or readiness reasons that affected the outcome

### Non-negotiable routing rules

- alias routing remains additive; exact-model routing stays valid
- mixed local-plus-remote candidate pools remain supported
- Router and Endpoints surfaces must expose alias resolution and chosen-target truthfully
- Remote UI changes must not convert Models.dev metadata into a hidden execution dependency
- any UI remap is invalid if it regresses existing alias or routing-strategy behavior

## Routing Diagram

```text
+--------------------+
| Client request     |
| model = exact id   |
|   or alias id      |
+---------+----------+
          |
          v
+-------------------------------+
| Resolve request target        |
| - exact model stays exact     |
| - alias expands to pool       |
+---------------+---------------+
                |
                v
+-----------------------------------------------+
| Build candidate set                           |
| - local models/endpoints (llama-swap)         |
| - remote models/endpoints (LiteLLM)           |
| - mixed local+remote allowed                  |
| - Models.dev adds metadata only               |
+----------------------+------------------------+
                       |
                       v
+-----------------------------------------------+
| Hard eligibility filters                      |
| - health/readiness                            |
| - execution mode                              |
| - role/task compatibility                     |
| - capability/tool/policy constraints          |
+----------------------+------------------------+
                       |
                       v
+-----------------------------------------------+
| Strategy / mode evaluation                    |
| - deterministic baseline                      |
| - observed data                               |
| - difficulty logic                            |
| - controller guidance                         |
| - hybrid arbitration as configured            |
+----------------------+------------------------+
                       |
                       v
+-----------------------------------------------+
| Choose best eligible candidate                |
| or surface no-eligible-candidate reason       |
+----------------------+------------------------+
                       |
             +---------+---------+
             |                   |
             v                   v
+-----------------------+  +-----------------------+
| Execute local target  |  | Execute remote target |
| via llama-swap        |  | via LiteLLM           |
+-----------+-----------+  +-----------+-----------+
            \                         /
             \                       /
              v                     v
        +--------------------------------------+
        | Persist truthful diagnostics         |
        | alias/exact target -> candidates ->  |
        | chosen endpoint/model -> source      |
        | class -> policy/strategy reasons     |
        +------------------+-------------------+
                           |
                           v
                 +---------------------------+
                 | Router / Endpoints /      |
                 | Observe surfaces show     |
                 | real chosen outcome       |
                 +---------------------------+
```

## Observability Specification

This cleanup must preserve and clarify how logs, traces, telemetry, diagnostics, and captures are collected and displayed. The plan must stay aligned with the repo-owned trace contract in `/docs/protocol/traces.md` and the runtime observation bundle/diagnostics model used by `packages/runtime-observability`.

### Observability artifact classes

1. **Logs**
   - raw line-oriented operational output from runtime processes and preserved host surfaces
   - examples:
     - role-model bridge/runtime host output
     - local llama-swap process output
     - remote/LiteLLM-related runtime output or proxy output where preserved by the runtime
     - system/process-supervisor lifecycle output where surfaced by the runtime
2. **Traces**
   - structured request-linked span/event artifacts describing routing and execution progression
   - must use the trace-linkage vocabulary from `/docs/protocol/traces.md`
3. **Telemetry / observation bundles**
   - structured request, usage, routing diagnostics, endpoint profile, tooling, and capture-policy artifacts
   - these are the canonical source for dashboard, requests, and request-detail surfaces
4. **Diagnostics**
   - structured routing, execution, auth/account, memory-quality, tooling, and operator diagnostics
   - these must stay machine-readable and operator-visible

### Capture requirements

#### Logs

Every log entry displayed in runtime UI operator surfaces must carry, at minimum, whichever of the following fields are available from the source:

- timestamp
- source class:
  - bridge
  - local / llama-swap
  - remote / LiteLLM / upstream proxy
  - system / supervisor
- severity or stream kind when available
- message body
- correlated `request_id` when the log line is request-specific

Log capture rules:

- logs are preserved as raw operational output, not rewritten into fake summaries
- log pages may filter, group, or label by source, but must not invent synthetic entries
- when a log source is unavailable, the UI must show a truthful unavailable/empty state instead of seeded example lines

#### Traces

Every trace surfaced in operator pages must preserve the baseline linkage contract:

- spans:
  - `trace_id`
  - `span_id`
  - `request_id`
  - `routing_decision_id`
  - `span_type`
  - `started_at_ms`
  - `ended_at_ms`
  - `status`
- events:
  - `event_id`
  - `trace_id`
  - optional `span_id`
  - `request_id`
  - `routing_decision_id`
  - `timestamp_ms`
  - `event_type`
  - `payload`

Trace coverage must include, where applicable:

- eligibility and scoring evaluation
- endpoint selection
- load / queue / prefill / decode stages if surfaced by the execution path
- tool execution
- fallback / retry / failure paths

#### Telemetry and diagnostics

Every structured request observation used by dashboard, requests, request detail, router decision detail, or endpoint/operator readback must preserve:

- request id
- routing decision id
- endpoint id
- local vs remote source class
- chosen model id
- provider family when known
- finish reason / status
- latency and token usage where available
- routing diagnostics:
  - alias resolution
  - routing mode / strategy
  - difficulty/controller/hybrid details when active
  - rewrite details when applied
- diagnostic buckets:
  - routing
  - execution
  - auth account
  - memory quality
  - tooling
  - operator
- capture-policy receipt and redaction/suppression outcomes when raw captures are constrained

### Display requirements by surface

#### Overview dashboard (`/app`)

The dashboard must be driven by the canonical telemetry stream and show:

1. **KPI strip**
   - total requests in current summary window
   - local vs remote request distribution
   - healthy/degraded endpoint posture
   - current router/controller posture
2. **Endpoint comparison board**
   - endpoint/model label
   - source class (local or remote)
   - health/status
   - request count
   - latency
   - token usage
   - cost
   - provider label
   - cache/reliability summary
   - role summary when available
3. **Latest requests**
   - newest request rows with:
     - request id
     - endpoint id
     - source class
     - status
     - latency
     - token summary
     - provider family
     - finish reason
     - cache summary
     - deep link to request detail
4. **Readiness / next-step guidance**
   - only truthful current setup gaps or degraded-state guidance
   - no placeholder guidance cards that exist just to fill space

#### Observe > Activity (`/app/observe/activity`)

This page must remain the raw host activity ledger and show:

- host activity/event rows in reverse-chronological order
- source classification
- event category/type
- event timestamp
- expandable raw payload or detail view
- clear links out to related request detail or endpoint detail when correlation exists

#### Observe > Requests (`/app/observe/requests`)

This page must remain the structured telemetry ledger and show, per row:

- request id
- endpoint id
- routing decision id
- source class
- status
- latency
- token usage
- cost when available
- creation time
- link to request detail

It must not collapse into generic activity prose or raw logs.

#### Observe > Request detail (`/app/observe/requests/:requestId`)

This page must be the canonical deep inspector and show:

1. **Summary facts**
   - request id
   - endpoint id
   - model id
   - provider family
   - source class
   - created time
   - latency / token / cost summaries
2. **Routing diagnostics**
   - routing mode/effective mode
   - alias resolution when present
   - rewrite summary when present
   - difficulty/controller/hybrid details when active
   - rubric signals when present
3. **Execution telemetry**
   - finish reason
   - stream support / delta counts
   - prompt cache support/requested/used summary
4. **Captures and inspection**
   - request capture
   - response capture
   - capture-policy receipt including redaction/suppression state
5. **Tooling and diagnostics**
   - tool calls
   - tool executions
   - diagnostic groups
6. **Trace-linked context**
   - trace and request-linked execution context must be inspectable either directly on this page or by explicit linked drill-in

#### Observe > Logs (`/app/observe/logs`)

This page must show raw logs with:

- source toggle or filter
- timestamp visibility
- raw line display without fake summarization
- truthful empty/unavailable states per source
- explicit indication when a log source is preserved-host output rather than canonical structured telemetry

#### Router surfaces

Router pages must expose observability relevant to routing:

- current routing posture on Router overview
- candidate comparison and eligibility/scoring evidence on Candidates/Decision detail
- alias resolution and selected target truth
- direct links to request detail and trace-linked observability where the request can be inspected end to end

#### Endpoints surfaces

Endpoints pages must expose endpoint-facing observability:

- endpoint health/readiness
- alias visibility
- endpoint/model linkage
- last-known request or operational posture summaries where available
- truthful downstream/upstream contract information without inventing synthetic endpoint traffic

#### System surfaces

System pages must expose runtime/system observability:

- runtime lifecycle and validation posture
- version facts
- runtime config/application state
- peer inventory/system topology
- system-level degraded or missing-state signals

### Verifiable acceptance criteria

The observability part of this cleanup is only complete when all of the following are true:

1. the dashboard is driven by live telemetry data and shows no placeholder or fixture-backed observability rows
2. Observe > Requests rows deep-link to Request detail and the linked detail exposes structured routing and execution diagnostics
3. Observe > Logs shows only real captured/preserved log sources or truthful empty/unavailable states
4. request detail preserves trace-linked routing/execution context and capture-policy visibility
5. Router decision surfaces and Observe request detail agree on request id, routing decision id, chosen endpoint/model, and effective routing mode
6. Endpoints and Overview surfaces show consistent endpoint health/readiness posture for the same runtime state
7. a mixed local/remote alias-routing end-to-end run produces inspectable dashboard, router, request-detail, and endpoint-facing artifacts without synthetic filler
8. automated coverage asserts the presence of the required fields and page-to-page drill-in paths for the touched observability surfaces

### Required test coverage

The remediation plan must add failing coverage first for:

- dashboard telemetry cards and latest-request rows using live-shaped structured data
- observe requests ledger fields and drill-in links
- request-detail display of routing diagnostics, execution telemetry, capture policy, and diagnostic groups
- observe logs source filtering and honest empty/unavailable states
- router decision-to-request-detail observability continuity
- overview/dashboard and endpoints health/readiness consistency for the same runtime state
- mixed local/remote end-to-end routing parity with corresponding dashboard/request/router observability proof

## Execution Discipline

- TDD Mode: `strict`
- Non-negotiable frontend sequencing rule:
  1. add failing design-system/navigation coverage first
  2. update the design system and route metadata for the retained taxonomy
  3. add failing page-level coverage for each remediation slice
  4. implement the minimum route/backend changes to turn the slice green
  5. rerun focused validation and the required browser/runtime check before moving on
- Design-system-first rule:
  - no retained-route rewrite lands before the shared navigation, route metadata, layout expectations, and reusable state primitives are updated in the design system
- Layout-blueprint rule:
  - `planned-route-layouts.md` is the required per-page structure reference for this cleanup; page rewrites must follow its shell, route remap, and page-zone intent unless a later addendum supersedes it
- Honest-state rule:
  - when live data is unavailable, every touched page must show a truthful empty/loading/unavailable/setup-needed state rather than seeded fake content
- No-loss rule:
  - route moves, renames, and consolidations must preserve currently working user-facing capabilities and keep them reachable in the final retained taxonomy
- Routing-parity rule:
  - route-family cleanup must not regress alias-based routing, routing-strategy behavior, or mixed local-plus-remote candidate selection that already works in the runtime/router contract
- No-scaffold rule:
  - the final layouts must not include scaffold-only panels, stub content, placeholder cards, or fixture-fed visual filler
- Rename discipline:
  - `Integrations` -> `Endpoints` must be handled as an intentional route-family rename with updated navigation labels, page titles, tests, and compatibility handling for old paths if any existing links/bookmarks still target the old URLs

## Remediation Slices

1. **SP7. Design-system and route-taxonomy delta**
   - Add RED coverage first for:
      - the required top-level route families
      - the `Endpoints` label replacing `Integrations`
      - route metadata and navigation descriptions for Overview, Local, Remote, Models, Router, Endpoints, Observe, and System
      - the routing specification and diagram remaining reflected in Router/Endpoints operator readback
      - the route remap and page-layout contract represented in `planned-route-layouts.md`
      - reusable honest-state and operator-summary primitives needed by the rebuilt landing pages
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
     - `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
     - `role-model-router/apps/runtime-ui/app/routes.ts`
   - Goal:
     - the shared shell explicitly encodes the corrected route taxonomy before feature-page implementation continues

2. **SP8. Router route-family rebuild**
   - Add RED coverage first for:
      - a real Router landing page that exposes routing strategy/configuration/readback instead of placeholder guidance
      - correct separation between router strategy/alias ownership and model-role metadata
      - preservation of existing routing strategy, controller, config, candidate, and decision workflows after route re-homing
      - preservation of the routing flow stages defined in `## Routing Specification`
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/routes/router.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/router-config.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
     - backend/router readback surfaces only if live router data is still missing for the retained Router home
   - Goal:
     - Router becomes the usable home for routing strategy, router state, alias posture, and router diagnostics

3. **SP9. Local, Remote, and Models ownership cleanup**
   - Add RED coverage first for:
      - Local owning llama-swap-backed local endpoint/model setup and readback
      - Remote owning LiteLLM-backed remote provider/model setup and readback
      - Remote showing Models.dev endpoint/model metadata only as additive enrichment beside live LiteLLM-backed functionality
      - Models showing truthful configured-model and endpoint inventory without placeholder records
      - preservation of current provider onboarding, model inventory, and role-binding workflows under the new taxonomy
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/routes/local.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
     - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
   - Goal:
      - Local, Remote, and Models each own a clear live workflow instead of overlapping or placeholder-heavy summaries, with the execution-stack split and Models.dev metadata-enrichment boundary made explicit and visible to operators

4. **SP10. Integrations -> Endpoints rename and rebuild**
   - Add RED coverage first for:
      - navigation/title rename from `Integrations` to `Endpoints`
      - endpoint inventory/readiness and alias/downstream consumer readback under the new route family
      - truthful empty states for no endpoints / no aliases / no configured downstream usage
      - preservation of current downstream and upstream functionality after the route-family rename
      - alias visibility and chosen-target readback staying consistent with the routing specification
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/routes/integrations.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx`
     - route registration/navigation files
     - compatibility redirects or route aliases if the runtime shell currently exposes stable `/app/integrations*` URLs
   - Goal:
     - Endpoints becomes the operator-facing surface for endpoints, models on endpoints, routing aliases as consumed endpoints, and usable downstream setup/readback

5. **SP11. Overview, Observe, and System truthfulness pass**
   - Add RED coverage first for:
       - Overview rendering live summary/readiness states instead of navigation filler
       - dashboard observability cards and recent-request rows remaining canonical and live-backed
       - Observe pages using live dashboard/log/request/trace data with honest empty states
       - logs, traces, and request diagnostics being captured and displayed according to `## Observability Specification`
       - System pages exposing real runtime/system diagnostics instead of static prose
       - preservation of current activity, request-detail, runtime, and peers/system workflows under the rebuilt layout
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/routes/index.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/observe-*.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/system-*.tsx`
     - backend readback APIs only where a retained page lacks the live data needed to replace a placeholder shell
   - Goal:
     - the retained Overview, Observe, and System families remain in place but stop behaving like stub dashboards or documentation wrappers

6. **SP12. Final fixture sweep and end-to-end acceptance**
   - Add RED coverage first for:
       - touched routes no longer rendering frontend fixture corpora or fake runtime rows
       - renamed Endpoints navigation and retained route-family smoke navigation
       - alias-based and routing-strategy-based routing across mixed local and remote endpoints/models remaining functional after the route remap
       - the routing flow from target resolution through diagnostics remaining observable end to end
       - observability artifacts remaining internally consistent across Overview, Router, Observe, Endpoints, and System
    - Verification targets:
      - targeted `runtime-ui` tests
      - targeted `runtime-host-bridge` tests if backend readback APIs changed
      - targeted end-to-end routing parity test covering alias + routing strategy + mixed local/remote candidates
      - browser/runtime validation against the running runtime and packaged UI path when the changed surfaces are included there
    - Goal:
      - every touched retained route family is live, truthful, and navigable without fixture-backed dressing, and the pre-existing mixed local/remote routing contract still works end to end

## Validation Plan

- Focused RED/GREEN commands expected during remediation:
  - targeted `@role-model-router/runtime-ui` tests for route metadata, renamed Endpoints navigation, route-remap/layout conformance, and rebuilt route-family pages
  - targeted `@role-model-router/runtime-host-bridge` tests only when new live readback/control APIs are added for Router, Endpoints, Observe, or System pages
  - targeted tests that assert the routing specification stages remain visible in Router/Endpoints/Observe readback
  - targeted tests that assert logs, traces, and dashboard/request observability fields match `## Observability Specification`
  - targeted end-to-end routing parity test for alias + routing strategy across mixed local and remote endpoints/models
- Broader verification commands after green:
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test` when backend support changes
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build` when backend support changes
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge validate-packaging` if the retained route-family changes are expected to ship in the packaged runtime

## Browser And Runtime End-to-End Plan

The remediation pass must prove the retained route taxonomy in the running app, not only through component tests.

Required checks after the relevant slices land:

1. launch the runtime UI against the running runtime
2. navigate the retained route families:
   - Overview
   - Studio
   - Local
   - Remote
   - Models
   - Router
   - Endpoints
   - Observe
   - System
3. confirm `Endpoints` appears in navigation and operator-facing titles instead of `Integrations`
4. confirm Router exposes real strategy/configuration/readback content
5. confirm Local and Remote expose distinct onboarding/configuration ownership, with Local backed by llama-swap and Remote backed by LiteLLM
6. confirm Remote uses LiteLLM for live provider/model functionality while any Models.dev data appears only as additive metadata enrichment
7. execute a specific end-to-end routing parity test:
   - configure or reuse a routing alias that can resolve across both local and remote candidates
   - exercise at least one persisted routing strategy
   - verify the request flows through the routing stages defined in `## Routing Specification`
   - issue requests that prove candidate selection and routing still work across mixed local and remote endpoints/models
   - verify router surfaces and request diagnostics show the chosen alias/strategy outcome truthfully
8. confirm Models shows truthful configured model/endpoint state
9. confirm Overview dashboard cards, latest-request rows, and endpoint comparison rows are driven by live telemetry data
10. confirm Observe > Requests, Request detail, and Logs satisfy the field/display contract in `## Observability Specification`
11. confirm Router, Observe, Endpoints, and System surfaces agree on the same request/endpoint/routing facts where they overlap
12. confirm Overview, Observe, and System show live data or honest empty states rather than placeholder prose
13. confirm all currently working user-facing capabilities remain reachable somewhere in the final retained taxonomy after the route remap
14. confirm a clean or sparse runtime does not display seeded fake models, endpoints, requests, aliases, or diagnostic rows
15. confirm no retained page ships scaffold-only sections, stub content, or placeholder filler

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 34 should treat this file as an authoritative planning delta together with:

- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/addenda/planned-route-layouts.md`

This addendum narrows the frontend cleanup around the corrected retained route taxonomy. It does not widen the run into a new backend feature area.

## Coverage Gate

Coverage: PASS

- [x] corrected route taxonomy recorded
- [x] retained-route-family ownership recorded
- [x] route-layout blueprint integrated as an authoritative planning input
- [x] Integrations -> Endpoints rename plan recorded
- [x] no-function-loss and no-scaffold rules recorded
- [x] strict TDD and browser/runtime verification obligations recorded

## Approval Gate

Approval: PASS

- [x] plan stays within run-34 frontend realism and design-system scope
- [x] plan reflects the operator-corrected route taxonomy instead of the earlier remove/merge proposal
- [x] plan now incorporates the concrete route-layout blueprint and preserves current functionality through the remap
- [x] plan preserves strict TDD and end-to-end verification requirements
