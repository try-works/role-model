# R16 like-for-like seeding (task-85)

Owner-approved 2026-11-01. Production :3456 and its state were not touched.

## Isolated targets

| side | binary | port | state root | scope | base |
|---|---|---|---|---|---|
| R | D:/role-model-router/0.0.20/role-model.exe | 3470 | D:/DEV/rm-clean/r16-seed-left | standalone-runtime | compare-state-r (old artifact-store SQLite schema) |
| C | role-model-router/dist/release/win32-x64/role-model-dev.exe | 3471 | D:/DEV/rm-clean/r16-seed-right | standalone-runtime-dev | compare-state-d (current artifact-store schema) |

The different bases are deliberate: the preserved 0.0.20 binary was never pointed at the candidate artifact schema.

## Seeded authorized configuration

Equivalent authorized config was copied/imported into both roots from the production-pattern live state:

- runtime-config.yaml sha256 `569e6ed25a3bde15528ea6e02a83dcf8c5f7a308b6d1d3edb3590d7f8f461b34` on both roots.
- provider_accounts: 2 identical rows on both roots
  - deepseek.personal.deepseek-api-key
  - openai.personal.openai-codex-subscription
- runtime_endpoints: 4 identical rows on both roots
  - deepseek...deepseek-flash-high
  - deepseek...deepseek-flash-max
  - openai...gpt-6-astra
  - openai...gpt-6.1-sol
- provider_device_auth_sessions: 2 identical rows on both roots.
- credentials directory copied to both roots (1 credential file each; bytes never printed).
- old test-only accounts (anthropic.team.shared, openai.personal.primary) removed from both memory DBs.
- key-lifecycle.json removed from both copied roots after seeding and after the launch attempts (absent at handoff).

No credential bytes, tokens, or account secrets are recorded in this evidence.

## Launch attempts

Both binaries were launched with isolated roots, the copied runtime-config, 127.0.0.1 ports, and their own Track B manifests. Both reached HTTP health but stayed 503:

- 3470: sessionBootstrap.backend=status failed, "Track B sidecar exited before readiness (1): ..." (the sidecar error text contains a large bundled-source line).
- 3471: same backend failure.

The failing sidecar was reproduced independently: running each package's runtime-operations-server.mjs directly with the same state root/manifest starts and prints {"type":"ready"} (right sidecar on 3490; old sidecar on an ephemeral port). The host-spawn path still exits 1 before readiness. No compare-release or routing harness was run against a 503 host.

Processes were stopped and ports 3470/3471/3490 released. Production :3456 remained owned by PID 23120 throughout.

Launch/health evidence:
- evidence/logs/r16-left-stdout.log, r16-left-stderr.log
- evidence/logs/r16-right-stdout.log, r16-right-stderr.log

## Status

Seeding: complete and verified equivalent (same config hash, 2 accounts, 4 endpoints, 2 device-auth sessions).
Comparison: BLOCKED on the host-spawned Track B sidecar failure above; not a seeding mismatch.
