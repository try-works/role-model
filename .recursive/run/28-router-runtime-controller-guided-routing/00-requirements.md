Run: `/.recursive/run/28-router-runtime-controller-guided-routing/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
Scope note: This run delivers proposal strategy B by adding request-time controller inference that emits validated routing directives for the live runtime across both local and remote endpoints.

## TODO

- [x] Define numbered requirements and acceptance criteria for controller-guided routing
- [x] Record controller contract, validation, routing integration, and observability obligations
- [x] Record local-plus-remote support, safety boundaries, and verification obligations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Add a request-time controller inference contract for routing guidance

Description:
The runtime must support a controller that evaluates the incoming request and returns structured routing guidance before final endpoint selection.

Acceptance criteria:
- the runtime config supports controller-guided alias mode or the locked equivalent from run `22`
- controller execution can target either local or remote endpoints rather than being hardcoded to one provider class
- the controller input includes the request features needed to choose among candidate models, including relevant messages, tool declarations, and bounded route context
- controller output is structured and machine-validated rather than freeform text

### `R2` Define validated controller output semantics that can steer protocol routing safely

Description:
The controller must return a bounded routing recommendation that the runtime can trust only after validation.

Acceptance criteria:
- controller output can express at least one of:
  - preferred candidate model ids or endpoint ids
  - routing traits, such as reasoning depth, latency sensitivity, tool need, or quality preference
  - exclusion hints or strategy weights
- the runtime validates controller output against known registered endpoints/models before using it
- invalid, partial, stale, or unknown controller directives fail closed to the normal routing baseline instead of causing unsafe routing
- validation behavior is deterministic and observable in diagnostics

### `R3` Merge controller guidance into the live routing pipeline for local and remote pools

Description:
Controller inference must affect real routing decisions rather than exist only as stored metadata.

Acceptance criteria:
- request-time controller guidance changes candidate eligibility, weighting, or ordering in the live runtime
- the merge behavior works for alias pools that contain both local and remote endpoints
- exact-model requests remain supported and can either bypass or be safely constrained by controller logic as defined by the locked strategy contract
- the runtime does not require request rewriting in this run to realize controller-guided routing

### `R4` Persist controller decisions and outcomes for later learning and audit

Description:
The runtime must record what the controller recommended and how the actual route performed.

Acceptance criteria:
- runtime observations persist the validated controller recommendation or a normalized summary of it
- the observation model can correlate controller guidance with the final selected route and result quality/performance
- diagnostics or inspection surfaces can show whether the controller materially influenced the route
- persistence works across both local and remote endpoint executions

### `R5` Add operator-visible diagnostics for controller-guided routing

Description:
Operators must be able to inspect controller behavior well enough to debug safety issues and strategy quality.

Acceptance criteria:
- route diagnostics show that controller mode was active for a request
- diagnostics can display the validated controller recommendation and any parts that were rejected
- diagnostics continue to show the final chosen endpoint, fallback chain, and observed outcome after controller steering

### `R6` Use TDD and end-to-end verification for controller-guided routing

Description:
Controller-guided routing must be proven with failing tests first and live runtime routing across mixed local and remote pools.

Acceptance criteria:
- production changes are introduced through failing tests before green implementation
- validation includes focused coverage for controller prompt/input building, output validation, fallback behavior, and router integration
- end-to-end verification proves that request-time controller inference can steer routing across both local and remote endpoint pools in the live runtime
- end-to-end verification includes invalid-controller-output scenarios to prove safe fallback

## Out of Scope

- `OOS1`: request rewriting between abstract aliases and provider-family-specific models
- `OOS2`: final hybrid-mode arbitration between strategy B and strategy C
- `OOS3`: broad UI implementation beyond minimal diagnostics needed to inspect controller state if required here

## Constraints

- this run builds on the observed-data and difficulty foundations from runs `23` through `27`
- controller guidance must work across both local and remote endpoints without limitation
- output validation is mandatory before the runtime may use controller guidance
- the controller run must preserve exact-model backward compatibility and existing safety filters

## Assumptions

- controller inference can reuse existing execution plumbing or an additive equivalent in the bridge/runtime packages
- later hybrid-mode work can combine controller and difficulty signals without redefining the controller output contract

## Sequence Integration

- Roadmap slot: `routing strategy phase 3 - controller-guided routing`
- Previous repo dependency: `27-router-runtime-difficulty-learning-cache`
- Next repo dependency: `29-router-runtime-request-rewriter-hybrid-mode`
- Required handoff: working controller-guided routing with validated output, live routing integration, persistence, and local-plus-remote parity

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- `role-model-router/packages/protocol-routing/src/`
- `role-model-router/packages/core/src/`
- `role-model-router/packages/runtime-observability/src/`
- `role-model-router/packages/sqlite-memory/src/`
- runtime config and inspection API surfaces

## Validation Expectations

- focused tests are required for controller request building, structured output validation, routing merge logic, and persistence
- bridge-level validation must show safe handling of invalid or unresolvable controller recommendations
- end-to-end validation must cover representative requests steered across both local and remote pools
- validation receipts must show controller-active and controller-fallback scenarios

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] Controller contract, validation, and live routing responsibilities are explicit and verifiable
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements clearly separate controller guidance from later hybrid or rewrite behavior
- [x] No unresolved ambiguity remains about safety validation or local-plus-remote support

Approval: PASS
