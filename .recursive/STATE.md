# STATE.md

## Current State

Direct Track B v1.1 remains the substrate baseline (run `00-direct-track-b-v1-1-implementation`). Runs 79–83 shipped mutate/dismiss UI, live `--track=dev` signed recommendation hops, gated digest-bound KW activation, pin-freeze/launch-scope honesty, shadow-ready KW soft toggle, equals-form argv, and evidence-root fail-closed. Run `84-kw-ui-toggle-gated-retrieve-eval` adds operator-visible Extensions UI Prepare → Production ON → Soft OFF, host mutate actions, private production retrieve gate + first-party eval consumer with durable session activation, repaired full Playwright assemble, and Phase 5 hops on `run84-dev`.

### Product truths

- Active run worktrees for this closeout: private `D:/DEV/role-model-internal/.worktrees/84-kw-ui-toggle-gated-retrieve-eval` and public `D:/DEV/role-model/.worktrees/84-kw-ui-toggle-gated-retrieve-eval` on branch `recursive/84-kw-ui-toggle-gated-retrieve-eval` (diff basis vs private `7a85d560a30a49b33fe309d5a88f4fbbe86a14c0` / public `f52f8e301f8e84b04f7103403207e4ebcf29271e` from locked run-84 `00-worktree.md`; private path relocated in-parent per `00-worktree-relocation-addendum.md`).
- Private TB00 product pin remains `3d6c4f74a6198287277471f0afc7e8950a6123d8`; public product pin remains `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`.
- Public host ships KW-only audited mutate actions `bootstrap_shadow_ready`, `activate_production`, and `deactivate_production` in addition to Set-mode mutate and recommendation dismiss.
- Extensions UI exposes Prepare / Production ON / Soft OFF for KW with honest status distinct from Set mode; Playwright proves the flow on rebuilt SEA.
- Knowledge Worker: static/class `productionActivation` remains `false`; bootstrap is shadow-ready; soft OFF returns shadow-ready; ceremony ON retains `digest(policy.receipt) === candidate.validationReceiptHash`; production retrieve is refused while OFF and succeeds while ON; `evaluateWithProductionKnowledge` fails closed OFF and succeeds ON; durable `sessionId` activation persists within a session.
- Packaged launch still binds discrete and equals-form `--track` / `--scope-id`; non-run80 scopes must pass `--evidence-root` / env.
- SEA used for Phase 5: sha256 `aeb2204310e1675e3559fc72176423e46c0891ebff8dcf7ecf26dc238ffc457e` (`run84-dev`).
- Server change for run 84 was `not-required`; `publicChange: required`.
- Contribution opt-out alone does not revoke eligible already-imported recommendations.
- Packaged public SEA verification still requires Track B staged via `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` (private `dist/run00-dev`).
- Predecessor Track B truths still hold: thirteen canonical private extensions, cloud track isolation, offline `pnpm test:cloud`, opt-in live E2E on dev|stage only, TB11 predecessor maxItems compensation remains addendum-bound.

### Known limitations

- Feature-branch merge to origin `dev` remains operator-requested (`R22`).
- Knowledge-store (and other packages) boundary copy remains hard-off where unchanged.
- TB11 predecessorReceipts schema maxItems compensation remains localized and bound by run `00` addendum + `evidence/release-validation.json`.
- No auto-promotion of run 84 (or 83/82/81/80/79) to `stage`/`main`.
- Ungated ambient KW, ceremony removal, prompt-inject unlock, and live `--track=production` remain OOS.

### Operational notes

- Prefer run-84 evidence under `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/` for UI toggle, retrieve gate/consumer, repaired assemble, pin/freeze, and Phase 5 rebuild/API/cloud/pi proofs (`binder.json`, Phase 4/5 logs, rebuild receipt).
- Prefer run-83 evidence for equals-form argv / evidence-root / soft-toggle foundation.
- Prefer run-82 evidence for digest-bind / launch-scope closeout context.
- Prefer run-81 evidence for gated KW UI honesty + browser recommendation proofs.
- Prefer run-80 evidence for API-only live `--track=dev` signed recommendation lifecycle proofs (do not overwrite with later-run hops).
- Prefer run-79 evidence for mutation/dismiss/UI/SEA packaging remediations.
- KW probe: `scripts/track-b/run81-kw-activation-probe.mjs`; TB10: `tests/track-b/tb10.test.mjs`; assemble: `scripts/track-b/assemble-run00-live-e2e.mjs` (prefer `RUNTIME_LIVE_BASE_URL`; enabled Validate & apply control).
- Live seed/lifecycle helpers: `scripts/track-b/run80-seed-signed-recommendations.mjs`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs` (pass `--evidence-root` for non-run80 scopes).
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; do not treat `track_b_runtime: null` packages as a complete Track B verify.
- Private feature worktrees must live under `role-model-internal/.worktrees/` (not external `D:/DEV/.wt/`).
- Prefer `node --test tests/track-b/*.test.mjs`, `node scripts/track-b/system-proof.mjs`, `node scripts/track-b/validate-release-evidence.mjs`, and dual-platform interop verify/merge scripts for Track B release gates.
- Cloud: `pnpm test:cloud` for offline worker coverage; live Cloudflare E2E is opt-in via `pnpm test:cloud:e2e` on **dev or stage only** (see `docs/testing.md`).
- Global decisions: `.recursive/DECISIONS.md`. Memory plane: `.recursive/memory/` (domain/episode/skill shards).
