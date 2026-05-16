Run: `/.recursive/run/25-router-runtime-model-alias-pool/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-11T11:48:48Z`
LockHash: `f320d20495e8e442f0961741c5429d9c29112cdd8c38fbc3a577948b2f64bb6c`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
Scope note: This run ships the first user-visible routing-strategy slice by adding alias-based model-pool routing while preserving exact-model compatibility and local-plus-remote parity.

## TODO

- [x] Define numbered requirements and acceptance criteria for alias-based model-pool routing
- [x] Record exact-model compatibility, local-plus-remote parity, diagnostics, and verification obligations
- [x] Record scope boundaries, constraints, assumptions, targeted surfaces, and validation expectations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Add a repo-owned alias configuration contract for model-pool routing

Description:
The runtime must gain a durable alias configuration surface that maps one client-facing alias to a pool of real model ids spanning local and remote endpoints.

Acceptance criteria:
- the runtime config supports repo-owned alias definitions under `modelAliases` or the locked equivalent selected by run `22`
- an alias definition can list multiple real model ids that may resolve to both local and remote endpoints
- alias configuration can coexist with exact-model requests rather than replacing them
- invalid alias config fails fast with descriptive validation errors

### `R2` Expose masquerade aliases through downstream model discovery

Description:
Clients must be able to discover the masquerade alias through the runtime's OpenAI-compatible discovery surface.

Acceptance criteria:
- `/v1/models` can expose at least one configured alias such as `gpt-5.4`
- the runtime's downstream OpenAI provider configuration surface reflects the recommended alias rather than only the raw model ids
- model discovery behavior remains deterministic and documented when aliases and real model ids coexist
- alias exposure does not break the existing runtime API surfaces that inspect real endpoints and real models

### `R3` Resolve alias requests to a scored candidate pool across local and remote endpoints

Description:
When a client sends `model: "<alias>"`, the bridge must expand the alias into the configured candidate pool and let the router score the resulting local-plus-remote endpoint set.

Acceptance criteria:
- alias resolution builds `allowEndpoints` or the equivalent candidate restriction from all endpoints whose `model_id` appears in the alias pool
- the candidate pool may include both local and remote endpoints in the same request
- fallback ordering continues to come from router scoring rather than alias list order alone
- if an alias references a model id that is not presently available in the registry, the runtime handles it deterministically without crashing

### `R4` Preserve exact-model compatibility and capability gating while adding aliases

Description:
Alias routing must be additive. Exact-model requests and existing runtime protections must keep working.

Acceptance criteria:
- exact-model requests continue to route by real model id after alias support lands
- existing capability, modality, tool-calling, and context-window eligibility checks continue to filter candidates inside alias pools
- the bridge returns the real chosen model in responses rather than rewriting the response `model` back to the alias
- alias routing works for both local and remote endpoint pools without introducing a one-sided implementation shortcut

### `R5` Surface alias resolution and pool composition in diagnostics

Description:
Operators and later convergence runs need to understand how an alias was expanded and why one endpoint won.

Acceptance criteria:
- route diagnostics or inspection output show when a request used an alias instead of an exact model id
- diagnostics can identify the resolved pool membership used for the route decision
- diagnostics continue to show the real chosen endpoint and fallback chain after alias expansion

### `R6` Use TDD and end-to-end verification for alias-based cross-model routing

Description:
The first user-facing cross-model routing slice must be proven through failing tests first and live runtime verification.

Acceptance criteria:
- production changes are introduced through failing tests before green implementation
- validation includes focused coverage for config parsing, discovery output, alias resolution, and routing integration
- end-to-end verification proves that one alias request can route between both local and remote pool members in the live runtime
- end-to-end verification proves exact-model requests remain functional after alias routing is added

## Out of Scope

- `OOS1`: difficulty classification or `maxDifficulty`
- `OOS2`: controller-guided protocol routing
- `OOS3`: model-family request rewriting beyond what existing provider adapters already support

## Constraints

- this run depends on the observed-data foundation from runs `23` and `24`
- alias routing must support both local and remote endpoints in the same pool without limitation
- exact-model compatibility is mandatory
- capability mismatches inside alias pools must continue to be handled through runtime eligibility filtering rather than silent unsafe execution

## Assumptions

- the runtime registry can already expose both local and remote endpoints simultaneously
- later difficulty and controller runs can build on the same alias contract instead of replacing it

## Sequence Integration

- Roadmap slot: `routing strategy phase 1 - model-pool routing`
- Previous repo dependency: `24-router-runtime-recency-bias-throughput-sla`
- Next repo dependency: `26-router-runtime-difficulty-guided-routing`
- Required handoff: working alias-based model-pool routing with real local-plus-remote candidate selection and exact-model backward compatibility

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- runtime config parsing/rendering surfaces
- `role-model-router/packages/protocol-routing/src/`
- `role-model-router/packages/core/src/`
- runtime UI or operator API surfaces only if needed to inspect alias state, but broad UI implementation remains deferred

## Validation Expectations

- focused tests are required for alias config, model discovery output, pool expansion, and route diagnostics
- bridge-level validation must prove `/v1/models` and request mapping behavior for aliases
- end-to-end validation must cover at least one alias pool containing both local and remote endpoints
- validation receipts must show exact-model compatibility still passing after alias support lands

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] The alias-routing scope is explicit, additive, and verifiable
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements clearly separate alias routing from later difficulty/controller behavior
- [x] No unresolved ambiguity remains about exact-model backward compatibility or local-plus-remote pool support

Approval: PASS
