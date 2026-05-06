Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-05T22:29:50Z`
LockHash: `81408f856015d4447c4e1aad00541179bcd627cee47e7a1c8bea7ec9165167fa`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\DESIGN.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\DESIGN-role-model.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `/.agents/skills/ui-design-system/references/DESIGN_TOKENS.md`
- `/.agents/skills/ui-design-system/references/RESPONSIVE_PATTERNS.md`
- `/.agents/skills/swiss-design/SKILL.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
Scope note: This document defines the stable requirement contract for the first repo-owned runtime operator UI run. It introduces the role-model-owned UI foundation after run 13 and includes provider/account onboarding as an initial surface rather than a deferred follow-up.

## TODO

- [x] Consolidate the runtime UI report into a repo-owned recursive requirement contract
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record scope boundaries, constraints, assumptions, and sequence integration
- [x] Capture the design-system and responsive/accessibility rules from the UI design skills
- [x] Capture the Moonshot/Kimi-first provider onboarding slice
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Create a repo-owned runtime UI foundation and operator shell

Description:
This run must create the foundation requirement contract for a new role-model-owned runtime UI rather than extending the vendored `llama-swap` Svelte UI.

Acceptance criteria:
- the run targets a new app rooted under `role-model-router/apps/runtime-ui/`
- the UI stack is explicitly React Router + Vite + Tailwind CSS, with Radix primitives and owned shadcn-style component patterns where appropriate
- the shell contract is a fixed sidebar + fixed header + fluid main content + optional right inspection panel
- the run explicitly recognizes that `llama-swap` is already integrated as the local host/execution and operator-surface layer through the managed role-model bridge
- the vendored `llama-swap` UI remains a workflow reference and is not the structural or visual target of this run
- the public/docs shell is acknowledged but the operator shell is the initial implementation priority

### `R2` Establish the runtime UI design system and shared surface contract

Description:
This run must turn the imported design rules into a role-model-owned implementation contract while using the design skills as implementation discipline rather than as conflicting visual overrides.

Acceptance criteria:
- `DESIGN.md` remains the source of truth for visual rules, typography, spacing, border/elevation rules, and state discipline
- `DESIGN-role-model.md` remains the source of truth for role-model shell direction, route families, and shared-surface planning
- `ui-design-system` guidance is reflected through a three-tier token model, accessible component architecture, and shared state surfaces
- `swiss-design` guidance is reflected through grid-first composition, mobile-first responsive rules, opacity-led hierarchy, generous whitespace, and narrow readable prose columns where appropriate
- if imported Swiss defaults conflict with role-model design rules, role-model rules win, including Inter + JetBrains Mono and the limestone/ink/orange token family
- the run requires shared surfaces for shell, registry, detail, provider onboarding, request inspection, and standard loading/empty/error/not-found/success states

### `R3` Include provider and account onboarding as a starting operator surface

Description:
This run must treat cloud-provider configuration as part of the first operator UI slice, not as a deferred later page family.

Acceptance criteria:
- the initial operator surface includes provider catalog/onboarding, provider-account setup, endpoint activation, model selection, and model-role assignment
- provider/model metadata comes from `D:\models.dev` through a role-model catalog layer rather than hardcoded frontend lists
- role-model owns provider-account state, auth-mode selection, allowed/denied model choices, role assignment, and endpoint instantiation
- the initial cloud-provider slice prioritizes **Moonshot / Kimi**
- the UI model must support both **API key** and **OAuth** onboarding paths from the start, even if one path initially lands with explicit backend limitations
- provider-account health, revocation, degraded state, and credential-reference status are treated as first-class operator-facing status surfaces
- secret material is held by reference only and must never be rendered as raw values in normal UI flows

### `R4` Define the first-build route set and page layout patterns

Description:
This run must define a shippable first-build route set grounded in real runtime capabilities and the new provider onboarding surface.

Acceptance criteria:
- the first-build operator routes include at minimum:
  - `/app`
  - `/app/providers`
  - `/app/accounts`
  - `/app/workbench`
  - `/app/runtime`
  - `/app/endpoints`
  - `/app/requests`
  - `/app/requests/[requestId]`
- `/app/providers` functions as the provider catalog and onboarding entry point
- `/app/accounts` functions as the provider-account setup and health surface
- the route plan explicitly accounts for already-integrated local-model host workflows inherited from `llama-swap`, especially where they affect workbench, runtime, logs, captures, upstream/local-model access, or model-unload/operator actions
- page patterns are explicitly mapped:
  - provider setup/accounts -> `registry-page` plus `detail-page` forms
  - dashboard -> `operator-dashboard`
  - endpoints and requests -> `registry-page`
  - request inspector and workbench -> `tri-pane-workspace` or equivalent investigation layout
  - logs -> `split-pane-operator` once host log integration is ready
- the route set stays scoped to operator surfaces first; public/docs/catalog work is not silently widened into this run

### `R5` Preserve accessibility, responsiveness, and implementation safety

Description:
This run must define quality constraints that prevent the operator UI from becoming a brittle or inaccessible one-off frontend.

Acceptance criteria:
- mobile-first responsive behavior is required, including usable layouts from 320px upward and progressive enhancement at `sm`, `md`, and `lg`
- the layout model follows a grid-first approach and preserves table/list usability on narrow screens
- interactive elements and navigation must meet WCAG AA contrast and accessible labeling expectations
- loading, empty, error, not-found, and success states are required for every route-backed or data-driven shared surface
- shell stability is preserved during loading and refresh; route shells are not replaced with unrelated placeholders
- the run must prefer shared component primitives over page-local bespoke markup
- the run must avoid speculative divergence from upstream vendor data sources or the architecture lock

### `R6` Keep the UI run aligned with runtime architecture and validation boundaries

Description:
This run must remain aligned with the existing router-runtime architecture rather than treating the UI as a detached redesign exercise.

Acceptance criteria:
- `models.dev` is treated as a read-only upstream catalog source, not a place where runtime state is written
- the UI run may require new backend/control-plane APIs, but those APIs must preserve the architecture lock split between catalog, auth/account, endpoint registry, routing, and host layers
- the run must explicitly document that the current runtime already integrates vendored `llama-swap` at the host layer and preserves raw vendor/operator surfaces beside role-model structured inspection routes
- the run must explicitly identify which current vendor surfaces remain preserved host endpoints and which capabilities should be promoted into role-model-native UI flows
- preserved host/operator surfaces include at minimum `/logs`, `/logs/stream`, `/api/events`, `/api/metrics`, `/api/captures/:id`, and the existing vendored `/ui/` route
- local-model-oriented vendor capabilities such as direct upstream access and model-unload/operator controls must be treated as part of the available runtime capability set even if run 14 does not immediately redesign all of them as final role-model-native pages
- the run must not weaken the committed runtime, routing, observability, or tool-extension guarantees from runs 10 through 13
- validation for this run must include the relevant frontend build/test path plus runtime-backed verification of the operator surfaces that are implemented
- manual QA is expected for the operator UI because interaction quality, readability, and surface coherence matter in addition to automated assertions

## Out of Scope

- `OOS1`: replacing the vendored `llama-swap` host implementation or rewriting upstream vendor repos as part of this run
- `OOS2`: full provider expansion across every cloud vendor before the Moonshot/Kimi-first slice proves out
- `OOS3`: implementing the full long-term public/docs/catalog shell during the initial operator-foundation run
- `OOS4`: broad policy, decision, trace, benchmark, and usage productization beyond the first operator route set unless a later addendum explicitly widens scope
- `OOS5`: bypassing the provider auth/account layer by treating environment-variable names alone as a sufficient UX or runtime model

## Constraints

- Repo run `14-router-runtime-ui-foundation` follows `13-router-runtime-mcp-tools-extension` and begins a new post-run13 operator UI sequence.
- The architecture lock remains the repo-native source for vendor boundaries, ownership layers, cache/governance expectations, and operator/runtime split.
- The current runtime already uses vendored `llama-swap` as the local single-host execution-plane and operator-surface layer, with a managed role-model bridge providing routing/execution semantics behind it.
- The runtime UI must be repo-owned and coherent; it may not be framed as a vendor UI reskin.
- The first provider slice must prioritize Moonshot/Kimi and must be modeled using upstream metadata from `D:\models.dev`.
- Design constraints from `DESIGN.md`, `DESIGN-role-model.md`, `ui-design-system`, and `swiss-design` must be reconciled into one requirement contract rather than selectively applied ad hoc during implementation.
- The run must preserve explicit auth-mode selection, credential reference handling, and provider-account health semantics from the runtime roadmap.
- The run must preserve and appropriately expose relevant vendored host capabilities, especially the local-model-focused operator workflows inherited from `llama-swap`, rather than pretending the runtime starts from a blank host surface.
- Windows worktree and browser-local development constraints from recursive-mode remain in force.

## Assumptions

- The existing docs-site stack is a suitable frontend baseline for the new runtime UI app.
- The current runtime/backend surface is sufficient to support the first operator slice once the missing provider/account/control-plane seams are added.
- Moonshot/Kimi provides a narrow enough cloud-provider slice to validate the onboarding, endpoint activation, and role-assignment workflow before widening to more providers.
- Some backend OAuth execution details may still need to land after the initial UI spec as long as the UI and account model do not hide that gap.

## Sequence Integration

- Roadmap slot: `post-run13 runtime operator UI foundation addendum`
- Previous repo dependency: `13-router-runtime-mcp-tools-extension`
- Next repo dependency: `TBD after run 14 closeout`
- Required handoff: repo-owned runtime UI shell contract, design-token/shared-surface contract, provider-account onboarding slice, and first-build route scope for implementation phases

## Detailed Requirement Specification

- Create a new repo-owned operator UI app under `role-model-router/apps/runtime-ui/`.
- Use React Router + Vite + Tailwind CSS as the application baseline.
- Use Radix primitives and owned shadcn-style component patterns where they improve accessibility and consistency.
- Treat the current host integration honestly:
  - vendored `llama-swap` is already integrated as the local execution/host layer
  - the managed role-model bridge supplies routed model selection and execution semantics behind that host
  - run 14 must not describe the runtime as if those host/operator capabilities do not already exist
- Define role-model-owned design tokens using a three-tier model:
  - primitive tokens
  - semantic tokens
  - component tokens
- Keep role-model visual rules from `DESIGN.md`:
  - limestone background
  - white surfaces
  - ink structural text and borders
  - restrained orange accent
  - Inter for interface text
  - JetBrains Mono only for technical values
  - border-led depth, not shadow-led depth
- Apply `swiss-design` discipline for:
  - 12-column grid thinking
  - mobile-first layouts
  - whitespace as structure
  - opacity-led hierarchy
  - restrained accent usage
- Build the initial shared component inventory around:
  - `AppShell`
  - `SidebarNav`
  - `TopHeaderBar`
  - `PageHeader`
  - `RightInspectionPanel`
  - `DataTable`
  - `EntityDetailSummary`
  - `DetailSectionCard`
  - `ProviderOnboardingWizard`
  - `ProviderAccountForm`
  - `ModelRoleAssignmentTable`
  - `EndpointActivationPanel`
  - `RequestResponseInspector`
  - `LoadingState`
  - `EmptyState`
  - `ErrorState`
  - `NotFoundState`
- Implement the first operator route family around:
  - dashboard
  - providers
  - accounts
  - workbench
  - runtime
  - endpoints
  - requests and request detail
- Record the preserved vendored host/operator surfaces that already exist in the integrated runtime:
  - `/logs`
  - `/logs/stream`
  - `/api/events`
  - `/api/metrics`
  - `/api/captures/:id`
  - vendored `/ui/`
- Record the inherited local-model-oriented vendor capabilities that the role-model UI may need to expose or replace over time:
  - direct upstream/local-model access paths
  - model unload/operator controls
  - host-side local model lifecycle and monitoring workflows
- Explicitly distinguish:
  - **preserved vendor endpoints** that remain host-owned for now
  - **role-model-native operator surfaces** that run 14 should build on top of or beside them
- Treat provider onboarding as a first-class flow:
  - select provider
  - choose auth mode
  - register provider account
  - choose eligible models from catalog metadata
  - assign model roles
  - instantiate endpoint bindings
- Use `models.dev` as upstream input for provider/model metadata and endpoint hints while keeping runtime state inside role-model-owned layers.
- Preserve the roadmap auth/account rules:
  - explicit auth families
  - credential refs
  - region/base URL selection
  - allowed/denied model selection
  - health and revocation state
- Preserve runtime safety and observability boundaries while expanding UI/control-plane seams as needed.

## Coverage Gate

- [x] A concrete repo run id and sequence position were defined
- [x] The UI foundation, design-system, provider-onboarding, and first-route-scope requirements were captured
- [x] The Moonshot/Kimi-first provider slice and `models.dev` source rule were preserved
- [x] Accessibility, responsive, architecture-boundary, and existing llama-swap host-integration constraints were recorded

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS and Phase 2 planning later
- [x] Scope boundaries are narrow enough to keep this as the runtime UI foundation run rather than the entire long-term product surface

Approval: PASS
