Run: `/.recursive/run/56-pi-role-model-gap-closure/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-22T13:36:11Z`
LockHash: `fac0f110269e3e443eae22faa5a0e07b1e29b6d2006784417a7703983749a757`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/01-as-is.md`
- External proposal: `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- External addendum: `D:/DEV/role-model-proposals/15-pi-role-model-package-gap-closure-addendum.md`
Outputs:
- `/.recursive/run/56-pi-role-model-gap-closure/02-to-be-plan.md`
Audit Execution Mode: `self-audit`
Audit Result: `PASS`
TDD Mode: `strict`

## TODO

- [x] Preserve the run 56 package boundary and safety decisions
- [x] Define RED/GREEN implementation slices for every requirement gap
- [x] Define evidence paths for RED, GREEN, final test, and build logs
- [x] Define Phase 4 proposal/addendum verification artifacts
- [x] Define Phase 5 Pi-driven QA checks and receipts
- [x] Confirm no production code changes are part of Phase 2

## Target State

`packages/pi-role-model` remains a narrow Pi package for an externally running Role-Model runtime. After run 56, it should:

- discover Role-Model through `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, and controlled `/v1/models` fallback;
- reject remote endpoints by default and explain how to enable them explicitly;
- fail closed on auth-required runtime contracts unless an explicit supported token source exists;
- map provider metadata conservatively and report degraded/fallback-derived model records;
- make `/role-model alias use <alias>` call Pi's `setModel` when the extension can construct the selected Role-Model model object;
- report actionable status, doctor, alias, trust, auth, fallback, provider, and active-model state;
- update README, skill guidance, and package metadata to match behavior and safety boundaries.

## TDD Slice Plan

All production changes in Phase 3 must follow this sequence:

1. Add or update tests for the next behavior.
2. Run the focused package test and capture RED evidence under `evidence/logs/phase3/red/`.
3. Implement only the code required for that behavior.
4. Run the focused package test and capture GREEN evidence under `evidence/logs/phase3/green/`.
5. Refactor only after GREEN, then rerun the focused test if behavior can be affected.

### Slice 1: Configuration And Endpoint Trust

RED tests:
- `test/config.test.ts`
  - default endpoint normalizes to `http://127.0.0.1:3456`;
  - `ROLE_MODEL_ENDPOINT` is accepted as documented environment override;
  - local loopback hosts are allowed by default;
  - non-local endpoints are blocked before network calls by default;
  - non-local endpoints are allowed only with explicit `allowRemote`;
  - remote endpoints require trusted context when a trust callback/context is available.

Implementation files:
- `src/config.ts`
- `src/types.ts`
- `src/runtime-discovery.ts`
- `src/extension.ts`

### Slice 2: Typed Runtime Discovery

RED tests:
- `test/runtime-discovery.test.ts`
  - normal discovery fetches `/healthz`, `/api/version`, and rich downstream discovery;
  - timeout/unavailable/malformed/incompatible states are distinct;
  - blocked remote endpoint is reported as a typed state without a network call;
  - `/v1/models` fallback is attempted only for allowed rich-discovery failures;
  - fallback discovery emits conservative/degraded diagnostics;
  - incompatible rich discovery does not silently register a provider.

Implementation files:
- `src/runtime-discovery.ts`
- `src/downstream-openai.ts`
- `src/types.ts`

### Slice 3: Auth Safety And Provider Mapping

RED tests:
- `test/downstream-openai.test.ts`
  - placeholder bearer auth is accepted only when `authentication.required === false`;
  - `authentication.required === true` fails closed without an explicit supported token source;
  - provider mapping prefers `piMapping`;
  - provider mapping falls back to `limits.safeContextWindow` and `limits.safeMaxOutputTokens`;
  - provider mapping falls back to explicit conservative constants only when no limits exist;
  - fallback-derived records are marked degraded in diagnostics but not injected into Pi provider model fields;
  - rich reasoning shapes map from `capabilities.reasoning.supported`;
  - Pi-required `input` and zeroed `cost` fields are always present.

Implementation files:
- `src/downstream-openai.ts`
- `src/provider-registration.ts`
- `src/types.ts`

### Slice 4: Commands And Provider State

RED tests:
- `test/commands.test.ts`
  - `status` reports connection state, endpoint, version, alias count, selected alias, provider state, auth/trust/fallback state, and warnings;
  - `doctor` reports each healthy check and gives remediation text for remote block, auth-required block, unavailable runtime, malformed discovery, missing aliases, degraded metadata, and active-model failure;
  - `alias list` shows recommended/selected/readiness/degraded indicators;
  - `alias recommended` reports usability;
  - `alias refresh` is idempotent and preserves selected alias when still available;
  - disappeared selected aliases are warned or cleared.

Implementation files:
- `src/commands.ts`
- optional `src/status.ts`
- `src/alias-store.ts` only if persistence semantics need a small adjustment.

### Slice 5: Pi Active Alias Selection

RED tests:
- `test/commands.test.ts`
  - `alias use <alias>` calls a provided active-model setter with a `role-model` provider model object;
  - failed `setModel` returns a clear limitation/auth message and does not claim success;
  - unknown aliases do not change package state;
  - selected alias survives refresh when available.
- `test/extension.test.ts`
  - extension passes `pi.setModel` into command dependencies when present;
  - extension still loads `/role-model` when startup discovery fails.

Implementation files:
- `src/types.ts`
- `src/commands.ts`
- `src/extension.ts`
- `src/provider-registration.ts` if model-object construction should be shared.

### Slice 6: Docs, Skill, Metadata, And Safety

RED tests:
- `test/docs-and-safety.test.ts`
  - root README `Installation for Pi` includes endpoint configuration, setup/status/doctor/ui/alias commands, remote trust, auth fail-closed behavior, and safety notes;
  - skill explains package/runtime responsibilities, aliases/direct models, routing authority, diagnostics, benchmarks, troubleshooting, security boundaries, and Pi auth-file restrictions;
  - skill points to the Role-Model README for user-directed external runtime installation/launch instructions;
  - source still contains no launcher/process/auth-storage/benchmark side effects.
- `test/package-manifest.test.ts`
  - manifest includes `keywords` with `pi-package`;
  - manifest package name and Pi extension/skill paths remain correct.

Implementation files:
- `README.md`
- `packages/pi-role-model/README.md`
- `packages/pi-role-model/skills/role-model/SKILL.md`
- `packages/pi-role-model/package.json`
- safety tests only where needed.

## Evidence Commands

Focused RED/GREEN commands:

```powershell
corepack pnpm --filter pi-role-model test -- test/config.test.ts
corepack pnpm --filter pi-role-model test -- test/runtime-discovery.test.ts
corepack pnpm --filter pi-role-model test -- test/downstream-openai.test.ts
corepack pnpm --filter pi-role-model test -- test/commands.test.ts
corepack pnpm --filter pi-role-model test -- test/extension.test.ts
corepack pnpm --filter pi-role-model test -- test/docs-and-safety.test.ts test/package-manifest.test.ts
```

Final automated checks:

```powershell
corepack pnpm --filter pi-role-model build
corepack pnpm --filter pi-role-model test
```

Log locations:

- RED: `/.recursive/run/56-pi-role-model-gap-closure/evidence/logs/phase3/red/`
- GREEN: `/.recursive/run/56-pi-role-model-gap-closure/evidence/logs/phase3/green/`
- Final Phase 3: `/.recursive/run/56-pi-role-model-gap-closure/evidence/logs/phase3/final/`
- Phase 4: `/.recursive/run/56-pi-role-model-gap-closure/evidence/logs/phase4/`
- Phase 5: `/.recursive/run/56-pi-role-model-gap-closure/evidence/logs/phase5/`

## Phase 4 Verification Plan

Create `04-test-summary.md` and a traceability table mapping:

- original proposal sections from `14-pi-role-model-package-proposal-audited.md`;
- addendum gaps from `15-pi-role-model-package-gap-closure-addendum.md`;
- run 56 requirement IDs `R1` through `R14`;
- implementation files;
- tests and evidence logs;
- Phase 5 manual/agent-operated QA checks.

Phase 4 must explicitly verify:

- build and full package tests pass;
- every required addendum test category exists and is meaningful;
- no Role-Model runtime launcher/process manager/install/update ownership was added;
- no hidden model calls or benchmark commands were added;
- no credential sync/import/export or Pi auth storage access was added;
- package docs and skill guidance match actual command behavior;
- provider registration remains compatible with Pi's current `registerProvider`, `registerCommand`, and `setModel` APIs.

## Phase 5 Pi-Driven QA Plan

Phase 5 execution mode: `agent-operated`.

Required setup:

- start or connect to an externally running Role-Model runtime;
- confirm runtime exposes `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, and `/v1/models`;
- install the local worktree package into the actual local Pi executable with the normal Pi package flow;
- do not manually edit Pi credentials or copy secrets.

Required passing checks:

1. `pi install <worktree>/packages/pi-role-model` succeeds.
2. `pi list` shows `pi-role-model`.
3. Pi can read/load the `role-model` skill.
4. Pi can register provider `role-model` from discovery.
5. `/role-model setup` succeeds.
6. `/role-model status` shows endpoint, version, alias count, selected alias, provider state, and warnings.
7. `/role-model doctor` passes healthy-runtime checks.
8. `/role-model ui` reports the runtime URL without launching/managing the runtime.
9. `/role-model alias list` shows aliases with recommended/selected/readiness indicators.
10. `/role-model alias recommended` reports a usable alias.
11. `/role-model alias use <alias>` sets Pi active model or clearly reports the verified Pi limitation/failure.
12. `/role-model alias refresh` updates provider metadata without losing a valid selected alias.
13. Pi's normal model listing can show Role-Model provider models.
14. Pi can complete a prompt through explicit `role-model/<alias>` model selection.
15. If active-model selection succeeds, Pi can complete a prompt through the selected alias without passing `--model`.
16. A blocked remote endpoint produces clear status/doctor failure until explicit trust/allowRemote is enabled.
17. A runtime reporting `authentication.required === true` fails closed unless explicit supported token source behavior is implemented.
18. No command output contains credential values.

Any Phase 5 failure that indicates implementation mismatch must send the run back to Phase 3 with a new RED test before fixing.

## Safety Boundaries

The implementation must not add:

- calls to `role-model-launcher`;
- process lifecycle APIs such as `child_process`, `spawn`, `exec`, service install/start/stop/update code;
- credential lookup/copy/sync behavior from Pi auth storage;
- hidden model calls, benchmarks, or model-purchase behavior;
- project-local config that redirects global runtime, binary, or credential behavior.

## Self-Audit

- `R2` through `R10` each have planned RED tests before production edits.
- `R11` strict TDD is operationalized with per-slice RED/GREEN commands and evidence paths.
- `R12` Phase 4 proposal/addendum verification is planned as an explicit traceability artifact.
- `R13` and `R14` Phase 5 real Pi installation/setup/prompt checks are planned and must iterate on implementation defects.
- No production code changes are included in Phase 2.

Approval: `PASS`
