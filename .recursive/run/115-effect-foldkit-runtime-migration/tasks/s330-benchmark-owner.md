# S330 — R27 Benchmark DAG owner (characterization before edits)

Regions: composition-dag.ts (Benchmark service + gate), src/benchmark-gate.ts (typed errors + cancellation handle), index.ts route 19692-19705 (202), runBenchmark impl 34205-34300 (void runner), benchmark-runner.ts request+loops (cancellation checks), cli drain registry (shutdown cancel), test/**.

Design: makeBenchmarkGate becomes the DAG gate construction (mode reject-overlap) wrapped with AbortController per run: begin(runId) -> {ok, signal, finish} | {ok:false, activeRunId}; cancel() aborts the in-flight signal. Index route begins before firing, returns 409 typed busy on overlap, passes the signal into runBenchmark -> runRoutingCapabilityBenchmark (runner checks signal and throws BenchmarkCancelledError). cli shutdown drain cancels the gate. 202 semantics preserved for accepted runs.
## Outcome (LANDED)

- makeBenchmarkGate is now the DAG construction: BenchmarkContract carries `gate: BenchmarkGateServiceContract`; benchmarkGate singleton (mode reject-overlap) wraps the Effect gate with an AbortController per run; typed BenchmarkBusyError / BenchmarkCancelledError; begin -> {ok, runId, signal, finish} | {ok:false, activeRunId}.
- Route: POST /api/role-model/benchmark/runs begins the gate, refuses overlap with 409 benchmark_already_running, keeps 202 for accepted runs, passes signal+runId to options.runBenchmark and finishes in finally.
- Runner: BenchmarkRunnerDependencies.signal; throwIfCancelled checks at start and the target/grading/case loop boundaries, throwing BenchmarkCancelledError.
- Shutdown: cli drain registry pushes a benchmark step calling benchmarkGate.cancel(\"shutdown\"), joining the bounded release-all phase.

Evidence: RED s330-red.log (pre-implementation import/behavior failures); GREEN s330-green.log 6 files / 34 tests; tsc exit 0. Hashes: composition-dag 6BDA4477..., benchmark-gate C4A004D7..., benchmark-runner 33EC87D6..., index 2AD79F0B..., cli 191561B0..., test F2097205.... Lint: DAG 162 {"no-service-constructor-imports":1,"no-unknown-returns":2,"require-safety-comment-for-type-assertion":159}; test CLEAN.
## S331 behavioral-test repair

1. Route behavior (real HTTP handler via startBridgeServer, minimal probe options): "route: first run accepted 202 with forwarded signal/runId, concurrent run 409, failure releases the slot" — first POST 202 with the captured runId and a real AbortSignal forwarded to runBenchmark; second concurrent POST 409 { error: benchmark_already_running, activeRunId = captured runId } (gate singleton identity); after the first run finishes the slot is free; a failing run returns 400 and still releases; the next run is accepted 202.
2. Runner behavior: "runner: a pre-aborted signal throws BenchmarkCancelledError at a loop boundary (no upstream call)" — real runRoutingCapabilityBenchmark invocation with an already-aborted AbortSignal; rejects with BenchmarkCancelledError and executeChatCompletions is never called (upstreamCalls 0).

RED s330-red2.log: 1 of 2 failed on first run — the runner test imported BenchmarkCancelledError from composition-dag (not re-exported there); after importing it from the owning benchmark-gate module both pass. The route behavioral test passed on the first run, i.e. no product behavior defect was exposed (tests-only repair; no product edits). GREEN s330-green2.log: 6 files / 31 tests; tsc exit 0. Test hash 4C59F851... (4682 B). Lint: test CLEAN (repo-relative target); product files unchanged.
