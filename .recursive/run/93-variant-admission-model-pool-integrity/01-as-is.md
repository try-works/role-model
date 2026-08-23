Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-08-23T13:33:58Z`
LockHash: `9d2f26a38d8767c9cfb93a947048979157afd961a25f5bb16e1783879cd01f9a`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md` (LOCKED)
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-worktree.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/01-as-is.md`
- `/.recursive/memory/domains/role-model-router.md`
- `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`
- Live worktree `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity` at HEAD `cdda5d665fd223a53f5c492ced03d6a29691518f`, diff basis `1aab0512ce23aacc50cea66c2926e374be1e249e`
Outputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/01-as-is.md`
Scope note: Records the current (AS-IS) behavior of effort-aware instance identity, admission readiness, provider/effort failure diagnosis, benchmark identity/refresh, Model Pool projection and colors, and clean-install/docs against the locked R1-R9 contract. No product code is modified in this phase; all evidence is first-hand reads plus delegated subagent reports.

## TODO

- [x] Re-read requirements, worktree, predecessor run 92, memory, STATE, DECISIONS
- [x] Map effort-aware instance identity encoding and legacy readability (R1)
- [x] Map admission-time readiness / lifecycle state machine (R1/R2)
- [x] Map provider/effort failure diagnosis, health thresholds, receipts (R3)
- [x] Map benchmark identity, eligibility, revision-aware refresh (R4)
- [x] Map Model Pool projection (5-max) and candidate colors (R5/R6)
- [x] Map clean-install packaging, artifact scanning, docs (R7/R9)
- [x] Map test/rebuild/extension verification infrastructure (R8)
- [x] Produce Source Requirement Inventory with exact quotes
- [x] Produce Traceability, Evidence, Known Unknowns
- [x] Complete audit sections (Worktree Diff Audit, Subagent Contribution Verification, Gaps, Repair)
- [x] Complete Coverage Gate and Approval Gate checklists
- [x] Record Audit Context and Verdict

## Reproduction Steps (Novice-Runnable)

These reproduce the stage-RC observations motivating Run 93 on a freshly built runtime, and are the behaviors the AS-IS analysis maps to code below.

1. **Overview Model Pool shows only five of seven configured instances**: configure seven DeepSeek endpoint instances (base + effort variants) via the Models → Add flow, then open Overview → Model Pool. Observed: only the top-5 ranked candidates render in the scatter; the remaining two are silently absent with no total-count or "Showing 5 of 7" disclosure.
2. **A failing effort variant is displayed healthy and benchmark-eligible**: configure a reasoning-effort variant whose provider returns `503 upstream_connection_error` on execution. Observe it displayed with `healthStatus: "healthy"` at add time and selectable in Benchmark, because neither add-time nor benchmark selection checks the variant's actual transport health.
3. **Benchmark progress identifies by base model, not the effort instance**: run a benchmark on an effort variant, then inspect the progress/receipt. Observed: identity may collapse to the base model id in some surfaces rather than the effort-bearing endpoint.
4. **Colors repeat across the pool**: render five or more candidates in Overview Model Pool. Observed: the 5th candidate reuses the 1st candidate's color because color cycles by render index over a four-token palette.
5. **Provider-add yields an active instance immediately**: add a remote provider endpoint; observe it is `active`/`healthy` the moment it is persisted, with no `pending-admission` state and no instance-bound readiness probe before routing/benchmark eligibility.
6. **Clean install carries no configured rows but docs do not explain it**: launch a packaged runtime in a fresh isolated state root; the Model Pool is empty (catalog metadata still listed). The install doc explains state location and backup/migration but does not state the clean-install expectation that a fresh root has zero configured instances.

## Current Behavior by Requirement

### R1 — Effort-aware instance identity and lifecycle

**What exists today:**

- Canonical identity encodes effort as a readable suffix. `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`:
  - `createLegacyEndpointId` (lines 40-49) → `${providerAccountId}.${region}.${modelLeaf}`.
  - `createEndpointInstanceIdentity` (lines 71-90) → for a non-null effort, `${legacyBaseEndpointId}-${encodeURIComponent(reasoningEffort)}` (line 82). New public endpoint paths use readable `-high` style suffixes (R1 satisfied).
  - `readLegacyEndpointReasoningEffort` (lines 97-118) decodes the legacy `~effort-v1~<base64url>` suffix, retaining backward readability of opaque pre-Run-91 records (R1 legacy readable satisfied). `EFFORT_PREFIX` at line 17.
  - `normalizeReasoningEffort` (51-69) NFC-normalizes, bounds to 128 UTF-8 bytes, rejects control/format chars.
- The effort identity is stamped on router candidates (`index.ts:21340-21347` computes `membershipRevision` over `providerAccountId/modelId/endpointId/reasoningEffort` tuples) and persisted decisions (`toRouterDecisionData` at index.ts:21420-21447 records `reasoningEffort` + `effortSource`).
- `effort-identity.ts` (runtime-ui) shares display formatting across pages: `formatEndpointDisplayName`, `formatEndpointDisplayPath`, `formatCompactEndpointDisplayName`, `formatModelIdentity`. The legacy `~effort-v1~` decode is implemented in both `effort-instance-identity.ts:17` and `effort-identity.ts:14`.

**Gaps (R1 not met):**

- **No durable per-instance lifecycle state machine.** The candidate path models only binary endpoint `status` (`active`) and `healthStatus` (`healthy`/`offline`/`degraded`/etc.). There is no `pending-admission`, no transition timestamp/reason-code/sanitized-receipt per transition, and no `removed` lifecycle record with a sanitized receipt for the effort-variant. `activateRuntimeEndpoint` (index.ts:18542-18715) immediately sets `status: "active"` and `healthStatus: "healthy"` (lines 18677-18678) with no pending phase and no transition receipt.
- **Independent eligibility/readiness/benchmark/telemetry/colors for each variant is partial.** Identity and routing decisions are effort-aware, but `routingEligible`/`benchmarkEligible` are derived from the routable inventory (`buildEffectiveEligibilitySnapshot` index.ts:21317-21327) keyed by endpoint; the binary health model means one variant's health does not isolate its own admission, and candidate-space colors are index-based (R6), not identity-based.

### R2 — Admission-time readiness

**What exists today:**

- Add workflow validates the account and static catalog effort before persisting: `activateRuntimeEndpoint` checks `account.status === "active" && account.healthStatus === "healthy"` (18561-18564), `allowedModels` (18569-18570), and effort serialization availability (18559-18666 region). It does **not** send a live provider request.
- A probe exists but only at bootstrap: `sessionBootstrapStages.remoteHealth` (index.ts:27728-27771) calls `probeRemoteEndpoints`, but only when `executionMode !== "decision_only"` and only if targets exist; it probes the catalog `GET /v1/models`, not a chat completion with the effort payload.
- Execution failures are tracked by a circuit breaker: `execution-circuit-breaker.ts` `recordExecutionCircuitFailure` (line 358) with deterministic thresholds (`CONNECTION_OPEN_DURATIONS_MS`, `PROVIDER_5XX_OPEN_DURATIONS_MS` at lines 12-13; `EXECUTION_CIRCUIT_RESET_AFTER_MS = 5min` line 7), state machine `probation/open/half_open/blocked_auth/blocked_quota` (line 27-32), and sanitized receipts. `recordExecutionFailureCooldown` (index.ts:4225-4269) writes transition state; receipts expose `failureCount`, `nextProbeAtMs`, `circuitState` without secrets.

**Gaps (R2 not met):**

- **No `pending-admission` state.** Add/re-add immediately activates (index.ts:18677-18678). The instance is routing/benchmark-eligible (routable inventory excludes only `offline`/`provider-unavailable`/`provider-outage`/`degraded`/policy-blocked, `routable-inventory.ts:39-44`) without an instance-bound readiness probe passing.
- **No add-time/retry probe bound to identity+adapter+endpoint+credential+effort.** The only probe is the bootstrap `GET /v1/models` catalog check, which never sends the effort payload.
- **No sanitized durable admission receipt on add.** There is no admission-receipt record on activation; only the circuit-breaker writes execution cooldown receipts (which are durable).
- **`isHealthyEndpoint` misclassifies degraded as healthy.** `benchmark-runner.ts:330-332`: `return healthStatus !== "policy-blocked" && healthStatus !== "offline"` — so `degraded`, `provider-unavailable`, and `provider-outage` endpoints are treated as healthy for benchmark target selection (`benchmark-runner.ts:1652-1654`). A Flash-High-style endpoint in `provider-unavailable` is still benchmark-eligible.
- **Benchmark failures do not update circuit health.** `recordExecutionCircuitFailure` (execution-circuit-breaker.ts:372-374) ignores non-`live` traffic classes, so benchmark failures never trip the circuit; combined with the misclassification above, a failing instance can remain "healthy" and benchmark-eligible.
- **No documented deterministic health threshold surfaced into candidate `healthStatus`.** The circuit-breaker policy exists but `listRouterCandidateData` sets candidate `healthStatus` from `runtimeEndpoints[].healthStatus` (index.ts:21389-21391), which is `"healthy"` at activation and only updated by bootstrap probes — execution circuit failures do not fold into candidate health.

### R3 — Diagnosable provider and effort failures

**What exists today:**

- Provider adapters serialize effort where supported: `provider-openai` emits `reasoning_effort` (tests at `provider-openai/test/index.test.ts:674` for `max`, `:890` for `high`). Activation validates effort is catalog-advertised (index.ts:18659-18666).
- Probe reasons are mapped to health status: `mapProbeReasonToHealthStatus` (`remote-health-probe.ts:54-69`) → `healthy`, `provider-unavailable` (vendor-down), `offline` (timeout), `degraded` (auth/model-not-found/credentials-missing). Probe receipts carry `reason`, `healthStatus`, `message`, `latencyMs`, `endpointId`, `modelId` — no credentials/prompts/bodies.
- Execution failure receipts are sanitized: `RuntimeExecutionFailedAttemptReceipt` (`index.ts:22239-22278`) carries `failureClass`, `retryable`, `fallbackEligible`, `failurePhase`, `statusCode`, `cooldownRecorded`, `cooldownFailureCount` — no secrets/prompts.
- Adapter tests cover connection methods: `remote-health-probe.test.ts` covers 200→healthy, 401→auth/degraded, refresh retry, model-not-found→degraded, vendor-down→provider-unavailable, probe headers.

**Gaps (R3 not met):**

- **Anthropic adapter does not serialize reasoning effort.** `provider-anthropic/src/index.ts` `buildAnthropicRequest` (lines 87-120) emits model, messages, system, temperature, max_tokens, stream, tools — no `thinking`/`budget_tokens`/`reasoning_effort`. So an Anthropic effort variant's exact effort payload is never sent. Adapter effort coverage is incomplete.
- **OpenAI adapter tests cover only `max`/`high`, not every catalog-advertised effort level.**
- **No deterministic adapter/transport test for the Flash High `503 upstream_connection_error` path.** The probe uses `GET /v1/models` (never a chat completion), and no test asserts the 503 `upstream_connection_error` → degraded/offline classification or that it cannot appear healthy.
- **Health/eligibility is not a single authoritative projection across surfaces.** `isHealthyEndpoint` (benchmark-runner) treats `provider-unavailable`/`degraded` as healthy, while `routable-inventory.ts:39-44` treats them as unroutable, while `listRouterCandidateData` sets `healthStatus` from `runtimeEndpoints`. The three disagree, so Models/Remote/Connect/candidates/Model Pool do not share one authoritative health/admission state.
- **Flash High can be displayed healthy with 32 requests all `503`** because execution `503` failures neither update candidate `healthStatus` (only bootstrap probe does) nor get admitted/evicted — matching the stage-RC observation.

### R4 — Benchmark identity, eligibility, and refresh

**What exists today:**

- Benchmark manifests persist effort-bearing identity: `benchmark-artifacts.ts` manifest carries `endpointIds`, `profileRevisionByEndpointId`, `completionState` (`running`/`completed`/`failed`/`cancelled`/`stale`). `benchmark-runner.ts:1837,1845` write `endpointIds` and `profileRevisionByEndpointId`; progress created with `request.endpointIds` (1634-1650). The execution receipt is bound to the effort-bearing endpoint id.
- Run 92 membership/provenance quarantine is present: `readCurrentBenchmarkPortfolio` (`benchmark-summary.ts:593-660`) filters to `completionState === "completed"` + `membershipRevision` match + non-empty `profileRevisionByEndpointId` (lines 598-605); `readLatestBenchmarkProfilesByEndpointIds` (`sqlite-memory/src/index.ts:4818-4882`) skips membership-mismatch samples (4852) and non-`completed`/`stale`/`failed`/`cancelled` (4859-4868). Failed/skipped samples do not surface as successful current benchmark evidence.
- Routing decisions persist effort identity + membership/profile revision: `toRouterDecisionData` (`index.ts:21420-21447`) records `selectedEndpointId`, `reasoningEffort`, `effortSource`, `membershipRevision`, `profileRevision`.

**Gaps (R4 not met):**

- **Non-active instances are not reliably rejected before benchmark traffic.** `isHealthyEndpoint` (`benchmark-runner.ts:330-332`) treats `degraded`/`provider-unavailable` as healthy, so a degraded/unavailable instance is benchmark-eligible (target selection at 1652-1654). This conflicts with "non-active instances are rejected before benchmark traffic."
- **No push refresh across pages.** Benchmark completion re-fetches candidates on the Benchmark page (`control-benchmark.tsx:713-715` → `refreshBenchmarkState` re-fetches `fetchRouterCandidates` 375-385), but the Overview Model Pool only refreshes on its own poll/socket; there is no shared revision invalidation that refreshes every affected profile without restart/reload. R4's "revision-aware invalidation that refreshes every affected profile without restart or browser reload" is partially met by membership-revision filtering but not by a cross-page push.
- Progress/result attribution is effort-bearing at the manifest/progress level; but the UI picker identifies candidates by endpoint id with effort (control-benchmark uses candidates' endpointId) — this appears effort-aware, though the primary R4 gap is the eligibility misclassification and lack of cross-page refresh.

### R5 — Complete, synchronized Model Pool

**What exists today:**

- The backend does **not** truncate: `listRouterCandidateData` (`index.ts:21337-21419`) returns `currentRegistry.endpoints.map(...)` (line 21353) with no slice/limit; `GET /api/role-model/router/candidates` returns it verbatim (index.ts:15469-15476). The full candidate list reaches the browser.
- Router Candidates page shows all candidates (`router-candidates.tsx` maps `candidates`, no truncation) via `selectOverviewRouterCandidates` default `limit = Infinity` (`router-candidate-labels.ts:26-40`).
- Candidate state derives raw tags: `candidate-space.ts` `evidenceOf` → `none|partial|complete` (197-210), `candidateTags` (212-237), `isExcluded` = `ignored || !routingEligible` (239-241).

**Gaps (R5 not met):**

- **The Overview Model Pool silently truncates to five.** `candidate-space.ts:248-250` `buildCandidateSpacePoints(candidates, limit = 5, ...)` with enforcement `.slice(0, Math.max(0, limit))` at line 291; `dashboard.tsx:223` calls `buildCandidateSpacePoints(candidates, 5, pricingByModelId)`. No total-count disclosure, no scroll/pagination (`candidate-space-chart.tsx:178-180` uses `overflow-hidden` + `max-h-[360px]`; legend lists only the truncated pool).
- **No unified canonical projection across the six surfaces.** Identity formatting is shared (effort-identity.ts) but each surface builds its own projection: Overview scatter (buildCandidateSpacePoints + CandidateSpaceChart), Router table (selectOverviewRouterCandidates), Router Candidates cards (page-local format helpers), Models cards (resolveSelectedBenchmarkCandidate + own pills), Observe/telemetry (separate color model), Connect (buildRuntimeConnectionRows), sidebar (buildSidebarModels with `SIDEBAR_MODEL_LIMIT = 8` at sidebar-footer.ts:19,134).
- **The eight required candidate states are not explicitly modeled.** No enum for no-requests / failed-only / insufficient-samples / usable / no-benchmark / benchmark-available / selected / degraded. `evidenceOf` only distinguishes `none|partial|complete` by C/Q/S null-ness; `telemetryScores.taskRollups` carries `sampleCount`/`minimumSampleCount` (runtime-api.ts:1170-1184) but is not surfaced as a first-class state.
- **Cross-surface refresh is per-page/poll-driven** (see R4); admission/health/benchmark events do not coherently push a refresh to every affected surface.
- **Decisions persist exact identity + membership/profile revision** for the selected endpoint (`toRouterDecisionData`), but do not persist a per-instance profile revision or C/Q/S snapshot for every scored candidate in the pool (only the chosen endpoint's revision is first-class; the rest is an opaque `detail.decision` JSON dump).

### R6 — Deterministic accessible candidate colors

**What exists today:**

- Color tokens: `CandidateSpaceColorToken = "serria" | "royal" | "emerald" | "coral" | "muted"` (`candidate-space.ts:24`). `COLOR_CYCLE = ["serria","royal","emerald","coral"]` (line 46). Stroke/fill/swatch map tokens to RM3 vars (`candidate-space-chart.tsx:16-38`).

**Gaps (R6 not met):**

- **Colors are index-based, not deterministic-by-identity.** `candidate-space.ts:312`: `colorToken: excluded ? "muted" : (COLOR_CYCLE[index % COLOR_CYCLE.length] ?? "serria")` — color is driven by the post-rank array index, not by `endpointId`/`modelId`.
- **Colors repeat for 5+ candidates.** With a 4-token cycle, indices 0-3 → serria/royal/emerald/coral, index 4 → serria again. Two or more simultaneously visible candidates share a color.
- **Order-dependent.** A re-rank (score/eligibility change) silently swaps candidate colors, so an instance is not color-stable.
- **No test covers >4 candidates, ordering changes, or palette-exceeding pool sizes.** `candidate-space.test.ts` uses ≤2 candidates throughout; the `index % COLOR_CYCLE.length` math is never exercised past index 3, and no distinctness assertion exists (contrast `telemetry-analytics.test.ts:138,263` which asserts distinct colors for Observe series via `pickDistinctSeriesColorToken`, a separate model).

### R7 — Clean install and artifact integrity

**What exists today:**

- Production packaging rejects fixture/mock/QA artifacts: `package-sea.ts` `forbiddenProductionReleasePathFragments` (lines 151-158: `testdata/`, `.recursive`, `fixtures/provider-accounts.json`, `fixtures/observability-history.json`, `fixtures/registry-sources.json`) and `forbiddenProductionReleaseTextMarkers` (160-167: `phase5.mock`, `mock.openai`, `openai.litellm`, localhost ports, etc.). `assertProductionReleaseHasNoQaArtifacts` (227-265) throws if any are present in the release dir.
- `validate-packaging.ts` uses a **synthetic credential sentinel**: `packagingValidationCredentialValue = "packaging-validation-key"` (line 18) injected via env `SP7_MOONSHOT_API_KEY` (line 17), never a real secret. It exercises add-account + chat + responses against a mock server, verifying the packaged runtime works with a fake credential.
- A fresh isolated state root: `runRuntimePackagingValidation` creates `mkdtemp(os.tmpdir()/role-model-runtime-sea-)` (line 536) and the packaged runtime starts empty; accounts are added only via the validation flow.
- Additional first-hand (delegated R7/R9 confirmation): `cli.ts:230-250` defines `EMPTY_REGISTRY` (`endpoints: [], diagnostics: [], lifecycleSummary: {...}`) and `EMPTY_CATALOG` (`providers: [], models: []`) used as the pre-backend default; `package-sea.ts` `standaloneReleaseCopies` (112-149) stages only catalog data/protocol/taxonomy/extension host-sdk/UI build/litellm price data — never a developer state root or credentials. CI duplicate guard: `.github/workflows/build-binaries.yml:368-397`.

**Gaps (R7 not met):**

- **No explicit automated artifact inspection that the synthetic credential sentinel is absent from the packaged payload.** `assertProductionReleaseHasNoQaArtifacts` rejects fixture/mock markers but does not scan the SEA blob/archive for the synthetic credential value or assert a "no real secret used" property. The sentinel is used as a runtime credential, not asserted-absent from the artifact.
- **No explicit test asserting "fresh isolated state root has zero configured endpoints and an empty Model Pool."** `EMPTY_REGISTRY`/`EMPTY_CATALOG` exist but there is no assertion that a pristine root begins with zero endpoints and an empty pool; the validation confirms add-account works only.
- **Documentation partial:** `docs/public/install.md` explains state location (`%LOCALAPPDATA%\role-model-runtime`), backup/migration of `track-b\managed-keys`, runtime channels; `README.md:82-99` covers backup/keys/fail-closed. It does **not** explicitly explain the clean-install expectation (fresh root = zero configured instances) nor the credential-reference model for remote provider endpoints (only env-based keys mentioned).

### R8 — TDD, regression, rebuilt-runtime, extension verification

**What exists today (infrastructure):**

- Test commands exist: `test:critical` (host-bridge `account-repair`, `unified-runtime-config`, `provider-overlap-metadata`, `benchmark-summary`, `validate-observability`, `validate-ui`), `test:router`, `runtime:test-full`, `runtime:validate-packaging`, `runtime:validate-observability`, `test:track-b-*`, `ci:check`. Baseline from Phase 0: host-bridge 26 passed, runtime-ui 15 passed on the four backend + two UI files.
- Rebuilt-runtime verification: `runtime:validate-packaging` (`validate-packaging.ts`) builds the SEA, spawns it on a fresh temp state root against a mock upstream, exercises account/endpoint/role-policy/models/chat/responses/requests/taxonomy/extension APIs, tears down; `package-sea.ts` scans for QA artifacts. CI: `build-binaries.yml:297-341` (Package SEA runtime, manifest identity), `:368-397`.
- Extension verification exists: `exercisePackagedExtensionCatalogValidation` (`validate-packaging.ts:505-520`) confirms the packaged runtime serves the extension catalog including `evaluation-core`; CI asserts exactly 13 extensions (`build-binaries.yml:332`).
- Pi CLI: `smoke` runs `@role-model-router/gateway-smoke`; scripts exist under `scripts/track-b/`.

**Gaps (R8 not met):**

- The specific RED-GREEN-REFACTOR evidence for the new admission/lifecycle/color/profile-refresh changes does not yet exist (this is Phase 3's job — R8 sets the contract, and the AS-IS state is that these behaviors are untested at the >5/color/admission layers).
- No tests cover the admission pending→active lifecycle, per-variant roles, probe idempotency/concurrency, effort payloads across all adapters, health policy folding into candidate status, legacy projection, cross-page profile refresh, candidate color determinism, or package sentinel scanning.
- Phase 5 rebuilt-runtime + Pi CLI verification is a Phase-5 deliverable, not current.

### R9 — Operator-facing explanation

**What exists today:**

- Readiness surfaces exist: Connect/Endpoints shows `readinessLabel`/`statusTone`/`routing ineligible` (`endpoints.tsx:98-152,263`); Router shows alias readiness `ready/degraded` (`router.tsx:83-106,185-252`); session-readiness page (`session-readiness.tsx`); runtime page shows `lifecycleSummary.degraded` (`runtime.tsx:99-101`); Models shows controller-pending states (`control-models.tsx:1081`) and circuit detail in `view-models.ts:536-601` (`Circuit open` + `Retry in Xm Ys` 557-566, `blocked_auth` "Update or reconnect" 576-583, `blocked_quota` "Restore provider quota before retrying" 584-591).
- Benchmark controls show effort-bearing identities via `formatCompactEndpointDisplayName`/`formatEndpointDisplayPath` (`control-benchmark.tsx:801,855,858`; `effort-identity.ts`); "Excluded by current execution mode" disclosure with `Badge "excluded"` (`control-benchmark.tsx:882-909`).
- The literal string `admission` has zero matches across `*.ts`/`*.tsx`; the concept is surfaced under `routingEligible`, `status`, `readiness`, `circuit`, `lifecycle`, and `healthStatus`.

**Gaps (R9 not met):**

- **No provider-add/Models/Benchmark/Connect/Overview surface explains admission status, readiness reason, retry consequences, or degraded exclusion.** There is no `pending-admission` concept anywhere in the UI; degraded exclusion is not explained (and is not even consistently enforced — benchmark treats degraded as healthy).
- Benchmark progress shows effort-bearing identities in the picker/table, but the run-progress label uses the raw `currentEndpointModelId` (`control-benchmark.tsx:75,109`), not the readable effort-bearing path, and does not explain read-only/degraded exclusion reason.
- Docs (R7 gap) do not explain clean state and safe migration expectations for remote provider credential references.

## Source Requirement Inventory

- R1 | Disposition: in-scope | Source Quote: "A durable state machine exposes `pending-admission`, `active`, `degraded`, and `removed` (or documented equivalents), with timestamp, reason code, and sanitized receipt/reference per transition." | Summary: Effort-aware independent instance identity + readable legacy; per-instance lifecycle state machine with receipts.
- R2 | Disposition: in-scope | Source Quote: "Add/re-add creates `pending-admission`; the instance is not routing-eligible or benchmark-eligible until its instance-bound readiness probe succeeds." | Summary: Admission-time probe bound to identity/adapter/endpoint/credential/effort; pending→active; idempotent; health policy.
- R3 | Disposition: in-scope | Source Quote: "Flash High's 503 failure path has a deterministic adapter/transport test and, when a live credential is available in Phase 5, one bounded admission attempt. It must produce either verified success or truthful degraded state—not a false healthy claim." | Summary: Distinguish provider/credential/transport from unavailable effort; sanitized receipts; one authoritative health/admission projection; Flash High 503 deterministic test.
- R4 | Disposition: in-scope | Source Quote: "Non-active instances are rejected before benchmark traffic; failed/skipped instances cannot appear as successful benchmark evidence." | Summary: Effort-bearing identity through benchmark lifecycle; reject non-active; revision-aware cross-page refresh; Run-92 membership/provenance preserved.
- R5 | Disposition: in-scope | Source Quote: "No API or presentation silently truncates candidates at five. Bounded viewports disclose a total and retain all candidates via accessible scrolling/pagination." | Summary: Complete synchronized Model Pool; no silent 5-truncation; unified canonical projection; explicit 8-state candidate model; decisions persist identity+revision.
- R6 | Disposition: in-scope | Source Quote: "No simultaneously visible candidates share a color; assignment scales beyond the current seven without cycling a four-color palette." | Summary: Deterministic identity-based colors, no repeats among visible candidates, >7 scalable, RM3 tokens, tests.
- R7 | Disposition: in-scope | Source Quote: "A fresh isolated state root has zero configured endpoint instances and an empty Model Pool." | Summary: Clean install = app/catalog only; reject fixtures/mocks/dev root; sentinel-absence scan; docs explain state/backup/migration.
- R8 | Disposition: in-scope | Source Quote: "Every production behavior change has RED-GREEN-REFACTOR evidence: focused failure first, minimal fix, then affected regression suite." | Summary: TDD/regression/rebuild/extension verification gate.
- R9 | Disposition: in-scope | Source Quote: "Provider-add, Models, Benchmark, Connect, and Overview explain admission status, readiness reason, retry consequences, and degraded exclusion." | Summary: Operator-facing explanation of admission/readiness/reason/retry/degraded across surfaces; effort-bearing benchmark identities; docs clean-state.

## Relevant Code Pointers

- Identity: `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts` (createEndpointInstanceIdentity 71-90, readLegacyEndpointReasoningEffort 97-118, EFFORT_PREFIX 17); `role-model-router/apps/runtime-ui/app/lib/effort-identity.ts` (formatters 43/90/111/159, legacy decode 103-107).
- Add/admission: `role-model-router/apps/runtime-host-bridge/src/index.ts` `activateRuntimeEndpoint` 18542-18715 (status active/healthy 18677-18678); `activateEndpoint` 26199-26204; `listEndpoints` 26245-26270.
- Probe/health: `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` (mapProbeReasonToHealthStatus 54-69, probeRemoteEndpoints 268-285, buildModelsProbeUrl 106-112); bootstrap probe `index.ts:27728-27771`.
- Circuit breaker: `role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts` (durations 12-13, states 27-32, recordExecutionCircuitFailure 358); `index.ts:4225-4269`.
- Benchmark: `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` `isHealthyEndpoint` 330-332, target selection 1652-1669; `benchmark-summary.ts` `readCurrentBenchmarkPortfolio` 593-660; `benchmark-artifacts.ts` manifest 91-101; `sqlite-memory/src/index.ts` `readLatestBenchmarkProfilesByEndpointIds` 4818-4882.
- Candidates/Model Pool: `role-model-router/apps/runtime-ui/app/lib/candidate-space.ts` (limit 248-250/291, COLOR_CYCLE 24/46/312, evidenceOf 197-210, isExcluded 239-241); `routes/dashboard.tsx:223`; `components/candidate-space-chart.tsx` (overflow-hidden 178-180); `lib/router-candidate-labels.ts` (selectOverviewRouterCandidates 26-40); `routes/router-candidates.tsx`; `lib/sidebar-footer.ts` (SIDEBAR_MODEL_LIMIT 19, 134).
- Candidates API: `role-model-router/apps/runtime-host-bridge/src/index.ts` `listRouterCandidateData` 21337-21419; GET candidates 15469-15476; `buildEffectiveEligibilitySnapshot` 21317-21327; `routable-inventory.ts` UNROUTABLE 39-44, isRoutableEndpoint 89-106.
- Decisions: `index.ts` `toRouterDecisionData` 21420-21447.
- Packaging: `role-model-router/apps/runtime-host-bridge/src/package-sea.ts` (forbidden fragments 151-167, assertProductionReleaseHasNoQaArtifacts 227-265, standaloneReleaseCopies 112-149); `validate-packaging.ts` (synthetic sentinel 17-20, runRuntimePackagingValidation 522-654, extension catalog 505-520); `cli.ts` (EMPTY_REGISTRY 230-238, EMPTY_CATALOG 240-250).
- Docs: `docs/public/install.md`, `README.md` (82-99).
- UI readiness surfaces: `routes/endpoints.tsx` 98-152/263, `routes/router.tsx` 83-106/185-252, `routes/session-readiness.tsx`, `routes/runtime.tsx` 99-101, `routes/control-benchmark.tsx` 75/109/801/855/858/882-909, `lib/view-models.ts` 536-601.

## Known Unknowns

- Whether `buildEndpointRegistry` dedupes/sorts endpoints, which affects color stability via rank.
- Whether backend `scored_candidates` (index.ts:2491,5149,5247) shares identical score math with the UI `candidate-space` projection.
- Exact set of catalog-advertised effort levels across all providers and whether every level has an adapter serialization test.
- Whether any "insufficient successful samples" label exists in candidate context (none found; only `minimumSampleCount` field).
- Whether the Models route's `circuitLabel`/`circuitDetail` are rendered in the JSX meta panel (needs runtime confirmation in Phase 5); admission is a boolean `routingEligible`, not a reason string.
- Whether benchmark run-progress label (`currentEndpointModelId`) should be replaced with the effort-bearing endpoint display path (Phase 2 design decision).

## Evidence

- First-hand reads (this phase): `effort-instance-identity.ts`, `effort-identity.ts`, `candidate-space.ts`, `candidate-space.test.ts`, `dashboard.tsx`, `candidate-space-chart.tsx`, `router-candidate-labels.ts`, `overview-chart-adapter.ts`, `observe-chart-adapter.ts`, `telemetry-analytics.ts`, `routable-inventory.ts`, `remote-health-probe.ts`, `remote-health-probe.test.ts`, `execution-circuit-breaker.ts`, `benchmark-runner.ts`, `benchmark-summary.ts`, `benchmark-artifacts.ts`, `sqlite-memory/src/index.ts` (4818-4882), `package-sea.ts`, `validate-packaging.ts`, `docs/public/install.md`, `README.md`, `index.ts` regions (18542-18715, 21317-21447, 27728-27771), `provider-openai/test/index.test.ts`, `provider-anthropic/src/index.ts`, `control-benchmark.tsx`, `endpoints.tsx`, `router.tsx`, `session-readiness.tsx`, `runtime.tsx`, `cli.ts`.
- Delegated subagent reports: R5/R6 report (complete); R1-R3 and R4 subagents failed but left verified leads (isHealthyEndpoint misclassification, circuit ignores non-live traffic); R7-R9 subagent completed (delivered after synthesis; used as supplementary confirmation of the controller's first-hand R7/R8/R9 reads, including `cli.ts` EMPTY_REGISTRY/EMPTY_CATALOG, `build-binaries.yml` CI guards, `view-models.ts` circuit detail).
- Phase 0 baseline (locked `00-worktree.md`): host-bridge 26 passed, runtime-ui 15 passed.

## Traceability

- R1 -> `effort-instance-identity.ts` (readable suffix + legacy decode), `index.ts` candidates/decisions; GAP: no lifecycle state machine.
- R2 -> `activateRuntimeEndpoint` (no pending-admission), `remote-health-probe.ts` (bootstrap-only, catalog probe), `execution-circuit-breaker.ts` (threshold policy exists, not folded into candidate health).
- R3 -> `remote-health-probe.test.ts`, `provider-openai` effort tests, `provider-anthropic` (no effort), `RuntimeExecutionFailedAttemptReceipt` (sanitized); GAP: no 503 test, health inconsistency.
- R4 -> `benchmark-artifacts.ts` manifest, `benchmark-summary.ts` portfolio filter, `sqlite-memory` profile filter, `toRouterDecisionData`; GAP: isHealthyEndpoint misclassification + no cross-page push.
- R5 -> `listRouterCandidateData` (no API truncation), `candidate-space.ts` (limit 5), `dashboard.tsx:223`, `candidate-space-chart.tsx`, per-surface projections.
- R6 -> `candidate-space.ts:24/46/312` (index-cycle colors), no >4 test.
- R7 -> `package-sea.ts` (fixture rejection + no dev-root copy), `validate-packaging.ts` (synthetic sentinel), `docs/public/install.md`; GAP: no sentinel-absence scan, no empty-pool assertion, docs gap.
- R8 -> test commands, `validate-packaging.ts` rebuilt-runtime + extension catalog; Phase 3/4/5 are the deliverables.
- R9 -> readiness surfaces (`endpoints.tsx`, `router.tsx`, `session-readiness.tsx`, `runtime.tsx`, `view-models.ts`), benchmark effort identities; GAP: no admission/reason/retry/degraded explanation.

## Audit Context

- Worktree: `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity`
- Branch: `recursive/93-variant-admission-model-pool-integrity`
- Baseline commit: `1aab0512ce23aacc50cea66c2926e374be1e249e` (from locked `00-worktree.md`)
- Phase purpose: establish the real current behavior for effort-aware instance identity, admission readiness, provider/effort failure diagnosis, benchmark identity/refresh, Model Pool projection and colors, and clean-install/docs.
- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: four read-only subsystem subagents dispatched (R1-R3 identity/lifecycle/admission, R4 benchmark, R5-R6 pool/colors, R7-R9 clean install/docs). The R5/R6 subagent completed and its report independently confirmed the controller's first-hand reads. The R1-R3 and R4 subagents failed before finishing but left verified leads (isHealthyEndpoint misclassification; circuit ignores non-live traffic) that the controller confirmed directly. The R7-R9 subagent completed and its report was used as supplementary confirmation of the controller's first-hand R7/R8/R9 reads. Every fact in this artifact was cross-verified by the controller against the source.
- Delegation Decision Basis: parallelize independent subsystem reading; the controller independently verified every fact cited in this artifact by direct file reads.
- Delegation Override Reason: `self-audit` chosen because the AS-IS artifact requires exact source-line citations across the host-bridge authority chain, which the controller verified directly; delegated reports are supplementary evidence, not the sole basis. The R1-R3 and R4 subagents failed mid-run and were replaced by controller first-hand reads, so a self-audit with controller verification is the truthful mode for this phase.
- Audit Inputs Provided:
  - locked `00-requirements.md` + `00-worktree.md`
  - run-92 `01-as-is.md` + `00-worktree.md`
  - `.recursive/memory/domains/role-model-router.md`, `.recursive/STATE.md`, `.recursive/DECISIONS.md`
  - live worktree sources listed in the Inputs header
- Reviewed Subagent Action Records:
  - `r5-r6-pool-colors` | Task: "Map R5 Model Pool projection and R6 candidate colors in the worktree" | Reviewed: yes | Assessment: report independently confirmed `candidate-space.ts` limit=5 (lines 250/291), 4-token COLOR_CYCLE index math (lines 24/46/312), `dashboard.tsx:223` hardcoded 5, per-surface projections, absence of an 8-state candidate model, absence of >4-candidate color tests, and decisions revision persistence; consistent with the controller's direct reads. | Used: yes
  - `r1-r3-identity-lifecycle` | Task: "Map effort identity/lifecycle, admission readiness, provider/effort failure diagnosis" | Reviewed: yes | Assessment: subagent failed mid-run, but left a verified lead (`isHealthyEndpoint` at benchmark-runner.ts:330-332 treats degraded/provider-unavailable as healthy); controller confirmed first-hand. | Used: yes
  - `r4-benchmark` | Task: "Map benchmark identity, eligibility, revision-aware refresh" | Reviewed: yes | Assessment: subagent failed mid-run, but left a verified lead on membership-revision filtering; controller confirmed first-hand in `benchmark-summary.ts` and `sqlite-memory/src/index.ts`. | Used: yes
  - `r7-r9-clean-install` | Task: "Map clean-install packaging, artifact scanning, docs, UI readiness surfaces" | Reviewed: yes | Assessment: subagent completed; report confirmed `package-sea.ts` forbidden fragments, `validate-packaging.ts` synthetic sentinel, `cli.ts` EMPTY_REGISTRY/EMPTY_CATALOG, `build-binaries.yml` CI guards, `view-models.ts` circuit detail, and the absence of a clean-install doc + sentinel-absence scan; consistent with the controller's first-hand reads. | Used: yes

## Effective Inputs Re-read

- Locked `00-requirements.md` (R1-R9, full) — re-read.
- Locked `00-worktree.md` (diff basis `1aab0512`, baseline host-bridge 26 + runtime-ui 15) — re-read.
- Run-92 `01-as-is.md` and `00-worktree.md` — re-read as the prior authority-chain and audit-structure baseline.
- Memory domain `role-model-router.md` + `STATE.md`/`DECISIONS.md` — re-read for authority-chain and promotion-boundary context.

## Earlier Phase Reconciliation

- Phase 0 locked `00-worktree.md` confirmed the diff basis `1aab0512` → `working-tree` and a clean baseline. This phase reuses the same basis and reports no product diff (analysis only).
- Run 92 established membership-revision + stale benchmark quarantine; this phase confirms those are intact (`readCurrentBenchmarkPortfolio` at benchmark-summary.ts:593-660, `readLatestBenchmarkProfilesByEndpointIds` at sqlite-memory/src/index.ts:4818-4882) and identifies the residual gaps run 93 targets.

## Subagent Contribution Verification

- R5/R6 subagent report: independently confirmed `candidate-space.ts` (limit=5 at 250/291, COLOR_CYCLE 4-token index math at 24/46/312), `dashboard.tsx:223`, per-surface projections, no 8-state model, no >4-candidate color tests, decisions revision persistence. Matches controller first-hand reads — accepted.
- R1-R3 subagent: failed, but its lead (`isHealthyEndpoint` at benchmark-runner.ts:330-332 treats degraded/provider-unavailable as healthy; `recordExecutionCircuitFailure` at execution-circuit-breaker.ts:372-374 ignores non-live traffic) was verified by the controller's direct reads — accepted.
- R4 subagent: failed, left a lead on membership-revision filtering; verified first-hand in `benchmark-summary.ts` and `sqlite-memory/src/index.ts` — accepted.
- R7-R9 subagent: completed; its report was used as supplementary confirmation of the controller's first-hand R7/R8/R9 reads (`package-sea.ts`, `validate-packaging.ts`, `cli.ts`, `view-models.ts`, `docs/public/install.md`, UI readiness surfaces) — accepted.
- All delegated claims used in this report were cross-verified by the controller against the source. No subagent-authored claim is relied on as the sole basis for any finding in this artifact.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Comparison reference: `working-tree`
- Normalized baseline: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 1aab0512ce23aacc50cea66c2926e374be1e249e`
- Changed files reviewed: no product changes at AS-IS time; `git status --short` filtered to exclude `.recursive|AGENTS.md|.cursorrules|.github|CLAUDE.md|.codex` returned empty. Only run control-plane artifacts and pre-existing tooling files are new. Analysis is non-mutating with respect to product code.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/92-configured-model-pool-benchmark-convergence/01-as-is.md`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-worktree.md`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- `/.recursive/memory/domains/role-model-router.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`

## Gaps Found

- none (no audit-evidence gaps in this artifact). The product defects are catalogued under "Current Behavior by Requirement" and are inputs to Phase 1.5/Phase 2, not unresolved audit gaps in this Phase 1 artifact.

## Repair Work Performed

- None (analysis phase). The mapped defects are inputs to Phase 1.5 (root cause) and Phase 2 (plan).

## Requirement Completion Status

- R1 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R1 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R2 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R2 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R3 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R3 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R4 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R4 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R5 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R5 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R6 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R6 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R7 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R7 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R8 | Status: deferred | Rationale: R8 is the TDD/regression/rebuild/extension verification gate; it is inherently satisfied by Phase 3/4/5, which have not started in the AS-IS phase. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- R9 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R9 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Reproduction steps are novice-runnable
- [x] Current behavior is tied to every in-scope R1-R9
- [x] Relevant code pointers use full paths and function/module names
- [x] Known unknowns are explicit
- [x] Evidence snippets are recorded
- [x] Source Requirement Inventory covers all R# with exact source quotes
- [x] Traceability maps every R# to evidence
- [x] Audit sections are complete and grounded in upstream artifacts + diff basis

Coverage: PASS

## Approval Gate

- [x] AS-IS is consistent with live code and the locked diff basis
- [x] No unresolved setup or analysis ambiguity blocks Phase 1.5/Phase 2
- [x] Predecessor Run 92 authority contract is preserved and extended, not replaced

Approval: PASS
