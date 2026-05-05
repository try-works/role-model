Run: `/.recursive/run/04-router-runtime-architecture-lock/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T01:36:09Z`
LockHash: `e165c928b9b84048dd36beafa7cca96f61bf3c234a76e0b86c8031d15cafe94e`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`
- `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`
- `/.recursive/run/04-router-runtime-architecture-lock/01-as-is.md`
Outputs:
- `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `04-router-runtime-architecture-lock` into a narrow architecture/control-plane implementation plan. The run will freeze architecture boundaries and downstream handoffs only; it must not widen into catalog, provider-account, endpoint-registry, routing, adapter, host, or observability implementation work.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts
- [x] Define the exact change surface owned by the architecture-lock run
- [x] Specify implementation steps that preserve scope discipline
- [x] Define verification commands and evidence expectations
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Planned Changes by File

- `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`: keep the updated run-04 requirement contract as the authoritative scope boundary for this run.
- `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md`: define the narrow implementation contract for the architecture lock and keep later runtime work out of scope.
- `/.recursive/run/04-router-runtime-architecture-lock/03-implementation-summary.md`: record the control-plane implementation outputs and the exact architecture decisions finalized by this run.
- `/docs/architecture/06-router-runtime-architecture-lock.md`: add a repo-native architecture lock document that freezes the post-run03 runtime boundaries, vendor split, frontend/operator constraints, cache/capture policy boundaries, OpenTelemetry interoperability boundary, and deferred MCP/tool ownership.
- `/docs/architecture/05-memory-model.md`: update the existing memory-boundary doc so it stays consistent with the run-04 SQLite-first same-host architecture decision while still acknowledging that no production runtime backend is implemented yet.
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`: align the catalog run to consume the new architecture-lock doc as a downstream input.
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`: align the provider-account and SQLite-memory run to consume the new architecture-lock doc, especially the same-host SQLite and governance boundaries.
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`: align the endpoint-registry run to consume the new architecture-lock doc and the frozen routing-unit/boundary decisions.
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`: align the routing run to consume the new architecture-lock doc and the frozen routing-model/candidate-projection boundaries.
- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`: align the adapter run to consume the new architecture-lock doc and the explicit provider-capability/MCP deferral boundary.
- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`: align the host run to consume the new architecture-lock doc and the single-host execution assumptions.
- `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`: align the observability run to consume the new architecture-lock doc and the OpenTelemetry plus data-governance boundaries.
- `/.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`: align the hardening run to consume the new architecture-lock doc and the baseline validation/gov/operations expectations.
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`: preserve the deferred MCP/tools extension as the explicit home for provider-agnostic tool execution and MCP connector work.

## Implementation Steps

1. Treat the current diff as control-plane work only and keep product/runtime package code untouched during this run.
2. Create one repo-native architecture lock document under `docs/architecture/06-router-runtime-architecture-lock.md` that freezes these decisions in one place:
   - protocol remains canonical
   - runtime-specific state stays out of protocol artifacts
   - provider taxonomy and provider-id versus provider-kind boundaries
   - auth/account boundary versus endpoint-instantiation boundary
   - interim protocol-driven routing projection for non-protocol-native providers
   - SQLite-first, same-host local-memory boundary for the first runtime milestone
   - routing-model configuration boundary and user-controlled routing-model selection
   - provider capability-negotiation boundary for structured outputs, streaming, cloud prompt caching, and local KV-cache reuse
   - data-governance boundary for memory, traces, and request/response captures, including environment-tiered capture
   - OpenTelemetry GenAI interoperability as an export/interoperability layer rather than a replacement artifact model
   - explicit deferral of MCP and provider-agnostic tool execution to run `13`
   - explicit freeze of the committed run-03 protocol/router/observability surfaces (`role-binding.status`, linkage helpers, router-decision semantics, observed-performance semantics, fixture-validation floor, and smoke harness)
3. Update `docs/architecture/05-memory-model.md` so it no longer reads as if the memory boundary is backend-agnostic forever; it should state that the current code still lacks a production backend, while the first runtime milestone is architecturally locked to SQLite-first same-host storage.
4. Update the downstream run requirement docs (`05` through `13`) so they explicitly consume the new architecture-lock doc instead of relying on roadmap prose alone.
5. Keep the frontend/operator guidance inside the architecture lock document as an explicit reference to the Swiss design bundle plus a deferred requirement for a role-model-native in-repo design-system doc; do not widen into UI implementation.
6. In Phase 3, record the implementation as architecture/control-plane alignment only; do not invent new runtime packages, schemas, adapters, or hosts that belong to later runs.
7. In Phase 4, re-run the baseline command chain from the locked worktree context and verify that the diff remains limited to intended control-plane docs and recursive artifacts. If the current `build`/`test` failure remains unchanged, record it accurately as inherited baseline state rather than silently widening run 04 into schema-tools remediation.

## Testing Strategy

- New behavior tests:
  - none; this run changes architecture/control-plane docs only
- Regression checks:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\04-router-runtime-architecture-lock --run-id 04-router-runtime-architecture-lock`
  - `git diff --name-only 6b663731b812751a767f7ea316ded9076d68689c`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: the architecture-lock run changes recursive/control-plane docs only and introduces no browser UI surface.

## Manual QA Scenarios

1. **Architecture-lock document sanity check**
   - Steps:
     - read `docs/architecture/06-router-runtime-architecture-lock.md`
     - read the locked `00-requirements.md`, `01-as-is.md`, and the updated downstream run requirement docs
   - Expected:
     - the same architecture decisions appear consistently across the repo-native architecture doc and the run-local artifacts
     - no later-run runtime work is accidentally pulled into run 04

2. **Vendor/frontend boundary sanity check**
   - Steps:
     - inspect the sections of `docs/architecture/06-router-runtime-architecture-lock.md` that cover `models.dev`, `llama-swap`, Swiss design, and deferred in-repo design-system work
   - Expected:
     - the vendor and operator/frontend boundaries are explicit enough that later runs do not need to infer them from old chat or roadmap prose

3. **Deferred MCP/tools handoff check**
   - Steps:
     - inspect `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
     - confirm run 04 and downstream requirement docs defer MCP/tool execution there
   - Expected:
     - MCP/tool execution has an explicit deferred home
     - run 04 does not leave MCP/tool scope ambiguous

4. **Baseline command-path sanity check**
   - Steps:
     - run `corepack pnpm run schemas:validate`
     - run `corepack pnpm run build`
     - run `corepack pnpm run test`
     - run `corepack pnpm run smoke`
   - Expected:
     - the selected worktree still produces the same baseline result pattern captured in Phase 0, unless a new regression was introduced by run-04 control-plane work
     - no product/runtime/package code drift appears in the diff

## Idempotence and Recovery

- Re-reading or refining the architecture lock doc is safe as long as the run stays within control-plane scope.
- Re-running the baseline command chain is safe, but `build` and `test` may continue to produce the already-documented schema-tools/Biome failure until a separate remediation decision is made.
- Re-running `lint-recursive-run.py` is safe and should remain green apart from any expected warnings about not-yet-created later artifacts.
- If the diff grows beyond recursive/control-plane files, stop and remove the accidental widening before closing Phase 3.
- If downstream requirement docs diverge from the architecture lock during implementation, repair the control-plane docs directly; do not compensate by widening run 04 into later runtime implementation work.

## Implementation Sub-phases

### SP1. Repo-native architecture lock document

Scope and purpose:
Create the durable architecture lock doc that downstream runs can consume without re-reading roadmap prose or the abandoned old run.

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Add `docs/architecture/06-router-runtime-architecture-lock.md`
- [ ] Freeze the post-run03 baseline surfaces explicitly
- [ ] Freeze the vendor/frontend/operator and deferred MCP/tool boundaries explicitly
- [ ] Freeze the cache/capture/OpenTelemetry/data-governance boundaries explicitly

Tests for this sub-phase:
- manual comparison of `docs/architecture/06-router-runtime-architecture-lock.md` with `00-requirements.md` and `01-as-is.md`

Sub-phase acceptance:
- A later implementation run can read the new architecture doc and understand the locked runtime boundaries without re-litigating them.

### SP2. Memory boundary and downstream handoff alignment

Scope and purpose:
Keep existing architecture docs and future-run requirement docs aligned to the new architecture lock.

Requirement mapping: `R1`, `R3`

Implementation checklist:
- [ ] Update `docs/architecture/05-memory-model.md` to reflect the SQLite-first same-host architecture decision
- [ ] Update downstream run requirements so they consume the new architecture lock doc
- [ ] Keep deferred MCP/tool execution out of runs `05`-`12`

Tests for this sub-phase:
- `git diff --name-only 6b663731b812751a767f7ea316ded9076d68689c`
- manual comparison of runs `05` through `13` requirement docs against the new architecture lock doc

Sub-phase acceptance:
- The downstream run requirements tell one coherent story and no longer rely only on roadmap prose for architecture-boundary inheritance.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/04-router-runtime-architecture-lock/01-as-is.md`
- `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `C:\Users\erikb\.config\recursive-mode\worktrees\role-model\03-router-runtime-architecture-lock\.recursive\run\03-router-runtime-architecture-lock/02-to-be-plan.md`
- `/.recursive/memory/MEMORY.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 2 is an ExecPlan synthesis artifact that must stay tightly aligned to the locked Phase 1 findings, the locked Phase 0 worktree context, and the controller's intended control-plane-only write surface.`
Delegation Override Reason: `A delegated planning pass would add overhead without improving fidelity because the controller already holds the locked AS-IS inventory, the current worktree diff, the architecture-doc neighborhood, and the exact intended no-product-code scope boundary for Phase 3.`
Audit Inputs Provided:
- `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`
- `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`
- `/.recursive/run/04-router-runtime-architecture-lock/01-as-is.md`
- Changed files:
  - `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md`
- Targeted code references:
  - `/docs/architecture/00-overview.md`
  - `/docs/architecture/01-repo-boundaries.md`
  - `/docs/architecture/05-memory-model.md`
  - `/role-model-router/packages/`
  - `/role-model-router/apps/`

## Effective Inputs Re-read

- `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`
- `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`
- `/.recursive/run/04-router-runtime-architecture-lock/01-as-is.md`

## Earlier Phase Reconciliation

- `/.recursive/run/04-router-runtime-architecture-lock/01-as-is.md`:
  - the current repo baseline is strong enough to anchor the architecture lock, but the run still needs a durable repo-native architecture doc plus downstream handoff alignment
- `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`:
  - the selected in-repo worktree and the baseline-failure acknowledgement remain the execution context for later phases

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`
  - `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`
  - `/.recursive/run/04-router-runtime-architecture-lock/01-as-is.md`
  - `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md`
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `6b663731b812751a767f7ea316ded9076d68689c`
- Comparison reference: `working-tree`
- Normalized baseline: `6b663731b812751a767f7ea316ded9076d68689c`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 6b663731b812751a767f7ea316ded9076d68689c`
- Diff basis used: `git diff --name-only 6b663731b812751a767f7ea316ded9076d68689c`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/04-router-runtime-architecture-lock`
- Planned or claimed changed files:
  - `.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md`
  - `docs/architecture/05-memory-model.md`
  - `docs/architecture/06-router-runtime-architecture-lock.md`
  - `.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
  - `.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
  - `.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
  - `.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`
  - `.recursive/run/10-router-runtime-host-integration/00-requirements.md`
  - `.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
  - `.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
  - `.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- Actual changed files reviewed:
  - `.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md`
- Unexplained drift:
  - none

## Gaps Found

- none; the implementation plan is concrete enough for a narrow control-plane Phase 3.

## Repair Work Performed

- Narrowed the write surface to one new architecture doc, one existing memory-boundary doc, and downstream requirement-doc alignment so run 04 stays inside architecture/control-plane scope.
- Chose a repo-native architecture-doc output path so later runs have a durable artifact to consume instead of relying only on recursive artifacts and roadmap prose.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the architecture-boundary freeze is planned precisely, but the repo-native lock doc and aligned handoff updates do not exist yet. | Blocking Evidence: `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md` | Audit Note: Phase 3 will add `docs/architecture/06-router-runtime-architecture-lock.md`, update `docs/architecture/05-memory-model.md`, and keep runtime state out of protocol artifacts without widening into implementation work.
- R2 | Status: blocked | Rationale: the vendor/frontend/operator boundary freeze is planned, but the durable implementation artifact does not yet exist. | Blocking Evidence: `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md` | Audit Note: Phase 3 will freeze the `models.dev`, `llama-swap`, Swiss-design, OpenTelemetry, cache, and deferred MCP/tool boundaries without widening into frontend implementation.
- R3 | Status: blocked | Rationale: downstream handoff alignment is planned, but the later run requirement docs do not yet consume the new architecture lock artifact. | Blocking Evidence: `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md` | Audit Note: Phase 3 will update runs `05` through `13` so they inherit the architecture lock from repo-native docs rather than roadmap prose alone.
- R4 | Status: blocked | Rationale: the worktree baseline is established, but the run has not yet completed implementation and post-change validation against that same context. | Blocking Evidence: `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`, `/.recursive/run/04-router-runtime-architecture-lock/02-to-be-plan.md` | Audit Note: Phase 4 will rerun the baseline command chain and record unchanged `build`/`test` failures as inherited state unless run-04 control-plane work introduces new regressions.

## Audit Verdict

- Audit summary: the plan is concrete enough to implement the architecture lock with a durable repo-native artifact and aligned downstream handoffs while keeping the run out of later runtime implementation scope.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> architecture-boundary freeze is planned in `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R2` -> vendor/frontend/operator and deferred MCP/tool boundaries are planned in `## Planned Changes by File`, `## Implementation Steps`, and `## Manual QA Scenarios`.
- `R3` -> downstream handoff alignment is planned in `## Planned Changes by File`, `## Implementation Steps`, `## Worktree Diff Audit`, and `## Requirement Completion Status`.
- `R4` -> baseline validation reruns and unchanged-failure handling are planned in `## Testing Strategy`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/04-router-runtime-architecture-lock/00-requirements.md`
  - `/.recursive/run/04-router-runtime-architecture-lock/00-worktree.md`
  - `/.recursive/run/04-router-runtime-architecture-lock/01-as-is.md`
- Requirement coverage check:
  - `R1`-`R4`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Implementation Sub-phases`, `## Requirement Completion Status`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS3`: preserved; the plan stays inside architecture/control-plane docs and downstream requirement alignment only

Coverage: PASS

## Approval Gate

- [x] The implementation plan is specific enough to drive a narrow Phase 3
- [x] The write surface is narrow enough to avoid widening into later runtime implementation work

Approval: PASS
