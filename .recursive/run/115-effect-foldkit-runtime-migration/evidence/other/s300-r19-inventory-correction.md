# S300 — R19/B0 inventory correction: the false SQL no-product-caller exclusion

Task-18 (rev 2, completed). Model: deepseek-flash (verified live). No commit; s9 review then Lead commit.
Owned files only: `scripts/s4-contracts-inventory.test.mjs`,
`.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s4-contracts-inventory.json`, this doc, logs.

## The false claim (removed)

`scope.excluded` previously contained (verbatim):

> area: `role-model-router/packages/sql-sqlite-node/src/service.ts`
> reason: "Effect SQLite service has no product caller in the public host today (its callers are package tests
> only), so it is not counted as a live product surface; R23 wiring is tracked elsewhere."

Verified false: the package has seven real product importers in `runtime-host-bridge` (cli.ts:11, index.ts:19,
queue-runtime/admin.ts:19, queue-runtime/store.ts:18, route-challenge-evidence.ts:2, route-ladder-census.ts:3,
track-b-runtime.ts:30). The exclusion was removed.

## Semantic guard (RED first)

Added `R19/B0: the SQL service is a live product surface, never excluded as callerless` to
`scripts/s4-contracts-inventory.test.mjs`:

- the removed sentence must not appear in `scope.excluded`;
- no excluded area may name `sql-sqlite-node`;
- at least 7 body-verified SQL service entries must exist in `entries`;
- all seven product caller citations must appear across those entries;
- every SQL entry's disposition must be allowed and its reason non-empty.

RED (`evidence/logs/s300-red.log`): 2 failed | 4 passed — the new guard failed, and the pre-existing
`observability-snapshot` citation had drifted to a blank line. GREEN (`evidence/logs/s300-green.log`): 6/6.

## Added entries (11, ALL body-verified; 0 not-read)

Definition file: `role-model-router/packages/sql-sqlite-node/src/service.ts`.

| id | line | disposition | body-verified behaviour |
| --- | --- | --- | --- |
| sql-service-make | 490 | existing-effect | maps `attemptOpenAsync` over the retry Effect into `buildService` |
| sql-service-make-sync | 494 | existing-effect | `buildService(config, openWithRetrySync(config))` sync facade over the same Effect-backed owner |
| sql-service-query | 337 | existing-effect | nested-effect rejection + semaphore serialize + open check + `readRows` in `Effect.try` |
| sql-service-exec | 350 | existing-effect | semaphore serialize + open check + `runExec` in `Effect.try` |
| sql-service-transaction | 363 | existing-effect | semaphore, fiber ownership, `BEGIN IMMEDIATE`, commit on success, ensuring-finalizer rollback |
| sql-service-query-sync | 425 | pure | open + ownership checks, then `readRows`; no Effect |
| sql-service-exec-sync | 431 | pure | open + ownership checks, then `runExec`; no Effect |
| sql-service-transaction-sync | 437 | pure | open/ownership checks, `BEGIN IMMEDIATE`, work, commit or rollback in catch; no Effect |
| sql-service-close | 451 | existing-effect | semaphore serialize, mark-closed-once via Ref, `database.close()` in `Effect.try` |
| sql-service-close-sync | 465 | pure | idempotent when closed, ownership check, mark closed + close; no Effect |
| sql-service-is-open | 474 | pure | reads the open Ref synchronously |

Callers cited: the seven product importers above (make/makeSync cite the six `makeSync` importers; the service
methods cite the files that obtain/query through the service, including `queue-runtime/store.ts:18` for the
client-owned query path).

## Counts

- `scope.excluded`: 7 -> 6 (the false SQL exclusion removed).
- `entries`: 16 -> 27 (11 added, all SQL-service, all body-verified; 0 marked not-read).
- SQL entries: 11 (dispositions: 6 existing-effect, 5 pure).

## Pre-existing drift fixed (disclosed)

The machine check `the real inventory validates against the code` failed before the SQL change:
`observability-snapshot` cited `runtime-host-bridge/src/run108-observability.ts:322`, now a blank line.
Corrected the JSON citation to line 333 (`export function collectObservabilitySnapshot`). JSON-only, no source
edit.

## Named follow-on (not hidden)

Body-verification of the remaining **16 pre-existing inventory entries** per area is still outstanding:
runtime-host-bridge operations/resources/callers (`host-request-handler`, `host-bridge-server`,
`host-chat-execution`, `host-cli`, `module-health-writer`, `diagnostics-read`, `diagnostics-handler`,
`traffic-class`, `unified-runtime-config`), protocol/core wrappers (`protocol-route-decision`,
`core-advisory-rung`, `effect-root-wrapper`, `foldkit-wrapper`, `foldkit-ui-wrapper`) and observability
(`observability-scope`, `observability-snapshot`). This slice body-verified ONLY the 11 SQL-service entries.

## Lint

`scripts/s4-contracts-inventory.test.mjs`: 9 pre-existing `no-runtime-typeof` findings, all in the
JSON-boundary validator (`typeof file/line/schemaVersion/...` checks against parsed JSON, lines 32-108); the new
guard adds none. Disclosed rather than rewriting the machine-check validator.

## Hashes

- `scripts/s4-contracts-inventory.test.mjs` 10590 B `0D33E9DFCD20491390A762CD84E07C9D4A20289B155CFCFD97AA35A9E0DC2EF5`
- `evidence/other/s4-contracts-inventory.json` 23239 B `9B6BF05D680C8F1390F13F481233699601D2CBDAACE3FA55B09FF4145F71F58D`
## S301 HOLD repair (2 items)

### 1. Structured guard replaces the literal-sentence match

`validateSqlServiceCoverage(inventory)` now returns issue codes instead of matching one sentence:

- `sql-service-excluded: <area>` — any `scope.excluded` area matching `/sqlite/i` is rejected (a reworded
  "no product caller" exclusion cannot survive);
- `sql-service-not-inventoried` — fewer than 7 inventoried entries whose definition file is under
  `role-model-router/packages/sql-sqlite-node/`;
- `sql-service-package-path` — no positive `service.ts` line citation;
- `sql-service-caller-missing: <file>:<line>` — each of the seven product callers must be cited;
- `sql-service-disposition` / `sql-service-reason` — allowed disposition and non-empty reason per SQL entry;
- `sql-service-false-claim` — the removed sentence must not return.

Negative test (RED on the weak guard, GREEN with the structured rule):
**"S301 reworded false SQL exclusion is rejected by the structured guard"** — clones the inventory, keeps all 11
SQL entries, and adds `{ area: "Effect SQLite service", reason: "No product code calls it; package tests only." }`;
the weak guard accepted it, the structured guard rejects it with `sql-service-excluded`.

RED (`s300-red2.log`): 7 tests, **1 failed | 6 passed** (weak guard accepted the reworded exclusion).
GREEN (`s300-green2.log`): **7/7**.

### 2. Disposition truth corrected

`sql-service-make-sync` was recorded `existing-effect`. Its body is
`makeSync = (config) => buildService(config, openWithRetrySync(config))` — synchronous, constructs no Effect
(the service it builds uses Effect internally, but the entry's own body does not). Disposition corrected to
**`pure`**, matching its sync siblings.

Final SQL disposition counts (11 entries): **existing-effect 5** (`make`, `query`, `exec`, `transaction`,
`close`) / **pure 6** (`make-sync`, `query-sync`, `exec-sync`, `transaction-sync`, `close-sync`,
`is-open`). Body evidence for `makeSync` recorded in the JSON reason.

### Final hashes after S301

- `scripts/s4-contracts-inventory.test.mjs` 11940 B `62EFA2B6B7F19EF33456C0BF298C14DF0D830A59B1204E40E2D3BAE335C53961`
- `evidence/other/s4-contracts-inventory.json` 23291 B `B451276D2389D8CA7BF8F98A9D1C6BD4C8A0529A538ADE905F9C40AD336A47AF`

Lint after S301: unchanged — the same 9 pre-existing `no-runtime-typeof` findings in the JSON-boundary
validator (lines 32-108); the new validator adds none.
