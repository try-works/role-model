# STATE.md

## Current State

Direct Track B v1.1 remains the substrate baseline (run `00-direct-track-b-v1-1-implementation`). Runs 79–85 shipped mutate/dismiss UI, live `--track=dev` signed recommendation hops, gated digest-bound KW activation, pin-freeze/launch-scope honesty, shadow-ready KW soft toggle, equals-form argv, evidence-root fail-closed, Extensions UI Prepare/ON/Soft OFF, gated production retrieve + eval consumer, and gated live-router prompt inject with host join/auto-arm. Run `86-runtime-ui-rm3-design-system-frontend` is the **closed-out** runtime-ui RM3 design-system migration: repo-owned `@role-model/ui` kit, RM3 `DESIGN_SYSTEM.md`, Paper `4-0`/`5-0`/`6-0`/`7-0` page IA, FD#15 config→strategy redirect, SP8 verification floor green, hybrid Phase 5 QA on rebuilt `:3470` with operator Paper sign-off (`2026-08-01`), and operator polish P1–P8. Track B / KW substrate truths from run 85 remain authoritative for inject/KW surfaces.

### Product truths

- **Runtime-ui styling authority (run 86):** RM3 Paper pages `4-0`/`5-0`/`6-0`/`7-0` + `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` + `@role-model/ui` at `role-model-router/packages/ui`. Run `60-runtime-ui-paper-linear-review-alignment` Linear/Paper-Linear baseline is historical only for migrated surfaces.
- **Run 86 worktree:** `D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend` on branch `recursive/86-runtime-ui-rm3-design-system-frontend` (diff basis vs `origin/dev` @ `b633056aa52252eaa40a7324ac7018b84d1ea0d9` from locked `00-worktree.md`).
- **Run 86 Phase 5 QA:** rebuilt `start-for-qa` on `:3470`; human Paper sign-off complete (`05-manual-qa.md`, operator `2026-08-01`); P1–P8 polish accepted via upstream-gap addendum.
- **Run 86 verification floor:** kit 30 · runtime-ui 394 · build · validate-ui · Playwright (`evidence/logs/sp8-playwright-final2.log`); screenshot evidence under `.recursive/run/86-runtime-ui-rm3-design-system-frontend/evidence/screenshots/`.
- **FD#15:** `/app/router/config` redirects to `/app/router/strategy`; no Config segment in Router IA.
- **Track B / KW (run 85):** private worktrees `D:/DEV/role-model-internal/.worktrees/85-kw-gated-router-prompt-inject` and public `D:/DEV/role-model/.worktrees/85-kw-gated-router-prompt-inject` on branch `recursive/85-kw-gated-router-prompt-inject`; gated inject, host join/auto-arm, honesty/export unlock, Phase 5 hops on `run85-dev`, post-lock live `pi`→KW inject→storage E2E.
- Private TB00 product pin is `39b56d41d60f703f766f71397ba7c76cd68c8254`; public product pin remains `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`.
- Public host ships KW mutate actions plus join factory and durable production auto-arm; insertion surface is `applyRequestedRoleExecutionPolicy` via `mapChatCompletionsRequest` only.
- Live inject host wiring truths (post-lock remediations): default bounded retrieve query from latest user message when durable KW ON; auto-arm reads `{stateRoot}/{scopeId}/track-b-production-bridge.json`; activate/deactivate register KW join under `state.revision + 1`; auto-arm uses host-owned durable join session.
- Extensions UI / honesty / export: gated inject unlocked under contract; `productionPromptInjection` true only when inject contract satisfied.
- Knowledge Worker: ceremony ON / soft OFF retained; production retrieve + eval consumer retained; gated prompt inject when ON + retrieve PASS.
- Packaged launch binds discrete and equals-form `--track` / `--scope-id`; non-run80 scopes must pass `--evidence-root` / env.
- SEA used for run-85 Phase 5 hops: sha256 `caa7c9e7a8a0c3ef57a0aaf801d97cd1021817db1443d4d8d7e5e4f97806b424` (`run85-dev`); post-lock live `pi` inject E2E SEA `1a3ff1ea09cb03b446a31473e261bf89ec51bdf3f1ff0eea770b7f0f05c93795`.
- Server change for run 85 was `not-required`; `publicChange: required`. Run 86 server change `not-required`; `publicChange: required`.
- Predecessor Track B truths still hold: thirteen canonical private extensions, cloud track isolation, offline `pnpm test:cloud`, opt-in live E2E on dev|stage only, TB11 predecessor maxItems compensation remains addendum-bound.

### Known limitations

- Feature-branch merge to origin `dev` remains operator-requested (run 86 and run 85 branches).
- Optional residual: rename legacy `--rm-*` call sites to `--rm3-*` where drift remains.
- Local Matrix route remains a `<Navigate>` stub (run 86 R5 exception).
- Knowledge-store (and other packages) boundary copy remains hard-off where unchanged.
- TB11 predecessorReceipts schema maxItems compensation remains localized and bound by run `00` addendum + `evidence/release-validation.json`.
- No auto-promotion of run 86 (or 85/84/83/82/81/80/79) to `stage`/`main`.
- Ungated ambient KW, ceremony removal, Profile Learner / GRPO training unlock, live `--track=production`, and Paper file edits remain OOS.
- Run-84 deferred full live-router inject residual is soft-closed for gated inject only (training unlock still open).

### Operational notes

- Prefer run-86 evidence under `.recursive/run/86-runtime-ui-rm3-design-system-frontend/evidence/` for RM3 kit, shell, page IA, SP8 floor, Phase 5 `:3470` QA, screenshots, and P1–P8 polish addenda.
- Prefer run-85 evidence for inject unlock, host join/auto-arm, pin/freeze, Phase 5 rebuild/SEA-inject/probe/cloud/`pi` proofs, and post-lock `pi-kw-inject-e2e.json`.
- Prefer run-84 evidence for UI toggle / retrieve gate / eval consumer foundation.
- Prefer run-83 evidence for equals-form argv / evidence-root / soft-toggle foundation.
- Prefer run-82 evidence for digest-bind / launch-scope closeout context.
- Prefer run-81 evidence for gated KW UI honesty + browser recommendation proofs.
- Prefer run-80 evidence for API-only live `--track=dev` signed recommendation lifecycle proofs (do not overwrite with later-run hops).
- Prefer run-79 evidence for mutation/dismiss/UI/SEA packaging remediations.
- Prefer run-60 evidence only as historical Paper-Linear baseline context (superseded by run 86 for live runtime-ui styling).
- KW probe: `scripts/track-b/run81-kw-activation-probe.mjs`; SEA inject hop: `scripts/track-b/run85-sea-inject-hop.mts`; live pi inject E2E: `scripts/track-b/run85-pi-kw-inject-e2e.mjs`; TB10: `tests/track-b/tb10.test.mjs`; assemble: `scripts/track-b/assemble-run00-live-e2e.mjs`.
- Runtime-ui RM3 QA: `corepack pnpm --filter @role-model-router/runtime-ui build` → `runtime:validate-ui` → `start-for-qa` (document port in evidence logs).
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; wire private KW join factory before claiming SEA inject unlock.
- Private feature worktrees must live under `role-model-internal/.worktrees/` (not external `D:/DEV/.wt/`).
- Cloud: `pnpm test:cloud` for offline worker coverage; live Cloudflare E2E is opt-in via `pnpm test:cloud:e2e` on **dev or stage only** (see `docs/testing.md`).
- Global decisions: `.recursive/DECISIONS.md`. Memory plane: `.recursive/memory/` (domain/episode/skill shards).
