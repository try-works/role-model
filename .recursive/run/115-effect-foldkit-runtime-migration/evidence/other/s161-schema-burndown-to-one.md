# S161 The schema burndown is down to one site - and the numbers exposed my earlier regression

Converted the last six `.includes`-style sites (evaluation-core 5, knowledge-worker 1) using `tableColumnList`. One site remains, deliberately.

## The one remaining site

`evaluation-core:1413` reads **full PRAGMA rows**, not names:

```js
const columns = this.database.prepare(`PRAGMA table_info(${table})`).all();
const scoreColumn = columns.find((column) => column.name === "score");
... scoreColumn?.notnull !== 1 ...
```

Neither helper exposes `notnull`, so converting it would mean widening the helper API for one caller. It stays in the inventory **with that reason recorded**, instead of being silently excluded or awkwardly forced.

## Verification

| Suite | Result |
|---|---|
| evaluation importers | **633/646 pass, 14 unique failing names** |
| knowledge suites | **18/18** |
| schema contracts + inventory | **5/5** |

## The number that tells on me

The earlier HEAD run of the same evaluation set had **47 failing names**. Now it is **14**, with **zero** failures that were not already failing then:

```
new vs earlier HEAD : (none)
now passing         : 33 tests, including
  ✖ knowledge store schema is versioned and rejects unknown versions
  ✖ knowledge retrieval receipts are bounded and pruned per scope
  ✖ knowledge store run() emits bounded degradation receipts ...
```

Those knowledge tests were failing **because of my S149 Set/includes crash** - they could not construct the store. Fixing it (S159) turned 33 red tests green across the evaluation-importing set. The regression was never "just" a knowledge-store bug; it was suppressing a whole block of the suite, and the suite reported it as unrelated failures in other files.

That is the most useful thing this round produced: **a regression that manifests as failures in files you did not touch**, which is exactly the pattern that gets misattributed to flaky tests.

## Burndown

| Burndown | Remaining |
|---|---|
| hand-rolled transactions | 40 |
| inline `table_info` | **1** (with a recorded reason) |