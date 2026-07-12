Run: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-12T12:44:14Z`
LockHash: `48d23a72e7b574c756ea80eaadc1ece989d6f1d93f741d8767950d7767227b70`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-worktree.md` (LOCKED)
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/usage/recursive-mode-skill-and-subskills.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/system-peers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-audio.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-rerank.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/local-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
- `/role-model-router/apps/runtime-host-bridge/test/cli-startup-readiness.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
Outputs:
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/01-as-is.md`
Scope note: Records the current route-startup inventory, the pre-fix startup helpers still in use, the persisted-state evidence that motivated the run, and the baseline verification gaps before implementation.

## TODO

- [x] Re-read the locked Phase 0 artifacts and recursive bridge docs
- [x] Inventory every runtime-ui route into an explicit startup bucket
- [x] Record the pre-fix broad startup helpers and rebuilt-runtime parity gap
- [x] Record the persisted-state evidence that motivated the run
- [x] Record the existing regression gaps
- [x] Reconcile the baseline against `R1` through `R9`
- [x] Complete the audited-phase sections and gates

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: the session exposes deferred subagent tooling through `tool_search`, but this worktree does not have `/.recursive/config/recursive-router-discovered.json`.
Delegation Decision Basis: Phase 1 is direct local route-map, source, and runtime evidence inspection.
Delegation Override Reason: routed delegation remained unsafe from this worktree and this phase did not benefit from delegated read-only analysis.
Audit Inputs Provided:
- locked run-67 requirements and worktree artifacts
- current runtime-ui route and runtime API files
- current host-bridge startup/parity surfaces
- run-66 requirements as the immediate working pattern reference

## Effective Inputs Re-read

- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-worktree.md`
- the runtime-ui and host-bridge files listed under `Inputs`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`

## Reproduction Steps (Novice-Runnable)

1. Open the worktree at `D:\DEV\role-model\.worktrees\67-runtime-ui-route-startup-performance-hardening`.
2. Read `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`.
   - Confirm the route historically booted through `fetchRuntimeSnapshot()` before the run-67 repair.
3. Read `/role-model-router/apps/runtime-ui/app/routes/router.tsx`, `/app/routes/control-controller.tsx`, `/app/routes/endpoints.tsx`, `/app/routes/integrations-upstream.tsx`, `/app/routes/system-peers.tsx`, `/app/routes/workbench.tsx`, and the Studio route files.
   - Confirm those `P0` pages also historically booted through the broad shared snapshot or inherited the same rich request-ledger startup cost.
4. Read `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`.
   - Confirm the pre-fix shared snapshot helper always included rich `/api/role-model/requests`.
5. Read `/role-model-router/apps/runtime-host-bridge/src/cli.ts`, `scripts/start.ts`, and `scripts/prod-launcher.ts`.
   - Confirm the non-QA startup paths historically omitted `listRecentRequestIds`.
6. Compare that with `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`.
   - Confirm the QA helper already exposed the lightweight latest-ids seam.

## Current Behavior by Requirement

| Requirement | Current behavior before the run-67 fix |
| --- | --- |
| `R1` | every route can be bucketed into `P0`, `P1`, `P2`, or baseline/monitor-only classes, but that inventory was not yet encoded in the run artifacts |
| `R2` | `/app/models` still treated request evidence as startup-critical and mixed it into first render |
| `R3` | the `P0` route family still depended on the broad shared snapshot helper and therefore inherited rich request-ledger startup work |
| `R4` | the `P1` routes already used route-owned narrower startup reads and did not need widening |
| `R5` | telemetry-heavy routes already made the page visible before all telemetry work completed, so they required validation more than product change |
| `R6` | persisted standalone state showed a large performance gap between ids-only request lookup and rich observation-json reads |
| `R7` | non-QA startup paths did not expose latest-ids even though the QA helper already did |
| `R8` | the repo lacked route-family regression coverage for the `P0` startup split and lacked strict-TDD evidence for the new slices |
| `R9` | final verification still required validator, browser, packaging, and rebuilt-runtime proof on current-worktree artifacts |

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: `Phase 1 must inventory every route in role-model-router/apps/runtime-ui/app/routes/**, reconcile it against app/routes.ts, and validate the route startup classes against actual route traffic` | Summary: Phase 1 must encode the full route inventory before implementation can narrow the right surfaces
- `R2` | Disposition: `in-scope` | Source Quote: `the first visible /app/models state no longer waits on avoidable secondary reads` | Summary: `/app/models` is the clearest startup bottleneck and needs a narrower first-paint contract
- `R3` | Disposition: `in-scope` | Source Quote: `the P0 route family no longer requests /api/role-model/requests on first navigation` | Summary: the remaining broad-snapshot `P0` routes must stop inheriting rich request-ledger startup work
- `R4` | Disposition: `in-scope` | Source Quote: `/app/router/strategy, /app/router/config, /app/system/runtime-config, /app/router/candidates, /app/router/decisions, /app/router/decisions/:requestId, and /app/local/endpoints remain on route-specific startup reads and do not regress back to fetchRuntimeSnapshot() or rich request-ledger startup` | Summary: already-narrow `P1` routes must be validated and preserved
- `R5` | Disposition: `in-scope` | Source Quote: `each in-scope route becomes visible without waiting for the full current analytics fanout to settle` | Summary: telemetry-heavy routes need validate-first confirmation that first mount remains bounded
- `R6` | Disposition: `in-scope` | Source Quote: `Phase 4 or Phase 5 evidence records real-state query-path proof on non-trivial persisted state` | Summary: the run must stay grounded in persisted-state query-path truth, not just QA fixtures
- `R7` | Disposition: `in-scope` | Source Quote: `wiring is present in the non-QA startup paths that flow through role-model-router/apps/runtime-host-bridge/src/cli.ts, role-model-router/apps/runtime-host-bridge/scripts/start.ts, and role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts` | Summary: rebuilt-runtime parity must include the lightweight latest-ids seam
- `R8` | Disposition: `in-scope` | Source Quote: `Phase 3 for this run must use full TDD Mode: strict with executed RED-GREEN-REFACTOR evidence` | Summary: strict TDD and added regression coverage are required, not optional
- `R9` | Disposition: `in-scope` | Source Quote: `Phase 5 rebuilt-runtime verification runs against a freshly rebuilt runtime from the current worktree` | Summary: closure requires both deterministic seeded proof and rebuilt-runtime persisted-state proof

## Relevant Code Pointers

- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - broad snapshot helper still included rich `/api/role-model/requests`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - `/app/models` mixed first-paint inventory and request evidence
- `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
  - `/app/router` layered route-specific router reads on top of the shared broad snapshot
- `/role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/system-peers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-audio.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-rerank.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`
  - remaining `P0` startup surfaces that needed the route-family split
- `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts`
  - non-QA startup wiring that lacked latest-ids
- `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
  - packaged validator that still relied on `/healthz` alone before the readiness repair

## Known Unknowns

- the exact live shape of the user's standalone persisted state at final Phase 5 proof time
- whether the extra rebuilt-runtime `P0` checkpoint should be `/app/connect` or another remediated `P0` route, depending on persisted-state data availability
- whether telemetry-heavy route validation would remain a no-code decision or surface a new product change during implementation

## Evidence

- requirement-authoring audit already recorded the persisted-state timing split that motivated the run:
  - ids-only latest-request query: about `141 ms`
  - rich recent-observation query touching `observation_json`: about `10.8 s`
- the route inventory confirmed that many operator pages paid the rich request-ledger cost on first render even when request history was only advisory
- the startup-wiring comparison between QA and non-QA launch paths isolated the latest-ids parity gap to `cli.ts`, `start.ts`, and `prod-launcher.ts`

## Traceability

- `R1` -> full route inventory and source requirement inventory
- `R2` -> `/app/models` current-state pointer and evidence
- `R3` -> `P0` route family code pointers and evidence
- `R4` -> `P1` preserve-and-validate bucket
- `R5` -> telemetry-heavy validate-first bucket
- `R6` -> persisted-state evidence summary
- `R7` -> non-QA startup code pointers
- `R8` -> current regression gap statement
- `R9` -> rebuilt-runtime proof obligation carried forward

## Earlier Phase Reconciliation

- `00-requirements.md` fixed the route buckets, TDD requirement, and rebuilt-runtime verification floor that this Phase 1 inventory needed to confirm
- `00-worktree.md` fixed the diff basis at `git diff --name-only 5320a8a19655312e0677b369c0e40c319a75de24`; this artifact reuses that basis unchanged

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5320a8a19655312e0677b369c0e40c319a75de24`
- Comparison reference: `working-tree`
- Normalized baseline: `5320a8a19655312e0677b369c0e40c319a75de24`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5320a8a19655312e0677b369c0e40c319a75de24`
- Planned or claimed changed files:
  - `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/01-as-is.md`
- Unexplained drift:
  - `none`

## Gaps Found

- the shared broad snapshot helper was still overreaching on `P0` first render
- `/app/models` still treated request evidence as startup-critical
- non-QA startup still lacked latest-ids even though QA already exposed it
- packaging validation still needed a control-plane readiness barrier after `/healthz`
- route-family regression coverage for the startup split did not yet exist

None of these gaps were unexpected. They were the intended targets of run 67 and are resolved only by later phases.

## Repair Work Performed

- none; this is the current-state analysis artifact

## Requirement Completion Status

- `R1` | Status: `deferred` | Rationale: final route-inventory closure depends on the later implementation and verification receipts, not Phase 1 alone | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R2` | Status: `deferred` | Rationale: product changes begin in Phase 3 | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R3` | Status: `deferred` | Rationale: product changes begin in Phase 3 | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R4` | Status: `deferred` | Rationale: the validate-first `P1` decision must be proven against the final implementation and verification evidence | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R5` | Status: `deferred` | Rationale: telemetry-heavy route confirmation belongs to later verification phases | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R6` | Status: `deferred` | Rationale: persisted-state proof is a later implementation and QA concern | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R7` | Status: `deferred` | Rationale: non-QA startup parity is implemented and verified in later phases | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R8` | Status: `deferred` | Rationale: strict TDD begins in Phase 3 | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `R9` | Status: `deferred` | Rationale: final verification and rebuilt-runtime QA are later-phase obligations | Deferred By: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`

## Audit Verdict

Audit: PASS

The route inventory, persisted-state context, startup parity gap, and current regression gaps are concrete enough for root-cause analysis and planning.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

Reviewed Action Records:

- `none`

Main-Agent Verification Performed:

- direct route-map and source inspection in the run-67 worktree
- comparison against the run-66 deferred-bootstrap requirement and current runtime memory shard

Acceptance Decision: `accepted`
Refresh Handling: `not applicable`
Repair Performed After Verification: `none`

## Audit Gate

- [x] Effective upstream artifacts were re-read
- [x] Every concrete runtime-ui route was placed into an explicit startup bucket
- [x] The broad snapshot and non-QA parity gaps were grounded in specific files

Audit: PASS

## Coverage Gate

- [x] `R1` through `R9` have current-state coverage
- [x] The route inventory is complete
- [x] Persisted-state and rebuilt-runtime parity inputs are documented

Coverage: PASS

## Approval Gate

- [x] The current-state baseline is concrete enough for Phase 1.5 root-cause analysis
- [x] No required route remains uncategorized

Approval: PASS
