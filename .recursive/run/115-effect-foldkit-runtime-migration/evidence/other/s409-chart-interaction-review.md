# S409 — independent review: S408 Overview chart interaction

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 4 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/chart-interaction.ts` | `7A941B5AB71F0E8DA826329A603F3C4CA4F1B00BE763E192BBAF7624F9F27D4F` | 2488 |
| `src/message.ts` | `8028FCB119FFA0CF5294C5FF566B0DEC62C83CC152F28EF6F6A8C3D2FD997915` | 12494 |
| `src/model.ts` | `072AA6377D54E0300DBEA9E4CE6DA3BDFED0777F7C61D2B8DC3E0E036CC26492` | 2210 |
| `src/update.ts` | `9C5F7131F9495132B3A4D77C4A90EC83F414291D1998533219B71F8987C2E58F` | 51433 |
| `src/view.ts` | `BD6FFE23403639A53411D436AE186EC6BA47C37269B485AE41A42B2B1E340E24` | 71242 |
| `packages/ui/src/foldkit-chart.ts` | `A9F9A4C0DAF7A2D419F1E7080DA254F4E5BC4208472D3279514E708A37651A9E` | 23228 |
| `test/s408-chart-interaction.test.ts` | `A86335DB975DA3BBAFF9E9ECBA5D834BAFC28D70D721C799251A48CE2BC0918D` | 3760 |

All match. Affected 4 files: **24/24 pass**; UI tsc exit 0.

## Q1 — Tooltip/toggle wiring: PASS

The Overview token chart passes `interaction` with `hiddenSeriesIds`, `tooltip`, `onShowPoint`, `onHideTooltip`, `onToggleSeries` and `onPointKeyDown` from the route-scoped state (`view.ts:663-676`). The primitive attaches click/mouseenter show and legend `AriaPressed`/OnClick toggle to real elements (`foldkit-chart.ts:492-518,572-615`); the tooltip node renders from the interaction state (`:523-545`). This is the real card, not a dead primitive. PASS.

## Q2 — Escape/Enter/Space: PASS

`chartPointKeyAction` maps Escape→hide, Enter/Space→show (`foldkit-chart.ts:97-100`); the token card maps hide to `ChartTooltipDismissed` and show to `ChartPointShown` (`view.ts:667-670`); focusable points attach `OnKeyDown` (`foldkit-chart.ts:496-515`). The mapping test covers all keys (`s408:20-26`). PASS.

## Q3 — Honest status mapping: PASS

`chartStateForReadback` maps idle/loading→loading, error→error+reason, empty→empty, ok→ready (`chart-interaction.ts:65-72`); the test asserts all five statuses (`s408:52-59`). The dashboard's loading/error/empty branches return before the token card, so the ready branch is the only chart render and is not double-handled (`view.ts:626-635`). PASS.

## Q4 — Route-change cleanup: HOLD

The helper `chartInteractionForRoute` correctly clears the tooltip and bumps the token when given a different routeTag (`chart-interaction.ts:28-35`), and the unit test calls it directly with `"Models"` (`s408:43-50`). But **no route/navigation update transition invokes it**: the only call sites in `update.ts` are `ChartPointShown`/`ChartTooltipDismissed`/`ChartSeriesToggled` for the current route (`:1029-1039`), and the view calls it with the hard-coded `"Index"` (`view.ts:663`). A navigation from Index to another route and back leaves `model.chartInteraction` unchanged with `routeTag:"Index"`; the view returns the old state (same tag) with the old tooltip and token, so the tooltip can reappear and the late-message fence is not actually bumped. Required: call the route-scoped reset in the navigation/route-change transition (or derive/store on every route change) and test it through `shellUpdate` with a real route change, not only the helper.

## Q5 — RED repair: PASS with a qualification

The frozen product/test hashes match the landed bytes. `git cat-file` shows HEAD has no `src/chart-interaction.ts` and no s408 test; the test imports the missing module, so the claimed RED is a legitimate pre-implementation module-resolution failure, and the landed copy is byte-identical per the hashes. It is module-level RED rather than behavioral pre-slice RED; acceptable per the disclosure, not a substitute for the missing route-change integration test.

## Q6 — Run: PASS

4 files **24/24 pass**; UI tsc exit 0.

## Q7 — Lint: PASS

anti_slop_lint reports no findings for s408, chart-interaction.ts or foldkit-chart.ts.

## VERDICT: HOLD (1 integration repair)

1. **Wire route-change cleanup into the actual navigation/route transition and test it through the shell update.** The helper is correct but currently only exercised directly; returning to Index can repaint a stale tooltip and the token never advances on navigation, so the route-change claim is not delivered.

No product file was modified; no commit made.

## Final route-transition verification — PASS

Final hashes: update D445312359666F6695AFEB77D611899B77386411F2D8D96F2751CED5CCDD7216 (51812 B); s408 test 6D4956DD48187046DFBBEBAB2F985F4C5C6DED457283E83BF179F09BB63B1974 (4874 B). 4 files **25/25**; UI tsc 0; lint 0.

- `navigateToRoute` computes `chartInteractionForRoute(model.chartInteraction, route._tag)` once and every branch (Diagnostics, Observability, Studio, control, readback, fallback) carries that value into the model (update.ts:196-326). `ChangedUrl` goes through `navigateToRoute` (update.ts:401).
- The integration test drives `Message.ChangedUrl` from Index to Models and back through `shellUpdate`, asserting routeTag/current tooltip null and tokens 1 then 2 (s408:80-94). This is the real navigation path, not the helper-only test.
- The original helper/tooltip/keyboard/status tests remain green; 25/25 and lint pass.

**FINAL VERDICT: PASS** — the route-change cleanup is now integrated and behaviorally tested; no remaining numbered items. No product file was modified; no commit made.

