Run: `/.recursive/run/35-runtime-ui-connect-declutter/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-08T10:43:49Z`
LockHash: `49201821bf86a01ec36c6a171cbf001b8b700f52bba888bf1edd7b1afdca074e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/32-router-runtime-routing-operator-surface/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/routes/legacy-redirect.tsx`
- Chat-approved UI de-clutter and Connect naming proposal (2026-06-08)
Outputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
Scope note: This run reduces runtime UI clutter, resolves the consumer-facing naming collision between Local inference endpoints and router-as-provider surfaces, and preserves the three configuration pillars Local (device inference), Remote (cloud providers), and Connect (applications using role-model as a provider). All frontend work follows the design-system-first rule below.

## TODO

- [x] Consolidate chat-approved scope into stable requirement identifiers
- [x] Define observable acceptance criteria per requirement
- [x] Record fixed domain decisions (Local Endpoints naming, Connect section)
- [x] Record design-system-first implementation rule
- [x] Reconcile requirements with codebase conflicts (R4/R9/tests)
- [x] Record out-of-scope boundaries and constraints
- [x] Separate in-scope product delivery phases from recursive workflow phases
- [x] Add Source Requirement Inventory for audit-v2
- [x] User approval of this requirements artifact
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| Chat (2026-06-08) | Connect rename; keep Local → Endpoints; de-clutter proposal; pillar model (Local / Remote / Connect) |
| `/.recursive/run/14-router-runtime-ui-foundation/` | Runtime UI app structure, design-system ownership, route taxonomy baseline |
| `/.recursive/run/32-router-runtime-routing-operator-surface/` | Router operator surfaces, strategy/workbench integration |
| `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/` | Design-system-first rule precedent, slim route metadata, no fixture UI |
| `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | Canonical navigation, templates, shell contract |
| `/role-model-router/apps/runtime-ui/app/lib/design-system.ts` | `RuntimeRouteDefinition`, `runtimeNavigationSections`, path resolution |
| `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | Regression guards (alias ownership, router config observational split) |
| Codebase AS-IS (pre-run) | Duplicate KPI strips, meta panels, `/app/endpoints` vs Local Endpoints naming collision, unused `future-surface.tsx` |

## Design-System-First Rule

**Non-negotiable implementation order for every product sub-phase:**

1. **`DESIGN_SYSTEM.md`** — update navigation, pillar semantics, copy budgets, template notes, and any new primitives *first*
2. **`design-system.ts`** — update route definitions, section map, path helpers, and tokens *second*
3. **`design-system.test.ts`** — update or add regression guards to encode the new contract *third*
4. **Shared primitives** (`page-primitives.tsx`, `app-shell.tsx`, new `DisclosureSection` if required) — *fourth*
5. **Route implementations** — change route files only after steps 1–4 are in place for that sub-phase

Phase 2 plan must schedule work in that order. Phase 3 implementation must not land route-only changes ahead of the matching design-system doc and test updates for the same sub-phase.

## Fixed Domain Decisions

These are non-negotiable product semantics for this run:

1. **Local** configures inference on the user's local device(s). The page at `/app/local/endpoints` remains labeled **Endpoints** (not Peers).
2. **Remote** configures cloud inference providers and remains a separate nav section.
3. **Connect** (renamed from the former top-level **Endpoints** section) is where operators learn how other applications use role-model as an inference provider, including exposed endpoint/model registry and downstream/upstream contracts.
4. Local, Remote, and Connect must remain separate nav sections. This run must not merge them.

## In-Scope Product Delivery Phases

Each product phase follows the design-system-first rule before route edits.

### Product Phase 1 — Connect rename and URL migration

Update `DESIGN_SYSTEM.md` + `design-system.ts` + tests, then `routes.ts`, `legacy-redirect.tsx`, and canonical in-app links.

### Product Phase 2 — Copy diet and shell quieting

Update design-system copy budgets and primitive contracts, then shell and route prose removals.

### Product Phase 3 — In-pillar page consolidation

Update design-system nav/route contracts for Matrix merge and Router merge, then route implementations and link normalization.

### Product Phase 4 — Progressive disclosure (bounded)

Document `DisclosureSection` in design system, add primitive, then update request detail and model inspect modal.

## Requirements

### `R0` Enforce design-system-first delivery order

Description:
Frontend changes must not precede their design-system contract. The design system is the authoritative specification; routes implement it.

Acceptance criteria:
- Phase 2 `02-to-be-plan.md` lists, for each sub-phase, explicit file order: `DESIGN_SYSTEM.md` → `design-system.ts` → `design-system.test.ts` → primitives/shell → routes
- Phase 3 evidence shows design-system and test updates landed in the same sub-phase before dependent route edits (or in the same commit series with design-system files first)
- No route file changes Connect paths, nav labels, copy budgets, or disclosure behavior without matching `DESIGN_SYSTEM.md` and `design-system.ts` updates in that sub-phase
- Phase 3.5 review explicitly checks design-system-first ordering per sub-phase

### `R1` Rename router-as-provider nav section to Connect

Description:
The former top-level **Endpoints** nav section becomes **Connect**. Metadata must avoid reusing the bare label **Endpoints** for Connect tabs so Local → Endpoints stays unambiguous.

Acceptance criteria:
- `runtimeNavigationSections` contains a section titled `Connect`, not `Endpoints`
- All routes formerly under section `Endpoints` declare `section: "Connect"`
- Connect section tab labels are:
  - `/app/connect` → **Registry** (not "Endpoints")
  - `/app/connect/downstream` → **Downstream**
  - `/app/connect/upstream` → **Upstream**
- Connect registry route metadata uses consumer-facing title **Available models & endpoints** (or equivalent documented in `DESIGN_SYSTEM.md`) and a one-sentence description about client applications calling role-model
- Shell header eyebrow shows `Connect` on `/app/connect`, `/app/connect/downstream`, and `/app/connect/upstream`
- `DESIGN_SYSTEM.md` navigation table documents Connect, the pillar model (Local / Remote / Connect), and route family `/app/connect*`
- `design-system.test.ts` section inventory expects `Connect` with canonical paths `/app/connect`, `/app/connect/downstream`, `/app/connect/upstream`

### `R2` Migrate public Connect routes with legacy redirects and path resolution

Description:
Public URLs for the router-as-provider surface move under `/app/connect/*`. Legacy paths redirect directly to canonical Connect paths. Route metadata resolution must work for both canonical and legacy paths during transition.

Acceptance criteria:
- `routes.ts` registers:
  - `connect` → registry (`endpoints.tsx` implementation)
  - `connect/downstream` → downstream contract
  - `connect/upstream` → upstream contract
- `/app/connect`, `/app/connect/downstream`, and `/app/connect/upstream` serve the same content as today's `/app/endpoints*` routes
- `legacy-redirect.tsx` maps at minimum:
  - `/app/endpoints` → `/app/connect`
  - `/app/endpoints/downstream` → `/app/connect/downstream`
  - `/app/endpoints/upstream` → `/app/connect/upstream`
  - `/app/control/endpoints` → `/app/connect` (direct; not `/app/endpoints`)
  - `/app/integrations/downstream` → `/app/connect/downstream`
  - `/app/integrations/upstream` → `/app/connect/upstream`
- `getRuntimeRouteDefinition()` resolves `/app/connect`, `/app/connect/downstream`, `/app/connect/upstream` and legacy `/app/endpoints*` paths to the correct Connect route definitions
- In-app `Link` and `NavLink` targets use `/app/connect/*` as canonical paths
- `design-system.test.ts` route inventory and `getRuntimeRouteDefinition` expectations pass with new canonical paths
- Redirect behavior is covered by an automated test (preferred: extend `design-system.test.ts` or route test) or documented agent-operated QA with evidence under `evidence/`

### `R3` Preserve Local → Endpoints naming and semantics

Description:
The Local section page for local device/network inference endpoints stays named **Endpoints**. This run must not rename it to Peers or move it under Connect.

Acceptance criteria:
- `/app/local/endpoints` remains canonical for local inference endpoint management
- `localPeersRoute` (or equivalent) keeps `label: "Endpoints"` and `section: "Local"`
- `/app/local/peers` legacy redirect still resolves to `/app/local/endpoints`
- No route or nav item places local endpoint management under Connect
- Cross-links use qualified copy per `R14`

### `R4` Reframe Connect registry for consumer-facing visibility

Description:
The Connect registry page focuses on what client applications can call. Remote setup and alias adjudication defer to links, not duplicate full configuration UIs.

Acceptance criteria:
- Connect registry primary content remains configured provider rows and endpoint catalog rows (client-callable inventory)
- When `readinessRows.length > 0`, provider onboarding readiness renders as a **compact banner** with link to **Remote → Providers** — not a full `SectionCard` duplicate of System → Runtime
- The `Alias readiness` `SectionCard` (table with Alias / Mode / Coverage / Readiness) is **removed** from the Connect registry
- A single handoff link **View alias posture → Router** (or equivalent documented copy) replaces the alias table
- Connect registry empty state handoffs use qualified labels: **Local → Endpoints**, **Remote → Providers**, **Connect → Downstream**
- `design-system.test.ts` test `router, endpoints, and remote surfaces expose alias/readiness ownership instead of generic filler` is updated to assert:
  - Router route source still contains `Alias inventory`
  - Connect registry route source does **not** contain `Alias readiness` or `Alias coverage`
  - Connect registry route source contains the Router handoff link

### `R5` Remove non-functional meta-guidance panels

Description:
Conversion-era reading-order and inspection-path copy blocks add clutter without data or actions.

Acceptance criteria:
- `dashboard.tsx` no longer renders a `Reading order` `SectionCard`
- `requests.tsx` no longer renders an `Inspection path` sidebar or inner `Reading order` / `Adjacent surfaces` prose blocks
- `observe-activity.tsx` no longer renders a static `Reading order` prose block above the capture inspector (inspector UI remains)
- `router-config.tsx` no longer renders `Editing boundary`, `Where to edit`, or `Where to test` prose panels (unique data sections are handled under `R9` before this route is retired)
- `design-system.test.ts` guards against reintroduction of these panel title strings in live route sources

### `R6` Quiet shell chrome and apply enumerated copy budgets

Description:
Reduce triple-stacked explanatory text. Apply copy rules to enumerated route classes; do not strip functional form/composer descriptions.

Acceptance criteria:

**Shell and primitives (always):**
- `app-shell.tsx` removes left-rail per-section page counts (e.g. `Studio 5`)
- `app-shell.tsx` removes the `"{Section} pages"` label above section tabs
- `page-primitives.tsx` `SectionCard` removes the decorative `h-px w-8` header rule

**Route metadata (`design-system.ts`):**
- Every `RuntimeRouteDefinition.description` is one sentence, max 120 characters, for all routes in `runtimeRouteDefinitions`

**`FactCard.detail` removal (specific routes):**
- Remove `detail` prop usage on FactCards in: `dashboard.tsx`, `requests.tsx`, `router.tsx`, `workbench.tsx`
- Other routes may keep `detail` only when disambiguating a non-obvious metric (document exceptions in Phase 3 summary if any)

**`SectionCard` description removal (ledger/meta routes only):**
- Remove `description` prop from `SectionCard` in: `dashboard.tsx`, `requests.tsx`, `observe-activity.tsx`, `router.tsx`, `endpoints.tsx` (Connect registry), `integrations-downstream.tsx`, `integrations-upstream.tsx`, `runtime.tsx`
- **Exceptions — descriptions may remain** on routes with active forms or composer contracts: `workbench.tsx`, `providers.tsx`, `local-models.tsx`, `local-peers.tsx`, `control-routing-strategy.tsx`, `control-runtime-config.tsx`, `control-controller.tsx`, `control-roles.tsx`, `control-models.tsx` (main page only; modal governed by `R13`)

**Design-system documentation:**
- `DESIGN_SYSTEM.md` documents the copy budget rules above under component/shell rules

### `R7` Merge Local Matrix into Local Models

Description:
Local Matrix duplicates `fetchLocalModels()` output. Provide a grid view on Local Models and retire the separate Matrix nav destination.

Acceptance criteria:
- `DESIGN_SYSTEM.md` and `design-system.ts` updated before route edits
- Local Models exposes a **List | Grid** toggle; grid cells show model id, engine, and loaded state (parity with current `local-matrix.tsx`)
- `/app/local/matrix` redirects to `/app/local/models?view=grid`
- Local nav no longer lists Matrix as a separate item; `localMatrixRoute` removed from `runtimeNavigationSections`
- `design-system.test.ts` navigation inventory no longer includes `/app/local/matrix`
- Legacy `/app/local/matrix` path still resolves (redirect) and grid view is the default presentation after redirect

### `R8` Slim Overview dashboard request duplication

Description:
Overview must not replicate the full Observe → Requests ledger.

Acceptance criteria:
- `dashboard.tsx` removes the five-panel `Latest requests` `SectionCard` OR replaces it with **at most three** single-line rows showing: request id, status, latency (no duplicate metadata lines per row)
- Overview includes a visible CTA link **View all requests →** to `/app/observe/requests`
- Telemetry KPI `FactCard` strip and `Endpoint comparison` `SectionCard` remain unchanged in function

### `R9` Merge Router Config into Router Overview without losing unique data

Description:
Router Overview and Router Config share a duplicate 4-up FactCard strip. Config also owns unique read-only blocks (guidance provenance, policy inputs) that must survive on the merged Overview route. Strategy remains the edit surface.

Acceptance criteria:
- `DESIGN_SYSTEM.md` and `design-system.ts` updated before route merges
- Unique sections from `router-config.tsx` are present on `router.tsx` after merge:
  - **Guidance provenance** (preferred/ignored endpoints)
  - **Policy inputs** (roles and task definitions JSON inspect blocks)
- Duplicate 4-up FactCard strip appears **once** on the merged Overview route
- `/app/router/config` redirects to `/app/router`
- Router nav lists **Overview**, **Strategy**, **Controller**, **Candidates**, **Decisions** — **not** a separate **Config** tab
- `router-config.tsx` is removed from active nav and route tree or reduced to redirect-only per `routes.ts`
- All in-app links that targeted `/app/router/config` (`router.tsx`, `control-routing-strategy.tsx`, `control-roles.tsx`, and any others found by `R14` grep) target `/app/router` or the appropriate surviving section
- `design-system.test.ts` test `router config stays observational while routing strategy owns editing controls` is replaced with a merged-route guard asserting:
  - merged `router.tsx` does not contain strategy edit controls (`updateRuntimeConfig`, save buttons)
  - merged `router.tsx` still links to `/app/router/strategy`
  - merged `router.tsx` still renders guidance provenance and policy inputs content

### `R10` Deduplicate credential readiness surfacing

Description:
Credential readiness pills appear on multiple pages. Canonical home is System → Runtime.

Acceptance criteria:
- `runtime.tsx` retains full credential readiness `SectionCard` when `readinessRows.length > 0`
- Connect registry (`endpoints.tsx`) does not render the full readiness `SectionCard`; when `readinessRows.length > 0`, show compact banner linking to **Remote → Providers** and/or **System → Runtime**
- `workbench.tsx` shows readiness only when `blockingReadinessRows.length > 0`, as an inline banner above the composer — never as a standalone `SectionCard` when non-blocking

### `R11` Update design-system contract, primitives, tests, and dead scaffold removal

Description:
Encode Connect, copy budgets, disclosure primitive, and pillar semantics in the design-system layer before routes change.

Acceptance criteria:
- `DESIGN_SYSTEM.md` documents:
  - Connect section and `/app/connect*` route family
  - Local / Remote / Connect pillar model
  - Copy budget rules from `R6`
  - `DisclosureSection` primitive contract (see `R13`)
  - Design-system-first implementation order
- `design-system.ts` reflects all nav/path/metadata changes from `R1`, `R2`, `R7`, `R9`
- `design-system.test.ts` updated for all changed contracts and includes guards from `R4`, `R5`, `R9`
- `future-surface.tsx` is deleted (currently unused by any live route) and `design-system.test.ts` no longer depends on it, OR the file remains only if tests prove zero live-route imports and design system documents it as non-live tooling

### `R12` Verification floor for runtime UI

Description:
Changes must not regress the runtime UI build or design-system regression suite.

Acceptance criteria:
- `corepack pnpm --filter @role-model-router/runtime-ui test` passes
- `corepack pnpm --filter @role-model-router/runtime-ui build` passes
- Phase 4 `04-test-summary.md` records command output paths under `evidence/logs/`

### `R13` Bounded progressive disclosure on detail surfaces

Description:
Request detail and model inspect modal are dense. Collapse secondary content by default using a documented primitive.

Acceptance criteria:
- `DESIGN_SYSTEM.md` documents `DisclosureSection` before implementation
- `page-primitives.tsx` adds `DisclosureSection` with:
  - rectilinear styling consistent with existing panels
  - summary/title visible when collapsed
  - `button` trigger with `aria-expanded`
- `request-detail.tsx` uses `DisclosureSection` for these groups (collapsed by default unless noted):
  - **Routing diagnostics** (difficulty, hybrid, rewrite, controller detail beyond summary line)
  - **Execution stream / cache internals**
  - **Tooling** (executions, diagnostics JSON)
  - **Captures** (request/response bodies)
  - **Endpoint profile** (recent samples table)
  - Top-level summary FactCards and primary status fields remain **expanded** and visible without interaction
- `control-models.tsx` inspect modal:
  - **Overview** and **Roles** sections expanded by default
  - **Capabilities**, **Metrics**, **Routing / identifiers**, **Tooling / MCP**, **Host policy** collapsed by default via `DisclosureSection` or equivalent
- Expanded sections render the same API-backed fields as before collapse
- No new placeholder or fixture data

### `R14` Normalize cross-links and qualified copy

Description:
Eliminate ambiguous bare "Endpoints" and stale `/app/endpoints` / `/app/router/config` links after Connect and Router merges.

Acceptance criteria:
- Grep over `role-model-router/apps/runtime-ui/app/` for `/app/endpoints` in route/component sources finds **no canonical Link/NavLink targets** except inside `legacy-redirect.tsx` (and tests documenting legacy behavior)
- Grep for `Open Local Endpoints` finds **zero** matches; replaced with **Local → Endpoints** or **Open local endpoints** per `DESIGN_SYSTEM.md` copy table
- `providers.tsx` post-activation link targets `/app/connect` with label **View in Connect registry** (or documented equivalent)
- `endpoints.tsx`, `control-models.tsx`, `local-models.tsx` empty-state and handoff copy use qualified pillar names
- Grep for `/app/router/config` in `app/` finds **zero** canonical `Link` targets after `R9` (redirect route allowed)

## Out of Scope

- `OOS1`: Backend/API contract changes in `runtime-host-bridge` unless required for a UI link target that does not exist today
- `OOS2`: Merging Local, Remote, or Connect into a single nav section
- `OOS3`: Renaming Local → Endpoints to Peers
- `OOS4`: Removing functional ledgers, forms, persistence flows, or raw JSON escape hatches
- `OOS5`: Studio consolidation into a single nav item with mode tabs (follow-on run)
- `OOS6`: Merging Local Logs into Observe Logs (Local host logs stay under Local)
- `OOS7`: Merging Downstream and Upstream into one Connect page (separate Connect tabs remain)
- `OOS8`: System → Peers redesign beyond copy/disambiguation links
- `OOS9`: Renaming implementation files (`endpoints.tsx`, `local-peers.tsx`) — path and metadata changes only unless a rename materially improves clarity without churn

## Constraints

- Follow `recursive-mode-audit-v2` audited phase loop: draft → audit → repair → re-audit → pass → lock
- **Design-system-first order is mandatory** per `R0`; violating order is a Phase 3.5 review failure
- Phase 3 declares `TDD Mode: pragmatic` with compensating `design-system.test.ts` and route-source regression guards
- Phase 5 declares `QA Execution Mode: agent-operated` unless the user requests human browser sign-off
- Use isolated git worktree per `recursive-worktree` skill before implementation phases
- Preserve all existing legacy redirects; add new ones for renamed paths; legacy targets must point to canonical `/app/connect*` paths directly
- Minimize unrelated formatting churn outside `role-model-router/apps/runtime-ui/`

## Assumptions

- Baseline UI state includes the single-shell-header refactor on commit `48503a46b138054970ba63f576d0ce454f08b5c6` or later
- Connect registry may keep `endpoints.tsx` as the implementation filename; public paths and metadata change per `R1`/`R2`
- `router-config.tsx` may remain on disk as a redirect shim or be deleted after merge if `routes.ts` no longer mounts it as a page
- Prior relevant runs `14`, `32`, and `34` remain historical context; this run does not reopen their locked requirements

## Coverage Gate

- [x] Every in-scope behavior maps to at least one `R#`
- [x] Design-system-first rule recorded as `R0` and in Constraints
- [x] Source Requirement Inventory present for audit-v2
- [x] Local / Remote / Connect separation explicit in requirements and out-of-scope
- [x] R4/R9 conflicts with existing tests reconciled with explicit test-update criteria
- [x] Connect tab label collision with Local Endpoints addressed in `R1`
- [x] R6, R7, R13 ambiguity reduced with enumerations
- [x] Cross-link normalization covered by `R14`
- [x] User has reviewed and approved this requirements document

Coverage: PASS

## Approval Gate

- [x] User confirms this spec is complete enough to lock Phase 0 and proceed to AS-IS analysis
- [x] No unresolved naming or scope conflicts remain

Approval: PASS

Audit: PASS
