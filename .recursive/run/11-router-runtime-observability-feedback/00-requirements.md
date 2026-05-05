Run: `/.recursive/run/11-router-runtime-observability-feedback/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-05T10:13:22Z`
LockHash: `76f2061830b282112899a66c3f00f9d46f07d91fe9f0b6def706e6b16708b42c`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
Outputs:
- `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
Scope note: This document defines the stable requirement contract for the observability-and-feedback run. It maps roadmap `Run 11 - Observability and feedback loop` onto repo run `11-router-runtime-observability-feedback`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Complete the structured diagnostics and usage-feedback layer

Description:
This run must extend the runtime so routing and execution behavior is observable and can feed later decisions.

Acceptance criteria:
- structured diagnostics are in scope
- usage extraction completion is in scope
- observed-performance updates are in scope and are connected back to the runtime flows that produce them
- OpenTelemetry GenAI export mapping is included without weakening the canonical protocol artifact layer
- the run continues to use the committed `measurement_window`, `endpoint_version`, benchmark/live-request source accounting, and linkage-helper model from run 03, including `validateTraceLinkage`, `validateUsageLinkage`, and `summarizeUsageEvents`

### `R2` Make auth/account and memory quality failures inspectable

Description:
The feedback loop must cover the runtime failure classes that matter for real routing behavior, not just successful execution.

Acceptance criteria:
- auth/account failure tracking is in scope
- memory retrieval quality signals are in scope
- the run preserves the earlier protocol, account, and memory boundaries while making their failures visible
- redaction and capture-policy behavior is made inspectable for memory, traces, and request/response artifacts

### `R3` Expose operator inspection surfaces for emitted artifacts

Description:
This run must provide stable inspection surfaces for the artifacts and diagnostics emitted by earlier runs.

Acceptance criteria:
- operator inspection surfaces for decisions, traces, usage, profile updates, or related diagnostics are in scope
- emitted artifacts are shaped so later hardening and operations work can consume them without reworking their schema
- the run does not depend on implicit log scraping as the only inspection mechanism
- replay-oriented artifacts are retained or intentionally suppressed according to explicit capture and redaction policy

### `R4` Preserve mandatory local validation and observability diagnostics

Description:
This run must include the roadmap's required local validation and repair loop for emitted runtime artifacts.

Acceptance criteria:
- the run requires a local flow that emits decisions, traces, usage, and profile updates
- the run requires reading emitted artifacts plus local observability and error logs
- missing or malformed artifacts introduced during the run must be repaired before closeout

## Out of Scope

- `OOS1`: final resilience, rollback, deployment, or vendor-update procedure work
- `OOS2`: redefining host, adapter, routing, or memory contracts instead of consuming them
- `OOS3`: broad frontend productization beyond the minimum operator inspection surfaces directly needed for this run

## Constraints

- Repo run `11-router-runtime-observability-feedback` corresponds to roadmap `Run 11 - Observability and feedback loop`.
- This run must consume the earlier host integration outputs as prerequisites.
- The run must reread `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` before later implementation phases start.
- Observability outputs must remain compatible with the protocol-grade artifact model already present in the repo baseline.
- The architecture lock doc is the repo-native source for OpenTelemetry interoperability, cache observability, and capture-governance boundaries.
- OpenTelemetry and operator-facing observability must augment, not replace, the committed run-03 artifact contracts.

## Assumptions

- Earlier routing, adapter, host, and memory work emits enough raw signals for this run to complete the feedback loop.
- A minimal operator inspection surface is sufficient for this run as long as the artifact model is stable and locally inspectable.

## Sequence Integration

- Roadmap slot: `Run 11 - Observability and feedback loop`
- Previous repo dependency: `10-router-runtime-host-integration`
- Next repo dependency: `12-router-runtime-hardening-operations`
- Required handoff: structured diagnostics, complete usage extraction, observed-performance updates, failure tracking, memory-quality signals, and operator inspection surfaces

## Detailed Requirement Specification

- Add structured diagnostics and complete usage extraction.
- Add observed-performance updates plus auth/account failure tracking and memory retrieval quality signals.
- Add OpenTelemetry GenAI interoperability and redaction-aware capture behavior.
- Add operator inspection surfaces for the emitted artifacts.
- Preserve the canonical linkage-helper surface from run 03:
  - `validateTraceLinkage`
  - `validateUsageLinkage`
  - `summarizeUsageEvents`
- Preserve the roadmap-local validation rule:
  - run the local flow that emits decisions, traces, usage, and profile updates
  - confirm observability expansion does not replace or invalidate the canonical run-03 artifact contracts
  - read emitted artifacts plus local observability and error logs
  - repair newly introduced missing or malformed artifacts before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Observability, feedback, and inspection-surface requirements were defined
- [x] Local validation and log-repair expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to avoid widening into final hardening work

Approval: PASS
