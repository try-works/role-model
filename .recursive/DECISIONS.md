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
