# s427 — Repair full UI route-contract test drift

Status: pending
TDD Mode: strict
Inputs: S420 audit reports, original00-requirements/source-proposal/02-plan/00-worktree, owner E1/E2 decision. Patch basis public71151644/privatea86ea7a9; no baseline switch.

Expected write scope: PUBLIC runtime-ui-next/test/s380-models-roles.test.ts, s383-router-family.test.ts, s386-learning-family.test.ts, s26e-readback-routes.test.ts, s26f-client-host-tie.test.ts and evidence/other/s26a-route-inventory.json ONLY if maintained endpoint inventory lacks real added readbacks. NO src product files.

Scope correction (approved): s26f reads evidence/other/s26a-route-inventory.json; s4-contracts-inventory.json has no hostEndpoints schema. The maintained endpoint inventory this task updates is therefore s26a, not s4; s4 was not edited.

Read S420 full-ui log failures, original R11-R13 exact request contract and S420 audit. Strict baseline RED: rerun five affected suites before edits, capture actual failures. Replace historical missing-count pins with stable semantic assertions (landed families supported; every CURRENT missing target NotFound; do not delete current coverage or falsely mark missing routes implemented). s26e record pathname+search so kind=pack exact query preserved, not strip expected query. s26f update inventory only after actual host route/readback caller/source verification, with complete existing schema fields, not loose wildcard allowlist. Do not weaken exact method/path/query/auth/abort checks. Run affected5 green+UI tsc, absolute anti_slop_lint nonempty; no product fix/route changes. Endpoint addition must not invent owner authority.

Coordination: only listed scopes; all peers share filesystem. Read current files before edit; prefer edit, no whole-monolith scripted rewrites or checkout/reset. No formatter on shared files. No commit. Before substantive work verify live deepseek-flash via list_agents; report mismatch. Evidence run logs s427-red/green.log; report actual counts, hashes, tsc/syntax, anti_slop_lint filesScanned>0. Keep existing operator3456/3457/3458/state untouched; os.tmpdir disposable roots. Independent review must be different member after freeze. No whole-feature COMPLETE.
