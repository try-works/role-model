Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation Summary`
Addendum: `18`
Status: `LOCKED`
LockedAt: `2026-07-10T04:30:57Z`
LockHash: `8bc9a31fed625dcd9591987c5527da12834b3d0a417d5c2718b095fed4ed5f9a`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.failure-capture-parity.addendum-18.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02a-to-be-plan.failure-capture-parity-live-failure-examples.addendum-18.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.failure-capture-parity.addendum-18.md`
Scope note: Records the addendum 18 runtime/storage implementation for selected-endpoint failure telemetry parity.

# Addendum 18 Implementation Summary

## TODO

- [x] Extend SQLite failure persistence to accept routed provider context.
- [x] Persist structured failure observations for selected-endpoint failures.
- [x] Capture routed `UpstreamExecutionError` failures before the outer sparse fallback handler.
- [x] Preserve provider, vendor, execution, and adapter identity separation.
- [x] Classify insufficient-balance wording as quota exhaustion.

## Implemented Changes

`/role-model-router/packages/sqlite-memory/src/index.ts` now accepts richer failure inputs for routed provider failures. The failure persistence path can store endpoint, provider, vendor, adapter, routing, execution, payload-size, cost, and structured observation fields instead of collapsing all failures into a sparse pre-execution row.

When a structured failure observation is supplied, SQLite persistence writes both the `runtime_telemetry_records` row and a matching `runtime_observations` row. This gives request detail the same inspection surface for failures that successes already had.

`/role-model-router/apps/runtime-host-bridge/src/index.ts` now persists selected-endpoint provider failures inside the routed execution path before rethrowing the original upstream error. It marks the error as already persisted so the outer Chat Completions failure handler does not overwrite the routed failure with `routing.failed.pre-execution`.

The persisted failure context includes selected endpoint, provider account, provider id/family, vendor id, execution family, adapter family, routing decision id, eligible endpoints, source client, retry/reroute counts, failed-attempt receipts, payload sizes, and sanitized upstream error detail where available.

Generic quota wording now treats `Insufficient Balance` / `insufficient_balance` as quota exhaustion. This is intentionally wording-based and provider-agnostic, not a DeepSeek-specific branch.

## Historical Rows

Historical screenshot rows such as `req-fff376e7-e495-4fd1-89f7-08b46d2da9bb`, `req-87d757c4-83f0-4880-8410-abdcd6cbc619`, `req-a3aab38a-5f60-4cef-bcdb-c190b36cf9df`, `req-e68a8775-e827-48dd-89c8-8cbd2bf238be`, and `req-acccf127-b91e-463c-93c7-6de3a55fe592` remain sparse pre-fix artifacts because selected endpoint context was not stored on those rows before this addendum.

## TDD Compliance

RED evidence:

- `evidence/logs/addendum-18/red/runtime-long-timeout-attribution.red.log`

GREEN evidence:

- `evidence/logs/addendum-18/green/sqlite-failure-capture.green.log`
- `evidence/logs/addendum-18/green/sqlite-memory-build.green.log`
- `evidence/logs/addendum-18/green/runtime-failure-focused.green.log`
- `evidence/logs/addendum-18/green/runtime-long-timeout-attribution.green.log`
- `evidence/logs/addendum-18/green/runtime-host-bridge-build.green.log`
- `evidence/logs/addendum-18/green/runtime-test-critical.green.log`
- `evidence/logs/addendum-18/green/runtime-package-sea.green.log`

TDD Compliance: PASS

## Worktree Diff Audit

- Product changes are limited to Role-Model runtime host bridge failure capture and SQLite memory persistence.
- No upstream Pi or Craft source was modified.
- No provider-specific failure branch was introduced.
- Historical telemetry rows are not backfilled because the old rows did not contain enough stored endpoint context.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: reviewed the addendum 18 plan, implementation diff, RED/GREEN logs, historical DB inspection, runtime packaging log, and final runtime health evidence.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: no delegated action record to refresh.
- Repair Performed After Verification: invalid controlled live-failure proof using an unconfigured temporary provider was not accepted as evidence; automated selected-endpoint failure tests remain the valid failure-capture proof.

## Coverage Gate

- [x] Selected-endpoint failures persist endpoint/provider/vendor/adapter context.
- [x] Structured failure observations are persisted for request detail.
- [x] Outer sparse failure handler no longer overwrites routed failures.
- [x] Insufficient-balance wording classifies as quota exhaustion.
- [x] Historical sparse rows are explicitly documented as pre-fix artifacts.

Coverage: PASS

## Approval Gate

- [x] Implementation follows the locked addendum 18 plan and 02a amendment.
- [x] Implementation is provider-agnostic and consumer-agnostic.
- [x] Implementation is supported by strict TDD evidence.

Approval: PASS

Audit: PASS
