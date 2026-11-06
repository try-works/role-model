# S154 A failed batch, reverted - then one verified conversion

I tried to convert three artifact-store sites in one pass. That broke the module:

```
SyntaxError: Private field '#recoverTransactions' must be declared in an enclosing class
```

My text replacements had removed `try {`/`catch` skeletons without matching braces, so the class closed early - and a **third** edit left a stray `}`. Five artifact test files failed at load. `node --check` named the cause immediately.

## Recovery

1. `git checkout -- extensions/artifact-store/index.mjs` - back to the committed state, `node --check` clean.
2. Redid **one** conversion (`restoreManifest`), transforming the block programmatically and checking syntax **before** running tests.
3. Artifact suites: **24/24 pass**.

The lesson is not "be careful"; it is that a multi-site batch in a 2,000-line class needs a syntax check after each site, not after the batch. My earlier single-file edits were small enough that this never bit.

## Converted

`restoreManifest` (artifact-store): BEGIN -> delete tombstones + insert artifacts + link edges -> COMMIT, catch -> ROLLBACK -> rethrow, now `withSqlTransaction`. The catch only rethrew, so the helper owns the same semantics.

## R23 burndown

| Round | Converted | Inventory |
|---|---|---|
| 125 | 4 | 21 booked (undercounted) |
| 127 | 5 | 53 |
| 129 | 7 | 51 |
| 130 | 9 | 49 |
| **131** | **10** | **48** |

`artifact-store` still holds 9 hand-rolled sites and `evaluation-core` 15. At one-per-round this is a 40-round project; the alternative is a reviewed codemod, which the failed batch above shows is not a shortcut to take casually.