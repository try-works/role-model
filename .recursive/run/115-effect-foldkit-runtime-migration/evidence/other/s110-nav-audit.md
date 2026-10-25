# S110 Navigation audit: 25 links, zero dead - and now pinned

## Browser audit on the shipped build (`0.0.20-81-g17cbdd21`, port 5960)

Collected every `a[href]` in the shell (50 links, **25 unique**), then visited each one and read its `h1`:

| Result | Count |
|---|---|
| resolves to a real page | **25** |
| renders "Not found" | **0** |

Including the ones I would have expected to rot first: `/diagnostics/42`, `/observe/store-degradation-receipts`, `/control/controller`, `/session-readiness`, `/local/swap`.

## Pinned in the suite

`test/s110-nav-links.test.ts` parses each href through the real router (`routeFromUrl`) and asserts the result is not `NotFound` - **25 / 25**. A renamed or dropped route now fails a test instead of shipping a dead link that only shows up when an operator clicks it.

## Client suite

**282 / 282 tests across 27 files** (was 257/26; this round added 25). `tsc` 0.

## Why this was worth a round

A dead navigation link is the classic regression that every green unit suite misses: no component test fails, no type breaks, and the operator discovers it by clicking. The audit cost one browser pass; the pin costs 95 ms forever.