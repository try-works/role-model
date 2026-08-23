Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `5-manual-qa`
Artifact: `05-manual-qa.md`
Addendum: `09`
Status: `DRAFT`
Inputs:
- `00-requirements.md` (LOCKED)
- `01.5-root-cause.md` (LOCKED)
- `03-implementation-summary.audit-remediation.addendum-01.md` (LOCKED)
- `05-manual-qa.requirements-audit-remediation.addendum-03.md` (LOCKED)
- Stage RC UAT observation at `http://127.0.0.1:3457/app/remote/providers`
- Read-only Stage runtime account, endpoint-admission, endpoint-inventory, and telemetry evidence collected 2026-08-23
Outputs:
- An authoritative remediation contract for OAuth admission, truthful execution-circuit presentation, and configured-provider row rendering.
Scope note: This addendum changes the effective Run 93 admission policy for OAuth-backed accounts. It creates no new run and authorizes no provider request, credential read, reset, or state mutation by itself.

## Root-cause evidence

### Observed state

- The Codex Subscription account is persisted as `active` and `healthy`, and its device-code sessions are `connected`. OAuth therefore completed successfully at the account boundary.
- The configured OpenAI endpoints are independently persisted as `degraded` with secret-free admission reason codes `vendor-down` or `provider-unavailable`; their admission receipts bind the account, endpoint, adapter family, effort where configured, and credential-binding digest, but contain no secret material.
- At least one failed admission was persisted after the account's successful update. The available evidence therefore does **not** prove that a probe always races ahead of the OAuth callback. The actual defect is broader: the activation workflow treats a transport/model readiness probe as a prerequisite for an OAuth-authenticated account's configured endpoints.
- The DeepSeek Flash High and Flash Max endpoint API records contain the base display name and their respective `high`/`max` effort values. The two blank provider rows are therefore a client presentation defect, not absent endpoint metadata.
- Flash High's persisted `blocked_quota` circuit originated in real earlier `402 quota_exhausted` benchmark traffic. That execution circuit is distinct from account admission/health and must not be silently erased or presented as a generic provider outage.

### Confirmed failure boundary

`OAuth callback/account state` succeeds -> `endpoint activation admits by outbound readiness execution` -> endpoint is written `degraded/provider-unavailable` -> configured-provider UI shows the endpoint degradation. Separately, `endpoint API with name + effort` -> `configured-provider browser row` loses the label for Flash High/Max.

## TODO

- [x] Add the focused RED cases in `OAAR-P1` before modifying production admission or provider-row code.
- [x] Implement `OAAR-P2` and `OAAR-P3` in the existing Run 93 worktree; do not create a new repair run.
- [x] Add the focused Pi variant-fidelity RED cases in `OAAR-P5` before modifying `pi-role-model` registration, selection, or downstream dispatch code.
- [x] Implement `OAAR4` with the existing `pi-role-model` package; do not add a parallel plugin, alias shim, or variant registry.
- [x] Rebuild the paired runtime with the exact 13-extension Track B distribution and verify its clean-state package boundary.
- [ ] Complete an operator-assisted OAuth callback browser verification in the isolated rebuilt runtime before proposing any stage replacement.
- [ ] Reconcile the existing pre-addendum recursive-linter failures separately; this addendum does not mask or reclassify them.

## Effective requirement changes

The following clauses supersede the conflicting parts of R2 and R3 for OAuth-backed connection methods only. API-key and other connection methods retain their existing explicit admission policy unless a later approved requirement changes it.

### `OAAR1` — OAuth callback is account-auth confirmation

- A successfully verified OAuth callback is the authoritative proof that the provider account is authenticated. The callback receipt must be durably committed before any configured endpoint projection becomes routable.
- Completing OAuth, reloading the app, or reconnecting the same OAuth account must **not** send an automatic model-execution/readiness request. In particular, it must not send a hidden Responses or chat-completions request merely to classify the connection.
- A configured catalog-supported endpoint under that authenticated account becomes `active` and eligible after local identity/configuration validation. Its operational status is `not-yet-executed` (or an equivalent documented state), rather than `provider-unavailable`, until an actual routed request produces endpoint-specific evidence.
- Account authentication and endpoint operational evidence must remain separate fields. A successful OAuth callback must never claim that a specific model, effort level, quota, or provider capacity was independently proven.

### `OAAR2` — Retry and recovery semantics are explicit

- A pre-existing endpoint degradation caused solely by the old OAuth readiness workflow is cleared/replaced atomically when the same account completes a new valid OAuth callback. The new durable receipt must identify the transition as `oauth-auth-confirmed`, not fabricate a successful model probe.
- Real execution failures remain bound to their exact endpoint instance. `blocked_quota` is not cleared merely because OAuth succeeds; it is cleared only by the documented circuit recovery path, a verified successful eligible execution, or an explicit operator recovery action with an audit receipt.
- The UI must show account authentication, endpoint admission/eligibility, and execution-circuit state without contradictory shorthand. A quota-blocked endpoint may show a healthy authenticated account, but must be visibly non-routable and name the circuit as the reason.

### `OAAR3` — Canonical configured-provider rendering

- Every configured provider row must use the canonical endpoint display projection: base display name plus the endpoint's own normalized effort, for example `DeepSeek V4 Flash (High)` and `DeepSeek V4 Flash (Max)`.
- Rendering may never produce a blank model label when `endpointId`, `modelId`, or an endpoint/model display name is available. The fallback order is exact endpoint display name -> model display name -> catalog upstream ID -> endpoint/model ID.
- Rows with an active execution circuit retain their canonical name and show the circuit state/detail as a separate, accessible status. The display must not collapse an execution `blocked_quota` state into a generic provider health badge.

### `OAAR4` — Pi Role-Model variant fidelity

- `pi-role-model` must treat every configured effort-bearing endpoint as an independent, selectable model instance. A default endpoint and its `low`, `medium`, `high`, `xhigh`, or `max` siblings may share an upstream provider model, but must never share a Pi selection identity, alias, role assignment, health state, benchmark record, or telemetry attribution.
- The exact configured endpoint identity is authoritative at the Pi boundary. Pi discovery, alias resolution, status/list output, and downstream dispatch must preserve the exact configured model/endpoint ID, its normalized effort (`default` for an empty effort slot), its canonical display name, and its upstream provider model ID. They must not reconstruct a sibling identity from a request-level reasoning value.
- A fixed-effort Pi model exposes only the configured effort to Pi's thinking-level mechanism. A Pi client cannot use a request-level thinking/reasoning setting to retarget `DeepSeek V4 Flash (High)` to the default, low, or max sibling. The default endpoint may advertise only the effort capabilities explicitly configured for that endpoint; it must not be labeled as `High` merely because a client supplied a reasoning preference.
- The downstream OpenAI-compatible request must retain the exact selected Pi alias/model identity. `request-intent` may add role/taxonomy context but must never rewrite the selected model, synthesize an effort suffix, or inject a conflicting request-level reasoning value.
- Pi-visible labels must use the same canonical projection as the runtime, for example `DeepSeek V4 Flash (High)`, while preserving the exact endpoint ID for diagnostics. Opaque legacy IDs remain readable for historical records, but all newly generated configured IDs and aliases use the canonical readable effort representation defined by Run 91/93.
- The runtime remains the source of truth for routing, endpoint identity, telemetry, message graph lineage, Track B contribution/recommendation records, and extension state. The plugin may not accept a caller-supplied variant identity that is not present in the runtime discovery record.

## Remediation plan

### `OAAR-P1` — Establish the failure contract with strict TDD

Create focused RED tests before production changes for:

1. OAuth callback completes and persists a healthy authenticated account while asserting zero adapter execution/probe calls.
2. OAuth callback activates a configured default and effort-bearing endpoint only after its durable account-auth receipt exists; `routingEligible`/`benchmarkEligible` are true, but endpoint operational status is explicitly unverified.
3. A previously readiness-degraded OAuth endpoint transitions to the account-auth-confirmed projection after a fresh valid callback, while a distinct quota-blocked endpoint remains blocked.
4. A first real execution failure degrades/circuits only the exact endpoint; a sibling effort variant remains unchanged.
5. The configured-provider view model and rendered route show `DeepSeek V4 Flash (High)` and `(Max)` even when the circuit is quota-blocked, and never emit an empty label.

Store RED command/output paths in the existing Run 93 evidence tree. No provider credential, prompt, header, response body, or OAuth token may be used in test fixtures or logs.

### `OAAR-P2` — Make admission policy connection-method aware

- Split account authentication confirmation from endpoint execution readiness in the host admission state machine and its persisted receipt schema.
- Implement the OAuth branch through the verified callback transaction, not with a timer, a UI assumption, or a synthetic successful probe.
- Preserve the existing exact-probe branch for non-OAuth connection methods. Shared logic must consume an explicit admission policy/capability, not a provider-ID special case, so future OAuth methods follow the same contract.
- Make reconnect/idempotency/concurrency deterministic: duplicate callback completion may not create duplicate endpoints, repeat a probe, or overwrite a newer execution circuit.

### `OAAR-P3` — Repair projection and operator controls

- Route all configured-provider labels through one canonical effort-aware formatter and harden the non-empty fallback in the provider route.
- Expose separate accessible labels for `Account authenticated`, `Endpoint eligible/unverified`, `Execution circuit`, and `Not routable`. Do not reuse `provider-unavailable` for an account whose OAuth callback was verified.
- Where an explicit recovery action already exists, show it only for the execution circuit it affects. If no safe operator recovery action exists for quota, show the persisted occurrence time and truthful guidance instead of an inert retry control.

### `OAAR-P4` — Rebuild and verify before stage promotion

- Phase 4: run the focused host/UI regression suites, relevant restart/rehydration tests, package build, and clean-state artifact checks. Include migration coverage for older OAuth admission receipts.
- Phase 5: launch the rebuilt paired runtime on an isolated port and state root. Complete browser verification of Remote providers for OAuth account state, default/effort label projection, a simulated quota circuit, and no blank rows.
- With explicit operator authorization and the existing credential only, complete at most one bounded Pi CLI alias request after OAuth configuration. Inspect its endpoint identity, routing decision, telemetry, message lineage, and Track B extension receipts. A provider failure must remain secret-free and be reported as exact endpoint execution evidence; no automatic retry loop is allowed.
- Re-audit this addendum against R1-R9 and the effective OAAR requirements before calling Run 93 stage-ready.

### `OAAR-P5` — Prove Pi variant selection and end-to-end lineage

1. Establish strict RED tests before production edits. The initial failing cases must prove that default, low, high, and max siblings of one upstream model:
   - register as four distinct Pi model IDs with canonical display names and normalized effort values;
   - preserve distinct aliases through discovery, alias resolution, status/list output, and role eligibility;
   - expose only the fixed configured effort in each fixed-effort model's thinking-level map; and
   - cannot be retargeted to a sibling by an incompatible Pi thinking/reasoning setting.
2. Add downstream and request-intent regression tests that send the exact high and max aliases through the plugin. Assert that the downstream request carries the exact selected endpoint/model ID, that no taxonomy/instruction path rewrites `model`, and that no conflicting request-level effort is added. Add a default-endpoint test proving a client-supplied `high` preference cannot cause its identity/display/telemetry projection to become `High`.
3. Add a compatibility matrix covering current Pi `0.84.2` thinking levels, empty/default effort, every supported configured fixed effort, historical opaque effort IDs, unknown effort rejection, duplicate alias refusal, and non-variant models. Tests must use only synthetic discovery/transport records and contain no credential, OAuth token, provider header, prompt, or response body.
4. Update the package documentation and user-facing help so Pi users can select an exact configured variant alias, understand the fixed-effort restriction, and distinguish endpoint identity from the upstream provider model. Documentation must not promise that a request-level thinking setting can dynamically choose a runtime sibling.
5. In Phase 4, run the focused Pi package suites plus host/router identity, telemetry, message-graph, restart/rehydration, and Track B integration suites. Build the paired runtime from the changed source tree and retain only secret-free receipts.
6. In Phase 5, using explicit operator authorization and an already configured credential, issue bounded Pi CLI requests to a default alias and at least two configured effort aliases through the rebuilt runtime. For each request, inspect and record the exact selected endpoint identity, normalized effort, routing decision, telemetry row, message-graph lineage, contribution/recommendation identity where that extension is enabled, and Track B extension receipts. A disabled extension must be reported as disabled rather than fabricated as passing. Do not send probes or retry loops solely for verification.
7. Browser verification must show the same canonical endpoint display names and variant identities on Remote providers, Models, Router Candidates/Decisions, Observe Requests/Routing, and overview model-pool projections. The browser and Pi evidence must agree on the exact identity for every exercised request.

## TDD implementation record

TDD Mode: `strict`

### `OAAR1` OAuth-authenticated endpoint admission

- RED: `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`
  now asserts that the first configured Codex Subscription endpoint is active,
  routing- and benchmark-eligible, and `not-yet-executed` after OAuth, while
  the adapter call ledger contains only the explicit user request. It failed
  because activation issued an `admission-…` model execution before the user
  request. Evidence:
  `evidence/logs/red/oaar1-oauth-no-probe-red.log`.
- GREEN: direct and batch admission now use the explicit
  `oauth2-device-code` admission capability rather than a provider-ID special
  case: OAuth-authenticated endpoints transition to `active` with
  `not-yet-executed` operational evidence and an `oauth-auth-confirmed`
  receipt, without invoking the adapter probe. The shared eligibility snapshot
  admits `active/not-yet-executed` endpoints, while probe-based methods retain
  their existing readiness path. A successful callback also restores only
  same-account, probe-only degraded endpoint records to that unobserved state;
  it excludes `model-not-found` and endpoint IDs denied by the execution
  circuit. Evidence: `evidence/logs/green/oaar1-oauth-no-probe-green.log`.
- REFACTOR: eligibility is expressed at the shared snapshot and healthy-endpoint
  predicates, and the callback reconciliation is one bounded helper, avoiding
  a UI-only exception, duplicated OAuth provider list, or circuit reset.

### `OAAR3` blank configured-provider row projection

- RED: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` supplied
  an endpoint with a whitespace-only endpoint name and a blank catalog display
  name. The configured-provider projection produced `" (High)"`, proving that
  a non-null but unusable string bypassed the canonical identity fallback.
- GREEN: the projection now selects the first non-blank endpoint/model label
  before falling back to the upstream model ID and formats the endpoint's own
  effort only after that selection. The full view-model suite passes 49/49.
- REFACTOR: the non-blank selection is a small shared helper within the view
  model so a whitespace-only field cannot bypass canonical label construction.

### `OAAR4` registration identity

- RED: `packages/pi-role-model/test/effort-identity.test.ts` added default, low, high, and max siblings of one upstream model and asserted distinct configured endpoint identities plus normalized effort. The test failed because the registered models exposed no `endpointId`. Evidence: `evidence/logs/red/oaar4-pi-variant-identity-red.log`.
- GREEN: `PiProviderModelConfig`, discovery registration, and exact alias selection now retain `endpointId` and `variantEffort` (`default` when no fixed effort exists). A configured default endpoint exposes no Pi thinking map, while fixed siblings expose only their own level; generic non-endpoint runtime aliases retain their existing capability-driven map. Evidence: `evidence/logs/green/oaar4-pi-variant-identity-green.log`.
- REFACTOR: identity extraction is centralized at discovery mapping, rather than rebuilding variant identity in commands or request-intent.

### `OAAR4` offline refresh identity

- RED: `packages/pi-role-model/test/extension.test.ts` asserted that a persisted High endpoint retains `endpointId` and `variantEffort` in Pi's no-network refresh path. It failed because the restore projection discarded both fields. Evidence: `evidence/logs/red/oaar4-pi-offline-refresh-red.log`.
- GREEN: the restore projection preserves the durable fields when available and uses conservative legacy fallbacks (`model.id` and `default`) for old Pi persisted records. Evidence: `evidence/logs/green/oaar4-pi-variant-identity-green.log`.
- REFACTOR: the fallback accepts only stored non-empty strings; no caller-provided variant is synthesized.

### `OAAR4` Pi 0.84.2 catalog compatibility

- RED: a live discovery mapping containing an `ultra` fixed-effort endpoint made provider registration throw before any supported sibling could be registered. The focused sibling test recorded the failure without a credential or provider request.
- GREEN: a runtime effort which Pi 0.84.2 cannot represent is still registered under its exact configured endpoint ID, but has no Pi thinking-level map. Supported siblings retain their native maps. This prevents a catalog extension from disabling all Role-Model models while avoiding a false `max` substitution for `ultra`.
- REFACTOR: compatibility filtering occurs solely at the Pi presentation boundary; runtime endpoint identity and provider-native fixed effort are unchanged.

### Phase 5 status

Bounded Pi 0.84.2 Stage-runtime verification is recorded in
`evidence/logs/green/oaar4-pi-stage-runtime-e2e.log`: default, High, and Max
configured endpoints all completed and retained identical endpoint/effort facts
through request observation, routing decision, usage telemetry, standalone
message lineage, and Track B shadow receipts.

The first rebuilt-binary packaging attempt correctly stopped—not bypassed—at
the clean-source binding guard while the OAAR3 UI repair was intentionally
uncommitted. It must be re-run from the clean worktree after the OAAR3 commit;
no packaged-binary result is claimed yet.

## Rebuilt-runtime verification evidence

### Clean-source Track B package build

- The Run 93 public source tree was committed before packaging. Its source-tree
  digest is `7d7047831e168dd9b0faf62a980b4016a16be730`.
- The private distribution builder was invoked with that exact public worktree
  as `ROLE_MODEL_PUBLIC_WORKTREE`. It produced a source-bound Track B manifest
  with `extensionCount: 13` and sidecar SHA-256
  `58f15aa1bbc83f6fb8b058abb78eb53d4898e3f130e73c5d04497e908219f355`.
- `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=<run00-dev distribution>`
  `pnpm run runtime:validate-packaging` then passed. Its packaged executable is
  `role-model-dev.exe` with SHA-256
  `38746110b2bae15f01892699b5d41af09b3180d8e605c602d0b7e60596271ddc`.
  The generated package manifest binds the same public source tree and reports
  `extension_count: 13`; the packaging verifier also reported `extensionCount:
  13` and no request IDs were fabricated.

### Isolated browser/runtime boundary

- The packaged executable was launched from its release directory at
  `127.0.0.1:59905` with a new `run93-oauth-package-qa` state root. `/health`
  returned `OK`.
- In the in-app browser, `/app/remote/providers` rendered successfully with a
  deliberately clean state: its visible empty configuration message was
  `No remote endpoints are configured yet`, and the browser console contained
  no errors. This confirms that the package does not inherit an operator's
  configured credentials or endpoint records.
- `/app/system/extensions` reported `INSTALLED 13`, `READY 13`, and
  `DEGRADED 0`, with the thirteen canonical Track B extension identifiers
  listed in the UI. The browser console contained no errors.

### Deliberate remaining boundary

- The isolated state contains no OAuth account or credential. A real OAuth
  callback would be an account/login action and cannot be inferred from the
  package launch, so this record does **not** claim its browser completion.
  The source-level callback behavior is covered by the focused account-repair
  regression. A later operator-assisted verification may authenticate in this
  isolated runtime and confirm the no-probe projection without copying a saved
  credential or state root.

## Scope and safety constraints

- This does not assert that OAuth proves capacity, quota, or all advertised models are available; it proves account authentication and eliminates the hidden readiness execution the user does not want.
- This does not authorize clearing DeepSeek quota state, sending a probe, or changing the live Stage runtime. Such actions require a later implementation phase and, for live traffic, explicit operator authorization.
- Historical admission, routing, telemetry, benchmark, contribution, and recommendation evidence remains readable. Receipt migration must be additive and preserve historical reason codes.
- Pi is an endpoint-identity client, not a second routing authority. It may not infer, fabricate, or silently substitute a reasoning-effort variant from a base provider model.

## Requirement completion status

- `OAAR1` | `implemented; clean packaged runtime verified` | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`. | Implementation Evidence: focused RED/GREEN covers direct and batch OAuth admission and stale probe-only endpoint reconciliation. | Deferred By: operator-assisted OAuth callback in the clean state.
- `OAAR2` | `implemented; clean packaged runtime verified` | Callback reconciliation restores only stale probe-only degradation and preserves a persisted `blocked_quota` circuit-denied endpoint ID. | Evidence: focused OAuth account-repair regression. | Deferred By: operator-assisted OAuth callback in the clean state.
- `OAAR3` | `implemented; clean package browser verified` | Changed Files: `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`. | Evidence: strict blank-label RED/GREEN; full view-model suite 49/49; isolated package browser loaded Remote providers without console errors. | Deferred By: browser rendering against a configured endpoint in the isolated state.
- `OAAR4` | `implemented; live Stage-runtime and clean package boundary verified` | Changed Files: `packages/pi-role-model/src/types.ts`, `packages/pi-role-model/src/downstream-openai.ts`, `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/README.md`, and focused tests. | Implementation Evidence: `evidence/logs/red/oaar4-pi-variant-identity-red.log`, `evidence/logs/red/oaar4-pi-offline-refresh-red.log`, `evidence/logs/red/oaar4-pi-unsupported-effort-red.log`, `evidence/logs/green/oaar4-pi-variant-identity-green.log`, `evidence/logs/green/oaar4-pi-unsupported-effort-green.log`. | Verification Evidence: `evidence/logs/green/oaar4-pi-stage-runtime-e2e.log`; source-bound clean package with all 13 extensions. | Deferred By: fresh package Pi traffic requires an operator-configured isolated credential.
- `OAAR-P1`–`OAAR-P3` | `implemented` | Focused RED/GREEN plus UI/package verification. | Evidence: named records above. | Deferred By: only the explicit operator-assisted OAuth browser action.
- `OAAR-P4`–`OAAR-P5` | `partially verified` | Pair runtime was source-bound, packaged, launched, and verified in the browser with 13/13 Track B extensions ready. Existing Stage Pi proof remains recorded. | Deferred By: credentialed Pi/OAuth flows in an isolated state; no credential/state was copied merely to satisfy a test.

## Coverage Gate

- [x] Separates OAuth account authentication from model/effort operational availability.
- [x] Does not assume an unproven callback/probe race.
- [x] Preserves real execution quota evidence while defining truthful recovery behavior.
- [x] Covers the blank-label regression, durable migration, TDD, package rebuild, browser, Pi, telemetry, lineage, and Track B verification.
- [x] Requires Pi to preserve each configured effort sibling as an independent endpoint identity from discovery through dispatch and extension evidence.
- [x] Requires fixed-effort thinking restrictions, default-effort truthfulness, legacy readability, and full Pi/runtime/browser identity agreement.

Coverage: PASS

## Approval Gate

- [x] The remediation is scoped to the existing Run 93 worktree and post-lock addendum mechanism.
- [x] No mutation, live provider request, or credential handling is authorized by this plan itself.
- [x] Production changes remain subject to strict RED-GREEN-REFACTOR and rebuilt-runtime verification.

Approval: PASS
