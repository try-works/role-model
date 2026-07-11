Run: `/.recursive/run/64-observed-data-decay-policy-recalibration/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-11T21:30:54Z`
LockHash: `d4361f9ee9b42dfce2efd50d5427c214537e9a9c90879926fb6b28f2c03b5540`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `role-model-router/packages/core/src/types.ts`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/protocol-routing/test/index.test.ts`
- `role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts`
- user guidance in chat on `2026-07-11`:
  - decay should only affect latency and throughput signals
  - decay should be `10%` per day
  - fresh data should reset the decay rather than letting stale penalties linger indefinitely
Outputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
Scope note: This run recalibrates observed-data decay so time aging only affects latency and throughput routing signals, using a 10%-per-day decay shape, while quality, reliability, and cost stop drifting toward neutral solely because samples are old.

## TODO

- [x] Ground the spec in the current observed-data config, router-core scoring, and prior run-24 requirements
- [x] Define stable requirement identifiers and acceptance criteria for the decay-policy change
- [x] Record explicit boundaries around throughput-SLA, cost-source precedence, and benchmark-quality precedence
- [x] Record out-of-scope items for context-window eligibility, cooldowns, and unrelated routing behavior
- [x] Make config compatibility, diagnostics, and verification expectations explicit
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `routing policy recalibration and observability hardening`
- Primary subsystems:
  - `role-model-router/packages/core/**`
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/packages/protocol-routing/**`
- Secondary subsystems:
  - `role-model-router/apps/runtime-ui/**`
- User-visible outcome:
  - stale benchmark or cost evidence no longer evaporates within minutes, while stale latency and throughput observations still soften gradually over days instead of dominating routing forever
- Main risk theme:
  - changing decay semantics without tightening config truth and diagnostics could silently change route selection or leave operators thinking non-decayed signals are still governed by halflife knobs

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `23-router-runtime-live-observed-feedback` | established live observed profiles as a real routing input instead of fixture-only evidence |
| `24-router-runtime-recency-bias-throughput-sla` | introduced the current observed-data config surface, metric halflives, and throughput-SLA behavior this run is recalibrating |
| `40-catalog-economics-moonshot-consolidation` | established catalog cost as the authoritative routing-cost source when present and already added one important no-decay exception |
| `58-role-model-taxonomy-v1-benchmark-telemetry` | made benchmark-backed quality a first-class routing signal, so this run must preserve benchmark precedence while removing ordinary time decay from quality |
| `62-litellm-pi-craft-codex-execution-hardening` | expanded request-detail and routing diagnostics surfaces that should remain the primary operator proof path for explaining effective metrics after this policy change |

## Fixed Decisions

1. Observed-data time decay applies only to latency and throughput in this run.
2. The target decay shape is `10%` per day of retained distance-to-neutral loss, meaning a 24-hour-old latency or throughput signal keeps `90%` of its deviation from neutral. Any equivalent implementation is acceptable, including an exponential form with approximately a `6.58` day half-life.
3. Fresh observations reset decay age by using the newest selected measurement timestamp for the signal being scored.
4. Quality, reliability, and cost remain routing signals, but this run removes ordinary time-based neutral decay from them.
5. Throughput-SLA remains a separate mechanism from throughput time decay. This run may update diagnostics around that interaction, but it does not redesign SLA thresholds, penalty windows, or hard-deny semantics.
6. This run does not attempt to solve context-window mismatches, capability eligibility failures, provider quota or auth cooldowns, or direct exact-model provider outages.

## Requirements

### `R1` Narrow the observed-data decay contract to latency and throughput

Description:
The runtime-owned observed-data policy must make it explicit that only latency and throughput are time-decayed routing signals. The config and normalized runtime truth must stop implying that quality, reliability, and cost still have active halflife controls.

Acceptance criteria:
- the effective observed-data contract exposes time-decay controls only for latency and throughput
- parsed, normalized, and rendered runtime-config truth no longer advertises active `quality`, `reliability`, or `cost` decay knobs as if they still affect routing
- any backward-compatibility handling for legacy `quality_ms`, `reliability_ms`, or `cost_ms` inputs is deterministic and does not let those legacy values keep influencing live routing
- local and remote endpoints share the same decay-policy contract
- bridge-level diagnostics or config readback make the active decay scope inspectable without reading code

### `R2` Apply a 10%-per-day decay shape to latency and throughput

Description:
Latency and throughput should still get softer as observations age, but on a slow day-scale curve rather than the current minute-scale decay.

Acceptance criteria:
- when observed-data decay is enabled, a latency or throughput signal that is `24` hours old retains `90%` of its distance from neutral
- a mathematically equivalent implementation is acceptable, but route-level outcomes must match the `10%`-per-day target rather than the current minute-scale defaults
- the decay calculation is deterministic, implemented in one owning routing path, and not duplicated through ad hoc constants in multiple layers
- the newest measurement timestamp for the relevant signal resets the decay age when fresher data arrives
- the same decay behavior applies to both local and remote endpoints when comparable observed data exists

### `R3` Remove ordinary time decay from quality, reliability, and cost

Description:
Quality, reliability, and cost should stop drifting toward neutral solely because their supporting observations are old. Their routing meaning should come from the stored evidence itself, not from minute-scale freshness erosion.

Acceptance criteria:
- benchmark-backed and measured quality keep their existing precedence order, but quality scores are no longer blended toward neutral solely because of sample age
- benchmark freshness metadata may remain inspectable, but it does not by itself neutralize benchmark or measured quality during route scoring
- reliability scores are no longer blended toward neutral solely because the observed failure-rate sample is old
- measured cost is no longer blended toward neutral solely because the sample is old, and catalog cost remains authoritative where present
- request-detail and routing diagnostics make it possible to distinguish decayed latency or throughput signals from non-decayed quality, reliability, and cost signals

### `R4` Preserve the current non-decay routing boundaries

Description:
This recalibration run must change decay behavior without quietly rewriting adjacent routing policy.

Acceptance criteria:
- throughput-SLA penalty and hard-deny behavior continue to operate independently of the slower throughput decay curve
- benchmark quality precedence remains `task -> role -> group -> overall -> measured/default` unless a later approved addendum explicitly changes that order
- exact-model and alias routing continue to use the existing eligibility and scoring pipeline, with this run changing only the decay semantics of the relevant observed signals
- route selection must not regress into using stale config-only assumptions for provider cooldowns, context-window eligibility, or capability compatibility

### `R5` Keep diagnostics and operator proof paths aligned with the new decay policy

Description:
Operators need to see which signals are being decayed, which are not, and how that affected a decision, or this change will be impossible to debug in production.

Acceptance criteria:
- routing diagnostics and request-detail receipts identify which effective metrics were time-decayed versus passed through directly
- latency and throughput diagnostics expose enough evidence to reconstruct the applied decay weight from measured time and active policy
- quality, reliability, and cost diagnostics no longer emit misleading freshness or halflife facts that imply time decay changed their score when it did not
- the runtime's canonical inspection surfaces remain the proof path for this run; no separate debugging-only output format is introduced

### `R6` Prove the recalibration with config, router, and end-to-end regression coverage

Description:
This run must verify the policy change at every layer where the old minute-scale decay is currently encoded.

Acceptance criteria:
- failing automated tests are added before production changes for the new decay scope and 10%-per-day behavior
- config tests cover parse, normalization, render, and any legacy-key compatibility behavior for the observed-data contract
- router-core tests cover:
  - `24`-hour and multi-day latency decay
  - `24`-hour and multi-day throughput decay
  - fresh-sample reset behavior
  - non-decay behavior for quality, reliability, and cost
- protocol-routing or bridge-level tests prove that stale latency or throughput influence softens over time while stale quality or cost evidence does not get neutralized
- verification includes at least one local endpoint and one remote endpoint path unless an approved addendum records an environmental block

## Out of Scope

- `OOS1`: context-window estimation, declared context-window metadata, or `CONTEXT_TOO_SMALL` eligibility behavior
- `OOS2`: provider-auth, quota-exhausted, rate-limit, timeout, or upstream-5xx cooldown policy
- `OOS3`: difficulty-learning cache invalidation thresholds, controller routing, or alias-matrix redesign
- `OOS4`: new benchmark collection methodology, taxonomy changes, or unrelated quality-scoring redesign

## Constraints

- the run must preserve local-plus-remote parity; no provider family gets a private decay rule
- the active runtime-config truth must stay explainable through parse or render surfaces and request-level diagnostics
- the `10%`-per-day target must be represented as stable deterministic math, not operator folklore or comments
- cost-source precedence must remain `catalog` before measured cost before default fallback
- benchmark quality precedence must remain intact unless a later approved addendum explicitly changes it
- the run must not silently leave dead config knobs in place that appear active but no longer affect routing

## Assumptions

- the current observed-profile structure already carries enough timing information to support slower latency and throughput decay without inventing a second freshness store
- throughput-SLA continues to cover short-horizon "too slow right now" denial behavior while the new decay curve handles long-horizon soft aging
- any future reliability-aging redesign can be handled in a separate run if raw non-decayed reliability proves too sticky in practice

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
  - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `role-model-router/packages/core/src/types.ts`
  - `role-model-router/packages/core/src/router.ts`
  - `role-model-router/packages/protocol-routing/test/index.test.ts`
  - `role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts`
- Requirement coverage check:
  - `R1`: covered in `## Requirements`
  - `R2`: covered in `## Requirements`
  - `R3`: covered in `## Requirements`
  - `R4`: covered in `## Requirements`
  - `R5`: covered in `## Requirements`
  - `R6`: covered in `## Requirements`
- Out-of-scope confirmation:
  - `OOS1`: unchanged
  - `OOS2`: unchanged
  - `OOS3`: unchanged
  - `OOS4`: unchanged

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the requirement set is grounded in the current config and router-core implementation
  - the user-provided policy decisions are translated into deterministic acceptance criteria
  - config compatibility, diagnostics, and regression expectations are explicit
  - scope boundaries for non-decay mechanisms and unrelated routing bugs are explicit
  - no required Phase 0 section is missing
- Remaining blockers:
  - repo materialization is still pending user approval of this draft

Approval: PASS
