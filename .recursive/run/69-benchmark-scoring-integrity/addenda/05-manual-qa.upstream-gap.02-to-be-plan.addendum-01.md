Run: `/.recursive/run/69-benchmark-scoring-integrity/`
Phase: `05 Manual QA upstream-gap addendum for 02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-07-14T00:27:12Z`
LockHash: `d5408bf10d2770e435e7749e04249d9e51e9b7a3c71e92f1cb513626b6f7dfb7`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/07-state-update.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/08-memory-impact.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/result.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/result.json`
- operator packaged-runtime validation on `2026-07-14` after rebuilding local `main`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\credentials\oauth\moonshot\moonshot.personal.kimi-code.json`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-host-bridge\credentials\oauth\moonshot\moonshot.personal.kimi-code.json`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\memory\benchmark-runs\b1d897b4-0011-4f6a-879f-a799f40dc360\`
- `/role-model-router/apps/launcher/main.go`
- `/role-model-router/apps/launcher/main_test.go`
- `/role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
Outputs:
- `/.recursive/run/69-benchmark-scoring-integrity/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This current-phase upstream-gap addendum records a packaged-runtime manual-QA failure discovered on `2026-07-14` after rebuilding the runtime on local `main`. The failure invalidates the locked assumption that run-69 verification was complete for Kimi participation, reopens bounded implementation and verification work for packaged-runtime Kimi credential parity, and amends the effective plan for the remainder of the QA closure path without editing locked Phase 2 through Phase 4 artifacts.

## TODO

- [x] Reconcile the locked plan, implementation, test, and manual-QA assumptions against the packaged-runtime failure
- [x] Record the concrete packaged-runtime QA findings and code/state seams that caused them
- [x] Convert the findings into bounded strict-TDD remediation slices
- [x] Define the packaged-runtime quick and full benchmark re-verification matrix with both GPT and Kimi in scope
- [x] Record the temporary operator mitigation separately from the permanent fix
- [x] Amend the effective remaining plan without editing locked earlier artifacts

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: the current router configuration still leaves delegated analyst/planner roles unresolved, so the packaged-runtime QA failure analysis and plan amendment remained controller-owned.
- Delegation Decision Basis: the gap was discovered by direct packaged-runtime exercise, local state inspection, and source inspection of launcher plus OAuth rehydration seams; the corrective plan therefore needed direct reconciliation against the locked plan, implementation summary, test summary, and manual-QA receipt.

## Effective Inputs Re-read

- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md`
- `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md`
- `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`
- `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`
- `/.recursive/run/69-benchmark-scoring-integrity/07-state-update.md`
- `/.recursive/run/69-benchmark-scoring-integrity/08-memory-impact.md`

## Earlier Phase Reconciliation

- The locked Phase 2 plan correctly scoped the benchmark-owned scoring repairs that run 69 implemented.
- The locked Phase 3 implementation summary correctly captured the one-way Kimi restart repair from fresher standalone-runtime tokens into bridge-local state.
- The locked Phase 4 test summary remains a valid automated floor for benchmark integrity and the original restart-rehydration path.
- The locked Phase 5 receipt proved a healthy worktree runtime on `http://127.0.0.1:57696` under `runtime-host-bridge` scope, but it did not prove the rebuilt packaged runtime launched on `http://127.0.0.1:3456` under `standalone-runtime`.
- The packaged-runtime failure on `2026-07-14` therefore does not invalidate the benchmark-layer implementation itself; it exposes a missing packaged-runtime QA and plan slice that the locked plan never forced.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: compared the locked requirements and locked Phase 2 through Phase 5 assumptions against the packaged-runtime failure, the current launcher/runtime-host source, and the current credential-state files
- Acceptance Decision: accepted
- Repair Performed After Verification: none in product code; this artifact records the formal compensation path

## Worktree Diff Audit

- Baseline: `c8215896a60b6a6aea64dd8d945d37f720da4605`
- Comparison: `worktree`
- Normalized diff command: `git diff --name-only c8215896a60b6a6aea64dd8d945d37f720da4605`
- Product files re-opened by this addendum:
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/launcher/main.go`
  - `/role-model-router/apps/launcher/main_test.go`
- Evidence-only additions expected:
  - packaged-runtime health snapshot
  - direct Kimi probe receipt
  - packaged quick benchmark rerun receipts
  - packaged full benchmark rerun receipts
  - this addendum
- Unexplained drift:
  - none recorded by this addendum

## QA Failure Context

- Locked `05-manual-qa.md` used `QA Execution Mode: agent-operated` and accepted:
  - worktree runtime on `http://127.0.0.1:57696`
  - `runtime-host-bridge` scope
  - direct Kimi probe success
  - `VALID` quick and full benchmark reruns with GPT and Kimi included
- Post-closeout packaged-runtime validation on `2026-07-14` used:
  - packaged runtime on `http://127.0.0.1:3456`
  - launcher scope `standalone-runtime`
  - local state root `C:\Users\erikb\AppData\Local\Role Model Runtime`
- Result:
  - Kimi benchmark cases failed before execution with `400 No execution target is currently eligible for model moonshot/kimi-k2.7-code.`
  - latest failure root: `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\memory\benchmark-runs\b1d897b4-0011-4f6a-879f-a799f40dc360`
  - every Kimi response artifact under that run records the same routing failure

## Gaps Found

### Gap 1: the locked plan and manual-QA floor did not require packaged-runtime verification

Evidence:

- Locked Phase 5 proved only the worktree runtime under `runtime-host-bridge`.
- The packaged desktop launcher still uses `standalone-runtime` on `127.0.0.1:3456`.
- Post-closeout validation shows Kimi unavailable in that packaged shape despite the earlier worktree proof.

Implications:

- `R7` is only partially satisfied by the locked Phase 5 evidence.
- The run cannot be treated as fully re-verified for Kimi participation on the rebuilt packaged runtime.

Current-phase compensation:

- Treat this addendum as a plan amendment requiring packaged-runtime proof in addition to the already-locked worktree proof.

### Gap 2: the current packaged launcher/runtime-state contract diverges from the verified bridge-layout contract

Evidence:

- `/role-model-router/apps/launcher/main.go` launches with:
  - `--runtime-state-root <LocalAppData>\Role Model Runtime`
  - `--scope-id standalone-runtime`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` packaged defaults and `/role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts` remain centered on:
  - `...\Role Model Runtime\state`
  - `runtime-host-bridge`

Implications:

- Packaged runtime and worktree runtime do not read the same credential tree by default.
- The locked plan did not force compatibility between these two state-layout shapes.

Current-phase compensation:

- Add a bounded remediation slice that explicitly supports the current packaged standalone layout and proves it with tests.

### Gap 3: Kimi OAuth rehydration is asymmetric and cannot repair standalone runtime from a fresher bridge token

Evidence:

- `src/index.ts` counterpart lookup assumes `runtimeStateRoot` ends in `state`.
- Existing repair logic prefers fresher standalone tokens for bridge-local recovery, but it does not perform the reverse direction.
- Current local credential state proves the failure mode:
  - standalone Kimi token saved `2026-07-12 22:09:11 UTC`, refresh returns `400 invalid_grant`
  - bridge Kimi token saved `2026-07-13 12:09:30 UTC`, refresh returns `200`
- Standalone packaged-runtime SQLite state records:
  - `moonshot.personal.kimi-code` as `refresh-failing`
  - `moonshot.personal.kimi-code.global.kimi-k2.7-code` as `degraded`

Implications:

- The packaged runtime can strand Kimi behind stale standalone state even when a valid local bridge credential exists.
- Manual QA fails before any benchmark subject execution occurs.

Current-phase compensation:

- Add a bounded remediation slice that makes counterpart discovery layout-aware and token repair symmetric, then proves packaged standalone startup clears the stale Kimi health failure.

### Gap 4: the locked automated regression floor did not cover reverse-direction packaged Kimi repair

Evidence:

- Existing tests prove only the original `standalone -> bridge` repair path.
- No current test fails when:
  - standalone-scope token is stale or invalid
  - bridge-scope token is fresher and still valid
  - backend starts in packaged standalone layout

Implications:

- `R5` and `R6` are only partially satisfied for this packaged-runtime failure family.
- The regression can recur after rebuilds without any benchmark-owned test failure.

Current-phase compensation:

- Add RED/GREEN coverage for reverse repair, startup-health recovery, and the current launcher/runtime-state contract.

## Temporary Operator Mitigation

Until the permanent code fix lands:

1. copy the fresher bridge token file
   - `C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-host-bridge\credentials\oauth\moonshot\moonshot.personal.kimi-code.json`
2. over the packaged standalone token file
   - `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\credentials\oauth\moonshot\moonshot.personal.kimi-code.json`
3. restart the packaged runtime

This is only an operator unblock. It does not fix the asymmetric rehydration bug or the missing packaged-runtime regression floor.

## Plan Amendment

This addendum amends the effective plan for the remainder of run 69. The locked `02-to-be-plan.md` remains the base plan, but the following remediation slices are now mandatory before packaged-runtime Kimi participation can be accepted as re-verified.

### SP69-K1 — Layout-aware symmetric Kimi OAuth repair

Required work:

1. Replace the one-way counterpart lookup with a helper that understands both layout families:
   - active scope under `runtimeStateRoot/scopeId`
   - sibling standalone scope under `...\standalone-runtime`
   - sibling bridge scope under `...\state\runtime-host-bridge`
2. Choose the freshest token-bearing Kimi credential across valid candidate paths.
3. Persist the selected credential back into the active scope before startup health depends on it.
4. Preserve the already-landed `standalone -> bridge` repair while adding the missing `bridge -> standalone` repair.

Required verification:

- failing targeted regression for reverse packaged repair
- green targeted regression proving both layout families work

### SP69-K2 — Packaged standalone startup-health recovery

Required work:

1. Add an integration-style restart test where standalone Kimi state is stale or invalid and bridge Kimi state is fresher and valid.
2. Start the backend in packaged standalone shape.
3. Assert post-start state:
   - provider account no longer `refresh-failing`
   - endpoint no longer `degraded`
   - exact-model Kimi execution becomes eligible again
4. If startup still preserves stale failure state after token adoption, repair that state transition narrowly.

Required verification:

- failing restart-health regression
- green restart-health regression

### SP69-K3 — Packaged launch-contract regression floor

Required work:

1. Codify the current packaged launcher contract as a tested supported shape.
2. Add compatibility tests proving:
   - packaged standalone layout resolves counterpart credential roots correctly
   - bridge-default layout still resolves correctly
3. If a later follow-up chooses to align launcher defaults, keep this compatibility floor until migration evidence exists.

Required verification:

- failing launcher/runtime-layout compatibility regression
- green launcher/runtime-layout compatibility regression

### SP69-K4 — Packaged runtime rebuild and benchmark re-verification

Required work:

1. Rebuild the packaged runtime from local `main` after the focused floor is green.
2. Launch the rebuilt packaged runtime on `127.0.0.1:3456`.
3. Capture packaged-runtime proof:
   - `/healthz` healthy
   - Kimi account healthy or active, not `refresh-failing`
   - direct exact-model Kimi probe succeeds
4. Rerun benchmarks on the packaged runtime:
   - quick benchmark with both `moonshot/kimi-k2.7-code` and `chatgpt/gpt-5.4`
   - full benchmark with the same two subject endpoints
5. Accept the fix only when both reruns complete `VALID` and no Kimi case fails with `no_eligible_target`.

Required verification:

- packaged health snapshot
- packaged Kimi probe receipt
- packaged quick benchmark `start.json`, `completed-progress.json`, `result.json`, `validation.json`
- packaged full benchmark `start.json`, `completed-progress.json`, `result.json`, `validation.json`

## Requirement Delta

| ID | Requirement | Disposition |
| --- | --- | --- |
| `A1` | Packaged runtime Kimi credential recovery must work whether the active runtime uses `standalone-runtime` or `state/runtime-host-bridge` layout | new |
| `A2` | Startup hydration must adopt the freshest valid local Kimi OAuth credential across the packaged standalone scope and the bridge scope, then restore Kimi endpoint eligibility | new |
| `A3` | Regression coverage must include the reverse `bridge -> standalone` Kimi repair path and the current packaged launch contract | new |
| `A4` | Final runtime verification for this follow-up must use the rebuilt packaged runtime, not only the worktree runtime, and must rerun both quick and full benchmarks with GPT and Kimi in scope | extends `R7` |

## TDD and Verification Floor

TDD Mode: `strict`

Focused commands from `D:\DEV\role-model`:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/restart-rehydration.test.ts test/index.test.ts`
- `cd role-model-router && go test ./apps/launcher`

Broader validation after focused suites:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- rebuild the packaged runtime using the existing SEA packaging flow
- execute the packaged-runtime probe plus quick/full benchmark matrix on `127.0.0.1:3456`

## Repair Work Performed

- Created this current-phase upstream-gap addendum as the formal plan amendment for the packaged-runtime Kimi QA failure.
- No product code changes were made by this artifact.

## Requirement Completion Status

- `R5` | Status: incomplete | Blocking Evidence: reverse packaged Kimi repair and launcher/runtime-layout compatibility are not in the locked automated regression floor | Addendum: `/.recursive/run/69-benchmark-scoring-integrity/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R6` | Status: incomplete | Blocking Evidence: the packaged-runtime Kimi repair has not yet been re-implemented under strict TDD | Addendum: `/.recursive/run/69-benchmark-scoring-integrity/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R7` | Status: incomplete | Blocking Evidence: packaged runtime on `127.0.0.1:3456` currently fails Kimi before benchmark subject execution with `no_eligible_target`; locked Phase 5 covers only the worktree runtime | Addendum: `/.recursive/run/69-benchmark-scoring-integrity/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`

## Audit Verdict

- Audit summary: packaged-runtime manual QA found a real plan and verification gap that cannot be reconciled by editing locked history. This addendum formally reopens bounded implementation and verification work for packaged-runtime Kimi parity while preserving the locked benchmark-integrity repairs.
Audit: PASS

## Coverage Gate

- [x] The addendum states what in the locked plan and QA floor was missing or incorrect
- [x] The addendum records concrete packaged-runtime evidence for why the amendment is needed
- [x] The addendum specifies amended remaining implementation, test, rebuild, and benchmark-QA steps
- [x] The addendum states which locked requirements are affected
- [x] The addendum keeps the scope bounded to packaged-runtime Kimi parity and verification

Coverage: PASS

## Approval Gate

- [x] The addendum preserves the locked-history rule by amending the current QA phase instead of editing locked Phase 2 through Phase 4 artifacts
- [x] The amended work remains bounded to packaged-runtime Kimi credential parity plus the required quick and full benchmark re-verification
- [x] The final acceptance bar is explicit: rebuilt packaged runtime, direct Kimi proof, and `VALID` quick/full benchmarks with GPT and Kimi

Approval: PASS
