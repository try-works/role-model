# Router Runtime Architecture Lock

The first complete router-runtime milestone is a **single-host, local-machine** runtime built on top of the
committed run-03 protocol, router, and observability baseline. This document freezes the architecture
boundaries that later runtime runs must consume rather than reopen.

## Frozen baseline inputs

The router-runtime sequence inherits, and must not redefine:

- canonical protocol ownership in `protocol/` plus protocol docs and schemas,
- `router-decision` semantics including `app_id`, stable `org_id`, `metric_breakdown`, `tie_break`, and
  role/task/binding-aware explainability,
- `observed-performance` semantics including `measurement_window`, required `endpoint_version`, and
  benchmark/live-request source accounting,
- `role-binding.status = active|inactive|disabled`,
- linkage helpers `validateTraceLinkage`, `validateUsageLinkage`, and `summarizeUsageEvents`,
- the fixture-driven validation floor plus the self-validating smoke harness.

## Runtime ownership boundaries

- `protocol/` stays the canonical home for protocol artifacts and meanings.
- catalog work owns normalized vendor/model metadata plus role-model enrichment; it does **not** own credentials,
  accounts, or concrete routable endpoints.
- provider-account work owns account records, credential references, auth modes, account health, and tenancy-aware
  runtime identity.
- endpoint-registry work owns concrete endpoint instantiation from catalog metadata, adapter rules, account bindings,
  region or base-URL selection, and entitlement or policy constraints.
- protocol-driven routing owns the per-request projection that synthesizes protocol-governed routing inputs for
  non-protocol-native providers before any provider execution occurs.
- adapter execution owns provider request building, response normalization, and execution-time capability negotiation.
- host integration owns request serving, lifecycle control, local operator access, and host-specific execution
  mechanics on the same machine.
- observability work owns feedback, export, and inspection surfaces built on the canonical artifact model rather than
  replacing it.

## Provider taxonomy and vendor split

- **provider kind** identifies the runtime family or adapter category that routing and execution reason about.
- **provider id** identifies the concrete upstream vendor or integration source tracked by role-model.
- `models.dev` is a **catalog source**. It can provide upstream metadata, adapter hints, `extends` provenance, and
  `experimental.modes`, but it is not the source of truth for credentials, accounts, or instantiated endpoints.
- `llama-swap` is an **execution and operator-workflow influence**, not the source of protocol semantics.
- role-model keeps a role-model-owned vendor-version ledger so upstream snapshot refreshes are explicit and auditable.

## Auth, account, and endpoint instantiation boundary

- raw secrets, refresh tokens, signing material, and provider-native session secrets stay out of canonical protocol
  artifacts and out of durable diagnostic captures unless explicitly required by a protected local workflow.
- runtime account state is modeled through provider-account records, credential references, auth modes, health, and
  status rather than hidden adapter configuration.
- concrete routable endpoints are instantiated from:
  - normalized catalog metadata,
  - provider adapter rules,
  - account bindings,
  - region or base-URL selection,
  - runtime entitlement and policy constraints.
- endpoint instantiation is a runtime concern downstream of catalog and account work, not a property baked into
  catalog snapshots.

## Protocol-driven routing projection and routing-model boundary

- because current vendors and local runtimes are not protocol-native, every routed request must pass through an
  interim protocol-driven projection layer that synthesizes protocol-governed routing inputs before provider
  execution.
- the deterministic routing core remains the authority for hard constraints, policy gates, eligibility, scoring, and
  explainability.
- when model-assisted routing is enabled, the user must be able to select which model or endpoint performs that
  assisted step.
- a routing model may inform ranking or comparison, but it must not bypass protocol semantics, deterministic
  eligibility rules, or policy enforcement.
- routing decisions and later observability artifacts must preserve whether measured data, declared data, caching
  signals, or assisted-routing guidance contributed to the selection.

## SQLite-first memory boundary

- the first runtime milestone is locked to **SQLite-first, same-host, local-disk** persistence.
- SQLite is the authoritative baseline for routed-model handoff, context continuity, retrieval receipts, and local
  runtime memory needed by routing.
- the runtime must define schema-version, migration, backup, restore, retention, deletion, and redaction
  responsibilities for this store.
- extension seams for later secondary stores may exist, but they must not weaken SQLite as the first milestone's
  authoritative baseline.

## Capability negotiation and cache policy boundary

- provider capability negotiation must stay explicit for:
  - tool calling,
  - structured outputs,
  - streaming granularity,
  - usage semantics,
  - cloud prompt caching,
  - local KV-cache or warm-state reuse.
- routing should prefer cache-compatible endpoints when policy and hard constraints allow it, because cache reuse can
  materially reduce cost.
- cache-awareness is part of routing, execution, observability, and hardening; it is not an adapter-only afterthought.

## Data governance and capture boundary

- capture is **tiered by environment**.
- full raw request or response capture is allowed only when intentionally enabled for the relevant environment.
- memory, traces, usage, request captures, and response captures must follow explicit redaction, retention, backup,
  deletion, and inspection rules.
- for the first milestone, local data protection assumes OS or disk encryption on the local machine; application-layer
  encryption is deferred.

## Observability interoperability boundary

- canonical runtime artifacts remain `RouterDecision`, `TraceEvent`, `TraceSpan`, `UsageEvent`, and
  `ObservedPerformanceProfile`.
- OpenTelemetry GenAI interoperability is an **export and interoperability layer** over those artifacts, not a
  replacement schema or alternate source of truth.
- routing, execution, usage, cost, caching, and failure signals must remain mappable back to canonical role-model
  artifacts even when exported through OpenTelemetry.

## Frontend and operator-surface boundary

- public, docs, and catalog surfaces are influenced by role-model's docs baseline plus `models.dev` catalog semantics,
  but they are not a copy of a `models.dev` frontend shell.
- operator and investigation surfaces may borrow workflow ideas from `llama-swap`, but they are not required to adopt
  `llama-swap` layout or component structure.
- styling rules may reference `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\DESIGN.md` and the Swiss
  design bundle during planning, but structural layout and shared-component references must later be rewritten inside
  the role-model repo as a role-model-native design-system document.
- run 04 locks these boundaries only; it does not implement the UI surfaces themselves.

## Explicit deferrals

- MCP connector integration and provider-agnostic tool execution are deferred to
  `/.recursive/run/13-router-runtime-mcp-tools-extension/`.
- the existing `provider-mcp` package name does not mean the deferred extension is already complete.
- multi-host or distributed runtime assumptions are deferred; the current runtime sequence is locked to one local host.
