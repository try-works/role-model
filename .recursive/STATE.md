# STATE.md

## Current State

Direct Track B v1.1 remains the substrate baseline (run `00-direct-track-b-v1-1-implementation`). Run `79-extension-control-and-recommendations-qa` shipped public extension enable/disable mutation, Extensions UI wiring, and recommendation dismiss. Run `80-signed-recommendation-cloud-lifecycle` closed the deferred live `--track=dev` signed recommendation download → apply and download → dismiss loop on a freshly rebuilt packaged SEA. Run `81-kw-activation-browser-recommendation-evidence` shipped gated Knowledge Worker `productionActivation` unlock (instance-local policy) plus mandatory browser recommendation evidence on a rebuilt SEA.

### Product truths

- Active run worktrees for this closeout: private `D:/DEV/.wt/81-kw` and public `D:/DEV/role-model/.worktrees/81-kw-activation-browser-recommendation-evidence` on branch `recursive/81-kw-activation-browser-recommendation-evidence` (diff basis vs private `cf3da6bb4f93c86adae562c6fbaa4903066bf2ef` / public `9a94a5a187974941045dda732bfc8d2ba6eac327` from locked run-81 `00-worktree.md`).
- Public host still ships `POST /api/role-model/extensions/mutate` as the sole public enablement authority and `POST /api/role-model/recommendations/dismiss` for terminal dismiss without apply; run 81 did not change those product sources.
- Live bound-cloud recommendation trust loop for `--track=dev` remains proven (run 80 API lifecycle) and is additionally proven via mandatory browser Playwright download → preview → apply → dismiss on rebuilt SEA (run 81).
- Knowledge Worker activation is **gated, not ambient**: static/class `productionActivation` remains `false`; instance `#productionActivation` may unlock only under policy version `1` + attestation `activate-production` + verified `knowledge_validation` receipt claims + shadow candidate; rollback clears flag and candidates; unknown policy fields refuse.
- Extensions UI honesty copy reflects fail-closed default and gated activation distinct from Set mode (not hard-off KW wording).
- Server change for run 81 was `not-required` (local KW policy + existing permanent-dev recommendation workers).
- Contribution opt-out alone does not revoke eligible already-imported recommendations (public ops regression retained).
- Packaged public SEA verification still requires Track B staged via `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` (private `dist/run00-dev` after `build:run00-runtime` when needed).
- Predecessor Track B truths still hold: thirteen canonical private extensions, cloud track isolation (dev/stage/production), offline `pnpm test:cloud`, opt-in live E2E on dev|stage only, TB11 predecessor maxItems compensation remains addendum-bound.

### Known limitations

- Activation receipts are not yet bound to a specific candidate `validationReceiptHash` (accepted residual; future hardening).
- Packaged SEA launch still hardcodes `--scope-id packaged-run00` (browser PASS used that scope; parameterize later).
- Knowledge-store (and other packages) boundary copy remains hard-off where unchanged (`OOS12`).
- TB11 predecessorReceipts schema maxItems compensation remains localized and bound by run `00` addendum + `evidence/release-validation.json`.
- No auto-promotion of run 81 (or 80/79) to `stage`/`main`; feature-branch merge to origin `dev` is operator-requested.

### Operational notes

- Prefer run-81 evidence under `.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/` for gated KW activation + browser recommendation proofs (`binder.json`, `browser-dev-lifecycle.log`, rebuild receipt, Phase 4/5 logs).
- Prefer run-80 evidence under `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/` for API-only live `--track=dev` signed recommendation lifecycle proofs.
- Prefer run-79 evidence under `.recursive/run/79-extension-control-and-recommendations-qa/evidence/` for mutation/dismiss/UI/SEA packaging remediations.
- KW probe: `scripts/track-b/run81-kw-activation-probe.mjs`; TB10: `tests/track-b/tb10.test.mjs`.
- Live seed/lifecycle helpers from run 80 remain: `scripts/track-b/run80-seed-signed-recommendations.mjs`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs`.
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; do not treat `track_b_runtime: null` packages as a complete Track B verify.
- Prefer `node --test tests/track-b/*.test.mjs`, `node scripts/track-b/system-proof.mjs`, `node scripts/track-b/validate-release-evidence.mjs`, and dual-platform interop verify/merge scripts for Track B release gates.
- Cloud: `pnpm test:cloud` for offline worker coverage; live Cloudflare E2E is opt-in via `pnpm test:cloud:e2e` on **dev or stage only** (see `docs/testing.md`).
- Global decisions: `.recursive/DECISIONS.md`. Memory plane: `.recursive/memory/` (domain/episode/skill shards).
