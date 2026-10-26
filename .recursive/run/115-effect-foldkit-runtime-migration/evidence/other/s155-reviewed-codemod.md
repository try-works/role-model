# S155 A reviewed codemod: six conversions, A/B verified, zero regressions

One site per round was a 40-round project. So I wrote a codemod that **refuses anything it does not recognise** and verified it the way the failed batch taught me.

## What it converts - exactly one shape

```js
this.database.exec("BEGIN IMMEDIATE");
try {
  <body>
  this.database.exec("COMMIT");        // optionally followed by `return x;`
} catch (error) {
  try { this.database.exec("ROLLBACK"); } catch {}
  throw error;
}
```

-> `withSqlTransaction(this.database, () => { <body> [return x;] });`

On `artifact-store` it converted **6** and **refused 5**, each with a reason (`BEGIN is not followed by a matching try`, `no COMMIT at the transaction body depth`, `COMMIT is not followed by the catch at the same indent`). The refused ones are commit-then-continue or differently-indented shapes that need a human decision - the same category as `event-log.append`.

## Verification (the part that matters)

1. `node --check` on the file: **0** (the earlier batch failed here, which is why it is step one).
2. `*artifact*` suites: **24/24**.
3. **A/B on every test file that imports `artifact-store` (58 files) against the pre-codemod copy**:

```
A (converted) 587 tests, 571 pass, 16 fail
B (before)    587 tests, 571 pass, 16 fail
normalized failing names: only in A = 0, only in B = 0
```

The first comparison I ran said "16 new failures" - because node appends timings to the `✖` lines, so text comparison always differs. Stripping `(<n>ms)` before comparing gave the real answer: **identical failure sets, zero regressions**. A comparison method that always reports total disagreement is not a comparison.

4. Inventory regenerated: **42 sites** (down from 48), both inventory tests pass.

## The codemod is committed, with its operating rules

`scripts/track-b/r23-transaction-codemod.mjs` carries the rules it was verified under: syntax check first, module tests, then the importing A/B with normalized names, and only then shrink the inventory. A future contributor gets the method, not just the tool.

## R23 burndown

| Round | Converted | Inventory |
|---|---|---|
| 129 | 7 | 51 |
| 130 | 9 | 49 |
| 131 | 10 | 48 |
| **132** | **16** | **42** |

Remaining concentration: `evaluation-core` 15, `artifact-store` 3, `background-evidence-scheduler` 6, plus scattered commit-then-continue shapes that the codemod correctly refuses.