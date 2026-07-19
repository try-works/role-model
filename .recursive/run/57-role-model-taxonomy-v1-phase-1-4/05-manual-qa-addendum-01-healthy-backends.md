Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `05 Manual QA Addendum 01`
Status: `LOCKED`
LockedAt: `2026-06-23T13:41:21Z`
LockHash: `c741594cb7b30398dec429301c3973963d71c1c0c9f7c4ce1a01f1154f5ded4c`
CreatedAt: `2026-06-23T13:40:00Z`
Inputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md`
Scope note: Replaces the prior QA-runtime backend limitation with healthy managed backend and real Pi completion evidence for run 57 Phase 5.

# Manual QA Addendum 01: Healthy QA Backends

## TODO

- [x] Reproduce the QA backend limitation against the live runtime
- [x] Add TDD coverage for managed QA backends and canonical capabilities
- [x] Repair QA backend startup, role intent policy, role bindings, and QA model capabilities
- [x] Restart the rebuilt runtime with managed local and remote QA vendors
- [x] Drive Pi to install the worktree package, configure endpoint and alias, and send a real prompt
- [x] Verify request, routing decision, and telemetry ledgers record role/task routing signals
- [x] Re-run affected tests and builds

## Result

The earlier `PASS_WITH_QA_RUNTIME_LIMITATION` is superseded for the backend portion of Phase 5 QA.

Updated result: `PASS`

The QA runtime now starts managed local and remote mock vendor backends, advertises canonical taxonomy capabilities for those QA models, accepts real Pi traffic, applies `role_model.intent` as runtime role/task policy, routes to a live backend, returns a completion, and records request/decision/telemetry evidence with role/task routing signals.

## Defects Closed

| Defect | RED evidence | Repair | GREEN evidence |
| --- | --- | --- | --- |
| QA runtime backends were disabled/degraded, preventing full live Pi completion QA | `evidence/logs/addendum-qa-backends/red/qa-backends-start-for-qa.log` | `scripts/start-for-qa.ts` now starts managed local and remote mock vendors with `runtimeVendorStartup: "enabled"` and skips placeholder remote control-plane endpoints by default | `evidence/logs/addendum-qa-backends/green/qa-backends-and-placeholder-rerun.log` |
| `role_model.intent` was parsed but not consistently applied as runtime role/task policy | `evidence/logs/addendum-qa-backends/red/role-model-intent-policy-routing.log` | Runtime mapping resolves valid intent role/task into requested role policy, task type, and capability policy | `evidence/logs/addendum-qa-backends/green/role-model-intent-policy-routing.log` |
| Managed QA local model had role bindings but not enough canonical capabilities for taxonomy-routed tasks like `coder.review` or `security.audit` | `evidence/logs/addendum-qa-backends/red/qa-backend-canonical-capabilities.log` | Unified runtime config now supports per-model `capabilities`; QA local and remote models advertise the canonical capability set | `evidence/logs/addendum-qa-backends/green/qa-backends-capabilities-intent-focused-rerun.log`, `evidence/logs/addendum-qa-backends/green/runtime-host-bridge-build-after-qa-capabilities.log` |

## Live Runtime QA

Runtime endpoint: `http://127.0.0.1:4567`

| Check | Evidence | Result |
| --- | --- | --- |
| Restarted QA runtime with managed vendors | `evidence/logs/addendum-qa-backends/live/runtime-qa-backends-after-capabilities-stdout.log`, `runtime-qa-backends-after-capabilities-stderr.log`, `runtime-qa-backends-after-capabilities-pid.txt` | PASS |
| `/healthz` reports healthy runtime and vendors | `evidence/logs/addendum-qa-backends/live/runtime-health-after-capabilities-restart.json` | PASS: local llama-swap and remote LiteLLM mock vendors healthy |
| Direct OpenAI-compatible request with contract-shaped `role_model.intent` completes | `evidence/logs/addendum-qa-backends/live/direct-control-completion-with-contract-intent-after-capabilities.json` | PASS: returned `local llama summary` |
| Direct request telemetry records role routing | `evidence/logs/addendum-qa-backends/live/runtime-telemetry-after-direct-contract-intent-after-capabilities.json` | PASS: latest direct row has `requestedRoleId=coder`, `roleIds=[coder]`, status `success` |
| Direct request detail records runtime policy application | `evidence/logs/addendum-qa-backends/live/runtime-request-detail-after-direct-contract-intent-after-capabilities.json` | PASS: role/task policy affects routing and execution diagnostics |

## Pi-Driven QA

| Check | Evidence | Result |
| --- | --- | --- |
| Installed worktree package into local Pi | `evidence/logs/addendum-qa-backends/live/pi-install-local-package-after-capabilities.log` | PASS |
| Drove Pi `/role-model` setup/status/doctor/alias commands over RPC | `evidence/logs/addendum-qa-backends/live/pi-rpc-command-checklist-after-capabilities.log` | PASS |
| Selected Role-Model alias and sent a real Pi prompt | `evidence/logs/addendum-qa-backends/live/pi-rpc-prompt-completion-after-capabilities.log` | PASS: Pi response text was `local llama summary` |
| Runtime request ledger after Pi prompt | `evidence/logs/addendum-qa-backends/live/runtime-requests-after-pi-completion-after-capabilities.json` | PASS |
| Runtime decision ledger after Pi prompt | `evidence/logs/addendum-qa-backends/live/runtime-decisions-after-pi-completion-after-capabilities.json` | PASS: selected `llama-swap.local.lfm2-5-1-2b-instruct` |
| Runtime telemetry after Pi prompt | `evidence/logs/addendum-qa-backends/live/runtime-telemetry-after-pi-completion-after-capabilities.json` | PASS: latest row has `requestedRoleId=security`, `roleIds=[security]`, status `success` |
| Runtime request detail after Pi prompt | `evidence/logs/addendum-qa-backends/live/runtime-request-detail-after-pi-completion-after-capabilities.json` | PASS: `ROLE_POLICY_APPLIED`, `TASK_POLICY_APPLIED`, `requestedRoleId=security`, required capability `security.analysis`, live endpoint sample, and cost-savings telemetry recorded |

## Final Automated Checks

| Check | Evidence | Result |
| --- | --- | --- |
| `@try-works/pi-role-model` tests | `evidence/logs/addendum-qa-backends/green/pi-role-model-test-after-live-qa.log` | PASS: 11 files / 41 tests |
| `@role-model-router/core` tests | `evidence/logs/addendum-qa-backends/green/core-test-after-live-qa.log` | PASS: 4 files / 10 tests |
| Runtime-host focused tests | `evidence/logs/addendum-qa-backends/green/runtime-host-bridge-focused-after-live-qa.log` | PASS: 16 tests |
| Runtime-host build | `evidence/logs/addendum-qa-backends/green/runtime-host-bridge-build-after-qa-capabilities.log` | PASS |

## Acceptance

Phase 5 QA now includes healthy managed QA backends and real local Pi verification. Pi can install the local `pi-role-model` package, configure the runtime endpoint, inspect and select aliases, send a prompt through `role-model/default.decision-only`, inject taxonomy intent, and drive the runtime to route the request using role/task policy into a successful live backend completion.

The benchmark and taxonomy telemetry rollup work remains deferred to the separate run 58 draft scope as planned.

## Coverage Gate

Coverage: PASS

Rationale: The addendum covers the full backend gap: TDD red/green evidence, healthy local and remote managed vendors, direct runtime role-intent execution, real Pi package install/configure/alias/prompt execution, runtime request/decision/telemetry inspection, and affected automated tests.

## Approval Gate

Approval: PASS

Rationale: The user explicitly required the QA backends to work so the specified Phase 5 QA could be fully performed. The addendum proves that capability and supersedes the earlier backend-limited QA result.
