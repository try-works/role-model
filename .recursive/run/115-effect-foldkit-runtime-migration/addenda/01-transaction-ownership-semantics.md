# Addendum 01 - transaction ownership semantics (R23)

Run: 115-effect-foldkit-runtime-migration
Status: effective input for R23
Date: 2026-10-26

## Why this addendum exists

A behaviour change landed in `shared/sql/transaction.mjs` that is **deliberate** but was only recorded in a test name until now. It also separates two transaction kinds that used to be one. Both facts change how R23 work must be judged.

## 1. Two transaction kinds, not one

| Helper | Opens with | Intended for |
|---|---|---|
| `withSqlTransaction(database, work)` | `BEGIN IMMEDIATE` | read-then-write work that needs the write lock up front |
| `withSqlReadTransaction(database, work)` | `BEGIN` (deferred) | read snapshots that must not take the write lock |

**Rule:** a deferred-`BEGIN` site must never be converted to `withSqlTransaction`. That would turn a reader into a writer and change contention behaviour - silently, because no test in the suite contends for the same rows. This is why the codemod refuses a plain `BEGIN` and why `knowledge-store` route-ladder paging uses the read variant.

## 2. A rollback failure no longer replaces the primary outcome

Old behaviour at several sites:

```js
this.database.exec("BEGIN IMMEDIATE");
try { ... this.database.exec("COMMIT"); }
catch (error) { this.database.exec("ROLLBACK"); throw error; }   // ROLLBACK throwing here masked `error`
```

New behaviour (`runTransaction`):

```js
catch (error) { try { database.exec("ROLLBACK"); } catch {} throw error; }
```

**Consequence, stated plainly:** at a refusal path (queue-admin, evaluation-core job completion) an old implementation could propagate a **rollback failure** instead of returning its refusal value; now the refusal value is returned and the rollback failure is swallowed.

**Why that is the right default:** the primary failure is the one that explains the operation. A rollback error is secondary and, on `DatabaseSync`, typically means the connection is already unusable - replacing a precise error with `cannot rollback` loses the diagnosis.

**What is given up:** if a caller relied on a rollback failure aborting the flow, that reliance is gone. What I checked, rather than assumed: every post-ROLLBACK line in product code (sampled 12 sites) is one of three things - `throw error` (unchanged), a `#transactionDepth -= 1` that is now inside the helper caller's own `finally` (strictly safer), or an explicit refusal such as `ROLLBACK; return false`. None of them branches on the rollback failing. That is evidence for the converted sites, not a proof about every possible caller, and no test can construct a rollback-throwing database except the fake in `run115-r23-transaction-modes.test.mjs`.

**Pinned by:** `tests/track-b/run115-r23-transaction-modes.test.mjs` (4 tests): the `exec` sequence of both kinds, rollback-and-rethrow on the normal path, and a rollback-throwing database whose failure does not replace `primary`.

## 3. How R23 progress must now be judged

From the independent review (`evidence/other/s168-independent-review.md`):

- the inventory counts **raw BEGIN sites**, not units of work;
- several entries are a module's own transaction **owner** (`artifact-store` `#withWriteTransaction`, `knowledge-store` conditional transaction, `durable-queue` `endMaintenance`) where delegation - not wrapping - is the correct conversion;
- therefore "N sites remaining" is a guard against regression, **not a progress metric**, and must not be quoted as one.

Allowlisted sites carry a reason. Verified per-file counts (44 total): artifact-store 4, background-evidence-scheduler 6, crowdsourced-learning 3, evaluation-core 14, event-log 1, knowledge-store 5, knowledge-worker 1, trajectory-signals 1, capture/durable-queue 5, runtime-operations-server 3, run98 cost backfill 1. Schema discovery: 4 sites. Any unlisted site fails a test.

## 4. What remains genuinely open

- `artifact-store` has **4** remaining sites (`graph_edges`/`graph_occurrences` migrations and two write paths) and `knowledge-store` **5** (one of them the conditional caller-owned transaction);
- `evaluation-core` has **14** sites, most refusal-shaped or commit-then-continue, needing individual judgement (one conversion recipe is proven, in `evidence/other/s158-refusal-recipe.md`);
- `evaluation-core:1413` needs full PRAGMA rows, so it stays allowlisted until the helper grows a row-level API.