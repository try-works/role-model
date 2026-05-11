Run: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `ui-design-system` skill guidance
Outputs:
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
Scope note: This convergence run verifies the full proposal against the implemented runtime, integrates all prior strategy slices into one working system, completes any required UI surfaces through a design-system-first workflow, and iterates until the runtime works end to end.

## TODO

- [x] Define numbered requirements and acceptance criteria for proposal-convergence and E2E hardening
- [x] Record the design-system-first UI obligation and the requirement to use `ui-design-system`
- [x] Record local-plus-remote end-to-end scope, iterative hardening, and verification obligations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Produce a proposal-to-runtime conformance audit across runs `22` through `29`

Description:
Before closing the rollout, the repo must have an explicit, evidence-backed comparison between the routing-strategy proposal and the implemented runtime behavior.

Acceptance criteria:
- the run includes a systematic conformance audit that maps proposal capabilities to concrete runtime implementation surfaces
- the audit identifies any missing, partial, or behaviorally divergent items discovered after integrating the prior runs
- any discovered gap that blocks proposal conformance is either fixed in this run or explicitly left open only if the proposal or prior run contracts prove it out of scope
- the audit covers both backend runtime behavior and any operator-facing UI needed to use or inspect the strategy

### `R2` Integrate the full routing strategy into one working runtime without mode fragmentation

Description:
All previously delivered routing slices must work together coherently in the live runtime.

Acceptance criteria:
- the live runtime can execute baseline, alias-pool, difficulty-guided, controller-guided, and hybrid routing flows in one integrated system
- integrated behavior continues to support both local and remote endpoints/models without limitation
- the runtime preserves exact-model backward compatibility after all strategy slices are combined
- integration removes any temporary seams, feature gaps, or mismatched contracts that prevent the proposal from working as a whole

### `R3` Complete required operator/runtime UI surfaces through a design-system-first workflow

Description:
If UI changes are required to make the strategy operable, they must start with the design system before feature screens are implemented.

Acceptance criteria:
- any UI work in this run begins by updating the existing design system with the layouts, components, states, and tokens required by the routing strategy surfaces
- UI design and implementation follow the `ui-design-system` guidance, including accessible component composition, responsive behavior, and WCAG-aware design choices
- operator-facing UI can configure, inspect, or verify the routing-strategy features that must be user-operable according to the proposal and preceding runs
- UI work does not bypass the design-system-first step by directly shipping ad hoc screens or one-off components first

### `R4` Hardening must be iterative until end-to-end proposal behavior works

Description:
This run is not a one-pass integration. It must keep iterating until the runtime actually works end to end and satisfies the full proposal contract.

Acceptance criteria:
- the run includes iterative fix-and-verify cycles for any integration issues uncovered during full-runtime testing
- integration is not considered complete until proposal-critical flows pass in the live runtime
- when failures are found, the run updates the relevant backend or UI surfaces rather than documenting the failure only
- the final evidence set shows resolved failures or a justified explanation if a proposal item is explicitly superseded by the locked run requirements

### `R5` Execute end-to-end verification across local and remote strategy scenarios

Description:
The runtime must be proven under representative real flows rather than unit and integration tests alone.

Acceptance criteria:
- end-to-end verification covers requests routed to local-only pools, remote-only pools, and mixed local-plus-remote pools
- end-to-end verification covers at least baseline, alias-pool, difficulty, controller, and hybrid strategy paths
- end-to-end verification proves exact-model compatibility still works alongside the new strategy surfaces
- end-to-end verification includes operator-facing inspection or UI flows when those are required to configure or understand the runtime behavior

### `R6` Maintain strict TDD and verification discipline through the convergence run

Description:
Even though this run is integrative, code changes still must follow the repo’s TDD discipline and verification gates.

Acceptance criteria:
- every production fix or integration adjustment introduced in this run is preceded by failing coverage at the appropriate level before implementation turns green
- validation includes the strongest relevant repo-local suites for runtime behavior, integration, and UI surfaces touched by this run
- the final evidence set demonstrates that the integrated runtime and required UI behavior are working end to end
- the run closes only after the proposal-aligned runtime behavior is verified rather than assumed from prior run success alone

## Out of Scope

- `OOS1`: new routing strategies beyond those already locked in runs `22` through `29`
- `OOS2`: unrelated product redesign outside the design-system and routing-runtime surfaces needed to make the proposal operable
- `OOS3`: speculative optimization work that does not affect proposal conformance or runtime correctness

## Constraints

- this run depends on successful completion of runs `22` through `29`
- the integrated runtime must work across both local and remote endpoints/models without limitation
- if UI work is required, the first UI step is updating the design system and applying `ui-design-system` guidance
- the run must iterate until the proposal works end to end rather than stopping at partial integration
- exact-model backward compatibility remains mandatory

## Assumptions

- prior runs provide the necessary backend primitives and this run mainly resolves integration, conformance, and usability gaps
- the repo contains or can add the validation surfaces needed to exercise runtime and UI flows together without inventing a separate external harness

## Sequence Integration

- Roadmap slot: `routing strategy phase 5 - convergence, UI, and proposal verification`
- Previous repo dependency: `29-router-runtime-request-rewriter-hybrid-mode`
- Next repo dependency: none; this is the convergence run
- Required handoff: a proposal-aligned runtime and required UI/operator surfaces that work end to end across local and remote routing scenarios

## Targeted Package And File Inventory

- all routing-runtime packages touched by runs `22` through `29`
- runtime UI application and shared design-system surfaces
- operator-facing inspection/configuration API surfaces
- runtime validation and end-to-end harness surfaces

## Validation Expectations

- focused tests are required for every new integration fix introduced during this run
- full-runtime validation must exercise local-only, remote-only, and mixed local-plus-remote strategy scenarios
- operator/UI validation must include design-system-updated components and the required configuration/inspection flows
- final evidence must include a proposal-conformance audit plus end-to-end receipts showing the integrated runtime working

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] Convergence, conformance audit, design-system-first UI work, and iterative hardening are explicit and verifiable
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements clearly state that this run must iterate until the full proposal works end to end
- [x] No unresolved ambiguity remains about the design-system-first UI obligation or local-plus-remote runtime scope

Approval: PASS
