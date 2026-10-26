# S143 The R28 retention defect, demonstrated with numbers - and the one-line fix proven in a sandbox

R28 records a pre-existing defect: `EventLog.#pruneAtWatermark` deletes one row more than the low watermark it claims. R28 also says fixing it is a product change needing approval. So this round **measures** the defect and **proves the fix in a copy**, without touching the private product code.

## The defect

`extensions/event-log/index.mjs:247`

```js
const through = this.database.prepare(
  "SELECT sequence FROM event_facts WHERE channel=? ORDER BY sequence ASC LIMIT 1 OFFSET ?",
).get(channel, count - keep)?.sequence;
```

With `count = 8`, `keep = 5`, `OFFSET 3` selects the **fourth** oldest row - the first row it meant to keep - and retains *through* it.

## Measured (unmodified private module)

```
{ "rowsAfterReachingHighWatermark": 4, "lowWatermarkExpected": 5,
  "firstRemainingSequence": 5, "lastRemainingSequence": 8, "retained": 4 }
```

Capacity 10, high watermark 8, low watermark 5. After pruning it keeps **4** rows and leaves sequence 5 as the first survivor - one row short of the contract, exactly as R28 described.

## The fix, proven in a sandbox copy

```js
.get(channel, Math.max(0, count - keep - 1))?.sequence;
```

Running the same probe against a copy under `E:/rm-tmp/probe` (product tree untouched):

```
{ "retainedAfterPrune": 5, "expectedLowWatermark": 5, "firstRemaining": 4, "lastRemaining": 8 }
```

Five rows retained, first survivor sequence 4 - the contract is met.

## Why I did not ship it

R28 explicitly gates this on product-change approval, and it changes **retention semantics** (how many rows survive a capacity prune) in the private repo. Shipping it unilaterally would be the same class of decision as fabricating a release identity: a real change that belongs to whoever owns the contract.

**Proposal:** apply the one-line fix plus a test that asserts `retained === lowWatermark` (the current R28 pin asserts the observed 4, so it must be updated in the same change), and record it as a defect fix rather than a migration behaviour change.

The probe scripts are preserved at `E:/rm-tmp/probe-eventlog-prune.mjs` and `E:/rm-tmp/probe-fixed.mjs` for re-running.