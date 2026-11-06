# S548 — final8 matrix + preserved-R compare-release

Pair public 7d0d25bb / private fc80966d; sealed exe D:/DEV/rm-clean/release-final8 (0.0.20-382-g7d0d25bb).

- verify-packaged-candidate: 12/12 PASS (health, models 3, telemetry, controller, learning, replay/eval, ui css 59815B both themes, ui bundle 3059375B, theme boot, chat completion total_tokens=56, ui shell).
- audit-rendered-ui: 20/20 PASS (/learning now 1687 chars after density work).
- dialog-a11y-audit: PASS (aria-modal, initial focus Dismiss, Tab trapped, Escape, focus return).
- runtime:test-parity: 128/128 PASS.
- compare-release preserved R (D:/role-model-router/0.0.20 role-model.exe, production) vs final8 (development, --allow-cross-channel with owner direction, distinct ports, fixture root): identity left=0.0.20 right=0.0.20-382-g7d0d25bb; 6 endpoints same (models, endpoints, router/summary, operator/learning, replay/jobs, evaluation/jobs); telemetry/summary environment-state (data); healthz + runtime/summary additive-shape (missing runtime.release_id/private_distribution_sha256 keys — expected version identity delta, recorded not asserted).

Remaining owner-gated: visual-delta approval (vision quota 429 persists), real-client R15/R16-live/R39 approvals, stage/prod Run88 identity when authorized. E1/E2 deferred. Development-channel evidence, not promotion.
