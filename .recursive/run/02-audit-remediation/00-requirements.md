Run: `/.recursive/run/02-audit-remediation/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-04-24T00:53:31Z`
LockHash: `7309e969970af8362b138efc7fc1983f79c3a5cae90d3a14d45a17282f11a6e3`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/02-audit-remediation/audit-findings-2026-04-24.md`
- 2026-04-24 repository audit findings captured from the current session
Outputs:
- `/.recursive/run/02-audit-remediation/00-requirements.md`
Scope note: This document turns the 2026-04-24 audit findings into stable requirement identifiers,
acceptance criteria, and explicit scope boundaries for a narrow remediation run.

## TODO

- [x] Capture the audit findings in a durable repo document
- [x] Define stable requirement identifiers for the remediation run
- [x] Write observable acceptance criteria for each requirement
- [x] Document out-of-scope work to prevent run widening
- [x] Record constraints and assumptions from the audit context
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Canonical schemas declare stable in-file `$id`

Description:
The committed canonical JSON Schema files under `protocol/schemas/` must carry stable top-level
`$id` values in source rather than relying on runtime injection.

Acceptance criteria:
- every in-scope schema file under `protocol/schemas/*.schema.json` contains a stable top-level `$id`
- schema files remain valid Draft 2020-12 JSON Schema documents after the change
- the committed schema source, not only the loader output, satisfies the repository's canonical schema
  contract

### `R2` Schema tooling validates the canonical source shape directly

Description:
The schema tooling and conformance surface must stop masking missing schema identity in source.

Acceptance criteria:
- `packages/schema-tools/src/validate-schemas.ts` and any related helpers no longer silently paper
  over missing schema `$id` fields in a way that would let incomplete canonical schema files pass as
  complete
- the affected conformance coverage proves the canonical-source requirement rather than only the
  runtime-loaded shape
- type generation remains functional after the source-of-truth fix

### `R3` Root schema validation command path is reliable again

Description:
The repository's supported root schema-validation command path must complete successfully in the
supported toolchain baseline instead of hanging or requiring a direct bypass.

Acceptance criteria:
- the root schema-validation entrypoint exercised by the repository's scripts and tests completes
  successfully on the supported Node 22 baseline
- if a command-path issue is environment-specific, the run records the exact supported versus
  unsupported behavior and keeps the conformance expectations aligned with the supported baseline
- the remediation does not regress the direct schema-validation path

### `R4` Root smoke command path is reliable again

Description:
The repository's supported root smoke-command path must complete successfully in the supported
toolchain baseline instead of hanging while direct package execution succeeds.

Acceptance criteria:
- the root smoke entrypoint used by the repository scripts and conformance tests completes
  successfully on the supported Node 22 baseline
- direct package-level smoke execution continues to work
- the emitted smoke artifacts remain protocol-valid after the remediation

### `R5` Affected conformance coverage is green again

Description:
The tests derived from the audit findings must pass again after the command-path and schema-source
fixes are applied.

Acceptance criteria:
- the conformance coverage that exercises schema validation through the canonical command path passes
- the conformance coverage that exercises smoke observability through the canonical command path
  passes
- the run records the exact verification commands and results used to prove the fix

## Out of Scope

- `OOS1`: widening into unrelated protocol, router, provider, browser, edge, or native runtime work
- `OOS2`: general repo-wide Biome cleanup or line-ending normalization beyond the minimum targeted
  changes required by `R1`-`R5`
- `OOS3`: changing the repository's broader architecture, package layout, or scaffold inventory
- `OOS4`: implementing deferred features that were not part of the 2026-04-24 audit findings

## Constraints

- The source audit note for this run is
  `/.recursive/run/02-audit-remediation/audit-findings-2026-04-24.md`.
- The run must stay narrowly scoped to the two concrete findings captured in that source note.
- Verification must distinguish repo-supported behavior under Node 22 from incidental behavior in the
  current Node 24 environment.
- Existing functionality that already works through the direct package-level command paths should be
  preserved unless a targeted change is required to restore the canonical root-script path.

## Assumptions

- The 2026-04-24 audit correctly identified the missing in-file `$id` problem as a real repository
  gap rather than a documentation-only mismatch.
- The `corepack pnpm run ...` timeout behavior seen in the audited Windows/Node 24 environment may be
  either a repo bug or an unsupported-environment interaction; this run exists to narrow and resolve
  that ambiguity on the supported baseline.
- Prior recursive runs `00-baseline` and `01-protocol-routing-obs` remain the durable upstream
  history for the broader baseline and M1-M3 work, so this run should act as a focused remediation
  rather than a fresh restatement of the entire repo contract.

## Detailed Source Summary

- Source doc: `/.recursive/run/02-audit-remediation/audit-findings-2026-04-24.md`
- Finding `F1`: canonical schema files omit in-file `$id`, while the loader injects `$id` at runtime
- Finding `F2`: direct command paths work but root `corepack pnpm run schemas:validate` and
  `corepack pnpm run smoke` time out in the audited environment, which breaks the conformance tests
  that shell out through those root commands

## Coverage Gate

- [x] The source audit findings were preserved in a durable repo document
- [x] Stable requirement identifiers and acceptance criteria were defined
- [x] Scope boundaries, constraints, and assumptions were recorded

Coverage: PASS

## Approval Gate

- [x] The run is narrowly scoped to the audited issues
- [x] The requirements are specific enough to support Phase 1 AS-IS analysis and later verification

Approval: PASS
