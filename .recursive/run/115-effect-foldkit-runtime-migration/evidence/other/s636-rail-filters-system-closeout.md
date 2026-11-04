# S636 - Sidebar rail refresh, routing filters, system parity, tooling-gate verification (goal-35b114f4)

## Final artifact
0.0.20-649-g4a5c9faa (HEAD 4a5c9faa), sha256 9e5951f467c61476ca2b4c75ef7e65452e534e6e3c09c64624c3bc2f3d9355c7 - CHANGED vs 60d0c999. verify-packaged-candidate PASS. Health healthy. UI suite 114 files / 993 tests PASS, exit 0. Live on 127.0.0.1:3480.

## 1. Sidebar model inventory reflects the registry without a reload (owner-reported)
- 6a0e88b6: ModelsActionSucceeded and EndpointAdmissionSucceeded re-read the full rail set {models, runtimeSummary, health, dashboard, router, overviewMetrics, routerCandidates} and mark models loading, so the left rail converges in place.
- 914e3c14: mounted test drives the real shell at /models (remove model -> confirm -> peer unload POST -> ModelsActionSucceeded) and asserts the sidebar renders new-model with old-model gone, no reload; plus the exact seven-key rail plan.
- ad3f26f4/7ca6543d: evidence + 992/992 full log at that point.
- Packaged host verification (649 build): /models Remove model + Confirm -> rail loses Gpt 5.4 in place, URL unchanged, nav entries equal; review state restored afterwards via the endpoint seeder.

## 2. Observe-routing taxonomy/strategy filters (recorded gap A - closed)
- e397ac05 + 225244f9: host acceptance verified first (POST /api/role-model/telemetry/query echoes all 13 reference filter keys); Model.observeRoutingFilters and ObserveFilterFieldSchema extended; URL restore parses the reference params (roleId, strategy, effort, effortSource, taxGroup/taxRole/taxTask/taxVariant/taxCapability/taxModality/taxTool) and opens Advanced; the observe Advanced section renders the 11 reference controls and dispatches ObserveFilterChanged; routingChartFilters maps single ids to one-element arrays and CSV to trimmed arrays; all nine buildRoutingChartQueries bodies carry the same filters object.
- Tests: s637 exact mapping + nine payloads + URL restore + advanced-field re-query; RED t118-advanced-filters-red.log (3/3 failed) -> GREEN (3/3). Clean-worktree full suite 984, tsc 0, S247 4/4.
- Packaged 649: /observe/routing?taxRole=coder&strategy=baseline restores 11 inputs, aria-expanded=true, 9 charts, 9 POSTs each with taxonomyRoleIds:["coder"] and selectedStrategies:["baseline"], honest empty states for that slice.

## 3. SystemOperator/SystemExtensions real parity (recorded gap B - closed)
- 7eac6505 + 4a5c9faa: real feature pages replace the structural familyPage placeholders. Operator: Operator Controls, capability status grid from operator status evidence, Trace lineage, Replay Jobs (create/cancel), Evaluation Jobs (retry/cancel), Shadow Learning mode select, learning profile + advisory tables. Extensions: readiness counts, contribution posture, recommendation ledger (download/apply/dismiss), replay automation (pause/resume), inventory with real lifecycle/mode/health + per-row Pause.
- New readbacks wired (learningProfile, learningAdvisory, contribution, recommendations, replayAutomation) into init/telemetry plans; parseLearningFamily fixed to preserve full object meta (the old 600-char slice made object rows unparseable).
- Actions target verified host endpoints with exact bodies/paths asserted (recommendations apply/dismiss, track-b replay control, replay cancel, evaluation retry/cancel, extension mutate).
- Packaged 649: Operator sections Operator controls / Operator Capability Status / Trace lineage / Replay Jobs / Evaluation Jobs / Shadow Learning / Learning profile / Advisory (8 table rows); Extensions Extension boundary / Readiness / Contribution posture / Recommendation ledger / Replay automation / Extension inventory (44 table rows). Screenshots vs :3456 captured.
- Residual logged: extension inventory exposes Pause (set_mode disabled) but not a full enable/explicit-mode menu.

## 4. Tooling gates previously unverified (recorded gap C - closed/blocked honestly)
- 6cfe7acb evidence under evidence/logs/s636-tooling-gates/:
  - Linux oxlint native wrapper: ENVIRONMENT-BLOCKED - only WSL distro is Alpine/musl, Docker daemon stopped, no glibc Linux; bootstrapped musl Node and ran the real wrapper: "effect-tsgo oxlint: Linux musl is not supported by the packaged Oxlint integration" exit 1. Needs ubuntu/glibc CI.
  - Network install oracle: VERIFIED - positive frozen-lockfile install exit 0; negative (remove esbuild from onlyBuiltDependencies) reproduced "Ignored build scripts: esbuild"; policy restored, no workspace diff.
  - Live browser parity: VERIFIED - real Chrome, scripts/runtime-parity.mjs --selfcheck status PASSED exit 0; React-vs-React equal/deterministic, React-vs-Foldkit classified different (not forced); captures committed in a new directory; prior s294 evidence restored untouched.

## Evidence
- dff9edb5: review-0.0.20-649-g4a5c9faa/ (healthz identity, endpoints/suite JSON, per-route DOM JSON, version-named PNGs, summary).
- 6cfe7acb tooling-gate transcripts; s637/t118 logs; task117-final-full.log.

## Remaining honest gaps
- Extension inventory lacks a full enable/explicit-mode menu (Pause only).
- Linux oxlint wrapper remains environment-blocked locally (needs glibc CI).
- Reference taxonomy filters exist and are wired for routing charts; the Requests analytics page keeps its reference page-state filter set (breakdown/source/status/ranking) - not extended to every reference filter dimension.
