Run: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
Phase: `05 MANUAL QA upstream-gap addendum for 02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-06-18T10:54:47Z`
LockHash: `2a9c81df5deee20ec14c7de6305d6b09cc02c7f18552d674162217b120383edf`
Inputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/02-to-be-plan.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/03-implementation-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
- `/role-model-router/apps/runtime-ui/app/root.tsx`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
Outputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This addendum amends the locked Phase 2 plan after Phase 5 QA exposed run-48 design-system regressions, shared route-stability failures, and incomplete route verification. It defines the required remaining repair order, failing-test slices, and rebuilt-runtime browser proof needed before this run can close.

Implementation note: Addendum 01 has been implemented through agent-operated Phase 5 QA. See `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md` for the current stop point and operator QA request.

## TODO

- [x] Record the specific plan gaps discovered during QA and audit
- [x] Convert the regression analysis into explicit remaining implementation steps
- [x] Add route-stability repair before route-local UI cleanup
- [x] Add stricter failing-test requirements for the shared regressions
- [x] Add a complete rebuilt-runtime route sweep requirement
- [x] Pull theme bootstrap and regression-test surfaces back into the repair scope
- [x] Preserve the original run-49 chart contract explicitly rather than only implicitly
- [x] Add Apple-reference anti-drift rules for the remaining UI repair work
- [x] Map the amendment back to affected run-49 requirements
- [x] Implement the addendum repairs with strict RED/GREEN evidence
- [x] Rebuild the runtime and complete agent-operated browser route verification

## Implementation Receipt

Changed product surfaces:

- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Implemented repairs:

- Restored the approved run-48 product shadow token and shared Apple-theme panel radius contract.
- Removed shell header eyebrows and the sidebar theme eyebrow.
- Added a shared `SelectField` primitive and moved provider and analytics selectors onto the shared themed control layer.
- Removed the redundant provider onboarding explainer and kept only compact provider provenance inside the existing selected-provider surface.
- Stabilized shell header actions and local peer refresh state to avoid route-level render loops.
- Added a QA-safe runtime vendor startup mode so seeded runtime config can be loaded without blocking the QA bridge on local vendor binaries.
- Seeded a placeholder `MOONSHOT_API_KEY` for local QA only when no real value exists, preserving env-backed credential coverage while keeping browser QA self-contained.
- Wired benchmark APIs through the QA bridge so benchmark routes no longer render API 404 failures.

Verification evidence:

- RED:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-design-system-red.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-shell-eyebrow-red.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-qa-vendor-startup-red.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-01-qa-startup-env-red.log`
- GREEN:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-design-system-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-shell-eyebrow-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-design-system-after-qa-fix-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-build-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-qa-env-build-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-benchmark-api-build-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-01-host-bridge-qa-options-green.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/build/addendum-01-runtime-ui-build-03.log`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/build/addendum-01-runtime-ui-final-build-green.log`
- Browser:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/browser-route-sweep-3456-final.json`
  - Result: `55 / 55` routes passed on rebuilt `http://127.0.0.1:3456`.
  - Representative screenshots are saved under `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/`.

Remaining phase status:

- Phase 5 agent QA is complete.
- Operator manual QA is still required before moving to phases 6-8.

## Gap Summary

The locked Phase 2 plan correctly covered analytics persistence, the generic query API, and chart route ownership, but it under-specified four remaining obligations that became visible during implementation and QA:

1. It did not explicitly preserve the approved run-48 Apple-theme shell contract while adding analytics. The implementation therefore drifted in typography, chrome weight, panel treatment, selector styling, and shared control behavior.
2. It did not isolate shared route-stability risks before route-level work. QA evidence indicates at least one shared shell-header action pattern and one route-local refresh pattern can trigger unstable renders or broken route loads.
3. It did not require a complete route sweep of the rebuilt runtime. Several routes broke or degraded after analytics work even though the charted routes partially rendered.
4. It did not make the run-48 visual contract concrete enough at the token/control level for charts and non-chart routes to stay aligned to the Apple reference.
5. It did not pull all run-48 design-system ownership surfaces back into scope for the repair. Theme bootstrap, route metadata/tests, and browser-chrome theme behavior were still too implicit.
6. It did not preserve the full original run-49 chart contract explicitly enough during the regression-repair phase, especially around chart states, legend readability, deterministic series assignment, and route-specific chart obligations.

This addendum amends the effective plan for the remainder of run 49. The remaining work is not "finish charts"; it is "repair the shared runtime UI contract and route stability while preserving valid telemetry analytics delivery."

## Discovery Evidence

### Design-system regression evidence

- Phase 5 browser QA found the runtime shell visually weaker than the approved run-48 Apple baseline, especially in typography hierarchy, panel treatment, control chrome, and provider-form styling.
- The current runtime UI contract no longer reliably preserves the approved shell behaviors from run 48:
  - soft shared panels and restrained product shadow
  - quieter shell chrome and rail states
  - shared typography roles rather than scattered generic utility classes
  - repo-owned themed selectors instead of raw native select styling
- The current implementation also allowed route-local chart/control styling to diverge from the shared design-system layer instead of consuming it.
- Several current implementation surfaces still show concrete drift from the approved contract:
  - `app.css` still carries `--rm-shadow-product: 0 24px 80px rgba(0, 0, 0, 0.22)` instead of the approved run-48 token value
  - route-local code still contains `rounded-none` and generic utility typography on shared UI surfaces
  - native `select` skinning remains active in the provider flow instead of a repo-owned themed selector primitive
  - the redundant LiteLLM onboarding explainer remains present on the provider route even though it is not part of the approved shell grammar

### Shared route-stability evidence

- `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
  - `usePageActions` currently writes `actions` directly in `useLayoutEffect` and depends on the incoming `actions` node identity.
  - This is a shared shell risk because route renders that recreate action nodes can repeatedly set shell state and destabilize route loads.
- `/role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
  - `refresh` depends on `healthStatus`, and `useEffect` depends on `refresh`.
  - `refresh()` mutates `healthStatus`, which can recursively retrigger the effect and destabilize the route.

### Route-sweep evidence

Browser verification on the rebuilt runtime exposed broken or degraded routes that the original plan did not require to be swept explicitly.

Known-good or loading-as-intended during the earlier QA passes:

- `/app`
- `/app/local/choose`
- `/app/local/llama-swap/swap`
- `/app/local/llama-swap/policy`
- `/app/local/llama-swap/logs`
- `/app/remote/providers`
- `/app/models`
- `/app/models/roles`
- `/app/observe/requests`
- `/app/observe/routing`
- `/app/connect`
- `/app/connect/upstream`
- `/app/studio/chat`

Also present in the live route inventory and therefore required in the final sweep even if they were not the focus of earlier QA:

- `/app/studio/audio`
- `/app/studio/rerank`
- `/app/local/models`
- `/app/router/config`
- `/app/router/candidates`
- `/app/router/decisions`
- `/app/router/decisions/:requestId`
- legacy redirects under `/app/local/*`, `/app/control/*`, `/app/endpoints/*`, `/app/integrations/*`, and `/app/observe`

Broken during QA:

- `/app/local/endpoints`
- `/app/local/peer-models`
- `/app/local/llama-swap/models`
- `/app/local/llama-swap/matrix`
- `/app/studio/images`
- `/app/studio/advanced`
- `/app/router`
- `/app/router/strategy`
- `/app/observe/activity`
- `/app/observe/logs`
- `/app/connect/downstream`
- `/app/system/session-readiness`
- `/app/system/runtime`
- `/app/system/runtime-config`
- `/app/system/peers`

Degraded during QA:

- `/app/models/benchmark`
  - route rendered but surfaced a `404` backend gap instead of an intentional bounded state

## Amended Remaining Work

### 1. Restore the approved run-48 Apple shell contract first

Before any further chart-route polish or route-specific cleanup, re-establish the shared runtime UI contract across:

- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/root.tsx`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`

Required restoration items:

- restore the approved product shadow token:
  - `--rm-shadow-product: 0 3px 5px 30px rgba(0, 0, 0, 0.22)`
- restore soft shared panel radii and shared panel primitives; do not leave chart or shell surfaces on squared or near-squared utility defaults
- restore the approved typography hierarchy from the Apple reference:
  - `SF Pro` first, `Inter` first fallback, then Apple/system fallbacks
  - explicit display/body/caption/utility/control roles rather than route-local `text-*` drift
- preserve the run-48 quiet shell treatment:
  - restrained nav chrome
  - restrained panel borders/hairlines
  - no Swiss-style heavy rules or visually dominant separators
- reconcile the written design-system contract in `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` with the approved run-48 Apple baseline and the actual repaired UI implementation
  - remove any remaining Swiss-era or lower-priority contradictory shell guidance
  - make the runtime shell, shared panel, typography, control, and selector rules authoritative in one place
- restore the run-48 theme bootstrap contract:
  - `Light` and `Dark` only
  - system preference determines initial default only
  - persisted user choice overrides later system changes until explicitly changed again
  - browser-chrome theme metadata follows the active persisted theme
- restore the run-48 regression-test contract:
  - `design-system.test.ts` must protect the shared token contract, theme behavior, status-pill rule, and authority language
- keep theme behavior inside the shared shell contract, not page-header one-offs
- keep chart styling inside the shared design system instead of a separate analytics mini-theme

Apple-reference anti-drift rules for this slice:

- keep one interactive accent family only:
  - `--rm-accent`
  - `--rm-accent-focus`
  - `--rm-accent-on-dark`
- do not reintroduce decorative gradients, neon accents, or decorative color washes
- do not add shadows to shell chrome, cards, buttons, selectors, or general UI containers
- reserve the product shadow token for the narrow product/surface role already approved by run 48
- keep utility controls compact and restrained
- keep pill CTA, field, chip, and utility-button grammars consistent with the Apple reference:
  - pill CTA: `11px 22px`
  - utility control: `8px 15px`
  - field height: `44px`
  - pill/field radii from the approved token set
- if pressed-state scaling is used, it must be shared and consistent rather than route-local

### 2. Repair shared route stability before route-local page fixes

Treat shared route stability as the next mandatory slice after the shell-contract restoration.

Required repair targets:

- `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
  - stabilize `usePageActions` so route-local ReactNode identity churn does not continuously rewrite shell state
  - use the run-48-stable pattern or an equivalent repo-owned stable-state approach
- `/role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
  - break the `healthStatus -> refresh -> useEffect -> setHealthStatus` feedback loop
  - preserve accurate peer-health refresh semantics without self-triggering renders

This shared-stability slice must be completed before treating individual broken routes as isolated page bugs.

### 3. Repair route-local regressions and provider-form drift

After the shared shell and shared route-stability slices are green:

- restore the approved provider-form contract in `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - replace raw native-select skinning with a repo-owned themed selector or shared select primitive
  - keep dropdown trigger, panel, chevron, spacing, and theme behavior aligned in both light and dark modes
  - remove redundant explanatory chrome that is not part of the approved shell grammar
- remove remaining design-system token leaks and raw semantic utility usage from route-local implementations, especially where route code still bypasses shared Apple-theme tokens or shared control primitives
  - eliminate raw semantic color utility usage in chart and benchmark-related route code
  - eliminate route-local border/background/text combinations that conflict with the repaired dark-mode and light-mode control contract
  - eliminate remaining `rounded-none` usage on shared runtime panels, shared chips, modal shells, or form-control wrappers unless the component is intentionally full-bleed by contract
  - replace generic utility typography drift such as route-local `text-sm`, `font-medium`, and ad hoc heading scales on shared UI surfaces with explicit shared type roles where those surfaces participate in the shared design system
- repair route-local rendering or data-loading failures discovered in the route sweep
- preserve valid run-49 analytics additions while removing visual and behavioral regressions introduced during those additions

### 4. Reconcile charts back onto the shared design system

Charts remain in scope, but chart work must now be treated as a consumer of the repaired design system rather than an independent styling layer.

Required chart-contract amendments:

- charts must consume shared typography roles for:
  - axes
  - legends
  - tooltips
  - helper copy
- chart surfaces must use the same repaired shared panel primitive as the rest of the shell
- the broader chart palette from the requirements remains valid, but default chart usage must stay restrained and Apple-compatible
- the original run-49 chart token contract remains mandatory:
  - semantic chart tokens for status/cost/cache/success/failure meaning
  - categorical chart tokens for multi-series identity
  - light/dark calibrated stroke, fill, and opacity rules
- breakdown legends for endpoints, models, providers, roles, and strategies must remain explicit and human-readable
- when a breakdown dimension has too many series, the repaired implementation must still preserve the original readability guard requirement such as top-N plus `Other`, searchable legend overflow, or equivalent bounded behavior
- deterministic series-color assignment remains mandatory so the same provider/model/role/strategy/source tends to keep the same token across charts where feasible
- chart containers must still preserve explicit or minimum-height sizing so responsive measurement remains stable on first render
- the original run-49 loading and no-data rules remain mandatory:
  - no fake sample telemetry
  - stale-while-refreshing where applicable
  - layout-stable loading skeletons
  - honest empty/unavailable states by route
- chart additions may not reintroduce route-local spacing, radius, border, or type drift
- chart routes must still satisfy the original route-specific responsibilities from run 49:
  - `/app` remains posture-oriented and compact
  - `/app/observe/requests` remains the primary analytics workbench above the canonical ledger
  - `/app/observe/routing` remains the dedicated routing analytics surface
  - `/app/observe/activity`, `/app/observe/logs`, and `/app/observe/requests/:requestId` remain evidence-oriented and only gain bounded contextual charting when justified

### 5. Rebuild and perform a full route sweep on the rebuilt runtime

The rebuilt runtime route sweep is now a required closeout step, not an optional QA extension.

The sweep must derive its route list from:

- `/role-model-router/apps/runtime-ui/app/routes.ts`

Verification obligations:

- every route under `/app` must be opened on the rebuilt runtime
- each route must be classified as:
  - renders correctly
  - renders with intentional bounded empty/degraded state
  - fails and requires repair
- no route may be accepted merely because the shell frame appears; route-local content must load without React error-boundary failure or runaway refresh behavior
- key shared-surface routes must be checked in both light and dark themes

Required route-verification matrix:

| Route classification | Routes | Required acceptance result |
| --- | --- | --- |
| Overview and primary analytics | `/app`, `/app/observe/requests`, `/app/observe/routing` | renders with populated real data, repaired Apple-theme shell styling, correct chart legends/controls, and no layout drift |
| Previously known-good config or setup routes | `/app/local/choose`, `/app/local/llama-swap/swap`, `/app/local/llama-swap/policy`, `/app/local/llama-swap/logs`, `/app/remote/providers`, `/app/models`, `/app/models/roles`, `/app/connect`, `/app/connect/upstream`, `/app/studio/chat` | still render correctly after regression repair; no visual or route-stability regressions introduced |
| Additional live routes from `routes.ts` | `/app/studio/audio`, `/app/studio/rerank`, `/app/local/models`, `/app/router/config`, `/app/router/candidates`, `/app/router/decisions`, `/app/router/decisions/:requestId` | explicitly verified and recorded; must respect the repaired shell contract and route-local content must load without error loops or broken layout |
| Previously broken routes | `/app/local/endpoints`, `/app/local/peer-models`, `/app/local/llama-swap/models`, `/app/local/llama-swap/matrix`, `/app/studio/images`, `/app/studio/advanced`, `/app/router`, `/app/router/strategy`, `/app/observe/activity`, `/app/observe/logs`, `/app/connect/downstream`, `/app/system/session-readiness`, `/app/system/runtime`, `/app/system/runtime-config`, `/app/system/peers` | must render without error-boundary failure or runaway loading behavior and must respect the repaired shared shell/design-system contract |
| Previously degraded route | `/app/models/benchmark` | must either fully recover or present an intentional bounded degraded state; no unplanned `404` leakage or broken operator affordance |
| Legacy redirect routes | `/app/local/swap`, `/app/local/policy`, `/app/local/logs`, `/app/local/matrix`, `/app/local/peers`, `/app/control/providers`, `/app/control/routing-strategy`, `/app/control/runtime-config`, `/app/control/controller`, `/app/endpoints`, `/app/control/endpoints`, `/app/control/roles`, `/app/control/benchmark`, `/app/control/models`, `/app/observe`, `/app/endpoints/downstream`, `/app/integrations/downstream`, `/app/endpoints/upstream`, `/app/integrations/upstream`, `/app/control/session-readiness` | must redirect intentionally to the expected canonical route; no broken, looping, or mis-styled redirect states |

Each route in the matrix must be explicitly recorded in the Phase 5 QA artifact as pass, bounded degrade, or fail. General statements about "all routes looked OK" are not sufficient.

The final QA record must be route-complete against `routes.ts`, not only against the routes that happened to be manually noticed earlier.

## TDD Amendment

The locked Phase 2 plan already required strict TDD. This amendment makes the remaining RED-first slices explicit.

New mandatory failing-test slices:

1. shared shell-header action stability
   - add a failing test proving route action churn does not loop or repeatedly rewrite shell state
2. local peer refresh stability
   - add a failing test proving the route does not self-trigger refresh through `healthStatus` feedback
3. provider-form selector contract
   - add failing tests for repo-owned selector theming and layout behavior in light/dark modes
4. shared panel/token contract
   - add failing tests that the repaired panel/token primitives expose the approved run-48 shell contract instead of the regressed treatment
5. route-smoke coverage for the broken or degraded routes above
   - add focused failing smoke tests for representative route families so shared regressions are caught before browser QA
6. design-system contract reconciliation
   - add failing source or contract tests that protect the repaired shared shell/token contract in `DESIGN_SYSTEM.md`, shared design-system helpers, and selector/control primitives
7. token-leak prevention
   - add failing checks for representative route surfaces that previously bypassed shared Apple-theme tokens with raw semantic colors or route-local control styling
8. theme bootstrap and persistence
   - add failing tests for the `Light`/`Dark` bootstrap contract, persisted selection behavior, and browser-chrome theme alignment in `root.tsx` or the equivalent theme bootstrap layer
9. redirect route behavior
   - add focused smoke coverage for representative legacy redirects so route-sweep regressions do not hide behind incomplete manual browsing
10. chart-contract preservation
    - add failing tests or source-contract coverage for representative chart empty/loading behavior, deterministic chart config usage, and legend/readability guards where practical

TDD enforcement rules for the remaining work:

- every remaining repair slice must record:
  - the failing test command or test file
  - RED evidence location or output reference
  - the production files changed to turn the test green
  - GREEN evidence location or output reference
- no shared-shell, selector, route-stability, or route-smoke production edit may be treated as "small enough to skip RED"
- when a slice spans multiple files, the failing test must exist before the first production-file edit in that slice
- if a source-contract or snapshot-style test is used for a visual contract, it must fail for the pre-repair state first
- if a route defect is first discovered in-browser, the controller must still add or tighten automated coverage for that defect before calling the slice complete
- the final Phase 4 receipt must enumerate the RED/GREEN evidence per slice rather than only listing final passing suites

The remaining production work must proceed RED -> GREEN -> REFACTOR in that order. No "visual cleanup" exemption is allowed for the regression-repair slices above.

## Browser Verification Amendment

The locked plan already required populated-chart verification. This amendment adds the missing shell and route-verification contract.

Required rebuilt-runtime verification sequence:

1. rebuild the runtime after the regression-repair slices land
   - browser QA must run against the rebuilt runtime artifact, not only a dev server or hot-reloaded transient state
   - if additional fixes land after an earlier rebuild, rebuild again before final browser verification
2. verify the charted analytics surfaces still show generated telemetry correctly:
   - `/app`
   - `/app/observe/requests`
   - `/app/observe/routing`
3. sweep every route declared in `/role-model-router/apps/runtime-ui/app/routes.ts`
4. explicitly re-verify the routes that previously broke or degraded
5. verify shared shell behaviors:
   - typography hierarchy
   - centered layout without shell-width drift
   - no sidebar overflow or unconstrained shared controls
   - no mis-themed selectors
   - no reintroduced heavy divider-line treatment where the repaired contract removed it
   - no reintroduced shell/card/button chrome shadows outside the approved product-shadow role
   - no reintroduced third theme mode or system-mode UI affordance
6. verify light and dark themes for shared shell surfaces and provider selectors
   - verify persisted theme choice after reload
7. verify at least one narrow/mobile-width pass after the rebuilt runtime is running

Browser-verification evidence requirements:

- Phase 5 must record the exact rebuilt runtime entrypoint used for QA
- Phase 5 must record the rebuilt runtime URL and the rebuild command or launcher used
- Phase 5 must record route-by-route results against the verification matrix after the rebuild
- chart verification must include generated telemetry that visibly exercises:
  - local and remote series
  - cache-related metrics where supported
  - routing difficulty and strategy charts
  - cost and avoided-cost charts
- verification must confirm that populated chart legends, selectors, and empty/loading states are rendered from the rebuilt runtime, not only inferred from API payload inspection
- for routes previously called out as broken, degraded, or visually regressed, the browser QA record must include a concrete note of what changed and how the route now behaves after rebuild
- at least one post-rebuild reload pass must be performed to verify persisted theme selection and route stability are not artifacts of initial hydration only
- if any required route fails after rebuild, the run must loop back through implementation, rerun targeted automated tests, rebuild again, and repeat the browser verification for the affected routes before closeout

The run may not close on empty-state chart proof alone. It must prove both:

- populated telemetry charts still work
- the broader runtime shell and route set remain intact after the analytics changes

## Traceability

- `R4` -> `## Gap Summary`, `## Amended Remaining Work`, `## Browser Verification Amendment`
- `R5` -> `## Amended Remaining Work` sections 1 and 4
- `R6` -> `## Amended Remaining Work` sections 1 and 3, `## Browser Verification Amendment`
- `R7` -> `## Amended Remaining Work` sections 1 and 3
- `R8` -> `## Discovery Evidence`, `## Amended Remaining Work` sections 2, 3, and 5
- `R9` -> `## TDD Amendment`
- `R10` -> `## Discovery Evidence`, `## Browser Verification Amendment`

## Coverage Gate

- [x] the addendum states what the locked plan missed
- [x] the addendum records how QA and audit exposed the gap
- [x] the addendum specifies amended implementation steps for the remaining work
- [x] the addendum strengthens TDD obligations for the regression slices
- [x] the addendum adds full rebuilt-runtime route verification obligations

Coverage: PASS

## Approval Gate

- [x] the amended work order is explicit enough to guide the remaining implementation
- [x] the addendum preserves valid run-49 analytics scope while restoring the approved run-48 Apple shell contract
- [x] the remaining work now includes both rebuilt-runtime chart proof and full route-sweep proof

Approval: PASS
