Run: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-16T02:09:47Z`
LockHash: `4a029c5aca0633e4ce9d8dda110b963e5459adbd108041131e27e984957bb529`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/04-test-summary.md`
Outputs:
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/05-manual-qa.md`
Scope note: Record rebuilt standalone-runtime verification on the packaged executable that owns the `:3456` runtime contract.

## TODO

- [x] Declare the QA execution mode and rebuilt-runtime evidence
- [x] Record the cold-start and restart scenarios exercised on the packaged standalone runtime
- [x] Capture the authoritative config-path and alias-inventory outcomes
- [x] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `Codex desktop agent`
- Tools Used: `vitest`, `packageSeaRuntime()`, packaged standalone executable, HTTP readiness and config probes inside the regression harness
- Verification Command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/packaged-standalone-restart.test.ts`
- Runtime Under Test: packaged standalone executable produced by `packageSeaRuntime()` from the implementation worktree
- Runtime State Root: ephemeral copied-state repro root under `%TEMP%\role-model-run72-packaged-restart-*\\Role Model Runtime`
- Authoritative Config Path Under Test: `<runtimeStateRoot>\\state\\runtime-config.yaml`
- Evidence:
  - `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/evidence/logs/green/packaged-standalone-restart-green.log`
  - `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/evidence/logs/red/packaged-standalone-restart-red.log`

## QA Scenarios and Results

### Scenario 1: Cold start on the rebuilt standalone runtime with stale singleton canonical aliases and no env credentials

- The packaged executable launched against representative persisted state that already contained remote endpoint rows plus a stale singleton canonical alias matrix.
- The harness launched the packaged runtime with `--runtime-state-root <tempRoot> --scope-id standalone-runtime --unified-runtime-config <tempRoot>\\state\\runtime-config.yaml`.
- `GET /api/role-model/runtime/config` reported the canonical `state/runtime-config.yaml` path rather than the obsolete root-level path.
- The first launch intentionally reached `sessionBootstrap.status = degraded`, reproducing the no-env baseline where `baseline.remote-only` remained the singleton `chatgpt/gpt-5.4`.

**Result:** PASS

### Scenario 2: Restart on the rebuilt standalone runtime after env-backed credentials are restored

- The same packaged executable relaunched against the same runtime-state root with env credentials restored for OpenAI, DeepSeek, and Moonshot.
- The second launch reached `sessionBootstrap.status = ready`.
- `GET /api/role-model/runtime/config` and the rendered canonical file at `<runtimeStateRoot>\\state\\runtime-config.yaml` both showed `baseline.remote-only` expanded to:
  - `chatgpt/gpt-5.4`
  - `deepseek/deepseek-v4-flash`
  - `moonshot/kimi-k2.7-code`
- `GET /api/role-model/router/summary` exposed the same repaired canonical alias truth with `resolvedModelIds` and `allowEndpointIds` covering the full three-endpoint remote pool.
- `GET /api/role-model/runtime/summary` reported the canonical unified-config path and no alias-drift warnings after repair.

**Result:** PASS

### Scenario 3: Request-level routing proof cross-check

- The rebuilt packaged-runtime harness is models-only and is best suited to proving authoritative config-path and alias-pool truth on the real standalone executable.
- The owning request-level `allowEndpoints` proof remains in `backend-unified-runtime-config.test.ts`, which asserts that a `baseline.remote-only` request maps to the same three-endpoint allowlist after the repaired restart bootstrap.
- Together, the rebuilt packaged-runtime alias inventory proof and the owning backend request-mapping proof satisfy the requirement that the standalone alias path no longer hard-pins through stale singleton membership.

**Result:** PASS

## Evidence and Artifacts

- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/evidence/logs/green/packaged-standalone-restart-green.log`
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/evidence/logs/red/packaged-standalone-restart-red.log`
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/evidence/logs/green/backend-unified-full-green.log`

## User Sign-Off

Not required (`agent-operated` QA).

## Traceability

- `R1`: packaged runtime read back the canonical `state/runtime-config.yaml` path through `/api/role-model/runtime/config`
- `R2`: the rebuilt executable repaired canonical primary aliases after restart bootstrap rehydrated the env-backed remote inventory
- `R3`: the same repaired alias pool now surfaces multi-endpoint `allowEndpointIds` on the rebuilt runtime, with owning request-level `allowEndpoints` proof retained in the backend regression
- `R4`: `/api/role-model/runtime/summary` and `/api/role-model/router/summary` now expose authoritative post-repair truth instead of the stale singleton matrix
- `R5`: the QA artifact relies on the strict-TDD green evidence produced by the owning regressions
- `R6`: this phase verifies the repaired behavior on the rebuilt standalone runtime rather than on a dev-only helper

## Coverage Gate

- [x] The rebuilt standalone runtime was verified through a cold start and a restart
- [x] The authoritative config path and repaired canonical alias pool were recorded
- [x] Equivalent request-routing proof is tied back to the owning backend regression

Coverage: PASS

## Approval Gate

- [x] Phase 5 proves the repaired standalone-runtime behavior on the rebuilt executable
- [x] The evidence is sufficient to update shared decisions and state

Approval: PASS

