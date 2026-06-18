Run: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
Phase: `05 MANUAL QA upstream-gap addendum for 02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-06-18T10:54:47Z`
LockHash: `eaad8fcc9bc84f594b7d1d9c34739bb4efc04a0a1934b77acb40d40c2ebdda6f`
Inputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/02-to-be-plan.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/03-implementation-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/components/*`
- `/role-model-router/apps/runtime-ui/app/routes/*`
Outputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-03.md`
Scope note: This addendum records the Phase 5 design-system audit gap discovered after chart and route verification. It amends the locked plan by requiring a systematic Apple-theme token cleanup before Phase 5 can close.

## TODO

- [x] Capture every blocking design-system finding from the route/component audit
- [x] Map findings to run-49 requirements
- [x] Define strict TDD coverage for design-token adherence
- [x] Define implementation plan by design-system layer before route cleanup
- [x] Define rebuilt-runtime browser verification after implementation

## Gap Summary

The run-49 analytics implementation now renders charts on `/app`, `/app/observe/requests`, and `/app/observe/routing`, but the current production UI still leaks pre-Apple-theme styling primitives across routes and components.

The implementation must repair these gaps before Phase 5 sign-off:

1. Raw semantic Tailwind colors remain in production route code.
2. Runtime cards, modals, chips, and detail panels still use `rounded-none`.
3. Production route/component code still relies broadly on `font-medium`, which maps to weight `500`; the Apple reference allows `300`, `400`, `600`, and `700`, with `400` and `600` as the normal operator UI weights.
4. Primary foreground-on-accent color is still hardcoded as `text-white`; the design system lacks an explicit `--rm-on-primary` token even though the Apple reference defines an on-primary white role.
5. Some chart internals use literal tick sizes and bar radii instead of chart-specific design-system constants.
6. Decorative card-interior dividers remain in request detail and benchmark areas where the approved direction prefers spacing/surface grouping over divider rules.

## Requirement Impact

- `R5`: Directly impacted. The shared chart/design-system foundation is incomplete while production code can still bypass tokens, radii, and type roles.
- `R6`: Directly impacted. `/app` charts render, but chart primitives still need tokenized chart typography and geometry.
- `R7`: Directly impacted. `/app/observe/requests` charts and request detail must use the same Apple-theme primitives.
- `R8`: Directly impacted. Evidence routes must remain visually consistent without decorative divider drift.
- `R9`: Directly impacted. Repairs require strict RED/GREEN tests before production changes.
- `R10`: Directly impacted. Browser verification must be repeated on rebuilt runtime after design cleanup.

## Implementation Plan

### SP1: Strengthen Design-System Token Contract

Add or document the missing `--rm-on-primary` token in:

- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`

Primary filled controls and active theme-toggle segments must use `text-[var(--rm-on-primary)]`, not `text-white`.

### SP2: Add Design-System Regression Tests First

Update `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` with failing tests that scan production route/component sources and assert:

- no raw semantic Tailwind color classes like `text-red-600`, `text-amber-700`, `border-red-500`
- no production `rounded-none` in runtime UI route/component source
- no production `text-white` in runtime UI route/component/source primitives
- no production `font-medium` in runtime UI route/component source
- chart primitives expose shared chart geometry/type constants instead of hardcoded Recharts tick/radius values

RED evidence must be captured before any production repair.

### SP3: Repair Shared Primitives Before Route Code

Update `/role-model-router/apps/runtime-ui/app/lib/design-system.ts` with shared helpers for:

- `on-primary` foreground
- strong text role using `600`
- caption/utility labels using `400`
- rounded panel/list/control variants
- chart tick font sizes and bar corner radii

Route and component code must consume the shared helpers instead of re-declaring local utility stacks when practical.

### SP4: Replace Route/Component Styling Leaks

Repair all production findings:

- replace raw semantic Tailwind colors with `--rm-error`, `--rm-warning`, or shared primitives
- replace every non-checkbox/non-native `rounded-none` with `--rm-radius-*` tokens or existing panel/list primitives
- replace `font-medium` with `font-semibold`, `font-normal`, or shared class roles according to the Apple reference
- replace decorative interior card dividers in benchmark/request-detail with spacing, metadata grids, or rounded panel grouping

Checkbox native controls may keep platform-native shape only if no `rounded-none` utility remains in source.

### SP5: Re-run Tests and Rebuild Runtime

Required automated validation:

- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`

If broader validation is already running for addendum 02, this addendum may cite that rebuilt runtime, but it must still prove the rebuilt UI contains these design-system repairs.

### SP6: Browser Verification After Rebuild

After rebuilding/restarting the runtime, verify in the in-app browser:

- `/app` renders charts and shell with Apple-theme tokens
- `/app/observe/requests` renders chart band and request ledger without styling regressions
- `/app/observe/routing` renders routing analytics charts without styling regressions
- `/app/remote/providers` select fields and controls still use themed field styling
- sampled evidence/config routes still render without raw-color, hard-radius, or duplicate-header regressions:
  - `/app/models`
  - `/app/models/benchmark`
  - `/app/router`
  - `/app/local/endpoints`
  - `/app/connect`

## TDD Requirements

TDD Mode: `strict`

RED evidence:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-03-design-system-token-contract.log`

GREEN evidence:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-03-design-system-token-contract.log`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-03-runtime-ui-build.log`

## Browser Evidence Requirements

Browser route sweep evidence:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-03-route-sweep.json`

The route sweep must record shell presence, error signal absence, chart counts on chart routes, and visible source snippets sufficient to prove pages loaded after rebuild.

## Coverage Gate

- [x] Covers raw semantic Tailwind color leaks
- [x] Covers hard-radius `rounded-none` leaks
- [x] Covers typography weight drift
- [x] Covers missing on-primary token
- [x] Covers chart primitive tokenization
- [x] Covers route-level browser verification after rebuild

Coverage: PASS

## Approval Gate

- [x] Addendum is scoped to Phase 5 upstream gap repair
- [x] Addendum does not edit locked prior-phase artifacts
- [x] Addendum requires strict TDD before production edits
- [x] Addendum defines rebuilt-runtime browser verification

Approval: PASS

## Implementation Receipt

Implemented repairs:

- Added `--rm-on-primary` to the runtime UI CSS token set and documented it in `DESIGN_SYSTEM.md`.
- Replaced hardcoded `text-white` foreground usage in primary controls and theme-toggle active state with `text-[var(--rm-on-primary)]`.
- Added shared chart axis tick and bar-radius primitives in `app/lib/design-system.ts`.
- Updated telemetry chart components to consume shared chart typography and geometry primitives instead of local literal Recharts tick/radius values.
- Removed production route/component `font-medium` usage and replaced it with supported Apple-reference weights.
- Removed production `rounded-none` usage, using panel/pill/small-radius tokens by context.
- Replaced raw semantic Tailwind colors in benchmark and workbench routes with `--rm-warning` and `--rm-error`.
- Removed decorative request-detail and benchmark interior dividers in favor of rounded metadata tiles and spacing.

Verification:

- RED: `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-03-design-system-token-contract.log`
- GREEN focused design-system test: `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-03-design-system-token-contract.log`
- GREEN runtime UI suite: `corepack pnpm --filter @role-model-router/runtime-ui test` passed `146` tests.
- GREEN runtime UI build: `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-03-runtime-ui-build.log`
- Browser route sweep: `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-03-route-sweep.json`

Browser result:

- `36 / 36` swept runtime routes loaded with no runtime-error signal, no loading routes, and no targeted raw-class leaks.
- `/app` rendered `6` Recharts chart wrappers.
- `/app/observe/requests` rendered `7` Recharts chart wrappers.
- `/app/observe/routing` rendered `6` Recharts chart wrappers.
