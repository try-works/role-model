# S387 — independent review: S379c Learning family

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 5 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/route.ts` | `B396AF3E0BDA44B73F7C1F80032E4381159B5B05C1FB46F09BB6E758999FC810` | 11117 |
| `src/legacy-redirects.ts` | `3DF4C7E639210D79C02AB374BE66400173A956A4B0BEF7358DB85C2381513401` | 11599 |
| `src/view.ts` | `B74AD24711427BF2E04E53790CDCAE74812CCC8198EA9EEDEBADA9030515E67C` | 67302 |
| `src/init.ts` | `34BAEEC029352C03752453907A6470204F1916F5A3BA24BBD0CE5175AE5C4E91` | 9733 |
| `src/readback.ts` | `8E9DC04251A6A78D81776AB93B3A3631E402E8935A74ABAABE2C46D2BEAD8FEA` | 52749 |
| `src/runtime-endpoints.ts` | `6E6253794E51812516C6005A9CBDFDEF009FC022D477130F56CAC7B90E40D592` | 3239 |
| `src/update.ts` | `6149B141899E103CFD8B7D01E93ED0181DAA414C26A0C82A572741BF2C7F567C` | 34670 |
| `test/s386-learning-family.test.ts` | `4BB8F0BA68CBF8119F6433F551696868BC72EB49B75D17F9BDA549B46A4C2209` | 6924 |
| `test/s269-canonical-url.test.ts` | `9904EB807BD331FDC12AF987D019A0B1FB6F895F2F030C9A39F53AFF0B4A76E0` | 23121 |
| `test/s269-canonical-url.scene.test.ts` | `F75EE9CF28CE4ABD92B55FE5B07437A3CDC310DC4A42C0D8FE9E6512031158BD` | 10359 |

All match. Affected 5 files: **125/125 pass**; UI tsc exit 0.

## Q1 — Real readback sources: PASS

Each panel reads the original operator API path: configuration -> `/learning/policy` (`readback.ts:979`), packs -> `/learning/records?kind=pack` (`:980`), decisions -> `/learning/decisions` (`:981`), evidence -> `/learning/measurement` (`:982`), history -> `/learning/history` (`:983`); `runtime-endpoints.ts:21-26` matches, and the host exposes those GET routes (`index.ts:17921-18053`). The original React learning API uses the same policy/records/decisions/measurement/history paths (`apps/runtime-ui/app/lib/learning-api.ts:106-239`). init dispatches one readback per child route (`init.ts:75-81`). PASS.

## Q2 — Generic renderer honesty: PASS

`parseLearningFamily` maps null/undefined to failed, an empty list to empty, and rows to ok; `learningFamilyPage` maps idle to a loading state attribute and delegates to `renderReadbackPage`, which renders status/error/empty text and rows (`readback.ts:633-646,1165-1208`; `view.ts:798-803`). No ok-masking: null is a failed readback and errors render the message. The mounted tests cover loading→ok on decisions and error on null; the history panel is shown from its own readback (`s386:104-128`). PASS. (Only decisions and history are mounted; configuration/packs/evidence share the same renderer, and a non-null empty payload is not separately mounted — coverage notes, not a found defect.)

## Q3 — Five redirects: PASS

The five `/app/learning/*` entries resolve to their canonical `/learning/*`; the test checks all five plus query/hash on decisions and exactly one `ReplaceLegacyUrl` history replace (`s386:58-78`; `legacy-redirects:93-97,297-301`). The command is `Navigation.replaceUrl`, not push. PASS.

## Q4 — MISSING arithmetic/remaining NotFound: PASS

MISSING is 5; the five landed paths are absent; every remaining entry parses `NotFound`; the family matches the stated 47+root+5 total (10 previous minus the 5 Learning targets), and no generic-success path was found (`s386:80-101`). PASS. (The total 53 is not directly asserted; MISSING 5 and NotFound behavior are.)

## Q5 — Run: PASS

5 files **125/125 pass**; UI tsc exit 0.

## Q6 — Lint: PASS

anti_slop_lint reports no findings for s386, s269 canonical or s269 scene tests.

## Residual notes (non-blocking)

- Only decisions/history pages are mounted; configuration/packs/evidence use the same shared renderer and are reviewed statically. The explicit empty-payload page state and the total 53 arithmetic are not separately asserted. No fabricated source, no ok-masking and no write path were found.

## VERDICT: PASS

All five Learning children use the real operator readbacks, the generic renderer fails nulls/errors and renders empty honestly, the five redirects use one history-replace with query/hash, MISSING correctly drops to 5, and 125/125 + UI tsc pass with clean lint. No remaining numbered items. No product file was modified; no commit made.

