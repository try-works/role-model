# S568 — per-route Story + Scene contract

The owner asked for what each page displays per route to be declared as stories/scenes and validated against that declaration instead of ad-hoc text checks.

## Contract sources (ground truth)
- test/support/page-stories.ts — for each AppRoute tag, the ordered section headings captured from the shipped 0.0.20 build on :3456 (deduped case-insensitively), plus the five studio tab stories and their reference table/control volumes.
- test/support/reference-titles.ts — the createRoute titles parsed from apps/runtime-ui/app/lib/design-system.ts (50 routes).

## Scenes (what renders)
- test/s565-page-stories.scene.test.ts — renders each route with the idle model and requires the declared headings IN ORDER (page-title occurrence excluded because the shell h1 carries it), and forbids the removed Runtime UI/rail generation. 43/43 pass.
- test/s567-reference-titles.scene.test.ts — renders each route (studio tabs rendered with their tab selected) and requires the shell h1 to equal the reference title; 46/46 pass.

## Stories (what model state drives the page)
- test/s566-page-stories.story.test.ts uses the Foldkit Story runner for the pure page transitions (studio tab, studio field edit, controller selection). The filter/window handlers dispatch a read Command by design, so their transitions are asserted directly against the same reducer (documented in the file). 5/5 pass.

## Outcome
- Shell titles now match the reference for every mapped route (previously 20+ were invented or stale: Queue state, Telemetry request ledger, Candidate inventory, Llama-swap host policy, Operator controls, Extension boundary, Capability benchmark, Runtime topology, Llama-swap swap history, Host activity and metrics, Host logs, Routing analytics, Remote providers, Available models & endpoints, Routing controller, and the five studio workspaces).
- Removed a truncation incident: an in-place edit wrote back a 2000-line read of view.ts; the file was restored from HEAD and the title patch re-applied from disk with node, then verified by tsc + the suites above.
