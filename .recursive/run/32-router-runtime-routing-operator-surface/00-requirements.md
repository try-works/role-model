Run: `/.recursive/run/32-router-runtime-routing-operator-surface/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
Outputs:
- `/.recursive/run/32-router-runtime-routing-operator-surface/00-requirements.md`
Scope note: This run adds a first-class Router section to the runtime app and the backend router-inspection/control-plane surfaces required to make routing logic and configuration legible to users. The run must plan frontend pages and layouts in the existing design system first, then implement the backend and frontend with TDD and end-to-end browser verification.

## TODO

- [x] Consolidate the routing-surface gap into a repo-owned recursive requirement contract
- [x] Define stable requirement identifiers and verifiable acceptance criteria
- [x] Define the backend API surfaces required to support Router pages without raw JSON scraping
- [x] Define the Router route family, tabs, layouts, and design-system-first sequencing rules
- [x] Record TDD, targeted validation, runtime E2E, and browser E2E obligations
- [x] Record worktree and baseline constraints for the new run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Add a first-class Router section and route family to the runtime UI

Description:
The runtime UI must expose routing behavior through a dedicated Router information architecture rather than scattering the information across Control, Observe, and raw request JSON.

Acceptance criteria:
- the app gains a primary Router section in the repo-owned runtime shell navigation
- the Router section is reachable through route definitions and navigation metadata, not only ad hoc links
- the Router route family includes at minimum:
  - `/app/router`
  - `/app/router/config`
  - `/app/router/candidates`
  - `/app/router/decisions`
  - `/app/router/decisions/:requestId`
- the Router section exposes section-level tabs for the primary Router pages
- existing Control and Observe pages remain available; the Router section supplements them instead of silently replacing them

### `R2` Add repo-owned backend router API surfaces for structured frontend consumption

Description:
The frontend must not depend on reading raw request bundles and reverse-engineering routing structures inside page components. The bridge must expose structured router-focused API surfaces.

Acceptance criteria:
- the backend adds a repo-owned Router API family under `/api/role-model/router/`
- the Router API family includes at minimum:
  - a summary snapshot endpoint
  - a configuration snapshot endpoint
  - a candidate inventory endpoint
  - a recent decision ledger endpoint
  - a decision-detail endpoint keyed by request identity
- the structured router APIs expose typed data for frontend consumption rather than requiring route components to parse arbitrary nested JSON blobs
- the frontend runtime API layer gains corresponding typed client functions and interfaces for the new Router surfaces
- no Router page is implemented by directly inlining fetches to unrelated raw endpoints and hand-picking nested fields inside page components

### `R3` Expose routing configuration, policy sources, and provenance honestly

Description:
Users need to understand not just the active routing strategy label, but also where routing behavior comes from and which values are configured, derived, or currently unavailable.

Acceptance criteria:
- the Router configuration surface exposes, when available:
  - active routing strategy
  - execution mode when it materially affects routing behavior
  - controller assignment
  - routing-model guidance, including controller/routing-model endpoint, preferred endpoints, and ignored endpoints
  - resolved routing policy snapshot fields such as compute preference, budget mode, allow/deny lists, privacy posture, and routing targets
- the Router configuration surface distinguishes:
  - explicit persisted config
  - advisory or fixture-backed guidance
  - per-request resolved policy state
  - unavailable or unconfigured values
- the backend exposes the full policy-source information required for this page, including role/task and routing-policy inputs that are currently absent from the runtime UI contract
- if any routing-config source is not currently configured, the Router page renders an honest empty or unavailable state instead of implying that the value exists

### `R4` Expose candidate inventory and observed routing signals across local and remote endpoints

Description:
Users need a candidate-centric view that shows what the router can choose from and which live/declared signals shape those choices.

Acceptance criteria:
- the Router candidates surface shows both local and remote endpoints in one comparable inventory
- each candidate row/card exposes at minimum:
  - endpoint id
  - model id
  - provider/source identity
  - endpoint kind and serving source
  - status and health
  - role bindings
  - tool-calling capability
  - controller/preferred/ignored posture when applicable
- observed routing signal visibility includes, when available:
  - latency
  - throughput
  - estimated cost
  - failure rate
  - freshness/confidence
  - sample size / measurement window / source counts
- candidate surfaces preserve honest empty/loading/error states and do not assume that observed metrics always exist

### `R5` Expose routing decisions as explainable user-facing records

Description:
The Router section must explain why a decision happened, not just which endpoint won.

Acceptance criteria:
- the Router decision ledger shows recent decisions with at minimum:
  - request id
  - routing decision id
  - chosen endpoint/model
  - timestamp
  - strategy/policy summary
  - direct drill-in link
- the Router decision detail surface exposes, when available:
  - chosen endpoint id
  - fallback endpoint ids
  - selection reasons
  - `used_measured` / `used_declared`
  - eligibility results with exclusion codes and human-readable detail
  - scored candidates with total score
  - per-candidate metric breakdown
  - tie-break data
  - routing diagnostics
  - retrieval receipt summary
  - context envelope summary
- the Router decision detail surface labels metric provenance (`measured`, `declared`, `default`) so users can tell whether a value was observed or inferred
- the Router decision detail surface links clearly to the existing Observe request detail when deeper trace/capture inspection is needed

### `R6` Plan Router pages, tabs, and shared layouts in the design system before frontend implementation

Description:
Frontend work for the Router section must begin by updating the existing runtime design system and navigation contract, then implementing pages against those planned surfaces.

Acceptance criteria:
- before Router page implementation begins, the run updates the existing design-system/navigation contract with:
  - the Router section
  - Router page definitions
  - Router tab model
  - intended page templates/layouts
  - shared empty/loading/error/success states
  - any new shared Router-specific primitives needed for config, candidates, or decision inspection
- the design-system-first step happens in repo-owned runtime UI surfaces, not in an external mockup-only artifact
- frontend implementation follows the updated design-system contract instead of shipping bespoke page layouts first
- the implementation discipline explicitly uses `ui-design-system` guidance for accessible composition, responsive behavior, and reusable component patterns

### `R7` Preserve section ownership boundaries and backward-compatible operator workflows

Description:
The new Router section must clarify routing behavior without collapsing the existing division between configuration, observation, and raw host surfaces.

Acceptance criteria:
- Control pages remain the primary home for editing provider/controller/runtime configuration
- Observe pages remain the primary home for request captures, traces, and raw debugging artifacts
- the new Router section becomes the primary home for routing explanation, policy visibility, candidate comparison, and decision interpretation
- existing Observe and Control routes continue to work after the Router section is added
- the run does not remove or hide preserved host/operator routes such as `/logs`, `/api/metrics`, `/api/captures/:id`, or the existing request detail path unless a later locked addendum explicitly widens scope

### `R8` Implement all production changes under strict TDD with targeted verification

Description:
The run must follow failing-test-first discipline for backend and frontend production changes and must validate every new routing surface through the strongest relevant repo-owned tests.

Acceptance criteria:
- `TDD Mode` for the implementation phase is `strict`
- every production code change in the backend or frontend is preceded by failing automated coverage at the appropriate level before turning green
- the run adds or updates targeted automated coverage for at minimum:
  - backend Router API contracts
  - runtime API client typings/fetchers
  - Router navigation/design-system definitions
  - Router page rendering and state handling
- the final verification set includes the strongest relevant focused package builds/tests for touched runtime-host-bridge and runtime-ui surfaces
- the run records whether root `ci:check` remains at the inherited origin-main failure signature or improves, and must not silently introduce a different unrelated root failure pattern

### `R9` Prove the Router surfaces end to end in the running runtime, including browser QA

Description:
The run must not stop at static rendering or unit tests. Users must be able to navigate the Router section and inspect a real routing decision in the running app.

Acceptance criteria:
- end-to-end verification launches the runtime and exercises the Router section in the live app
- browser QA covers at minimum:
  - opening the Router overview/config/candidates/decisions pages
  - tab/navigation behavior inside the Router section
  - decision drill-in from the Router ledger
  - at least one live or fixture-backed routed request whose resulting decision is visible through the Router detail surface
- browser QA includes both:
  - an honest empty/unconfigured state where applicable
  - a configured state with real routing data
- the final evidence set includes browser-level proof that the Router pages are usable, not just technically reachable

## Out of Scope

- `OOS1`: inventing new routing strategies beyond the already locked routing program and current runtime behavior
- `OOS2`: broad redesign of unrelated runtime UI sections outside the Router/navigation/shared-surface work required for this run
- `OOS3`: replacing the existing Observe request-detail surface instead of linking to it appropriately
- `OOS4`: repo-wide formatting or baseline hygiene remediation unrelated to the Router scope unless a later addendum explicitly widens the run

## Constraints

- the run must execute from the isolated worktree recorded in `00-worktree.md`
- the run baseline is the refreshed `origin/main` commit `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- the Phase 0 baseline currently reproduces a non-green `corepack pnpm run ci:check` result caused by untouched formatter drift on baseline files such as `package.json` and `biome.json`; this inherited baseline state must be acknowledged during verification
- the run must preserve the architecture lock split between catalog, provider account, endpoint registry, routing, observability, and host ownership
- frontend Router work must update the existing design system first and use `ui-design-system` discipline
- implementation must use strict TDD and must include browser-backed end-to-end verification
- the run must keep routing support legible across both local and remote endpoints rather than surfacing only one side of the runtime

## Assumptions

- the existing runtime observation bundle already contains most of the per-request routing data needed for Router decision detail surfaces
- new backend Router APIs will mainly reorganize and promote existing routing/runtime data into stable frontend-facing contracts rather than requiring a new routing engine
- the existing runtime shell and design-system/navigation layer are the correct foundation for the Router section
- request-oriented decision drill-ins can be anchored on request identity while still surfacing routing decision ids and policy detail explicitly

## Sequence Integration

- Roadmap slot: `post-run30 routing operator visibility and explanation surfaces`
- Previous repo dependencies:
  - `14-router-runtime-ui-foundation`
  - `22-router-runtime-routing-strategy-lock`
  - `30-router-runtime-strategy-convergence-e2e`
- Baseline source for this run: refreshed `origin/main` at `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Next repo dependency: implementation phases for `32-router-runtime-routing-operator-surface`
- Required handoff: repo-owned Router APIs plus Router UI section/pages that make routing configuration, candidates, and decisions understandable to users

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/routes/`
- `role-model-router/packages/core/src/`
- `role-model-router/packages/protocol-routing/src/`
- `role-model-router/packages/runtime-observability/src/`
- runtime validation and browser-QA evidence under this run folder's `evidence/`

## Validation Expectations

- implementation must add failing automated tests before backend Router APIs or frontend Router pages are implemented
- focused verification is expected for touched runtime-host-bridge and runtime-ui package test/build paths
- runtime-backed validation must prove that Router APIs and Router pages agree on the same routing facts
- end-to-end verification must include a running runtime plus browser navigation through the Router section
- final verification must explicitly compare the post-run status against the Phase 0 inherited baseline failure signature

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] Backend and frontend Router responsibilities are explicit and verifiable
- [x] Design-system-first sequencing, strict TDD, and browser E2E obligations are explicit
- [x] Baseline/worktree constraints for the new run are recorded

Coverage: PASS

## Approval Gate

- [x] The requirements are specific enough for downstream AS-IS analysis and planning
- [x] The run no longer depends on carrying the routing-surface problem statement in chat
- [x] No unresolved ambiguity remains about Router pages, backend API needs, design-system-first UI sequencing, or verification discipline

Approval: PASS
