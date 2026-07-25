# STATE.md

## Current State

Direct Track B v1.1 remains the substrate baseline (run `00-direct-track-b-v1-1-implementation`). Runs 79–82 shipped mutate/dismiss UI, live `--track=dev` signed recommendation hops, gated digest-bound KW activation, and pin-freeze/launch-scope honesty. Run `83-kw-operator-toggle-assemble-live-e2e-argv-equals` added shadow-ready KW default + soft OFF + ceremony-retained ON, equals-form launch argv, evidence-root fail-closed hygiene, full Playwright assemble with private pin tip `3d6c4f7`, public Extensions honesty (`publicChange: required`), and Phase 5 hops on `run83-dev`.

### Product truths

- Active run worktrees for this closeout: private `D:/DEV/.wt/83-kw` and public `D:/DEV/role-model/.worktrees/83-kw-operator-toggle-assemble-live-e2e-argv-equals` on branch `recursive/83-kw-operator-toggle-assemble-live-e2e-argv-equals` (diff basis vs private `6fd8c68e89d8d2aa1a06681bf8ff4d3552a34755` / public `d72fc2a19c0849c4adf2ad15931d515c5ea37f8d` from locked run-83 `00-worktree.md`).
- Private TB00 product pin is `3d6c4f74a6198287277471f0afc7e8950a6123d8` with coherent live-e2e/release evidence after full Playwright assemble; public product pin remains `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`.
- Public Extensions honesty tip is `b5482d7c081340572d5cabbea9492ff0e916e82d` (`publicChange: required` for run 83).
- Public host still ships `POST /api/role-model/extensions/mutate` as the sole public enablement authority and `POST /api/role-model/recommendations/dismiss` for terminal dismiss without apply.
- Live bound-cloud recommendation trust loop for `--track=dev` remains proven (run 80 API, run 81 browser, run 82/`83` API hops on scoped run ids).
- Knowledge Worker: static/class `productionActivation` remains `false`; bootstrap is shadow-ready; soft OFF returns shadow-ready; ceremony ON retains `digest(policy.receipt) === candidate.validationReceiptHash`; soft deactivate uses capability `knowledge:deactivate`; destructive rollback unchanged.
- Packaged launch binds both discrete and equals-form `--track` / `--scope-id` via `resolveFlagValue`. Non-run80 scopes must pass `--evidence-root` / env; writing foreign scope evidence under `.recursive/run/80-signed-recommendation-cloud-lifecycle/` is refused.
- Extensions UI honesty copy states shadow-ready default, ceremony-retained ON, soft OFF, and KW-when-on ≠ Set mode.
- Server change for run 83 was `not-required` (existing permanent-dev recommendation workers).
- Contribution opt-out alone does not revoke eligible already-imported recommendations.
- Packaged public SEA verification still requires Track B staged via `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` (private `dist/run00-dev` after `build:run00-runtime` when needed).
- Predecessor Track B truths still hold: thirteen canonical private extensions, cloud track isolation (dev/stage/production), offline `pnpm test:cloud`, opt-in live E2E on dev|stage only, TB11 predecessor maxItems compensation remains addendum-bound.

### Known limitations

- Feature-branch merge to origin `dev` remains operator-requested (`R19`).
- Knowledge-store (and other packages) boundary copy remains hard-off where unchanged.
- TB11 predecessorReceipts schema maxItems compensation remains localized and bound by run `00` addendum + `evidence/release-validation.json`.
- No auto-promotion of run 83 (or 82/81/80/79) to `stage`/`main`.

### Operational notes

- Prefer run-83 evidence under `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/` for KW toggle, equals-form/evidence-root, full assemble, pin tip `3d6c4f7`, and Phase 5 rebuild/API/cloud/pi proofs (`binder.json`, Phase 4/5 logs, rebuild receipt, `qa-artifact-recheck.txt`).
- Prefer run-82 evidence under `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/evidence/` for prior digest-bind / launch-scope closeout context.
- Prefer run-81 evidence under `.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/` for gated KW UI honesty + browser recommendation proofs.
- Prefer run-80 evidence under `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/` for API-only live `--track=dev` signed recommendation lifecycle proofs (do not overwrite with later-run hops).
- Prefer run-79 evidence under `.recursive/run/79-extension-control-and-recommendations-qa/evidence/` for mutation/dismiss/UI/SEA packaging remediations.
- KW probe: `scripts/track-b/run81-kw-activation-probe.mjs`; TB10: `tests/track-b/tb10.test.mjs`; launch scope: `scripts/track-b/packaged-launch-scope.mjs` (`resolveFlagValue`, `resolvePackagedLaunchEvidenceRoot`).
- Live seed/lifecycle helpers: `scripts/track-b/run80-seed-signed-recommendations.mjs`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs` (pass `--evidence-root` for non-run80 scopes).
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; do not treat `track_b_runtime: null` packages as a complete Track B verify.
- Prefer `node --test tests/track-b/*.test.mjs`, `node scripts/track-b/system-proof.mjs`, `node scripts/track-b/validate-release-evidence.mjs`, and dual-platform interop verify/merge scripts for Track B release gates.
- Cloud: `pnpm test:cloud` for offline worker coverage; live Cloudflare E2E is opt-in via `pnpm test:cloud:e2e` on **dev or stage only** (see `docs/testing.md`).
- Global decisions: `.recursive/DECISIONS.md`. Memory plane: `.recursive/memory/` (domain/episode/skill shards).
