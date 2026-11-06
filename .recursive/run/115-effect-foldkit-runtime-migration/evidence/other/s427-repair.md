# S427 — UI route-contract test drift repair (frozen)

Task: `tasks/s427-parallel-repair.md`; shared `task-39` rev3 in_progress; owner `s10-reviewer`.
Model: **deepseek-flash** verified via `list_agents` before work.
Patch basis/HEAD: `71151644` (public; no baseline switch).
No product source edits, no commit, no provider/operator/port changes.

## Scope correction (approved by Lead)

The task originally named `evidence/other/s4-contracts-inventory.json`. The test `s26f` actually parses
`evidence/other/s26a-route-inventory.json`; s4 has no `hostEndpoints` schema. The maintained endpoint
inventory updated here is therefore **s26a**; s4 was not edited. taskdoc and `task-39` write scope were
updated to s26a with this reason.

## RED → GREEN

- RED: `evidence/logs/s427-red.log` — 5 files / 5 failed, 71 passed (76), exit 1.
  Failures: s380/s383/s386 stale MISSING 14/10/5 pins; s26e pathname-only recorder vs `kind=pack`;
  s26f inventory lacked `/api/role-model/operator/learning/policy`.
- GREEN: `evidence/logs/s427-green.log` — 5 files / 76 passed, exit 0.

## Patch (6 files; +43/−17)

- `s380-models-roles.test.ts`: removed historical MISSING count; landed family stays absent from
  MISSING and every CURRENT MISSING entry is NotFound + no redirect. Removed the false
  `/app/router/strategy` NotFound assertion.
- `s383-router-family.test.ts`: same semantic replacement; four landed router origins remain absent
  from MISSING; every current MISSING entry NotFound.
- `s386-learning-family.test.ts`: same; five landed learning origins remain absent from MISSING.
- `s26e-readback-routes.test.ts`: recorder now stores `pathname` + `search`; expected derives
  `pathFor("")` or `path` from `READBACK_SPECS`, so `kind=pack` is exact and `windowMs` defaults are
  preserved rather than stripped.
- `s26f-client-host-tie.test.ts`: host route table matched by pathname, inventory by exact
  pathname+search; added exact/no-wildcard guard. Existing auth/abort/GET assertions unchanged.
- `s26a-route-inventory.json`: added the nine verified endpoints to real rows (learning +5,
  local-llama-swap-models, operator-controls trace-roots, extensions, control-routing-strategy
  router/config), preserving each row's complete existing schema.

Verified host literals: `index.ts` 17920/17937 (learning policy), 17986 (records), 18000 (decisions),
18016 (measurement), 18044 (history), 20133 (llama-swap models), 17656 (trace-roots), 18655
(extensions), 19584 (router/config). Caller/source verification: legacy `learning-api.ts` /
`runtime-api.ts` and the corresponding legacy route modules; new client
`runtime-ui-next/src/runtime-endpoints.ts` / `readback.ts`.

## Frozen hashes (SHA-256)

| File | SHA-256 |
|---|---|
| test/s380-models-roles.test.ts | `D46024C186391025DC8679B71670A43DCAC3F5FB0EFC105101FD327CA7E3A081` |
| test/s383-router-family.test.ts | `9EC1F183E3E5370A1F7A774DDF8EBDA5692A81F37A1F34A2626512B8C3CE1B92` |
| test/s386-learning-family.test.ts | `951054D24A17FC5747FAD1D92CE208057AD8C6FB5C5010C56E9B5DE585382BBF` |
| test/s26e-readback-routes.test.ts | `A4DC9013B0FBB25DA37B82BCC3288BB513CF9C0C9B7E92B861BD07E08800D359` |
| test/s26f-client-host-tie.test.ts | `1B147A8E67A7DE6E52264D25030C74034774C40212AE86EC7966CA6CEA615BC9` |
| evidence/other/s26a-route-inventory.json | `750447019F0A9474D07F908AD89C876200BADC39035A0ABA4A408AB2C0D49EBA` |

## Lint

Absolute `anti_slop_lint`, all five files: `filesScanned=1`, `rulesRun=15`.
s380/s383/s386 clean. s26e 6 findings, s26f 4 findings (pre-existing unknown-parameter/return and
missing SAFETY assertions); no new findings introduced by this patch.

## TSC

Historical observation (preserved): UI `tsc -p tsconfig.json --noEmit` exited 2, blocked by untracked
`test/s425-device-auth-correctness.test.ts:210` (`HostBody` types). Not an S427 file and not edited
here; reported to the auth worker.

Status: **RESOLVED by the auth owner.** Lead reports UI tsc now passes; combined seven-suite run:
7 files / 101 tests passed, exit 0 (`evidence/logs/s431-parallel-ui-green.log`). This does not change
the S427 patch or the six frozen hashes above.

## Freeze

Six files frozen; no further edits. Independent review required by a different member. No whole-feature
COMPLETE claimed.
