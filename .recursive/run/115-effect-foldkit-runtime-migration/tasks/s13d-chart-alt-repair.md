# S13d repair the chart's accessible alternative and pin its claims (public, R10)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review reproduced a real correctness bug and two untested claims. Fix the bug; make the claims fail when broken.

## Defect 1 (real): the accessible alternative loses and mis-associates values
`chartTable` derives rows from `series[0].points.map(label)` and indexes every series by that same index.
- Ragged series: `[{points:[{label:'a',v:1}]}, {points:[{label:'a',v:2},{label:'b',v:3}]}]` produces a table with one row containing A=1 and B=2; B's `b=3` is drawn in the SVG but never appears in the table.
- Differently-labelled equal-length series: B's 10:00 value is shown under A's 09:00 label, in the table AND on the SVG x-axis.
Fix: build the rows and the x-axis from an ordered label union with a per-series lookup, OR validate that all series share the same labels and throw a clear error when they do not. Choose one, state why, and add tests for both failing inputs above.

## Defect 2: the truncation caption repeats shown/total/dropped, but nothing tests it
Setting the caption suffix to empty leaves all tests green, so the claim is prose. Assert the caption text exactly.

## Defect 3: the stale test does not pin which number is the age and which is the rule
Swapping `formatAge(ageMs)` and `formatAge(ruleMs)` still passes. Assert the exact rendered phrase.

## Also
Document the empty-state normalization honestly: a ready render with series present but zero usable points collapses to empty and drops the legend. That is acceptable behaviour, but it must be stated as a documented collapse rather than implied.

## Files you may write
- `role-model-router/packages/ui/src/foldkit-chart.ts`
- its Scene test under `role-model-router/packages/foldkit/test/`
- `evidence/logs/s13d-*` and `evidence/other/s13d-tdd.json`

Nothing else.

## Strict TDD
Each defect gets its failing input as a RED first. Report: the fix you chose and why, RED/GREEN, counts, typecheck, and whether any existing chart output changed.