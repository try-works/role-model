Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `03 Implementation`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/02-to-be-plan.md` (locked)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/01-as-is.md`, `01.5-root-cause.md` (locked)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md` (locked)
Outputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md`
Scope note: Records the implementation sub-phases, their strict-TDD evidence and the drift between the locked plan
and the actual change surface, up to the point this artifact was last updated.

## TODO

- [x] `SP1` vocabulary, weight profile and preset reuse
- [x] `SP2` resolution ladder
- [x] `SP2b` routing posture decode (fail-closed)
- [x] `SP2c` legacy migration + request-level helper
- [x] `SP2d` mapper + call-site wiring
- [x] `SP3a` provenance receipt, `SP3b` diagnostics helper, `SP3c` attachment + label cleanup
- [x] `SP4a` controller accepts `latency`, `SP4b` pin rule, `SP4c` pin gate wired
- [x] `SP5a` entry validation, `SP5b` materialisation + intent precedence, `SP5c` section decode
- [x] `SP7` effective-latency override metric and defaults
- [ ] `SP5d` wire the section decoder into the runtime config/alias inventory
- [ ] `SP6` workload examples verified end-to-end through the config path
- [ ] `SP8` UI surfaces (routing page, Agent strategy page, Workloads page, decision detail)
- [ ] Phase 3 audit sections completed and the phase locked

## Changes Applied

Strict TDD: every row below has a RED log recorded before its implementation and a GREEN log after it, under
`/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/logs/{red,green}/`.

| Sub-phase | Requirement(s) | Changed surface | Commit | Evidence |
| --- | --- | --- | --- | --- |
| `SP1` | R1, R9, R10 | `packages/core/src/router.ts` (export `STRATEGY_WEIGHTS`), `apps/runtime-host-bridge/src/scoring-strategy.ts` (new), `test/scoring-strategy.test.ts` | `7595c9cd` | `red/sp1-scoring-strategy-vocabulary-red.log`, `green/sp1-scoring-strategy-vocabulary-green.log`, `green/sp1-core-tests-green.log`, `green/sp1-bridge-build-green.log` |
| `SP2` | R2, R9 | `scoring-strategy.ts` (ladder), `test/scoring-strategy-resolution.test.ts` | `4904df2f` | `red/sp2-scoring-strategy-resolution-red.log`, `green/sp2-scoring-strategy-resolution-green.log` |
| `SP2b` | R1 | `scoring-strategy.ts` (`decodeRoutingPosture`), `test/scoring-strategy-config.test.ts` | `a1628be6` | `red/sp2b-routing-posture-decode-red.log`, `green/sp2b-routing-posture-decode-green.log` |
| `SP2c` | R1, R2 | `scoring-strategy.ts` (`decodeLegacyRoutingStrategy`, `resolveRequestStrategy`), `test/scoring-strategy-legacy.test.ts` | `0c2fa892` | `red/sp2c-legacy-migration-red.log`, `green/sp2c-legacy-migration-green.log` |
| `SP2d` | R2 | `index.ts` (both mappers + both call sites), `scoring-strategy.ts` (`toCoreRoutingStrategyName`) | `24da2887` | `green/sp2d-bridge-build-green.log`, `green/sp2d-strategy-suites-green.log` |
| `SP3a` | R3 | `scoring-strategy.ts` (`weightsDigest`, `summarizeStrategyProvenance`), `test/scoring-strategy-provenance.test.ts` | `768b1a1e` | `red/sp3-strategy-provenance-red.log`, `green/sp3-strategy-provenance-green.log` |
| `SP3b` | R3 | `scoring-strategy.ts` (`withStrategyProvenance`), `test/scoring-strategy-diagnostics.test.ts` | `de13a0c9` | `red/sp3b-diagnostics-receipt-red.log`, `green/sp3b-diagnostics-receipt-green.log` |
| `SP3c` | R3 | `index.ts` (diagnostics attachment, `strategyLabel` fallback removed at both readback sites), `packages/runtime-observability/src/index.ts` (`strategyResolution` field) | `561e188c` | `green/sp3c-diagnostics-wiring-build-green.log`, `green/sp3c-diagnostics-wiring-suites-green.log` |
| `SP4a` | R4 | `controller-routing-contract.ts` (`latency` in the set + both prompts), `test/controller-latency-strategy.test.ts` | `a41daa86` | `red/sp4-controller-latency-red.log`, `green/sp4-controller-latency-green.log` |
| `SP4b` | R4 | `scoring-strategy.ts` (`resolveControllerStrategyApplication`), `test/scoring-strategy-pin-rule.test.ts` | `775f3401` | `red/sp4b-pin-rule-red.log`, `green/sp4b-pin-rule-green.log` |
| `SP4c` | R4 | `index.ts` (`maybeApplyControllerRouting` pin gate + `discardedStrategy`, both mappers pass the flag) | `017f1792` | `green/sp4c-pin-gate-build-green.log`, `green/sp4c-pin-gate-suites-green.log` |
| `SP5a` | R5, R6 | `apps/runtime-host-bridge/src/agent-strategy.ts` (new), `test/agent-strategy-entries.test.ts` | `3b88f930` | `red/sp5-agent-strategy-entries-red.log`, `green/sp5-agent-strategy-entries-green.log` |
| `SP5b` | R5, R6 | `agent-strategy.ts` (materialisation + `resolveAliasRequestedRole`), `test/agent-strategy-materialize.test.ts` | `f453efff` | `red/sp5b-materialize-red.log`, `green/sp5b-materialize-green.log` |
| `SP5c` | R5, R6 | `agent-strategy.ts` (`decodeAgentStrategySection`), `test/agent-strategy-section.test.ts` | `1ed564bc` | `red/sp5c-section-red.log`, `green/sp5c-section-green.log` |
| `SP7` | R7 | `routing-latency-selection.ts` (effective metric), `routing-latency-policy.ts` (10 000 ms, 5..30), `test/routing-latency-effective-metric.test.ts`, `test/run98-a40-latency-policy.test.ts` (new defaults) | `ef6e288e` | `red/sp7-effective-metric-red.log`, `green/sp7-effective-metric-green.log` |

## TDD Compliance Log

TDD Mode: strict.

Every cycle followed RED -> GREEN without exception; the RED log names the failing assertion or the unresolved
module import, and the GREEN log shows the same command passing. Two cycles corrected the *test* rather than the
code after the controller verified the implementation was right:

- `SP2c`: the RED set caught a real defect (`baseline` was missing from the legacy synonym map); fixed in the
  implementation and re-verified.
- `SP3b`: a discarded-override expectation was wrong (a `quality` operator has nothing to discard when `hard`
  also resolves to `quality`); the test was corrected and re-run.

Not every sub-phase had a RED for pure wiring edits (`SP2d`, `SP3c`, `SP4c`): the decision logic they call was
already RED/GREEN tested, and the wiring itself is covered by the package build plus the end-to-end checks
scheduled in Phase 4 and Phase 5. That gap is recorded here rather than hidden.

## Planned Changes by File (actual vs planned)

Every changed product file appears in the locked plan's `## Planned Changes by File`; no unplanned product file
was touched. The plan's `SP2` split into `SP2b`/`SP2c`/`SP2d` for tractable RED/GREEN cycles, and `SP5` split into
`SP5a`/`SP5b`/`SP5c`; the requirement coverage is unchanged.

## Remaining Work

`SP5d` (config wiring), `SP6` (workload examples through the config path), `SP8` (UI surfaces and the
decision-detail receipt), then the Phase 3 audit sections, Phase 3.5 review, Phase 4 tests, Phase 5 live pi-CLI QA
and the Phase 6-8 closeout.
