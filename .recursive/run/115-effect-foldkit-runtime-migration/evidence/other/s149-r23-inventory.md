# S149 R23 inventory is bigger than the working list - 54 hand-rolled transactions, not 21

After committing the knowledge-store schema slice I counted what remains rather than trusting the enumeration. **Correction (S150a):** my first count used a PowerShell glob (`shared/**/*.mjs`) that does not recurse, so it under-reported. Recounted with ripgrep across the whole private tree:

```
PRAGMA table_info occurrences      : 13   (whole private tree, extension + shared)
exec("BEGIN IMMEDIATE") occurrences: 66   (whole private tree)
  of which product sites           : ~60
  the transaction helper itself    : 1
  test fixtures                    : 2
  scripts/track-b                  : 3
```

## Why 54 and not 21

The worker's enumeration listed **21 transaction-owned *cleanup* sites** - the category I asked for. The repository contains **54** `exec("BEGIN IMMEDIATE")` sites in first-party extension and shared code. R23's acceptance text asks for "every actual operation owner converted or explicit reviewed retention", which is the larger set.

So the working list was never the requirement's inventory. Recording that now, before more slices accumulate against a number that understates the work.

## This round's slice

`extensions/knowledge-store/index.mjs` - both column discoveries now use `tableColumns`:

- `knowledge_retrieval_receipts` (the `at_ms` additive migration),
- `knowledge_learning_records` (the scoring-identity migration).

TDD, both directions proven:

| Module state | Invariant |
|---|---|
| pre-conversion (`git show HEAD:…`) | **RED** - module still contains `PRAGMA table_info` |
| converted | **GREEN** |
| knowledge regressions (3 files) | **13/13** |

The invariant is module-wide **because this module contains exactly those two pragma reads** - the falsifiability test I applied after catching the tautological one in S148. Logs `s261-red-schema-ownership.log`, `s261-green-schema-ownership.log`.

## R23 status, counted accurately

| Item | Converted | Remainder |
|---|---|---|
| `table_info` sites | 3 (capture_wal + 2 knowledge-store) | **13** |
| transaction sites | 4 (`endMaintenance`, `queue-admin.inTransaction`, `#persistInsert`, `#persist`) | **54 - 4 = 50**, of which 19 are the originally enumerated cleanup sites |

R23 stays blocked. The number that matters for planning just went up, and it is better to know that at 54 than to discover it at the end.