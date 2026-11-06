# S49a fix the layout: single shell, no debug artifacts, reference-like page structure (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The stylesheet is now loaded and the tokens match the reference, but the LAYOUT does not. I compared the two screenshots side by side:

- new: `evidence/visual-styled/new-client-styled.png`
- reference: `evidence/visual-styled/reference-styled.png`

## Defects visible in the screenshot (all must be fixed)

1. **Two sidebars / duplicated navigation**: a narrow left column with 'RUNTIME UI' and Overview/Diagnostics/Observability/Receipts/Queues..., and a second column repeating nav links, plus the MODELS/REQUESTS/CACHE/ROUTER/MODE block. The reference has ONE grouped sidebar (role-model / Overview, Studio, Local, Remote, Models, Router, Observe, Connect, System, Learning) and a rail of counts.
2. **Stray debug button**: a white button reading `Clicked 0 time(s)` sits in the content area. Remove it from the product build (keep the counter only in tests, if tests need it).
3. **Broken page structure**: the 'RUNTIME UI' label wraps, headings collide with the nav column, and the content area has no card structure. The reference has a page title, a filter row (Time range chips + Breakdown + Source filter selects) and card sections ('Model pool', 'Token usage over time') each with a title, description and its chart.
4. **Empty content area**: our Overview shows only chips and one sentence. It must render the same card structure the reference shows, with our real data (charts, rail values).

## Required work

1. ONE sidebar (grouped like the reference) plus the counts rail; no duplicated nav, no wrapping label.
2. Remove the debug `Clicked N time(s)` control from the product view.
3. Restructure Overview as cards: a header row with Time range chips (already exist) and, only where the host supports them, Breakdown/Source selects (otherwise omit and say so); then a card per chart with title, one-line description, and the chart; keep the accessible tables.
4. Match the reference's spacing scale: cards on the dark surface token, 1px hairline borders, 8px radius region, 16-24px padding, section titles in the same size/weight relationship as the reference.
5. Verify in the browser yourself: screenshot at 1920x1080, compare against the reference, and report the concrete differences that remain. Overlapping text, duplicate nav, or debug controls = failure.

## Files
`apps/runtime-ui-next/src/**`, tests, fixtures; evidence `s49a-*` with before/after screenshots.

NO host changes, no new dependency, no packaging, no installs, no commits, no subagents; never modify the legacy app.

## Report
The single-shell structure, how the debug control was removed (and where the counter lives now), the Overview card structure, the spacing decisions with the token names, before/after screenshots, remaining differences, counts and typecheck.