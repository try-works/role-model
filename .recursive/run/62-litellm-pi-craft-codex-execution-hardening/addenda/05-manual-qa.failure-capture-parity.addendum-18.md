Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `18`
Status: `LOCKED`
LockedAt: `2026-07-10T04:30:59Z`
LockHash: `566a9c254d8253b2f0231f8d104fdb1e02385a0fde03d80316162e936bab466c`
Workflow version: `recursive-mode-audit-v1`
QA Execution Mode: `hybrid`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.failure-capture-parity.addendum-18.md`
- User manual-QA sign-off in chat on 2026-07-10: "this seems to be working well according to my manual qa"
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-18/live/runtime-health-final-closeout.json`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.failure-capture-parity.addendum-18.md`
Scope note: Records addendum 18 hybrid manual QA and final runtime health evidence.

# Addendum 18 Manual QA

## TODO

- [x] Record final rebuilt runtime health on `127.0.0.1:3456`.
- [x] Record user manual-QA sign-off.
- [x] Record what was and was not live-proven for failure capture.
- [x] Confirm no Pi or Craft source changes were introduced.

## Rebuilt Runtime

Final closeout runtime health evidence:

- `evidence/logs/addendum-18/live/runtime-health-final-closeout.json`

Runtime state:

- URL: `http://127.0.0.1:3456`
- PID: `33808`
- Executable: `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\role-model-router\dist\release\win32-x64\role-model-runtime.exe`
- Health: `healthy`
- Execution mode: `remote_only`
- Endpoint inventory count: `2`

## User Manual QA

The operator reported successful manual QA on 2026-07-10 after the rebuilt runtime was left running on `127.0.0.1:3456`:

> "alright this seems to be working well according to my manual qa"

This sign-off applies to the current rebuilt runtime behavior observed by the user after the addenda fixes, including routed Pi/Craft behavior through canonical aliases.

## Agent-Operated QA Notes

Real Pi CLI attempts during addendum 18 reached Role-Model and produced successful `difficulty.remote-only` runtime rows, but the noninteractive Pi CLI process did not terminate cleanly in the harness and left orphan processes that were stopped. Those attempts are recorded as useful runtime reachability evidence, not as clean Pi CLI command-pass evidence for addendum 18.

Craft live verification was not rerun specifically for addendum 18 after the final failure-capture patch. Earlier addenda 14, 16, and 17 contain real Craft runtime/client verification through canonical aliases and exact model ids.

The controlled live failure harness for addendum 18 failed before selected provider execution with `VENDOR_NOT_CONFIGURED`, so it is not counted as selected-endpoint failure-capture proof. The selected-endpoint failure-capture acceptance proof is automated TDD.

## Manual QA Result

Manual QA: PASS for the user's observed runtime behavior.

Failure-capture selected-endpoint parity: PASS by automated TDD, with live historical inspection and final runtime health evidence.

## Coverage Gate

- [x] Final rebuilt runtime health is recorded.
- [x] User manual QA sign-off is recorded.
- [x] Pi/Craft source remains unmodified by addendum 18.
- [x] Live-proof limitations are not overstated.

Coverage: PASS

## Approval Gate

- [x] Hybrid QA is sufficient for closeout because user manual QA passed and automated failure-capture tests passed.
- [x] Runtime remains healthy on `127.0.0.1:3456`.
- [x] Ready for phase 6/7/8 addenda-aware closeout.

Approval: PASS

Audit: PASS
