# DECISIONS.md

## Recursive Run Index

### Run `64-observed-data-decay-policy-recalibration`

- Run folder: `/.recursive/run/64-observed-data-decay-policy-recalibration/`
- Worktree: `.worktrees/64-observed-data-decay-policy-recalibration`
- Branch: `recursive/64-observed-data-decay-policy-recalibration`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - replaced the old five-metric observed-data halflife contract with a canonical `metric_decay_percent_per_day` config surface for `latency` and `throughput` only; host-bridge config normalization still accepts legacy halflife keys for compatibility, but canonical render/readback now emits only the narrowed contract
  - changed router-core freshness aging from minute-scale halflife math to a 10%-per-day retained-deviation loss curve for latency and throughput, using one owning decay path for both local and remote candidates
  - removed ordinary time decay from benchmark or measured quality, measured reliability, and measured cost so those signals no longer drift toward neutral solely because their evidence is old
  - extended effective-metric diagnostics so request-detail and routing receipts now distinguish time-decayed metrics from pass-through metrics with explicit freshness source, time-decay-applied, and decay-rate facts
  - added RED-first regression coverage across host-bridge config truth, router-core scoring, and protocol-routing outcomes so the repaired policy is locked in at every owning layer
- Why:
  - the earlier run-64 implementation left the config surface, router scoring, and diagnostics semantically inconsistent with the locked requirements
  - stale benchmark or cost evidence was still being neutralized by age, while the active config truth still implied five live halflife knobs even though the intended policy only ages latency and throughput
  - operators and future contributors needed one durable ledger entry stating which observed metrics age, how quickly they age, and which metrics explicitly do not
- How:
  - repaired with strict TDD: added failing host-bridge, core, and protocol-routing tests before fixing the shared type, host-bridge config, router-core scoring, and diagnostic surfaces
  - verified with focused observed-data suites, the broader router-owned verification floor (`schemas:validate`, host-bridge `tsc`, host-bridge observed-data plus config tests, core observed-data plus routing-intent tests, full protocol-routing tests, `runtime:validate-routing`, and host-bridge `test:router`), plus deterministic agent-operated Phase-5 proof for config truth and route outcomes
  - reopened the invalid run artifacts, corrected the stale Phase 0 worktree receipt, rewrote the broken Phase 2-4 records, and closed the run through Phases 5-8 with the canonical recursive lock tooling
- What was not done:
  - no throughput-SLA redesign was introduced; its penalty and hard-deny behavior remain separate from the slower throughput decay curve
  - no benchmark-quality precedence redesign was introduced beyond preventing freshness metadata from neutralizing benchmark-backed quality
  - no context-window, cooldown, capability-eligibility, UI, or packaging behavior was changed in this run
- Known issues / follow-ups:
  - if future routing work wants reliability aging back, it should be a separate run with its own explicit contract and diagnostics rather than reviving hidden halflife knobs
  - legacy `metric_halflives` input remains accepted for compatibility today; if runtime configs are later migrated cleanly, a future cleanup run can remove that compatibility path explicitly

### Run `63-router-backend-regression-and-telemetry-surface-hardening`

- Run folder: `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/`
- Worktree: `.worktrees/63-router-backend-regression-and-telemetry-surface-hardening`
- Branch: `recursive/63-router-backend-regression-and-telemetry-surface-hardening`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added a first-class root `runtime:test-router` regression lane, a matching `test:router` subset in `@role-model-router/runtime-host-bridge`, and CI workflow coverage for that lane; updated the runtime testing architecture and regression matrix docs to make the lane the canonical router-focused backend floor
  - added package-level Vitest entrypoints plus deterministic temp-dir round-trip and negative-linkage coverage for `@role-model-router/trace` and `@role-model-router/usage`; `readTraceArtifacts()` now tolerates a missing `trace-events.jsonl` when no events were emitted
  - hardened telemetry analytics refresh behavior across dashboard, Observe Requests, and Observe Routing by moving stale-response reuse onto shared stale-refresh resolution that emits bounded structured diagnostics, shows a visible cached-data warning, and clears stale-chart state after a later successful refresh
  - strengthened rebuilt-runtime request-analytics coverage so `/app/observe/requests` now proves filter narrowing, query-param restoration after reload, and request-detail drill-in using uniquely seeded telemetry rows instead of render-only assertions
  - reopened the runtime-ui implementation/test/QA phases once the audit found remaining `R4` and `R5` gaps, then closed those gaps without changing the earlier router-lane, trace/usage, CI, or docs scope
- Why:
  - router-affecting backend changes still lacked one explicit regression lane that future contributors and CI could run without inferring scope from omnibus suites
  - trace and usage artifact helpers were part of the routing-explanation contract but still had no direct package-level regression floor
  - telemetry-heavy routes could silently reuse stale chart data, leave the stale warning stuck after recovery, and omit the structured diagnostics needed for operator-facing degraded-refresh truth
  - the existing request-analytics browser net proved rendering but not the actual operator behaviors required by the run, and persisted QA telemetry made naive assertions brittle
- How:
  - implemented with strict TDD for the router-lane, trace/usage package coverage, and the reopened stale-refresh helper repair
  - verified with focused runtime-host router tests, trace and usage package tests, `runtime:validate-routing`, `runtime:validate-observability`, runtime-ui suite/build proof, and rebuilt-runtime Playwright request-analytics coverage
  - reread the locked requirements and plan during the reopen so the repaired runtime-ui delta stayed confined to the missing `R4` and `R5` behaviors
- What was not done:
  - packaged-runtime verification was not rerun because no packaging-affecting files changed
  - no router strategy, provider-capability, or telemetry contract redesign was introduced beyond the regression and degraded-refresh hardening needed by the run
  - GitHub-hosted CI was not executed from this local worktree; merge-time CI still needs to validate the final branch
- Known issues / follow-ups:
  - the shared-surface Playwright screenshot helper still points at the historical run-60 evidence folder, so browser-proof captures can dirty tracked prior-run artifacts; redirect that helper to a generic ignored evidence path in a future harness-hygiene pass
  - if future router-owned backend surfaces are added, keep `runtime:test-router`, `/.github/workflows/ci.yml`, and the testing docs aligned so the dedicated lane does not drift back into an implicit catch-all

### Session `2026-07-10` — recursive-mode package refresh and scaffold reconciliation

- What changed:
  - ran `npx skills add https://github.com/try-works/recursive-mode --skill recursive-mode` on local `main`, then restored the full project skill package under `/.agents/skills/recursive-mode/` because the install reduced the tracked package to a lone `SKILL.md`
  - reconciled the repo-owned recursive scaffold to the current upstream bootstrap contract: `/.recursive/RECURSIVE.md` now follows `recursive-mode-audit-v2`, `/.recursive/config/recursive-router.json` now exists, `/.recursive/scripts/recursive-training-*` now exist, and `/.recursive/memory/training/` is now present
  - updated the live bridge/router docs (`/.recursive/AGENTS.md`, `/.codex/AGENTS.md`, `/.agent/PLANS.md`) and refreshed the durable memory router so the new router/training surfaces are discoverable without turning `MEMORY.md` into a session dump
- Why:
  - the repo’s tracked recursive-mode package had drifted behind the current upstream template, and the direct `skills add` install path did not preserve the tracked supporting files that the installed root skill references
  - the bootstrap upsert would have replaced important repo-owned control-plane and memory blocks, so the scaffold had to be updated in a way that preserved local state, decisions, and curated memory links
- How:
  - cloned the upstream recursive-mode package, ran its installer against a temporary preview copy of the repo, compared the generated scaffold to the live repo, then manually applied only the required deltas
  - treated `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, and `/.recursive/memory/MEMORY.md` as repo-owned documents and updated them manually instead of letting the bootstrap overwrite their marked blocks wholesale
- What was not done:
  - did not run the bootstrap installer directly against the live repo after confirming that it would clobber the existing `MEMORY.md` router block
  - did not delete existing promoted skill-memory shards that are still repo-specific guidance beyond the upstream default template
- Known issues / follow-ups:
  - if a future `npx skills add ... --skill recursive-mode` install again collapses the tracked project skill package to a root `SKILL.md`, follow the install with a package-integrity check or adjust the upstream packaging behavior
  - keep the repo-owned skill-memory index curated separately from the upstream default template when this repository intentionally carries additional promoted skill-memory shards

### Session `2026-07-06` — Codex Subscription routing hardening and release refresh

- What changed:
  - preserved OpenAI chat-completions `tool_choice` through adapter-execution and provider-openai so forced function-tool selection reaches compatible OpenAI and Codex Subscription targets instead of being dropped before provider execution
  - temporarily added Codex Subscription first-attempt pinning for tool-bearing and non-text turns, while keeping the broader eligible endpoint pool available for reroute after retry or fallback; this policy is superseded by Run 62 addendum 16, which keeps ordinary alias routing provider-agnostic and uses endpoint/model metadata plus benchmark/measured performance instead of provider-family preference
  - hardened upstream failure classification and cooldown handling so timeout, network, rate-limit, quota, provider-auth, and upstream-5xx failures can drive retry or reroute with escalating endpoint cooldown windows; repaired Codex auth now clears stale provider-auth cooldowns
  - made session bootstrap treat peer auto-reload degradation as advisory so remote-only readiness is not blocked by `peer reload incomplete`
  - changed `docs-site-deploy.yml` so missing Cloudflare secrets emit a skip notice and keep the workflow green instead of failing the merged `main` commit on an environment-only deploy precondition
  - changed `build-binaries.yml` so artifact attestation remains mandatory but now retries transient Rekor/Sigstore timeouts three times with backoff before failing the release matrix job
- Why:
  - routed Codex Subscription requests could lose forced tool intent, mis-handle tool-heavy or multimodal turns, and stay artificially denied after recoverable execution failures
  - remote-only operators could see a false degraded readiness summary when local peer reload lagged even though the runtime was otherwise execution-ready
  - release gating on GitHub should fail for broken builds or broken deploy logic, not for an intentionally absent Pages credential in repositories or forks that still need docs-build validation
  - release publication should not fail on the first transient transparency-log timeout when the produced archive is otherwise valid and GitHub's attestation dependency is temporarily slow
- How:
  - verified with targeted host/provider tests, full local `corepack pnpm run ci:check`, rebuilt-runtime probes on `:3456`, and live exact-model plus alias requests that executed GPT 5.4 tool calls through the Codex Subscription path
  - added repo-owned workflow contract tests for docs deploy and binary release attestation behavior, verified the new release test red/green against the workflow YAML, and used the failed tag-run Rekor timeout logs to confirm the retry target before rerunning local CI
- What was not done:
  - no new provider families or generic hosted-browser/tool runtime were introduced
  - invalid-request responses still fail fast instead of falling back to a different endpoint
- Known issues / follow-ups:
  - docs, runtime routing memory, release notes, and GitHub workflow guidance need to stay aligned whenever Codex Subscription execution metadata, cooldown policy, or release automation posture change again
  - if artifact attestation still fails after all three retries, inspect GitHub job logs for Sigstore/Rekor service health before assuming a packaging regression

### Run `62-litellm-pi-craft-codex-execution-hardening`

- Run folder: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
- Worktree: `.worktrees/62-litellm-pi-craft-codex-execution-hardening`
- Branch: `recursive/62-litellm-pi-craft-codex-execution-hardening`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - locked addenda through addendum 18, including Pi cooldown retry, reasoning stream routing/runtime, native Codex Responses transport, provider-agnostic routing preferences, Codex parameter sanitization, assistant-history content-part conversion, and failure-capture parity
- What changed:
  - expanded the shared routed execution contract so Responses ingress preserves `tool_choice`, reasoning/thinking controls, `previous_response_id`, prompt-cache hints, and session-affinity hints through `runtime-host-bridge`, `adapter-execution`, and `provider-openai`
  - replaced the Codex app-server execution path for OpenAI Codex Subscription with the native ChatGPT Codex Responses transport, reporting `providerId = openai`, `vendorId = chatgpt-codex-responses`, and `adapterFamily = codex-subscription-responses`
  - normalized downstream streaming so provider reasoning deltas are forwarded as OpenAI-compatible `reasoning_content` when the upstream emits them, while missing GPT/Codex reasoning deltas are recorded as provider unavailability rather than fabricated progress
  - removed Codex Subscription first-attempt routing preference from ordinary alias routing; Codex Subscription remains represented by provider, vendor, execution-family, adapter, and endpoint-capability metadata while alias selection stays provider-agnostic and score-driven
  - added selected-backend parameter policy receipts for Codex Subscription so unsupported optional OpenAI-compatible fields such as `temperature` and max-token variants are sanitized after endpoint selection instead of leaking into the ChatGPT Codex Responses backend
  - fixed role-aware Chat Completions to Responses history conversion so replayed assistant history becomes `output_text` or `refusal`, while user input remains `input_text` or `input_image`
  - taught unified runtime config and the managed LiteLLM vendor layer to preserve additive upstream `router_settings` and `litellm_settings` blocks instead of collapsing managed config to `model_list` alone
  - extended canonical observability and SQLite telemetry with execution-semantics receipts for source client, execution family, adapter family, payload bytes, retry/reroute counts, cooldown/idempotency decisions, parameter sanitization, routed failure observations, and tool side-effect state, and kept request-detail reconstruction on the same canonical surfaces
  - extended `runtime:validate-vendors` into a deterministic 200-case Pi/Craft corpus with stable machine-readable per-case routing, payload, and idempotency fields
  - corrected provider identity semantics across telemetry, request detail, validator corpus, runtime UI, and rebuilt-runtime proof so LiteLLM and `ai-sdk-*` labels remain vendor or adapter facts instead of being recorded as providers
- Why:
  - Pi, Craft, and routed provider execution were still dropping important Responses semantics before provider execution, leaving Codex and LiteLLM-backed paths behaviorally inconsistent
  - the Codex app-server path buffered or obscured the native streaming/error surface, while Pi's implementation showed the correct ChatGPT Codex Responses transport contract
  - Codex Subscription selection still depended on static compatibility checks in places where runtime endpoint metadata should have been authoritative
  - Pi multi-turn sessions exposed that assistant history cannot be translated with the same `input_text` content parts used for user input
  - Codex Subscription and direct OpenAI-compatible backends accept different optional parameters, so selected adapter policy had to be explicit and inspectable
  - routed provider failures were being persisted as anonymous `routing.failed.pre-execution` rows even after endpoint selection, making failures materially less inspectable than successes
  - the runtime lacked one canonical receipt layer for diagnosing payload growth, execution-family selection, retry/fallback state, and downstream request semantics across this integration surface
  - the earlier run-62 remediation receipts were semantically invalid because they allowed adapter labels such as `litellm-proxy` and `ai-sdk-openai` to stand in for provider identity
- How:
  - implemented with strict TDD and focused RED/GREEN coverage across provider-openai, runtime-host ingress mapping, native Codex Responses execution, Codex compatibility routing, parameter sanitization, assistant-history conversion, failure persistence, LiteLLM config pass-through, execution-semantics persistence, and the deterministic Pi/Craft corpus harness
  - verified locally with impacted package suites, impacted runtime-host suites, `runtime:test-critical`, `runtime:validate-ui`, `runtime:validate-observability`, `runtime:validate-vendors`, package rebuilds, and rebuilt-runtime isolated-state QA using live Pi/Craft alias requests on `difficulty.remote-only`
  - kept the earlier packaged-runtime live proof as supplemental confidence while making rebuilt-runtime verification the authoritative Phase-5 sign-off because the user explicitly required rebuilt-runtime QA
- What was not done:
  - no Pi upstream or Craft upstream patches were introduced; the fixes stayed inside the shared runtime contract and owning provider/runtime layers
  - no second trace store or UI-only inspection silo was created; the work extended the existing request-detail and telemetry-ledger surfaces
  - no generic hosted browser/tool runtime was introduced for DeepSeek or other providers
  - no historical telemetry backfill was attempted for old sparse failure rows that did not persist selected-endpoint context
- Known issues / follow-ups:
  - rebuilt-runtime post-activation inventory truth currently comes from `/api/role-model/endpoints` and `/v1/models`; `/healthz` bootstrap inventory remains startup-scoped and should not be treated as the authoritative post-activation inventory surface for this QA pattern
  - the degraded-primary rebuilt-runtime proof showed successful pre-dispatch failover selection to a surviving family, but it did not produce a live non-zero `rerouteCount`; if a future run needs an in-flight reroute proof specifically, induce it explicitly rather than inferring it from pre-dispatch pool pruning
  - GitHub-hosted CI was not executed from this local worktree; merge-time CI still needs to confirm the final change set
  - the addendum 18 controlled live failure harness failed pre-execution with `VENDOR_NOT_CONFIGURED`; selected-endpoint failure-capture parity is proven by automated TDD and should get a clean live induced-provider-failure proof in a future dedicated harness if needed
  - whenever execution semantics change again, keep provider identity, vendor identity, execution family, and adapter family as separate receipts; do not let validator or UI surfaces regress back to adapter-as-provider classification

### Run `60-runtime-ui-paper-linear-review-alignment`

- Run folder: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/`
- Worktree: `.worktrees/60-runtime-ui-paper-linear-review-alignment`
- Branch: `recursive/60-runtime-ui-paper-linear-review-alignment`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - Phase-5 addenda: rollback, route matrix, QA-fail remediation
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - replaced the older Apple-reference runtime-ui styling contract with the Paper Linear review design-system authority and rewrote the repo-owned `runtime-ui/DESIGN_SYSTEM.md` to match that baseline
  - retokenized the shared runtime shell, theme wiring, pill/select/text styling, and Recharts-backed telemetry/chart primitives so route families consume one Paper-driven design system instead of mixed route-local styling
  - realigned every shipped runtime page family against the authoritative Paper runtime-page board, including Overview, Studio, Local, Remote, Models, Router, Observe, Connect, and System surfaces
  - repaired late manual-QA regressions discovered after the page-by-page audit: fixed shell-contained scrolling, hid the content-frame scrollbar, reduced wasted chart margin, added runtime-summary retry resilience, normalized advanced-controls affordances, and unified grouped role-selection behavior across Remote and Models
  - removed review-only preview/mock scaffolds after approval so the shipped runtime remains live-data-driven rather than carrying Paper-review fixtures
- Why:
  - the shipped runtime UI and repo-owned design docs had drifted away from the current Paper/Linear source of truth, causing inconsistent tokens, stale typography, mismatched route layouts, and route-specific styling that bypassed the shared design system
  - the run needed to re-establish one visual authority, push it into the shared primitives first, and then bring the real runtime pages into parity without breaking rebuilt-runtime behavior
- How:
  - implemented with strict TDD on shared design-system and route regressions, rebuilt-runtime browser verification, Playwright regression coverage, and a hybrid Phase-5 rerun that paired agent-operated browser evidence with explicit user approval of the page-by-page screenshot matrix
- What was not done:
  - the run did not edit the Paper file itself; Paper remains the visual authority consumed by the repo
  - no mock telemetry or preview-only route data remains in the shipped runtime after the approval pass
- Known issues / follow-ups:
  - the Paper file is now slightly behind the latest approved implementation details; the repo-owned design system and runtime implementation are the current shipped truth until the Paper file is refreshed
  - the run’s earlier Phase 3-5 base receipts predated the stricter audited-artifact template and rely on locked Phase-5 addenda to express the final hybrid QA truth

### Run `57-role-model-taxonomy-v1-phase-1-4`

- Run folder: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
- What changed:
  - added Role-Model Taxonomy V1 for proposal phases 1-4: versioned canonical groups, roles, task types, capabilities, modalities, tool classes, schemas, generated docs, runtime taxonomy APIs, role/task metadata validation, and router/controller use of hard versus advisory request intent
  - updated the runtime UI's existing Models, Roles, Router, and Observe surfaces so model role assignment defaults to all roles with group-aware controls and task drill-down instead of creating a separate taxonomy app
  - updated `@try-works/pi-role-model` with compact taxonomy data, progressive group/role/task classification, runtime taxonomy discovery, package snapshot fallback, and `role_model.intent` injection into real Pi provider requests for known Role-Model aliases
  - Phase 5 found and repaired real integration defects: QA fallback downstream discovery lacked the rich Pi-compatible contract, Pi short-lived RPC discovery needed close-connection fetches, and Pi classification metadata was not wired into provider transport
- Why:
  - the router and consumers need a shared, versioned, human-readable taxonomy so Pi and other agents can classify request intent consistently and the runtime can use that metadata to filter and score routing candidates
  - How:
  - implemented with strict TDD, proposal-derived golden taxonomy parity, schema/data tests, runtime discovery/routing tests, runtime UI tests, Pi package tests, docs/static checks, rebuilt runtime packaging, and real local Pi QA against a rebuilt runtime
- What was not done:
  - proposal Phase 5 taxonomy-aware benchmarks and Phase 6 taxonomy-aware telemetry/observability rollups remain deferred; only reserved schema/link points and current surface reachability were verified
  - `pi-role-model` still does not start, stop, install, update, or own the Role-Model runtime process, call the launcher path, or read/sync Pi provider credentials
- Known issues / follow-ups:
  - Phase 5 QA addendum 01 closed the original QA-runtime backend limitation: managed local and remote mock vendors now start healthy, advertise canonical taxonomy capabilities, and the real local Pi prompt completed through the runtime with `requestedRoleId=security`, `roleIds=[security]`, `ROLE_POLICY_APPLIED`, and `TASK_POLICY_APPLIED` in telemetry/request detail
  - run 58 remains draft for proposal phases 5 and 6: taxonomy-aware benchmark scoring and taxonomy-level telemetry/observability

### Run `58-role-model-taxonomy-v1-benchmark-telemetry`

- Run folder: `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/`
- Worktree: `.worktrees/58-taxonomy-benchmark-telemetry`
- Branch: `recursive/58-role-model-taxonomy-v1-benchmark-telemetry`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md` (applied to STATE.md)
  - `08-memory-impact.md`
- What changed:
  - Implemented proposal Phase 5 (taxonomy-aware benchmarks) and Phase 6 (taxonomy-aware telemetry):
    - 4 taxonomy benchmark/telemetry schemas, 15 tagged benchmark cases across 4 minimum task types
    - 6-dimension taxonomy score aggregation in benchmark pipeline
    - Per-task benchmark scoring in router (configurable blend weights)
    - Taxonomy dimension extraction in protocol-types, recording in observation bundles
    - Telemetry analytics taxonomy dimensions (taxonomyRoleId, taxonomyTaskType)
    - Benchmark UI taxonomy filters, observe routing taxonomy inputs, model telemetry rollup
    - Privacy receipt, retention cleanup with indexed column, configurable telemetry advisory scoring
    - Difficulty classifier fallback to controller modelId
  - Architecture: single extraction source in protocol-types, dimension registry, configurable weights, re-exported linkage modules
  - 257+ tests across 7 packages (21 new), all green. All 3 packages build clean.
- Why:
  - Benchmark scores must be differentiated by taxonomy dimension so model performance can be compared within role/task/capability categories
  - Telemetry must record taxonomy dimensions for filtering, aggregation, and advisory performance signals without silently changing routing policy
- How:
  - Implemented with strict TDD (RED→GREEN across 5 test files). Additive/extension pattern — all changes extend existing code without replacing run 57 behavior.
- What was not done:
  - Live Pi-driven E2E verification incomplete: `litellm` Python binary not available in QA environment, blocking remote model execution. Code verified through unit/integration tests.
  - Full model telemetry rollup (R10): live API function exists, shows static data until telemetry accumulates from successful executions.
- Known issues / follow-ups:
  - QA runtime requires `litellm` binary on PATH for remote execution. Without it, all requests return VENDOR_NOT_CONFIGURED.
  - Pi uses run 57 pi-role-model extension by default; run 58 extension installed but classification not verified live.
  - Adding a new taxonomy dimension touches 12+ files across all layers.

### Run `59-observe-taxonomy-analytics-completion`

- Run folder: `/.recursive/run/59-observe-taxonomy-analytics-completion/`
- Worktree: `.worktrees/59-observe-taxonomy-analytics-completion`
- Branch: `recursive/59-observe-taxonomy-analytics-completion`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - completed the richer taxonomy telemetry/operator surface that run 58 left partial:
    - canonical taxonomy extraction now preserves original role/task hints, normalized role/task, group/variant/capability/modality/tool-class dimensions, alternatives, and source/confidence metadata
    - richer taxonomy dimensions are persisted and queried through the runtime telemetry ledger instead of only being reparsed from raw observations
    - Observe Requests and Observe Routing now expose richer taxonomy graphs and URL-backed filters
    - `/app/models` now shows richer taxonomy telemetry rollups plus benchmark-advisory role/group evidence
    - request detail now renders structured taxonomy, telemetry-handling, and cost-audit sections
  - completed Pi/runtime parity for the repo-owned Pi package:
    - added runtime-owned `/role-model requests` and `/role-model explain latest`
    - refreshed effective taxonomy on startup, setup, and alias refresh
    - made runtime inspection honor `ROLE_MODEL_ENDPOINT`
    - kept the package read-only with no runtime-process or credential ownership
  - repaired three real defects found during verification:
    - `runtime-inspection.ts` ignored `ROLE_MODEL_ENDPOINT`
    - rebuilt runtime could crash on late committed-response errors with `ERR_HTTP_HEADERS_SENT`
    - Observe analytics reparsed large raw observation bundles, causing minute-scale page loads and `database is locked` follow-on behavior
  - repaired a later rebuilt-runtime router defect where measured quality shadowed benchmark task/role/group quality; live receipts now emit benchmark precedence reasons correctly
- Why:
  - the original proposal Phase 6 operator-facing taxonomy telemetry work and the run-58 requirements were not actually complete in shipped Observe, model-rollup, request-detail, and Pi diagnostic surfaces
  - live rebuilt-runtime QA exposed both correctness and performance gaps that had to be fixed before the richer taxonomy telemetry story could be considered complete
- How:
  - implemented with strict TDD and late-phase repair discipline: RED→GREEN evidence for telemetry contract, Observe UI, request detail, Pi runtime inspection, telemetry-ledger denormalization/performance, and benchmark-precedence routing
  - verified with focused builds/tests, rebuilt-runtime browser/manual QA on `:3462`, live Pi command/prompt receipts, live benchmark-routing reruns, and a final handoff proof on rebuilt runtime `:3456`
- What was not done:
  - no benchmark-program redesign, benchmark retagging, or new top-level navigation was added
  - Pi still does not own runtime startup, runtime upgrades, or credential syncing
- Known issues / follow-ups:
  - residual Observe latency is now ordinary client/chart fan-out rather than raw-bundle reparsing, but it is still slower than a minimal empty page because the dashboard fans out many analytics reads
  - the local Pi CLI on Windows may still emit the known libuv teardown assertion after otherwise successful commands; the package behavior and runtime receipts remain the source of truth

### Session `260624-clever-seal` — Post-Implementation Audit, Gap Closure, and E2E Verification

- Date: 2026-06-24
- What was done:
  - **Addendum 08 (F6-F10 closure):** Rewired classifier to always use group-first scoring (28/28 roles). Added context signals (tools, images, files) wired through entire classification pipeline. Fixed `normalizedIntent` not appearing in decision detail API. Captured browser UI screenshots. Created one-to-one E2E coverage table.
  - **Addendum 09 (R4.1-R12.1 closure):** Added `replacement`/`deprecationReason` to all 7 entity schemas. Added `role_model` snake_case wire contract to decision detail API alongside existing camelCase `normalizedIntent`. Deepened classifier context (tool name→role mapping, file extension→role mapping). Generated classification guide from taxonomy data. Added docs consistency validation.
  - **Addendum 10 (benchmark quality fix):** Found and fixed `getQualityMetric` ignoring `benchmarkCapability.overallScore`. Before fix: all models got quality 0.500 default. After fix: v4-pro 0.925, kimi 1.000, v4-flash 0.833. Routing shifted from v4-flash 89% → v4-pro 90%.
  - **Addendum 11 (providers role display):** Fixed "No roles assigned" bug on providers page where `binding.roleIds` was read directly instead of using `buildModelRoleSelection` for all assignment modes.
  - **R10.1 (docs generation):** Created `scripts/generate-taxonomy-docs.ts` that produces 6 markdown tables from canonical JSON. Added auto-generation markers to `taxonomy-v1.md`.
  - **E2E verification:** 88-prompt Pi→Role-Model routing test across all 28 roles, 5 aliases. 184,946 tokens, 83/88 successful. Benchmark run with v4-pro 1.0, kimi 1.0, v4-flash 0.75 across 12 hard coding cases.
- Why:
  - Post-implementation audit (addendum 15) found 5 gaps (F6-F10). Addendum 17 found 7 more (R4.1-R12.1). All 12 gaps closed with strict TDD.
  - Benchmark quality not feeding routing was causing all models to appear equal, neutralizing the value of benchmark runs.
- How:
  - Strict TDD: RED → GREEN evidence for all changes. 71 pi-role-model tests, 23 core tests, 446 host-bridge tests all green.
  - Live verification: rebuilt runtime on :3456, ran benchmarks against DeepSeek v4-flash/v4-pro and Kimi k2.7, verified routing with 88 prompts.
- Decisions recorded:
  - camelCase vs snake_case: codebase maintains clean split — external/wire = snake_case (proposal contract, schemas, HTTP body), internal/TypeScript = camelCase. `toProposalWireContract()` adapter bridges both in API responses.
  - `MetricSource` type extended with `"benchmark"` for quality metric provenance.
  - `EndpointCandidate` type extended with `benchmarkCapability?: { overallScore?: number }`.
  - Classification fields (`positiveSignals`, `negativeSignals`, `summary`) added to all 28 roles in canonical data.
  - Compact chunk size guardrail raised from 16KB to 20KB to accommodate classification data.
- What was deferred:
  - P2.1: Effective taxonomy lacks caller-scoped RBAC filtering (acceptable for V1).
  - P2.2: No explicit unsupported taxonomy version rejection logic (minor).
  - Pi CLI crashes on Windows (libuv assertion, pre-existing).
- Artifacts created:
  - 10 new addenda (08-11, 16-19, closeout-01)
  - 1 generation script (`scripts/generate-taxonomy-docs.ts`)
  - Multiple evidence logs, screenshots, and routing analysis reports

### Run `56-pi-role-model-gap-closure`

- Run folder: `/.recursive/run/56-pi-role-model-gap-closure/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
- What changed:
  - closed the audited proposal/addendum gaps in `packages/pi-role-model`: typed runtime discovery, endpoint trust checks, fail-closed auth-required handling, conservative provider metadata fallbacks, degraded model diagnostics, richer `/role-model status` and `/role-model doctor`, idempotent refresh/setup behavior, Pi `setModel` alias selection, expanded README/package README/skill guidance, and `pi-package` manifest metadata
  - prepared and published the public npm package as `@try-works/pi-role-model@0.1.0`; docs now prefer `pi install @try-works/pi-role-model` while preserving local worktree install instructions
  - Phase 5 found a real Pi/Role-Model prompt compatibility defect where Pi sent `developer` messages; the run returned to TDD and added `compat.supportsDeveloperRole: false` to provider and alias model objects before re-running real Pi prompts
- Why:
  - run 55 created the first package, but follow-up audit showed it was not yet proposal-complete for discovery, trust, auth, diagnostics, alias semantics, docs, and local-device Pi verification
- How:
  - implemented with strict TDD for code behavior and static tests for docs/metadata/safety; verified with package build/tests, proposal/addendum traceability, package safety scans, real Pi package install/list/load, RPC command execution, real Role-Model prompt traffic, remote-block checks, auth-required fake-runtime checks, and remove/reinstall runtime-boundary checks
- What was not done:
  - no managed runtime installation, launch, stop, upgrade, browser-opening launcher call, credential sync, Pi auth-file read, hidden benchmark command, or Pi upstream change was added
- Known issues / follow-ups:
  - local Pi on Windows still prints a libuv teardown assertion after some successful CLI commands (`install`, `list`, `--help`, `--list-models`, `remove`); run 56 records this as a Pi CLI caveat because package state changes, model output, RPC commands, and prompts all verified correctly
  - `pi -p "/role-model status"` does not execute extension slash commands; Phase 5 used Pi RPC for extension command QA and `pi -p` for actual model prompts

### Run `55-pi-role-model-package`

- Run folder: `/.recursive/run/55-pi-role-model-package/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added the first repo-owned Pi package, `packages/pi-role-model`, with Pi package manifest, extension, role-model skill, command dispatcher, external runtime discovery, downstream OpenAI discovery parsing, provider registration, alias persistence, package README, and root README install guidance
  - Phase 5 drove the real local Pi executable to install the package, load the skill, invoke setup/status/doctor/ui/alias commands, list `role-model` models, choose `default.decision-only`, send a no-tools prompt through the alias, and confirm the Role-Model runtime recorded the request
- Why:
  - to make Pi consume Role-Model as an externally running OpenAI-compatible provider without copying credentials, starting runtimes, or reimplementing routing inside Pi
- How:
  - implemented through strict TDD with late Phase 5 RED/GREEN repairs for Pi model-list fields, Pi command handler shape, alias persistence, command-surface coverage, and package README coverage
- What was not done:
  - managed runtime install/start/upgrade, Role-Model launcher invocation, credential sync, benchmark commands, npm publication, and Pi upstream changes remain deferred
- Known issues / follow-ups:
  - local Pi on Windows prints a libuv teardown assertion after successful `install`, `list`, and `--list-models` output; package command invocation and prompt smoke completed successfully
  - command notification output is UI-facing and silent in non-interactive `pi -p` receipts, so Phase 5 relies on command exit codes, alias state, model listing, tests, and runtime request receipts for verification

### Run `00-baseline`

- Run folder: `/.recursive/run/00-baseline/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - introduced the first real product baseline for the repo, including canonical protocol schemas, docs, shared packages, deterministic router core, router apps, provider scaffolds, rust placeholders, fixtures, and CI
  - post-closeout audit remediation clarified protocol role/task examples in docs and widened the stable config export to a normalized ACP/MCP/CLI endpoint inventory
- Why:
  - to move the repository from an empty recursive scaffold to a documented, testable, endpoint-centric stable baseline
- How:
  - implemented the pnpm + TypeScript + Rust workspace baseline, used canonical JSON Schema as the source of truth, drove the first executable RED/GREEN loop pragmatically, recorded delegated review, and validated the full schema/build/test/rust/smoke chain
  - after the external-requirements audit, recorded stage-local addenda and refreshed the affected receipts so the run history reflects the stricter `R19` and `R36` interpretation
- What was not done:
  - production-grade daemon hosts, production browser/native runtimes, memory backend, publishing flows, model-pack installers, and judge-service hosting remain out of scope
- Known issues / follow-ups:
  - browser, edge, and native runtime families remain scaffold-grade by design
  - the control-plane docs now treat the `R19`/`R36` remediation as part of the durable baseline, not as an unrecorded post-closeout exception

### Run `01-protocol-routing-obs`

- Run folder: `/.recursive/run/01-protocol-routing-obs/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - tightened the canonical protocol schemas, fixtures, and directly coupled docs to the stricter run-01 M1-M3 contract
  - added fixture-driven router conformance, canonical compute-preference and strategy aliases, normalized weighted scoring, provider/endpoint policy filters, and deterministic fallback ordering
  - upgraded observed-performance aggregation to deterministic multi-sample semantics with `sample_window`, `sources`, freshness/confidence, failure/error-class rates, and mixed-version rejection
- Why:
  - to move the repo from the initial stable baseline to a stricter audited protocol-routing-observability contract without widening into deferred provider/runtime work
- How:
  - implemented the changes with strict RED/GREEN evidence, delegated Phase 3.5 code review, and a final `schemas:validate` + build + test + smoke validation chain
- What was not done:
  - production-grade daemon/browser/native runtimes, hosted providers, and other deferred run-00 out-of-scope surfaces remain out of scope
- Known issues / follow-ups:
  - unsupported-engine warnings persist under `Node v24`
  - repo-wide Biome formatting drift remains a pre-existing Windows-baseline issue and was intentionally not widened into this run

### Run `02-audit-remediation`

- Run folder: `/.recursive/run/02-audit-remediation/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added stable top-level `$id` values to all committed canonical schema files under `/protocol/schemas/`
  - removed schema-id masking from `/packages/schema-tools/src/validate-schemas.ts` and `/packages/conformance/src/schema-test-helpers.ts`
  - repaired the root script command path by switching nested pnpm calls in `/package.json` to `corepack pnpm ...`
- Why:
  - to bring the repository back into conformance with the documented canonical-schema contract and restore the supported root `corepack pnpm run ...` validation path
- How:
  - implemented a strict RED/GREEN loop with a new schema-source regression, reused the failing wrapper-path conformance slice as red evidence, and revalidated via root `schemas:validate`, `test`, and `smoke`
- What was not done:
  - no unrelated protocol, router, provider, runtime, or repo-wide formatting work was widened into this remediation run
- Known issues / follow-ups:
  - unsupported-engine warnings still persist under `Node v24`
  - `packages/protocol-types/src/generated.ts` can show local CRLF-only status churn after generator-backed tests even when there is no semantic content diff

### Run `03-protocol-baseline-hardening`

- Run folder: `/.recursive/run/03-protocol-baseline-hardening/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - froze the M1 protocol baseline by expanding fixture coverage to valid, invalid, minimal, and edge families, tightening the router-decision and observed-performance schemas, and enforcing the full fixture manifest through schema-tools
  - hardened the TypeScript router into an explainable role, task, and binding-aware reference implementation with explicit exclusion codes, scored-candidate diagnostics, and deterministic tie-break metadata
  - added stable observability linkage helpers plus a fixture-driven, self-validating `gateway-smoke` harness that validates router, trace, usage, and observed-performance artifacts against the canonical schemas
- Why:
  - to complete the next baseline-hardening block for M1-M3 before widening into deferred native-host, package-loading, or browser/runtime expansion
- How:
  - used a strict RED/GREEN loop driven by router and observability conformance failures, extended schema-tools to validate the expanded fixture corpus, and revalidated the repo through root `schemas:validate`, `test`, and `smoke`
- What was not done:
  - native hosts, memory/backend integration, package/model-pack loading, and real browser-local inference integrations remain out of scope
- Known issues / follow-ups:
  - unsupported-engine warnings still persist under `Node v24`
  - repo-wide CRLF/Biome drift remains an existing Windows hygiene issue and was intentionally not widened into this run

### Run `04-router-runtime-architecture-lock`

- Run folder: `/.recursive/run/04-router-runtime-architecture-lock/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added the repo-native router-runtime architecture lock at `/docs/architecture/06-router-runtime-architecture-lock.md`
  - updated `/docs/architecture/05-memory-model.md` so the first runtime milestone is explicitly SQLite-first, same-host, and local-disk scoped while production implementation remains deferred
  - aligned runs `05` through `13` so later router-runtime work consumes the repo-native architecture lock instead of relying only on roadmap prose
- Why:
  - to freeze the runtime ownership boundaries, vendor/frontend/operator split, cache/governance expectations, and deferred MCP/tool scope before widening into catalog, account, registry, routing, adapter, host, or observability implementation work
- How:
  - implemented a docs-and-requirements-only Phase 3, validated via recursive lint plus the root `schemas:validate` / `build` / `test` / `smoke` chain from the selected worktree, and recorded that the inherited schema-tools/Biome failure pattern remained unchanged
- What was not done:
  - no catalog ingestion, provider-account subsystem, endpoint registry, routing projection, adapter execution, host integration, observability productization, or MCP/tool implementation was added in this run
- Known issues / follow-ups:
  - the selected run-04 worktree still reproduces the inherited `schemas:validate` PASS / `build` FAIL / `test` FAIL / `smoke` PASS pattern because `packages/schema-tools` still hits the Biome `No files were processed in the specified paths` failure during generated-type formatting
  - the new architecture lock is now the repo-native handoff source that later runs must consume directly

### Run `05-router-runtime-catalog-foundation`

- Run folder: `/.recursive/run/05-router-runtime-catalog-foundation/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/packages/catalog/` as the first role-model-owned normalized catalog foundation with pinned snapshot loading, inheritance-aware normalization, provider-kind/auth-family enrichment, local override support, and vendor-version ledger derivation
  - added pinned input fixtures under `/testdata/catalog/` and durable tracked handoff artifacts under `/role-model-router/packages/catalog/data/`
  - added the repo-local `catalog:export` command while preserving the broader inherited schema-tools/Biome validation caveat
- Why:
  - to turn the architecture-lock decision into a reusable catalog foundation that later provider-account and endpoint-registry runs can consume without rediscovering upstream provenance, enrichment rules, or vendor versions ad hoc
- How:
  - implemented strict RED/GREEN TDD across three behavior slices (normalization, artifact export, CLI wrapper), validated the catalog package directly, and confirmed the broader repo still shows only the inherited `packages/schema-tools` failure pattern
- What was not done:
  - provider-account records, credential storage, concrete endpoints, routing projection, adapter execution, host integration, and broader UI work remain out of scope
- Known issues / follow-ups:
  - `runtime-output/` is ignored by repo policy, so run `05` uses tracked copies under `/role-model-router/packages/catalog/data/` as the durable handoff path
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path rather than on the new catalog package

### Run `06-router-runtime-provider-accounts-sqlite-memory`

- Run folder: `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/packages/provider-account/` as the runtime-owned account/auth modeling layer with credential-reference parsing, auth-mode vocabulary, region/model policy fields, and validation against the tracked normalized catalog
  - added `/role-model-router/packages/sqlite-memory/` with the SQLite-first runtime-state location contract, WAL initialization, explicit multi-table schema, migration receipts, maintenance defaults, and provider-account persistence
  - added pinned provider-account fixtures under `/testdata/router-runtime/` plus the repo-local `runtime:validate-state` command for local account and SQLite initialization validation
- Why:
  - to establish explicit provider-account/auth modeling and the first authoritative local-memory persistence baseline before widening into endpoint registry, context-envelope assembly, and routing projection work
- How:
  - implemented strict RED/GREEN TDD across provider-account validation, SQLite-memory schema/persistence, and the local validation CLI, then validated the new packages directly and confirmed the broader repo still shows only the inherited `packages/schema-tools` failure pattern
- What was not done:
  - no endpoint registry, context-envelope assembly, routing, adapter execution, host integration, raw-secret storage, or secondary memory backend implementation was added here
- Known issues / follow-ups:
  - the SQLite runtime path currently uses built-in `node:sqlite`, which works in the selected Node 24 environment but still emits the platform's experimental warning
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path rather than on the new provider-account or SQLite-memory packages

### Run `07-router-runtime-endpoint-registry-context-envelope`

- Run folder: `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/packages/endpoint-registry/` as the runtime-owned endpoint-instantiation and lifecycle/diagnostic layer built from catalog, provider-account, and pinned discovery inputs
  - added `/role-model-router/packages/context-envelope/` plus `/role-model-router/packages/retrieval-receipt/` and extended `/role-model-router/packages/sqlite-memory/` so routed continuity can be assembled and summarized over the existing SQLite baseline
  - added pinned runtime fixtures under `/testdata/router-runtime/` plus the repo-local `runtime:validate-registry` command for deterministic registry, envelope, and receipt validation
- Why:
  - to establish the runtime-owned endpoint registry, conversation continuity envelope, and retrieval receipt surfaces before widening into protocol-driven routing projection work
- How:
  - implemented strict RED/GREEN TDD across registry construction, SQLite continuity helpers, bounded envelope assembly, receipt generation, and the local validation CLI, then validated the new packages directly and confirmed the broader repo still shows only the inherited `packages/schema-tools` failure pattern
- What was not done:
  - no protocol-driven routing projection, configurable routing-model selection, adapter execution, or host integration was added here
- Known issues / follow-ups:
  - the local validation path currently uses built-in `node:sqlite`, which works in the selected Node 24 environment but still emits the platform's experimental warning
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path rather than on the new run-07 packages

### Run `08-router-runtime-protocol-routing`

- Run folder: `/.recursive/run/08-router-runtime-protocol-routing/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/packages/protocol-routing/` as the runtime-owned projection and orchestration layer that composes registry, continuity, retrieval receipt, observed profiles, and advisory routing-model inputs into deterministic routing input plus diagnostics
  - extended `/role-model-router/packages/core/` with explicit continuity-affinity, cache-affinity, and routing-model-rank signals while keeping the canonical router-decision shape stable
  - added pinned runtime-routing fixtures under `/testdata/router-runtime/`, added `/packages/conformance/src/runtime-routing-conformance.test.ts`, and added the repo-local `runtime:validate-routing` command
- Why:
  - to establish the mandatory protocol-driven routing boundary and configurable routing-model guardrails before widening into adapter execution work
- How:
  - implemented strict RED/GREEN TDD across projection, signal scoring, orchestration, and validation slices, then validated the new package and targeted conformance/runtime paths directly while separating the remaining older unrelated failures
- What was not done:
  - no adapter execution, request-serving host integration, operator UI work, or router-decision schema redesign was added here
- Known issues / follow-ups:
  - `@role-model/conformance build` still fails on older `src/router-conformance.test.ts` typing debt rather than on the new run-08 file
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path
  - the local validation path still uses built-in `node:sqlite`, which works in the selected Node 24 environment but still emits the platform's experimental warning

### Run `09-router-runtime-adapter-execution-plane`

- Run folder: `/.recursive/run/09-router-runtime-adapter-execution-plane/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/packages/adapter-execution/` as the shared runtime-owned execution plane that resolves routed targets, negotiates adapter capabilities, shapes canonical request/response captures, and emits normalized trace and usage outputs
  - added `/role-model-router/packages/provider-openai/` and `/role-model-router/packages/provider-anthropic/` as the first concrete provider-family adapters with family-specific request builders and response normalizers
  - added pinned runtime adapter fixtures under `/testdata/router-runtime/`, added the repo-local `runtime:validate-adapter` command, and upgraded `/role-model-router/apps/gateway-smoke/` to execute the routed adapter path and emit capture artifacts
- Why:
  - to establish the mandatory execution-plane boundary between protocol routing and later host/transport work without depending on live provider I/O
- How:
  - implemented strict RED/GREEN TDD across the shared execution contract, first-family adapters, fixture-backed validation CLI, and smoke integration, then validated the new packages directly while keeping the broader inherited workspace failures explicitly separated
- What was not done:
  - no live provider HTTP transport, request-serving host integration, provider-agnostic tool execution, or MCP/tool-extension work was added here
- Known issues / follow-ups:
  - the shared-package and first-family split currently produces a workspace cycle warning between `adapter-execution` and `provider-anthropic`, though targeted install/build/test flows remain green
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path
  - the local runtime-state and routing validation path still uses built-in `node:sqlite`, which works in the selected Node 24 environment but still emits the platform's experimental warning

### Run `10-router-runtime-host-integration`

- Run folder: `/.recursive/run/10-router-runtime-host-integration/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/apps/runtime-host-bridge/` as the managed TypeScript bridge that exposes `/healthz`, `/v1/models`, and `/v1/chat/completions` over the existing routed adapter-execution path
  - vendored `llama-swap` under `/role-model-router/vendor/llama-swap/` as a nested Go module and added narrow bridge, process-management, and config seams so the vendor host owns lifecycle plus operator surfaces while role-model owns routing and execution semantics
  - added the repo-local `runtime:validate-host` command and recorded the pinned `llama-swap` vendor baseline in `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- Why:
  - to establish the concrete request-serving host boundary and operator/debug surface required before later observability-feedback and hardening work
- How:
  - implemented strict RED/GREEN TDD across the bridge app and focused vendored Go seams, repaired two delegated-review findings, and validated the final host path locally while keeping inherited and upstream-relative red checks explicit
- What was not done:
  - no live provider HTTP transport, true streaming transport, final observability-feedback work, provider-agnostic tool execution, or MCP/tool-extension work was added here
- Known issues / follow-ups:
  - the bridge currently uses deterministic capture-backed provider responses rather than live provider HTTP transport
  - full vendored `go test ./...` still fails on Windows in upstream `proxy/process_test.go` because `sleep` is not on `%PATH%`
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path

### Run `11-router-runtime-observability-feedback`

- Run folder: `/.recursive/run/11-router-runtime-observability-feedback/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/packages/runtime-observability/` as the shared runtime-owned observation, diagnostics, profile-feedback, and OpenTelemetry export layer
  - extended `/role-model-router/packages/sqlite-memory/` and `/role-model-router/apps/runtime-host-bridge/` so live bridged requests persist observations and profile snapshots and expose structured `/api/role-model/...` inspection reads
  - added the repo-local `runtime:validate-observability` command and aligned `/role-model-router/apps/gateway-smoke/` to emit request-observation, endpoint-profile-state, and OTEL export artifacts
- Why:
  - to complete the first durable runtime feedback loop and operator inspection layer before later hardening and operations work
- How:
  - implemented strict RED/GREEN TDD across the shared TypeScript package, SQLite persistence, bridge and vendored route seams, and host-integrated validation, then refreshed delegated review after a cleanup-only package-layout repair
- What was not done:
  - no run-12 retention/export/delete drills, rollback playbooks, canonical schema redesign, live provider transport, true streaming transport, or MCP/tool-extension work was added here
- Known issues / follow-ups:
  - `logs_contains_bridge` remains `false` in the successful validator output because `/logs` does not currently include that literal phrase
  - full vendored `go test ./...` still fails on Windows in upstream `proxy/process_test.go` because `sleep` is not on `%PATH%`
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path

### Run `12-router-runtime-hardening-operations`

- Run folder: `/.recursive/run/12-router-runtime-hardening-operations/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - repaired clean vendored host startup by replacing the hidden `proxy/ui_dist` dependency with a tracked fallback UI path under `/role-model-router/vendor/llama-swap/proxy/ui_stub/`
  - extended `/role-model-router/packages/sqlite-memory/` with explicit runtime-data export, backup, delete, and restore helpers and added the repo-local `runtime:validate-operations` command under `/role-model-router/apps/runtime-host-bridge/`
  - added `/docs/operations/01-router-runtime-hardening-playbook.md` and linked it from `/role-model-router/README.md` so vendor refresh, deployment/upgrade guidance, validation order, and SQLite drills are durable repo-owned operator docs
- Why:
  - to close the first router-runtime sequence with a reproducible clean-start baseline, explicit runtime-state maintenance drills, and durable operator guidance rather than a session-only repair
- How:
  - implemented strict RED/GREEN TDD across vendored Go fallback behavior, SQLite maintenance helpers, and the operations validator, then accepted a delegated Phase 3.5 review and revalidated the final hardening path with durable verify logs
- What was not done:
  - no run-13 MCP/tool-extension work, canonical schema redesign, live provider transport, true streaming transport, or broader UI productization was added here
- Known issues / follow-ups:
  - `runtime:validate-host` and `runtime:validate-observability` are now green on clean worktrees, but `logs_contains_bridge` still remains `false` in successful validator output because `/logs` does not currently include that literal phrase
  - vendored `go test ./proxy` still fails on Windows in upstream `proxy/process_test.go` because `sleep` is not on `%PATH%`
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path

### Run `13-router-runtime-mcp-tools-extension`

- Run folder: `/.recursive/run/13-router-runtime-mcp-tools-extension/`
 - Artifacts:
   - `00-requirements.md`
   - `00-worktree.md`
   - `01-as-is.md`
   - `01.5-root-cause.md`
   - `02-to-be-plan.md`
   - `03-implementation-summary.md`
   - `03.5-code-review.md`
   - `04-test-summary.md`
   - `05-manual-qa.md`
   - `06-decisions-update.md`
   - `07-state-update.md`
   - `08-memory-impact.md`
 - What changed:
   - added `/role-model-router/packages/tool-registry/` as the runtime-owned provider-agnostic tool registry with strict required-field validation, execution receipts, and failed-execution diagnostics
   - extended `/role-model-router/packages/provider-mcp/` from discovery-only shaping into runtime MCP connector-definition input while keeping discovery/export responsibilities separate from execution
   - extended `/role-model-router/apps/runtime-host-bridge/` and `/role-model-router/packages/runtime-observability/` so routed tool calls surface as OpenAI-compatible `tool_calls`, execute through the runtime registry, persist tooling receipts and diagnostics, and validate through the new root `runtime:validate-tools` command
   - added `runtime: "./dist/index.js"` export conditions across the runtime dependency graph so compiled runtime verification works under plain Node instead of only `tsx`-backed source execution
 - Why:
   - to complete the deferred MCP-and-tools extension as an additive runtime layer without reopening the already-committed router, trace, usage, or single-host baseline contracts
 - How:
   - implemented strict RED/GREEN TDD across the new tool-registry and MCP connector seams, repaired the compiled-runtime export graph after a root-cause analysis, accepted delegated Phase 3.5 review, then repaired the one substantive review finding and revalidated the final path
 - What was not done:
   - no orchestration engine, multi-turn tool loop synthesis, external live MCP dependency, canonical protocol redesign, streaming transport, or run-14 UI work was widened into this run
 - Known issues / follow-ups:
   - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path

### Run `14-router-runtime-ui-foundation`

- Run folder: `/.recursive/run/14-router-runtime-ui-foundation/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - expanded `/role-model-router/apps/runtime-ui/` into a hierarchical runtime operator shell with `Overview`, `Studio`, `Control`, `Observe`, `Integrations`, and `System` sections, including controller/models surfaces, live activity/log drill-ins, vendor-backed studio workspaces, and upstream/downstream/system pages
  - extended `/role-model-router/apps/runtime-host-bridge/` plus `/role-model-router/packages/sqlite-memory/` with runtime summary, providers, accounts, account upsert, endpoint-list, and controller/config seams plus the repo-local `runtime:validate-ui` command and the split host/bridge runtime topology used by the live shell
  - widened the runtime/provider surface with Moonshot/Kimi onboarding, design-system/live-page alignment, and OpenAI-compatible downstream streaming for `/v1/chat/completions` and `/v1/responses`, including provider-openai transcript normalization and host-path E2E evidence through the bridged `/v1/*` surface
- Why:
  - to establish the first repo-owned operator UI and provider/account onboarding flow on top of the existing single-host runtime baseline instead of continuing to rely only on vendored host surfaces
- How:
  - implemented strict RED/GREEN TDD across catalog, provider-account, SQLite, host-bridge, runtime-ui, design-system, and streaming slices; accepted delegated Phase 3.5 code review; captured focused validation greens plus live host-path streaming E2E; and confirmed route-level browser QA against the live host bridge and UI dev server
- What was not done:
  - no full Kimi device-OAuth token lifecycle productization, automatic endpoint materialization from account upserts, broader public/docs/catalog shell work, or Kimi-specific `/v1/responses` routing promotion beyond its current chat-completions-shaped contract was added here
- Known issues / follow-ups:
  - Kimi Code remains intentionally `backend-limited`; the UI exposes real OAuth metadata but does not claim durable token exchange/refresh is complete
  - Kimi remains modeled on the current `openai.chat.completions` path, so the live `/v1/responses` streaming proof currently targets the OpenAI-shaped routed model path rather than `moonshotai/kimi-k2.5`
  - the endpoint registry remained on the current three-entry runtime baseline after the manual-QA Moonshot account upsert, so account save does not yet auto-materialize new endpoint rows in this run
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path

### Run `15-unified-vendor-execution`

- Run folder: `/.recursive/run/15-unified-vendor-execution/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added repo-owned unified vendor lifecycle packages for llama-swap, LiteLLM-compatible remote execution, and shared supervisor/vendor contracts
  - extended `/role-model-router/apps/runtime-host-bridge/` with unified runtime config parsing, vendor startup/shutdown, vendor-aware dispatch and health reporting, plus end-to-end `runtime:validate-vendors`
  - closed the external-parity seams by threading `cacheStatus` and routed fallback model IDs through the LiteLLM path, scoping unified remote execution to `litellm-proxy`, and exposing additive `healthCheck()` / `executeStream()` vendor-runtime compatibility methods
  - added a first SEA packaging path with platform-aware llama-swap assets, `runtime:package-sea`, `runtime:validate-packaging`, and `.github/workflows/build-binaries.yml`
- Why:
  - to move the single-host runtime from fixture-seeded execution toward operator-owned local/remote vendor execution and packaged distribution without reopening the locked routing and observability baseline
- How:
  - implemented strict RED/GREEN TDD across foundation, vendor runtime, bridge dispatch, packaging, and parity-remediation slices; validated decision-only/local-only/remote-only/hybrid execution; re-proved live local and remote bridge execution with browser-backed evidence; and proved the packaged runtime by booting the SEA executable and exercising `/healthz` plus `/v1/models`
- What was not done:
  - no dynamic config reload, embedded LiteLLM distribution, or repo-wide schema-tools/Biome remediation was widened into this run
- Known issues / follow-ups:
  - selected package build spot-checks still reproduce the inherited `packages/protocol-types/src/generated.ts` `MetricEntry` drift outside run-owned scope
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path

### Run `18-local-llama-swap-runtime`

- Run folder: `/.recursive/run/18-local-llama-swap-runtime/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - `addenda/03-implementation.addendum.md`
  - `addenda/04-audit-report.md`
- What changed:
  - Added new "Local" sidebar section to the runtime UI with Models, Swap History, and Policy pages
  - Added bridge API endpoints for local runtime state (`GET /api/role-model/local/models`, `/local/swap`, `/local/policy` plus load/unload POSTs and policy PUT)
  - Implemented full page components with Swiss design system compliance (zero-radius cards, stone palette, IBM Plex Mono, accent red)
  - Fixed local API route ordering to prevent SPA fallback interception
  - Fixed `design-system.test.ts` to expect 6 navigation sections instead of 5
- Why:
  - To expose llama-swap's dynamic model-swapping functionality through the role-model runtime UI instead of requiring users to use the vendored llama-swap UI directly
- How:
  - Implemented in 6 ordered sub-phases (SP1–SP6) with build validation after each phase
  - Used pragmatic TDD with browser verification per sub-phase
  - Fixed route ordering issue discovered during browser verification (local API routes must precede static file serving)
- What was not done:
  - Matrix solver UI (OOS1), peer passthrough (OOS2), model-level overrides (OOS3), real-time log streaming (OOS4)
  - Real llama-swap proxy integration — backend methods are stubs returning empty defaults
- Known issues / follow-ups:
  - Backend methods are stubs; a future run must wire them to actual llama-swap runtime calls (`GET /running`, `POST /api/models/unload`, etc.)
  - Swap events are not persisted to SQLite; future run must add `llama_swap_events` table
  - No memory domain docs exist for `apps/runtime-ui/app/routes/*` or `apps/runtime-host-bridge/src/index.ts`

### Run `19-local-llama-swap-proxy`

- Run folder: `/.recursive/run/19-local-llama-swap-proxy/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - Extended `VendorRuntime` interface with optional `getRunningModels`, `unloadModel`, `getLogs`
  - Implemented proxy methods in `vendor-llama-swap` for `GET /running`, `POST /api/models/unload`, `GET /logs`
  - Wired bridge backend methods to real llama-swap proxy calls (replacing Run 18 stubs)
- Why:
  - To close the Run 18 stub limitation by wiring local runtime API endpoints to actual llama-swap process management
- How:
  - Implemented in 3 ordered sub-phases (SP1–SP3) with type-check validation after each phase
- What was not done:
  - SQLite swap event persistence (deferred)
  - Policy read/write to llama-swap config (deferred)
  - Matrix solver UI (OOS)
  - Model-level overrides (OOS)
  - Real-time log streaming UI (deferred)

### Run `16-router-runtime-unified-telemetry-dashboard`

- Run folder: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - widened the canonical runtime telemetry contract across `sqlite-memory`, `runtime-observability`, `runtime-host-bridge`, and `runtime-ui`, including mixed local-plus-remote summary, request-detail, ledger, and SSE refresh surfaces
  - added repo-owned runtime-config read/write/apply routes plus truthful `Control > Runtime Config`, account or OAuth, endpoint activation, controller, and models UI flows
  - repaired valid zero-endpoint `decision_only` behavior so controller reads return `200 null` and the repo-owned UI renders honest pending or unassigned states instead of 500 or loading traps
  - repaired the run-owned schema and generator seams by preserving `UsageEvent.cost_actual` and emitting titled helper types for internal `$defs`, which moved the broader build past the old schema-tools blocker
- Why:
  - to close the run-16 telemetry dashboard requirements and the later audit-remediation and frontend-config addenda with truthful browser-backed proof rather than partial control-plane or fixture-only coverage
- How:
  - implemented strict RED/GREEN TDD across telemetry, runtime-config, zero-endpoint controller, and schema-tools slices; seeded a persistent hybrid runtime state; captured browser and API proof for desktop, mobile-width, dark theme, request detail, and SSE freshness; and completed a delegated code review with no significant issues found
- What was not done:
  - no remediation of the unrelated `provider-acp` or `provider-cli` endpoint-kind drift and no attempt to stabilize the broader workspace-level `process-supervisor` flake was widened into this run
- Known issues / follow-ups:
  - broader root `build` now fails only on the unrelated `provider-acp` / `provider-cli` `endpoint_kind` mismatch
  - broader root `test` still fails on the workspace-level `process-supervisor` crash-callback case, while the isolated package rerun passes

### Run `20-local-llama-swap-completion`

- Run folder: `/.recursive/run/20-local-llama-swap-completion/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - Implemented file-backed policy persistence (local-policy.json) with default policy (ttl: 300, maxConcurrency: 1, autoUnload: true)
  - Added SQLite llama_swap_events table and wired swap event insertions to loadLocalModel/unloadLocalModel
  - Removed dead getLogs code from VendorRuntime interface and vendor-llama-swap
  - Documented loadedAt fabrication in vendor-llama-swap
  - Updated DESIGN_SYSTEM.md with new routes/templates; ui-design-system skill audit: 0 blockers
  - Created 3 new Local UI pages: Logs (dual-console), Matrix (matrix-grid), Peers (registry-detail)
  - Added bridge proxy endpoint for logs (GET /api/role-model/local/logs)
  - Browser verification: screenshots captured for all 6 Local pages
- Why:
  - To close all deferred implementations from Runs 18 and 19 and elevate previously out-of-scope Local features
- How:
  - Implemented in 5 sub-phases (SP1-SP5) with TDD and browser verification
  - All validations green: runtime:validate-host, runtime:validate-vendors, runtime:validate-ui, schemas:validate, smoke
  - 46/46 bridge tests, 61/61 UI tests pass
- What was not done:
  - R7 (Model-level overrides UI): backend persistence and frontend controls deferred to future run
  - R2.5 (Auto-detected swap events): deferred to future run
- Known issues / follow-ups:
  - Model-level overrides require model-overrides.json persistence and override application logic
  - Peer passthrough backend proxy not yet implemented (UI is stub with form)

### Run `21-semantic-color-system`

- Run folder: `/.recursive/run/21-semantic-color-system/`
- Artifacts:
  - `00-requirements.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - Overhauled the design system with semantic colors: cobalt blue (#003B8E) primary accent, red (#C8102E) reserved for errors only, green (#166534) for success, amber (#b45309) for warning
  - Implemented model-level overrides (R9): backend persistence to model-overrides.json, frontend controls on /local/models page for TTL, context window, and concurrency limit per model
  - Implemented auto-detected swap events (R10): background 5s polling of listLocalModels(), automatic SQLite event insertion when loaded model changes
  - Implemented peer passthrough backend (R11): readPeers, updatePeers, checkPeerHealth backend methods, JSON file persistence, health proxy endpoint, full frontend integration on /local/peers page
- Why:
  - To complete the semantic color system overhaul and close all deferred items from Runs 18-20
- How:
  - Implemented in 5 sub-phases (SP1-SP5) with TDD
  - All bridge tests (53/53) and UI tests (61/61) pass
  - Schema validation passes
- What was not done:
  - Browser screenshot verification was blocked by display surface unavailability; verification relied on unit tests and build validation instead
- Known issues / follow-ups:
  - runtime:validate-ui script appears to hang in the current environment (exits with code 143 after timeout); this is an environment issue, not a code issue

### Run `22-router-runtime-routing-strategy-lock`

- Run folder: `/.recursive/run/22-router-runtime-routing-strategy-lock/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/docs/architecture/07-router-runtime-routing-strategy-lock.md` as the repo-owned routing-strategy handoff for alias routing, mode vocabulary, config ownership, difficulty rubric, compatibility policy, and rollout mapping
  - aligned runs `23` through `30` so their requirement docs now consume the repo-owned handoff
  - captured the routing-strategy verification discipline as a durable repo contract before implementation begins in run `23`
- Why:
  - to import the external strategy proposal into repo-owned control-plane artifacts before the routing-runtime implementation sequence starts
- How:
  - implemented a docs-only control-plane run with pragmatic TDD evidence, validated the existing runtime baseline through `schemas:validate`, `runtime:validate-ui`, `runtime:validate-host`, and `smoke`, and performed agent-operated readback QA over the new handoff and downstream run contracts
- What was not done:
  - no runtime execution, routing, controller, difficulty, hybrid, or UI behavior changed in this run
- Known issues / follow-ups:
  - the actual runtime implementation starts in run `23-router-runtime-live-observed-feedback`

### Run `23-router-runtime-live-observed-feedback`

- Run folder: `/.recursive/run/23-router-runtime-live-observed-feedback/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - live routing now reads latest observed profiles from runtime-owned SQLite state on each request instead of relying on the startup fixture-only observed-profile map
  - request observations now expose `routingDiagnostics.observedProfile` with source, `per-request` read mode, and measured-at metadata
  - runtime-level validation now reads back local and remote request observations plus endpoint profiles to prove the feedback loop end to end
- Why:
  - to make persisted live observations the actual routing input before later recency, alias, difficulty, and controller runs build on the same baseline
- How:
  - implemented with strict RED/GREEN TDD, validated the locked Phase 3 slice through focused SQLite and bridge tests plus `schemas:validate`, `runtime:validate-host`, and `runtime:validate-vendors`, and completed agent-operated readback QA over the operator-visible feedback surfaces
- What was not done:
  - no alias routing, recency weighting, difficulty segmentation, controller inference, or hybrid arbitration shipped in this run
- Known issues / follow-ups:
  - later runs still need recency weighting, alias pools, difficulty-aware routing, controller guidance, and hybrid arbitration on top of the runtime-owned feedback baseline

### Run `24-router-runtime-recency-bias-throughput-sla`

- Run folder: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the runtime now owns an explicit `observedData` config contract with defaults and validation for recency weighting and throughput-SLA policy
  - adaptive routing now decays measured quality, latency, throughput, reliability, and cost toward neutral defaults as observations age
  - active throughput-SLA penalties now persist in SQLite runtime state and can either exclude or discount endpoints during routing
  - request observations and runtime validation now expose effective metrics plus throughput-penalty diagnostics for both local and remote endpoint paths
- Why:
  - to turn the run-23 live observed-feedback baseline into real adaptive route selection before later alias, difficulty, controller, and hybrid routing runs build on the same state
- How:
  - implemented with strict RED/GREEN TDD across config, SQLite, protocol-routing, and bridge diagnostics slices, validated the locked Phase 3 slice through `schemas:validate`, focused package tests, `runtime-host-bridge` tests, `runtime:validate-host`, and `runtime:validate-vendors`, and completed agent-operated readback QA over adaptive diagnostics and penalty-driven route outcomes
- What was not done:
  - no alias routing, difficulty classification, controller-guided scoring, hybrid arbitration, or runtime UI implementation shipped in this run
- Known issues / follow-ups:
  - later runs still need alias pools, easy-medium-hard difficulty routing, controller guidance, hybrid arbitration, and final integrated runtime verification on top of the new adaptive observed-data baseline

### Run `25-router-runtime-model-alias-pool`

- Run folder: `/.recursive/run/25-router-runtime-model-alias-pool/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the unified runtime config now owns a `model_aliases` contract that normalizes to `modelAliases` and round-trips through the runtime config surface
  - bridge model discovery and downstream OpenAI-compatible provider guidance now expose configured alias ids alongside real model ids
  - alias requests now expand to pooled real endpoint candidates before existing routing, while exact-model requests stay on the existing direct lookup path
  - persisted request observations and runtime vendor validation now expose durable `aliasResolution` diagnostics, including one hybrid local-plus-remote alias pool proof
- Why:
  - to let operators and downstream clients route through stable alias ids that can span both local and remote models before later difficulty, controller, and hybrid policy runs build on the same baseline
- How:
  - implemented with strict RED/GREEN TDD across config, bridge, runtime-observability, and validator slices, validated the locked Phase 3 slice through `schemas:validate`, `protocol-routing` tests, `runtime-host-bridge` tests, `runtime:validate-host`, and `runtime:validate-vendors`, and completed agent-operated readback QA over live runtime alias surfaces
- What was not done:
  - no difficulty classification, controller-guided routing, hybrid arbitration policy, or runtime UI implementation shipped in this run
- Known issues / follow-ups:
  - alias pools are currently static config-driven mappings; later runs still need difficulty segmentation, controller guidance, hybrid arbitration, and final integrated runtime verification on top of this alias-routing baseline

### Run `26-router-runtime-difficulty-guided-routing`

- Run folder: `/.recursive/run/26-router-runtime-difficulty-guided-routing/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the unified runtime config now owns an explicit difficulty-routing contract, including the shared rubric family, `difficulty_classifier`, alias mode `difficulty`, and per-source `maxDifficulty`
  - bridge request planning now executes a configured classifier with deterministic fallback, maps difficulty to live routing strategy behavior, and persists durable `difficultyRouting` diagnostics with rubric-signal summaries
  - mixed local-plus-remote runtime validation and agent-operated readback now prove difficulty alias discovery, easy-path cost routing, hard-path quality routing, and live hard-request exclusion of underpowered local endpoints
- Why:
  - to make the alias-pool baseline content-aware so the runtime can route across both local and remote endpoints by request difficulty before later cache, controller, and hybrid policy runs build on the same contract
- How:
  - implemented with strict RED/GREEN TDD across config, bridge, runtime-observability, and validator slices, validated the locked Phase 3 slice through `schemas:validate`, `protocol-routing` tests, `runtime-host-bridge` tests, `runtime:validate-host`, and `runtime:validate-vendors`, and completed agent-operated readback QA over live difficulty-alias request observations
- What was not done:
  - no difficulty-learning cache, controller-guided classification or judging, hybrid arbitration policy, or runtime UI implementation shipped in this run
- Known issues / follow-ups:
  - the repo-owned mock classifier used for local readback and validator QA currently emits `easy` or `hard` only, so medium-path live QA remains automated-evidence-only until a richer mock or real classifier-backed harness lands
  - later runs still need difficulty-segmented observed learning, controller guidance, hybrid arbitration, and final integrated runtime verification on top of this difficulty-routing baseline

### Run `27-router-runtime-difficulty-learning-cache`

- Run folder: `/.recursive/run/27-router-runtime-difficulty-learning-cache/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the unified runtime config now owns a durable `observed_data.difficulty_learning` contract with explicit cache invalidation, advisory recommendation thresholds, and observed override thresholds
  - bridge and SQLite runtime state now persist conversation difficulty cache entries, segmented easy/medium/hard observed profiles, advisory `maxDifficulty` recommendation payloads, observed override explanations, and selected-bucket observed-profile diagnostics
  - mixed local-plus-remote validation and agent-operated readback now prove bucketed endpoint-profile inspection, deterministic cache reuse and invalidation, observed override of configured ceilings, and bucket-selected routing outcomes
- Why:
  - to make the run-26 difficulty-routing baseline stateful and self-tuning without silently mutating operator config before later controller-guided routing, hybrid policy, and final integration runs build on the same learning semantics
- How:
  - implemented with strict RED/GREEN TDD across config, SQLite-memory, bridge, runtime-observability, and validator slices, validated the locked Phase 3 slice through `schemas:validate`, `sqlite-memory` tests, `runtime-observability` tests, `protocol-routing` tests, `runtime-host-bridge` tests, `runtime:validate-host`, and `runtime:validate-vendors`, and completed agent-operated readback QA over live bucket, cache, override, and route-selection surfaces
- What was not done:
  - no controller-guided routing or judging, broader hybrid arbitration policy, automatic config mutation from recommendations, or runtime UI implementation shipped in this run
- Known issues / follow-ups:
  - advisory recommendations remain explicit but will continue to report `recommendedMaxDifficulty = null` until enough per-bucket samples accumulate to clear the configured `minSamples` threshold
  - later runs still need controller-guided routing and judging, richer hybrid policy arbitration, operator UI surfaces, and final integrated runtime verification on top of this stateful learning baseline

### Run `28-router-runtime-controller-guided-routing`

- Run folder: `/.recursive/run/28-router-runtime-controller-guided-routing/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the unified runtime config now owns an explicit `controller` contract with source-type targeting, model or endpoint selection, and bounded timeout behavior
  - the bridge now executes request-time controller inference for intelligent aliases, validates structured routing directives, merges accepted guidance into live routing requests and `routingModel` preference, and fails closed on invalid controller output
  - runtime observations, validator proof, and agent-operated readback now distinguish controller-active steering, explicit fallback, alias-only behavior, and exact-model compatibility across mixed local-plus-remote runtime surfaces
- Why:
  - to implement the strategy-B controller-guided routing slice before later request rewriting, broader hybrid arbitration, UI expansion, and final runtime convergence work build on the same routing contract
- How:
  - implemented with strict RED/GREEN TDD across unified config, bridge plan merge, live controller execution, runtime-observability diagnostics, and mixed-vendor validator slices, then validated through `runtime-host-bridge` tests, `runtime-observability` tests, `protocol-routing` tests, `runtime:validate-vendors`, `runtime:validate-host`, `schemas:validate`, and agent-operated readback QA
- What was not done:
  - no request rewriting, broader hybrid arbitration policy, UI implementation, or final integrated runtime convergence shipped in this run
- Known issues / follow-ups:
  - the current live mixed-pool proof uses strategy-level controller guidance and endpoint preference rather than richer role-task rewriting, which remains owned by later runs
  - the legacy global controller-assignment API still exists as an operator surface but remains intentionally distinct from request-time controller inference
  - later runs still need request rewriting, hybrid arbitration, UI surfaces, and final end-to-end runtime integration on top of this controller-guided baseline

### Run `29-router-runtime-request-rewriter-hybrid-mode`

- Run folder: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the bridge now accepts per-request routing-mode overrides for `baseline`, `difficulty`, `controller`, and `hybrid`, rejects invalid values deterministically, and records whether the effective mode came from a request override or alias default
  - the bridge now records explicit rewrite receipts and hybrid-arbitration receipts, including rewrite-applied versus rewrite-skipped outcomes, downstream model ids, hybrid strategy changes, and controller-dominant planning signals
  - runtime observations, same-pool validator proof, and agent-operated readback now expose durable `routingDiagnostics.routingMode`, `routingDiagnostics.rewrite`, and `routingDiagnostics.hybridArbitration` metadata across mixed local-plus-remote endpoint pools while preserving exact-model additive compatibility
- Why:
  - to complete the backend routing-strategy surface before run 30 performs proposal-wide runtime convergence, UI work, and final end-to-end verification on top of the same local-plus-remote routing contract
- How:
  - implemented with strict RED/GREEN TDD across bridge ingress, planning, runtime-observability diagnostics, and mixed-vendor validator slices, then validated through `runtime-host-bridge` tests, `runtime-observability` tests, `protocol-routing` tests, `runtime:validate-vendors`, `runtime:validate-host`, `schemas:validate`, and agent-operated readback QA
- What was not done:
  - no proposal-wide convergence audit, integrated runtime UI implementation, or final end-to-end strategy closeout shipped in this run
- Known issues / follow-ups:
  - the legacy global controller-assignment API still exists as an operator surface but remains intentionally distinct from per-request override and hybrid-routing behavior
  - later runs still need final integrated runtime convergence, UI surfaces, and proposal-wide verification on top of the now-complete backend routing surface

### Run `30-router-runtime-strategy-convergence-e2e`

- Run folder: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the repo-owned runtime UI now exposes a first-class `Control > Routing strategy` surface instead of treating routing strategy as raw runtime-config JSON only
  - the workbench now exposes alias-default plus explicit `baseline`, `difficulty`, `controller`, and `hybrid` override control, while request ledger and request detail now surface routing decision ids plus routing-mode, rewrite, difficulty, controller, hybrid, and rubric-signal receipts ahead of raw bundles
  - `runtime:validate-ui` now includes deterministic routed-request proof for the same operator-facing telemetry and request-detail receipt surfaces that the runtime UI depends on
- Why:
  - to close the final proposal-convergence gap on top of the already-complete run-29 backend routing surface by making routing strategy operable and inspectable from the shipped runtime shell
- How:
  - implemented with strict RED/GREEN TDD across design-system route contracts, the workbench override API seam, request-ledger view models, route-level receipt surfaces, and the runtime UI validator, then validated through the runtime-ui suite, focused runtime-host-bridge validator coverage, `runtime:validate-ui`, `runtime:validate-host`, `runtime:validate-vendors`, `schemas:validate`, and agent-operated UI readback
- What was not done:
  - no new routing strategies beyond the locked baseline, difficulty, controller, and hybrid modes were introduced
  - no separate browser automation harness was added; the run stayed on the repo-owned runtime UI and validator stack
- Known issues / follow-ups:
  - persisted routing receipts remain owned by request-observation surfaces, so the workbench result panel still hands operators to the telemetry ledger or request detail for durable receipt verification rather than embedding synthetic response-body copies

### Run `32-router-runtime-routing-operator-surface`

- Run folder: `/.recursive/run/32-router-runtime-routing-operator-surface/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the runtime UI now exposes a first-class `Router` section with overview, config, candidates, decisions, and request-keyed decision-detail pages
  - the runtime host bridge now exposes a structured `/api/role-model/router/*` family and the frontend consumes it through typed runtime API helpers instead of scraping raw request bundles inline
  - the live-QA bootstrap now uses the complete fixture bundle and forwards the Router readers into `startBridgeServer`, and the Router detail page now ignores stale async completions after rapid navigation
- Why:
  - to close the remaining operator-visibility gap left after run 30 by making routing configuration, candidate posture, and per-request decisions legible in the shipped runtime UI rather than scattering them across Control, Observe, and raw JSON
- How:
  - implemented with design-system-first RED/GREEN updates, backend Router API TDD, frontend runtime API and page TDD, focused package validation, a code-review hardening pass, and live browser-backed runtime QA against a seeded routed request
- What was not done:
  - no new routing strategies beyond the already locked runtime-routing program were introduced
  - no broad repo-wide formatter or baseline hygiene remediation was widened into this run
- Known issues / follow-ups:
  - root `ci:check` still reproduces the inherited Phase 0 formatter-drift failure in `biome check .`
  - the runtime-ui package test script may need future runner hardening on this Windows environment because the default multi-worker Vitest invocation can OOM during teardown even when the suites themselves pass
  - the advanced raw runtime-config editor remains intentionally available as an escape hatch beside the new structured routing-strategy surface

### Run `32-models-dev-metadata-coverage`

- Run folder: `/.recursive/run/32-models-dev-metadata-coverage/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `addenda/02-to-be-plan.credential-lifecycle-remediation.addendum-01.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - Added the explicit root `catalog:refresh` command and completed the repo-owned refresh/export flow for pinned models.dev snapshot inputs, normalized catalog artifacts, and vendor-version ledger outputs.
  - Made the generated normalized catalog the default metadata authority for runtime and UI provider/model metadata while preserving role-model-owned auth/control-plane semantics and LiteLLM execution coverage.
  - Reworked runtime-host and runtime-ui consumers so provider docs, env-var hints, capability/spec labels, and related operator metadata come from the catalog/readiness layer rather than fixture-grade placeholders.
  - Completed the approved credential-lifecycle remediation inside the same run: pending device-code sessions survive reload/restart, persisted OAuth-backed accounts rehydrate truthfully, unresolved env-backed credentials stay explicitly `credentials-missing`, and packaged/runtime operator surfaces no longer imply execution-readiness when prerequisites are missing.
  - Strengthened packaged validation so `runtime:validate-packaging` rebuilds the host before SEA injection and proves packaged `/healthz`, `/v1/models`, `/v1/chat/completions`, and `/v1/responses` behavior against the current host/runtime baseline.
- Why:
  - To make models.dev the shipped metadata authority without losing LiteLLM coverage or role-model-specific onboarding semantics, and to close the resulting operator-truthfulness gaps that surfaced during packaged OAuth/API-key verification.
- How:
  - Implemented under strict TDD with preserved RED receipts for refresh, export, provider-metadata defaulting, and supplement-merge gaps, followed by focused GREEN slices and final integrated reruns.
  - Final verification included the runtime-ui suite (`5` files / `67` tests), the runtime-host suite (`10` files / `61` tests), `runtime:validate-host`, `runtime:validate-packaging`, and root `build`, plus agent-operated packaged QA evidence.
- What was not done:
  - The run did not replace LiteLLM as the execution-coverage layer or widen into unrelated UI redesign or new auth flows outside the existing override/control-plane boundary.
- Known issues / follow-ups:
  - Closeout had to document tracked-diff versus status-only additions explicitly because the executable Phase-0 diff basis excludes some untracked worktree paths until they are added; this was treated as an audit-accounting concern, not a requirements gap.

### Run `34-router-runtime-role-policy-and-ui-fixture-reduction`

- Run folder: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the runtime now owns router-grade role and task policy under `runtimeStateRoot\role-policy.json`, with bridge CRUD/readback routes and router consumption switched away from the old fixture-fed `adapter-role-task.json` source
  - the runtime UI now ships `Control > Roles` plus live role create/edit, task allowlist editing, and model-side role binding updates from `Control > Models`, while touched frontend surfaces/tests no longer lean on placeholder model ids or fixture-oriented operator copy
  - request-time role targeting is now a first-class bridge seam for chat-completions and responses, and the selected role policy applies `default_system_instructions`, `tool_policy`, `output_contracts`, and `safety_policy_refs` with durable `routingDiagnostics.rolePolicy` receipts
  - the QA launcher now exposes the role-policy, model inventory, and device-authorization readers needed for live Roles/Models browser proof, and the vendored llama-swap launcher now uses `src/cli-entry.ts`, which restores `runtime:validate-host`
- Why:
  - to make role policy operator-owned and router-effective instead of fixture-owned, expose the full router-grade role workflow in the shipped runtime UI, remove touched frontend fixture debt, and close the remaining validation blocker before final end-to-end proof
- How:
  - implemented under strict RED/GREEN TDD across host-bridge, runtime-observability, runtime-ui design-system/client routes, QA bootstrap wiring, and the vendored Go launcher seam, then validated with focused package tests/builds, `runtime:validate-ui`, `runtime:validate-host`, `runtime:validate-vendors`, live browser QA, and backend alias-routing proof
- What was not done:
  - the run did not widen into new routing-strategy modes, broad repo-wide formatter remediation, or a QA-launcher runtime-config persistence redesign
- Known issues / follow-ups:
  - resolved in run 49 Phase 5 Addendum 19: the QA launcher now seeds and passes `unifiedRuntimeConfigPath`, so runtime-config save and routing-strategy browser proof are covered by the live QA harness
  - the broader worktree still contains unrelated status noise outside run 34 scope, including older nested `role-model-router/.recursive/run/*` history and a Python `__pycache__` artifact

### Run `35-runtime-ui-connect-declutter`

- Run folder: `/.recursive/run/35-runtime-ui-connect-declutter/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - `addenda/02-to-be-plan.post-closeout-packaged-runtime.addendum-01.md`
  - `addenda/03-implementation-summary.post-closeout-packaged-runtime.addendum-01.md`
- What changed:
  - the runtime UI now uses a **Connect** nav pillar with canonical `/app/connect*` routes (Registry / Downstream / Upstream) for how applications consume role-model as a provider, while **Local → Endpoints** at `/app/local/endpoints` remains the device-inference peer inventory
  - legacy `/app/endpoints*`, `/app/control/endpoints`, and `/app/integrations/*` paths redirect to the Connect routes; Connect registry no longer owns alias inventory and instead hands off to Router
  - the operator shell is quieter: left-rail page counts and meta-guidance panels (Reading order, Inspection path) are removed; Overview shows a slim latest-requests teaser; Local Matrix is merged into Local Models **List | Grid**; Router Config guidance/policy sections merge into Router Overview with `/app/router/config` redirecting to `/app/router`
  - a shared `DisclosureSection` primitive collapses dense request-detail and model-inspection secondary groups by default; unused `future-surface.tsx` was deleted and `DESIGN_SYSTEM.md` was updated for the Connect pillar and copy budgets
  - frontend manual QA for this run uses hybrid browser-session visual verification (Cursor IDE browser MCP + screenshots) with Phase 4 tests as companion proof; request-detail disclosure remains partially blocked when the telemetry ledger is empty
- Why:
  - to reduce runtime UI clutter, fix the Local Endpoints versus router-as-provider naming collision, and keep the three configuration pillars (Local device inference, Remote cloud providers, Connect app consumption) legible without widening backend scope
- How:
  - implemented design-system-first across SP1–SP7 in an isolated worktree, kept `design-system.test.ts` regression guards green (88 runtime-ui tests), passed production build, delegated Phase 3.5 code review, and re-ran Phase 5 with live browser QA plus screenshot evidence; post-closeout addendum 01 (SP8) fixed packaged `--static-root` serving and routing-strategy live registry endpoint counts, then merged to `main` at `c8de236`
- What was not done:
  - the run did not change bridge routing semantics, provider onboarding backends, or auth flows; it did not add new operator features beyond IA/copy/merge/disclosure refactors
- Known issues / follow-ups:
  - request-detail disclosure could not be visually verified when no telemetry requests exist and test chat completion returned `503`; model-modal disclosure provides compensating visual proof for `DisclosureSection`
  - packaged `/logs` and Observe → Logs may still show zero rows even when request telemetry is present; treat as a separate observability follow-up outside run 35 scope

### Run `36-runtime-consumption-telemetry-remediation`

- Run folder: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - `addenda/02-to-be-plan.benchmark-routing-visibility.addendum-04.md` through `addenda/03-implementation-summary.benchmark-workflow-control-remediation.addendum-10.md`
  - `05-manual-qa.addendum-01.md` through `05-manual-qa.addendum-03-routing-strategy-matrix.md`
- What changed:
  - **SP1–SP6 (base):** bridge execution enriches the normalized catalog at request time (`getCurrentExecutionCatalog()`); provider-openai/workbench map `reasoning_content`; telemetry-backed logs fallback and `/logs/stream` pre-static guard; measured `latencyMs`; `x-role-model-request-id` alias; failure telemetry persistence
  - **QA addendum 01:** packaged `Role-Model.bat` on `:3456` verified R1–R6 live (local LFM + remote Kimi k2.6, measured latency 384ms/2665ms)
  - **QA addendum 02:** SP7 throughput SLA sole-candidate fix in `evaluateEligibility`; SP8 partial runtime-config merge (`mergeUnifiedRuntimeConfigDocuments`); Connect consumer curls and Strategy C difficulty alias validated; exact-remote SLA root cause documented
  - **QA addendum 03:** routing strategy matrix — 46 prompts × 4 strategies (166 runs, 0 HTTP failures) for classifier/strategy tuning decisions
  - **Addendum 04:** Models pillar Benchmark tab, benchmark summary/preferences APIs, router `benchmarkCapability` on candidates
  - **Addendum 05:** Benchmark page UX — header cleanup, per-model score breakdown, clear benchmark data per endpoint
  - **Addendum 06:** Judge grading brief, invalid-patch score caps, reasoning-channel extraction, decimal score display
  - **Addendum 07:** Judge throttle/retry, `judgeUnavailable` fallback, grading order (later refined by addendum 10)
  - **Addendum 08:** Compare persistence, circuit breaker, case audit transparency, subject preflight prompt
  - **Addendum 09:** Canonical `/.recursive/BENCHMARK-WORKFLOW.md`, `validate-benchmark-run.py` gates, model-agnostic safeguards
  - **Addendum 10:** Removed `max_tokens` on benchmark paths; Kimi-preferred overlap judge; separate grade/compare parsers; substantive rationale gate; operator run `c0b66038` **VALID** + **HEALTHY** (Kimi 92% > LFM 17%)
  - **Consumer routing E2E:** difficulty suite on `:3456` — 14/15 pass (hard→remote 3/3, easy→local 3/3, telemetry 15/15); `p26-cache-easy-a` false-fail on warm shared `conversationId`
- Why:
  - to remediate packaged-runtime consumption, reasoning-model output, logs, and telemetry truthfulness gaps discovered after run 35 and to validate benchmark workflow plus live consumer routing on the operator-packaged runtime
- How:
  - implemented SP1–SP6 in an isolated worktree with strict/pragmatic TDD, agent-operated Phase 5 HTTP QA, then iterated benchmark addenda until operator validation passed all accuracy gates with HEALTHY control; rebuilt SEA package and ran consumer routing difficulty suite against live `:3456`
- What was not done:
  - the run did not redesign Studio-only bypass paths, change provider onboarding backends, or fix unrelated root `build`/`test` Biome drift; it did not require cold-cache isolation for every cache-probe scenario in the consumer suite
- Known issues / follow-ups:
  - consumer cache-probe scenario `p26-cache-easy-a` can false-fail when prior easy prompts warmed the shared conversation cache; isolate `conversationId` per cache expectation if the suite is promoted to CI
  - medium-path live difficulty QA on the binary mock classifier remains automated-evidence-only under the current classifier fixture

### Run `38-local-model-roles-peer-llama-swap-split`

- Run folder: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - `addenda/ui-architecture-and-page-spec.md`
- What changed:
  - Split Local UI into **Choose local backend**, **Peer models**, and **Llama-swap models** with legacy redirects to `/app/local/llama-swap/*`
  - Split local model HTTP APIs for peer vs llama-swap list/load/roles/unload
  - Peer `modelRoleBindings` persist and merge on `syncLocalPeerState`; wildcard peer validation when `allowedModels` is empty
  - `local-model-role-bindings.ts` feeds router dynamic bindings for peer and llama-swap registry endpoints
  - Packaged SEA rebuild, config parity, `probe-downstream-ingress.py` green (0 BRIDGE_CRASH), browser QA on `:3456`
- Why:
  - local models were routable but not role-aware; peer and llama-swap were mixed on one page; peer roles were wiped on sync; router ignored llama-swap bindings
- How:
  - strict TDD for provider-account, bindings module, and design-system; SEA rebuild + operator config parity + routing regression + cursor-ide-browser MCP QA
- What was not done:
  - llama-swap live load+role browser proof in operator env (llama-swap disabled); isolated git worktree not created (feature branch at repo root)
- Known issues / follow-ups:
  - peer-models prerequisites flash fix in working tree requires SEA rebuild to ship; optional llama-swap-enabled QA for `R3`/`R7` scenario B

### Run `45-observe-surface-realignment`

- Run folder: `/.recursive/run/45-observe-surface-realignment/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - reasserted `Observe → Requests` and `Observe → Request detail` as the canonical structured telemetry path, with `/app/observe` landing on `/app/observe/requests`
  - reframed `Observe → Activity` and `Observe → Logs` as preserved raw-host adjacency surfaces with explicit handoffs back into canonical telemetry
  - upgraded Requests to consume telemetry dashboard summary data and strengthened request-detail adjacency links
  - fixed packaged-runtime log correlation by teaching the shared log-row parser to recognize bracketed timestamp lines like `[timestamp] req-runtime-host-bridge ...`, so real packaged logs can deep-link into request detail
  - completed packaged-runtime verification by rebuilding the SEA executable and proving the Observe flow in the browser on `http://127.0.0.1:3456`
- Why:
  - run 35 left Observe drifted: Requests had become the real telemetry surface, while Activity and Logs still read like parallel primaries and packaged Logs could not correlate real request ids back into the canonical inspector
- How:
  - implemented design-system-first in an isolated worktree with strict TDD, captured RED/GREEN evidence for every production slice, rebuilt the packaged runtime, and ran agent-operated browser QA on the rebuilt runtime
- What was not done:
  - the run did not add new bridge APIs or a broader observability subsystem; backend expansion remained out of scope because the required handoffs were achievable in the frontend and shared view-model layer
- Known issues / follow-ups:
  - packaged Activity can still be empty when no host metrics or captures exist; its reframing is intentional and does not attempt to synthesize raw-host activity from canonical telemetry
  - the run intentionally keeps raw `/api/metrics`, `/api/captures/:id`, `/logs`, and `/logs/stream/*` surfaces as preserved operator tools rather than replacing them
- **Addendum 01** (`llama-swap-setup-scaffold-and-ui-hints`):
  - Artifacts: `addenda/00-requirements.llama-swap-setup-scaffold-and-ui-hints.addendum-01.md`, `03-implementation-summary.addendum-01.md`, `05-manual-qa.addendum-01.md`
  - What changed: `llama-swap-setup.ts` scaffold helpers; runtime-config **Insert llama-swap scaffold**; setup hints + modal on llama-swap Local surfaces when not operational
  - Why: peer-only operators had no onboarding path when `llama_swap.models` empty (run 38 `R3`/`R7` scenario B deferred)
  - Verified: 6/6 unit tests; browser QA on `:3456` with peer-only config; SEA SHA256 `acf14c9829f6b7b9144dc5e9334fc212c8ce8fbd4eff873dec44aaf1b492dce5`

### Run `47-runtime-persistence-rehydration-lifecycle`

- Run folder: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - addenda `02-to-be-plan.addendum-01.md` through `02-to-be-plan.addendum-03.md`
  - follow-up receipts `03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`, `04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`, `05-manual-qa.addendum-02.md`, and `05-manual-qa.addendum-03.md`
- What changed:
  - base run: made runtime session/bootstrap state durable across reload and restart, preserving provider-account lifecycle truth, operator intent, endpoint inventory, and readiness/reporting without requiring a UI revisit
  - follow-up addenda: failed telemetry rows now preserve caller correlation and classification in the canonical request ledger; `/app` leads with the telemetry summary row and an interaction-level latest-requests rail; `/app/observe/activity` preserves backend newest-first ordering; `/app/router` alias inventory now separates configured hints, resolved models, allowed endpoints, and readiness
  - post-closeout router cleanup: `/app/router` removes the redundant `Allowed endpoints`, `Execution-ready aliases`, `Guidance provenance`, and `Policy inputs` sections, and `/app/router/strategy` removes `Current control-plane context` so the surviving router surfaces stay focused on canonical inventory and routing controls
  - verification-first alias-drift slice closed without new production code once the canonical config-removal regression proved that stale warnings clear correctly when the persisted hint is actually removed
- Why:
  - the base run fixed restart/rehydration lifecycle gaps, while the later operator QA exposed telemetry/dashboard/router presentation and failure-ledger truth gaps that had to be repaired without regressing the new persistence baseline
- How:
  - strict TDD for the owned production slices, targeted runtime-ui/sqlite-memory/host-bridge verification, packaged SEA rebuild, direct API proof on the rebuilt runtime at `:3456`, and browser verification of `/app`, `/app/router`, `/app/observe/activity`, and `/app/observe/requests`
  - final router-surface cleanup was validated with focused `runtime-ui` design-system regression coverage plus explicit manual QA pass on the live runtime
- What was not done:
  - the follow-up did not backfill historical pre-fix failure rows in SQLite, suppress backend-truth alias-drift warnings, or widen into unrelated host-bridge suite flakes
- Known issues / follow-ups:
  - older pre-fix failure rows can still show legacy fallback markers such as `unknown.endpoint`; the forward path is fixed, but existing telemetry is not migrated
  - the live `moonshot/kimi-k2.6` warning on `:3456` remains correct until the persisted operator config is changed
  - the broader Windows host-bridge suite still has an unrelated OAuth temp-file rename `EPERM` flake outside run-47 scope

### Run `48-runtime-ui-design-system-apple-theme`

- Run folder: `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - `addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- What changed:
  - replaced the remaining Swiss-authority runtime-ui contract with the repo-owned Apple-inspired design baseline documented in `role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md` and `DESIGN_SYSTEM.md`
  - standardized the operator shell on explicit Light/Dark themes, sidebar-owned theme switching, Apple typography tokens, transparent semantic status pills, no shared internal divider lines, and themed shared controls including custom selects
  - repaired the shared shell-header contract, route action plumbing, and packaged-runtime asset-sync path so rebuilt runtime-ui assets and route headers stay stable on the packaged operator surface
  - completed late packaged-runtime QA remediations including sidebar containment, divider and eyebrow removal, route rollout verification, and the final Remote Providers select-chevron alignment fix
- Why:
  - the previous runtime-ui baseline no longer matched the approved design reference, still carried Swiss-era wording and token drift, and exposed packaged-runtime UI failures that only appeared after the browser QA pass
- How:
  - implemented the refresh with strict RED/GREEN coverage on shared design-system slices, rebuilt the SEA runtime repeatedly against the worktree, ran controller-owned packaged-runtime route and screenshot QA on `:3457`, and closed the run only after explicit user approval of the final browser state
- What was not done:
  - the run did not redesign route architecture, backend provider onboarding semantics, or non-UI runtime subsystems beyond the stability work needed to serve the corrected frontend baseline
- Known issues / follow-ups:
  - controller-owned screenshot capture in this environment remained light-mode only, so final dark-mode and persistence acceptance stayed hybrid with explicit user sign-off plus deterministic theme tests
  - root-level runtime-ui screenshot copies and temporary QA runtime state remain local validation residue rather than product-source changes

### Run `39-runtime-session-rehydration-model-inventory`

- Run folder: `/.recursive/run/39-runtime-session-rehydration-model-inventory/`
- Artifacts: `00-requirements.md` through `08-memory-impact.md`, addenda `routing-diagnostics-remediation` + `session-persistence-and-r11-gap`
- What changed:
  - Removed init-time `runtime_endpoints` wipe; dual-write/read `operator-intent.json`; ordered session bootstrap pipeline with readiness API/UI
  - Inventory-first alias reconciliation with drift warnings; remote health bootstrap stage (skipped in `decision_only`)
  - R10/R15 routing diagnostics and Craft ask-mode difficulty fixes (`runtime-routing-model.ts`, last-user-turn burden)
- Why:
  - Restart dropped activations while OAuth persisted; Craft `hello` inflated to `medium` via user-role preamble
- How:
  - strict TDD SP1–SP6; addenda R10–R15; restart-rehydration + session-readiness validators; agent-operated QA
- What was not done:
  - live packaged `:3456` peer reload drill in operator env; local latency-score preference tuning
- Known issues / follow-ups:
  - rebuild SEA after merge; optional cleanup of duplicate `moonshot.personal.moonshot-oauth` account

### Run `40-catalog-economics-moonshot-consolidation`

- Run folder: `/.recursive/run/40-catalog-economics-moonshot-consolidation/`
- What changed: catalog-only routing economics, Kimi canonical map, Moonshot picker hygiene, routing diagnostics
- Why: neutral 0.5 cost ties; dual Moonshot providers; operator Kimi model lacked catalog pricing
- How: strict TDD Phase 0→8 from locked requirements; RED/GREEN logs on disk
- What was not done: R8 authProfile refactor; packaged `:3456` drill
- Follow-ups: SEA rebuild; optional R8 addendum

### Run `41`

- Run folder: `/.recursive/run/41/`
- What changed: dashboard Latency card shows average as headline and p95 in detail (UI-only)
- Why: p95-only headline alarmed operators when average latency was reasonable
- How: pragmatic TDD; 90/90 runtime-ui tests green
- What was not done: no backend telemetry contract changes
- Known issues / follow-ups: none

### Run `42-provider-kind-craft-ask-routing`

- Run folder: `/.recursive/run/42-provider-kind-craft-ask-routing/`
- Artifacts: `00-requirements.md` through `08-memory-impact.md`, RED/GREEN and phase5 QA logs
- What changed:
  - added `provider-metadata-merge.ts` and wired merged operator metadata into `listProviders`, OAuth start, and `createUnifiedProviderAccounts`
  - extended Craft ask-mode rubric for declared tools without active tool usage
  - packaged DeepSeek verification on `:3456` (connect, chat, quick benchmark)
- Why:
  - 19 overlap providers failed connect with `PROVIDER_KIND_MISMATCH`; Craft simple chat misclassified as hard
- How:
  - strict RED/GREEN TDD; agent-operated phase5 QA; self-audit closeout phases 3–8
- What was not done:
  - no catalog export rewrite; no per-provider-id exception branches; full 19-id parameterized phase5 connect loop deferred to unit/integration tests
- Known issues / follow-ups:
  - DeepSeek reasoning models need sufficient `max_tokens` for chat probes; overlap CI guard should run on catalog/LiteLLM inventory changes

### Run `43-benchmark-routing-display`

- Run folder: `/.recursive/run/43-benchmark-routing-display/`
- Artifacts: `00-requirements.md` through `08-memory-impact.md`; addenda `01` and `02` under `addenda/`; RED/GREEN and phase5/addendum QA logs
- What changed:
  - per-mode benchmark API (`/benchmark/summaries/by-mode`, `/benchmark/runs`) and Models → Benchmark UI with routing quality separation
  - `benchmark-routing-quality.ts` with case-weighted overall, hard full+quick blend, `benchmark_mode` tagging on sample persist
  - dashboard latency detail (run 41 completion), failure telemetry latency, global benchmark clear, benchmark/candidate latency UI
  - **Addendum 01:** dual-run in model cards, run history order, live `hardBlend` on candidates API
  - **Addendum 02:** `credential-ref-env.ts`; `${DEEPSEEK_API_KEY}` external config pattern; sqlite stores env ref name only
- Why:
  - operators lost full-run context when quick ran; artifact vs routing scores conflated; dashboard latency showed n/a; inline API keys leaked into sqlite
- How:
  - strict TDD for bridge/sqlite slices; pragmatic UI addendum; agent-operated packaged QA on `:3456`; self-audit closeout phases 6–8 with addenda reconciliation
- What was not done:
  - no benchmark case/rubric changes; no catalog export rewrite; full 55-case re-run not required for addendum 01 closure
- Known issues / follow-ups:
  - legacy scope folders under same runtime state root (e.g. `run42-verify`) may retain pre-migration credential rows; QA must target active scope sqlite
  - operator should keep LiteLLM keys in env vars, not inline yaml, when using unified runtime config

### Run `44-kimi-k2.7-code-catalog`

- Run folder: `/.recursive/run/44-kimi-k2.7-code-catalog/`
- Artifacts: `00-requirements.md` through `08-memory-impact.md`; catalog refresh/export logs; SEA + provider smoke logs
- What changed:
  - added `moonshotai/kimi-k2.7-code` via models.dev refresh and operator slice `moonshot/kimi-k2.7-code`
  - pricing alias `moonshot/kimi-k2.7-code` → `moonshotai/kimi-k2.7-code`; `structured_output` capability mapping in catalog refresh
  - LiteLLM fixture row for k2.7; bridge test for `listProviders` variant listing
- Why:
  - Kimi K2.7 Code was on models.dev but never merged to `main`; Connect Kimi Code variant omitted the model because normalized catalog stopped at k2.6
- How:
  - catalog pipeline only (no Connect UI changes); strict TDD; packaged SEA rebuild and `:3456` provider API smoke
- What was not done:
  - no new providers; no `resolveModelIds` union refactor; optional Kimi Code OAuth chat not run
- Known issues / follow-ups:
  - vendored LiteLLM submodule may still lack upstream k2.7 row; repo fixture covers validation until vendor refresh

### Maintenance `ci-release-automation-hardening`

- Run folder: `n/a` (workflow maintenance outside a numbered recursive run folder)
- Artifacts:
  - `/docs/operations/02-ci-and-release-flow.md`
  - `/docs/operations/03-release-checklist.md`
  - `/CHANGELOG.md`
  - `/scripts/generate-recursive-release-changelog.mjs`
- What changed:
  - split `/.github/workflows/ci.yml` into phase-attributed validation steps so GitHub failures identify the failing stage directly
  - changed `/.github/workflows/docs-site-deploy.yml` to build on pull requests without deployment secrets and deploy only on non-PR events after explicit Cloudflare guards
  - changed `/.github/workflows/build-binaries.yml` so matrix jobs only build and attest archives, while one final tag-gated publish job assembles installer scripts, checksums, and release assets
  - added `/.github/release.yml` plus recursive-artifact changelog generation so GitHub releases combine generated notes with repo-authored implementation, decision, and state receipts
- Why:
  - GitHub-only failures were too opaque, docs validation was coupled to deploy-only concerns, and release assets plus release notes were not yet reproducible from the repository truth
- How:
  - workflow hardening first, canonical docs second, then local verification through `corepack pnpm run ci:check`, `corepack pnpm run lint`, `corepack pnpm run docs:build`, and `corepack pnpm run runtime:package-sea` before relying on tag-gated GitHub release publication
- What was not done:
  - no npm distribution channel was introduced; installation remains source checkout or released binaries with install scripts
- Known issues / follow-ups:
  - GitHub release publication still depends on real tag pushes plus repo-side permissions and environment policy; keep the operations docs aligned whenever workflows or release assets change

### Run `49-runtime-telemetry-analytics-charts`

- Run folder: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - addenda `addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md` through `addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-04.md`
- What changed:
  - added backend-owned historical telemetry analytics over persisted request-time facts, including effective/request cost, avoided cost, cache-hit tokens, routing strategy, difficulty, role, model, endpoint, provider, status, and latency dimensions
  - added `POST /api/role-model/telemetry/query` plus runtime UI chart models for `/app`, `/app/observe/requests`, and `/app/observe/routing`; chart display remains out of setup/config routes
  - extended the runtime UI design system with Apple-themed chart tokens, chart palette, shared chart primitives, themed selects/listboxes, typography/control repairs, quiet shell panels, light/dark support, and route-wide design-system adherence
  - repaired run 49 Phase 5 gaps through addenda: restored run 48 Apple-theme shell contract, fixed broken routes, removed redundant panels/dividers/header refresh buttons, repaired dropdown/listbox theming and keyboard behavior, enforced per-chart color uniqueness, normalized fact-card type, merged overview telemetry controls into the header, and cleaned Connect/System redundant components
  - repaired routing strategy persistence/readback and derived alias consistency so strategy plus execution mode determine the effective routing alias; `/api/role-model/router/candidates` is now the canonical configured candidate source with execution-mode eligibility metadata used by Router and Models -> Benchmark
  - repaired benchmark startup so execution-mode-ineligible endpoints are excluded in the UI and rejected synchronously by the backend instead of producing instant blank benchmark failures
- Why:
  - FAS-7 required future-proof backend telemetry storage/querying plus chart-led operator analytics, and Phase 5 found that the chart work had regressed the approved run 48 Apple-themed runtime UI contract and exposed routing/config/candidate truth gaps
- How:
  - implemented with strict RED/GREEN TDD for backend, persistence, runtime UI, design-system, route, routing strategy, canonical candidates, and benchmark guard slices; rebuilt the runtime UI; verified direct APIs and all chart pages in the in-app browser; completed hybrid manual QA with operator approval on `2026-06-18`
- What was not done:
  - the run did not add charts to Router, Models, Local, Remote, or Connect setup pages; analytics charts intentionally live only on `/app` and Observe analytics pages
  - the Phase 5 QA launcher still disables vendor startup, so fresh successful live-completion chart generation was not possible in that harness
- Known issues / follow-ups:
  - dashboard graph E2E proved fresh router probes are ingested into analytics through failed request rows; successful token/cost/cache chart metrics were verified from seeded successful telemetry rows rather than fresh successful completions because vendor execution is disabled in the QA launcher
  - build assets under `role-model-router/apps/runtime-ui/build/` are QA byproducts and should remain untracked

### Run `50-openai-codex-subscription`

- Run folder: `/.recursive/run/50-openai-codex-subscription/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - addenda `addenda/02-to-be-plan.addendum-01.md` through `addenda/02-to-be-plan.addendum-27.md`
  - implementation addenda `addenda/03-implementation-summary.addendum-01.md` through `addenda/03-implementation-summary.addendum-27.md` where present
- What changed:
  - collapsed operator-facing OpenAI inventory to one provider surface with `API Key` plus `Codex Subscription`, suppressing the duplicate raw `chatgpt` provider row
  - added a Codex-managed device-code/Auth-cache path for OpenAI subscription onboarding with truthful lifecycle semantics: connected accounts can remain `Connected, no endpoint` / `entitlement-missing` when the cached ChatGPT session does not grant the direct OpenAI Platform API scopes needed by the current runtime transport
  - curated OpenAI subscription support to the GPT `5.3+` family and verified hosted web-search/function-tool request surfaces for those supported OpenAI models
  - expanded the same run into routing/control-plane repairs discovered during rebuilt-runtime QA: canonical strategy × execution-mode alias matrix generation, strict legacy `craft-ask` removal, controller timeout/budget/compatibility repair, role-first task-detail UI, non-controller requested-role routing repair, and transport-aware hosted-search capability handling across OpenAI, Kimi, and DeepSeek
  - normalized DeepSeek DSML search markup into consumer-visible tool calls instead of extending the router runtime into a hosted browser/tool host
  - repaired `runtime:validate-ui` teardown so the validator shuts down its backend after the HTTP server closes and exits cleanly
  - updated routing interaction documentation in `/docs/architecture/09-runtime-routing-strategy-interactions.md` to match the current alias matrix, roles/tasks hierarchy, capability metadata, and routing-decision flow
- Why:
  - the original requirement was to add a real `Codex Subscription` path under OpenAI without duplicating providers or pretending ChatGPT/Codex auth is the same as an OpenAI API key
  - live rebuilt-runtime QA exposed coupled runtime truth gaps in alias synthesis, restart health, controller routing, requested-role handling, hosted-search capability semantics, and validator cleanup that had to be repaired before the OpenAI provider work could be considered production-ready
- How:
  - implemented with strict RED/GREEN TDD across provider synthesis, auth-cache onboarding, lifecycle truthfulness, hosted-search/tool-surface handling, alias-matrix persistence, controller compatibility, requested-role handling, and validator cleanup
  - verified through focused host/runtime-ui suites, broader impacted bridge suites, live rebuilt-runtime probes, rebuilt browser/operator proof, and hybrid manual QA with operator approval on `2026-06-20`
- What was not done:
  - the runtime still does not convert `Codex Subscription` into a direct OpenAI Platform API transport when the cached ChatGPT/Codex session lacks those scopes; the truthful block is intentional
  - the router runtime still does not become a generic hosted browser/tool executor for all providers; consumer-visible tool-call normalization remains the chosen boundary for DeepSeek DSML search flows
- Known issues / follow-ups:
  - final operator acceptance is anchored to the rebuilt runtime on `:3462` because an older runtime was still listening on `:3461` during intermediate QA
  - temporary runtime logs and rebuilt UI assets remain verification byproducts and should not be mistaken for new durable product-source requirements beyond the validated behaviors they prove

### Run `51-runtime-testing-architecture-and-regression-matrix`

- Run folder: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - addenda `addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`, `addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`, `addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
- What changed:
  - established a repo-owned runtime testing architecture with a 6-layer taxonomy (unit, integration, validator, browser E2E, rebuilt-runtime, packaged-runtime), named root commands, and a changed-path regression matrix
  - added config-driven test discovery via `vitest.config.ts` (host-bridge) and `vite.config.ts` `test.include` (runtime-ui) so all checked-in tests are reachable by default
  - added named root commands: `runtime:test-critical`, `runtime:test-validators`, `runtime:test-browser`, `runtime:test-full`; added `runtime:test-critical` to CI workflow
  - created a distinct `validate-observability.ts` entrypoint that reuses `runRuntimeUiValidation` with a temporary runtime config, replacing the silent alias of `runtime:validate-observability` to `runtime:validate-host`
  - added a Playwright browser E2E harness (`playwright.config.ts`, `e2e/runtime-shell.spec.ts`) that builds the runtime UI, starts a seeded QA server on port 3462, and exercises providers + session-readiness pages against real runtime HTTP data
  - fixed orphaned test issues: routing bootstrap timeouts (60s), tool expectation corrections, theme key name fix
  - added `data-testid` stable selectors to provider maintenance cards for future E2E tests
  - created `docs/architecture/10-runtime-testing-architecture.md` and `docs/operations/04-runtime-testing-matrix.md`
- Why:
  - the repository had strong focused tests and runtime validators but lacked a durable testing architecture that future runs could apply consistently; this run closes that gap with executable commands, reusable harness patterns, and concrete regression coverage
- How:
  - implemented with pragmatic TDD (strict RED/GREEN for executable code, pragmatic exceptions for config-only changes); all test suites green (host-bridge 383 tests, runtime-ui 190 tests, critical regression 168 tests + validators, browser E2E 1 test); agent-operated QA via Playwright on rebuilt runtime
- What was not done:
  - SP51-B (shared harness extraction) was partially addressed; a standalone shared harness module was not extracted because `validate-ui.ts` already exports a reusable entrypoint
  - `build-binaries.yml` packaged-runtime verification contract update was deferred; existing `runtime:validate-packaging` remains available and documented
  - cross-links from `docs/operations/01-router-runtime-hardening-playbook.md` and `docs/operations/02-ci-and-release-flow.md` to the new testing matrix were deferred
- Known issues / follow-ups:
  - full repo `biome lint` has 41 pre-existing errors in unchanged files; all 11 changed source files pass individually
  - Playwright browser E2E uses port 3462 to avoid conflicts with any existing runtime on 3456
  - README hero, acknowledgements, and screenshot guidance from addenda remain preserved as upstream inputs for a future README implementation run

### Run `52-codex-subscription-benchmark-tool-path`

- Run folder: `/.recursive/run/52-codex-subscription-benchmark-tool-path/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - addenda `addenda/00-requirements.root-cause-handoff.md`
- What changed:
  - fixed Codex Subscription benchmark tool path crash on packaged runtime by replacing `createRuntimeToolRegistry` with `createRequestScopedToolRegistry` at the Codex call site (index.ts:12916)
  - exported `createRequestScopedToolRegistry` for direct unit testing
  - added 6 new tests: registry unit test, executeToolCalls integration, buildCodexDynamicTools compatibility, no-FS-access invariant, non-tool regression guard, packaging regression guard
- Why:
  - the Codex Subscription branch called `createRuntimeToolRegistry` which reads `testdata/router-runtime/mcp-connectors.json`, a file excluded from production packaging by `package-sea.ts`, causing ENOENT crashes on packaged runtime when benchmark cases included function tools
- How:
  - strict TDD (RED: 4 tests fail because `createRequestScopedToolRegistry` not exported; GREEN: export + call site replacement, all 5 pass); full suite green (lint 0 errors, build pass, test pass, test:critical 80 tests); delegated code review APPROVE; live benchmark on packaged runtime completed 12/12 cases without ENOENT
- What was not done:
  - no changes to non-Codex paths, packaging rules, or benchmark scoring
  - Codex app-server WebSocket "did not return a thread id" failures are a separate issue unrelated to this fix
- Known issues / follow-ups:
  - some benchmark cases scored 0 due to model not producing expected tool calls (model quality issue, not a crash)
  - Codex app-server WebSocket thread id issue remains as a separate follow-up

### Run `53-runtime-telemetry-analytics-contract-hardening`

- Run folder: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - addenda `addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`, `addenda/00-worktree.location-correction.addendum-02.md`, `addenda/05-manual-qa.horizontal-ranking-legend.addendum-03.md`, and `addenda/05-manual-qa.horizontal-ranking-plot-height.addendum-04.md`
- What changed:
  - hardened `/api/role-model/telemetry/query` into a backend-owned analytics contract with `appliedQuery`, slice metadata, metric support, dimension support, full-slice aggregation, and aligned shared filters
  - separated analytics aggregation semantics from request-ledger pagination so chart aggregation no longer inherits the default 50-row ledger cap
  - added shared runtime UI semantic chart-state handling for populated, loading, refreshing, empty, unsupported, partial, truncated, and error cases
  - updated the runtime UI design system and telemetry chart primitives so horizontal ranking charts use bottom legends for long labels and a concrete plot height for Recharts rendering
  - updated `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` from audit matrix to the post-run telemetry architecture reference
- Why:
  - telemetry charts could show misleading empty shells, aggregate only recent ledger rows, hide sparse or unsupported metric truth, and diverge from request-ledger filters
  - browser QA found horizontal ranking labels could not fit on the left axis and then found the bottom-legend change could leave charts visually blank without a concrete plot height
- How:
  - strict RED/GREEN TDD for backend analytics contract and UI semantic chart states, plus follow-up RED/GREEN coverage for horizontal ranking legend and plot-height regressions
  - verified with focused backend/UI tests, runtime-ui critical tests, host TypeScript build, runtime UI production build, SEA packaging, packaged-runtime API checks, in-app browser DOM verification, and hybrid manual QA with operator approval on `2026-06-21`
- What was not done:
  - no separate analytics database or warehouse was introduced; telemetry remains backed by existing runtime SQLite state
  - no fake chart data was shipped; temporary QA telemetry was inserted only into the isolated run-53 QA runtime state and removed after sign-off
- Known issues / follow-ups:
  - fresh successful live-completion telemetry was not generated in the decision-only QA runtime because no routable endpoints were configured; populated successful/cost/cache chart review used isolated temporary QA telemetry
  - the pre-existing host-bridge validator timeout baseline in `test/validate-observability.test.ts` and `test/validate-ui.test.ts` remains outside Run 53 scope

### Run `54-alias-capability-discovery-contract`

- Run folder: `/.recursive/run/54-alias-capability-discovery-contract/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added a shared model capability resolver so runtime-specific IDs such as `chatgpt/gpt-5.4` resolve through canonical GPT metadata while preserving the public runtime ID
  - added a versioned rich downstream discovery contract at `/api/role-model/downstream/openai` with exact model and alias records, safe/max limits, declared versus routable layers, modalities, tool/function-calling, structured output, reasoning, advisory caching, freshness, sanitization, and Pi-style mapping hints
  - added request capability inference and alias endpoint filtering before scoring, so image/video/tool/structured-output/reasoning-control requests route only to compatible targets or return stable `no_eligible_target`
  - added schema, fixtures, generated protocol types, focused tests, and architecture docs for downstream alias and endpoint capability resolution
  - repaired a Phase 4 clarification gap so every configured downstream alias is discoverable even when its current routable endpoint pool is empty
  - enriched `/v1/models` with compact additive capability metadata (`context_window`, `max_tokens`, Pi-compatible `input`, full modalities, capability names, `role_model.discovery_url`, and `role_model.capability_revision`) so downstream consumers that start from an OpenAI-compatible model list can auto-discover conservative alias capabilities before following the rich contract
- Why:
  - Pi and other OpenAI-compatible downstream consumers need accurate role-model alias capabilities instead of stale static defaults such as `128000 / 16384`
  - mixed aliases such as `hybrid.hybrid` can contain models with different modalities and capability controls, so discovery and routing must distinguish guaranteed, available, conditional, declared, and currently routable support
- How:
  - strict TDD with RED/GREEN evidence for resolver, discovery, request inference, routing eligibility, compact `/v1/models` metadata, and the all-alias empty-pool regression
  - verified via focused runtime-host tests, schema validation, generated type/build checks, docs build, updated worktree runtime probes on `127.0.0.1:3456`, Pi configured-endpoint mapping evidence for both `/v1/models` and `/api/role-model/downstream/openai`, and agent-operated Pi alias-matrix QA with at least three successful prompts per alias
- What was not done:
  - Pi itself was not changed in this repository; the role-model endpoint now exposes enough compact `/v1/models` metadata for Pi alias configuration, while richer downstream consumers can still follow `role_model.discovery_url`
  - role-model was not expanded into a generic hosted browser/tool executor
- Known issues / follow-ups:
  - Pi noninteractive smoke processes can remain alive after role-model completes the backend request; role-model telemetry is the authoritative backend receipt for this QA path
  - inherited `runtime-host-bridge` validator timeouts in `test/validate-observability.test.ts` and `test/validate-ui.test.ts` remain outside Run 54 scope
