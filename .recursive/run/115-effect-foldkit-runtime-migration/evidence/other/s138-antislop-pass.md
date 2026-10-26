# S138 R33 lint pass on the changed backend slices: 64 findings -> 0

R33 requires `anti_slop_lint` on every changed first-party slice, with findings fixed **or explicitly reviewed**, not blanket-disabled. I ran it properly for the first time this session, and the tool caught a real trap before it caught anything else.

## The trap: relative paths silently scan nothing

```
target: "role-model-router/apps/runtime-host-bridge/src/run-throttle.ts"  -> clean, filesScanned 0
target: "D:/DEV/.../src/run-throttle.ts"                                    -> findings, filesScanned 1
```

A probe file with `(): unknown` returned `clean` under a relative path and **2 findings** under an absolute one. Every earlier "clean" result I had was vacuous. Recorded so it cannot recur.

## Findings and dispositions

| File | Before | After | Disposition |
|---|---|---|---|
| `run-throttle.ts` | 2 | **0** | renamed `RunThrottleShape` -> `RunThrottle` |
| `readiness-gate.ts` | 2 | **0** | renamed `ReadinessGateShape` -> `ReadinessGate` |
| `benchmark-gate.ts` | 2 | **0** | renamed `BenchmarkGateShape` -> `BenchmarkGate` |
| `partial-shutdown.ts` | 1 | **0** | removed the `unknown`-parameter `asError` helper; narrow at each catch site |
| `host-runtime-scope.ts` | 1 | **0** | added a `SAFETY:` comment stating the checked invariant |
| `release-host-resources.ts` | 2 | **0** | dropped both `as` assertions by declaring typed arrays; `SAFETY:` on the remaining index read |
| `r27-composition.ts` | 1 | **0** | `SAFETY:` on the `tag as never` bridge |
| `composition-dag.ts` | 45 | **0** | renamed all 13 `*Shape` interfaces to `*Contract` (and the `MetadataCache` one), and typed cache values as a recursive `MetadataCacheValue` instead of `unknown` |

Renaming the 13 DAG interfaces touched `index.ts` (which re-exports `BootstrapShape` etc.) and `s21a-composition-dag.test.ts`. Mechanical, compiler-checked, and the behaviour tests did not change.

## The four scripts: explicit review, not silence

`verify-client-journeys.mjs` (2), `compare-release.mjs` (2), `smoke-host-source.mjs` (1) and `verify-packaged-candidate.mjs` (3) each report `no-runtime-typeof` on CLI-argument and `net` address narrowing (e.g. `typeof address === "object"`).

**Disposition: retained.** These are input-boundary guards in standalone Node scripts, not service boundaries - the rule's target. Each is covered by negative tests that prove the refusal path (missing input, operator port, occupied port, dirty state, manifest mismatch, both sides unreachable, self-comparison: 15 tests across `r39-scripts` and `s127-source-smoke`). Rewriting them to satisfy the rule would mean adding a schema dependency to a script whose whole point is to run with no build step, and would not make them safer.

## Verification

```
anti_slop_lint over the 8 changed backend modules: 0 findings
tsc: 0
R27 suites (s21a, s114-s120, s128, s130, s134): 42 passed
```