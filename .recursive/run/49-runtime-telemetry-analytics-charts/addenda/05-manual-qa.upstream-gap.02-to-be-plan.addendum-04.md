Run: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
Phase: `05 MANUAL QA upstream-gap addendum for 02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-06-18T10:55:32Z`
LockHash: `502f290134a11ab1a65b2368ea03dff727b399ca13c89e9fed2f09526aab0dee`
Inputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-03.md`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Outputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-04.md`

Scope note: This addendum records the Phase 5 provider-dropdown QA gap. The trigger field had Apple-theme styling, but the opened native dropdown menu remained browser/OS-owned and did not adhere to the app theme.

## TODO

- [x] Record the Phase 5 provider dropdown theme gap
- [x] Define the shared custom select repair plan
- [x] Record TDD and browser verification evidence
- [x] Complete coverage and approval gates

## Gap Summary

`SelectField` still rendered a native `<select>`. CSS can theme the collapsed select control, but Chromium/Windows can render the opened option menu outside the page styling boundary. This made the actual provider/model dropdown list visually inconsistent with the Apple-theme runtime shell.

## Requirement Impact

- `R5`: Directly impacted. Shared frontend design-system primitives must own chart/control styling rather than relying on browser-native unthemeable surfaces.
- `R10`: Directly impacted. Phase 5 browser verification must prove the visible dropdown menu adheres to the rebuilt runtime theme.

## Implementation Plan

1. Add a failing design-system regression that requires `SelectField` to avoid native `<select>` and render an app-owned listbox with themed options.
2. Replace the shared `SelectField` implementation with a custom button/listbox primitive while preserving the existing `<option>` caller API used by providers and telemetry controls.
3. Style the popup with Apple-theme tokens:
   - surface/background: `--rm-surface`
   - border: `--rm-border-strong`
   - radius: `--rm-radius-panel`
   - selected fill/text: `--rm-accent` + `--rm-on-primary`
4. Keep basic accessibility:
   - trigger `aria-haspopup="listbox"`
   - trigger `aria-expanded`
   - popup `role="listbox"`
   - options `role="option"`
   - keyboard Escape and arrow/enter selection support
5. Re-run focused runtime-ui design-system tests, full runtime-ui tests, production build, and browser verification on `/app/remote/providers`.

## TDD Evidence

RED:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/addendum-04-themed-select-listbox-red.log`

GREEN:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-04-themed-select-listbox-green.log`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/addendum-04-runtime-ui-build.log`

## Browser Evidence

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-04-themed-select-browser.json`

Verified on `http://127.0.0.1:3456/app/remote/providers`:

- `main select` count is `0`
- provider popup rendered as `[role="listbox"]`
- provider popup had `231` `[role="option"]` rows
- popup background resolved to dark `--rm-surface`: `rgb(39, 39, 41)`
- popup border resolved to dark `--rm-border-strong`: `rgba(255, 255, 255, 0.18)`
- popup radius resolved to `18px`
- selected option used accent/on-primary colors
- selecting `Abacus` updated the trigger and dependent connection method, then closed the popup

## Coverage Gate

- [x] Covers native dropdown menu theme gap
- [x] Covers shared primitive repair rather than one-off provider CSS
- [x] Covers TDD RED/GREEN evidence
- [x] Covers browser verification of the actual opened dropdown menu

Coverage: PASS

## Approval Gate

- [x] Addendum is scoped to Phase 5 QA-discovered UI gap
- [x] Existing route callers keep the same `SelectField` API
- [x] Rebuilt runtime browser verification completed

Approval: PASS
