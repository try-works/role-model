# S148 The worker's invariant passed for the wrong reason - caught, rescoped, proven

The S260 slice converted two crowdsourced-learning methods to the shared transaction helper. The behaviour is unchanged by design, so the RED was an ownership invariant. I read the invariant before accepting it:

```js
assert.doesNotMatch(source, /database\.exec\(["']BEGIN IMMEDIATE["']\)/, "transaction ownership must not be hand-rolled");
```

## Why that assertion was tautological

The three methods deliberately left alone (`revoke`, `#ackClaim`, dead-letter) hand-roll transactions as **`this.#db.exec(...)`** — and the pattern never matches that receiver. So the module still contains three hand-rolled transactions while the test's message claims none do.

```
368: this.#db.exec("BEGIN IMMEDIATE");     <- untouched, not matched
444: this.#db.exec("BEGIN IMMEDIATE");     <- untouched, not matched
482: this.#db.exec("BEGIN IMMEDIATE");     <- untouched, not matched
504: withSqlTransaction(this.#db, ...);    <- converted
515: withSqlTransaction(this.#db, ...);    <- converted
```

A green test asserting more than it checks is worse than no test, because the next reader trusts it.

## Repair: assertions scoped to the converted methods

The test now locates the **definitions** (`^  #persistInsert\(`, `^  #persist\(`) and asserts, per method:

- it calls `withSqlTransaction(`;
- it contains no `BEGIN IMMEDIATE`;
- it contains no `COMMIT` or `ROLLBACK`.

My first attempt at this used `indexOf("#persistInsert(")`, which matched the **call site** (`#persistInsert(row)`) instead of the definition, and the test failed against correct code. The fix was an anchored regex; that failure is why I do not accept source-invariant tests on inspection.

## Proven both ways

| Module state | Invariant |
|---|---|
| pre-slice (`git show HEAD:...`) | **RED** - `#persistInsert must delegate to the shared helper` |
| converted | **GREEN** |
| regressions (`b08`, `run115-r31-ack-replay`, `run99-r33-family-publication-floors`) | **12/12 pass** |

Logs: `s260a-red-ownership-scoped.log`, `s260a-green-ownership-scoped.log` (kept beside the worker's originals).

## R23 status

Now converted: 2 of 13 `table_info` sites (helper + capture_wal), 4 of 21 transaction sites (`endMaintenance`, `queue-admin.inTransaction`, `#persistInsert`, `#persist`). The three remaining hand-rolled transactions in crowdsourced-learning are named in the test comment rather than silently excluded.