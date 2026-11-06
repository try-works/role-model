# S390 — independent review: S379d final F-URL families

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 5 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/route.ts` | `214DE88D84154D5DCF5569C5620F04ABAA80F0A1ADBF382391FF29A0950911C6` | 11742 |
| `src/legacy-redirects.ts` | `F94AA3C4ACFAE6E6FCAB58F1E6C0908580574EE4B192EDF41F6E3313748C56C6` | 11464 |
| `src/view.ts` | `C24E817A4DD700576E39412DF8E39359A91C27B90565EF34C36915ADFBCEAD98` | 69260 |
| `src/init.ts` | `E619141E74C694053CAA4FD69846C4186B38A25C29AD659D319CC019A7B438DF` | 10847 |
| `src/readback.ts` | `539652F97745A9CAFA0EEF6E74CBF22B4CA682875DC3E6D292A97D00E3C05507` | 54243 |
| `src/runtime-endpoints.ts` | `0C865C1C28EE946FB592379B687382FEB4CACEBB397D22C21C628363CFA750F2` | 3465 |
| `src/update.ts` | `50BBA3EA14AB048097F690A8CAC4C0C4BCE46C31251D308E41D936A0292C66DF` | 34956 |
| `test/s389-final-furl.test.ts` | `E559AE59AA8294089675CE91A37C0CF50E5F3E0B54FE4CDC5106BFB29437C8D3` | 6145 |
| `test/s269-canonical-url.test.ts` | `89D0846A8260C73A4C832ABCDF486176AEEFAAE3C8584F252A9C68151930F46B` | 23033 |
| `test/s269-canonical-url.scene.test.ts` | `42C16A75561B8C08DCC4855D57FD2E0EABB8118A046A1B5938156228722183E0` | 10359 |

All match. Affected 5 files: **125/125 pass**; UI tsc exit 0.

## Q1 — Three landed sources are real: PASS

- llama-swap models: `READBACK_PATHS.localLlamaSwapModels = /api/role-model/local/llama-swap/models` (`runtime-endpoints.ts:27`; spec `readback.ts:1000`); host GET route at `index.ts:20134` (load/roles are model subroutes).
- system operator: `/api/role-model/operator/status` and `/api/role-model/operator/trace-roots` (`runtime-endpoints.ts:28-29`; specs `readback.ts:1001-1002`); host GET routes at `index.ts:17648,17657`.
- system extensions: `/api/role-model/extensions` (`runtime-endpoints.ts:30`; spec `readback.ts:1003`); host GET route at `index.ts:18656`.

init dispatches the models/extensions single readback and both operator readbacks (`init.ts:75-89`). The mounted models and operator tests see row content. PASS.

## Q2 — Policy/matrix absence: PASS

Grepping the host route table finds only `/api/role-model/local/llama-swap/models` (plus model load/roles subroutes); there is no `/local/llama-swap/policy` or `/local/llama-swap/matrix` readback. The two URLs remain in `MISSING_ORIGINAL_TARGETS` and parse NotFound; no fabricated page was added. PASS.

## Q3 — Redirects: PASS

The three legacy URLs resolve to `/local/llama-swap/models`, `/system/operator` and `/system/extensions`; the test checks all three, query/hash on operator, route selection and exactly one `ReplaceLegacyUrl` Command (`s389:55-67`; `legacy-redirects` Command at `:297-301` uses `Navigation.replaceUrl`). PASS.

## Q4 — Arithmetic/remaining NotFound: PASS

MISSING is 2, exactly `/app/local/llama-swap/matrix` and `/app/local/llama-swap/policy`; both parse NotFound (`s389:69-79`). With the three landed families the final arithmetic is 50 supported + root + 2 missing = 53. PASS. (The test asserts the 2 MISSING/NotFound, not the literal 53 count.)

## Q5 — Run: PASS

5 UI files **125/125 pass**; UI tsc exit 0.

## Q6 — Lint: PASS

anti_slop_lint reports no findings for s389, s269 canonical or s269 scene tests.

## Residual notes (non-blocking)

- `finalFamilyPage` derives the route-level `data-final-family-state` from the FIRST section only. On the operator page a trace-roots error/loading with an ok operator-status would leave the outer attribute ok, although the section's own `renderReadbackPage` state/message remains honest. The current test mocks both operator reads with the same body, so divergence is not covered. This is a status-summary nit, not hidden content.
- The literal 53 arithmetic is not separately asserted; MISSING 2 and NotFound are.

## VERDICT: PASS

The three final families have real host readbacks and mounted happy/error coverage, policy/matrix are correctly absent and NotFound, the three redirects use one history-replace with query/hash, MISSING is down to 2 with 50+root+2=53, and 125/125 + UI tsc pass with clean lint. No remaining numbered items. No product file was modified; no commit made.

