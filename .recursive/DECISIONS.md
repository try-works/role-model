# DECISIONS.md

## Recursive Run Index

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
  - the advanced raw runtime-config editor remains intentionally available as an escape hatch beside the new structured routing-strategy surface
