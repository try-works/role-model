# STATE.md

## Current State

Run `89-codex-role-model-package` is the **closed-out** Codex Desktop/CLI/IDE adapter package: public npm `@try-works/codex-role-model@0.1.1`, local Responses adapter, signed-in catalog merge, adapter-only tool bridge (protocol-only), and Codex marketplace npm catalog verified. Hybrid Phase 5 operator sign-off `2026-08-07`. Direct Track B v1.1 remains the substrate baseline (run `00-direct-track-b-v1-1-implementation`). Runs 79–85 shipped mutate/dismiss UI, live `--track=dev` signed recommendation hops, gated digest-bound KW activation, pin-freeze/launch-scope honesty, shadow-ready KW soft toggle, equals-form argv, evidence-root fail-closed, Extensions UI Prepare/ON/Soft OFF, gated production retrieve + eval consumer, and gated live-router prompt inject with host join/auto-arm. Run `86-runtime-ui-rm3-design-system-frontend` remains the closed-out runtime-ui RM3 design-system migration. Track B / KW substrate truths from run 85 remain authoritative for inject/KW surfaces.

### Product truths

- **Codex adapter (run 89):** `@try-works/codex-role-model@0.1.1` at `packages/codex-role-model`; adapter default `:3460`; does not own role-model runtime; signed-in `openai_base_url` + merged catalog; tool bridge + `web_search` fulfill stay adapter-only; marketplace `.agents/plugins/marketplace.json` (npm source).
- **Run 89 worktree:** `D:\DEV\role-model\.worktrees\89-codex-role-model-package` on branch `recursive/89-codex-role-model-package` (diff basis vs `origin/dev` @ `6cf19bf033c23246c173a1bf634d13b2c822b2d8` from locked `00-worktree.md`).
- **Run 89 Phase 5 QA:** hybrid; real runtime + real Codex CLI; operator sign-off `2026-08-07`; npm publish + marketplace→npm install verified.
- **Runtime-ui styling authority (run 86):** RM3 Paper pages `4-0`/`5-0`/`6-0`/`7-0` + `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` + `@role-model/ui` at `role-model-router/packages/ui`.
- **Run 86 worktree:** `D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend` on branch `recursive/86-runtime-ui-rm3-design-system-frontend` (diff basis vs `origin/dev` @ `b633056aa52252eaa40a7324ac7018b84d1ea0d9`).
- **Run 86 Phase 5 QA:** rebuilt `start-for-qa` on `:3470`; human Paper sign-off complete; P1–P8 polish accepted via upstream-gap addendum.
- **Run 86 verification floor:** kit 30 · runtime-ui 394 · build · validate-ui · Playwright (`evidence/logs/sp8-playwright-final2.log`).
- **FD#15:** `/app/router/config` redirects to `/app/router/strategy`; no Config segment in Router IA.
- **Track B / KW (run 85):** private worktrees under `role-model-internal` / public `.worktrees/85-kw-gated-router-prompt-inject`; gated inject, host join/auto-arm, honesty/export unlock, Phase 5 hops on `run85-dev`, post-lock live `pi`→KW inject→storage E2E.
- Private TB00 product pin is `39b56d41d60f703f766f71397ba7c76cd68c8254`; public product pin remains `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`.
- Public host ships KW mutate actions plus join factory and durable production auto-arm; insertion surface is `applyRequestedRoleExecutionPolicy` via `mapChatCompletionsRequest` only.
- Knowledge Worker: ceremony ON / soft OFF retained; production retrieve + eval consumer retained; gated prompt inject when ON + retrieve PASS.
- Packaged launch binds discrete and equals-form `--track` / `--scope-id`; non-run80 scopes must pass `--evidence-root` / env.
- Server change for run 89 `not-required`; `publicChange: required`. Run 86 server change `not-required`; `publicChange: required`. Run 85 same.

### Known limitations

- Feature-branch merge to origin `dev` remains operator-requested (runs 89, 86, 85, …).
- Run 89 residual: land `.agents/plugins/marketplace.json` on published `dev` for GitHub marketplace one-liner; optional Desktop UI glance; optional Codex Stop-hook auto-continue (not adapter regex).
- Optional residual: rename legacy `--rm-*` call sites to `--rm3-*` where drift remains.
- Local Matrix route remains a `<Navigate>` stub (run 86 R5 exception).
- Knowledge-store (and other packages) boundary copy remains hard-off where unchanged.
- TB11 predecessorReceipts schema maxItems compensation remains localized and bound by run `00` addendum + `evidence/release-validation.json`.
- No auto-promotion of run 89 (or 86/85/84/83/82/81/80/79) to `stage`/`main`.
- Ungated ambient KW, ceremony removal, Profile Learner / GRPO training unlock, live `--track=production`, and Paper file edits remain OOS.
- Run-84 deferred full live-router inject residual is soft-closed for gated inject only (training unlock still open).

### Operational notes

- Prefer run-89 evidence under `.recursive/run/89-codex-role-model-package/evidence/` for Codex adapter, tool-bridge, npm/marketplace, and Phase 5 live routing proofs.
- Codex outsider install: `npx --yes @try-works/codex-role-model@latest setup|start`; marketplace via personal npm catalog or (after merge) `codex plugin marketplace add try-works/role-model --ref dev`.
- Prefer run-86 evidence for RM3 kit, shell, page IA, SP8 floor, Phase 5 `:3470` QA, screenshots, and P1–P8 polish addenda.
- Prefer run-85 evidence for inject unlock, host join/auto-arm, pin/freeze, Phase 5 rebuild/SEA-inject/probe/cloud/`pi` proofs, and post-lock `pi-kw-inject-e2e.json`.
- Prefer run-84 evidence for UI toggle / retrieve gate / eval consumer foundation.
- Prefer run-83 evidence for equals-form argv / evidence-root / soft-toggle foundation.
- Prefer run-82 evidence for digest-bind / launch-scope closeout context.
- Prefer run-81 evidence for gated KW UI honesty + browser recommendation proofs.
- Prefer run-80 evidence for API-only live `--track=dev` signed recommendation lifecycle proofs (do not overwrite with later-run hops).
- Prefer run-79 evidence for mutation/dismiss/UI/SEA packaging remediations.
- Prefer run-60 evidence only as historical Paper-Linear baseline context (superseded by run 86 for live runtime-ui styling).
- KW probe: `scripts/track-b/run81-kw-activation-probe.mjs`; SEA inject hop: `scripts/track-b/run85-sea-inject-hop.mts`; live pi inject E2E: `scripts/track-b/run85-pi-kw-inject-e2e.mjs`; TB10: `tests/track-b/tb10.test.mjs`; assemble: `scripts/track-b/assemble-run00-live-e2e.mjs`.
- Runtime-ui RM3 QA: `corepack pnpm --filter @role-model-router/runtime-ui build` → `runtime:validate-ui` → `start-for-qa`.
- Package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set; wire private KW join factory before claiming SEA inject unlock.
- Private feature worktrees must live under `role-model-internal/.worktrees/` (not external `D:/DEV/.wt/`).
- Cloud: `pnpm test:cloud` for offline worker coverage; live Cloudflare E2E is opt-in via `pnpm test:cloud:e2e` on **dev or stage only** (see `docs/testing.md`).
- Global decisions: `.recursive/DECISIONS.md`. Memory plane: `.recursive/memory/` (domain/episode/skill shards).
