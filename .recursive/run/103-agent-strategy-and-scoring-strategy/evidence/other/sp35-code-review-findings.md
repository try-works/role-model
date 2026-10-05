# Run 103 Phase 3.5 code review findings
Reviewer: sp35_code_review (delegated code-reviewer)
Baseline: ca5c2126
Reviewed: the canonical review bundle
`/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/review-bundles/03-5-code-review-code-reviewer.md`,
the locked requirements `00-requirements.md` (R1-R12 and their acceptance criteria), the locked
`02-to-be-plan.md`, the locked `03-implementation-summary.md`, the design document
`inputs/16-agent-strategy-and-scoring-strategy.md` (sections 3-7), and the product diff
`git diff ca5c2126...` - read in source: `scoring-strategy.ts`, `agent-strategy.ts`,
`unified-runtime-config.ts`, `index.ts` (the strategy/posture/controller/latency call paths),
`routing-latency-selection.ts`, `routing-latency-policy.ts`, `packages/core/src/router.ts`,
`packages/runtime-observability/src/index.ts`, the runtime-ui pages (`control-routing-strategy.tsx`,
`control-runtime-config.tsx`, `posture-entries-page.tsx`), the UI view models (`routing-mode.ts`,
`agent-strategy.ts`, `decision-receipt.ts`, `latency-override.ts`, `runtime-api.ts`) and the new
bridge tests. Read-only cross-check: the private write-path registry
`D:\DEV\role-model-internal\shared\route-learning\activation-policy.mjs`.

## Verdict
FAIL - the diff is disciplined, well-evidenced and correct in almost every requirement, but the
decision receipt does not record a controller-chosen strategy (R3's central claim), custom weights
never travel in the diagnostics the design says carry them (R2), and the paired private registry
still disagrees with the read-side latency policy (R7); all three are small, localized repairs.

## Findings

### F1 [severity: blocker] The decision receipt cannot report `strategy_source: controller`, and contradicts the strategy that actually ranked the request

- File: `role-model-router/apps/runtime-host-bridge/src/index.ts:10604` and `:10872` (both mappers);
  the receipt input is built by `resolveRequestStrategy` at
  `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts:374`
- Requirement: R3 (and the design document sections 5 and 6.5)
- Evidence: both mappers attach the receipt with
  `withStrategyProvenance(..., resolveRequestStrategy({ posture, effectiveRoutingMode, difficulty }))`.
  `resolveRequestStrategy` accepts `controllerActive` / `controllerStrategy`
  (`scoring-strategy.ts:335-336`) and only acts on them when they are set, but no production call site
  ever sets them: `rg -n 'controllerActive' role-model-router/apps/runtime-host-bridge/src` returns only
  the type declaration and the pass-through inside `resolveRequestStrategy` itself; the only callers
  that exercise them are unit tests (`test/scoring-strategy-resolution.test.ts:48`, `:57`, `:109`).
  Meanwhile `maybeApplyControllerRouting` has already replaced the request strategy with the
  controller's directive (`index.ts:2356-2380`: `strategyApplication.strategy !==
  input.routingRequest.strategy` -> `{ strategy: toCoreRoutingStrategyName(...) }`), and telemetry
  records that same effective value (`index.ts:27506`, `selectedStrategy: plan.routingRequest.strategy`).
  The four integration receipts that pin the new field are all default cases
  (`test/index.test.ts:4968`, `:5308`, `:6222`, `:6385` assert
  `{ strategy: "balanced", source: "default" }`), so nothing pins the controller case.
- Why it matters: on an unpinned `intelligent`/`hybrid` request where the controller emits
  `strategy: quality` over a saved `latency` posture, the request is scored with `quality` while the
  decision's `strategyResolution` says `{ strategy: "latency", source: "operator" }`. R3's first
  acceptance criterion ("Decisions record the effective strategy and `strategy_source`
  (`controller | difficulty | operator | default`)") is therefore not met for exactly the step the
  run exists to make observable, and the UI renders the wrong attribution
  (`role-model-router/apps/runtime-ui/app/lib/decision-receipt.ts:109-134`). The controller's accepted
  directive is still visible in `controllerRouting.acceptedDirectives.strategy`, so the record is
  self-contradictory rather than merely incomplete.
- Suggested fix: build the receipt from the value that was applied, e.g. pass
  `controllerActive: controllerRouting.routingDiagnostics?.controllerRouting?.active === true` and
  `controllerStrategy: normalizeScoringStrategyName(acceptedDirectives?.strategy) ?? undefined` into
  both `resolveRequestStrategy` calls (or compute the receipt inside `maybeApplyControllerRouting` and
  merge it). Note the pin rule is currently implemented twice
  (`scoring-strategy.ts:171-205` and `resolveControllerStrategyApplication`), so make the wired path
  call exactly one of them to avoid double-recording the discarded directive. Add one integration test
  asserting `source: "controller"` on a controller-directed request.

### F2 [severity: major] `custom` weights are not carried in runtime diagnostics - only their digest is

- File: `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts:417-425`
  (`summarizeStrategyProvenance`), consumed by
  `role-model-router/packages/runtime-observability/src/index.ts:18-25`
- Requirement: R2 (fifth acceptance criterion); design document section 4 ("the effective weights plus
  digest travel in the runtime's own `routingDiagnostics`")
- Evidence: the provenance object is exactly
  `{ strategy, source, weightsDigest, discarded? }` - no weight values. The UI can only render the
  digest (`role-model-router/apps/runtime-ui/app/lib/decision-receipt.ts:29`, `:134`). The config
  readback publishes the saved weights (`RouterRoutingPostureReadback.weights`,
  `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts:1173-1180`), so an operator can see the
  current profile, but no recorded decision can be reconstructed from its own receipt.
- Why it matters: a decision taken under a custom profile is not auditable from the decision; if the
  saved weights change later, the digest alone cannot tell the reviewer which recipe ranked the
  request, which is the stated purpose of travelling the weights in the diagnostics while the protocol
  snapshot stays closed.
- Suggested fix: add `weights: { ...resolution.weights }` to `summarizeStrategyProvenance` (and to the
  `strategyResolution` interface in `packages/runtime-observability`). The change is additive and does
  not touch `protocol/schemas/routing-policy.schema.json`.

### F3 [severity: major] The paired private write-path registry still disagrees with the read-side latency policy on defaults and bounds

- File: `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts:42-43`, `:54-55`
  versus `D:\DEV\role-model-internal\shared\route-learning\activation-policy.mjs:114-115`
- Requirement: R7 (fifth acceptance criterion)
- Evidence: the public read-side policy now declares `minSamples: { min: 5, max: 30 }` with default `5`
  and `maxDeltaMs` default `10000`; the private registry that the operator write path validates against
  still declares `latencySelectionMinSamples` `default: 5, min: 3, max: 1000` and
  `latencySelectionMaxDeltaMs` `default: 2000, min: 0, max: 60000`. Verified read-only at both the
  private `dev` tip (`06c61411`) and at the private commit the live stage candidate embeds
  (`3fd6405e`, `git show 3fd6405e:shared/route-learning/activation-policy.mjs`), so this is not a
  stale-checkout artefact.
- Why it matters: the operator surface can persist a value the runtime clamps or rejects
  (`minSamples` up to 1000 against a 30 ceiling; a 2000 ms default against the documented 10 000 ms
  allowance), and the two halves of the override disagree about its default - the exact failure the
  criterion was written to prevent.
- Suggested fix: land the paired private registry change (bounds `5..30`, default `10000`) and add the
  consistency check the criterion asks for; if it cannot land in this run, record it explicitly as a
  release dependency of the stage promotion in `06-decisions-update.md` *before* the candidate is
  promoted, since as of this review the two registries do not agree.

### F4 [severity: minor] A posture write that the runtime rejects can stay live in memory when there was no previous config

- File: `role-model-router/apps/runtime-host-bridge/src/index.ts:29470-29525` (the `PUT` path),
  `:23245` (`currentUnifiedRuntimeConfig = nextConfig`) and `:23280` (the posture violation throw)
- Requirement: R5/R6 write errors; the run's own fail-closed claim (`03-implementation-summary.md`,
  "no path where a config write can leave the persisted file in a state the reader then rejects")
- Evidence: the mutation adopts the new config and materialises its aliases *before* the posture
  check, and the `catch` compensates with `if (previousConfig) { ... applyUnifiedRuntimeConfigState(previousConfig, "rollback"); }`.
  With `previousConfig === null` (a configured-but-absent config file, e.g. a fresh state root) the
  file is deleted but no rollback is applied, so the runtime keeps serving the config it just declared
  invalid via a 400.
- Why it matters: narrow but real fail-open on the write path; the operator sees a rejection while the
  runtime runs the rejected posture.
- Suggested fix: apply the rollback unconditionally (`await applyUnifiedRuntimeConfigState(previousConfig ?? null, "rollback")`),
  or run `validateAgentStrategyBindings`/the collision derivation against the candidate document before
  mutating state.

### F5 [severity: minor] `PUT /api/role-model/runtime/config` silently drops posture fields the patch does not repeat

- File: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts:2388-2404`
  (`mergeUnifiedRuntimeConfigDocuments` - a section-shallow merge)
- Requirement: R1 round-trip ("save, reload and re-render preserve mode, scoring strategy, pin flag and
  weights")
- Evidence: `{...current, ...normalizedPatch}` replaces the whole `routing` object, then re-parses with
  the read path, so a patch of `{"routing":{"scoring_strategy":"quality"}}` silently resets `mode` to
  `baseline` and `pin_weights` to `false`. The UI is safe (the routing page writes mode +
  `scoring_strategy` + `pin_weights` every time, `role-model-router/apps/runtime-ui/app/lib/routing-mode.ts:546-560`,
  and the posture pages write whole blocks, `:362-396`), but any other API client that patches one key
  loses the others without an error.
- Why it matters: the two-axis posture is now several keys in one object; a partial write is a silent
  posture change rather than a rejected request.
- Suggested fix: deep-merge the `routing` block (and the two posture blocks) in
  `mergeUnifiedRuntimeConfigDocuments`, or reject a `routing` patch that omits `mode` while the current
  document declares one.

### F6 [severity: minor] `model_ids` on an agent strategy or workload entry is inert

- File: `role-model-router/apps/runtime-host-bridge/src/agent-strategy.ts:144` (decoded),
  `:334` (never used for the alias pool); `role-model-router/apps/runtime-host-bridge/src/index.ts:25403`
  (only reported)
- Requirement: R5/R6 (the entry accepts `model_ids`; each entry materialises `<name>.<scope>` carrying
  the posture)
- Evidence: `materializeAgentStrategyAliases` fills `modelIds` from
  `input.modelIdsByExecutionMode[executionMode]` only; `entry.modelIds` is read back into
  `configuredModelIds` for the pages but no code path narrows the alias pool with it, and no test in
  `test/agent-strategy-*.test.ts` asserts any effect of a declared `model_ids`.
- Why it matters: an operator (or the Workloads page) can declare `model_ids` and observe no change in
  the pool or the winner - the field reads as a binding and behaves as documentation.
- Suggested fix: intersect `entry.modelIds` with the per-scope slice when materialising (and report the
  resulting empty pool as `ALIAS_POOL_EMPTY`), or drop the field from `ALLOWED_ENTRY_KEYS` and document
  it as reserved.

### F7 [severity: nit] The collision diagnostic misattributes a posture-vs-posture collision

- File: `role-model-router/apps/runtime-host-bridge/src/agent-strategy.ts:445`
- Requirement: R5/R6 (collisions are write errors)
- Evidence: `mergeAliasInventory` reports every duplicate as
  `posture alias "<id>" collides with an existing routing alias and was skipped`, but the common case
  reaching it is a second posture entry with the same name (e.g. `coder` declared as both an agent
  strategy and a workload); the message then names the wrong cause and the term "skipped" reads like a
  warning rather than the write error it triggers (`index.ts:23280`).
- Why it matters: it is the only operator-facing text for a rejected namespace collision.
- Suggested fix: distinguish the two cases ("collides with posture entry ..." / "collides with routing
  alias ...") and word it as a rejection.

### F8 [severity: nit] `agent-strategy.ts` hand-rolls vocabulary decoding with no recorded R9 deviation

- File: `role-model-router/apps/runtime-host-bridge/src/agent-strategy.ts:88-160`
- Requirement: R9 ("a record of any deviation" from the design document's section 7 primitive map)
- Evidence: the design document's section 7.2 assigns "Config and vocabulary decoding, bounds, ..." to
  `Schema`, and that is how `scoring-strategy.ts` and the structured routing block behave
  (`WeightProfile`, `decodeUnknownResult`); `agent-strategy.ts` performs the same class of decoding with
  hand-written `violations` arrays and no `effect` import at all, and `## Plan Deviations` in
  `03-implementation-summary.md` does not mention it. Import discipline itself is clean (no relative
  `vendor/**` imports anywhere in the diff; the bridge build log `sp5e-build-green.log` is evidence the
  Effect wrapper resolves).
- Why it matters: the run's own Effect-first rule (AGENTS.md / R9) requires the deviation to be
  recorded rather than silent; a second, hand-written decoder is also the place a future posture
  variant would drift from the vocabulary owner.
- Suggested fix: either decode `AgentStrategyEntry` through a `Schema` (an `ALLOWED_ENTRY_KEYS` struct
  with an unknown-key annotation) or record the deliberate plain-TypeScript choice and its reason in
  Phase 6's decision record.

## Requirement coverage table

| Requirement | What proves it | Gap (if any) |
| --- | --- | --- |
| R1 posture split and config contract | `scoring-strategy.ts:1-330` (vocabulary, legacy table, weight Schema, `decodeRoutingPosture`, `decodeLegacyRoutingStrategy`), `unified-runtime-config.ts:1577-1786` (strict write / degraded read, `renderStructuredRoutingBlock` never writes `strategy`), `mergeUnifiedRuntimeConfigDocuments:2388` rejects unknown spellings; `test/scoring-strategy-config.test.ts`, `test/scoring-strategy-legacy.test.ts`, `test/agent-strategy-config-path.test.ts` (20 tests, all green in C1) | F5 (partial patches silently drop keys). The exact wording of the weights rejection (`weights.quality`) was not verified: the error text embeds the Effect Schema failure string, and my out-of-tree probe could not resolve the workspace modules. `craft-ask` is handled as "no posture" (`scoring-strategy.ts:299-303`), matching `normalizeRoutingStrategyInputValue`. |
| R2 resolution and precedence | `resolveStrategy` (`scoring-strategy.ts:166-211`) implements controller > difficulty > operator > balanced, `medium` falls through, `pin_weights` discards and records; `resolveRequestStrategy` gates difficulty to `difficulty`/`hybrid` (preserving the pre-existing run-28 gate, `index.ts:9886`); `toCoreRoutingStrategyName` maps `custom` to its base preset for the closed protocol snapshot; `test/scoring-strategy-resolution.test.ts` (11 cases, green in C2) | F2 (weights not carried); F1 (the wired receipt drops the controller step, so the ladder's recorded outcome can be wrong even though the ladder itself is right) |
| R3 decision provenance and honest readback | receipt attached on every chat and responses decision (`index.ts:10604`, `:10872`, pinned by `test/index.test.ts:4968` etc.), telemetry `selectedStrategy` carries the effective value (`index.ts:27506`), the `strategyLabel` raw-config fallback is removed and the UI reads the receipt (`app/lib/decision-receipt.ts:109-134`, `app/routes/router.tsx`) | F1 (blocker): `source: "controller"` is unreachable from the wired path and the receipt can name a strategy other than the one applied |
| R4 Intelligent mode + `latency` | `controller-routing-contract.ts:19,52,285,304-324` (latency joins the supported set, both prompt variants updated), `index.ts:2319` normalizes the directive, `resolveControllerStrategyApplication` applies the pin rule and records `discardedStrategy` (`index.ts:2393-2400`), `test/controller-latency-strategy.test.ts`, `test/scoring-strategy-pin-rule.test.ts` (green in C2) | The directive normalizer widened from `isBridgeRoutingStrategy` to the whole bridge vocabulary (`index.ts:2319`); a `custom` directive would silently become `balanced` via `toCoreRoutingStrategyName`. Unreachable while `controller-routing-contract.ts:95` constrains the model output to the four values, so recorded here as a robustness note only. |
| R5 agent strategy postures | entry contract and violations (`agent-strategy.ts:88-160`), per-scope materialisation (`:320-345`), `ALIAS_POOL_EMPTY` never widened (`:470-500`), reserved-name/unknown-role/collision rejection into a write error (`index.ts:21312-21330`, `:23280`), declared role wins (`resolveAliasRequestedRole:352-368`, `withAliasPostureBinding`), `test/agent-strategy-{entries,materialize,section,inventory,config-path,request-binding,live-aliases}.test.ts` | F6 (`model_ids` inert), F7 (collision message). Note: cross-kind duplicate names are rejected through the alias merge, not through `validateAgentStrategyNames` (which the runtime path does not call). |
| R6 workload postures | same contract with `role_id` refused (`agent-strategy.ts:107-120`), unknown capability is a warning while unknown posture values are violations (`validateAgentStrategyBindings:163-190`), shipped examples single-sourced (`SHIPPED_WORKLOAD_EXAMPLES:505-517`) and published to the UI (`index.ts:25453`), `docs/operations/05-agent-strategy-and-workload-postures.md` | F6 (`model_ids` inert) |
| R7 measured-latency override | `routing-latency-selection.ts:25-30,88-170` (effective latency `p50 + 0.25*(p95-p50)`, ties by endpoint id, cap, delta gate), `routing-latency-policy.ts:41-56` (minSamples 5..30, maxDeltaMs 10 000), selection restricted to the router's eligible set, `test/routing-latency-effective-metric.test.ts`, `test/run98-a40-latency-policy.test.ts` | F3 (the paired private registry still disagrees) |
| R8 operator surfaces | three pages plus receipts (`app/routes/control-routing-strategy.tsx`, `agent-strategy.tsx`, `workloads.tsx`, `app/components/posture-entries-page.tsx`), whole-block canonical writes (`routing-mode.ts:546-570`, `agent-strategy.ts:362-396`), free-form editor canonicalisation (`control-runtime-config.tsx:91-105`), design-system nav (`app/lib/design-system.ts`); component tests green | The live UI pass against the rebuilt runtime is Phase 5's evidence and is not part of this review |
| R9 Effect-first implementation | `scoring-strategy.ts:15-17` imports `Schema`, `Result`, `Data` from the bare `effect` specifier; no relative `vendor/**` import anywhere in the diff; the bridge build evidence is `sp5e-build-green.log` / `sp1-bridge-build-green.log`; `agent-strategy.ts` contains no Effect usage and no recorded deviation | F8 (nit): the deviation is not recorded |
| R10 extensibility and future-proofing | `STRATEGY_WEIGHTS` is exported from `packages/core/src/router.ts:189` and re-used by the vocabulary owner; `Data.TaggedEnum` + `$match` make the plan total; the three legacy switches delegate (`normalizeRoutingModeName`, `normalizeScoringStrategyName`, `toPolicyStrategy`); config version/migration table covered by tests | The UI keeps its own vocabulary module (`app/lib/routing-mode.ts`), which R10 explicitly allows as "one owner per side" |
| R11 strict TDD discipline | the RED/GREEN inventory under `evidence/logs/{red,green}` is complete for every sub-phase and the three named suites pass (commands C1-C3); `03-implementation-summary.md` records the wiring slices that carry build/integration evidence instead | None found |
| R12 live verification of the rebuilt runtime | not reviewable here - it is Phase 5's evidence (`05-manual-qa.md`); this review confirms only that the surfaces the matrix must drive exist and are integration-tested (`test/agent-strategy-live-aliases.test.ts`, `sp5f-live-aliases-green.log`) | The packaged-runtime rebuild, the dev-channel start and the live pi-CLI matrix are outstanding |

## Diff reconciliation

The bundle's changed-file list matches `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
(130 paths: 55 product/test/doc paths plus the run folder, the inputs copy and the review bundle). I
read every product source in the bundle's list; the only paths I did not read line-by-line are the
three generated `.react-router/types/**` files (build output committed by this repository's
convention) and the 19 bridge test files in full (I read the eight that carry R1-R7 assertions and ran
three of them).

## Commands executed

| Command | Result |
| --- | --- |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/agent-strategy-config-path.test.ts` | PASS - 1 file, 20 tests passed (exit 0) |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/scoring-strategy-resolution.test.ts test/scoring-strategy-legacy.test.ts test/scoring-strategy-pin-rule.test.ts` | PASS - 3 files, 21 tests passed (exit 0) |
| `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/routing-mode.test.ts` | PASS - 1 file, 13 tests passed (exit 0) |
| `rg -n 'controllerActive' role-model-router/apps/runtime-host-bridge/src` (F1) | Only `scoring-strategy.ts:114,336,382-383` (declaration + pass-through); no production caller sets it |
| `git show 3fd6405e:shared/route-learning/activation-policy.mjs` in `D:\DEV\role-model-internal` (F3) | `latencySelectionMinSamples default 5, min 3, max 1000`; `latencySelectionMaxDeltaMs default 2000` - disagrees with the read-side policy |
| out-of-tree `tsx` probe of `WeightProfile` failure text | failed (`ERR_MODULE_NOT_FOUND` from an external path); abandoned, the R1 weight-rejection wording is therefore unverified (see the coverage table) |
