Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-09-30T02:55:51Z`
LockHash: `7e1cb6e0b39731d430dc4ff207bf873c53a89e186877c4f251f5d897dd9f4d8f`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- Source requirement: `https://github.com/try-works/role-model/pull/288` (`docs/architecture/16-agent-strategy-and-scoring-strategy.md`, branch `codex/16-agent-strategy-scoring-strategy`, head `d6b9b22c`)
- Operator decisions recorded in the design review (difficulty overrides by default; pin blocks difficulty and controller; `routing.mode` + `routing.scoring_strategy`; Agent strategy and Workloads as separate pages; latency override off by default with a 10 000 ms effective-latency threshold and a 5-sample floor bounded to 5..30; controller may pick `latency`; controller may not override pinned weights)
- Prior recursive evidence: `.recursive/run/01-protocol-routing-obs/` (canonical strategy vocabulary and weights), `.recursive/run/22-router-runtime-routing-strategy-lock/` through `.recursive/run/30-router-runtime-strategy-convergence-e2e/` (mode vocabulary, alias pool, difficulty, controller, hybrid), `.recursive/run/101-effect-mq-queue-rebuild` (landed Effect workspace wiring)
- `/AGENTS.md`, `/.recursive/RECURSIVE.md`, `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, `/.recursive/memory/MEMORY.md`
Outputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`
Scope note: This document defines the stable requirement set for making the routing scoring strategies real, splitting them from the runtime routing mode, adding agent-strategy and workload postures, and proving the result with strict TDD plus live pi-CLI verification of the rebuilt runtime.

## TODO

- [x] Elicit requirements from the source design document and the recorded operator decisions
- [x] Map every design-document section to requirement identifiers
- [x] Define requirement identifiers (R1..R12)
- [x] Write observable acceptance criteria for each requirement
- [x] Record verification method per requirement (tests, evidence, live QA)
- [x] Document out-of-scope items (OOS1..OOS6)
- [x] List constraints and assumptions
- [x] Break the requirements into phases, tasks and subtasks with stable identifiers
- [x] Define the delegation plan (which tasks go to subagents) and the controller verification protocol
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Design document coverage map

Every section of `docs/architecture/16-agent-strategy-and-scoring-strategy.md` maps to at least one requirement;
no section is left to the Phase 2 plan alone.

| Design doc section | Covered by |
| --- | --- |
| 1. Why this document exists | R1, R2, R3 (the inert-strategy problem and its readback symptoms) |
| 2. The model (three axes + postures) | R1, R2, R5, R6 |
| 3. Vocabulary and compatibility | R1, R10 |
| 4. Configuration contract | R1, R5, R6, R7 |
| 5. Resolution order and precedence | R2, R4 |
| 6.1 Plug-in points | R2, R8 |
| 6.2 Alias materialisation | R5, R6 |
| 6.3 Measured-latency override | R7 |
| 6.4 Intelligent mode | R4 |
| 6.5 Provenance | R3 |
| 7. Effect primitives and how to use them | R9 |
| 8. UI surfaces | R8 |
| 9. Delivery phases | R11 (TDD), R12 (Phase 5 live QA); Phase 2 owns sub-phase sequencing |
| 10. Verification (P0 list, per-entry matrix, end-to-end) | R11, R12 |
| 11. Risks, constraints and open items | Constraints, R10 (extensibility), R12 (SEA re-verification) |
| 12. Audit notes | R9 (the API shapes verified against the vendored source stay the implementation reference) |
| 13. References | Inputs |

## Requirements

### `R1` Posture split and configuration contract

Description: The persisted posture separates the planner choice from the scoring weights, so the saved scoring
strategy can reach the scorer, and the config schema states every invariant instead of relying on prose.

Acceptance criteria:
- `routing.mode` accepts `baseline | difficulty | hybrid | intelligent`; `controller` is accepted as a compat
  spelling and normalizes to `intelligent` both in config and in the `x-role-model-routing-mode` header.
- `routing.scoring_strategy` accepts `balanced | quality | latency | cost | custom`.
- `routing.pin_weights` is a boolean defaulting to `false`.
- `routing.weights` is required when `scoring_strategy` is `custom` and rejected otherwise; it carries exactly
  `quality`, `latency`, `throughput`, `cost`, `reliability`, `preference`, each `0..1`, summing to `1.0 +- 0.001`;
  a rejection names the failing path (`weights.quality`, `weights`, `scoring_strategy`).
- Legacy spellings (`basic`, `balanced`, `latency`, `low-latency`, `latency-first`, `quality`, `high-quality`,
  `cost`, `low-cost`, `controller`, `intelligent`, `craft-ask`) stay read-compatible and normalize on write per
  design doc section 3; an unknown string is rejected on write and degraded on read with a recorded reason.
- Config round-trips: save, reload and re-render preserve mode, scoring strategy, pin flag and weights; the file
  never carries a legacy synonym after a write.
- The config block is decoded and encoded through one schema (snake_case file keys mapped explicitly), so the
  writer and reader cannot diverge.

Verification: schema unit tests (RED first) for each rule above, a migration table test over every legacy
spelling, and a save/reload round-trip test through the runtime config API.

### `R2` Resolution and precedence

Description: The saved scoring strategy actually ranks candidates, and the order in which controller,
difficulty, operator strategy and default apply is explicit and tested.

Acceptance criteria:
- Resolution order: request-declared intent (role/task/capabilities) > controller directive (Intelligent/hybrid)
  > difficulty decisive bucket (`easy` -> `cost`, `hard` -> `quality`) > saved scoring strategy > `balanced`.
- `medium` difficulty uses the saved scoring strategy; `baseline` mode uses the saved scoring strategy directly.
- `pin_weights: true` blocks both the difficulty override and the controller `strategy` directive; difficulty
  still gates eligibility and the controller's other directives still apply.
- `latency` is reachable end to end from config through the request into the core scorer.
- Preset strategies set `policy_snapshot.strategy`; `custom` sets the profile's base preset name in the snapshot
  and carries the effective weights plus a digest in runtime diagnostics (the protocol schema is closed - see
  Constraints).
- Strategy changes the ranking recipe only: capability, modality, tools, privacy, budget, `maxDifficulty`,
  role-binding and alias-slice gates still decide the eligible set first, and a scoring strategy can never widen
  or narrow it.

Verification: table-driven precedence tests (design doc 10.1 items 6-11), same-candidate-set tests proving
different strategies pick different winners, and an eligibility-invariance test.

### `R3` Decision provenance and honest readback

Description: A decision answers what strategy was used, who chose it, and with which weights; no surface shows
the raw config string as the applied strategy.

Acceptance criteria:
- Decisions record the effective strategy and `strategy_source`
  (`controller | difficulty | operator | default`), plus a weights digest whenever the weights are not a preset.
- When a `pin_weights` posture discards a controller or difficulty override, the decision records the discarded
  directive and its reason.
- The Decisions surface shows the effective strategy and source, and the `strategyLabel` fallback to the raw
  config string is removed.
- The Router Overview resolves the active alias from the effective mode, so a legacy or custom spelling can no
  longer render as `unresolved`.
- Telemetry `selected_strategy` carries the effective value, and the documented value set includes `latency`.

Verification: decision readback tests, a telemetry projection test, and UI tests for the Decisions and Overview
surfaces.

### `R4` Intelligent mode keeps its contract and gains `latency`

Description: The controller directive contract is unchanged; only the supported strategy value and the pin
interaction change.

Acceptance criteria:
- `requestedRoleId`, `taskType`, `requiredCapabilities`, `preferredCapabilities`, `strategy`, `preferLocal` and
  `preferredEndpointIds` still validate against runtime-known values and are recorded as accepted directives.
- `latency` joins `balanced | cost | quality` as a supported controller strategy, including prompt guidance.
- The controller may not override pinned weights; its `strategy` directive is ignored and recorded, while its
  other directives still apply.
- Controller absence, unreachable endpoints, timeout, invalid output and fallback all keep their existing,
  recorded diagnostics.

Verification: controller-contract unit tests, an integration test for pinned-vs-unpinned guidance, and prompt
coverage for the new strategy value.

### `R5` Agent strategy postures (role-bound)

Description: Role-bound postures materialize as client-facing aliases so a downstream agent can name one and
inherit both the routing posture and the role's capability expectations.

Acceptance criteria:
- `agent_strategies.<name>` accepts `role_id` (required) and optional `scoring_strategy`, `routing_mode`,
  `compute_preference`, `model_ids`; unknown keys are rejected.
- Each entry materializes one alias per execution scope as `<name>.<scope>`, carrying the posture.
- The role pin narrows eligibility through the existing role and role-binding rules; an empty slice reports
  `ALIAS_POOL_EMPTY` and never widens to the full inventory.
- An unknown `role_id` is a write error; a name colliding with a workload, another agent strategy, or a routing
  family prefix (`default`, `baseline`, `controller`, `difficulty`, `hybrid`) is a write error.
- Explicit request intent (`role_model.intent`, `x-role-model-requested-role-id`) wins over the alias preset, and
  the decision records both the declared and the preset value.
- Each shipped entry is verified individually (alias per scope, posture reaches the decision, expected winner
  under that posture, honest pool).

Verification: config validation tests, per-entry alias/per-scope tests, an `ALIAS_POOL_EMPTY` test, and a
precedence test against declared intent.

### `R6` Workload postures

Description: Workload postures (batch, embedding, classification and similar) materialize the same way, so a
workload-shaped agent can name an alias and inherit its posture even when no taxonomy role fits.

Acceptance criteria:
- `workloads.<name>` accepts the same optional posture fields as an agent strategy plus optional
  `required_capabilities`; `role_id` is not accepted.
- Each entry materializes `<name>.<scope>` aliases with the same honesty rules as R5.
- An unknown capability is a surfaced warning (capability taxonomies extend); an unknown posture value is an
  error.
- At least `batch` (posture only) and `embedding` (`embeddings.text`) ship as documented examples and are
  verified end to end.

Verification: the same per-entry matrix as R5, applied to the workload entries.

### `R7` Measured-latency override

Description: The measured-latency override remains an off-by-default, operator-owned safety valve with a stable
metric and a meaningful evidence floor.

Acceptance criteria:
- Disabled by default; it only acts when enabled and the activation stage is at or above `min_stage`.
- The decision metric is effective latency `p50 + 0.25 * (p95 - p50)`; the p95 delta is recorded in the receipt
  but is not a second gate.
- Defaults: `max_delta_ms = 10000`, `min_samples = 5` with bounds `5..30`, window and bucket bounds unchanged.
- A substitution may only choose an endpoint the router already considered eligible; the outcome and reason are
  recorded on the decision and shown on the decision detail surface.
- The UI exposes the setting with its bounds and a reset-to-default.
- The public read-side policy and the private write-path registry
  (`role-model-internal/shared/route-learning/activation-policy.mjs`) agree on defaults and bounds; the paired
  private change is recorded as a release dependency of this run.

Verification: selection unit tests (design doc 10.1 items 14-18), policy-default tests, a paired-registry
consistency check, and UI round-trip tests.

### `R8` Operator surfaces

Description: The routing knobs and the two posture pages are operable, consistent and honest about precedence.

Acceptance criteria:
- Routing strategy page: mode selector (including `Intelligent`), scoring selector (including `custom`), a
  six-input weights editor with a live sum check and reset-to-preset, a "Pin scoring strategy" checkbox
  defaulting to off, an execution-scope selector, a resolved-posture line, and the measured-latency override
  card.
- `Agent strategy` and `Workloads` are separate pages with singular/plural labels consistent with
  `Routing strategy`; each lists its entries with bindings, per-scope aliases, candidate counts and the current
  winner.
- No UI path can persist a legacy synonym, and the resolved posture displayed matches the next decision.

Verification: component tests plus a live UI pass during Phase 5 against the rebuilt runtime.

### `R9` Effect-first implementation

Description: The new modules use the landed Effect workspace package and the repository's Effect-first map.

Acceptance criteria:
- Modules import `effect` by bare specifier (workspace package `role-model-router/packages/effect`); no relative
  `vendor/**` imports and no new third-party dependency.
- `Schema` decodes and encodes the contract (including weight invariants and snake_case file keys);
  `Data.TaggedEnum`/`$match` make the vocabulary total; `Context.Service`/`Layer` provide the resolver;
  `SynchronizedRef`/`Semaphore` own live config and the mutation critical section; `Metric`/`Effect.logInfo`
  carry provenance; `Config`/`ConfigProvider` own the latency policy's environment narrowing.
- The config path runs on a `ManagedRuntime` in the composition root; the request path calls the pure resolver
  against an immutable snapshot - no `Effect.runPromise`, layer construction, or `getUnsafe` per request.
- The API shapes are the ones verified in the design doc section 12 against the vendored source; any deviation
  is recorded with its reason per `AGENTS.md`.

Verification: import/lint check, module unit tests, a request-path purity review, and a record of any deviation.

### `R10` Extensibility and future-proofing

Description: The vocabulary and posture model must be extendable without touching scattered switches, and the
config must remain migratable.

Acceptance criteria:
- One module owns the strategy/posture vocabulary and weight tables; every consumer resolves through it, and no
  second list of strategy names exists in the bridge or UI.
- Adding a scoring strategy or a posture variant is a single-place change; unhandled consumers fail at compile
  time (exhaustive matcher), not at runtime with a silent fallback.
- The three parallel legacy switches that exist today (`normalizeRoutingStrategyForAlias`,
  `normalizeConfiguredRoutingMode`, `toPolicyStrategy`) are replaced by that single source, or each remaining
  one is proven to delegate to it.
- The config carries a version and a documented migration path: an older file still loads, is normalized on
  write, and the migration is covered by tests; the reserved per-alias `scoring_strategy` field (OOS3) can be
  added later without a breaking config change.
- The protocol boundary is documented: custom weights are runtime-level today, and any future protocol
  extension is additive.

Verification: an extension drill - add a temporary fifth preset or posture variant in a test and prove the
compile-time and single-place behaviour - plus a config-version migration test.

### `R11` Strict TDD discipline

Description: Production behaviour in this run is written test-first, with evidence, per the repository's Iron
Law.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict` and records a TDD Compliance Log with one entry per RED-GREEN-REFACTOR
  cycle, each naming the test file, the command, and the evidence path.
- RED evidence lives under `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/logs/red/` and GREEN
  evidence under `evidence/logs/green/`; no production change lands without a preceding failing test.
- The design doc's P0 failing-test list (section 10.1) is the initial RED set, extended so that every
  requirement R1-R10 has at least one dedicated test.
- Test commands and outcomes are reproducible from the run folder alone.

Verification: Phase 3 and Phase 4 artifacts plus the evidence tree.

### `R12` Live verification of the rebuilt runtime with the pi CLI (Phase 5)

Description: The change is proven on a rebuilt, packaged runtime driven by live pi-CLI requests, not by tests
alone.

Acceptance criteria:
- Phase 5 declares `QA Execution Mode: agent-operated` (or `hybrid` with recorded operator sign-off) and
  rebuilds the packaged runtime from this worktree
  (`corepack pnpm run runtime:package-sea`), proving the SEA still carries the Effect runtime (the run-101
  gate).
- The rebuilt runtime is started on the development channel (`:3458`, dev state root) and driven with live pi
  CLI requests in the documented form
  (`pi --no-session --provider role-model --model <alias> -p "<prompt>"`), after
  `pi install ./packages/pi-role-model` (or the published package) as required by the QA channel.
- Live requests cover at least: a preset scoring posture, a custom weights posture, a pinned posture on a hard
  request, an unpinned hard request (difficulty override observed), an Intelligent-mode request with controller
  guidance, one agent-strategy alias, and one workload alias; where measured-latency evidence exists, the
  override path is exercised or its absence is recorded honestly.
- For each live request the routing decision and telemetry are inspected for the expected effective strategy,
  `strategy_source`, weights digest and any latency-override receipt; requests that do not show the expected
  posture are recorded as failures and repaired before QA passes.
- Evidence (command transcript, decision/telemetry readback, and where UI behaviour is claimed, screenshots)
  is stored under `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/`.
- Unverified or unreproducible behaviour is recorded as such; no fabricated human sign-off.

Verification: the Phase 5 artifact plus its evidence tree.

## Out of Scope

- `OOS1`: Extending the canonical protocol schema so `policy_snapshot` can carry custom weights. Custom weights
  stay runtime-level; a protocol change is a separate reviewed pull request.
- `OOS2`: Per-request strategy override for clients. The scoring posture stays operator-owned; the existing
  per-request override remains mode-only.
- `OOS3`: Shipping the per-alias scoring override. The field is reserved and must not break when added later.
- `OOS4`: Any `effect-mq`, queue or worker work; that lane belongs to the run-101 queue rebuild.
- `OOS5`: Rewriting the router core or the HTTP server; `routeRequest` stays a pure function and the bridge
  keeps its handler shape.
- `OOS6`: The paired private-repository change itself (the activation-policy registry). Its requirement is
  recorded in R7 and tracked as a release dependency; this run carries the public half.

## Constraints

- `protocol/schemas/routing-policy.schema.json` is a closed schema with a four-value `strategy`; custom weights
  cannot live inside `policy_snapshot`.
- The workflow requires Node `>=24 <25`, pnpm `>=10`, `corepack pnpm`, strict TDD for production behaviour, and
  one logical change per pull request targeting `dev`; `main`/`stage` are never touched from this branch.
- The Effect workspace wrapper (`role-model-router/packages/effect`) must be built as part of setup; a bare
  bridge build fails without it (recorded in `00-worktree.md`).
- Live pi-CLI QA needs the dev channel to be free and the pi package installed; if the channel is occupied, QA
  records the blocker instead of substituting an unverified claim.

## Assumptions

- The design document in PR `#288` is the approved source requirement and its recorded operator decisions are
  final for this run.
- Alias family prefixes stay `default | baseline | controller | difficulty | hybrid`; `intelligent` names the
  operator-facing mode of the `controller` family rather than a new family.
- The change alters the ranking recipe only; eligibility rules are untouched.

## Delivery phases, tasks and subtasks

The breakdown maps the design document's delivery phases (its section 9) onto the recursive-mode phases of this
run. Every task carries the same four fields - Scope, Inputs, Outputs, Verification - so a task can be handed to
a subagent without re-deriving context. Task ids are stable and are used by the Phase 2 plan, the Phase 3
sub-phases, the evidence tree and the delegation records.

### Phase 1 - AS-IS (`analyst`-delegable)

| Task | Scope | Inputs | Outputs | Verification |
| --- | --- | --- | --- | --- |
| `T1.1` Source requirement inventory | Index every obligation of the design document by section with a source quote, a normalized summary and a disposition | `docs/architecture/16-...md` (PR #288), this artifact | `01-as-is.md` `## Source Requirement Inventory` | Every design-doc section appears exactly once; each entry names a requirement id |
| `T1.2a` Config, alias and mode path | Record what `routing.strategy`, alias modes and the canonical matrix do today, with file:line anchors | `unified-runtime-config.ts`, `index.ts` | `01-as-is.md` subsection | Each claim cites a file and line; a reader can reproduce it with the recorded diff basis |
| `T1.2b` Scoring path | Record how `RoutingRequest.strategy` is set today and prove the saved strategy never reaches it | `index.ts` (`maybeApplyDifficultyRouting`, `maybeApplyControllerRouting`), `packages/core/src/router.ts` | `01-as-is.md` subsection | The claim is demonstrated by reading the code path end to end, not inferred |
| `T1.2c` Measured-latency override | Record current defaults, metric, floor, bounds, activation gate and readback | `routing-latency-selection.ts`, `routing-latency-policy.ts`, `sqlite-memory` bucket reader | `01-as-is.md` subsection | Defaults and bounds quoted from source; `p50`/`p95` availability confirmed in the bucket type |
| `T1.2d` UI surfaces | Record what each relevant page reads and where the raw config string leaks into labels or alias ids | `runtime-ui` routes/lib | `01-as-is.md` subsection | Each leak cites the component and line |
| `T1.2e` Effect wiring and packaging | Record the landed Effect workspace wrapper, existing imports, and the SEA gate | `role-model-router/packages/effect`, `queue-runtime/*`, `00-worktree.md` | `01-as-is.md` subsection | The bare-build failure and the dependency-closure build are both recorded |
| `T1.3` Prior evidence and memory | Re-read runs 01, 22-30 and 101 plus the routing memory docs and record what they bind | `.recursive/run/{01,22..30,101}-*`, `.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | `01-as-is.md` `## Prior Recursive Evidence Reviewed` | Each cited prior artifact contributes at least one named constraint or decision |

### Phase 2 - TO-BE plan (`planner`-delegable audit)

| Task | Scope | Inputs | Outputs | Verification |
| --- | --- | --- | --- | --- |
| `T2.1` Requirement mapping | Map every `R1`-`R12` to implementation sub-phases, with `## Plan Drift Check` and plan-stage `## Requirement Completion Status` | `01-as-is.md`, this artifact | `02-to-be-plan.md` | No requirement unmapped; no sub-phase without a requirement id |
| `T2.2` Sub-phase definition `SP1`-`SP8` | Define each sub-phase with file ownership, disjointness, ordering, tests, evidence paths and rollback | `02-to-be-plan.md` | `02-to-be-plan.md` | Write scopes are provably disjoint; each sub-phase lists its RED tests before implementation |
| `T2.3` Verification and QA plan | Fix the exact Tier A/Tier B commands, the live pi-CLI matrix and the evidence layout | this artifact (`R11`, `R12`) | `02-to-be-plan.md` | Every acceptance criterion in `R1`-`R12` has a named command or observed artefact |
| `T2.4` Delegation and risk register | Confirm the delegation plan, the router policy state and the risk mitigations | `.recursive/config/recursive-router*.json`, this artifact | `02-to-be-plan.md` | Each delegated task names its role, bundle path and controller verification step |

### Phase 3 - Implementation sub-phases (controller-owned; `code-reviewer` audits)

| Sub-phase | Requirement coverage | Scope | RED evidence | GREEN evidence |
| --- | --- | --- | --- | --- |
| `SP1` Vocabulary and config schema | `R1`, `R9`, `R10` | One module owns the strategy vocabulary, the weight-table reference and the config schema (including the snake_case mapping and the weight invariants) | `evidence/logs/red/sp1-*.log` | `evidence/logs/green/sp1-*.log` |
| `SP2` Resolver and precedence | `R2`, `R9` | Pure resolver with the documented order, pin semantics, `custom` weights, plus the core request plumbing | `evidence/logs/red/sp2-*.log` | `evidence/logs/green/sp2-*.log` |
| `SP3` Provenance and readback | `R3` | Effective strategy, `strategy_source`, weights digest, discarded-override receipts, telemetry projection | `evidence/logs/red/sp3-*.log` | `evidence/logs/green/sp3-*.log` |
| `SP4` Intelligent mode | `R4` | `latency` in the controller strategy set, pin interaction, prompt coverage | `evidence/logs/red/sp4-*.log` | `evidence/logs/green/sp4-*.log` |
| `SP5` Agent strategies | `R5`, `R10` | Config block, role binding, alias materialisation, collisions, intent precedence | `evidence/logs/red/sp5-*.log` | `evidence/logs/green/sp5-*.log` |
| `SP6` Workloads | `R6` | Config block, capability pins, alias materialisation, `batch`/`embedding` examples | `evidence/logs/red/sp6-*.log` | `evidence/logs/green/sp6-*.log` |
| `SP7` Measured-latency override | `R7` | Effective-latency metric, 10 000 ms default, 5..30 floor bounds, paired-registry consistency | `evidence/logs/red/sp7-*.log` | `evidence/logs/green/sp7-*.log` |
| `SP8` UI surfaces | `R8` | Routing strategy page, Agent strategy page, Workloads page, decision detail | `evidence/logs/red/sp8-*.log` | `evidence/logs/green/sp8-*.log` |

`T3.1` - TDD compliance log: one entry per cycle (test file, command, RED path, GREEN path, refactor note).
`T3.2` - Controller implementation: all production writes, because the router policy has the `implementer` route
disabled (see Delegation plan).
`T3.3` - Per-sub-phase self-audit against the requirement ids before the next sub-phase starts.

### Phase 3.5 - Code review (`code-reviewer`-delegable)

`T3.5.1` Generate the canonical review bundle (`recursive-review-bundle`) covering the diff basis, changed files,
plan and requirement ids. `T3.5.2` Delegate the review with the bundle path. `T3.5.3` Controller verifies each
finding against the actual worktree before accepting, repairs in Phase 3 and re-reviews when scope changes.

### Phase 4 - Tests and validation (`tester`-delegable audit)

`T4.1` Pre-test implementation audit (requirements vs actual changed files). `T4.2` Run the affected suites and
builds and capture logs. `T4.3` Delegate a test-adequacy audit (commands, coverage of `R1`-`R10`, evidence
integrity). `T4.4` Controller re-runs the accepted commands and records the results.

### Phase 5 - Manual QA: rebuilt runtime + live pi CLI (`tester`-delegable execution, controller acceptance)

`T5.1` Rebuild the packaged runtime (`corepack pnpm run runtime:package-sea`) and prove the SEA still carries the
Effect runtime. `T5.2` Start the rebuilt runtime on the development channel (`:3458`) with its dev state root.
`T5.3` Install the pi package for the channel (`pi install ./packages/pi-role-model`). `T5.4` Execute the live
matrix with `pi --no-session --provider role-model --model <alias> -p "<prompt>"` covering the preset, custom,
pinned-hard, unpinned-hard, Intelligent-mode, agent-strategy and workload postures. `T5.5` For every request
inspect the decision and telemetry for effective strategy, `strategy_source`, weights digest and any
latency-override receipt. `T5.6` Capture transcripts, readbacks and (where UI behaviour is claimed) screenshots
under `evidence/`. `T5.7` Record failures and repairs honestly; no fabricated sign-off.

### Phases 6-8 - Closeout

`T6.1` Decisions update. `T7.1` State update. `T8.1` Memory impact. `T8.2` (`memory-auditor`-delegable) verify
touched paths, status transitions and router notes against the final validated state.

## Delegation plan

Policy basis read from `/.recursive/config/recursive-router.json` in this worktree: `orchestrator` is
`local-only`; `analyst`, `planner`, `code-reviewer`, `tester` and `memory-auditor` are declared `external-cli`
with a null CLI/model (unconfigured) and fall back to `self-audit`/`local-controller`;
`implementer` is **disabled**. `recursive-router-discovered.json` is absent in this worktree, so no routed
external dispatch may be resolved from stale assumptions. Effective mode for this run: in-session subagents for
read-only analysis, review and test auditing, with the controller owning every write.

| Task | Delegated? | Role | Why | Required artefacts | Controller verification |
| --- | --- | --- | --- | --- | --- |
| `T1.1`, `T1.2a-e`, `T1.3` | Yes (draft + independent audit) | `analyst` | Independent AS-IS pass over the same diff basis catches drift the author misses | `subagents/analyst-t1.md` + `evidence/review-bundles/01-as-is.md` | Re-read every cited file; confirm each claim reproduces against the diff basis |
| `T2.1`-`T2.4` | Yes (traceability audit) | `planner` | Requirement-to-plan coverage is the failure mode this run is guarding against | `subagents/planner-t2.md` | Every `R#` mapped; spot-check each mapping against the plan text |
| `T3.2` implementation writes | No | - | `implementer` route is disabled by policy; writes stay with the controller | - | Controller authors and self-audits each sub-phase |
| `SP1`-`SP8` bounded checks | Yes (per sub-phase, read-only) | `code-reviewer` | Cheap, bounded verification of one sub-phase diff while the controller continues | `subagents/code-reviewer-spN.md` | Controller re-runs the named commands and re-reads the diff before accepting |
| `T3.5.1`-`T3.5.3` Phase 3.5 review | Yes | `code-reviewer` | High-risk change; a full bundle review is the canonical path | `evidence/review-bundles/03-5-code-review.md` + `subagents/code-reviewer-t3.5.md` | Findings verified against actual files; repairs recorded; re-review after material change |
| `T4.3` test-adequacy audit | Yes | `tester` | Tests are the evidence base for `R11` | `subagents/tester-t4.md` | Controller re-runs the accepted commands and compares logs |
| `T5.4` live pi-CLI matrix | Yes (execution under supervision) | `tester` | The matrix is long-running and mechanical; a subagent can run it while the controller monitors | `subagents/tester-t5.md` + `evidence/logs/t5-*.log` + transcripts | Controller inspects each transcript and readback; no acceptance on the subagent's summary alone |
| `T8.2` memory audit | Yes | `memory-auditor` | Memory/status drift is systematically missed by authors | `subagents/memory-auditor-t8.md` | Controller compares touched paths and statuses with the final diff |

Rules this plan must keep: one active phase at a time; subagents never authorize parallel phases; write-capable
delegation is prohibited in this run (implementer disabled); every delegated dispatch cites a bundle or an
explicit context list, never "review this"; and any failure, `success: false`, or nonzero routed exit code
triggers an audit-repair-retry loop with the failed attempt preserved as evidence.

## Controller verification of delegated work

No delegated result is accepted on its own word. For every delegated task the controller:

1. confirms the task was dispatched with a complete bundle (phase, artifact path, upstream artifacts, diff basis,
   changed files, targeted files, audit questions, output shape);
2. verifies the claim against the actual worktree: re-reads the named files, re-runs the named commands, and
   diffs the claimed scope against `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`;
3. rejects any output that lacks a verdict, cites no changed files, ignores addenda, or cannot be turned into a
   durable action record;
4. repairs in-scope gaps itself, refreshes the bundle when repairs change reviewed scope, and re-dispatches the
   same role before accepting;
5. records `Reviewed Action Records`, `Main-Agent Verification Performed`, `Acceptance Decision`,
   `Refresh Handling` and `Repair Performed After Verification` in the phase artifact.

Action records live under `/.recursive/run/103-agent-strategy-and-scoring-strategy/subagents/`; routed transcripts
(when an external route is configured later) live under `evidence/router/`.

## Requirement-to-task traceability

| Requirement | Phase 1 task | Sub-phase / phase | Delegated verification |
| --- | --- | --- | --- |
| `R1` | `T1.2a` | `SP1` | `code-reviewer-sp1` |
| `R2` | `T1.2b` | `SP2` | `code-reviewer-sp2` |
| `R3` | `T1.2b`, `T1.2d` | `SP3` | `code-reviewer-sp3` |
| `R4` | `T1.2b` | `SP4` | `code-reviewer-sp4` |
| `R5` | `T1.2a` | `SP5` | `code-reviewer-sp5` |
| `R6` | `T1.2a` | `SP6` | `code-reviewer-sp6` |
| `R7` | `T1.2c` | `SP7` | `code-reviewer-sp7` |
| `R8` | `T1.2d` | `SP8` | `code-reviewer-sp8` |
| `R9` | `T1.2e` | `SP1`, `SP2` | Phase 3.5 review |
| `R10` | `T1.1`, `T1.2a` | `SP1`, `SP5` | Phase 3.5 review |
| `R11` | - | Phase 3 TDD log, Phase 4 | `tester-t4` |
| `R12` | `T1.2e` | Phase 5 | `tester-t5` + controller acceptance |

## Coverage Gate

- [x] Every design-document section maps to at least one requirement
- [x] Every requirement has observable acceptance criteria and a stated verification method
- [x] TDD discipline and Phase 5 live pi-CLI verification are explicit requirements (R11, R12)
- [x] Extensibility and migration are explicit requirements (R10)
- [x] Every requirement is broken into phases, tasks and sub-phases with stable ids and handoff fields
- [x] The delegation plan names which tasks go to subagents and the controller verification protocol
- [x] Out-of-scope items, constraints and assumptions are recorded

Coverage: PASS

## Approval Gate

- [x] Operator confirms this requirement set before Phase 1 begins

Approval: PASS

Approval basis: the operator reviewed the source design across the design review (PR `#288`), instructed this
run to be created, and required full document coverage, systematic/verifiable requirements, extensibility,
strict TDD and Phase 5 live pi-CLI verification. This artifact distils those instructions into stable
requirement identifiers without adding scope.
