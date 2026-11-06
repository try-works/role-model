# S156 R23 is not 42 mechanical conversions - and the plan changes because of it

I ran the codemod in dry-run over every remaining site to find out what the remainder actually is.

## Classification of the burndown

| Category | Sites | What it means |
|---|---|---|
| `catch does more than rollback-and-rethrow` | **13** | the catch records a receipt, sets a recovery flag, or wraps the error - needs a per-site decision, not a transform |
| `BEGIN is not followed by a matching try` | **10** | includes **the module's own transaction owner** (below), and shapes where work happens before `try` |
| `COMMIT is not followed by the catch at the same indent` | **7** | commit-then-continue or nested-block shapes |
| `no COMMIT at the transaction body depth` | **1** | commit is conditionally elsewhere |
| not detected at all (different receiver) | **11** | `this.#db.exec(...)` (9) and one `if (transaction) this.database.exec(...)` |

## The finding that changes the plan

`extensions/artifact-store/index.mjs:373` is not a call site - it is the module's **own transaction owner**:

```js
this.database.exec("BEGIN IMMEDIATE");
this.#transactionDepth += 1;
try { const result = producer(); this.database.exec("COMMIT"); return result; }
catch (error) { try { this.database.exec("ROLLBACK"); } catch {} throw error; }
finally { this.#transactionDepth -= 1; }
```

Wrapping it in `withSqlTransaction` would not be a conversion; it is the abstraction this migration is trying to standardise, with extra depth bookkeeping for nesting. `artifact-store` has **14** references to that mechanism.

So the unit of work is the **owner**, not the raw `BEGIN` line. Converting a module's owner to delegate to `shared/sql/transaction.mjs` (as `queue-admin.inTransaction` already does) makes every call site in that module use the shared semantics at once - and several "sites" are then no longer sites at all.

## Receiver split (why 31 of 42 were probed)

```
32  this.database        (probed)
 9  this.#db            (not probed - codemod does not recognise the receiver)
 1  if (transaction) this.database.exec(...)   (conditional transaction)
```

## What I am recording instead of a number

The burndown count is still 42 and still enforced, but **"42 remaining" is not 42 rounds of the same work**. Realistically: ~5 module owners to review and delegate, ~13 sites needing individual judgement, ~11 sites behind a receiver-extension that itself needs review, and a tail of commit-then-continue shapes.

That is a materially different plan from the one implied by the counter, and it is the honest one. No production code changed this round - only this measurement.