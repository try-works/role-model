Run: `/.recursive/run/09-router-runtime-host-integration/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/08-router-runtime-adapter-execution-plane/00-requirements.md`
Outputs:
- `/.recursive/run/09-router-runtime-host-integration/00-requirements.md`
Scope note: This document defines the stable requirement contract for the host-integration run. It maps roadmap `Run 06 - Host integration` onto repo run `09-router-runtime-host-integration`.

## TODO

- [x] Normalize the roadmap run into the recursive requirements shape
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record sequence integration, out-of-scope boundaries, constraints, and assumptions
- [x] Preserve the roadmap-local validation and log-repair rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Integrate the routed execution plane into a real host path

Description:
This run must connect the earlier routing and adapter layers to a concrete local host integration path.

Acceptance criteria:
- `llama-swap`-based or native host integration is in scope
- the request-serving path is in scope
- host integration remains downstream of protocol-driven routing and provider adapters rather than replacing them

### `R2` Add lifecycle, concurrency, and artifact-emission hooks at the host layer

Description:
The host integration must support runtime control and artifact emission needed by later operational and observability work.

Acceptance criteria:
- concurrency and lifecycle control integration are in scope
- artifact emission hooks are in scope
- the run preserves the host-versus-protocol boundary defined by the earlier architecture-lock run

### `R3` Expose a local operator log and capture access path

Description:
This run must make host-level failures inspectable locally rather than hiding them behind opaque proxy behavior.

Acceptance criteria:
- a local operator log or capture access path is in scope
- host request captures and stream logs are available to later observability and hardening work
- the run does not rely on external hosted infrastructure to inspect host behavior

### `R4` Preserve mandatory local validation and host diagnostics

Description:
This run must include the roadmap's required validation and repair loop for the local host path.

Acceptance criteria:
- the run requires the host to be exercised locally through the changed request path
- the run requires reading host logs, stream logs, request captures, and local runtime errors
- host integration regressions introduced during the run must be repaired before closeout

## Out of Scope

- `OOS1`: final observability completion, hardening/operations closeout, or broad UI product work
- `OOS2`: redefining routing, adapter, provider-account, or memory contracts instead of consuming them
- `OOS3`: vendor-fork divergence that turns `llama-swap` into the router semantics source of truth

## Constraints

- Repo run `09-router-runtime-host-integration` corresponds to roadmap `Run 06 - Host integration`.
- This run must consume the earlier adapter execution outputs as prerequisites.
- The run must reread `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` before later implementation phases start.
- If `llama-swap` is used, it must remain an execution-plane host integration and not a replacement for protocol-governed routing logic.

## Assumptions

- The adapter-execution run provides a stable executable request path that can be hosted locally.
- A host-local request/capture/log path can be established without first completing the final hardening run.

## Sequence Integration

- Roadmap slot: `Run 06 - Host integration`
- Previous repo dependency: `08-router-runtime-adapter-execution-plane`
- Next repo dependency: `10-router-runtime-observability-feedback`
- Required handoff: request-serving host path, lifecycle/concurrency integration, artifact-emission hooks, and local operator log/capture access

## Detailed Requirement Specification

- Integrate the routed execution plane into a `llama-swap`-based or native host path.
- Add request serving, lifecycle/concurrency control, and artifact-emission hooks.
- Add a local operator log/capture access path.
- Preserve the roadmap-local validation rule:
  - run the host locally and exercise the changed request path
  - read host logs, stream logs, request captures, and local runtime errors
  - repair newly introduced host integration regressions before the run is considered complete

## Coverage Gate

- [x] The roadmap run was mapped to a concrete repo run id
- [x] Host-path, lifecycle, and log/capture requirements were defined
- [x] Local validation and log-repair expectations were preserved

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive Phase 1 AS-IS work later
- [x] Scope boundaries are narrow enough to avoid widening into final observability or hardening work

Approval: PASS
