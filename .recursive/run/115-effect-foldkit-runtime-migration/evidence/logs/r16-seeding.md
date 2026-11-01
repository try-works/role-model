# R16 like-for-like seeding (task-85)

Owner-approved 2026-11-01. Production :3456 and its state were not touched.

## Isolated targets

| side | binary | port | state root | scope | root construction |
|---|---|---|---|---|---|
| R | D:/role-model-router/0.0.20/role-model.exe | 3470 | D:/DEV/rm-clean/r16-seed-left | standalone-runtime | compare-state-r (old artifact-store SQLite schema) + live-state2 config/accounts/endpoints |
| C | role-model-router/dist/release/win32-x64/role-model-dev.exe | 3471 | D:/DEV/rm-clean/r16-seed-right | standalone-runtime-dev | byte copy of live-state2 (known authorized pattern) |

The left base is deliberately the old artifact-store schema: the preserved 0.0.20 binary was never pointed at candidate-migrated state.

## Seeded authorized configuration

Both roots now have the same authorized config:

- runtime-config.yaml sha256 `569e6ed25a3bde15528ea6e02a83dcf8c5f7a308b6d1d3edb3590d7f8f461b34`
- provider_accounts: 2 identical rows
  - deepseek.personal.deepseek-api-key
  - openai.personal.openai-codex-subscription
- runtime_endpoints: 4 identical rows
  - deepseek...deepseek-flash-high
  - deepseek...deepseek-flash-max
  - openai...gpt-6-astra
  - openai...gpt-6.1-sol
- provider_device_auth_sessions: 2 identical rows
- credentials directory copied (1 file each; bytes never printed)
- old test-only accounts (anthropic.team.shared, openai.personal.primary) removed

No credential bytes/tokens/account secrets are recorded here.

## Root cause of the sidecar failure

The first launch attempts failed because the process working directory was `D:/DEV`; the host-spawned Track B sidecar resolves the public taxonomy relative to cwd and tried `C:\Program Files\nodejs\role-model-router\...` and `D:\DEV\data\taxonomy\...`, then exited 1 with a bundled-source stack line.

Launching both hosts with `-WorkingDirectory D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration` makes the taxonomy resolvable. No host code change was needed.

## Healthy state

- 3470: **healthy**, version 0.0.20 (commit 945a8906...)
- 3471: **healthy**, version 0.0.20-478-g2d4fa10b (commit 2d4fa10b..., executable sha256 bfa365e1...)

Both expose the same 2 accounts / 4 endpoints / 2 device-auth sessions.

**Artifact identity (corrected):** the dist manifest, executable sha256, and /api/version all agree on `0.0.20-478-g2d4fa10b` (`2d4fa10b...`, exe sha `BFA365E1...`) once the host is launched with `--repo-root` pointing at the dist manifest root. My earlier 386 reading came from passing `--repo-root D:/DEV/rm-clean/115-public` (an older source checkout), which made /api/version report that checkout's version while the binary was already 478.

## Comparison smoke (confirmed 478)

`node scripts/runtime/compare-release.mjs --left http://127.0.0.1:3470 --right http://127.0.0.1:3471 --fixture-root D:/DEV/rm-clean/115-public/testdata/router-runtime/fixtures --expect-left-version 0.0.20 --expect-right-version 0.0.20-478-g2d4fa10b --allow-cross-channel`

Result: 4 same, 3 additive-shape, 1 different, 1 environment-state.

- identity left=0.0.20 right=0.0.20-478-g2d4fa10b
- different: /api/role-model/router/summary recentDecisionCount 0 vs 3 (state/history difference)
- additive-shape: /healthz, runtime/summary, endpoints
- environment-state: telemetry/summary

Full output: evidence/logs/r16-compare-seeded-478.log.

Hosts remain running on 3470 (PID 27904) and 3471 (PID 25652) for the R16 comparison. `key-lifecycle.json` was removed from both copied roots before launch; the runtime regenerated its own on startup (expected).
