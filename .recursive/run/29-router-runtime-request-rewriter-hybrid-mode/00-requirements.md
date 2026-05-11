Run: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
Scope note: This run completes the backend strategy surface by adding request rewriting for model-family compatibility, hybrid arbitration between controller and difficulty modes, and per-request routing-mode overrides.

## TODO

- [x] Define numbered requirements and acceptance criteria for request rewriting and hybrid routing
- [x] Record per-request override, local-plus-remote support, and safety obligations
- [x] Record diagnostics and verification obligations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Add request rewriting from abstract alias intent to provider-family-compatible request shapes

Description:
The runtime must be able to rewrite a request after route choice when the selected endpoint requires a provider-family-specific request/model shape that differs from the client-facing alias.

Acceptance criteria:
- the bridge can translate the abstract alias request into the concrete model identifier and request shape expected by the chosen downstream endpoint
- rewriting works for both local and remote endpoints
- rewriting preserves the user-visible runtime contract so clients keep targeting the alias or selected routing mode rather than provider-specific names
- rewritten requests remain compatible with existing tool, response-format, and modality handling for the chosen provider family

### `R2` Add hybrid routing mode that arbitrates between controller guidance and difficulty-guided scoring

Description:
The runtime must support a hybrid mode that combines strategy B and strategy C instead of forcing operators to choose only one.

Acceptance criteria:
- hybrid mode is available through the runtime config contract
- hybrid arbitration has explicit and testable precedence rules for combining controller guidance, difficulty classification, observed-data scoring, and baseline eligibility filters
- hybrid mode works across pools containing both local and remote endpoints
- diagnostics can show which signal dominated or altered the final decision

### `R3` Support per-request routing-mode overrides without breaking defaults

Description:
Operators and higher-level clients must be able to force baseline, difficulty, controller, or hybrid behavior on an individual request.

Acceptance criteria:
- the runtime supports a per-request routing-mode override through a documented request header, metadata field, or locked equivalent
- per-request overrides can select at least baseline, difficulty, controller, and hybrid modes
- invalid overrides fail deterministically and do not corrupt default routing behavior
- the runtime records when an override changed the route decision path

### `R4` Preserve exact-model compatibility and additive rollout behavior under rewriting and overrides

Description:
Hybrid mode and rewriting must not regress the additive compatibility guarantees established earlier in the rollout.

Acceptance criteria:
- exact-model requests remain functional after request rewriting and hybrid mode land
- alias routing still works when no per-request override is provided
- rewriting occurs only when needed for downstream compatibility and not for exact-model requests that already match the chosen endpoint
- local and remote endpoints are treated as equally eligible targets for hybrid routing and rewriting

### `R5` Add diagnostics that explain rewrite and hybrid arbitration behavior

Description:
Operators must be able to inspect how the final request was derived and why the hybrid router chose a route.

Acceptance criteria:
- diagnostics show the selected routing mode, including when it was overridden per request
- diagnostics can show whether the request was rewritten and to which concrete downstream model or protocol shape
- diagnostics continue to show controller, difficulty, observed-data, and baseline factors that contributed to the final decision
- diagnostics can distinguish between pre-route alias expansion and post-route request rewriting

### `R6` Use TDD and end-to-end verification for rewrite and hybrid behavior

Description:
The final backend strategy slice must be proven with failing tests first and live runtime verification across multiple route modes.

Acceptance criteria:
- production changes are introduced through failing tests before green implementation
- validation includes focused coverage for request rewriting, hybrid arbitration, per-request override parsing, and exact-model compatibility
- end-to-end verification proves hybrid routing, per-request overrides, and rewritten downstream requests across both local and remote endpoints in the live runtime
- end-to-end verification includes at least one scenario where different override modes produce different routing outcomes for the same candidate pool

## Out of Scope

- `OOS1`: full proposal-wide convergence audit and iterative runtime hardening
- `OOS2`: design-system-first UI completion beyond minimal diagnostics needed for this backend slice
- `OOS3`: post-rollout packaging or release engineering unrelated to routing behavior

## Constraints

- this run builds on alias, difficulty, observed-data, and controller foundations from runs `23` through `28`
- hybrid arbitration and rewriting must work across both local and remote endpoints without limitation
- additive compatibility is mandatory: exact-model requests and baseline routing must remain available
- rewritten requests must remain explainable in diagnostics and safe under existing provider capability checks

## Assumptions

- the provider adapter layer can absorb additive request-shape translation without requiring a redesign of the public runtime API
- run `30` will use the diagnostics and override surfaces from this run for end-to-end proposal conformance testing

## Sequence Integration

- Roadmap slot: `routing strategy phase 4 - hybrid mode and rewrite compatibility`
- Previous repo dependency: `28-router-runtime-controller-guided-routing`
- Next repo dependency: `30-router-runtime-strategy-convergence-e2e`
- Required handoff: full backend routing-strategy surface with request rewriting, hybrid mode, and per-request overrides across local and remote endpoints

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- provider adapter packages under `role-model-router/packages/`
- `role-model-router/packages/core/src/`
- `role-model-router/packages/protocol-routing/src/`
- runtime config and inspection API surfaces

## Validation Expectations

- focused tests are required for rewrite rules, hybrid arbitration precedence, override parsing, and diagnostics
- bridge-level validation must show safe behavior for invalid overrides and unsupported rewrite targets
- end-to-end validation must exercise baseline, difficulty, controller, and hybrid modes across both local and remote pools
- validation receipts must show concrete before/after route decisions under different per-request mode selections

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] Rewrite, hybrid arbitration, and per-request override responsibilities are explicit and verifiable
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements clearly separate final backend strategy behaviors from the convergence/UI run
- [x] No unresolved ambiguity remains about additive compatibility or local-plus-remote support

Approval: PASS
