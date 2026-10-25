# S1a controller review repair TDD addendum

Original s1a-tdd.json and28test hashes are historical implementer receipt, not current final. Independent review01 HOLD F1/F2/F3/F4 accepted, logs/current test changed while review in flight so stale review not reused.

- Added3controller regression tests before repair: same-step independent read variants reorder/multiplicity, dependent read before mutation, mutation before prerequisite read. evidence/logs/s1a-review-regressions-red.log:3failed/28passed31total assertion-level.
- Minimal exact-first reservation+unmatched reporting and internal predecessor order: initial GREEN attempt30/31 mismatch diagnostic label, preserved prior expected label; evidence/logs/s1a-review-regressions-green2.log31/31 and tsc0.
- Added dangling/self/cycle/explicit root tests: evidence/logs/s1a-dependency-red.log1failed34passed35, undeclared identicalghost incorrectly returned[]. Existing self/cycle correctly failed parity after prior repair; recorded GREEN characterization not falseRED.
- Explicit reserved external root $scenario, every other predecessor earlier in same capture; no step may use reserved root. Invalid reference input cannot pass equal capture, no raw payload findings. Changed old root-action fixture to documentedreservedroot; no expected mismatch weaken. evidence/logs/s1a-dependency-green.log35/35; directsource tsc0.
- Removed obsolete groupByStep afterGREEN; evidence/logs/s1a-controller-refactor.log35/35 and tsc0. anti_slop_lint tool absolute package target effect:true clean3files16rules. Current final independent review remains required.

Scope remains small pure comparator, no Effect used because pure deterministic kernel, no I/O/lifetime/retry to wrap. No full parity/live/runner/backend/client acceptance.
