# STATE.md

## Current State

Direct Track B v1.1 remains the substrate baseline (run `00-direct-track-b-v1-1-implementation`). Runs 79–84 shipped mutate/dismiss UI, live `--track=dev` signed recommendation hops, gated digest-bound KW activation, pin-freeze/launch-scope honesty, shadow-ready KW soft toggle, equals-form argv, evidence-root fail-closed, Extensions UI Prepare/ON/Soft OFF, and gated production retrieve + eval consumer. Run `85-kw-gated-router-prompt-inject` unlocks **gated** live-router production prompt injection when KW is ceremony ON and production retrieve succeeds, with host join/auto-arm, honesty/export unlock, private pin advance, Phase 5 hops on `run85-dev`, and post-lock live `pi`→KW inject→storage E2E after host wiring remediations.

### Product truths

- Active run worktrees for this closeout: private `D:/DEV/role-model-internal/.worktrees/85-kw-gated-router-prompt-inject` and public `D:/DEV/role-model/.worktrees/85-kw-gated-router-prompt-inject` on branch `recursive/85-kw-gated-router-prompt-inject` (diff basis vs private `b34691c376f7b267b2dcdf048ea5b5b17e06115b` / public `de7ed20427a32277a6541fab22517a15238f6e74` from locked run-85 `00-worktree.md`).
- Private TB00 product pin is `39b56d41d60f703f766f71397ba7c76cd68c8254` (advanced at ship for closeout scripts + live-e2e rebind; inject tip `726df64…` remains ancestor); public product pin remains `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`.
- Public host ships KW mutate actions plus join factory (`createPrivateKwJoinWorkerFactory`) and durable production auto-arm (`withKwProductionAutoArm`); insertion surface is `applyRequestedRoleExecutionPolicy` via `mapChatCompletionsRequest` only.
- Live inject host wiring truths (post-lock remediations): default bounded retrieve query from latest user message when durable KW ON; auto-arm reads `{stateRoot}/{scopeId}/track-b-production-bridge.json` (same path mutate writes); activate/deactivate register KW join under `state.revision + 1`; auto-arm uses host-owned durable join session (not client `x-session-id`).
- Extensions UI / honesty / export: gated inject is unlocked under contract; no longer claims “production prompt injection remains locked” forever; `productionPromptInjection` is true only when inject contract is satisfied.
- Knowledge Worker: ceremony ON / soft OFF retained; production retrieve + eval consumer retained; gated prompt inject applies when ON + retrieve PASS and refuses OFF/soft-OFF/join/retrieve failures (FD31 codes); soft OFF clears inject.
- Packaged launch still binds discrete and equals-form `--track` / `--scope-id`; non-run80 scopes must pass `--evidence-root` / env.
- SEA used for initial Phase 5 hops: sha256 `caa7c9e7a8a0c3ef57a0aaf801d97cd1021817db1443d4d8d7e5e4f97806b424` (`run85-dev`).
- SEA used for post-lock live `pi`→KW inject→storage E2E: sha256 `1a3ff1ea09cb03b446a31473e261bf89ec51bdf3f1ff0eea770b7f0f05c93795`; pre-ship rebuild receipt refreshed to `7102a77b815c4a273dcb984743317c24a0cd16153ec5fbd077ae5553fdc96e09` after biome format (addendum `05-manual-qa.pi-kw-inject-e2e.addendum-01.md`; evidence `evidence/other/pi-kw-inject-e2e.json`).
- Server change for run 85 was `not-required`; `publicChange: required` (host remediations remain on feature branch until operator ship).
- Contribution opt-out alone does not revoke eligible already-imported recommendations.
- Packaged public SEA verification still requires Track B staged via `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` (private `dist/run00-dev`).
- Predecessor Track B truths still hold: thirteen canonical private extensions, cloud track isolation, offline `pnpm test:cloud`, opt-in live E2E on dev|stage only, TB11 predecessor maxItems compensation remains addendum-bound.

### Known limitations

- Feature-branch merge to origin `dev` remains operator-requested (`R26`).
- Knowledge-store (and other packages) boundary copy remains hard-off where unchanged.
- TB11 predecessorReceipts schema maxItems compensation remains localized and bound by run `00` addendum + `evidence/release-validation.json`.
- No auto-promotion of run 85 (or 84/83/82/81/80/79) to `stage`/`main`.
- Ungated ambient KW, ceremony removal, Profile Learner / GRPO training unlock, and live `--track=production` remain OOS.
- Run-84 deferred full live-router inject residual is soft-closed for gated inject only (training unlock still open).

### Operational notes

- Prefer run-85 evidence under `.recursive/run/85-kw-gated-router-prompt-inject/evidence/` for inject unlock, host join/auto-arm, pin/freeze, Phase 5 rebuild/SEA-inject/probe/cloud/`pi` proofs, and post-lock `pi-kw-inject-e2e.json` (`binder.json`, Phase 4/5 logs, rebuild receipt, addendum).
- Prefer run-84 evidence for UI toggle / retrieve gate / eval consumer foundation.
- Prefer run-83 evidence for equals-form argv / evidence-root / soft-toggle foundation.
- Prefer run-82 evidence for digest-bind / launch-scope closeout context.
- Prefer run-81 evidence for gated KW UI honesty + browser recommendation proofs.
- Prefer run-80 evidence for API-only live `--track=dev` signed recommendation lifecycle proofs (do not overwrite with later-run hops).
- Prefer run-79 evidence for mutation/dismiss/UI/SEA packaging remediations.
- KW probe: `scripts/track-b/run81-kw-activation-probe.mjs` (inject matrix); SEA inject hop helper: `scripts/track-b/run85-sea-inject-hop.mts`; live pi inject E2E: `scripts/track-b/run85-pi-kw-inject-e2e.mjs`; TB10: `tests/track-b/tb10.test.mjs`; assemble: `scripts/track-b/assemble-run00-live-e2e.mjs`.
- Live seed/lifecycle helpers: `scripts/track-b/run80-seed-signed-recommendations.mjs`, `scripts/track-b/run80-live-recommendation-lifecycle.mjs` (pass `--evidence-root` and matching `--scope-id` for non-run80 scopes; recommendation verification key required for download).
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; wire private KW join factory on Track B manifest before claiming SEA inject unlock; after host wiring changes, re-package and re-prove live inject (map hop alone does not imply live `pi` inject).
- Private feature worktrees must live under `role-model-internal/.worktrees/` (not external `D:/DEV/.wt/`).
- Prefer `node --test tests/track-b/*.test.mjs`, `node scripts/track-b/system-proof.mjs`, `node scripts/track-b/validate-release-evidence.mjs`, and dual-platform interop verify/merge scripts for Track B release gates.
- Cloud: `pnpm test:cloud` for offline worker coverage; live Cloudflare E2E is opt-in via `pnpm test:cloud:e2e` on **dev or stage only** (see `docs/testing.md`).
- Global decisions: `.recursive/DECISIONS.md`. Memory plane: `.recursive/memory/` (domain/episode/skill shards).
