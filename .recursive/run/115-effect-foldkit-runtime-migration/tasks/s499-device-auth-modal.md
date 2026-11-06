# S499 — device-auth session display as real Foldkit dialog

Status: pending
TDD Mode: strict
Public basis 28f4eaae.
Design: evidence/other/s497-device-auth-modal-design.md (authoritative; follow its selector table exactly).

Implement: keep the draft/start/retry form inline (control-view.ts current markup with data-route/data-device-auth-*); move ONLY the pending/terminal session display (user code, verification link, note, poll status, expiry) into a real @role-model-router/foldkit-ui/dialog with optional deviceAuthDialog model slice + key. Preserve every scene selector the design lists so test/s397-device-auth-form.test.ts and test/s425-device-auth-correctness.test.ts stay green unchanged; Cancel keeps DeviceAuthCancelled semantics; close clears modal key without cancelling polling; focus trap/Escape/aria-modal via real dialog.

Strict RED first: scene-level RED is invalid here (existing suites must not break); use a behavioral RED: new test asserting the pending session renders inside role=dialog with aria-modal and the user code present; today pending session renders inline (fails). Keep s397/s425/s458/s491/s111 green throughout; UI tsc 0; s247 click-budget invariants 20/20; nonempty lint zero added-line; freeze hashes; independent review by a different member; no commit.
