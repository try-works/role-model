Run: `/.recursive/run/04-router-runtime-architecture-lock/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- prior repo baseline runs `00-baseline`, `01-protocol-routing-obs`, and `02-audit-remediation`
Outputs:
- `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`
Scope note: This document defines the stable requirement contract for the first router-runtime sequence run after the committed protocol baseline hardening. It maps roadmap `Run 04 - Architecture lock` onto repo run `04-router-runtime-architecture-lock`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Lock the router-runtime architecture boundaries

Description:
This run must turn the roadmap's architecture-lock slice into explicit repo requirements that later implementation runs can follow without re-litigating the core runtime boundaries.

Acceptance criteria:
- provider taxonomy, provider id versus provider kind, auth/account boundary, protocol-driven routing projection boundary, SQLite-first memory boundary, routing-model configuration boundary, protocol-versus-runtime-config boundary, provider-capability-negotiation boundary, observability-interoperability boundary, and runtime-data-governance boundary are all stated explicitly in the run outputs
- the architecture lock keeps the protocol canonical and keeps runtime-specific state out of protocol artifacts
- ambiguous areas are resolved in repo artifacts or addenda rather than left implicit in chat

### `R2` Preserve the planned vendor and frontend boundary decisions

Description:
The architecture lock must carry forward the already-agreed vendor and frontend constraints so downstream runs do not drift away from the roadmap.

Acceptance criteria:
- `models.dev` remains a catalog/input source and not a credential, endpoint, or frontend shell source of truth
- `llama-swap` remains an execution-plane host reference rather than a substitute for protocol-driven routing
- if later implementation touches frontend/operator surfaces, the run records that the Swiss design bundle at `C:\Users\erikb\OneDrive\##### DEV\#DESIGN\swiss-design` must be used explicitly

### `R3` Define sequence integration and handoff rules

Description:
This run must create a clean handoff into the rest of the router-runtime sequence.

Acceptance criteria:
- the run explicitly identifies repo run `05-router-runtime-catalog-foundation` as the next implementation dependency
- downstream runs are required to reread `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` at phase start when resolving scope or design choices
- the architecture lock identifies which outputs later runs consume rather than assuming oral continuity

### `R4` Enforce local validation and log review even for this architecture-lock run

Description:
This run must preserve the roadmap rule that no implementation run is considered complete without a local validation and log-review step.

Acceptance criteria:
- the run requires validation that the current repo baseline commands still pass before any product-changing router-runtime run begins
- the run requires reading local planning/test command output for regressions before closeout
- any new regression introduced while preparing this run's control-plane artifacts is treated as in-scope repair work

## Out of Scope

- `OOS1`: catalog ingestion, provider accounts, endpoint registry, routing execution, host integration, or observability implementation work
- `OOS2`: frontend implementation beyond preserving the previously agreed design constraints and route/shell planning boundaries
- `OOS3`: retroactively rewriting the closed `00-baseline`, `01-protocol-routing-obs`, or `02-audit-remediation` run histories

## Constraints

- Repo run `04-router-runtime-architecture-lock` corresponds to roadmap `Run 04 - Architecture lock`.
- This run must treat `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` as the canonical source of truth when conflicts or ambiguities appear.
- This run must stay at the requirement/control-plane layer and must not silently widen into later product runs.
- Later run requirements should inherit the local validation and log-driven repair rule from this run instead of redefining a weaker standard.

## Assumptions

- The previously updated roadmap already captures the current user-approved runtime architecture decisions accurately enough to seed the run sequence.
- The existing repo baseline from runs `00` through `02` remains the authoritative implementation starting point for this sequence.

## Sequence Integration

- Roadmap slot: `Run 04 - Architecture lock`
- Previous repo dependency: `02-audit-remediation`
- Next repo dependency: `05-router-runtime-catalog-foundation`
- Required handoff: locked architecture boundaries for provider taxonomy, provider/account separation, routing projection, SQLite-first memory, and routing-model configuration

## Detailed Requirement Specification

- Lock the runtime architecture decisions before starting product-changing router-runtime work.
- Keep protocol semantics canonical while keeping runtime config, auth/account state, and secrets outside protocol artifacts.
- Lock the boundaries for:
  - provider capability negotiation across tool calling, structured outputs, streaming, and caching
  - OpenTelemetry GenAI interoperability relative to canonical protocol artifacts
  - data governance for local memory, traces, and request/response captures
- Preserve the upstream-vendor split:
  - `models.dev` as catalog input
  - `llama-swap` as execution-plane host reference
- Preserve the local validation rule from the roadmap:
  - validate the current repo baseline commands
  - read local planning/test output for regressions
  - repair newly introduced breakage before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Stable requirements, boundaries, and handoff rules were defined
- [x] Local validation and log-review expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to prevent accidental widening into later router-runtime runs

Approval: PASS
