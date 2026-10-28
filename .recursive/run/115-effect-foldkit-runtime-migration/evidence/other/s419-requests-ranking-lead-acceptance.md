# S419 — bounded Requests ranking acceptance

Controller: GPT; author s5-health-wait and independent reviewer s9-private-readonly verified live as deepseek-flash via list_agents in this round. Worktree comparison HEAD: 475616bb. This accepts only the pending Requests ranking slice, not complete M9, route-wave parity or release parity.

## Changed files and verified behavior
- runtime-ui-next/src/requests-ranking.ts and requests-ranking-view.ts: original five metric/twelve target choices, fixed week/day empty-filter query to POST /api/role-model/telemetry/query, Schema decoding of host ranking rows. Existing GET request readback remains separate.
- src/message.ts, model.ts, commands.ts, app.ts, update.ts and view.ts: actual shell/control/client integration. Metric/target changes query immediately; latest valid selection increments token even during loading. Both invalid-selection paths increment token without a query. Superseded success and failure cannot overwrite current selection or validation. Explicit Run refuses duplicate submission while loading.
- test/s415-requests-ranking.test.ts: ten tests including exact body/path, both option lists, latest-selection success/failure fencing and invalid-selection fencing.

## Independent review and Lead checks
- Independent S418 final bounded PASS: evidence/other/s418-requests-ranking-freshness-review.md (final reviewer-reported SHA256 7F13EDF5050794034493FE30687E69AE36209097CF9C854FA773FD70E89184CC). Prior HOLDs preserved in S416/S418; do not read an earlier HOLD as current or remove its history.
- Lead reran exact suites after final one-line app wiring repair: evidence/logs/s419-lead-final-green.log, 29/29 = s415 10 + s412 8 + s40a-rail 4 + s26k 7, exit 0. UI typecheck exit 0. Earlier Lead invocation accidentally named a nonexistent s40a file and ran three suites; superseded by this exact four-suite run, not counted as four-suite evidence.
- Absolute anti_slop_lint scans (filesScanned=1 each): requests-ranking.ts, requests-ranking-view.ts, s415 test, message.ts, model.ts clean. update.ts retains 10 baseline findings (170-173/568/595/604); app.ts retains 17 baseline findings. Lead removed the newly introduced conditional empty-object spread in app client wiring; no new finding there. Other monolith baseline findings remain disclosed, not clean claims.
- Strict behavioral RED evidence for freshness repair precedes product changes: s417-red.log (2 failures), s417-red-invalid.log (1 failure). GREEN s417-green-invalid.log 29/29. Earlier module-absent S415 RED and S416 auto-query repair preserved separately; no retrospective TDD claim.

## Final key hashes
- requests-ranking.ts FF2F927D9E4E3100B59EF06873F97725561C66CD59099C563169D792446A81EC
- requests-ranking-view.ts 849159875465AA9F0711230667F5DF3A512030185A3E72BF201D3298C063D532
- app.ts A854C1447E7D7A0460D148349D8CBC5678026635E29876D415FFBC750651BDA9
- update.ts 0F14DD6BF53ADE2331719E453A9E2D43884F4E3C2FDCEA697B27C83B8F6C91C1
- s415 test 017AF067E440C667C70583F5B067194B2AED9A6A3E666BEF5F178804A09BAC5F

## Open gates, not waived
Fixed week/day and empty filters are bounded limitations, not full URL/range/filter parity. Mounted browser interaction and console-clean packaged acceptance are NOT proved here; s26k emits localhost:3000 network noise despite passing assertions. Remaining M9 pack/policy/local operations, Learning scopeId threading, R12 stream fallback, two explicit-missing canonical pages, complete route/visual parity and current packaged R/D/C plus ordinary real-client journeys remain open. Earlier COMPLETE headlines require whole-clause reconciliation before run closure. E1/E2 are the only owner-approved scope deferrals; no new deferral is inferred from a local follow-on label. Operator ports/state untouched.

Requirement Completion Status: R9/R12/R13 implemented bounded Requests ranking slice; verified by distinct S418 review and S419 Lead tests; full requirement acceptance pending integrated evidence.
Audit: PASS (bounded slice only)
