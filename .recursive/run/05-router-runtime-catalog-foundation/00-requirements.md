Run: `/.recursive/run/05-router-runtime-catalog-foundation/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`
Outputs:
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
Scope note: This document defines the stable requirement contract for the catalog-foundation run. It maps roadmap `Run 05 - Catalog foundation` onto repo run `05-router-runtime-catalog-foundation`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Build the normalized catalog foundation

Description:
This run must establish the role-model-owned normalized catalog layer that future provider, endpoint, and routing work consume.

Acceptance criteria:
- the run covers a normalized catalog package or equivalent role-model-owned catalog surface
- upstream snapshot loading and validation are in scope and are treated as first-class behavior rather than ad hoc imports
- the normalized output preserves the upstream semantics the roadmap called out, including provider/model metadata, adapter hints, `extends` provenance, and `experimental.modes` where applicable

### `R2` Enrich catalog data with local runtime semantics

Description:
The raw upstream catalog must be enriched locally so later runs can reason about provider families and runtime constraints without mutating the upstream vendor source.

Acceptance criteria:
- provider-kind and auth-family enrichment are defined as role-model-owned logic layered on top of upstream catalog input
- local override support is included so runtime-specific corrections or extensions do not require permanent upstream divergence
- the run preserves the architecture-lock rule that catalog data is not treated as credentials or concrete endpoints

### `R3` Bootstrap the vendor version ledger for the catalog source

Description:
This run must start the role-model-owned vendor version ledger so later refreshes can be planned against a known upstream snapshot.

Acceptance criteria:
- the run includes the initial vendor-version recording path for the catalog source
- the ledger captures the exact upstream tag or commit used for the ingested catalog snapshot
- later runs can consume this ledger rather than rediscovering vendor versions ad hoc

### `R4` Preserve mandatory local validation and catalog-log repair

Description:
This run must include the roadmap's required local validation and error-repair loop for catalog ingestion work.

Acceptance criteria:
- the run requires a local catalog, smoke, or dev path that exercises ingestion and normalization
- the run requires reading normalization errors, schema validation output, and local command logs
- catalog parse or validation regressions introduced during the run must be repaired before closeout

## Out of Scope

- `OOS1`: provider-account records, credential storage, SQLite schema implementation, endpoint registry work, or routing execution work
- `OOS2`: host integration, operator UI implementation, or observability surfaces beyond the minimum artifacts needed to validate catalog ingestion
- `OOS3`: changing the upstream vendor repos instead of layering role-model-owned enrichment and version tracking on top

## Constraints

- Repo run `05-router-runtime-catalog-foundation` corresponds to roadmap `Run 05 - Catalog foundation`.
- This run must reread `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` before later implementation phases start.
- The run must consume the boundary decisions captured in `04-router-runtime-architecture-lock` rather than reopening them.
- Vendor tracking must stay role-model-owned and must not depend on mutable conversational memory.

## Assumptions

- A pinned `models.dev` snapshot or validated upstream API export is available to act as the initial catalog input.
- The architecture-lock run provides enough clarity to start catalog work without blocking on later auth, endpoint, or host implementation.

## Sequence Integration

- Roadmap slot: `Run 05 - Catalog foundation`
- Previous repo dependency: `04-router-runtime-architecture-lock`
- Next repo dependency: `06-router-runtime-provider-accounts-sqlite-memory`
- Required handoff: normalized catalog outputs, local enrichment rules, and initial vendor version ledger entries that later account/endpoint runs can consume

## Detailed Requirement Specification

- Build the normalized catalog package/foundation.
- Add upstream snapshot loading and validation.
- Add provider-kind/auth-family enrichment and local overrides.
- Bootstrap the vendor version ledger for the catalog source.
- Preserve the roadmap-local validation rule:
  - run the affected local catalog/smoke/dev path
  - read normalization errors, schema validation output, and local logs
  - repair newly introduced catalog regressions before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Catalog scope, enrichment rules, and vendor-version requirements were defined
- [x] Local validation and log-repair expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to avoid widening into provider-account or endpoint-registry work

Approval: PASS
