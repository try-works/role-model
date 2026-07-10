Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan Amendment`
Addendum: `18`
Status: `LOCKED`
LockedAt: `2026-07-10T02:58:52Z`
LockHash: `46f2a160b149db83603083955fd429d30d5f5ab49c1db20264327fc78ab48ab5`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.failure-capture-parity.addendum-18.md`
- User-supplied telemetry screenshots showing failed rows around `2026-07-10 10:07 AM`
- Live runtime DB inspection evidence: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-18/live/pre-fix-live-failure-record-inspection.log`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02a-to-be-plan.failure-capture-parity-live-failure-examples.addendum-18.md`
Scope note: This is an amendment to locked addendum 18. It does not supersede the locked plan; it adds concrete live failure examples and acceptance criteria for failure capture parity.

# Addendum 18 Plan Amendment: Live Failure Examples

## TODO

- [x] Treat the additional live failures as explicit acceptance cases.
- [x] Preserve locked addendum-18 immutability by adding this amendment instead of editing the locked plan.
- [x] Require historical inspection of affected rows.
- [x] Require post-fix live verification that future failures no longer collapse to anonymous pre-execution rows.

## Additional Observed Failure Examples

The user supplied additional live telemetry examples where routed requests failed after a long provider execution window but were displayed as anonymous pre-execution failures:

- `req-fff376e7-e495-4fd1-89f7-08b46d2da9bb`: `routing.failed.pre-execution`, `400 execution_failed`, about `300003 ms`, `0 tokens`.
- `req-87d757c4-83f0-4880-8410-abdcd6cbc619`: `routing.failed.pre-execution`, `400 execution_failed`, about `270537 ms`, `0 tokens`.
- Earlier balance-related examples include `req-a3aab38a-5f60-4cef-bcdb-c190b36cf9df`, `req-e68a8775-e827-48dd-89c8-8cbd2bf238be`, and `req-acccf127-b91e-463c-93c7-6de3a55fe592`, displayed as `routing.failed.pre-execution`, `402 execution_failed`, `0 tokens`.

The same telemetry window also showed successful adjacent rows for both:

- `openai.personal.openai-codex-subscription.global.gpt-5.4`
- `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`

This makes the issue specifically about failure attribution and inspection parity, not about alias routing being globally unavailable.

## Amended Required Behavior

R18.9 Historical failure rows may remain sparse because the selected endpoint was not persisted before this fix. The implementation is not required to backfill unknown endpoint context that was never stored.

R18.10 Future routed provider failures, including long-running provider timeouts, upstream quota failures, client-aborted provider executions, and provider `4xx`/`5xx` responses, must persist the last selected endpoint context before returning the error to the caller.

R18.11 A failure row must only use `routing.failed.pre-execution` when no endpoint was selected. Once routing selected an endpoint, failure telemetry must use that endpoint ID even if the caller ultimately receives a generic OpenAI-compatible error response.

R18.12 Request-detail inspection for future failures must expose enough structured data to answer:

- which alias/model was requested
- which endpoint was selected
- which provider and provider account were involved
- which execution adapter was used
- whether retry/reroute was attempted
- whether the failure was retryable or fallback-eligible
- what sanitized upstream error class/status/preview was observed

R18.13 The telemetry UI and API must continue to show adjacent successes and failures consistently. A success row and a failure row for the same selected endpoint should differ in status/error/finish fields, not in whether endpoint identity is present.

## Amended TDD Plan

Strict TDD remains required.

Additional RED assertion for runtime failure capture:

- Add or extend a runtime-host test that simulates a long-running selected endpoint failure and asserts the persisted row uses the selected endpoint rather than `routing.failed.pre-execution`.
- The test must also assert structured request detail exists for the failure row.

Additional GREEN implementation:

- Ensure all routed `UpstreamExecutionError` exits call the routed failure persistence path before the outer generic failure handler can write a sparse fallback row.
- Ensure the generic outer handler skips errors already marked as persisted.

## Amended Live Verification Plan

Historical inspection:

- Inspect the live SQLite database for the user-supplied failure request IDs.
- Record whether the old rows contain selected endpoint context.
- If old rows are sparse, document that they are pre-fix artifacts and cannot be retroactively enriched without stored endpoint data.

Post-fix verification:

- Rebuild and relaunch the runtime on `127.0.0.1:3456`.
- Send successful Pi CLI and Craft client requests through `difficulty.remote-only` and confirm successful routing remains intact.
- Induce a controlled provider failure after endpoint selection, without depending on a real account balance outage.
- Inspect `/api/role-model/telemetry/requests` and `/api/role-model/requests/<requestId>`.
- Confirm the new failure row uses the selected endpoint ID, not `routing.failed.pre-execution`.
- Confirm the new request detail includes structured failure observation and execution semantics.

## Audit

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: no subagent tool is currently loaded in this turn.
Delegation Decision Basis: amendment is narrow and grounded in user-provided live telemetry plus local runtime DB/code inspection.
Delegation Override Reason: none.

### Self-Audit Findings

- The amendment preserves the locked addendum-18 plan rather than mutating it.
- The amendment converts the new screenshots into verifiable acceptance cases.
- The amendment distinguishes non-backfillable historical rows from future runtime behavior.
- The amendment remains provider-agnostic and consumer-agnostic.
- The amendment keeps implementation scope in Role-Model runtime/storage code.

Audit: PASS

## Coverage Gate

- [x] Covers the new long-running `400 execution_failed` examples.
- [x] Covers earlier `402 execution_failed` balance examples.
- [x] Covers historical inspection and future post-fix verification.
- [x] Covers strict TDD and rebuilt-runtime verification.

Coverage: PASS

## Approval Gate

- [x] Amendment is specific and verifiable.
- [x] Amendment is consistent with locked addendum 18.
- [x] Amendment is systematic and future-proof for provider execution failures.
- [x] Amendment is ready for implementation/verification.

Approval: PASS
