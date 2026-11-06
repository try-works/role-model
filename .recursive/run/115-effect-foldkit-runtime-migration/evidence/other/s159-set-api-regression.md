# S159 I committed a crash. The suite passed anyway. Fixed, guarded, and the lesson generalised.

In S149 I replaced knowledge-store's inline `PRAGMA table_info` with `tableColumns(...)`, which returns a **Set**. The call sites still used `.includes(...)`:

```js
const receiptColumns = tableColumns(this.database, "knowledge_retrieval_receipts");
if (!receiptColumns.includes("at_ms")) { ... }      // Set has .has, not .includes
```

**The construct path threw** `receiptColumns.includes is not a function` - so the knowledge store could not be created at all. The 18 knowledge tests and the 13-test regression set I ran at S149 all passed, because none of them constructed the store in a way that reached that line.

## How it surfaced

This round I tried to batch-convert every remaining `table_info` site. The artifact and knowledge suites dropped to 2/24 and 4/18, which is what made me look - **and the crash was already in HEAD from two rounds earlier**, not caused by the batch.

## Fix and guard

- call sites use `.has(...)`;
- new `run115-r23-schema-set-contract.test.mjs` asserts (a) `tableColumns` returns a Set with `has`/`size` and **no `includes`**, and (b) `new KnowledgeStore(...)` constructs and reports health;
- **RED** against the committed version: `TypeError: receiptColumns.includes is not a function`; **GREEN** after the fix; knowledge suites 18/18.

## What I am changing about my own process

1. **A passing test set is not evidence the construct path runs.** For any conversion of an initialisation path, construct the object at least once - a probe, not a suite.
2. **Read the helper's return type at the call site.** `.map(...)` produced an array; my helper produced a Set; the replacement was textually valid and semantically wrong.
3. The wider batch is reverted, not patched blindly. The next attempt adds a `tableColumnList` (array) for `.includes` callers and keeps `tableColumns` (Set) for `.has` users - two explicit contracts instead of one ambiguous one.

## Honesty about the ledger effect

This is a fix for a regression I introduced and committed, found by a probe two rounds later. It does not advance R23; it restores what R23 work broke.