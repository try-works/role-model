# Run 103 Phase 3.5 follow-up review findings
Reviewer: sp35_followup_review (delegated code-reviewer, second pass)
Repairs reviewed: 7ad627e3

## Verdict
PASS WITH FINDINGS - the repairs are real: the F1 blocker is genuinely fixed (the receipt is built from the
controller directive the request path actually applied, on both mappers, and the resolved strategy agrees with
the strategy the request carries in the pinned, equal-value, no-directive and difficulty cases), F2, F4, F6 and
F7 hold, and F5 holds for both vocabulary directions but not for a patch that names only the shared flag keys;
two findings the first review did not have remain: the run's tree fails the repository's repo-wide Biome gate
that CI runs first (N1) and the F5 gap above (N2).

## Finding-by-finding verification
| Finding | Status | Evidence |
| --- | --- | --- |
| F1 (blocker): receipt records the applied strategy | verified | `readAppliedControllerStrategy` (`index.ts:9888-9912`) reads `controllerRouting.active` + `acceptedDirectives.strategy` and both mappers pass it into `resolveRequestStrategy` (`:10597-10645` chat, `:10868-10920` responses). Counter-examples checked: pinned posture + directive -> `resolveStrategy`'s own pin branch (`scoring-strategy.ts:177-199`) returns the operator strategy and records the controller as discarded, matching the applier's pinned result; directive equal to the request strategy -> same value, source `controller` when unpinned; controller active with no strategy directive -> `guidance.strategy` is absent (`index.ts:2413`), read returns `null`, ladder falls through to difficulty/operator; hybrid difficulty decision -> the pin/difficulty gates are the same inputs the initial request strategy used (`index.ts:10571-10577`). `controller-routing-contract.ts:19,52` constrains directives to the four bridge spellings, so `normalizeScoringStrategyName` is identity on the wired value. Integration pin passes: `test/index.test.ts:6255` asserts `{strategy:"quality", source:"controller"}`; note the brief's `-t controller` filter does not select that test (its name has no "controller"), so I ran it explicitly. |
| F2 (major): effective weights travel with the receipt | verified | `StrategyProvenance.weights` (`scoring-strategy.ts:403-432`), observability contract (`packages/runtime-observability/src/index.ts:18-26`), UI read + render (`decision-receipt.ts:131-143`, `router-decision-detail.tsx:233-240`). The weights are a field of the same `strategyResolution` object every consumer already reads for the digest, so they travel wherever the digest does; pinned by `scoring-strategy-provenance.test.ts`, `scoring-strategy-diagnostics.test.ts` and `decision-receipt.test.ts`. |
| F4 (minor): rejected write cannot stay live with no previous config | verified (source) | `index.ts:29554-29567` now calls `applyUnifiedRuntimeConfigState(previousConfig ?? null, "rollback")` unconditionally; the null argument is the documented "no unified config" state path (`index.ts:23195-23316`) which shuts down the vendors the rejected apply started, clears provider accounts and rebuilds state, and the file restore above it is unchanged. No test pins the fresh-state-root case: the existing rejection tests (`backend-unified-runtime-config.test.ts:199-264`) run with a pre-existing config file. |
| F5 (minor): partial `routing` patch preserves unnamed keys | partially | The new test (`agent-strategy-config-path.test.ts:367-379`) pins `{mode, pin_weights}` surviving a `scoring_strategy`-only patch. Structured patch over a legacy file keeps the patch's vocabulary (`legacy {strategy:hybrid} + {mode:intelligent}` -> `mode intelligent`, probe). Legacy patch over a structured file wins end to end (`{mode:intelligent, scoring_strategy:quality} + {strategy:cost}` -> merge returns the legacy field, and the write path's render+reparse yields `mode: baseline` + `scoring_strategy: cost`, probe). Gap: a patch that names only a shared flag key clears an inherited legacy string - `{strategy:hybrid} + {routing:{pin_weights:true}}` -> `mode baseline, scoringStrategy null`, and `{strategy:hybrid, pin_weights:true} + {pin_weights:false}` -> `mode baseline` (probe), because `hasStructuredRoutingKeys` (`unified-runtime-config.ts:1593-1602`) counts `pin_weights`/`pinWeights`/`weights` as a vocabulary switch. See N2. |
| F6 (minor): declared `model_ids` narrows the pool | verified | `materializeAgentStrategyAliases` intersects the declared slice with the execution scope and copies an empty intersection verbatim (`agent-strategy.ts:325-345`); the empty result is skipped with reason `ALIAS_POOL_EMPTY` rather than widened or materialised (`agent-strategy.ts:504`, `index.ts:21439-21443`), pinned by the two new tests (`agent-strategy-config-path.test.ts:381-397`) and the existing write/startup rejections (`backend-unified-runtime-config.test.ts:264,299`). |
| F7 (nit): collision message names the real cause | verified | `canonicalIds` distinguishes a routing-alias collision from a posture name declared twice (`agent-strategy.ts:448-460`); the new test asserts `/declared twice/` for a role/workload duplicate (`agent-strategy-config-path.test.ts:399-419`). In a merge-only call the first declaration stays in `rows`; the message's "both declarations are rejected" is true of the write because any violation rejects the whole write (`index.ts:23322-23325`). |

## New findings (if any)

### N1 [major] The run's tree fails the repository's repo-wide Biome gate (CI's first step)

- File: the run's changed product files; the two repair-authored hunks are
  `role-model-router/apps/runtime-host-bridge/src/index.ts:29540-29542` and `:29560-29565` (the F4 comment and
  call are indented six spaces inside a ten-space block, and the F4-era `finalConfig` expression is wrapped
  differently from the formatter's output; both lines blame to `7ad627e3`).
- Requirement / gate: `package.json` `lint` is `biome check . && ...`, it is the first step of `ci:check`, and
  `packages/schema-tools/test/recursive-biome-repo-wide.test.ts` requires the repo-wide check to pass under the
  repository config. The run's own public CI evidence for run 101 (`E:\tmp\collab\a50-public-ci-check.log`,
  `logs-run101-public-ci-check.txt`) shows the same command passing at 1373/1382 files.
- Evidence: `corepack pnpm exec biome check --max-diagnostics=200 .` -> "Checked 1414 files ... Found 46 errors"
  (exit 1); every flagged path is inside `git diff --name-only ca5c2126..HEAD` (56 product paths, 40 flagged
  files: 4 source files, the rest tests and UI modules). `packages/schema-tools` biome parity test -> 1 failed.
  Most flagged content predates the repair commit (the run's earlier sub-phases were never formatted), so this
  is a run-level gap rather than a repair regression - but the repair added its own share and fixed none of it.
- Why it matters: `pnpm run lint` fails before `lint:rust`, and `pnpm run test` fails on the parity test, so
  Phase 4/6 and any public CI check fail on mechanical formatting until this is fixed.
- Suggested fix: run `corepack pnpm exec biome check --write` over the run's changed files plus the five lint
  errors (`scoring-strategy.ts:79-82` `noBannedTypes`, `control-routing-strategy.tsx:746` optional chaining,
  `agent-strategy-workload-examples.test.ts:110`), then re-run the parity test; record it in Phase 4's evidence.

### N2 [minor] A patch that names only a shared flag silently clears an inherited legacy `routing.strategy` (F5 gap)

- File: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts:2426-2432` with
  `hasStructuredRoutingKeys` at `:1593-1602`.
- Requirement: R1 round-trip and this repair's own criterion (a partial patch preserves the keys it does not
  name; the patch's vocabulary wins over the inherited one).
- Evidence (read-only `tsx` probe of the source): `mergeUnifiedRuntimeConfigDocuments({routing:{strategy:"hybrid"}},
  {routing:{pin_weights:true}})` -> `routingPosture {mode:"baseline", scoringStrategy:null, pinWeights:true}`;
  the same with `{strategy:"hybrid", pin_weights:true}` + `{pin_weights:false}` -> `mode: "baseline"`.
  `pin_weights`/`pinWeights`/`weights` are shared by both vocabularies, so naming one of them is not a
  vocabulary switch and should not drop the inherited mode/scoring strategy.
- Why it matters: an API client that only toggles the pin (or writes only `weights`) silently resets the
  operator's mode to `baseline` on a legacy-spelled file - the class of silent posture change F5 set out to stop.
- Suggested fix: treat only `mode`/`scoring_strategy`/`scoringStrategy` as the vocabulary selector (or migrate
  the inherited legacy string into the canonical pair before deleting), and add the two-direction test cases.

### N3 [nit] A pinned directive equal to the pinned strategy is "discarded" in the receipt but a no-op in the applier

- Files: `scoring-strategy.ts:177-199` (receipt records `discarded: {controller, X}` whenever a controller
  strategy is present and the posture is pinned) versus `scoring-strategy.ts:477-479` (the applier records
  nothing when the directive equals the request strategy).
- Evidence: probe of `resolveRequestStrategy({posture: latency+pinned, controllerActive:true,
  controllerStrategy:"quality"})` -> `{strategy:"latency", source:"operator", discarded:{source:"controller",
  strategy:"quality"}}`, while `resolveControllerStrategyApplication` returns `{strategy:"quality"}` with no
  discard for the equal case. The applied strategy never disagrees, so F1 stands; only the two provenance
  records differ (the UI shows "controller wanted ..."). Nit: either word the receipt as "suppressed" or record
  the no-op the same way in both places.

## Unrepaired findings
| Finding | Recorded where | Acceptable? |
| --- | --- | --- |
| F3 - paired private registry still disagrees (min 3/max 1000, default 2000 vs the read side's 5..30, 10000; re-verified read-only at `D:\DEV\role-model-internal\shared\route-learning\activation-policy.mjs:114-115`) | `03-implementation-summary.md:254-255` and the R7 audit note at `:385` both state the release dependency and point at `06-decisions-update.md`; that file does **not** exist yet (Phase 6 has not run; no `06-*` file exists in the run folder). R7's own criterion permits carrying it as a release dependency. | Yes, conditionally - the record is a commitment, not a landed record; Phase 6 must write it before any stage candidate is promoted. If Phase 6 slips, the two registries still disagree and the operator write path can persist a value the reader clamps. |
| F8 - `agent-strategy.ts` hand-rolls decoding with no recorded R9 deviation | `03-implementation-summary.md:255` says the deviation "is recorded in Phase 6"; `## Plan Deviations` (`:124-146`) has no entry and Phase 6 does not exist, so nothing on disk records it yet. The vocabulary itself is single-sourced: `agent-strategy.ts:5-10` imports `RoutingModeName`, `ScoringStrategyName`, `normalizeRoutingModeName`, `normalizeScoringStrategyName` from `scoring-strategy.ts` and has no `effect` import. | Yes, conditionally - same Phase 6 dependency. The coding-style deviation is real and currently unrecorded. |

## Commands executed
| Command | Result |
| --- | --- |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/scoring-strategy-provenance.test.ts test/scoring-strategy-resolution.test.ts test/agent-strategy-config-path.test.ts` | PASS - 3 files, 40 tests (exit 0) |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts` | PASS - 1 file, 30 tests (exit 0), 66 s |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "controller"` | PASS - 18 passed, 197 skipped (exit 0) |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "persisted Strategy B mode"` | PASS - the F1 integration pin (1 passed, exit 0); added because `-t controller` skips it |
| `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/decision-receipt.test.ts` | PASS - 4 tests (exit 0) |
| `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-biome-repo-wide.test.ts` | **FAIL** - 1 file, 1 test (exit 1): the repo-wide Biome gate (N1) |
| `corepack pnpm exec biome check --max-diagnostics=200 .` (worktree root) | **FAIL** - 1414 files checked, 46 errors (exit 1), every flagged path inside the run's changed files |
| read-only `tsx` probes of `mergeUnifiedRuntimeConfigDocuments` / `resolveRequestStrategy` (no files written) | F5 directions hold except the shared-flag case (N2); pinned receipt agrees with the applied strategy (F1); the legacy-patch direction canonicalises through render+reparse |
| `git blame -L 29536,29568` on `index.ts` | F4 comment/call and the F4-era `finalConfig` lines are from `7ad627e3` |

## Could not verify
- F4's fresh-state-root rollback: no test exercises it, and I could not drive `updateRuntimeConfig` end to end
  without writing outside the findings file; the verification is source-level plus the null-safe
  `applyUnifiedRuntimeConfigState` path.
- R12 / the live UI pass (Phase 5's evidence) - out of scope here.
- The exact `weights.quality` rejection wording the first review left open (not re-attempted).
- F1's controller branch in the UI is pinned only by unit tests; the integration pin uses `toMatchObject` on
  `{strategy, source}` and does not assert the rendered weights label end to end.
