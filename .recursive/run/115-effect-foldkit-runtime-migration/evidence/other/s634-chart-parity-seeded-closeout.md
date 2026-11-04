# S634 - Chart presentation parity + seeded review data closeout (goal-12e45052)

## Final artifact
0.0.20-605-g5b14d8b2 (HEAD 5b14d8b2), sha256 cc483fe10f10c075f926c3eed099c28c5821c51836434ed278d447ea82f4220f - CHANGED vs the previous build. verify-packaged-candidate PASS (bundle 3,492,612). Health 200; served /assets/main.js byte-identical to the package.

## Owner item 1 - no tables among the charts
- e06c2386: chartTable() is now styled sr-only only; the chart cards show the plot (axis labels/legend) with the numeric table kept as a visually-hidden accessibility node carrying data-chart-part="table".
- 9804077d: the s628 regression renders ALL chart surfaces (Overview, Requests metrics fixture, ObserveRouting nine cards) and asserts every chart table exists, carries data-chart-part="table", is sr-only, and that zero table:not(.sr-only) appears on them; s612's visible-table contract was updated to hidden.
- 5b14d8b2: removed the stray visible "Routing results" Model/Endpoint/Count card from /observe/routing (the :3456 reference has NO tables there); the route is now filter bar + nine chart cards only, with an invisible data-observe-routing-rows/status probe for the shared-readback state test.
- Live verification: /observe/routing 9 cards, 9 tables ALL sr-only, 0 visible, no "Routing results" text; overview 6 cards / 6 hidden; Requests chart card 0 visible (the remaining visible "Recent telemetry requests" table is the data list, not a chart table).

## Owner item 2 - seeded review data
- cb2debe4: deterministic seeding path committed - scripts/runtime/seed-review-telemetry.mjs (+ .md documentation + 3 deterministic node --test cases) and scripts/runtime/chart-dom-probe.mjs; evidence under evidence/charts-seeded and evidence/charts-final (screenshots + probe JSON).
- Final live seed: 320 requests (285 success / 35 failures), 270,710 tokens, 170 cache hits, p50 689ms / p95 2,888ms, 4 models, 24 hourly buckets.
- Chart DOM on the final build: Overview 6 cards (46 bars; token 3/3, cache 2/2, latency 2/2, success-vs-failure 2 series), Requests volume 2/2, Routing 9 cards / 76 bars.

## Observe-routing chart parity (owner: observe pages missing charts)
- 07d002d6: ported the nine :3456 chart definitions verbatim (Cost avoided by routing, Routing decision volume, Routing volume by taxonomy role, Avoided cost by taxonomy task, Difficulty distribution, Strategy selection trend, Capability routing mix, Tool class routing mix, Model selection) with a batch LoadRoutingCharts POSTing /api/role-model/telemetry/query for all nine, last-write-token semantics, in-plot honest empties.
- 8237cf71: the live dispatch threads model.observeRoutingFilters through one helper at ChangedUrl / ObserveRangeChanged / ObserveFilterChanged; Cost avoided + Routing decision volume honor the selected breakdown (Total->null, endpoint variant->endpointId, upstream model->modelId, provider->providerId); source/difficulty map to sourceTypes/difficultyBuckets.
- 5c93c207: init route entry restores filters from the URL and builds the nine entry queries through the same mapping (fresh load keeps reference defaults).
- Live verification: URL-restored ?source=local&breakdown=By+upstream+model&difficulty=hard issued nine queries, each with sourceTypes:["local"] + difficultyBuckets:["hard"], model-selection breakdown modelId.
- Honest gap: the reference taxonomy/strategy URL filters have no UI/state in this port; those keys are left absent rather than fabricated (recorded in s633-charts-hold-summary.md).

## Queues route
- Route/init changes made /observe/queues render in place; the reported redirect could not be reproduced at 07d002d6, so ba2dbbc8 adds a regression invariant (URL variants parse as Queues; mounted route renders Queues copy and not Overview) instead of a fabricated product change.

## Verification
- Full UI suite at 5b14d8b2: 107 files / 966 tests PASS (s633-full-ui-routing-table.log); S247 4/4 (no click changes); UI tsc 0.
- Every slice independently reviewed; HOLDs closed with evidence (sr-only on all surfaces, reference-exact nine query payloads incl. breakdowns/filters/ranking limits, init-entry URL-restore test, routing zero-visible-tables).
- Final packaged evidence: ab4cbd89 (evidence/charts-final).

## Recorded remainder
Reference taxonomy/strategy routing filters are not present in this port's filter state (no fabrication). Structural-only visual parity remainder for SystemOperator/SystemExtensions from the prior goal remains recorded.
