# S157 Converting an OWNER, not a site - and the scare it produced

`artifact-store`'s `#withWriteTransaction` is the module's transaction owner: depth counter for nesting, BEGIN/COMMIT/ROLLBACK, delegate-on-nested-call. It now delegates the transaction itself:

```js
#withWriteTransaction(producer) {
  if (this.#transactionDepth > 0) return producer();   // nested: reuse the open transaction
  this.#transactionDepth += 1;
  try { return withSqlTransaction(this.database, producer); }
  finally { this.#transactionDepth -= 1; }
}
```

Nesting stays here because `withSqlTransaction` would attempt a nested BEGIN; depth bookkeeping is this module's concern, not the helper's. One ordering change is documented in the code: depth now increments **before** the helper starts the transaction and decrements in `finally`, so a BEGIN that throws still restores the prior depth.

## Evidence

| Check | Result |
|---|---|
| source invariant (owner block only) | **RED** against the HEAD owner, **GREEN** after |
| `*artifact*` suites | **24/24** |
| A/B on 58 importing files | A (converted) 588 tests / 571 pass / **18 unique failing names**; B (HEAD) same totals, **18** |
| inventory | **42 -> 41** |

## The scare: one test failed only in A

The first name comparison showed `AC-R24-04 aggregate: manifest seals ...` failing **only** in the converted run - which would be a regression. I did not accept the aggregate result: I ran that test file three times on each version.

```
converted:   pass 9 fail 4   (x3)
HEAD owner:  pass 9 fail 4   (x3)
```

Identical, and the four failures are environment-dependent (the test wants a built distribution). Its appearance in only one aggregate run was ordering noise, not a regression - and the aggregate comparison alone would have let me either miss a real one or revert a correct change.

## Second lesson about A/B that I applied here

Normalize failing **names** (strip `(<n>ms)`), then run any "only in A" failure individually on both versions before believing it. Two rounds in a row the raw signal has been misleading until checked.

## R23 burndown

| Round | Converted | Inventory |
|---|---|---|
| 130 | 9 | 49 |
| 131 | 10 | 48 |
| 132 | 16 | 42 |
| **133-134** | **16** | **41** (owner converted; its BEGIN line is gone, its call sites never had one) |

The counter moved by one for a change that standardises the whole module's transaction semantics - which is the point of S156: the counter is a guard, not a progress metric. I should stop quoting it as progress.