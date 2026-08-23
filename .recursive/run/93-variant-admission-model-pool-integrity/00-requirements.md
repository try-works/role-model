Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-08-21T23:46:42Z`
LockHash: `cfcc07d0d8ba56b8f8ff9cbbbcc5f79c10c5c2f2b9161d864792638405c493ee`
Workflow version: `recursive-mode-audit-v2`
Diff basis: `origin/dev` at `1aab0512ce23aacc50cea66c2926e374be1e249e`
Inputs:
- User-reported Stage RC observations and screenshots
- Run 92 baseline on `origin/dev`
Outputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
Scope note: This artifact defines the acceptance contract for truthful per-variant admission, profiles, benchmarks, telemetry, and clean releases.

## Intent

Make configured remote model instances—provider-default and reasoning-effort variants—truthful from admission through routing, benchmarking, telemetry, and the Model Pool. An instance must be admitted by an explicit effort-aware readiness probe before it can be routed or benchmarked. A release must start with no configured-model fixtures or credentials.

This follows Run 92 and preserves its revision-aware benchmark membership and score semantics. It corrects the observed gap between configured instances, admission health, benchmark progress/results, telemetry profiles, and the Overview Model Pool.

## Evidence motivating this run

- The runtime candidate API exposed seven configured DeepSeek endpoint instances while Overview rendered five; its candidate-space projection currently has a hard maximum of `5`.
- Flash High recorded 32 requests, all `503 upstream_connection_error`, but was displayed healthy and as having no usable live telemetry.
- Benchmark progress uses a base provider model ID rather than the effort-bearing instance identity.
- Benchmark completion does not reliably refresh all Model Pool profiles; colors repeat after four candidates.
- A stage RC showed preconfigured model rows. A release must not carry user configuration, fixtures, or credentials.

## TODO

- [x] Elicit requirements from user/context
- [x] Define requirement identifiers and observable criteria
- [x] Define exclusions, constraints, and verification
- [x] Complete Coverage Gate
- [x] Complete Approval Gate

## Requirements

### `R1` — Effort-aware instance identity and lifecycle

Every configured endpoint instance is an independent model-pool member.

Acceptance criteria:

- [ ] Canonical instance identity includes provider connection, provider model, endpoint, and normalized effort (`default`, `low`, `medium`, `high`, `max`, etc.). New public endpoint paths use readable suffixes such as `-high`, never `~effort-v1~...`.
- [ ] Base/default and effort variants have independent eligibility, readiness, benchmark records, telemetry profiles, colors, and routing decisions. Editing one cannot alter another's roles or admission state.
- [ ] A durable state machine exposes `pending-admission`, `active`, `degraded`, and `removed` (or documented equivalents), with timestamp, reason code, and sanitized receipt/reference per transition.
- [ ] Existing opaque persisted identities remain readable and deterministically project to normalized identity without merging or losing historical telemetry, benchmark, contribution, or routing evidence.

### `R2` — Admission-time readiness

Adding an instance proves the exact configured provider request before it becomes eligible for routing or benchmarking.

Acceptance criteria:

- [ ] Add/re-add creates `pending-admission`; the instance is not routing-eligible or benchmark-eligible until its instance-bound readiness probe succeeds.
- [ ] The probe occurs in the add/retry workflow, is bound to identity, adapter, endpoint, credential reference, and configured effort, and sends the provider adapter's exact effort payload.
- [ ] Success creates a sanitized durable admission receipt and activates only that instance. Failure degrades only that instance, records an actionable secret-free reason, and exposes an explicit retry.
- [ ] Routing and benchmark selection exclude pending/degraded instances by default and may not make a hidden first readiness request.
- [ ] Execution failures update health under a documented deterministic threshold/window/recovery policy; an instance with only recent upstream failures cannot remain healthy.
- [ ] Add/retry is idempotent and cannot run concurrent duplicate probes or create duplicate active instances.

### `R3` — Diagnosable provider and effort failures

The system distinguishes provider/credential/transport failures from an unavailable effort variant without retaining secrets or prompts.

Acceptance criteria:

- [ ] Adapter tests cover every supported connection method and catalog-advertised effort level, asserting exact effort representation and canonical identity.
- [ ] Probe/execution receipts retain only sanitized provider/HTTP/error-class facts. Credential values, headers, prompts, response bodies, and raw key material are excluded.
- [ ] Models, Remote providers, Connect Registry, candidates, and Model Pool display the same authoritative health/admission state and actionable reason.
- [ ] Flash High's 503 failure path has a deterministic adapter/transport test and, when a live credential is available in Phase 5, one bounded admission attempt. It must produce either verified success or truthful degraded state—not a false healthy claim.

### `R4` — Benchmark identity, eligibility, and refresh

Benchmarks operate on admitted endpoint instances and retain their exact identity from selection through scoring and display.

Acceptance criteria:

- [ ] Picker, progress, execution receipt, persisted artifact, candidate profile, and routing-decision metadata identify the effort-bearing instance, not only base model ID.
- [ ] Non-active instances are rejected before benchmark traffic; failed/skipped instances cannot appear as successful benchmark evidence.
- [ ] Benchmark completion publishes revision-aware invalidation that refreshes every affected profile without restart or browser reload.
- [ ] Existing Run 92 membership/provenance rules prevent stale results overwriting newer state; progress remains truthful for skipped, degraded, cancelled, and failed instances.

### `R5` — Complete, synchronized Model Pool

Every configured eligible endpoint instance appears once in the candidate projection with independent benchmark and telemetry facts.

Acceptance criteria:

- [ ] No API or presentation silently truncates candidates at five. Bounded viewports disclose a total and retain all candidates via accessible scrolling/pagination.
- [ ] Overview, Models, Benchmark, Router Candidates/Decisions, Observe, Connect Registry, and sidebar share canonical instance identity/display projection.
- [ ] Candidate state explicitly distinguishes no requests, failed-only telemetry, insufficient successful samples, usable telemetry, no benchmark, benchmark available, selected, and degraded.
- [ ] Admission, request, health transition, and benchmark completion coherently refresh quality/cost/speed/route score, source, sample counts, and readiness state.
- [ ] Decisions persist exact instance identity plus benchmark/telemetry profile revision for inspection.

### `R6` — Deterministic accessible candidate colors

Candidate markers, legends, and related displays remain distinguishable for every simultaneously rendered instance.

Acceptance criteria:

- [ ] Color is deterministic from canonical identity and shared by point, legend, and related surfaces.
- [ ] No simultaneously visible candidates share a color; assignment scales beyond the current seven without cycling a four-color palette.
- [ ] The palette uses RM3/Paper tokens and contrast conventions; labels/tooltips preserve distinction beyond color.
- [ ] Tests cover at least seven variants, ordering changes, and more entries than the original palette.

### `R7` — Clean install and artifact integrity

Release packages contain application/catalog code only, not configured models, benchmark/telemetry fixtures, mock state, or user credentials.

Acceptance criteria:

- [ ] A fresh isolated state root has zero configured endpoint instances and an empty Model Pool. Catalog metadata, where shown, is clearly not configured state.
- [ ] Production packaging rejects fixture/mock runtime state and QA markers and never copies a developer state root.
- [ ] Automated artifact inspection proves a synthetic credential sentinel and fixture markers are absent from executable/archive/installer payloads; no real secret is used in tests.
- [ ] Installation/update documentation explains external state and credential references, backup/migration, and the clean-install expectation.

### `R8` — TDD, regression, rebuilt-runtime, and extension verification

Implementation is proven at the relevant layers rather than inferred from UI snapshots.

Acceptance criteria:

- [ ] Every production behavior change has RED-GREEN-REFACTOR evidence: focused failure first, minimal fix, then affected regression suite.
- [ ] Unit/integration tests cover lifecycle transitions, per-variant roles, probe idempotency/concurrency, payloads, health policy, legacy projection, progress/result attribution, profile refresh, telemetry categories, colors, and package scanning.
- [ ] Phase 4 rebuilds and verifies the package in a clean isolated state root before Phase 5.
- [ ] Phase 5 launches that rebuild on an isolated port and sends Pi CLI requests through a router alias. It inspects routing decisions, telemetry, message graph/lineage, enabled contributions/recommendations/storage records, candidate refresh, and affected browser UI pages.
- [ ] Phase 5 runs one bounded live admission/request per available configured effort variant only with operator-provided credentials and authorization. A failure records sanitized degradation and does not retry unboundedly.
- [ ] Phase 5 checks all 13 extensions against current enabled/disabled status: enabled extensions preserve variant identity; disabled/incomplete extensions report existing state without a false verification claim.

### `R9` — Operator-facing explanation

Acceptance criteria:

- [ ] Provider-add, Models, Benchmark, Connect, and Overview explain admission status, readiness reason, retry consequences, and degraded exclusion.
- [ ] Benchmark controls/progress show canonical names plus readable effort-bearing endpoint identities.
- [ ] Release/update documentation explains clean state and safe migration across versions.

## Out of Scope

- `OOS1`: Enabling unsupported or intentionally disabled models, connection methods, or extensions.
- `OOS2`: Changing provider pricing/catalog policy except to transmit existing effort settings correctly.
- `OOS3`: Repairing a provider outage or user credential automatically; the product must diagnose and degrade truthfully.
- `OOS4`: Stage/main promotion, RC publication, or GitHub protection policy changes. Those are separate authorized operator actions.

## Constraints

- Work starts from current `origin/dev` in an isolated worktree and follows recursive mode, including locks and phase-doc linting.
- No secret, credential, authorization header, prompt, or raw provider response is committed, printed in evidence, or included in artifacts.
- New effort identities are readable; legacy opaque IDs remain readable.
- Do not remove real historical telemetry or benchmark evidence while migrating projections.
- UI changes use RM3/Paper and a centralized display projection, not page-specific string formatting.
- Live traffic is bounded and Phase-5-only after rebuilt-runtime verification and operator authorization.

## Coverage Gate

- [x] R1 covers identity, isolation, lifecycle, and legacy readability.
- [x] R2-R3 cover admission, provider failures, and the observed 503 class.
- [x] R4-R5 cover benchmark, telemetry, routing, UI/API projection, and refresh.
- [x] R6 covers present and future color collisions.
- [x] R7 covers fixtures, clean install, credentials, and artifacts.
- [x] R8 covers TDD, rebuild, Pi CLI, extensions, browser, and live verification.
- [x] R9 covers operator controls/documentation.
Coverage: PASS

## Approval Gate

- [x] User authorized creating this new run on `dev`.
- [x] The user-approved problem statement authorizes this requirements baseline; later phase plans remain subject to review.
Approval: PASS
