Run: `/.recursive/run/07-router-runtime-protocol-routing/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/03-router-runtime-architecture-lock/00-requirements.md`
- `/.recursive/run/06-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
Outputs:
- `/.recursive/run/07-router-runtime-protocol-routing/00-requirements.md`
Scope note: This document defines the stable requirement contract for the protocol-driven routing run. It maps roadmap `Run 04 - Protocol-driven routing and configurable routing model` onto repo run `07-router-runtime-protocol-routing`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Implement protocol-driven request and candidate projection

Description:
This run must add the mandatory interim routing layer that projects non-protocol provider and runtime inputs into protocol-governed routing inputs on every request.

Acceptance criteria:
- protocol-driven request and candidate projection is in scope and is treated as non-optional
- routing continues to honor hard protocol constraints, policy gates, and deterministic eligibility checks rather than deferring to provider-native dispatch shortcuts
- the run builds on the earlier endpoint-registry outputs instead of inventing a second candidate source

### `R2` Support a user-configurable routing model without weakening protocol control

Description:
When model-assisted routing is enabled, the runtime must allow the user to choose which model or endpoint performs that assisted step without letting the routing model bypass protocol semantics.

Acceptance criteria:
- configurable routing-model selection is in scope
- the configuration surface remains constrained by protocol-governed inputs and deterministic eligibility boundaries
- the run keeps the user-configurable routing-model decision explicit and testable rather than hidden in adapter code

### `R3` Extend routing with SQLite-backed context retrieval and expanded conformance

Description:
The routing layer must consume the earlier local-memory and context-envelope work so routing decisions preserve continuity and can be explained.

Acceptance criteria:
- SQLite-backed context retrieval for routing is in scope
- routing-core eligibility expansion plus expanded exclusion and selection reason codes are in scope
- routing conformance growth covers both local and cloud-oriented cases rather than only the preexisting baseline fixtures
- cache-aware routing and cost-signal integration are included where provider/runtime support exists

### `R4` Preserve mandatory local validation and routing diagnostics

Description:
This run must include the roadmap's required local routing validation and repair loop.

Acceptance criteria:
- the run requires a local end-to-end routing path with representative requests
- the run requires reading router decisions, exclusion logs, retrieval receipts, and routing-model diagnostics
- incorrect routing decisions or newly introduced local runtime errors must be repaired before closeout

## Out of Scope

- `OOS1`: provider adapter execution, request-serving host integration, or operator UI implementation work
- `OOS2`: redefining the earlier protocol, registry, or SQLite-memory contracts instead of consuming them
- `OOS3`: replacing deterministic routing with a purely model-native or provider-native dispatch path

## Constraints

- Repo run `07-router-runtime-protocol-routing` corresponds to roadmap `Run 04 - Protocol-driven routing and configurable routing model`.
- This run must treat `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` as the canonical source when design conflicts appear.
- The run must consume the earlier architecture, registry, context-envelope, and SQLite-memory outputs as prerequisites.
- The configurable routing-model path must remain subordinate to protocol semantics and explicit policy enforcement.

## Assumptions

- The earlier endpoint-registry and context-envelope run produces enough stable candidate and continuity data to power routing.
- The existing deterministic router core is the right baseline to extend rather than replace wholesale.

## Sequence Integration

- Roadmap slot: `Run 04 - Protocol-driven routing and configurable routing model`
- Previous repo dependency: `06-router-runtime-endpoint-registry-context-envelope`
- Next repo dependency: `08-router-runtime-adapter-execution-plane`
- Required handoff: protocol-driven projection, configurable routing-model selection, SQLite-backed routing retrieval, and expanded routing conformance outputs

## Detailed Requirement Specification

- Add protocol-driven request and candidate projection.
- Add configurable routing-model selection.
- Add SQLite-backed context retrieval for routing.
- Expand routing-core eligibility, exclusion/selection reason codes, local/cloud conformance, and cache-aware routing signals where supported.
- Preserve the roadmap-local validation rule:
  - run the local routing path end to end with representative requests
  - read router decisions, exclusion logs, retrieval receipts, and routing-model diagnostics
  - repair incorrect routing decisions or newly introduced runtime errors before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Routing-projection, configurable-routing-model, and conformance requirements were defined
- [x] Local validation and log-repair expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to avoid widening into adapter or host work

Approval: PASS
