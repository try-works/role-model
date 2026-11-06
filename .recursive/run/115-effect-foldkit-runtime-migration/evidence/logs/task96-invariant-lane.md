# task-96 invariant lane triage

## s177 select aria-label — STALE TEST (view correct)
The view emits the accessible name in the select's attribute block (`src/view.ts:917-924`, `h.AriaLabel(label)`). The test searched one source line for both the `overview-filter` marker and `h.AriaLabel`, which stopped matching when Foldkit formatting split them. Test now inspects the select's own attribute block; the empty-label guard is unchanged.

## s181 skip link — STALE TEST (view correct)
Shell class is now `flex h-screen w-full overflow-hidden bg-background text-foreground` (`src/view.ts:1394`). The skip link remains a child in the children array (`src/view.ts:1403`), before the sidebar. Test updated to the current shell class; it still asserts the anchor appears after the children array starts.

## s182 main column — STALE TEST (view correct)
Main column is now `flex min-h-0 min-w-0 flex-1 flex-col bg-background` (`src/view.ts:1419`). Test updated to that class and still asserts `min-w-0`, `flex-1`, and no `w-full`.

## s205 ring utilities — REAL VIEW DEFECT (lead-owned)
The theme-toggle button at `src/view.ts:1465` still carries `focus-visible:ring-[3px] focus-visible:ring-ring/50`. S205 requires an explicit outline because ring utilities do not compose on these elements. Do not weaken the assertion.

Exact patch (lead applies; view.ts is lead-owned):

```diff
- h.Class("inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"),
+ h.Class("inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent " + focusRingClass),
```

`focusRingClass` (`src/view.ts:79`) supplies `focus-visible:outline ... focus-visible:outline-[var(--rm-accent)]`.

## Test changes
- `test/s177-select-names.test.mjs` — check the select attribute block instead of one line.
- `test/s181-skip-link.test.mjs` — current shell class; same child-not-attribute assertion.
- `test/s182-shell-overflow.test.mjs` — current main-column class; same overflow assertions.

No assertion was removed or weakened. s177/s181/s182/s205 are 7/7 green (task96-target-green.log). The lead applied the s205 view patch as baa867ab. The full lane is now 18/21; the only remaining failures are the separate S247 synthetic-click-budget assertions (s619-learning-controls), which are outside this task.
