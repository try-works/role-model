# S574 — reference UI rebase committed

The owner rejected the ported UI against the 0.0.20 build on :3456 and directed that the stories/scenes be based on that reference and the UI built to match.

## Diff basis
`git diff 8bc397b2..HEAD` for the shell/overview rebase (3d5885f4, 15809505, 6d3bfd4a, 72d26e01, 783b8d3f) and this commit for the page ports and test retargets.

## What changed
- Shared reference primitives: src/features/layout/reference.ts (Card/header/DataTable/filter bar/select/card-section), src/features/s563-layout.ts + s563-pages.ts for the Router/Observe/Connect families.
- Every family page rebuilt to the captured :3456 structure: Learning (6), Models (3), Studio (5 tabs), Local (7), Router (7), Observe (7), System (7), Connect (2), Remote (2).
- Runtime config is its own reference route: AppRoute.RuntimeConfig at /runtime/config (System section, title "Runtime config"), auto-loaded on entry (readbackKeyForRouteTag + readPlanForRoute), legacy /control/runtime-config and /app/system/runtime-config redirect there; /runtime keeps the four reference cards.
- Reference page titles for all routes (S567 title scene, 46/46).
- Tests retargeted to reference behavior instead of the invented UI: s256/s76a runtime-config auto-load semantics, s269 route resolution to /runtime/config, s380 models-roles state surfaces alongside always-rendered cards, s534/s540 reference copy and title-case table headers, s26b/s26h/s26n reference shell text.

## Gates
- UI tsc --noEmit: 0
- Full UI suite: 76 files / 811 tests pass (the restored s76a in-flight invariant adds one)
- S565 reference story scene: 40/40 (sections in order, table columns, named controls from the :3456 capture)
- S567 reference titles: 46/46
- S566 update stories: 5/5

## Honest limits
- The reference story capture ran against the operator's :3456 instance at its current data state; data-dependent rows are asserted by column sets and controls, not row content.
- Providers' custom provider/model picker is structurally rebuilt around the existing control forms, not a line-for-line port of the picker widget. Queue job detail remains an honest empty table (the queue readback exposes no job rows). Candidates/decisions use the reference card and table structure but keep the port's card statistics rather than the reference MetricStrip. Observe routing renders a single 12-span chart instead of the reference multi-chart breakdown.
- Shell geometry is browser-measured: aside width 224 (w-56), header height 48, content track 1216, ten flat 32px nav rows. The unit scene asserts the class contract; it does not assert pixel geometry.
- Independent review S575 (evidence/other/s575-reference-ui-review.md) returned HOLD on test-quality items; fixes are recorded in evidence/other/s576-review-fixes.md and the review was re-requested.