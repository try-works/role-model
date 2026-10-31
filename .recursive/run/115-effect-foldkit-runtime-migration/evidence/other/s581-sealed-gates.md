# S581 — sealed packaged rebuild and gate matrix

Sealed artifact built from public HEAD 4284fea5 (version 0.0.20-432-g4284fea5) paired with the private track-B distribution rebuilt against the same public tree (13 extensions, sidecar sha 57713aca…, compatibility generation N).

## Artifact
- Package: role-model-router/dist/release/win32-x64 (role-model-dev.exe, launcher, .bat, sha sidecar, manifest, build/client, track-b-runtime)
- Executable sha256: fdf2441680e664ba86b7ddbdae2cf896bc9bdd8319eddc44de51b3339792da0e
- validate-packaging: healthy, modelCount 8, roleDefinitionCount 28, extensionCount 13, chat + responses output text present.

## Final verification on this artifact
- UI suite: 808/808 in 76 files, tsc 0.
- verify-packaged-candidate: 12/12 maintained journeys PASS.
- audit-rendered-ui: 20/20 routes PASS.
- dialog-a11y-audit: PASS.
- ui-parity: 128/128 PASS.

## Gates
- verify-packaged-candidate: 12/12 PASS (health, models, telemetry, controller, learning, replay jobs, evaluation jobs, ui css, ui bundle, ui theme boot, chat completion, ui shell).
- audit-rendered-ui (packaged exe + packaged static root): 20/20 routes PASS, including /control/providers after accessible names were added to the setup disclosure and control action.
- dialog-a11y-audit: PASS — aria-modal, initial focus Dismiss, Tab trapped, Escape closes, focus returns to the Start device authorization button.
- ui-parity (@role-model-router/ui-parity): 128/128 PASS.
- compare-release: NOT RUN — the script requires --left/--left-exe (the preserved v0.0.20 React artifact) and --right/--right-exe; the preserved artifact is owner-gated and not available in this workspace.

## Fixes that made the gates pass
- Navigation into /control/providers and /control/endpoints now reads the control surface (readControl + loadingControl) like boot does, with a mount-elsewhere-then-navigate test.
- Accessible names on provider-account and device-authorization inputs and on the control action; sr-only utility with a visible focus state for the skip link; 24px targets for the decision detail links and the local-log auto-refresh checkbox.
- The device-authorization form and dialog render below the reference provider cards instead of inside the collapsed setup disclosure, so Start stays visible and Foldkit dialog focus restoration works.

## Remaining owner-gated items
- compare-release needs the preserved v0.0.20 React artifact (or an explicit path/approval).
- Real-client R15/R16-live/R39 approvals and stage/prod Run88 identity remain outstanding.
- Visual-delta sign-off: this batch is structurally verified and audit-clean; pixel-level owner approval is still required.
## Provider catalog wiring (owner-reported defect)
- The Providers page previously rendered placeholder selects (302.AI / 302.AI API Key / Select a model…) so no provider or model could be chosen.
- Added the providerCatalog readback (/api/role-model/providers) at boot and on navigation, seeded the account draft from the first remote provider/variant, and rendered Provider / Connection method / Model from the live catalog: 268 remote providers, real variant labels, per-variant model ids, derived connection id and credential env reference.
- Selecting a provider/variant patches providerId, variantId, authMode, credentialRef and connection id; choosing a model becomes the account allowedModels entry. Creating an account re-reads catalog/providers/models and the Configured provider connections card falls back to the control-surface account rows so new connections are visible.
## Save configuration fix (owner-reported defect)
- Save dispatched a create that the host rejected with `accounts[0].providerKind must be a non-empty string`; the UI surfaced no visible feedback, so it looked like a mock.
- Fixed the catalog seed and selection patch to carry providerKind, fall back from modelInput when Add model was not used so allowedModels is populated, refresh catalog/providers/models plus the control-surface account list after create, and show a visible saved/error line plus a Provider accounts card.
- End-to-end proof on the inspection host: selected abacus + its model, clicked Save, got the visible "Provider account saved." line, and the host stored `abacus.personal.abacus-api-key` with allowedModels ["abacus/claude-3-7-sonnet-20250219"]. The account is disabled/credentials-missing because its credential env variable is not present on that host - honest host validation, not a UI failure.
- Final artifact gates on 0.0.20-431-gedb7b7d7: packaging healthy, verify-packaged-candidate 12/12, audit-rendered-ui 20/20, dialog a11y PASS; UI suite 808/808, tsc 0.
## Provider save -> endpoint activation (owner-reported defect)
- Saving a provider previously only upserted the account; no endpoints were activated, so new models never appeared in the connections list or the routing model inventory.
- The save flow now chains upsert -> optional API-key store (update-key repair) -> endpoint activation (/api/role-model/endpoints/batch) -> reload of catalog, accounts, configured models and endpoints. Existing account status/health/rotation are read from /api/role-model/accounts and preserved so an active connection is not downgraded by a save.
- Configured provider connections group the live endpoint records by account; a host refusal to activate (credentials not ready) is shown as a warning with the host message instead of a silent no-op.
- Verified against the inspection host: saving deepseek with a stored key activated `deepseek.personal.deepseek-api-key.global.deepseek-v4.1-flash` and the routing inventory `/v1/models` now lists the deepseek endpoint aliases. Note: activation requires a ready account; with only an env credential reference and no key/env present the host refuses and the UI warns.
- Full UI suite 808/808, tsc 0.
## Live routing proof and its two root causes (2026-10-31)
- `POST /v1/chat/completions` with `model: "deepseek/deepseek-flash"` now returns 200 with `content: "pong"` through endpoint `deepseek.personal.deepseek-api-key.global.deepseek-flash` (healthy, routingEligible true, 28 role ids).
- Root cause 1: saved accounts had an empty `baseUrlOverride`, so the adapter built the relative URL `/chat/completions` and failed with `Failed to parse URL` (HTTP 503). Selection/seeding now carry the variant base URL or provider apiBase into the payload.
- Root cause 2: our create payload bound models to zero routing roles, so endpoints were never routing-eligible. A roles readback (`/api/role-model/roles`) now defaults a new model to every routing role, matching the page copy "New models start with all roles selected".
- Catalog caveat: `deepseek/deepseek-v4.1-flash` maps to upstream `deepseek-v4.1-flash`, which the vendor rejects (vendor supports `deepseek-flash`, `deepseek-v4-pro`); `deepseek/deepseek-flash` is the model that activates healthy and serves requests.
## Router family wiring (owner-reported defect, 2026-10-31)
- Every /router subpage control was a disabled placeholder: strategy/workloads/agent-strategy passed `undefined` messages, the option values (baseline/shadow/enforce) were not valid host values, and the overview never loaded the router config or candidates, so alias inventory rendered "unresolved".
- Added a RouterPostureState + router-config client that PUTs the unified runtime config (/api/role-model/runtime/config): strategy saves `routing.mode`, `routing.scoring_strategy`, `routing.pin_weights` and `execution_mode`; workload/agent pages edit and replace their JSON blocks (`replace_blocks: true`). Boot/navigation/read plans now load routerConfig + runtimeConfig (and router/routerCandidates/health for the overview), and saves re-read the affected readbacks.
- Live proof on :51970: set mode hybrid / scoring cost / scope decision_only and pressed Save routing strategy — status showed "Routing posture saved.", the host returned 200 and /api/role-model/router/config then reported persisted.strategy=hybrid, executionMode=decision_only, routing.mode=hybrid, scoringStrategy=cost. Overview alias inventory now lists the saved alias rows (hybrid × 2) instead of "unresolved".
- Workloads and Agent strategy expose the reference sections (templates, entries, entries editor) plus a JSON block editor whose save writes the real host block; both save paths returned 200.
- Reference story deviation: the :3456 agent-strategy filter combos (Quality/Baseline/remote) had no backend mapping and were removed; the captured stories for RouterAgentStrategy and RouterWorkloads were updated to the functional layout (Agent strategy / Posture diagnostics / Entries / Entries editor).
- Tests: new s584 router posture wiring test (asserts the exact PUT body and saved status); s383/s540/s563/s565/s26e updated; full suite 809/809.
