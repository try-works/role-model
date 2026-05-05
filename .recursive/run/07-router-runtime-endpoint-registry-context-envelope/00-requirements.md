Run: `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-05T03:27:33Z`
LockHash: `afab9f10ee75c4306b4778fb85ba41c68260856eed09278e7861630399d692e9`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
Outputs:
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
Scope note: This document defines the stable requirement contract for the endpoint-registry and context-envelope run. It maps roadmap `Run 07 - Endpoint registry and context envelope` onto repo run `07-router-runtime-endpoint-registry-context-envelope`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Instantiate routable endpoints from catalog and account state

Description:
This run must convert catalog and provider-account inputs into a runtime endpoint registry that the router can actually reason over.

Acceptance criteria:
- endpoint instantiation rules are in scope
- the runtime endpoint registry is in scope
- local and cloud discovery integration plus lifecycle state handling are part of the run rather than deferred to a later host-only phase
- concrete endpoint metadata remains compatible with committed `endpoint_version`, scored-candidate explainability, and the run-03 artifact/linkage model

### `R2` Establish the identity and continuity model for routed conversations

Description:
This run must define the runtime identity layer that links sessions, conversations, and context continuity to concrete routed endpoints.

Acceptance criteria:
- session and conversation identity modeling is in scope
- the run defines the bounded context-envelope model and retrieval-receipt model that later routing work consumes
- the run preserves the earlier SQLite-memory contract instead of bypassing it with provider-native conversation state

### `R3` Define the handoff from registry construction into routing

Description:
This run must leave downstream routing work with a stable candidate registry and context-handoff surface.

Acceptance criteria:
- later routing work can consume the registry, lifecycle state, context envelope, and retrieval receipt outputs without reopening the provider-account schema
- endpoint identity normalization remains compatible with the protocol's endpoint-centric routing contract
- the run does not collapse discovery state, lifecycle state, and retrieved context into one opaque payload

### `R4` Preserve mandatory local validation and registry/retrieval diagnostics

Description:
This run must include the roadmap's required validation and repair loop for discovery, registry, and context-envelope behavior.

Acceptance criteria:
- the run requires a local discovery or registry path and a local context-envelope assembly path
- the run requires reading endpoint instantiation logs, registry diagnostics, and retrieval-receipt output
- broken candidate enumeration or context-envelope assembly introduced during the run must be repaired before closeout

## Out of Scope

- `OOS1`: routing projection, routing-model selection, adapter execution, or host integration work
- `OOS2`: observability/operator surfaces beyond the minimum artifacts needed to prove registry and retrieval behavior
- `OOS3`: replacing the earlier provider-account or SQLite-memory contract instead of building on it

## Constraints

- Repo run `07-router-runtime-endpoint-registry-context-envelope` corresponds to roadmap `Run 07 - Endpoint registry and context envelope`.
- This run must consume the earlier catalog and provider-account/SQLite outputs as prerequisites.
- The run must reread `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` before later implementation phases start.
- The architecture lock doc is the repo-native source for endpoint-instantiation ownership and the protocol-driven projection boundary.
- The resulting registry and context-envelope outputs must be usable by the protocol-driven routing run without a second identity-model redesign.
- The registry and context-envelope layer must preserve the committed run-03 endpoint, artifact, and linkage vocabulary.

## Assumptions

- The provider-account and SQLite-memory run provides enough stable schema and storage primitives to support registry and context-envelope work.
- The existing protocol endpoint-identity model remains the canonical routing unit for this runtime layer.

## Sequence Integration

- Roadmap slot: `Run 07 - Endpoint registry and context envelope`
- Previous repo dependency: `06-router-runtime-provider-accounts-sqlite-memory`
- Next repo dependency: `08-router-runtime-protocol-routing`
- Required handoff: runtime endpoint registry, lifecycle state handling, session/conversation identity model, context envelopes, and retrieval receipts

## Detailed Requirement Specification

- Add endpoint instantiation rules and the runtime endpoint registry.
- Add lifecycle state handling plus local/cloud discovery integration.
- Add the session/conversation identity model.
- Add the context-envelope and retrieval-receipt model.
- Preserve the roadmap-local validation rule:
  - run the local discovery/registry path and context-envelope assembly path
  - confirm candidate enumeration and context-envelope assembly still compose with the committed artifact/linkage model
  - read endpoint instantiation logs, registry diagnostics, and retrieval-receipt output
  - repair newly introduced candidate-enumeration or context-envelope failures before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Registry, lifecycle, and context-envelope requirements were defined
- [x] Local validation and log-repair expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to avoid widening into routing or adapter execution work

Approval: PASS
