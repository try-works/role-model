# S384 — independent review: S379b Router family

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 5 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/route.ts` | `E8142A65C96ACB37FFBE0E13C1E30A3532AF80D18B69BA97CCF63191A08B9F48` | 10137 |
| `src/legacy-redirects.ts` | `F0CCA86F1EA8ABACAEB52C6B4629FC90CFBB18496D086B016EF49B5114AEAB7B` | 11914 |
| `src/view.ts` | `B1A2257D76EB3EC3DD1ECE67DFC55645067F5DB16F91E79FCEF9F1AED6610537` | 64973 |
| `src/init.ts` | `1EEDC0EE61E82C9B6E6ADCFB256035C3E9575CC9E70EEEA9642E0E403E10FC34` | 8797 |
| `src/readback.ts` | `F9BEDDF160E24FF17958B010E3B9C3AE52A014CEE485D81A07E0C5B98F8496E3` | 49603 |
| `src/runtime-endpoints.ts` | `445801CE388590E48C4DFB85B7A8013C5235CA521D27E4BEC8091C94976350E3` | 2897 |
| `test/s383-router-family.test.ts` | `B17A9F91C7CBF077B796FC8FF77DEE3E1EB9606BE47291F627F9763ACDEC43C2` | 8784 |
| `test/s269-canonical-url.test.ts` | `D5BA98919AE99DB1671849EBF4E107E0D4E4E170945F69B9A93FE8BD1D630787` | 23265 |

All match. Affected 5 files: **126/126 pass**; UI tsc exit 0.

## Q1 — Single readback projection: PASS

The readback spec has one `routerConfig` source at `/api/role-model/router/config` (`readback.ts:831-836`, `runtime-endpoints.ts:25`); all four pages call the same `routerFamilyPage` with `readbacks.routerConfig` (`view:699-714,868-871`), and init dispatches only `routerConfig` for all four routes (`init:75-79`). No per-route fabricated source. PASS.

## Q2 — Per-route state honesty: PASS

`routerFamilyPage` maps idle to loading, error to error, filters the shared rows by the route's prefixes, and maps ok+no-rows to empty; the message is Loading / readback message+read failed / No X readback available (`view:699-711`). There is no ok-masking of an error/empty state. The mounted tests cover loading, ok, error, and the workload/agent projections (`s383:149-180`). PASS. (The config page and the explicit empty state are not separately mounted; they use the same function/prefixes, so this is a coverage note, not a code defect.)

## Q3 — Redirects: PASS

The redirect table maps `/app/control/routing-strategy` to `/app/router/strategy` and `/app/router/config` to `/app/router/strategy`; canonical targets resolve to `/router/strategy` (`legacy-redirects:32,44,113-114`). The test asserts href with query/hash, route `RouterStrategy`, exactly one `ReplaceLegacyUrl`, and the replace href (`s383:100-122`); the Command uses `Navigation.replaceUrl` (`legacy-redirects:297-301`). PASS.

## Q4 — MISSING arithmetic/remaining NotFound: PASS

MISSING is 10; the four landed families are absent; every remaining entry parses NotFound; requestId detail is unchanged (`s383:124-146`). The 42-supported + root + 10 arithmetic is consistent with the original family table (40 canonical + dynamic targets + root), though the test only asserts the MISSING count/NotFound; no generic-success path was found. PASS.

## Q5 — Run: PASS

5 files **126/126 pass**; UI tsc exit 0.

## Q6 — Lint: PASS

anti_slop_lint reports no findings for `test/s383-router-family.test.ts` or `test/s269-canonical-url.test.ts`.

## Residual notes (non-blocking)

- The config page and explicit empty state are not independently mounted; the same projection function and rows-empty branch are shared. The total 53 arithmetic is not directly asserted, though the MISSING 10 and NotFound behavior are.

## VERDICT: PASS

One real readback projects into the four read-only routes with honest states, both redirects use one history-replace Command with query/hash, MISSING drops to 10 and the rest stay NotFound, and 126/126 + UI tsc pass with clean lint. No remaining numbered items. No product file was modified; no commit made.

