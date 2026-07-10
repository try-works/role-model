Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `18`
Status: `LOCKED`
LockedAt: `2026-07-10T04:30:58Z`
LockHash: `ffaa735214f05a978ce868ba70894f310a494ba25343d2e18f6838baf5dedb84`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.failure-capture-parity.addendum-18.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-18/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.failure-capture-parity.addendum-18.md`
Scope note: Records addendum 18 automated verification and known live-proof caveats.

# Addendum 18 Test Summary

## TODO

- [x] Record storage-level failure-capture tests.
- [x] Record runtime selected-endpoint failure-capture tests.
- [x] Record quota wording classification tests.
- [x] Record builds, runtime critical tests, and package rebuild.
- [x] Record live-proof caveats truthfully.

## Automated Verification

Storage-level verification:

- `evidence/logs/addendum-18/green/sqlite-failure-capture.green.log`
- `evidence/logs/addendum-18/green/sqlite-memory-build.green.log`

Runtime failure-capture verification:

- `evidence/logs/addendum-18/green/runtime-failure-focused.green.log`
- `evidence/logs/addendum-18/green/runtime-long-timeout-attribution.green.log`
- `evidence/logs/addendum-18/red/runtime-long-timeout-attribution.red.log`

Build and broader runtime verification:

- `evidence/logs/addendum-18/green/runtime-host-bridge-build.green.log`
- `evidence/logs/addendum-18/green/runtime-test-critical.green.log`
- `evidence/logs/addendum-18/green/runtime-package-sea.green.log`

The rebuilt runtime package succeeded after the old process holding `role-model-runtime.exe` was stopped. Packaged executable SHA-256 in the package log: `ff8d132be1b672203aec31b56499022ef36ec503645456e38f2e5763d1a3408d`.

## Historical Inspection Evidence

- `evidence/logs/addendum-18/live/pre-fix-live-failure-record-inspection.log`

The inspected historical rows were sparse pre-fix telemetry. They did not include enough persisted endpoint context to backfill truthfully.

## Live Runtime Evidence

- `evidence/logs/addendum-18/live/runtime-health-final-closeout.json`
- `evidence/logs/addendum-18/live/telemetry-requests-limit5.json`
- `evidence/logs/addendum-18/live/recent-db-after-pi-timeout.json`
- `evidence/logs/addendum-18/live/recent-db-after-pi-approve-timeout.json`

The runtime is healthy on `127.0.0.1:3456` and current successful rows preserve provider/vendor/adapter separation for both OpenAI Codex Subscription and DeepSeek paths.

## Live Failure Proof Caveat

`evidence/logs/addendum-18/live/controlled-failure-proof.log` is intentionally not accepted as a successful provider-failure proof because the temporary endpoint failed with `VENDOR_NOT_CONFIGURED` before provider execution. This validates the plan's distinction between pre-selection/pre-execution failures and selected provider execution failures, but it is not counted as selected-endpoint failure-capture acceptance evidence.

The accepted selected-endpoint failure-capture evidence for addendum 18 is the storage/runtime TDD suite listed above.

## Coverage Gate

- [x] SQLite failure persistence tests passed.
- [x] Runtime selected-endpoint failure tests passed.
- [x] Quota/balance classification is covered.
- [x] Runtime host bridge build, critical tests, and packaging passed.
- [x] Invalid live proof is explicitly excluded rather than overstated.

Coverage: PASS

## Approval Gate

- [x] Automated verification supports the implementation summary.
- [x] Live runtime is healthy after rebuild.
- [x] Remaining live-proof caveat is documented.

Approval: PASS

Audit: PASS
