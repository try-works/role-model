# S502 — browser-level dialog a11y assertions (named deferral from S501)

Status: pending
TDD Mode: strict
Public basis 36d19496.

Assert in a real browser against the packaged exe: device-auth dialog Escape closes, Tab stays trapped, initial focus lands on Dismiss, focus returns to the trigger after close, aria-modal present. Implement as a new script scripts/runtime/dialog-a11y-audit.mjs reusing the audit-rendered-ui Chrome/CDP harness patterns (no new deps), launching the packaged exe with the same fixture/static roots, driving the device-auth route to a pending session (or a fixture that yields one), then performing the assertions.

Strict RED: run against release-final4 (pre-dialog package) and assert the a11y checks fail cleanly (no dialog semantics); then run against release-final5 and assert PASS. Wire a package.json script runtime:dialog-a11y-audit. Keep audit-rendered-ui 20/20 green; node --check; lint zero added-line; freeze hashes; independent review by a different member; no commit.
