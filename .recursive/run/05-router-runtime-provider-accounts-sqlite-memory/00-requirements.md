Run: `/.recursive/run/05-router-runtime-provider-accounts-sqlite-memory/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/03-router-runtime-architecture-lock/00-requirements.md`
- `/.recursive/run/04-router-runtime-catalog-foundation/00-requirements.md`
Outputs:
- `/.recursive/run/05-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
Scope note: This document defines the stable requirement contract for the provider-account and SQLite-memory-schema run. It maps roadmap `Run 02 - Provider accounts and SQLite memory schema` onto repo run `05-router-runtime-provider-accounts-sqlite-memory`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Model provider-account state explicitly

Description:
This run must introduce the runtime subsystem that makes provider accounts, tenancy, and credential references first-class runtime concepts instead of implicit adapter state.

Acceptance criteria:
- provider-account records and validation are in scope
- credential-reference abstraction and auth-mode abstraction are in scope
- the run keeps secrets, refresh tokens, and signing material out of protocol artifacts while still modeling the runtime references needed to execute requests

### `R2` Define the SQLite-first memory schema and store contract

Description:
This run must establish the authoritative local persistence baseline for router-runtime memory.

Acceptance criteria:
- the run includes the SQLite memory schema and the memory store location contract described in the roadmap
- the schema covers the roadmap's local-memory responsibilities rather than reducing memory to a single opaque blob
- the run preserves the SQLite-first decision while keeping extension seams for later secondary stores
- the run defines schema-version and migration responsibilities, plus the same-host local-disk assumption for the primary SQLite store

### `R3` Establish retention and maintenance expectations for the memory layer

Description:
The initial SQLite layer must include operational expectations rather than being treated as disposable scratch state.

Acceptance criteria:
- retention and maintenance baseline behavior is part of the run scope
- the run defines how schema initialization or migration is expected to happen locally
- the run preserves the earlier roadmap rule that local memory is required for context continuity and routed-model handoff
- the run defines privacy, redaction, backup, and deletion expectations for local memory and related capture artifacts

### `R4` Preserve mandatory local validation and SQLite/auth diagnostics

Description:
This run must include the roadmap's required validation and repair loop for account configuration and SQLite initialization.

Acceptance criteria:
- the run requires a local validation path for account configuration plus SQLite initialization or migration
- the run requires reading SQLite errors, migration logs, and auth/account diagnostics
- schema, init, or migration failures introduced during the run must be repaired before closeout

## Out of Scope

- `OOS1`: endpoint-registry implementation, context-envelope assembly, routing projection, adapter execution, or host integration work
- `OOS2`: vector or secondary memory backends beyond preserving extension seams for later work
- `OOS3`: storing raw credentials or provider-owned session secrets inside protocol or memory artifacts

## Constraints

- Repo run `05-router-runtime-provider-accounts-sqlite-memory` corresponds to roadmap `Run 02 - Provider accounts and SQLite memory schema`.
- This run must consume the catalog outputs and architecture boundaries produced by the earlier router-runtime runs.
- The run must reread `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` before later implementation phases start.
- The memory contract must remain compatible with later endpoint-registry, context-envelope, and routing runs.

## Assumptions

- The normalized catalog layer from run `04-router-runtime-catalog-foundation` provides enough provider metadata to anchor provider-account and auth-mode modeling.
- SQLite remains the approved initial authoritative memory backend unless a later addendum explicitly changes the roadmap.

## Sequence Integration

- Roadmap slot: `Run 02 - Provider accounts and SQLite memory schema`
- Previous repo dependency: `04-router-runtime-catalog-foundation`
- Next repo dependency: `06-router-runtime-endpoint-registry-context-envelope`
- Required handoff: provider-account/auth abstractions, SQLite schema and store contract, and retention/maintenance baseline needed by registry and routing work

## Detailed Requirement Specification

- Add provider-account records and validation.
- Add credential-reference and auth-mode abstractions.
- Add the SQLite memory schema and store location contract.
- Add the retention and maintenance baseline for the local memory layer.
- Add SQLite schema-version, migration, backup, and restore responsibilities.
- Add local-memory privacy, redaction, and deletion expectations.
- Preserve the roadmap-local validation rule:
  - run the local account-configuration and SQLite init/migration path
  - read SQLite errors, migration logs, and auth/account diagnostics
  - repair newly introduced schema/init/migration failures before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Provider-account and SQLite-memory requirements were defined
- [x] Local validation and log-repair expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to avoid widening into endpoint-registry or routing work

Approval: PASS
