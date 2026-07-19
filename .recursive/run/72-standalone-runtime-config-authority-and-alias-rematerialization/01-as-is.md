Run: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-16T00:49:51Z`
LockHash: `acd9bdbf3c46031dcf48cf8e870d617b01a08fbf52b1d8e37d1ccdee7d225d5e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md` (LOCKED)
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-worktree.md` (LOCKED)
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `C:\Users\erikb\.codex\attachments\0fe10a36-5c84-481d-809c-e28c97f60296\pasted-text.txt`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-config.yaml`
- `/role-model-router/apps/launcher/main.go`
- `/role-model-router/apps/launcher/main_test.go`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/session-bootstrap-health.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
Outputs:
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/01-as-is.md`
Scope note: Record the current standalone-runtime config-authority, alias-materialization, and alias-request baseline before root-cause analysis and TDD planning.

## TODO

- [x] Re-read the locked Phase 0 artifacts and recursive control-plane inputs
- [x] Re-read the approved issue statement and the current standalone config files on disk
- [x] Trace the current standalone launcher and bridge config-path behavior from source
- [x] Re-read the current alias-materialization and startup-inventory seams in the bridge
- [x] Inventory the current regression coverage around canonical alias materialization and restart rehydration
- [x] Map the current baseline directly back to `R1` through `R6`
- [x] Audit the artifact for recursive-mode readiness

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `python .agents/skills/recursive-mode/scripts/recursive-router-resolve.py --repo-root . --role analyst` returned `Decision=ask-user` because `role_routes.analyst.cli` is unresolved in this worktree.
Delegation Decision Basis: Phase 1 is direct inspection of the locked inputs, current source, current on-disk standalone config files, and the preserved validated issue statement. With no configured delegated analyst route, the audited phase proceeds as a local self-audit.
Audit Inputs Provided:
- locked run-72 requirements and worktree artifacts
- recursive control-plane documents and relevant runtime-routing memory
- the validated issue statement with preserved request and runtime receipts
- current launcher, bridge, startup, and alias-materialization source
- current on-disk standalone config files under `C:\Users\erikb\AppData\Local\Role Model Runtime`

## Effective Inputs Re-read

- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-worktree.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `C:\Users\erikb\.codex\attachments\0fe10a36-5c84-481d-809c-e28c97f60296\pasted-text.txt`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-config.yaml`
- `/role-model-router/apps/launcher/main.go`
- `/role-model-router/apps/launcher/main_test.go`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/session-bootstrap-health.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`

## Reproduction Steps (Novice-Runnable)

1. Open the worktree at `D:\DEV\role-model\.worktrees\72-standalone-runtime-config-authority-and-alias-rematerialization`.
2. Read the validated issue statement:
   - `Get-Content 'C:\Users\erikb\.codex\attachments\0fe10a36-5c84-481d-809c-e28c97f60296\pasted-text.txt'`
   - Confirm it preserves the earlier live `:3456` evidence: four healthy remote endpoints, singleton canonical alias membership under `baseline.remote-only`, and request-level `POLICY_DENY_ENDPOINT` exclusions for the three non-OpenAI endpoints.
3. Compare the two current standalone config files:
   - `Get-Content 'C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml'`
   - `Get-Content 'C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-config.yaml'`
   - Confirm the root-level file contains singleton canonical aliases pointing only to `chatgpt/gpt-5.4`, while the `state` file contains the full four-model canonical alias matrix.
4. Confirm the current live standalone surface is not presently running:
   - `Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3456/api/role-model/runtime/summary'`
   - Current result: `No connection could be made because the target machine actively refused it. (127.0.0.1:3456)`
5. Read the current standalone launcher path construction:
   - `/role-model-router/apps/launcher/main.go:27-33`
   - `/role-model-router/apps/launcher/main.go:87-96`
   - Confirm `resolveRuntimeStateRoot(...)` uses `UserCacheDir()/Role Model Runtime` and `buildRuntimeArgs(...)` passes only `--runtime-state-root` plus `--scope-id standalone-runtime`.
6. Read the current bridge fallback path logic and startup seams:
   - `/role-model-router/apps/runtime-host-bridge/src/index.ts:24243-24245`
   - `/role-model-router/apps/runtime-host-bridge/src/index.ts:15940-16032`
   - `/role-model-router/apps/runtime-host-bridge/src/index.ts:17113-17121`
   - `/role-model-router/apps/runtime-host-bridge/src/index.ts:24055-24076`
   - Confirm the bridge defaults `unifiedRuntimeConfigPath` to `path.join(runtimeStateRoot, "runtime-config.yaml")`, materializes canonical aliases when config is applied, and only refreshes inventory or drift warnings during the startup `inventory` stage.
7. Compare the standalone launcher path shape with other bridge-owned launch paths already in source:
   - `/role-model-router/apps/runtime-host-bridge/scripts/start.ts:27-33`
   - `/role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts:10-14`
   - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts:22576-22697`
   - Confirm the packaged bridge default already expects a `.../Role Model Runtime/state/runtime-config.yaml` authority, which differs from the standalone launcher's current root-level cache-path behavior.

## Current Behavior by Requirement

| Requirement | Current behavior |
| --- | --- |
| `R1` | The standalone launcher and the bridge do not currently guarantee one authoritative config path. `main.go:27-33` resolves the standalone runtime-state root to `.../Role Model Runtime`, `main.go:87-96` passes that root without `--unified-runtime-config-path`, and `index.ts:24243-24245` therefore defaults the backend authority to `.../Role Model Runtime/runtime-config.yaml`. Current disk state proves a competing `.../Role Model Runtime/state/runtime-config.yaml` also exists and currently carries the full four-model canonical alias matrix. |
| `R2` | Canonical primary alias materialization is implemented, but it is currently coupled to config application rather than all startup reconciliation. `index.ts:15940-16032` derives canonical alias membership from the current effective routable inventory, and `index.ts:17113-17121` re-materializes and rewrites the config when `applyUnifiedRuntimeConfigState(...)` runs. The startup `inventory` stage at `index.ts:24055-24076` only refreshes `currentRoutableInventory` and drift warnings; it does not persist repaired canonical aliases after startup reconciliation changes inventory truth. |
| `R3` | The preserved live issue statement proves alias-based requests are currently constrained before route scoring: `baseline.remote-only` resolved only to `chatgpt/gpt-5.4`, `allowEndpoints` contained only the GPT-5.4 endpoint, and the three other healthy remote endpoints were excluded with `POLICY_DENY_ENDPOINT`. The current on-disk singleton root config and current startup code remain consistent with that failure shape. |
| `R4` | The backend already exposes some related diagnostics, but not a complete authoritative stale-truth contract. `index.ts:16032-16038` computes alias drift warnings, `index.ts:18701-18705` reports the configured runtime-config source path, and `index.ts:21199-21275` exposes unified-config path truth via summary and config APIs. The current baseline still allows a stale authority source and does not guarantee post-start canonical alias repair or explicit degraded signaling for underpopulated canonical aliases. |
| `R5` | Existing regression coverage is close but incomplete. `backend-unified-runtime-config.test.ts:421`, `:642`, `:722`, and `:909` cover startup canonicalization, alias bootstrap, settings-specific remote-only bootstrap, and full-matrix persistence. `endpoint-rehydration.test.ts:134` already covers endpoint reconciliation when SQLite rows exist. `restart-rehydration.test.ts:51` covers restart restoration. `session-bootstrap-health.test.ts:13` covers bootstrap receipts. None of those tests currently prove standalone launcher authority normalization, legacy authority-path migration, or post-start alias rematerialization after startup inventory changes. |
| `R6` | No Phase 5 rebuilt-runtime proof exists yet for the approved standalone-launcher path. The preserved issue statement shows the bug on the standalone surface when it was running, but the current live `:3456` surface is offline, so no repaired rebuilt-runtime evidence exists yet in this run. |

## Source Requirement Inventory

- `R1` | Sources: run-72 requirements, `main.go`, `index.ts`, current disk config files, `index.test.ts:22576-22697` | Disposition: `in-scope` | Source Quote: `The standalone runtime must not silently diverge across competing runtime-config.yaml authorities for the same operator state.` | Summary: multiple path conventions exist today, and the standalone launcher currently falls back to the stale root-level authority.
- `R2` | Sources: run-72 requirements, `index.ts:15940-16032`, `index.ts:17113-17121`, `index.ts:24055-24076` | Disposition: `in-scope` | Source Quote: `Canonical primary aliases for the runtime-owned strategy x execution-mode matrix must be refreshed from the current canonical routable inventory after startup reconciliation changes endpoint or model truth.` | Summary: canonical aliases are currently re-materialized on config application, but not after later startup inventory changes.
- `R3` | Sources: preserved issue statement, `index.ts` alias and router summary seams | Disposition: `in-scope` | Source Quote: `Once the canonical alias matrix is truthful, alias-based requests must allow the router to consider the full healthy candidate set instead of hard-pinning through stale alias membership.` | Summary: the preserved request receipt proves the router never saw a real multi-candidate pool because alias membership had already collapsed to one model.
- `R4` | Sources: run-72 requirements, `index.ts:16032-16038`, `index.ts:18701-18705`, `index.ts:21199-21275` | Disposition: `in-scope` | Source Quote: `The backend must make it observable when alias truth and routable inventory are authoritative versus stale so operators and later runs do not have to infer this class of bug indirectly from request receipts.` | Summary: partial diagnostics exist, but they do not yet provide a deterministic standalone stale-authority repair or explicit degraded contract.
- `R5` | Sources: run-72 requirements, current bridge and launcher test suites | Disposition: `in-scope` | Source Quote: `Implementation must follow strict RED-GREEN discipline and add regression coverage that protects config authority, alias rematerialization, and alias-request routing on the standalone surface.` | Summary: the current suites exercise adjacent behavior, but not the specific root-vs-state authority split or post-start rematerialization gap.
- `R6` | Sources: run-72 requirements, worktree artifact, current live runtime state | Disposition: `in-scope` | Source Quote: `Closeout is not complete until the rebuilt standalone runtime surface that owns http://127.0.0.1:3456 proves the repaired authority and multi-endpoint alias behavior end to end.` | Summary: rebuilt standalone verification is still entirely open.

## Relevant Code Pointers

### Standalone launcher authority selection

- `/role-model-router/apps/launcher/main.go:27-33`
  - `resolveRuntimeStateRoot(...)` resolves the standalone runtime-state root to `UserCacheDir()/Role Model Runtime`.
- `/role-model-router/apps/launcher/main.go:87-96`
  - `buildRuntimeArgs(...)` passes `--runtime-state-root` and `--scope-id standalone-runtime` but does not pass `--unified-runtime-config-path`.
- `/role-model-router/apps/launcher/main.go:353`
  - the packaged launcher executes the bridge binary using those arguments.
- `/role-model-router/apps/launcher/main_test.go:13-35`
  - current launcher expectations assert exactly that argument shape.

### Bridge config-path defaults and published path truth

- `/role-model-router/apps/runtime-host-bridge/src/index.ts:24243-24245`
  - `resolveBridgeServerOptions(...)` defaults `unifiedRuntimeConfigPath` to `path.join(runtimeStateRoot, "runtime-config.yaml")`.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:15168-15191`
  - startup reads and may rewrite the current unified-runtime config file at the selected authority path.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:18701-18705`
  - router summary reports the runtime-config source path it is using.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:21199-21275`
  - runtime summary and config APIs expose the current unified-config path.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts:22576-22697`
  - packaged bridge defaults already expect `C:\Users\tester\AppData\Local\Role Model Runtime\state\runtime-config.yaml` on Windows and the analogous `.../state/runtime-config.yaml` path on POSIX.

### Canonical alias materialization and startup inventory timing

- `/role-model-router/apps/runtime-host-bridge/src/index.ts:15940-15989`
  - `deriveRoutingAliasBootstrapModelIds(...)` computes canonical alias membership from the current effective routable inventory and fallback config state.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:15991-16032`
  - `materializeCanonicalRoutingAliasMatrix(...)` rebuilds the canonical strategy x execution-mode alias matrix while preserving custom aliases.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:16032-16038`
  - `refreshRoutableInventoryState()` updates `currentRoutableInventory` and alias drift warnings only.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:17113-17121`
  - `applyUnifiedRuntimeConfigState(...)` rewrites the unified config file after re-materializing canonical aliases.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:24055-24076`
  - the startup `inventory` stage refreshes inventory and drift warnings but does not persist repaired canonical aliases back to the config authority.

### Existing regression seams

- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts:421`
  - startup canonicalizes the primary routing alias to the live routing matrix.
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts:642`
  - startup bootstraps the primary routing alias when aliases are absent.
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts:722`
  - startup bootstraps a settings-specific primary routing alias for remote-only posture.
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts:909`
  - startup persists the full canonical routing alias matrix rather than a single alias.
- `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts:134`
  - restart reconciliation already covers missing persisted remote activations even when SQLite already has endpoint rows.
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts:51`
  - restart rehydration already restores activated endpoints and readiness truth.
- `/role-model-router/apps/runtime-host-bridge/test/session-bootstrap-health.test.ts:13`
  - `/healthz` summary already exposes bootstrap receipts.

## Evidence

- Preserved validated runtime evidence from `pasted-text.txt`:
  - runtime summary reported `executionMode: remote_only`, `routingStrategy: baseline`, and `endpointCount: 4`
  - all four configured remote endpoints were healthy and `routingEligible: true`
  - `/api/role-model/runtime/config` reported the applied config path as `C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml`
  - all canonical aliases in that applied config pointed only to `chatgpt/gpt-5.4`
  - request `req-6c32e82a-7bbc-4bb3-9975-78c55232e5c5` showed `requestedModelId: baseline.remote-only`, `resolvedModelIds: ["chatgpt/gpt-5.4"]`, one `allowEndpoints` entry, and explicit `POLICY_DENY_ENDPOINT` exclusions for the DeepSeek and Kimi endpoints
- Current disk evidence:
  - `C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml` still contains singleton canonical aliases for `chatgpt/gpt-5.4` only
  - `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-config.yaml` currently contains the full four-model canonical alias matrix
- Current live-runtime evidence:
  - `Invoke-WebRequest http://127.0.0.1:3456/api/role-model/runtime/summary` now fails with `actively refused`, so the current run cannot use new live receipts until Phase 5 rebuilds and starts the runtime again
- Current source evidence:
  - the standalone launcher argument shape still omits `--unified-runtime-config-path`
  - the bridge still defaults to `path.join(runtimeStateRoot, "runtime-config.yaml")`
  - packaged bridge defaults already expect `.../state/runtime-config.yaml`
  - canonical alias rewrite currently happens during config application, not after the later startup `inventory` stage

## Known Unknowns

- Whether the final canonical standalone config authority should be the bridge's packaged default `.../state/runtime-config.yaml` path directly, or an equivalent explicit migration target that preserves current user-authored state while aligning all standalone launch paths.
- Whether any legacy scope-specific `runtime-config.yaml` variants also need one-time normalization during standalone startup, beyond the currently observed root-level and `state/` files.
- Whether Phase 4 or Phase 5 will need a minimal runtime-ui diagnostic surface for `R4`, or whether the existing summary and config APIs are sufficient once they become authoritative.

## Traceability

- `R1`: competing config authorities and the current standalone-launcher fallback path are recorded
- `R2`: current alias-materialization timing versus startup inventory timing is recorded
- `R3`: the preserved single-candidate alias-request evidence is recorded
- `R4`: current path-truth and alias-drift diagnostics are recorded along with their current limits
- `R5`: current regression seams and their missing coverage are recorded
- `R6`: rebuilt-runtime proof remains explicitly open

## Gaps Found

None beyond the scoped standalone authority and post-start alias-rematerialization defects captured in the locked requirements.

## Repair Work Performed

None. This is a Phase 1 current-state artifact only.

## Audit Verdict

Audit: PASS

The current standalone defect baseline is concrete enough to drive root-cause analysis without speculative implementation. The preserved live receipts, current on-disk config divergence, and current source seams all point at the same narrow authority and rematerialization defect family.

## Earlier Phase Reconciliation

- `00-requirements.md` scoped the run to standalone authority, canonical alias rematerialization, alias-request routing truth, diagnostics, strict TDD, and rebuilt-runtime proof.
- `00-worktree.md` fixed the diff basis at `git diff --name-only 0fa9031e9809965dce2dcb0f8f39673de6e117a0`. This artifact reuses that basis unchanged.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct inspection of the locked run artifacts, the validated issue statement, current on-disk standalone config files, current launcher and bridge source, and current test seams
- Acceptance Decision: `not applicable`
- Refresh Handling: no delegated artifacts to refresh
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `0fa9031e9809965dce2dcb0f8f39673de6e117a0`
- Comparison reference: `working-tree`
- Normalized baseline: `0fa9031e9809965dce2dcb0f8f39673de6e117a0`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 0fa9031e9809965dce2dcb0f8f39673de6e117a0`
- Diff basis used: `git diff --name-only 0fa9031e9809965dce2dcb0f8f39673de6e117a0`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/72-standalone-runtime-config-authority-and-alias-rematerialization`
- Active worktree path: `D:\DEV\role-model\.worktrees\72-standalone-runtime-config-authority-and-alias-rematerialization\`
- Planned or claimed changed files:
  - `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/01-as-is.md`
- Unexplained drift:
  - none

## Requirement Completion Status

- `R1` | Status: `deferred` | Rationale: Phase 1 confirms competing standalone config authorities and a launcher-vs-bridge default mismatch, but no canonical authority normalization exists yet | Deferred By: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
- `R2` | Status: `deferred` | Rationale: Phase 1 confirms canonical alias rewrites are tied to config application rather than the later startup inventory stage | Deferred By: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
- `R3` | Status: `deferred` | Rationale: the preserved request receipt proves alias-based routing still collapses to one endpoint before scoring | Deferred By: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
- `R4` | Status: `deferred` | Rationale: path truth and drift warnings exist, but they do not yet provide authoritative stale-truth repair or degraded signaling for the standalone defect | Deferred By: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
- `R5` | Status: `deferred` | Rationale: strict RED-first coverage for the standalone authority split and post-start rematerialization gap does not exist yet | Deferred By: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
- `R6` | Status: `deferred` | Rationale: rebuilt standalone runtime verification has not started yet and the current live surface is offline | Deferred By: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`

## Coverage Gate

- [x] Locked Phase 0 inputs and recursive control-plane documents were re-read
- [x] The preserved live issue statement and the current on-disk standalone config files were inspected together
- [x] The standalone launcher, bridge config-path defaults, alias-materialization seams, and test seams were mapped directly back to `R1` through `R6`

Coverage: PASS

## Approval Gate

- [x] The current-state baseline is concrete enough for root-cause analysis
- [x] The defect family is demonstrably about authority selection and post-start alias rematerialization, not general router scoring
- [x] No unresolved ambiguity blocks Phase 1.5

Approval: PASS
