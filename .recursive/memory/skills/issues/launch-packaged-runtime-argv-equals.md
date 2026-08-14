# Launch packaged-runtime argv + evidence-root hygiene

Type: skill-issue
Status: CURRENT
Scope: `scripts/track-b/launch-packaged-runtime.mjs` CLI parsing for `--track` / `--scope-id` / `--evidence-root` (and similar helpers)
Owns-Paths:
Watch-Paths: scripts/track-b/launch-packaged-runtime.mjs; scripts/track-b/packaged-launch-scope.mjs; scripts/track-b/run80-live-recommendation-lifecycle.mjs
Source-Runs: 82-tb00-pin-refreeze-kw-digest-bind-launch-scope; 83-kw-operator-toggle-assemble-live-e2e-argv-equals
Validated-At-Commit: working-tree run-83 Phase 8 closeout
Last-Validated: 2026-07-25
Tags: launch, argv, track-dev, packaged-runtime, windows, equals-form, evidence-root

## Summary

Run 83 SP2 implemented shared `resolveFlagValue` in `scripts/track-b/packaged-launch-scope.mjs`. Discrete (`--track` `dev`) and equals-form (`--track=dev`) bind identically (first match wins). `launch-packaged-runtime.mjs` uses that helper for all `arg()` flags.

Run 83 SP2b added fail-closed evidence-root binding: non-run80 scopes must pass `--evidence-root` / `ROLE_MODEL_LAUNCH_EVIDENCE_ROOT` (launch) or `--evidence-root` / `ROLE_MODEL_LIFECYCLE_EVIDENCE_ROOT` (lifecycle). Default remains the run-80 packaged-runtime path only for run80-family scopes (`packaged-run00`, `run80-*`). Writing a foreign `scopeId` under `.recursive/run/80-signed-recommendation-cloud-lifecycle/` throws.

Historical pitfall (run 82): discrete-only `indexOf("--name")` ignored equals-form and silently fell through to defaults.

Historical pitfall (run 83 hops): launch/lifecycle defaulted evidence under run 80 and overwrote historical run-80 receipts with `run83-dev` content. Restored run-80 artifacts to baseline; guard prevents recurrence.

## Guidance

- Either form is valid: `--track=dev --scope-id=run83-dev` or discrete two-token pairs.
- For non-run80 scopes, always pass an owning-run evidence root, e.g. `--evidence-root=.recursive/run/83-…/evidence/other/packaged-runtime`.
- Confirm effective binding via `runtime-identity.json` (`track`, `recommendationChannel`, `recommendationServiceUrl`, `scopeId`) before claiming a live hop PASS.
- Do not treat a listening port alone as proof of correct cloud-track binding.
- Regression coverage: `tests/track-b/packaged-launch-scope.test.mjs`.

## Non-goals

- This shard records the pitfall history and the run-83 fixes; it does not replace Phase 5 live binding receipts.
