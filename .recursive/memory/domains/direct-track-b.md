# Direct Track B domain memory

Type: domain
Status: CURRENT
Scope: Direct Track B v1.1 private/public implementation surfaces, run-79 mutate/dismiss UI, run-80 live signed recommendation lifecycle, run-81 gated KW activation + browser recommendation evidence
Owns-Paths: extensions/; packages/; shared/; cloud/; scripts/track-b/; tests/track-b/; evidence/; fixtures/capacity/; docs/
Watch-Paths: .github/workflows/direct-track-b.yml; package.json; pnpm-workspace.yaml; role-model-router/apps/runtime-host-bridge/; role-model-router/apps/runtime-ui/
Source-Runs: 00-direct-track-b-v1-1-implementation; 79-extension-control-and-recommendations-qa; 80-signed-recommendation-cloud-lifecycle; 81-kw-activation-browser-recommendation-evidence
Validated-At-Commit: working-tree run-81 closeout (private tip at Phase 8; public UI/e2e inventoried in run evidence)
Last-Validated: 2026-07-24
Tags: track-b, verifiers, system-proof, dual-platform, cloudflare, cloud-e2e, extensions-ui, extension-mutate, recommendations-dismiss, signed-recommendations, track-dev, knowledge-worker-activation, browser-e2e

## Summary

Direct Track B v1.1 ships TB00-TB11 with strict TDD, Track A exclusion, dual-platform Verifiers/Renderers interop, system proof, and release validation. Cloudflare workers are track-isolated (dev/stage/production) with structured logging, offline `pnpm test:cloud`, and opt-in live E2E on dev+stage only.

Run `79-extension-control-and-recommendations-qa` shipped public `POST /api/role-model/extensions/mutate` (sole public enablement authority), Extensions UI wiring, and `POST /api/role-model/recommendations/dismiss` (terminal `dismissed`). Mutation/dismiss receipts use `who=local-operator`. Effective UI is a single **Set mode** control with `disabled` in the mode vocabulary (design-system `SelectField`).

Run `80-signed-recommendation-cloud-lifecycle` closed the deferred live `--track=dev` signed recommendation download → apply and download → dismiss loop on a freshly rebuilt packaged SEA (`ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` required). Private harnesses parameterize public root + track/channel (`run80-recommendation-bindings.mjs`, `launch-packaged-runtime.mjs`), seed Windows-safe scopes (`run80-dev`), and drive lifecycle with apply→reseed→dismiss by default. Contribution opt-out alone does not revoke eligible imported recommendations.

Run `81-kw-activation-browser-recommendation-evidence` shipped **gated** Knowledge Worker activation: static/class `productionActivation` remains `false`; instance `#productionActivation` unlocks only under policy version `1` + attestation `activate-production` + verified `knowledge_validation` receipt claims + shadow candidate; rollback clears flag/candidates; unknown policy fields refuse. Extensions UI honesty is fail-closed/gated (distinct from Set mode). Mandatory browser Playwright download → preview → apply → dismiss was captured on rebuilt SEA (effective launch scope still hardcodes `packaged-run00`). Server change was `not-required`. Accepted residual: receipt not yet bound to candidate `validationReceiptHash`.

Post-lock operator-verify remediations from run 79 (locked addenda) still apply for mutate/UI packaging: package SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT`; mark core APIs ready before full extension-host registration; clear stale `operator_disabled` health on re-enable; treat intentional disable as neutral status (not ErrorState).

## Operating notes

- Release gates: node:test Track B suite, `system-proof.mjs`, `validate-release-evidence.mjs`, dual-platform interop merge.
- Cloud: `pnpm test:cloud` offline; `pnpm test:cloud:e2e -- --track=dev|stage` live (production refused). Canonical docs: `docs/testing.md`, `docs/cloudflare-cloud-path.md`.
- Gated KW activation + browser closeout: prefer `.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/` (`binder.json`, `browser-dev-lifecycle.log`, Phase 4/5 logs); helpers `run81-kw-activation-probe.mjs` and TB10 activation cases.
- Live signed recommendation API closeout: prefer `.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/` (`binder.json`, `live-dev-lifecycle-pass.json`); helpers `run80-seed-signed-recommendations.mjs` and `run80-live-recommendation-lifecycle.mjs`.
- Avoid scope ids with `:` on Windows SEA state roots (ExtensionHost mkdir). Prefer `run80-dev`-style scopes. Note launch still hardcodes `--scope-id packaged-run00` for packaged SEA.
- TB11 predecessor maxItems compensation is addendum-bound; do not generalize without re-locking requirements.
- Extensions enablement: call the public mutate API (`set_mode` preferred from UI, including mode `disabled`); do not invent a UI-only enablement store. UI may retain diagnostics alongside Set mode.
- Packaged Track B SEA: set `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` to the private `dist/run00-dev` (or equivalent) before `pnpm runtime:package-sea`; otherwise ExtensionHost will not register the thirteen packages.
- Bootstrap: do not gate all `/api/role-model/*` readiness on full extension registration; overview `runtime_initializing` should be brief warmup only.
- Do not equate Set mode / recommendation apply with KW activation. KW unlock is a separate verified policy path; ungated always-on remains forbidden.
- For run-79 mutation/dismiss/SEA proofs and post-lock remediations, prefer `.recursive/run/79-extension-control-and-recommendations-qa/evidence/` and that run’s `addenda/` post-lock verify docs.
