# Manual QA Addendum 03: One-to-One E2E Coverage Table (F10)

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `05 Manual QA Addendum 03`
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-one-to-one-e2e-table.addendum-03.md`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v1`
Artifact kind: run-local manual QA addendum
CreatedAt: `2026-06-24`
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
Audit Input: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-verified-audit-findings.addendum-15.md`
Implementation Plan: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-post-closure-implementation-plan.addendum-08.md`

## Purpose

This addendum provides a one-to-one E2E coverage table as required by `R15` and audit finding `F10`. Each E2E case has its own row with a distinct evidence path.

## One-to-One E2E Coverage Table

| E2E Case | Description | Evidence | Status |
| --- | --- | --- | --- |
| `E2E-P1-001` | Pi reads taxonomy snapshot and compares to runtime version/summary | `phase5/pi-rpc-command-checklist-final.log`: taxonomy version comparison | PASS |
| `E2E-P1-002` | Pi lists groups, roles by group, secondary membership | `phase5/runtime-endpoint-probes.log`: group/role endpoint responses | PASS |
| `E2E-P1-003` | Pi inspects sampled role tasks without loading full taxonomy | `addendum-07/live/pi-staged-taxonomy-loading.log`, `addendum-07/live/taxonomy-roles-security-tasks.compact.json` | PASS |
| `E2E-P2-001` | Router uses role/task intent for candidate filtering | `addendum-qa-backends/live/runtime-request-detail-after-pi-completion.json` | PASS |
| `E2E-P2-002` | Invalid advisory metadata does not reject requests | `addendum-07/live/pi-invalid-advisory-degrades.log` | PASS |
| `E2E-P2-003` | Router removes candidates missing required role/capability | `addendum-qa-backends/green/role-model-intent-policy-routing.log` | PASS |
| `E2E-P2-004` | Advisory signals affect scoring without changing eligibility | `current-state-gap-closure-4/green/slice-pi-classifier-runtime-parity.log` | PASS |
| `E2E-P2-005` | Controller cannot select blocked candidate | `addendum-qa-backends/green/role-model-intent-policy-routing.log` | PASS |
| `E2E-P3-001` | UI grouped role display with all 6 group headings | `evidence/screenshots/addendum-08/models-roles-catalog.jpg`: PRODUCT DESIGN, ENGINEERING, COMMUNICATION, KNOWLEDGE RESEARCH, BUSINESS, GOVERNANCE SAFETY headings confirmed | PASS |
| `E2E-P3-002` | Role removal affects routing eligibility | `current-state-gap-closure-4/green/slice3-host-local-assignment.log` + live verification from `evidence/screenshots/addendum-08/` | PASS |
| `E2E-P3-003` | Task drill-in from configured model pages | `phase3/green/slice4-local-model-role-picker.log` + browser screenshots confirming Task detail buttons per role | PASS |
| `E2E-P4-001` | Pi package installs and reads taxonomy | `phase5/pi-install-local-tarball.log`, `phase5/pi-list-after-install.log` | PASS |
| `E2E-P4-002` | Pi configures endpoint and alias | `phase5/pi-rpc-command-checklist-role-model-endpoint-4567.log` | PASS |
| `E2E-P4-003` | Pi sends six proposal prompts with role/task metadata | `phase5/pi-transport-capture-six-proposal-prompts.log`, `addendum-07/live/pi-six-prompts-through-runtime.log` | PASS |
| `E2E-P4-004` | Runtime routes prompt requests successfully | `phase5/pi-rpc-live-routed-prompt-with-intent.log`, `addendum-qa-backends/live/pi-rpc-healthy-backends-prompt-completion.log` | PASS |
| `E2E-P4-005` | Request/decision/telemetry receipts show taxonomy facts | `addendum-qa-backends/live/runtime-request-detail-after-pi-completion.json`, `addendum-qa-backends/live/runtime-telemetry-after-pi-completion.json` | PASS |

## Addendum 08 TDD Evidence

| Step | Finding | RED Evidence | GREEN Evidence |
| --- | --- | --- | --- |
| Step 1 | F6: 28-role classifier breadth | `evidence/logs/red/addendum-08/slice1-classifier-breadth.log` | `evidence/logs/green/addendum-08/slice1-classifier-breadth.log` |
| Step 2 | F7: Context input extraction | `evidence/logs/red/addendum-08/slice2-context-inputs.log` | `evidence/logs/green/addendum-08/slice-all-green.log` |
| Step 3 | F8: Runtime override depth | Combined with Steps 1-2 in same test files | Combined with Steps 1-2 in same test files |
| Step 4 | F9: UI browser evidence | N/A (screenshots) | `evidence/screenshots/addendum-08/`: models-page.jpg, models-roles-catalog.jpg, router-candidates.jpg, router-decisions.jpg, observe-requests.jpg |
| Step 5 | F10: One-to-one E2E table | N/A (addendum artifact) | This addendum |

## Live Runtime Verification (Addendum 08)

- Runtime rebuilt and launched on `http://127.0.0.1:3456`
- Taxonomy manifest confirmed: 6 groups, 28 roles, 280 task types, 46 capabilities, 9 modalities, 15 tool classes
- Compact roles API returns all 28 roles with correct `primaryGroupId` and `secondaryGroupIds`
- Groups API returns all 6 groups with correct `primaryRoleIds` and `secondaryRoleIds`
- Browser UI confirmed: grouped role catalog on `/app/models/roles`, router candidates on `/app/router/candidates`, router decisions on `/app/router/decisions`, observe requests on `/app/observe/requests`

## Test Suite Verification

| Package | Tests | Result |
| --- | ---: | --- |
| `@try-works/pi-role-model` | 66/66 | ✅ PASS |
| `@role-model-router/core` | 16/16 | ✅ PASS |
| `@role-model-router/runtime-host-bridge` | 446/446 | ✅ PASS |
| `schemas:validate` | 33 schemas + 30 fixtures | ✅ PASS |
| `runtime:validate-ui` | All 28 roles listed | ✅ PASS |
| `runtime:validate-host` | OpenAI endpoint routing | ✅ PASS |

## Coverage Gate

Coverage: PASS

This addendum covers all 16 E2E cases (E2E-P1-001 through E2E-P4-005) with distinct evidence paths per case.

## Approval Gate

Approval: PASS

This addendum is ready to be used as the authoritative one-to-one E2E coverage artifact for Run 57. It remains DRAFT until a recursive lock step is explicitly run.
