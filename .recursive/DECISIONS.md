# DECISIONS.md

## Recursive Run Index

- `00-direct-track-b-v1-1-implementation` - Direct Track B v1.1 implementation closeout (Phases 0-8). Folder: `.recursive/run/00-direct-track-b-v1-1-implementation/`.
- `79-extension-control-and-recommendations-qa` - Public extension enable/disable mutation API, Extensions UI wiring, recommendation dismiss, packaged-runtime QA (Phases 0-8). Folder: `.recursive/run/79-extension-control-and-recommendations-qa/`. Soft-closes the prior “blocked mutation API / diagnostics-only UI” limitation from run `00`.
- `80-signed-recommendation-cloud-lifecycle` - Live `--track=dev` signed recommendation download/apply/dismiss on rebuilt packaged SEA (Phases 0-8). Folder: `.recursive/run/80-signed-recommendation-cloud-lifecycle/`. Soft-closes run 79’s deferred live signed-material follow-up.
- `81-kw-activation-browser-recommendation-evidence` - Gated KW `productionActivation` policy lifecycle + Extensions UI honesty + mandatory browser recommendation evidence on rebuilt SEA (Phases 0-8). Folder: `.recursive/run/81-kw-activation-browser-recommendation-evidence/`. Soft-closes run 80’s dedicated KW policy/lifecycle follow-up and optional browser UI residual.
- `82-tb00-pin-refreeze-kw-digest-bind-launch-scope` - TB00 private pin re-freeze + live-e2e coherence, digest-bound KW activation, parameterized packaged launch `--scope-id`, Phase 5 rebuilt-runtime API hop on `run82-dev` (Phases 0-8). Folder: `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/`. Soft-closes run 81 residuals F1 (digest bind) and F3 (launch scope hardcode), and restores pin-freeze/TB11 CI honesty.
- `83-kw-operator-toggle-assemble-live-e2e-argv-equals` - KW shadow-ready default + soft OFF + ceremony-retained ON, equals-form launch argv, evidence-root fail-closed, full Playwright assemble + private pin tip `3d6c4f7`, Phase 5 hops on `run83-dev` (Phases 0-8). Folder: `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/`. Soft-closes run 82 equals-form argv residual and optional full Playwright assemble follow-up.
- `84-kw-ui-toggle-gated-retrieve-eval` - Extensions UI Prepare/ON/Soft OFF + host mutate actions, production retrieve gate + first-party eval consumer, durable session activation, repaired full Playwright assemble, Phase 5 hops on `run84-dev` (Phases 0-8). Folder: `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/`. Soft-closes run 83 deferred Extensions UI control gap and records gated production retrieve usefulness.
- `85-kw-gated-router-prompt-inject` - Gated live-router production prompt inject when KW ceremony ON + production retrieve PASS; host join/auto-arm; honesty/export unlock; Phase 5 SEA inject hop + live `--track=dev` + live `pi`; post-lock live `pi`→KW inject→storage E2E + host wiring remediations (Phases 0-8). Folder: `.recursive/run/85-kw-gated-router-prompt-inject/`. Soft-closes run 84 deferred full live-router inject (`OOS3`/`E6`) and honesty "remains locked" for gated inject only.
- `86-runtime-ui-rm3-design-system-frontend` - RM v3 design system + `@role-model/ui` kit migration for router runtime-ui; Paper `4-0`/`5-0`/`6-0`/`7-0` IA; FD#15 config→strategy; SP8 floor green; hybrid Phase 5 QA on rebuilt `:3470` with human Paper sign-off; operator polish P1–P8 (Phases 0-8). Folder: `.recursive/run/86-runtime-ui-rm3-design-system-frontend/`. Soft-closes run `60-runtime-ui-paper-linear-review-alignment` as live styling authority for migrated surfaces (Linear/Paper-Linear historical).

## Run: `86-runtime-ui-rm3-design-system-frontend`

Date: `2026-08-01`

### What changed

- Ports RM v3 into `role-model-router`: repo-owned `@role-model/ui` kit at `role-model-router/packages/ui`, rewritten `DESIGN_SYSTEM.md` + authority twins, fullscreen AppShell with kit Sidebar/PageFilters/SegmentedControl/MetricStrip/chart primitives.
- Migrates §B runtime pages to Paper 5-0 IA on approved artboards; retires happy-path FactCard/StatusPill walls; Geist typography; 34px form controls; chart semantics on `--rm3-chart-*` only.
- **Fixed Decision #15:** `/app/router/config` legacy redirect → `/app/router/strategy`; Router SegmentedControl has no Config segment; runtime JSON editing remains `/app/system/runtime-config`.
- Wave 4 verification floor green: kit 30 tests · runtime-ui 394 tests · build · validate-ui · Playwright (`sp8-playwright-final2.log`).
- Phase 5 hybrid QA on rebuilt `start-for-qa` at `:3470` (agent scenarios 1–9 PASS; screenshot evidence under `evidence/screenshots/`); human Paper visual sign-off by operator on `2026-08-01` against Paper pages `4-0`/`5-0`/`6-0`/`7-0`.
- Operator polish P1–P8 shipped via locked addenda (`03-implementation-summary.addendum-01.md`, `05-manual-qa.upstream-gap.00-requirements.addendum-01.md`): roles banner removal, high-risk Badge tone, retention GB UI, ranking/time-series chart alignment, role-group expand behavior, non-amber warning pill ink (charts keep amber).
- Pragmatic TDD with SP8/Phase 5 compensating evidence (no per-slice RED/GREEN log archive).
- Worktree: `D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend` on branch `recursive/86-runtime-ui-rm3-design-system-frontend`; diff basis vs `origin/dev` @ `b633056aa52252eaa40a7324ac7018b84d1ea0d9`.
- Server change `not-required`; `publicChange: required` (runtime-ui + kit package).

### Why

- Replace Linear/Apple-era and run-60 Paper-Linear live styling authority with approved RM3 Paper + repo-owned kit without inventing FactCards/Config artboards or coupling production to an external executor checkout.

### How

- Design-system-first Waves 1→4 (SP1–SP8); pragmatic TDD with consolidated SP8 floor; hybrid Phase 5 on rebuilt runtime; serial Phases 6–8 closeout after human sign-off; feature branch `recursive/86-runtime-ui-rm3-design-system-frontend`.

### What was not done (OOS)

- Paper file edits (`OOS1`).
- Backend routing/provider/benchmark changes unrelated to UI consumption (`OOS2`).
- npm publish or live executor checkout coupling (`OOS4`).
- Explore/Catalog shell specimens as product routes (`OOS7`).
- Invented Router Config artboard (`OOS9`; FD#15 redirect instead).
- Origin/`dev` merge remains operator-requested unless authorized separately.

### Soft-close of prior decision

- Soft-closes run `60-runtime-ui-paper-linear-review-alignment` as **live** styling authority for migrated runtime-ui surfaces. RM3 Paper `4-0`/`5-0`/`6-0`/`7-0` + repo `DESIGN_SYSTEM.md` + `@role-model/ui` are now the shipped styling authority; run-60 Linear/Paper-Linear baseline remains historical audit context only.

### Known issues / follow-ups

- Feature-branch merge to origin `dev` is operator-requested.
- Optional residual: rename legacy `--rm-*` call sites to `--rm3-*` where drift remains (non-blocking).
- Local Matrix route remains a `<Navigate>` stub to models `?view=grid` (documented R5 exception).
- Studio Chat/Advanced models-only startup bounded fetch documented in `addenda/03-studio-startup-bounded-fetch.md` (R7).

### Artifact references

- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/00-requirements.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/00-worktree.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/01-as-is.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/02-to-be-plan.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/03-implementation-summary.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/04-test-summary.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/05-manual-qa.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/addenda/03-implementation-summary.addendum-01.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-01.md`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/evidence/logs/sp8-playwright-final2.log`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/evidence/logs/phase5-start-for-qa-3470.log`
- `.recursive/run/86-runtime-ui-rm3-design-system-frontend/evidence/screenshots/`

---

## Run: `85-kw-gated-router-prompt-inject`

Date: `2026-07-29`

### What changed

- Unlocks **gated** live-router production prompt injection under ceremony-backed KW ON + successful gated production retrieve; OFF / soft-OFF and join/retrieve failures refuse with FD31 codes; soft OFF clears inject idempotently.
- Private KW: inject contract v1, bounded payload, receipts, `productionPromptInjection` export unlock when contract satisfied, capability `knowledge:prompt-inject`, tip-safety retention, axis independence vs retrieve/eval.
- Public host: join factory loads packaged private KW; durable auto-arm from Track B production bridge; insertion only via `applyRequestedRoleExecutionPolicy` / `mapChatCompletionsRequest` (never client-trusted activation).
- Honesty/UI/status/probe/contracts updated so inject is no longer claimed "remains locked" / hard-false forever after unlock.
- Private pin advanced to `726df64d241ba03eb34eed35f1785a3963ba0057`, then ship-rebound to `39b56d41d60f703f766f71397ba7c76cd68c8254` for closeout scripts + live-e2e revision honesty; public freeze pin leave-as-is `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`; full Playwright assemble + TB11/system-proof PASS.
- Phase 5 agent-operated on initial rebuilt SEA sha `caa7c9e7a8a0c3ef57a0aaf801d97cd1021817db1443d4d8d7e5e4f97806b424` (`run85-dev`): SEA inject OFF→ON→soft-OFF hop, packaged probe, live `--track=dev` recommendation apply/dismiss, live `pi` storage correctness; binder `secretsOmitted: true`.
- **Post-lock Phase 5 addendum** (`addenda/05-manual-qa.pi-kw-inject-e2e.addendum-01.md`): live `pi` → KW ON → inject on provider capture → storage PASS on SEA sha `1a3ff1ea09cb03b446a31473e261bf89ec51bdf3f1ff0eea770b7f0f05c93795`; evidence `evidence/other/pi-kw-inject-e2e.json`.
- **Post-lock host remediations required for live inject** (public `runtime-host-bridge`, uncommitted until ship): (1) default bounded retrieve query from latest user message when durable KW ON; (2) auto-arm reads the same bridge path mutate writes (`{stateRoot}/{scopeId}/track-b-production-bridge.json`); (3) KW join session id uses next bridge revision (`state.revision + 1`) so activate registration matches auto-arm lookup; (4) auto-arm uses host-owned durable join session (not client `x-session-id`).
- Server change `not-required`; `publicChange: required`.
- Dual in-parent worktrees under `.worktrees/` on branch `recursive/85-kw-gated-router-prompt-inject`.

### Why

- Soft-close run-84 deferred full live-router production prompt-injection residual (`OOS3`/`E6`) and the honesty/export "remains locked" claim for the gated inject contract defined here—without ambient ON, ceremony removal, or training unlock.
- Closeout Phases 6–8 reopened after post-lock live `pi` inject E2E so decisions/state/memory record the host wiring fixes that made the full chain true.

### How

- Strict TDD (private TB10/probe + public host map/join/auto-arm); rebuilt SEA with Track B distribution; agent-operated Phase 5; post-lock live `pi` inject E2E + host wiring TDD; reopen/re-lock Phases 6–8 with addendum folded in; dual-repo feature branches `recursive/85-kw-gated-router-prompt-inject`.

### What was not done (OOS)

- Ungated always-on / ambient KW activation; ceremony removal.
- Profile Learner / GRPO training unlock.
- Stage/main auto-promotion; live `--track=production`.
- Origin/`dev` merge remains operator-requested unless authorized separately.
- Recommendation apply does not imply KW ON or inject.

### Soft-close of prior decision

- Soft-closes run `84-kw-ui-toggle-gated-retrieve-eval` deferred full live-router production prompt injection (`OOS3`/`E6`) **for gated inject only**.
- Soft-closes honesty/export residual that production prompt injection "remains locked" / hard-false forever **after** gated unlock proven.
- Does **not** soft-close training unlock, ambient on, ceremony removal, or stage/main promotion.

### Known issues / follow-ups

- Feature-branch merge to origin `dev` is operator-requested (`R26` ship/merge); public host wiring remediations for live inject remain on the feature branch until that ship.
- Training/GRPO unlock and ambient ON remain explicit future runs.

### Artifact references

- `.recursive/run/85-kw-gated-router-prompt-inject/00-requirements.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/00-worktree.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/01-as-is.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/02-to-be-plan.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/03-implementation-summary.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/04-test-summary.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/05-manual-qa.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/addenda/05-manual-qa.pi-kw-inject-e2e.addendum-01.md`
- `.recursive/run/85-kw-gated-router-prompt-inject/evidence/other/pi-kw-inject-e2e.json`
- `.recursive/run/85-kw-gated-router-prompt-inject/evidence/binder.json`

## Run: `84-kw-ui-toggle-gated-retrieve-eval`

Date: `2026-07-26`

### What changed

- Public Extensions UI exposes Prepare (shadow-ready), Production ON, and Soft OFF for Knowledge Worker via host mutate actions `bootstrap_shadow_ready` / `activate_production` / `deactivate_production`, with honest status distinct from Set mode.
- Private KW production retrieve is gated while OFF (versioned `query.plane` vocabulary + refuse codes); ON unlocks production retrieve and first-party `evaluateWithProductionKnowledge` consumer usefulness; durable `sessionId` activation persists within a session and defaults OFF for a new session/process.
- Ceremony-retained ON and soft OFF → shadow-ready remain; ungated ambient always-on stays OOS.
- Packaged probe covers retrieve/consumer matrix; rebuilt SEA sha `aeb2204310e1675e3559fc72176423e46c0891ebff8dcf7ecf26dc238ffc457e`; Phase 5 agent-operated hops on `run84-dev` (UI Playwright, packaged probe, live `--track=dev` recommendation apply/dismiss, live `pi` storage); binder `secretsOmitted: true`.
- Full Playwright assemble repaired (enabled-control selector + live base URL preference) and PASS; post-assemble TB11/system-proof/pin-freeze PASS. Private pin remains `3d6c4f74a6198287277471f0afc7e8950a6123d8`; public freeze pin leave-as-is `b03d82a2fe8adc317c9fdaecad838beac3ed74a8`.
- Private feature worktree relocated in-parent to `D:/DEV/role-model-internal/.worktrees/84-kw-ui-toggle-gated-retrieve-eval` (addendum; no Phase 0 reopen).
- Server change `not-required`; `publicChange: required`.

### Why

- Soft-close run-83 deferred operator UI control for KW toggle; make “KW useful when ON” an observable gated production retrieve + consumer proof rather than readiness-only honesty.

### How

- Strict TDD (private TB10/probe + public host/UI); rebuilt SEA with Track B distribution; agent-operated Phase 5; serial Phase 6–8 after real work; dual-repo feature branches `recursive/84-kw-ui-toggle-gated-retrieve-eval`.

### What was not done (OOS)

- Ungated always-on / ambient KW activation; ceremony removal.
- Full router prompt-inject / training unlock (gated live-router inject soft-closed by run `85-kw-gated-router-prompt-inject`; training unlock remains OOS).
- Stage/main auto-promotion; live `--track=production`.
- Origin/`dev` merge remains operator-requested unless authorized separately.

### Soft-close of prior decision

- Soft-closes run `83-kw-operator-toggle-assemble-live-e2e-argv-equals` deferred Extensions UI control / honesty-only KW toggle gap (`U1`).
- Records gated production retrieve + consumer usefulness as the observable ON proof.

### Known issues / follow-ups

- Feature-branch merge to origin `dev` is operator-requested (`R22` ship/merge).
- Private feature worktrees must live under parent `.worktrees/` (not external `D:/DEV/.wt/`).
- Deferred full live-router production prompt injection (`OOS3`/`E6`) and honesty “remains locked” for gated inject are soft-closed by run `85-kw-gated-router-prompt-inject`.

### Artifact references

- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-requirements.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-worktree.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/00-worktree-relocation-addendum.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/01-as-is.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/02-to-be-plan.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/03-implementation-summary.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/04-test-summary.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/05-manual-qa.md`
- `.recursive/run/84-kw-ui-toggle-gated-retrieve-eval/evidence/binder.json`

## Run: `83-kw-operator-toggle-assemble-live-e2e-argv-equals`

Date: `2026-07-25`

### What changed

- Knowledge Worker defaults to shadow-ready; soft OFF returns shadow-ready; ceremony ON retains `digest(receipt)===validationReceiptHash`; destructive rollback unchanged; packaged probe covers the toggle matrix.
- Packaged launch accepts equals-form and discrete argv for `--track` / `--scope-id` via shared `resolveFlagValue`.
- Fail-closed evidence-root binding: non-run80 scopes must pass `--evidence-root` (or env) so hops cannot overwrite historical run-80 receipts; restored polluted run-00/run-80 evidence to baseline.
- Full Playwright assemble refreshed live-e2e; private TB00 product pin advanced to `3d6c4f74a6198287277471f0afc7e8950a6123d8`; public freeze pin left at `b03d82a2…`.
- Public Extensions honesty copy updated (`publicChange: required`); public tip `b5482d7c081340572d5cabbea9492ff0e916e82d`.
- Agent-operated Phase 5 on rebuilt SEA sha `825f9b4f…` with equals-form launch `run83-dev`, packaged KW probe, recommendation apply+dismiss, live cloud-track-dev, and pi storage; binder `secretsOmitted: true`.
- Server change `not-required`.

### Why

- Close run-82 equals-form argv and full-assemble follow-ups; ship operator-togglable KW with ceremony retained; keep freeze/TB11 CI honesty after product tip advance; prevent foreign-run evidence falsification.

### How

- Strict TDD for KW toggle, equals-form argv, evidence-root guard, and public honesty; full Playwright assemble (not proof-only-only); serial phase docs after real work; private worktree `D:/DEV/.wt/83-kw`; Phase 5 agent-operated hops with SEA sha recheck.

### What was not done (OOS)

- Ungated always-on / ambient KW activation.
- Public freeze pin retarget.
- Permanent-dev recommendation worker / server product changes.
- Origin/`dev` merge of feature branches remains operator-requested (`R19`).
- Live `--track=production`.

### Soft-close of prior decision

- Soft-closes run `82-tb00-pin-refreeze-kw-digest-bind-launch-scope` Known issues: equals-form argv parsing; optional full Playwright assemble path.
- Soft-closes the run-80 evidence overwrite risk by restoring polluted receipts and fail-closing evidence-root defaults for foreign scopes.

### Known issues / follow-ups

- Feature-branch merge to origin `dev` is operator-requested (`R19`).
- Non-run80 scopes must pass `--evidence-root` / env for launch and lifecycle helpers; do not write under `.recursive/run/80-…` for later-run hops.
- Deferred Extensions UI operator control for KW toggle (`U1` / honesty-only residual) is soft-closed by run `84-kw-ui-toggle-gated-retrieve-eval`.

### Artifact references

- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-requirements.md`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/00-worktree.md`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/01-as-is.md`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/02-to-be-plan.md`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/03-implementation-summary.md`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/04-test-summary.md`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/05-manual-qa.md`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/binder.json`
- `.recursive/run/83-kw-operator-toggle-assemble-live-e2e-argv-equals/evidence/logs/phase5/qa-artifact-recheck.txt`

## Run: `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`


Date: `2026-07-25`

### What changed

- Re-froze private TB00 product pin to `05e7729e8d0f55850fc93ee985b0f20d0ee35da2` with coherent live-e2e/release evidence (proof-only rebind when full Playwright assemble was blocked) so pin-freeze gate + TB11 validate pass without exclusions; public product pin left at `b03d82a2…` (`publicChange: not-required`).
- Hardened gated KW activation: successful `activate(policy)` now requires `digest(policy.receipt) === candidate.validationReceiptHash` (closes run-81 F1); static/class `productionActivation` remains `false`.
- Parameterized packaged launch `--scope-id` via `scripts/track-b/packaged-launch-scope.mjs` (CLI > env > default `packaged-run00`); Phase 5 launched and verified with explicit `run82-dev`.
- Agent-operated Phase 5 on freshly rebuilt private dist + public SEA: packaged/dist KW digest probes PASS; API recommendation apply+dismiss on `--track=dev` / `run82-dev` PASS; binder `secretsOmitted: true`.
- Server change `not-required`.

### Why

- Restore CI-honest TB00 freeze after runs 79–81 product drift; close run-81 digest-binding and launch-scope honesty residuals without ungated KW unlock or stage/main auto-promotion.

### How

- Strict TDD for digest bind, probe, and launch-scope (RED/GREEN); serial phase docs after real work; private short worktree `D:/DEV/.wt/82-tb00`; Phase 5 API hop preferred over browser contingency.

### What was not done (OOS)

- Ungated always-on / ambient KW activation.
- Public product pin retarget / public product source changes.
- Permanent-dev recommendation worker / server product changes.
- Origin/`dev` merge of feature branches remains operator-requested.
- Full Playwright `assemble-run00-live-e2e` path (FD12 proof-only rebind used for freeze coherence).

### Soft-close of prior decision

- Soft-closes run `81-kw-activation-browser-recommendation-evidence` residuals: (F1) receipt↔candidate digest binding and (F3) launch `--scope-id` hardcode.
- Soft-closes the matching pin-freeze/TB11 CI honesty gap called out for shipping after runs 79–81 product tips drifted past the frozen private pin.

### Known issues / follow-ups

- Feature-branch merge to origin `dev` is operator-requested.
- Equals-form argv and full Playwright assemble follow-ups closed by run `83-kw-operator-toggle-assemble-live-e2e-argv-equals`.

### Artifact references

- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/00-requirements.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/00-worktree.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/01-as-is.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/02-to-be-plan.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/03-implementation-summary.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/03.5-code-review.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/04-test-summary.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/05-manual-qa.md`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/evidence/binder.json`
- `.recursive/run/82-tb00-pin-refreeze-kw-digest-bind-launch-scope/evidence/logs/phase5/api-recommendation-lifecycle.log`

## Run: `81-kw-activation-browser-recommendation-evidence`

Date: `2026-07-24`

### What changed

- Shipped instance-local gated Knowledge Worker `productionActivation` unlock behind policy version `1`, operator attestation `activate-production`, verified `knowledge_validation` receipt claims, and a required shadow candidate; static/class `productionActivation` remains `false` (ungated always-on not shipped).
- Extended TB10 for refuse/success/idempotence/rollback/capability/unknown-field refuse; added packaged `run81-kw-activation-probe`.
- Updated public Extensions UI honesty copy to fail-closed / gated / distinct from Set mode (not hard-off wording for KW).
- Captured mandatory browser Playwright recommendation download → preview → apply → dismiss against rebuilt SEA sha256 `825f9b4f2e17f5102605b24943b974efa435133452f0cfa5867b389c14927f84` at `http://127.0.0.1:34568` with secret-free binder evidence.
- Server change recorded as `not-required` (local KW policy + existing permanent-dev recommendation workers).

### Why

- Soft-close the dedicated KW activation policy/lifecycle follow-up left by runs 79/80, and close the optional browser UI live-recommendation residual from run 80, without ungated always-on unlock and without auto-promoting to `stage`/`main`.

### How

- Strict TDD (SP1–SP3 RED/GREEN); dual worktrees (`D:/DEV/.wt/81-kw` short private path + public `.worktrees/81-kw-…`); agent-operated QA M1–M11; phase docs authored serially after real work only (no anticipatory Phase 3.5–8 batching).

### What was not done (OOS)

- Ungated always-on / ambient `productionActivation` unlock.
- Binding activation receipts to a specific candidate `validationReceiptHash` (accepted residual F1; future hardening).
- Parameterizing launch `--scope-id` away from hardcoded `packaged-run00` (honesty residual; browser PASS used that scope).
- Other extension packages / knowledge-store hard-off copy unchanged (`OOS12`).
- Origin/`dev` merge of feature branches remains operator-requested delivery.

### Soft-close of prior decision

- Soft-closes run `80-signed-recommendation-cloud-lifecycle` follow-ups that (1) KW `productionActivation` still required a dedicated later policy/lifecycle run and (2) optional browser UI live evidence remained an open residual. Both are closed by this run’s gated activation + browser PASS evidence.
- Soft-closes the matching dedicated-KW follow-up language under run `79-extension-control-and-recommendations-qa` Known issues (see that entry’s update note).

### Known issues / follow-ups

- ~~Future hardening: bind verified activation receipt digest to the shadow candidate’s `validationReceiptHash`.~~ Closed by run `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`.
- ~~Optional harness: parameterize packaged SEA `--scope-id` (today hardcoded `packaged-run00`).~~ Closed by run `82-tb00-pin-refreeze-kw-digest-bind-launch-scope`.
- Feature-branch merge to origin `dev` is operator-requested (run 81 branch; run 82 also operator-requested).

### Artifact references

- `.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/00-worktree.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/01-as-is.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/02-to-be-plan.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/03-implementation-summary.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/03.5-code-review.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/04-test-summary.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/05-manual-qa.md`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/binder.json`
- `.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/logs/browser-dev-lifecycle.log`

## Run: `80-signed-recommendation-cloud-lifecycle`

Date: `2026-07-24`

### What changed

- Closed the deferred live bound-cloud signed recommendation lifecycle on Cloudflare `--track=dev` (`channel=development`, `https://recommendations-dev.role-model.dev`) against a freshly rebuilt packaged public SEA.
- Added private harness parameterization: `scripts/track-b/run80-recommendation-bindings.mjs`, updated `launch-packaged-runtime.mjs`, `run80-seed-signed-recommendations.mjs` (Windows-safe scope `run80-dev`), and `run80-live-recommendation-lifecycle.mjs` (default apply→reseed→dismiss).
- Added public additive opt-out independence regression in `track-b-operations-api.test.ts`; no public product source change required.
- Proven live hops on rebuilt SEA sha256 `825f9b4f2e17f5102605b24943b974efa435133452f0cfa5867b389c14927f84` with secret-free `evidence/binder.json`.
- Knowledge Worker `productionActivation` remains hard-off (TB10 green).

### Why

- Soft-close run 79’s deferred live signed-material apply/dismiss when bound `--track=dev` material is available, without unlocking KW production activation and without auto-promoting to `stage`/`main`.

### How

- Strict TDD for harness bindings (RED/GREEN evidence); rebuilt SEA via `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`; agent-operated QA M1–M8; controller-authored phase docs after real work (anticipatory Phase 3–8 drafts rejected).

### What was not done (OOS)

- KW / route-package `productionActivation` remains hard-off.
- `--track=production` live writes refused; no stage/main auto-promotion.
- Proposal-corpus docs refresh and TB11 maxItems hygiene remain OOS.
- Origin/`dev` merge of feature branches remains operator-requested delivery.

### Soft-close of prior decision

- Soft-closes run `79-extension-control-and-recommendations-qa` follow-up that live cloud signed-material apply/dismiss remained deferred. That deferral is closed for `--track=dev` by this run’s live PASS evidence.

### Known issues / follow-ups

- KW `productionActivation` dedicated later policy/lifecycle run: **closed by run `81-kw-activation-browser-recommendation-evidence`** (gated instance unlock; static remains false).
- Optional browser UI live evidence residual: **closed by run `81`** mandatory Playwright download/apply/dismiss on rebuilt SEA (API-only preview from run 80 remains valid non-substitute history).
- Feature-branch merge to origin `dev` is operator-requested.

### Artifact references

- `.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/00-worktree.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/01-as-is.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/02-to-be-plan.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/03-implementation-summary.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/03.5-code-review.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/04-test-summary.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/05-manual-qa.md`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/binder.json`
- `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/logs/live-dev-lifecycle-pass.json`

## Run: `79-extension-control-and-recommendations-qa`

Date: `2026-07-24`

### What changed

- Shipped public first-party extension enable/disable (mode) mutation as `POST /api/role-model/extensions/mutate`. That endpoint is the sole public enablement authority; the Extensions UI must not invent a parallel enablement store.
- Wired `/app/system/extensions` to the mutation API while retaining lifecycle/health diagnostics and Knowledge Worker shadow-only boundary copy.
- **Effective Extensions UX (post-lock operator-verify addenda, 2026-07-24):** single **Set mode** control; mode vocabulary includes `disabled` alongside `shadow`/`advisory`/`bounded`/`active`; capitalized design-system `SelectField` labels; intentional operator disable is neutral (not a red health-error banner). Prefer `set_mode` from the UI; HTTP `enable`/`disable` actions remain available on the API.
- Shipped recommendation dismiss as `POST /api/role-model/recommendations/dismiss`, recording a terminal `dismissed` status without applying the pack.
- Mutation and dismiss receipts record audited operator identity with `who=local-operator` (plus what/when/mode/result fields as implemented).
- Hard/mode dependency refusals remain fail-closed via `modeDependsOn` (and related hard-dep) checks; soft deps may degrade without false-healthy active.
- **Packaged SEA verify remediations (same addenda):** stage Track B via `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` when packaging; mark core APIs ready before full extension-host registration completes (avoid persistent `503 runtime_initializing` on overview); clear stale `operator_disabled` health on re-enable.
- Verified against rebuilt packaged public SEA (`role-model-dev`) under agent-operated QA plus post-lock operator verify; dual-repo paired feature branch `recursive/79-extension-control-and-recommendations-qa` with synced run id.

### Why

- Clear the documented post-v1.1 gap that public host lacked enable/disable mutation authority and that recommendations lacked a first-class dismiss path, without unlocking Knowledge Worker production activation.

### How

- Strict TDD (`R5`) with RED/GREEN evidence under the run evidence tree; Phase 3.5 review bundle; Phase 4/5 packaged-runtime and agent-operated QA receipts.

### What was not done (OOS)

- Knowledge Worker / route-package `productionActivation` / production prompt injection remains hard-off (`OOS1`; still locked).
- Live cloud signed-material apply/dismiss against bound `--track=dev` deferred when signed material was unavailable; local/offline dismiss and mutate paths verified (`R3` audit note in Phase 5).
- No auto-promotion to `stage`/`main`.

### Soft-close of prior decision

- Soft-closes run `00-direct-track-b-v1-1-implementation` items that treated public enable/disable mutation API as blocked and Extensions UI as diagnostics-only. Those statements are historical for run `00`; current authority is this run’s mutation API + wired UI.

### Known issues / follow-ups

- Live cloud signed-material apply/dismiss against bound `--track=dev` was deferred in this run; **closed by run `80-signed-recommendation-cloud-lifecycle`** (see that run’s DECISIONS entry and live PASS evidence).
- KW `productionActivation` dedicated later policy/lifecycle run: **closed by run `81-kw-activation-browser-recommendation-evidence`** (gated instance unlock; ungated always-on still OOS).
- Post-lock remediations are authoritative via locked addenda (do not treat the three-button Enable/Disable/Set mode description in locked Phase 3 narrative as the effective UI).

### Artifact references

- `.recursive/run/79-extension-control-and-recommendations-qa/00-requirements.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/00-worktree.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/01-as-is.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/02-to-be-plan.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/03-implementation-summary.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/addenda/03-implementation-summary.post-lock-operator-verify-remediations.addendum-01.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/03.5-code-review.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/04-test-summary.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/05-manual-qa.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/addenda/05-manual-qa.post-lock-operator-verify-remediations.addendum-01.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/06-decisions-update.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/07-state-update.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/08-memory-impact.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/evidence/other/public-product-change-set.md`
- `.recursive/run/79-extension-control-and-recommendations-qa/evidence/other/sp4-sea-receipt.json`
- `.recursive/run/79-extension-control-and-recommendations-qa/evidence/review-bundles/03.5-code-review-bundle.md`

## Run: `00-direct-track-b-v1-1-implementation`

### What changed

- Implemented Direct Track B v1.1 across private `role-model-internal` and public `role-model` worktrees for TB00-TB11.
- Added thirteen canonical private extensions, public extension SDK/host/router substrate, cloud workers, Track A exclusion gates, dual-platform Verifiers/Renderers interop, system proof, paired release, and release validation.
- Private HEAD `8d4b3486c2e78f51ac77a28f90701610c9f3ac43`; public HEAD `fa4b63c2e7220a86d0478ebd809197cc1e485001`.
- Cloudflare multi-track isolation (dev / stage / production) with permanent resource naming, migration `0004_fix_runtime_channel_staging.sql`, shared structured logger `cloud/shared/log.mjs`, operator docs (`docs/cloudflare-cloud-path.md`, `docs/cloud-architecture.md`, `docs/testing.md`), offline `pnpm test:cloud`, and opt-in live harness `scripts/track-b/cloud-track-e2e.mjs`.
- Policy decision: live Cloudflare E2E is **dev + stage only**; default `pnpm test` / CI remain **offline-only** (live = `pnpm test:cloud:e2e`).
- Public Extensions UI diagnostics / lifecycle clarity follow-on (locked addendum `extensions-ui-diagnostics-lifecycle.addendum-01`): deeper per-extension health/lifecycle labeling on `/app/system/extensions` without inventing enable/disable mutation authority and without unlocking knowledge-worker production prompt injection.

### Why

- Close the approved Direct Track B v1.1 requirement set (R1-R19 / 2,979 obligations) with strict TDD and machine-checkable receipts instead of interpretive Track A storage authority.

### How

- Strict TDD RED→GREEN per TB phase; obligation/plan/TDD maps; dual worktrees; dual-platform interop merge; TB11 system proof; `validate-release-evidence.mjs` release gate; recursive-mode audited phases with self-audit where delegation would only restate receipts.

### What was not done (OOS)

- Track A production authority / rich SQLite authority resurrection.
- Knowledge Worker `productionActivation` / production prompt injection (remains shadow-only; Extensions UI must not imply otherwise).
- ~~Public first-party extension enable/disable mutation API (documented blocked dependency; UI reports host lifecycle only).~~ **Soft-closed by run `79-extension-control-and-recommendations-qa` (2026-07-24):** mutation API + Extensions UI wiring now shipped; see that run’s ledger entry.
- No required Track B browser surface remains deferred.
- Human-operated QA sign-off (agent-operated mode selected).

### Known issues / follow-ups

- Localized TB11 `predecessorReceipts` maxItems compensation remains bound by locked `.recursive/run/00-direct-track-b-v1-1-implementation/addenda/03-implementation-summary.upstream-gap.00-requirements.addendum-01.md` and `evidence/release-validation.json`.
- Exact uv 0.11.16 catalog bootstrap used current uv to fetch CPython 3.13.14, then pinned uv 0.11.16 for env creation (runtime conformance recorded in TB09 receipts).
- Historical note: “no public enable/disable mutation API” / diagnostics-only UI limitation is superseded by run `79` (keep this entry for audit history).

### Artifact references

- `.recursive/run/00-direct-track-b-v1-1-implementation/00-requirements.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/00-worktree.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/01-as-is.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/01.5-root-cause.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/02-to-be-plan.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/03-implementation-summary.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/04-test-summary.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/05-manual-qa.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/06-decisions-update.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/07-state-update.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/08-memory-impact.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/addenda/03-implementation-summary.upstream-gap.00-requirements.addendum-01.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/addenda/03-implementation-summary.cloud-logging-tests-docs.addendum-01.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/addenda/03-implementation-summary.cloud-e2e-ci-policy.addendum-01.md`
- `.recursive/run/00-direct-track-b-v1-1-implementation/addenda/03-implementation-summary.extensions-ui-diagnostics-lifecycle.addendum-01.md`
- `docs/testing.md`
- `docs/cloudflare-cloud-path.md`
- `docs/cloud-architecture.md`
- `evidence/tb11-system-proof.json`
- `evidence/tb09-external-interop.json`
- `evidence/release-validation.json`
