# DECISIONS.md

## Recursive Run Index

- `00-direct-track-b-v1-1-implementation` - Direct Track B v1.1 implementation closeout (Phases 0-8). Folder: `.recursive/run/00-direct-track-b-v1-1-implementation/`.
- `79-extension-control-and-recommendations-qa` - Public extension enable/disable mutation API, Extensions UI wiring, recommendation dismiss, packaged-runtime QA (Phases 0-8). Folder: `.recursive/run/79-extension-control-and-recommendations-qa/`. Soft-closes the prior “blocked mutation API / diagnostics-only UI” limitation from run `00`.
- `80-signed-recommendation-cloud-lifecycle` - Live `--track=dev` signed recommendation download/apply/dismiss on rebuilt packaged SEA (Phases 0-8). Folder: `.recursive/run/80-signed-recommendation-cloud-lifecycle/`. Soft-closes run 79’s deferred live signed-material follow-up.
- `81-kw-activation-browser-recommendation-evidence` - Gated KW `productionActivation` policy lifecycle + Extensions UI honesty + mandatory browser recommendation evidence on rebuilt SEA (Phases 0-8). Folder: `.recursive/run/81-kw-activation-browser-recommendation-evidence/`. Soft-closes run 80’s dedicated KW policy/lifecycle follow-up and optional browser UI residual.

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

- Future hardening: bind verified activation receipt digest to the shadow candidate’s `validationReceiptHash`.
- Optional harness: parameterize packaged SEA `--scope-id` (today hardcoded `packaged-run00`).
- Feature-branch merge to origin `dev` is operator-requested.

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
