# S158 The "catch does more" category now has a recipe - proven on evaluation-core

Thirteen of the remaining sites were refused by the codemod because their catch does more than rollback-and-rethrow. The largest cluster is `evaluation-core` (15 sites), and its first site showed the shape:

```js
if (Number(completed.changes) !== 1) {
  this.database.exec("ROLLBACK");
  return null;            // <- refusal expressed as a return, not a throw
}
```

## The recipe

1. a module-level sentinel: `const EVALUATION_REFUSED = Symbol("evaluation.refused")`;
2. inside `withSqlTransaction`, a refusal **throws the sentinel** instead of rolling back and returning;
3. the outer catch maps the sentinel back to the returned value:

```js
try {
  withSqlTransaction(this.database, () => {
    ...
    if (Number(completed.changes) !== 1) throw EVALUATION_REFUSED;
    ...
  });
} catch (error) {
  if (error === EVALUATION_REFUSED) return null;
  throw error;
}
```

This keeps the public contract (`return null` on refusal), removes the second rollback path, and makes the helper the only owner of BEGIN/COMMIT/ROLLBACK. It is the same sentinel idea `queue-admin` used, now shown to work for the return-on-refusal family.

## Verification

| Check | Result |
|---|---|
| syntax | 0 |
| A/B across **80 importing test files** | A 646 tests / 600 pass / **46 fail**; B (HEAD) identical; **only-in-A = 0, only-in-B = 0** |
| inventory | **41 -> 40** |

The 46 failures are pre-existing and identical on both sides - `evaluation-core` importers include the distribution/packaging tests that need a built artifact.

## A self-correction inside the same round

I added `import { tableColumns } ...` while planning a `table_info` conversion in the same file, then did not use it. An unused import is exactly the kind of debris that makes a later reader wonder what changed - removed before commit. The `table_info` sites in this module stay for their own round.

## R23 status

| Category | Before | Now |
|---|---|---|
| sites needing a per-site decision | 13 | **12** (one has a demonstrated recipe) |
| raw BEGIN sites | 41 | 40 |

No progress claim on the count: one site, one proven recipe, and a module whose importers are A/B identical.