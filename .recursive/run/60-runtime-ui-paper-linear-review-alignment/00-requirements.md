Run: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/`
Phase: `00 Requirements`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/package.json`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/root.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/vite.config.ts`
- `role-model-router/apps/runtime-host-bridge/package.json`
- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
- `role-model-router/apps/runtime-ui/app/components/themed-select.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- Paper design authority: `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6/1-0/3-0`
- Paper runtime-page authority: `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6/2-0`
- `ui-design-system` skill guidance
Outputs:
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
Scope note: This run updates the repo-owned runtime UI implementation to match the current Paper Linear review design system and runtime-page artifacts. The implementation order is mandatory: first update the shared design-system authority and shared primitives according to the Paper design-system board, then update the actual runtime pages to match the Paper runtime-pages page. Route-level styling changes are not allowed to bypass or precede the shared design-system work that should own them.
Status: `LOCKED`
LockedAt: `2026-07-02T12:14:40Z`
LockHash: `a8258cd8dfa6e511a974d73f2dea3cc07b742a083de0b4d1bc90e62b75197604`

## TODO

- [x] Re-read recursive-mode workflow and bridge docs
- [x] Re-read current runtime UI design-system authority and recent UI runs
- [x] Capture the Paper design-system board and runtime-pages page as explicit upstream authorities
- [x] Encode the mandatory design-system-first implementation order
- [x] Convert the request into repo-owned `R#` requirements
- [x] Name the expected frontend surfaces that likely need changes
- [x] Define verification expectations for shared primitives and route pages
- [x] Bound the run to frontend/design-system implementation rather than Paper-file editing
- [x] Integrate strict-TDD and rebuilt-runtime browser-verification requirements into the base artifact

## Run Metadata

- Priority: `P0`
- Run type: frontend design-system and route-alignment implementation
- Primary subsystem: `role-model-router/apps/runtime-ui/**`
- Secondary docs/contract surfaces:
  - `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
- User-visible outcome:
  - the shipped runtime UI uses the Paper Linear review design system in shared tokens, typography, shell chrome, controls, pills, graphs, and route pages
- Main risk theme:
  - route-level styling drift or content drift surviving because shared primitives and token authority were not updated first

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `48-runtime-ui-design-system-apple-theme` | established the current Apple-inspired runtime UI authority that this run now supersedes with the Paper Linear review design authority |
| `49-runtime-telemetry-analytics-charts` | added telemetry chart primitives and route-level analytics surfaces that now need to match the Paper runtime-page designs |
| `53-runtime-telemetry-analytics-contract-hardening` | established shared chart-state semantics and graph-matrix authority that the new design-system implementation must preserve while restyling |
| `59-observe-taxonomy-analytics-completion` | most recent broad runtime-page UI implementation pass; identifies route surfaces and telemetry-heavy pages that the new Paper-driven frontend pass must realign |

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| User request on 2026-07-02 | create a new recursive-run spec that first updates the design system from Paper, then updates the frontend pages from Paper |
| User clarification on 2026-07-02 | the requirement must enforce TDD, remain concretely verifiable, and require browser verification only after rebuilding the runtime |
| User clarification on 2026-07-02 | chart type selection must fit the underlying data and user comprehension, even when the Paper specimen uses a weaker graph choice, and all shipped graphs must use Recharts components |
| User clarification on 2026-07-02 | rebuilt-runtime browser verification must confirm functionality was not broken, and regression coverage must include end-to-end tests |
| Paper design-system authority `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6/1-0/3-0` | primary visual/system authority for component grammar, token usage, pill styling, shell/chrome treatment, and component-catalog expectations |
| Paper runtime-page authority `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6/2-0` | primary route-by-route authority for shipped runtime-page layout, page composition, content hierarchy, and use of the shared design system |
| `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | current repo-owned design-system contract that must be updated before route implementation |
| `role-model-router/apps/runtime-ui/app/lib/design-system.ts` and `design-system.test.ts` | current shared metadata/token authority and regression layer |
| `role-model-router/apps/runtime-ui/package.json`, `vite.config.ts`, and runtime-host-bridge validation surfaces | identify the runtime build and rebuilt-runtime verification path that later phases must use instead of relying only on a design-only preview |
| `app.css`, `root.tsx`, `app-shell.tsx`, `page-primitives.tsx`, `theme-toggle.tsx`, `themed-select.tsx`, `telemetry-controls.tsx`, `telemetry-charts.tsx` | shared implementation surfaces that should absorb the design-system changes before route-specific changes |
| current route files under `role-model-router/apps/runtime-ui/app/routes/**` | current shipped frontend consumers that must be brought into parity with the Paper runtime-page page after the shared system is updated |

## Paper Authority Contract

1. The active visual authority for this run is the current Paper Linear review file, not the older Apple-reference wording in the repo.
2. The design-system implementation authority comes from the Paper design-system board first:
   - primary board link: `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6/1-0/3-0`
3. The runtime-page implementation authority comes from the Paper runtime-pages page second:
   - page link: `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6/2-0`
4. If Phase 1 finds that the design-system board link alone is insufficient because required token or shell guidance lives on adjacent artboards within the same Paper design-system page, Phase 1 may read those adjacent artboards from the same Paper file/page, but it must record exactly which additional artboards became authoritative and why.
5. The run is repo-implementation work only. It does not edit the Paper file itself; it consumes the Paper file as the design authority for code changes.

## Design-System-First Rule

Frontend delivery for this run must follow this order:

1. Paper design-system authority is read and translated into repo-owned design-system requirements.
2. `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` is updated to reflect the new active design-system contract.
3. Shared token and metadata authority is updated:
   - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
   - `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
4. Shared theming and primitive layers are updated:
   - `role-model-router/apps/runtime-ui/app/app.css`
   - `role-model-router/apps/runtime-ui/app/root.tsx`
   - `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
   - `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
   - `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
   - `role-model-router/apps/runtime-ui/app/components/themed-select.tsx`
   - `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx`
   - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
   - any other shared primitive or helper that owns styling used across multiple routes
5. Only after the shared design-system slice for a page family is landed may route consumers be updated against the Paper runtime-pages page.

No route-level styling or layout changes may land ahead of the corresponding shared design-system contract and primitive updates that should own those changes.

## Assumptions

- The current runtime-page route architecture, route IDs, and data semantics remain the baseline unless Phase 1 proves that a route-level Paper specimen requires a bounded frontend-structure adjustment.
- The Paper runtime-pages page already reflects the intended route content and layout direction more accurately than the currently shipped runtime UI styling.
- Existing runtime data contracts should remain usable; this run is primarily a frontend/design-system implementation pass, not a backend API redesign.
- Where a route currently bypasses shared primitives or hardcodes color/typography/control treatment, the correct fix is to strengthen the shared design system first and then migrate the route.

## Constraints

- The implementation must update the design system before updating actual pages.
- Shared tokens, typography, pill grammar, button grammar, shell/header/sidebar relationships, chart treatment, and control styling must be centralized instead of route-local.
- Route pages must consume the resulting shared design-system primitives and tokens rather than hardcoded route-specific values.
- Existing route ownership and telemetry/state semantics from `11-runtime-ui-telemetry-graph-matrix.md` must remain truthful unless Phase 1 records a necessary contract update.
- All shipped graph/chart surfaces in scope must use Recharts components rather than ad hoc SVG/CSS/HTML chart implementations.
- The run does not update the Paper file, invent a second design authority, or treat chat prose as the specification once this artifact exists.

## Requirements

### `R0` Enforce design-system-first implementation sequencing

Description:
This run is invalid if it updates route pages before updating the shared design-system authority and primitives that those pages should consume.

Acceptance criteria:
- Phase 2 planning explicitly sequences work as:
  - Paper design-system authority
  - repo `DESIGN_SYSTEM.md`
  - shared token/metadata authority
  - shared theming/primitives
  - route consumers
- Phase 3 evidence shows the design-system contract and shared primitives were updated before or alongside each dependent route family
- No route file introduces Paper-driven styling or layout changes without matching shared design-system ownership updates

### `R1` Replace the current active runtime UI styling authority with the Paper Linear review design-system authority

Description:
The repo’s active runtime UI design-system authority must be rewritten to match the Paper Linear review design-system board rather than leaving the old Apple-reference contract as the live implementation authority.

Acceptance criteria:
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` identifies the Paper Linear review design-system board as the active design authority for this run’s implementation baseline
- any lingering wording that still treats the old Apple reference as the active styling authority is removed or explicitly downgraded to historical context if retained at all
- the repo-owned design-system document captures the token, typography, component, shell, chart, and control rules that the Paper design-system board requires for implementation
- if `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, or an architecture doc still materially describe the older styling authority as current truth after the run, Phase 6 or 7 updates must correct that

### `R2` Rebuild the shared token, typography, and component grammar to match the Paper design system

Description:
The shared design-system implementation must reflect the Paper design-system board in tokens, typography, pill/button/control treatment, shell chrome, and chart styling before route-level consumers are updated.

Acceptance criteria:
- shared token and metadata authority is updated in `design-system.ts` and validated in `design-system.test.ts`
- `app.css` and `root.tsx` apply the Paper-aligned token and theme contract at the shared runtime root rather than through ad hoc route overrides
- shared typography rules used by shell titles, page titles, section headings, body copy, labels, captions, pills, and monospace artifacts align with the Paper design-system board
- shared pill styling aligns with the Paper design system:
  - solid token-backed pills where the design system specifies solid pills
  - contrasting text
  - canonical padding and radius
  - no stale soft-fill variants where the Paper board uses the newer grammar
- shared button, tab, select, chart, and surface styling is aligned to the Paper design-system board rather than mixed old/new contracts
- shared chart primitives are implemented with Recharts components and expose a chart-type vocabulary that can choose the correct visualization for the data instead of treating the Paper specimen as a one-to-one graph-type mandate

### `R3` Bring shared component inventory and variant behavior into parity with the Paper design-system board

Description:
The runtime UI code should expose the same shared component vocabulary and expected visual/behavioral variants that the Paper design-system board now represents.

Acceptance criteria:
- shared component families used by runtime pages are inventoried and reconciled against the Paper design-system board
- for each shared family touched by this run, the implementation records whether the Paper board expects:
  - token changes only
  - component structure changes
  - additional state/variant coverage
- any currently shipped component variant that visually conflicts with the Paper board is updated through the shared primitive, not patched separately on each route
- any route still bypassing shared design-system components or token usage is identified in Phase 1 and given a concrete remediation plan in Phase 2

### `R4` Align the shared shell, navigation, and global chrome with the Paper runtime shell

Description:
The global runtime shell should match the Paper runtime-page shell grammar before individual page bodies are tuned.

Acceptance criteria:
- `app-shell.tsx`, `theme-toggle.tsx`, and related shared shell metadata/helpers align with the Paper runtime shell treatment
- header, sidebar, nav pills/tabs, title hierarchy, and shared theme-toggle placement match the Paper runtime-page authority
- global chrome uses the shared design-system tokens and typography, not route-local overrides
- if the Paper runtime shell implies a change to route metadata ownership or shell-header behavior, the repo-owned shell contract is updated before route bodies are restyled

### `R5` Update the shipped runtime pages route by route according to the Paper runtime-pages page

Description:
After the shared design-system work lands, the actual route pages must be updated to match the Paper runtime-pages page route by route.

Acceptance criteria:
- the implemented runtime UI pages are audited against the Paper runtime-pages page and updated accordingly
- route families in scope include at minimum the live runtime surfaces represented on the Paper runtime-pages page:
  - Overview
  - Studio pages
  - Local pages
  - Remote pages
  - Models pages
  - Router pages
  - Observe pages
  - Connect pages
  - System pages
- each page uses the shared design-system tokens and primitives produced by `R1`-`R4`
- page layout, spacing, typography, pill/control styling, graph treatment, and composition follow the Paper runtime-page authority instead of the stale shipped styling
- graph implementations are allowed to depart from the Paper specimen's exact chart type when needed to better fit the underlying runtime data and improve user comprehension, provided the resulting visualization still matches the Paper page's information hierarchy and design-system treatment
- each changed graph uses the Recharts component family most appropriate for the data being displayed:
  - time-series trend data uses trend-oriented charts such as line or area where appropriate
  - categorical comparisons use bar-oriented charts where appropriate
  - composition/part-to-whole views use composition-oriented charts only when the underlying data actually represents composition
  - score/progress/threshold displays use a component that makes the metric legible instead of forcing it into an arbitrary chart shape
- page work preserves truthful route content and existing runtime semantics unless Phase 1 explicitly classifies a route-content mismatch that must be resolved in the frontend layer

### `R5A` Choose graph types by data semantics and readability, not by mockup mimicry alone

Description:
The Paper runtime pages remain the visual/layout authority, but graph-type choice must still be justified by the actual runtime data shape and by ease of understanding for the user.

Acceptance criteria:
- Phase 1 inventories chart-bearing pages and records the data shape each graph represents:
  - time series
  - categorical comparison
  - ranking
  - composition
  - distribution
  - score/progress/threshold
- Phase 2 records the selected Recharts component type for each materially changed graph surface and explains why that type is a better or equal fit for the data than the Paper specimen where they differ
- no graph is implemented as a purely decorative shape that obscures the metric or implies the wrong data semantics
- if the Paper specimen uses a visually appealing but semantically weaker chart type, the code implementation chooses the semantically stronger Recharts chart while preserving the surrounding design-system treatment
- telemetry and dashboard graphs prioritize rapid user comprehension of trend, comparison, or composition over exact visual mimicry of a suboptimal Paper sketch

### `R6` Remove hardcoded or stale route-local design drift where it conflicts with the shared design system

Description:
The Paper-driven design-system implementation is not complete if pages still rely on hardcoded colors, typography, or stale route-local primitives that bypass the shared system.

Acceptance criteria:
- routes and shared components touched by this run are audited for hardcoded styling that should instead use shared design-system tokens
- routes and shared components touched by this run are audited for stale visual contracts that conflict with the new Paper-driven design-system rules
- any changed route surface uses shared tokens/components unless Phase 2 explicitly documents a bounded exception and why no shared primitive update is possible
- changed chart, control, shell, and pill surfaces do not keep mixed-era styling within the same page

### `R7` Preserve route ownership, telemetry semantics, and truthful page content while restyling

Description:
This run updates frontend implementation fidelity, not the underlying runtime contract or route ownership model, unless a concrete mismatch must be documented and corrected.

Acceptance criteria:
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` remains truthful for changed Observe and analytics surfaces, or is updated in the same run if ownership or chart responsibility changed
- the restyle does not silently invent route content, fake telemetry states, or decorative placeholder data
- where the Paper runtime-page authority uses specimen content to communicate the live route, the implementation preserves truthful data-driven behavior and only adopts the visual/system treatment
- if a route needs a bounded frontend structure adjustment to match Paper while staying truthful, that adjustment is explicitly recorded in Phase 1 and Phase 2

### `R8` Verify both shared design-system conformance and route-level runtime-page conformance

Description:
The run must prove the new design-system implementation and the page-level frontend implementation both work.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict`
- every production-code slice in this run follows RED -> GREEN -> REFACTOR:
  - shared design-system authority changes
  - shared primitive/component changes
  - route-consumer changes where rendering, behavior, or route-model contracts change
- no production-code change to tokens, shared primitives, shell behavior, route layout, route styling, or route view-model behavior is accepted without preceding failing automated evidence
- RED evidence and GREEN evidence are recorded separately for each implemented slice before refactor/cleanup is accepted
- if a purely visual route change cannot be expressed with an existing automated assertion, Phase 2 must explicitly record the reason and define compensating verification instead of silently skipping test-first discipline
- Phase 2 maps each materially changed surface to at least one verification owner:
  - automated test
  - build check
  - end-to-end regression coverage
  - rebuilt-runtime browser verification
  - hybrid manual QA evidence
- automated coverage is added or updated where practical for:
  - shared design-system token/metadata authority
  - theme/bootstrap behavior
  - shared component primitives touched by the run
  - shared chart primitives and chart-selection helpers touched by the run
  - route-level consumers materially changed by the run
- changed route-consumer surfaces have focused automated coverage where practical for rendering, interaction, and route-model behavior changed by the run
- regression-sensitive user flows touched by the frontend rebuild are covered by end-to-end tests or by updates to existing end-to-end tests
- at minimum the runtime UI test suite and build pass after the implementation
- rebuilt-runtime startup/build validation is recorded and executed using the actual runtime path selected in Phase 2, not just a design-only preview path
- manual QA mode is `hybrid`
- Phase 5 records route-level browser evidence only after rebuilding the runtime UI and launching the rebuilt runtime stack
- the required browser evidence is gathered against the rebuilt runtime path, not only `vite` or a mock-only route preview
- browser verification covers, at minimum:
  - shared shell/header/sidebar/theme-toggle behavior
  - one representative page from each changed route family
  - at least one telemetry/chart-heavy page
  - at least one control/configuration page
  - at least one detail/ledger-style page if changed
- Phase 5 explicitly verifies that rebuilt-runtime functionality still works on changed surfaces, not just that pages visually resemble the Paper authorities
- browser QA exercises representative interactive flows on changed pages so the run can detect broken navigation, controls, filters, toggles, forms, selections, and page-to-page transitions introduced by the frontend rebuild
- Phase 5 explicitly checks that changed graphs:
  - use Recharts-backed runtime components
  - use a graph type appropriate to the data semantics
  - remain easy to understand in the shipped UI
- Phase 5 includes explicit visual verification that the implementation now follows:
  - the Paper design-system authority
  - the Paper runtime-pages authority
- final QA includes human sign-off because visual fidelity to the Paper artifacts is part of acceptance

## Out of Scope

- Editing the Paper file itself
- A backend API redesign unrelated to frontend/design-system implementation needs
- Replacing the route architecture wholesale with a new information architecture
- Inventing new runtime routes not represented in the existing runtime/Paper route set
- Treating chat-only instructions as a replacement for the Paper artifacts once this spec exists

## Expected Product Paths

Likely touched paths, subject to Phase 1 findings:

- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/root.tsx`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/theme.ts`
- `role-model-router/apps/runtime-ui/app/lib/theme.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `role-model-router/apps/runtime-ui/app/components/page-primitives.test.tsx`
- `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
- `role-model-router/apps/runtime-ui/app/components/themed-select.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-config.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
- `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`
- `role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx`
- `role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-choose.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-peer-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-llama-swap-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-policy.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-swap.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-logs.tsx`
- `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
- `role-model-router/apps/runtime-ui/app/routes/studio-audio.tsx`
- `role-model-router/apps/runtime-ui/app/routes/studio-rerank.tsx`
- `role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`

## Verification Floor

Phase 4 must choose exact changed-path commands, but the minimum expected verification includes:

- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- any changed-path focused test commands selected in Phase 2 for shared primitives, route view models, and route consumers
- end-to-end regression commands covering the rebuilt runtime flows affected by the run
- rebuilt-runtime startup/build validation sufficient to serve the runtime UI from the actual runtime path
- if runtime rebuild or startup requires a repo-standard validator or packaging path, Phase 2 must record the exact command path and Phase 4/5 must show the evidence
- browser verification on the rebuilt runtime for representative pages across the route families changed in the run
- hybrid manual QA with human sign-off after rebuilt-runtime browser evidence is captured
- explicit visual verification of shared shell, theme toggle, pills, controls, typography, and chart treatment against the Paper authorities

## Phase Receipt Expectations

- `00-worktree.md`
  - proves isolated worktree creation, baseline branch/commit, normalized diff basis, and runtime-ui test/build baseline
- `01-as-is.md`
  - inventories current drift between shipped runtime UI, repo design-system authority, and the two Paper authorities
  - inventories chart-bearing pages, their current graph implementations, and any Paper-vs-data-semantic mismatches in graph choice
- `02-to-be-plan.md`
  - maps each `R#` to concrete shared-design-system changes first and route-consumer updates second
  - maps materially changed surfaces to automated, build, end-to-end, rebuilt-runtime browser, and manual-QA verification owners
  - records the exact rebuilt-runtime validation/start path that Phase 4 and Phase 5 must execute
  - records graph-by-graph Recharts component choices and any justified departures from the Paper specimen's exact chart type
- `03-implementation-summary.md`
  - records strict TDD RED and GREEN evidence for shared token/primitive work, chart-primitive work, and route-family adoption work
- `04-test-summary.md`
  - records design-system test/build evidence, changed-path route-consumer verification, chart-selection/graph-component verification, end-to-end regression evidence, and rebuilt-runtime build/start validation
- `05-manual-qa.md`
  - records rebuilt-runtime browser evidence and human sign-off that the runtime UI now aligns with the Paper design-system and runtime-page authorities while using understandable, semantically appropriate Recharts graph types and preserving working frontend functionality

## Lock Readiness Notes

- This artifact has explicit user approval and should be locked before Phase 0 begins.
- The design-system-first sequence is now explicit in repo-owned requirements.
- The Paper design-system board and runtime-pages page are now explicit upstream authorities for the run.

## Coverage Gate

Coverage: PASS

This requirements artifact captures the exact user ask as repo-owned requirements: consume the Paper design-system authority first, rewrite the repo-owned design-system contract and shared primitives to match it, and only then update the actual runtime pages to match the Paper runtime-pages page. It also names likely touched frontend surfaces, verification expectations, route-family coverage, strict-TDD obligations, rebuilt-runtime browser-verification obligations, and the boundary that this run updates code according to Paper rather than editing Paper itself.

## Approval Gate

Approval: PASS

This artifact has explicit user approval and is ready to be locked as the Phase 0 input for run 60.
