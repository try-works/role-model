Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `17`
Status: `LOCKED`
LockedAt: `2026-07-10T01:22:48Z`
LockHash: `dd7d742bc8d082b51e2153216adf76b700ca5552d75009b301cb411f6ae06508`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-parameter-sanitization.addendum-17.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.codex-subscription-parameter-sanitization.addendum-17.md`
Scope note: This addendum implements the Codex Subscription selected-backend parameter policy. It changes Role-Model runtime code only; it does not modify upstream Pi or Craft source and does not add consumer-specific branches.

# Addendum 17 Implementation Summary

## TODO

- [x] Add RED tests for Codex Subscription Chat Completions optional-parameter sanitization.
- [x] Add RED tests for Codex Subscription Responses optional-parameter sanitization.
- [x] Add RED tests for canonical `difficulty.remote-only` alias parity after Codex endpoint selection.
- [x] Add RED/GREEN coverage for request-detail diagnostics preserving the original Responses ingress surface.
- [x] Implement selected-adapter parameter policy without routing eligibility changes.
- [x] Persist structured parameter sanitization receipts in execution semantics.
- [x] Preserve provider/vendor/adapter identity separation.
- [x] Verify no Pi or Craft source changes were needed for this addendum.

## Implemented Changes

`/role-model-router/apps/runtime-host-bridge/src/index.ts` now treats OpenAI-compatible ingress fields and the selected backend wire payload as separate contracts. The Codex Subscription execution path records the source surface as either `openai.chat.completions` or `openai.responses`, targets `chatgpt.codex.responses`, and emits structured `parameterSanitization` decisions for non-forwarded fields.

The Codex Subscription request builder now drops unsupported optional backend fields with receipts instead of forwarding them to `https://chatgpt.com/backend-api/codex/responses`:

- `temperature`
- Chat Completions `max_tokens`
- Chat Completions `max_completion_tokens`
- Responses `max_output_tokens`

The same builder still preserves the supported Codex backend body shape:

- `model`
- `store: false`
- `stream: true`
- `input`
- `include: ["reasoning.encrypted_content"]`
- existing tools, reasoning, and prompt cache fields when supported by the current Codex adapter path

`/role-model-router/packages/runtime-observability/src/index.ts` now carries `executionSemantics.parameterSanitization` through the runtime observation bundle so request detail can show the selected adapter's policy decisions without storing sensitive raw parameter values.

The implementation also fixes a diagnostics regression for `/v1/responses` ingress that is internally normalized before execution. Request detail now preserves the original Responses source surface and field names (`temperature`, `max_output_tokens`) instead of incorrectly reporting Chat Completions semantics.

## TDD Compliance

RED evidence:

- `evidence/logs/addendum-17/red/codex-chat-parameters.red.log`
- `evidence/logs/addendum-17/red/codex-responses-parameters.red.log`
- `evidence/logs/addendum-17/red/codex-alias-parameter-policy.red.log`
- `evidence/logs/addendum-17/red/codex-responses-ingress-observation-policy.red.log`

GREEN evidence:

- `evidence/logs/addendum-17/green/codex-chat-parameters.green.log`
- `evidence/logs/addendum-17/green/codex-responses-parameters.green.log`
- `evidence/logs/addendum-17/green/codex-alias-parameter-policy.green.log`
- `evidence/logs/addendum-17/green/codex-responses-ingress-observation-policy.green.log`
- `evidence/logs/addendum-17/green/codex-subscription-focused.green.log`
- `evidence/logs/addendum-17/green/codex-subscription-focused.rerun.green.log`
- `evidence/logs/addendum-17/green/runtime-host-bridge-tsc.initial.log`
- `evidence/logs/addendum-17/green/runtime-observability-test.green.log`

TDD Compliance: PASS

## Requirement Completion Status

- R0 | Status: implemented | Changed Files: runtime-host-bridge and runtime-observability policy/receipt surfaces. | Scope Decision: selected-backend parameter translation, not routing preference. | Addendum: addendum-17.
- R1 | Status: implemented | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`. | Implementation Evidence: strict RED/GREEN logs above. | Addendum: addendum-17.
- R2 | Status: implemented | Changed Files: no upstream Pi or Craft source changed. | Verification Evidence: real Pi CLI and real Craft client evidence in addendum-17 Phase 5. | Addendum: addendum-17.
- R3 | Status: implemented | Scope Decision: provider identity remains `openai` or `deepseek`; vendor and adapter remain separate diagnostics. | Addendum: addendum-17.
- R4 | Status: implemented | Scope Decision: Codex Subscription remains an execution adapter after endpoint selection; no Codex app-server execution was introduced. | Addendum: addendum-17.
- R8 | Status: implemented | Changed Files: runtime observation bundle now records parameter sanitization receipts. | Verification Evidence: request-detail snapshots in addendum-17 live evidence. | Addendum: addendum-17.
- R10 | Status: implemented | Verification Evidence: rebuilt runtime, direct probes, Pi CLI, Craft client, telemetry, and request-detail snapshots. | Addendum: addendum-17.
- R11 | Status: implemented | Verification Evidence: focused RED/GREEN, typecheck, runtime critical tests, and vendor validation. | Addendum: addendum-17.
- R12 | Status: implemented | Scope Decision: this addendum records implementation/test/QA evidence in the run folder; no new durable memory change is required beyond the existing run-62 routing memory updates. | Addendum: addendum-17.

## Worktree Diff Audit

- Product code changed in Role-Model runtime and observability packages only for this addendum.
- Tests changed in the Role-Model runtime-host-bridge test suite.
- No upstream Pi AI source was modified.
- No upstream Craft source was modified.
- No invented aliases were added; tests and live verification use canonical `difficulty.remote-only`.
- Routing eligibility remains separate from streaming support and selected-backend parameter policy.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: reviewed the addendum-17 plan, source diff, RED/GREEN logs, request-detail snapshots, Pi CLI results, Craft results, runtime process isolation, and vendor-validation exit.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: no delegated action record to refresh.
- Repair Performed After Verification: copied post-fix logs from an accidental nested evidence path into the canonical run evidence folder and removed duplicate byproduct folders after preserving final Craft transcripts.

## Coverage Gate

- [x] Chat Completions optional parameters are sanitized for the Codex Subscription backend.
- [x] Responses optional parameters are sanitized for the Codex Subscription backend.
- [x] Exact model and alias-routed Codex-selected paths use the same policy.
- [x] Request detail records source surface, target surface, action, provider, vendor, and adapter facts.
- [x] Provider identity is not conflated with vendor or execution path identity.
- [x] No downstream consumer branch was introduced.
- [x] Strict TDD evidence exists before implementation.

Coverage: PASS

## Approval Gate

- [x] Implementation follows the locked addendum-17 plan.
- [x] Implementation is adapter-surface based and extensible.
- [x] Implementation is verifiable through tests and rebuilt runtime evidence.
- [x] No known addendum-17 blocker remains.

Approval: PASS
