Run: `/.recursive/run/64-observed-data-decay-policy-recalibration/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-11T22:45:54Z`
LockHash: `c64b01c7a6dae1a2f8ba03bef75f95d23a11b1e2fbce1dd47b469a72288e8736`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md` (LOCKED)
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-worktree.md` (LOCKED)
- `/.recursive/run/64-observed-data-decay-policy-recalibration/01-as-is.md` (LOCKED)
Outputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/02-to-be-plan.md`
Scope note: Defines the implementation plan for recalibrating observed-data decay so only latency and throughput time-decay, using a 10%-per-day curve while quality, reliability, and cost remain age-invariant.

## TODO

- [x] Map `R1`-`R6` to concrete file changes
- [x] Define RED-GREEN verification for config, router, and protocol-routing layers
- [x] Record the chosen config and diagnostics surface
- [x] Audit the plan against the locked requirements

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: worktree-local only; no delegated planner or reviewer was available in this run repair.
Delegation Decision Basis: the requirements, current breakage, and owning code paths were all directly inspectable in the run-64 worktree.
Audit Inputs Provided: locked requirements and worktree artifacts plus the current host-bridge, router-core, and protocol-routing sources.

## Effective Inputs Re-read

- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/01-as-is.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/protocol-routing/test/index.test.ts`
- `/role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts`

## Planned Changes by File

### `/role-model-router/packages/core/src/types.ts`

- Rename the shared observed-data decay contract from `metricHalflives` to `metricDecayPercentPerDay`.
- Narrow the typed decayable metrics to:
  - `latency`
  - `throughput`

### `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`

- Replace the normalized observed-data config surface with `metricDecayPercentPerDay: { latency, throughput }`.
- Set the default values to `10` and `10`, representing `10%` retained-deviation loss per day for latency and throughput.
- Accept legacy `metricHalflives` / `metric_halflives` inputs for compatibility, but normalize them onto the new latency/throughput-only surface.
- Stop rendering legacy `quality_ms`, `reliability_ms`, and `cost_ms` knobs in canonical config truth.

### `/role-model-router/packages/core/src/router.ts`

- Keep one owning decay implementation in `getFreshnessWeight()`, but switch the math from minute-scale half-life to `Math.pow(1 - decayPercentPerDay / 100, ageDays)`.
- Apply that decay only to latency and throughput.
- Remove ordinary time decay from quality, reliability, and cost by keeping their effective freshness weight at `1`.
- Preserve benchmark-quality precedence while ensuring benchmark freshness metadata remains inspectable without neutralizing quality scores.
- Extend raw metric receipts so decayed metrics and pass-through metrics are distinguishable via `freshness_source`, `time_decay_applied`, and `decay_percent_per_day` where applicable.

### `/role-model-router/packages/runtime-observability/src/index.ts`

- Extend the effective-metric diagnostics surface so request-detail and routing receipts can expose whether a metric was time-decayed or passed through unchanged.

### `/role-model-router/apps/runtime-host-bridge/src/index.ts`

- Thread the new effective-metric diagnostic fields through the bridge request-detail summary so the runtime's canonical operator surfaces remain the proof path.

### Tests

- Add new RED-first config coverage in `/role-model-router/apps/runtime-host-bridge/test/observed-data-decay-policy.test.ts`.
- Add new RED-first router-core coverage in `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts`.
- Add new RED-first protocol-routing coverage in `/role-model-router/packages/protocol-routing/test/observed-data-decay-policy.test.ts`.
- Update existing fixtures in:
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/packages/core/test/routing-intent.test.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts`

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "the effective observed-data contract exposes time-decay controls only for latency and throughput" | Implementation Surface: `/role-model-router/packages/core/src/types.ts`, `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Verification Surface: host-bridge config tests | QA Surface: canonical config render/readback
- `R2` | Coverage: direct | Source Quote: "a latency or throughput signal that is 24 hours old retains 90% of its distance from neutral" | Implementation Surface: `/role-model-router/packages/core/src/router.ts` | Verification Surface: router-core and protocol-routing tests | QA Surface: deterministic route-outcome proof
- `R3` | Coverage: direct | Source Quote: "quality, reliability, and cost should stop drifting toward neutral solely because their supporting observations are old" | Implementation Surface: `/role-model-router/packages/core/src/router.ts` | Verification Surface: router-core and protocol-routing tests | QA Surface: effective-metric receipts
- `R4` | Coverage: direct | Source Quote: "throughput-SLA penalty and hard-deny behavior continue to operate independently" | Implementation Surface: `/role-model-router/packages/core/src/router.ts` | Verification Surface: existing router/protocol tests retained green | QA Surface: preserved route outcome checks
- `R5` | Coverage: direct | Source Quote: "routing diagnostics and request-detail receipts identify which effective metrics were time-decayed versus passed through directly" | Implementation Surface: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: router/core tests plus bridge receipt shaping | QA Surface: request-detail diagnostic summaries
- `R6` | Coverage: direct | Source Quote: "failing automated tests are added before production changes" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/protocol-routing/test/observed-data-decay-policy.test.ts` | Verification Surface: RED logs plus green verification floor | QA Surface: agent-operated deterministic scenario proof

## Implementation Steps

1. Write failing config tests that expect the narrowed `metricDecayPercentPerDay` contract and the new rendered config truth.
2. Write failing router-core tests that encode the 10%-per-day curve plus non-decay behavior for quality, reliability, and cost.
3. Write failing protocol-routing tests that prove the route-level local/remote outcome changes and benchmark-quality stability.
4. Update the shared types and host-bridge config normalization/rendering to the new contract.
5. Update router scoring and diagnostics so latency/throughput decay and pass-through metrics match the requirements.
6. Update existing fixtures and rerun the broader router-owned verification floor.

## Testing Strategy

### RED tests

- host-bridge config contract:
  - defaults expose only `latency` and `throughput`
  - canonical render uses `metric_decay_percent_per_day`
  - legacy halflife keys normalize to the new surface without surviving render
- router-core:
  - latency retains `0.90` deviation after `24h`
  - throughput retains `0.81` after `48h`
  - fresh observations reset decay age
  - quality, reliability, and cost do not decay by age
- protocol-routing:
  - stale remote latency softens enough for a fresh local endpoint to win
  - benchmark-backed quality does not collapse because freshness metadata is low

### Verification floor

- `corepack pnpm run schemas:validate`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc --noEmit`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/observed-data-decay-policy.test.ts test/unified-runtime-config.test.ts`
- `corepack pnpm --filter @role-model-router/core exec vitest run test/observed-data-decay-policy.test.ts test/routing-intent.test.ts`
- `corepack pnpm --filter @role-model-router/protocol-routing test`
- `corepack pnpm run runtime:validate-routing`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run test:router`

## Playwright Plan (if applicable)

Not applicable. This run changes router/config semantics only and does not change a UI surface that requires browser proof.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

Planned deterministic scenarios:

1. Prove canonical config truth renders only latency and throughput decay controls.
2. Prove router-core receipts show 10%-per-day latency/throughput decay while quality, reliability, and cost remain pass-through.
3. Prove a fresh local endpoint can beat a week-old faster remote latency sample, while benchmark-backed quality remains stable.

## Idempotence and Recovery

- The focused Vitest suites and router-owned verification floor are deterministic and safe to rerun.
- Legacy config compatibility is intentionally one-way: legacy halflife keys may still parse, but canonical render/readback stays on `metric_decay_percent_per_day`.
- If a later step reopens downstream artifacts, relock from the earliest reopened phase so receipts chain from the repaired upstream state.

## Implementation Sub-phases

1. RED: add host-bridge config tests, router-core decay tests, and protocol-routing route-outcome tests
2. GREEN: repair shared types and host-bridge config normalization/rendering
3. GREEN: repair router-core decay policy and diagnostics
4. REFACTOR: update existing fixtures and rerun the broader router-owned verification floor

## Plan Drift Check

- No throughput-SLA redesign
- No benchmark precedence redesign
- No context-window, cooldown, or capability-eligibility redesign
- No new operator-only debugging output surface

## Known Unknowns Carried Forward

- None blocking Phase 3. The naming, compatibility path, and diagnostics surface are all fixed by the locked requirements and the current owning code structure.

## Traceability

- `R1`: shared-type and host-bridge config narrowing
- `R2`: single owning decay formula in router-core
- `R3`: age-invariant quality, reliability, and cost scoring
- `R4`: preserved throughput-SLA, benchmark precedence, and existing routing boundaries
- `R5`: effective-metric diagnostics extended through router-core, observability, and bridge receipts
- `R6`: RED-first tests plus broad router-owned verification floor

## Gaps Found

None beyond the already-documented Phase 1 gaps the plan is intended to close.

## Repair Work Performed

None. This artifact defines the repaired plan only.

## Audit Verdict

Audit: PASS

## Earlier Phase Reconciliation

- `01-as-is.md` identified the five current-state gaps: all-metric decay, minute-scale halflives, dead config knobs, no explicit decay-scope coverage, and missing diagnostic distinction.
- This plan addresses each gap directly without widening into adjacent routing-policy redesign.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct plan construction and reconciliation against the locked requirements plus current worktree code
- Acceptance Decision: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8a5771506715251440f68a6643de30a66ac4f454`
- Comparison reference: `working-tree`
- Normalized baseline: `8a5771506715251440f68a6643de30a66ac4f454`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8a5771506715251440f68a6643de30a66ac4f454`
- Base branch: `main`
- Worktree branch: `recursive/64-observed-data-decay-policy-recalibration`

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `/role-model-router/packages/core/src/types.ts`, `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Verification Surface: host-bridge config tests | QA Surface: config render/readback
- `R2` | Status: planned | Implementation Surface: `/role-model-router/packages/core/src/router.ts` | Verification Surface: router-core and protocol-routing tests | QA Surface: route outcome proof
- `R3` | Status: planned | Implementation Surface: `/role-model-router/packages/core/src/router.ts` | Verification Surface: router-core and protocol-routing tests | QA Surface: effective-metric receipts
- `R4` | Status: planned-indirectly | Implementation Surface: preserved existing throughput-SLA and eligibility paths in `/role-model-router/packages/core/src/router.ts` | Verification Surface: existing router-owned suites stay green | QA Surface: preserved route outcomes | Rationale: `R4` is a preservation requirement. The implementation plan intentionally keeps throughput-SLA, benchmark precedence, and eligibility behavior unchanged while the decay-policy repair lands around them.
- `R5` | Status: planned | Implementation Surface: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: diagnostics-bearing tests and request-detail shaping | QA Surface: request-detail summaries
- `R6` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/protocol-routing/test/observed-data-decay-policy.test.ts` | Verification Surface: RED/GREEN evidence plus verification floor | QA Surface: deterministic agent-operated proof

## Audit Gate

- [x] All requirements mapped to owned files
- [x] RED-first verification defined
- [x] Diagnostic and compatibility surfaces specified

Audit: PASS

## Coverage Gate

- [x] Config contract changes defined
- [x] Router scoring changes defined
- [x] Protocol-routing behavior proof defined
- [x] Verification floor defined

Coverage: PASS

## Approval Gate

- [x] Plan is specific enough to implement without additional scope decisions
- [x] Plan remains inside the locked requirements
- [x] Ready for Phase 3

Approval: PASS
