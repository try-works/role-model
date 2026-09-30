# Run 103 Phase 4 tester audit
Auditor: sp4_tester_audit (delegated tester)
Diff basis: ca5c2126

## Verdict
PASS WITH GAPS

Every suite the brief names passes: `core` 10 files / 82 tests, `sqlite-memory` 20 files / 109 tests,
`runtime-ui` 65 files / 621 tests, and the 20 focused `runtime-host-bridge` files 176 tests. The F1
integration pin (`index.test.ts` -t "uses the persisted Strategy B mode as the default routing mode when no
alias mode or request override is set") passes when run explicitly. Coverage is strong at the unit and
config level and thin at three places the requirements name explicitly: R2's ranking-invariance tests, R7's
paired-registry agreement, and R10's extension drill. Two state-level problems also block a clean Phase 4
sign-off: the repo-wide Biome gate is red at HEAD, and the live S11 sqlite-memory repair has no RED
evidence in the run's own strict-TDD record.

## Requirement coverage table

| Requirement | Direct test(s) | Coverage | Gap |
| --- | --- | --- | --- |
| R1 posture split and config contract | `test/scoring-strategy.test.ts` (legacy table, vocabulary, weight schema), `test/scoring-strategy-config.test.ts` (decode, degrade-on-read), `test/scoring-strategy-legacy.test.ts`, `test/unified-runtime-config.test.ts` (canonical write, weights-for-preset/unknown-mode/unknown-string rejection), `test/agent-strategy-config-path.test.ts` (structured block round trip, partial patch F5/N2), `test/backend-unified-runtime-config.test.ts` (save→reload through the backend; synonym gone from the file), `app/lib/routing-mode.test.ts` (canonical-only writers) | direct | The rejection-path wording is only pinned at `routing.weights` / `routing.scoring_strategy` level; no test asserts a `weights.<metric>` path (R1's `weights.quality` example). "Config carries a version and a migration path" is covered as legacy-spelling migration, not a version-keyed migration. |
| R2 resolution and precedence | `test/scoring-strategy-resolution.test.ts` (operator/default/controller/easy/hard/medium/pin+controller/pin+difficulty/custom/controller-over-difficulty), `test/scoring-strategy-legacy.test.ts`, `test/scoring-strategy-pin-rule.test.ts`, `test/index.test.ts` F1 pin (ran explicitly: PASS) | direct for the ladder | No same-candidate-set test proving different strategies pick different winners; no eligibility-invariance test; no test that a saved `latency` posture reaches `routingRequest.strategy` (only live QA S4 shows it); the request-declared-intent rung is covered only indirectly through the alias-binding tests. |
| R3 decision provenance and honest readback | `test/scoring-strategy-provenance.test.ts`, `test/scoring-strategy-diagnostics.test.ts`, `test/index.test.ts` (default + controller receipts), `test/agent-strategy-live-aliases.test.ts`, `packages/sqlite-memory/test/run98-a40-stub-fidelity.test.ts`, `app/lib/decision-receipt.test.ts`, `app/routes/router-decision-detail.test.tsx` | direct | Telemetry `selected_strategy` is read from `plan.routingRequest.strategy` (`index.ts:27545`) but no test asserts it end to end; the two `selectedStrategy` assertions in `index.test.ts` are hand-set fixture values. The UI receipt assertions are source greps. |
| R4 Intelligent mode keeps its contract and gains `latency` | `test/controller-latency-strategy.test.ts` (accepts `latency`, refuses unknown, prompt carries the value), `test/scoring-strategy-pin-rule.test.ts`, `test/scoring-strategy-resolution.test.ts`, `test/index.test.ts` (controller guidance integration) | direct | none material |
| R5 agent strategy postures | `test/agent-strategy-{entries,materialize,section,inventory,config-path,request-binding}.test.ts`, `test/agent-strategy-live-aliases.test.ts` (live backend: aliases materialise, unknown `role_id` and shadowing alias are write errors), `test/backend-unified-runtime-config.test.ts` (`ALIAS_POOL_EMPTY`), `app/lib/agent-strategy.test.ts`, `app/routes/agent-strategy.test.tsx` | direct | none material |
| R6 workload postures | `test/agent-strategy-workload-examples.test.ts` (batch/embedding round trip, per-scope aliases, capability pin), `test/agent-strategy-config-path.test.ts` (unknown-capability warning, `role_id` rejected), `test/agent-strategy-live-aliases.test.ts`, `app/routes/agent-strategy.test.tsx` | direct at module/API level | The live matrix exercises `batch` only (S8); `embedding` has no live end-to-end pass. |
| R7 measured-latency override | `test/routing-latency-effective-metric.test.ts` (effective metric, threshold), `test/run98-a40-latency-policy.test.ts` (defaults incl. 10 000, fail-closed bounds, env narrowing), `app/lib/latency-override.test.ts` | partial | The paired private registry still disagrees (see EI-7); the promised recording `06-decisions-update.md` does not exist; the public read side's upper bound (min_samples ≤ 30) is not pinned by any test; the UI bounds test derives 5..30 from a hand-written fixture, so a runtime publishing 3..1000 would still pass. |
| R8 operator surfaces | `app/lib/routing-mode.test.ts` (13 tests), `app/lib/agent-strategy.test.ts` (6), `app/lib/latency-override.test.ts` (5), `app/lib/decision-receipt.test.ts` (4), `app/lib/design-system.test.ts` (nav), three route test files | partial | The route tests are source greps plus one loading-state render per page; no data-bearing render and no save-path interaction test; no screenshots exist for the claimed live UI surface. |
| R9 Effect-first implementation | none (build logs only: `green/sp1-bridge-build-green.log`, `green/sp5e-build-green.log`) | absent (build-only) | No test asserts the import policy (bare `effect` specifier, no new dependency) or the request-path purity rule; that acceptance criterion rests on the build and the review prose. |
| R10 extensibility and future-proofing | `test/scoring-strategy.test.ts` (exact vocabulary, presets from `STRATEGY_WEIGHTS`, unknown refused), `app/lib/routing-mode.test.ts`, `test/agent-strategy-config-path.test.ts` (legacy migrated on write, reserved field additive) | partial | No extension drill (temporary fifth preset/posture variant proving the single-place/compile-time behaviour); no version-keyed migration test; "no second list of names" is pinned by equality assertions rather than structurally. |
| R11 strict TDD discipline | the `evidence/logs/red/` and `evidence/logs/green/` trees (19 RED logs reviewed for presence and shape) | partial | The live S11 repair (`790da3e2`, production `legacy-migration.ts` + its test) has no RED log and no entry in the TDD Compliance Log; `p4-phase4-bridge-suites-green.log` records a failing full-suite run despite its name (EI-5, EI-6). |
| R12 live verification of the rebuilt runtime | `evidence/phase5/` (config, receipts, pi transcripts, package-sea log, private-distribution log) | live-only by design | No screenshots where UI behaviour is claimed; `05-manual-qa.md` cites `04-test-summary.md` (LOCKED) which does not exist; not re-runnable inside this audit (restart forbidden), so the live claims were inspected, not reproduced. |

## Commands executed

| Command | Result |
| --- | --- |
| `corepack pnpm --filter @role-model-router/core test` | PASS — 10 files, 82 tests, exit 0 (12.2 s) |
| `corepack pnpm --filter @role-model-router/sqlite-memory test` | PASS — 20 files, 109 tests, exit 0 (29.5 s) |
| `corepack pnpm --filter @role-model-router/runtime-ui test` | PASS — 65 files, 621 tests, exit 0 (51.8 s) |
| `corepack pnpm --filter @role-model-router/schema-tools exec vitest run test/recursive-biome-repo-wide.test.ts` (brief verbatim) | exit 0 but **ran nothing**: `No projects matched the filters` — no package named `@role-model-router/schema-tools` exists (EI-3) |
| `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-biome-repo-wide.test.ts` (corrected filter) | **FAIL** — 1 file / 1 test failed (the test shells out to `biome check .`) |
| `corepack pnpm exec biome check --max-diagnostics=50 .` | **FAIL** — exit 1; checked 1414 files; 1 format error in `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` (1643-1647) |
| `corepack pnpm run lint` | **FAIL** — exit 1 in 3.2 s at the first step (`biome check .`); the rust half never runs |
| 20-file focused bridge suite (verbatim brief command) | PASS — 20 files, 176 tests, exit 0 (102.2 s) |
| extra: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "uses the persisted Strategy B mode as the default routing mode when no alias mode or request override is set"` | PASS — 1 file, 1 test, exit 0 (10.4 s) |

## Evidence-integrity findings

**EI-1 [major] — the repo-wide Biome gate is red at HEAD, inside this run's own diff.** `biome check .`
exits 1 with one format error at `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
lines 1643-1647: the committed multi-line `throw new Error(...)` is what the formatter would join into one
line. `git blame` attributes those lines to `2d59bc2f` — the commit whose message is "follow-up review
repairs (N1 biome, …)". `pnpm run lint` (CI's first step, per the follow-up review) therefore fails before
the rust half runs, and the run-31 parity test — part of the recursive `pnpm run test` — fails with the same
output. The N1 finding is not actually repaired at HEAD.

**EI-2 [major] — the N1 "green" log does not cover the committed content.** `green/sp35-n1-biome-parity-green.log`
records a passing run started at 20:10:10 against this worktree. Commit `2d59bc2f` (20:15:16) is the last
commit that touches `unified-runtime-config.ts`, and the working tree has been clean of product changes
since. If the file had been in its committed state when that run executed, the same command would pass
now. It fails, so the file changed after the log was produced and before it was committed; the N1 green
log cannot be the evidence for the content it is attached to.

**EI-3 [minor] — the brief's parity-test command silently ran nothing.** The package is
`@role-model/schema-tools` (at `packages/schema-tools`), not `@role-model-router/schema-tools`; the
verbatim command prints `No projects matched the filters` and exits 0. Any re-run of the brief as written
would report a false green for the gate in EI-1.

**EI-4 [minor] — `p4-phase4-bridge-suites-green.log` is not a green run at all.** The file named "green"
records `1 failed | 317 passed | 3 skipped (321)` test files and `1 failed | 1935 passed | 5 skipped (1941)`
tests with pnpm exit 1
(`validate-ui.test.ts > runRuntimeUiValidation > validates runtime config reads and the main control-plane
mutations`, "timed out waiting for session bootstrap"). The controller dispositioned it as a
parallel-load flake and re-ran the file in isolation (`p4-validate-ui-isolated-green.log`, 2 tests, PASS).
The failed log was kept, which is honest, but the file name asserts the opposite of its content and no
full-suite green run exists at HEAD.

**EI-5 [minor] — strict-TDD hole for the S11 repair.** `790da3e2` adds the production allowlist entries in
`packages/sqlite-memory/src/legacy-migration.ts`, the assertions in
`packages/sqlite-memory/test/run98-a40-stub-fidelity.test.ts`, and `green/p5-stub-fidelity-green.log` in a
single commit. There is no `evidence/logs/red/*` log for it and the TDD Compliance Log has no row for it
(`decff95f` only added the two files to the changed-file accounting). R11's "no production change lands
without a preceding failing test" is not evidenced for that change.

**EI-6 [minor] — `05-manual-qa.md` cites a LOCKED input that does not exist and a UI claim with no
screenshot.** The artifact lists `04-test-summary.md` (LOCKED) among its inputs; no such file exists in the
run folder. Its traceability table maps R8 to "the live readback the UI renders (S10)" and R12 requires
screenshots where UI behaviour is claimed, but no image file exists anywhere in the run folder or the
run-103 diff.

**EI-7 [major, carried from Phase 3.5 F3] — the paired private registry still disagrees and its recording
does not exist.** `D:\DEV\role-model-internal\shared\route-learning\activation-policy.mjs:114-115` (private
repo HEAD `06c61411`) declares `latencySelectionMinSamples` bounds `min: 3, max: 1000` and
`latencySelectionMaxDeltaMs` default `2000`, against the public read side's `min: 5, max: 30` and default
`10000`. R7 requires the two registries to agree, with the paired private change recorded as a release
dependency; the ledger points that recording at `06-decisions-update.md`, which does not exist yet.

## Weakest tests

1. `app/routes/control-routing-strategy.test.tsx`, `app/routes/agent-strategy.test.tsx`,
   `app/routes/router-decision-detail.test.tsx` — almost every assertion is
   `expect(pageSource).toContain("…")` against the route file's text, plus one loading-state render per
   page. They pass if the page merely mentions the identifier (dead import, unreachable branch, wrong
   prop) and they cannot observe the readback-to-render behaviour R8 is about; they also make cosmetic
   edits fail the suite.
2. `app/lib/latency-override.test.ts` — the bounds test builds its 5..30 range from the file's own
   hand-written `FIELDS` fixture and then validates the UI against it. It therefore proves the UI's
   arithmetic, not that the runtime publishes 5..30; a runtime publishing the private 3..1000 bounds
   (EI-7) would still pass.
3. `role-model-router/apps/runtime-host-bridge/test/scoring-strategy.test.ts` — "every canonical name maps
   to a plan and a weight profile" only asserts `typeof weights[metric] === "number"` for each metric; it
   passes with any numeric profile. The value-level presets are pinned by the neighbouring tests, so this
   one contributes only a type-shape check.

Honourable mention: `test/routing-latency-effective-metric.test.ts` — "the 10 000 ms default threshold is
respected" passes `maxDeltaMs: 10_000` explicitly, so despite its name it does not test the default (the
default is pinned in `run98-a40-latency-policy.test.ts`).

## Untested behaviour (ordered by risk)

1. **R7 paired-registry agreement** — no test in either repository compares the public read-side bounds to
   the private write-path registry; the values disagree today and the release-dependency recording is
   absent (EI-7).
2. **R2 ranking invariance** — no same-candidate-set test that two strategies produce different winners,
   and no test that a saved `latency` posture reaches `routingRequest.strategy`; the "strategy changes the
   recipe only" and "eligibility unchanged" criteria rest on the pre-existing core scorer and the live QA.
3. **R3 telemetry `selected_strategy`** — nothing asserts that the telemetry row carries the effective
   strategy for a decision that went through the ladder (the projection reads
   `plan.routingRequest.strategy`); the existing assertions are fixture values.
4. **R9 Effect-first and purity** — the import policy and the "no Effect.runPromise per request" rule are
   not test-asserted; evidence is a build log and review prose.
5. **R10 extension drill and version migration** — no temporary fifth preset/posture variant, no
   compile-time proof, no version-keyed migration.
6. **R6 `embedding` live end-to-end** — the shipped example is exercised through the config path and the
   live backend test, but the live pi-CLI matrix only drove `batch`.
7. **R8 page behaviour beyond the loading state** — no data-bearing render, no save-path interaction, and
   no test for the free-form config editor's canonicalization status message.
8. **R1 `weights.<metric>` rejection wording** — the metric-level failing path R1 asks the rejection to
   name is not asserted anywhere.
9. **R11 RED evidence for the S11 sqlite-memory repair** — see EI-5.

## Notes on the live QA evidence

- I read the phase-5 receipts directly: `p5-s3-pinned-hard.receipt.json` does carry
  `strategyResolution.strategy: "latency"` with `discarded {difficulty, quality}` and the pin behaviour, and
  `p5-s7-intelligent.receipt.json` does carry `source: "controller"` with the accepted directive — the
  artefacts support the S4 and S6 claims of `05-manual-qa.md`, and the S11 story matches `790da3e2`.
- The latency-override absence is recorded honestly (`outcome: "disabled"`, reason "measured-latency
  selection input is not authorized"), matching the requirement's instruction to record the absence.
- `05-manual-qa.md` is still `DRAFT` and untracked, and it is the only place R12's acceptance lives; it is
  not test-backed and cannot be re-derived from the run folder alone without the runtime (which this audit
  was forbidden to restart).
- The two prior review findings files exist and were read; the unresolved items there (F3/F8) match what I
  found independently: F3 is still open in the private registry, F8 (Effect deviation) is recorded for
  Phase 6, and the follow-up review's N1 is not actually green at HEAD (EI-1/EI-2).

## Reproduce

All logs are outside the run folder at `E:\tmp\run103-sp4\` (`core.log`, `sqlite-memory.log`, `ui.log`,
`bridge-focused.log`, `schema-tools.log` [verbatim brief command], `schema-tools-corrected.log`, `biome.log`,
`lint.log`, `index-f1-pin.log`), produced from
`D:\DEV\role-model\.worktrees\103-agent-strategy-and-scoring-strategy` on Node 24.11.0 / pnpm 10.6.5.
This audit wrote exactly one file inside the run folder (this one) and made no git, runtime or product-tree
mutation.
