# S497 — device-auth modal migration design (read-only)

Status: pending
Public basis 705bb44f.

Produce a bounded design for migrating the inline device-auth section (control-view.ts:213-290) to a real @role-model-router/foldkit-ui dialog modal, matching the original React device-authorization-modal.tsx behavior. Deliverable evidence/other/s497-device-auth-modal-design.md containing: (1) exact DOM/attribute mapping table (data-device-auth, start/cancel buttons, poll code, expiry text) so scene tests s425/s442 keep finding elements or the precise test-update list; (2) foldkit dialog API usage (open state in optional model slice, focus trap, Escape, initial focus); (3) message/update wiring changes needed; (4) a11y requirements (role dialog, aria-modal, labelled, focus return); (5) risk list. NO code changes in this slice. Live Flash verify.
