# S151 R23 is now a machine-checkable burndown, not a note

Fifty-three product sites still hand-roll `exec("BEGIN IMMEDIATE")`. Converting them one per round is fine; doing it **without a guard** means the migration can regress faster than it proceeds.

## `run115-r23-transaction-inventory.test.mjs` + `r23-transaction-inventory.json`

- scans every `.mjs` under `extensions/` and `shared/`, excluding the helper itself, tests and `scripts/track-b`;
- **a new hand-rolled transaction fails** ("convert these with shared/sql/transaction.mjs, or add them to the inventory with a reason");
- **a stale entry fails** ("these sites are gone - remove them from the inventory when you convert them"), so the list can only shrink.

## Falsifiability proven, both directions

| Mutation | Result |
|---|---|
| drop one allowlisted entry | **fails** - that site is reported as unallowlisted |
| add a bogus entry (`extensions/does-not-exist/index.mjs:1`) | **fails** - reported as stale |
| restore | **2/2 pass** |

## Two filter errors I made before it worked

1. The generator filtered `"\/test\/"` - which does not match `tests/` (plural), so it seeded the allowlist with **test-file** entries that the scanner never looks at. The stale check caught it immediately.
2. My earlier PowerShell count (`shared/**/*.mjs`) did not recurse, which is why the number moved from 54 to the accurate 53 product sites (66 raw occurrences).

Both are the same failure mode: a filter that looks right until the test measures it. The inventory test exists partly because I have now made that mistake twice.

## What this changes for R23

R23 stays blocked, but its remainder is now **enumerated in the repository**, enforced on every run, and can only shrink. The next conversion removes its entry; any regression that introduces a new hand-rolled transaction fails until it is either converted or justified in the list.