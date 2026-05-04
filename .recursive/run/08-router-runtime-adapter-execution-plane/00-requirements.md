Run: `/.recursive/run/08-router-runtime-adapter-execution-plane/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/07-router-runtime-protocol-routing/00-requirements.md`
Outputs:
- `/.recursive/run/08-router-runtime-adapter-execution-plane/00-requirements.md`
Scope note: This document defines the stable requirement contract for the adapter-execution-plane run. It maps roadmap `Run 05 - Adapter execution plane` onto repo run `08-router-runtime-adapter-execution-plane`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Define the provider adapter execution contract

Description:
This run must establish the adapter boundary that turns routed decisions into executable provider requests and normalized responses.

Acceptance criteria:
- the provider adapter contract is in scope
- first provider-family implementations are in scope
- the contract keeps protocol semantics separate from provider-specific request and response shapes

### `R2` Implement request building and response normalization

Description:
The adapter layer must be able to take a routed request and reliably shape it for the target provider family and normalize the response back into role-model-owned artifacts.

Acceptance criteria:
- request builder paths and response normalizer paths are in scope
- the run preserves endpoint/account/runtime context needed by downstream observability and host layers
- the run does not rely on host-specific behavior as a substitute for adapter normalization

### `R3` Extract execution-time tool, streaming, error, and usage data

Description:
The adapter execution plane must expose the execution-time hooks needed by later host and observability runs.

Acceptance criteria:
- tool, streaming, error, and usage extraction hooks are in scope
- extracted data is shaped so later observability work can consume it without reopening provider adapter semantics
- adapter failures remain diagnosable from local captures and logs

### `R4` Preserve mandatory local validation and adapter diagnostics

Description:
This run must include the roadmap's required validation and repair loop for the adapter execution path.

Acceptance criteria:
- the run requires the supported local smoke or dev flow to exercise the adapter execution path
- the run requires reading adapter logs, request/response captures, and usage extraction output
- newly introduced adapter execution failures must be repaired before closeout

## Out of Scope

- `OOS1`: host request-serving integration, long-lived lifecycle management, or operator log UI work
- `OOS2`: redefining routing-core, registry, or provider-account contracts instead of consuming them
- `OOS3`: full hardening, multi-tenant operations, or final observability completion work

## Constraints

- Repo run `08-router-runtime-adapter-execution-plane` corresponds to roadmap `Run 05 - Adapter execution plane`.
- This run must consume the protocol-driven routing outputs as prerequisites instead of duplicating routing logic inside adapters.
- The run must reread `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` before later implementation phases start.
- Adapter implementations must remain extensible to more provider families without weakening the canonical protocol contract.

## Assumptions

- The protocol-driven routing run provides stable routed-request inputs and chosen endpoint context for adapter execution.
- A limited initial provider-family set is sufficient for this run as long as the contract and first implementations are real.

## Sequence Integration

- Roadmap slot: `Run 05 - Adapter execution plane`
- Previous repo dependency: `07-router-runtime-protocol-routing`
- Next repo dependency: `09-router-runtime-host-integration`
- Required handoff: provider adapter contract, first provider-family implementations, normalized request/response flow, and tool/streaming/error/usage extraction hooks

## Detailed Requirement Specification

- Add the provider adapter contract and first provider-family implementations.
- Add request builder and response normalizer paths.
- Add tool, streaming, error, and usage extraction hooks.
- Preserve the roadmap-local validation rule:
  - run the local adapter execution path against the supported smoke/dev flow
  - read adapter logs, request/response captures, and usage extraction output
  - repair newly introduced adapter execution failures before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Adapter-contract, normalization, and extraction-hook requirements were defined
- [x] Local validation and log-repair expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to avoid widening into host integration or hardening work

Approval: PASS
