# S7b wire the route-decision producer into the real caller (public, R25)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R25. Effect is now vendored 4.0.6.

## Starting point
`role-model-router/packages/core/src/route-decision-producer.ts` exists and is staged: it exposes the deterministic decision through an Effect service, with six equality tests. Its header names the intended caller: `role-model-router/packages/protocol-routing/src/index.ts`, which imports `routeRequest` at line 17 and is the sole non-test call site (`routeRuntimeRequest`).

## Required contract
1. `routeRuntimeRequest` obtains its decision through the producer's Effect service instead of calling the kernel directly, at a single explicit boundary.
2. The public result of `routeRuntimeRequest` is unchanged for every input the package already covers: same fields, same values, same wire reason code/detail, same empty-pool success with an empty chosen endpoint id.
3. The synchronous boundary must be explicit and documented: where the Effect is run and with which Layer. No ambient provider, no global mutable state, no per-call Layer allocation if it is avoidable.
4. Existing tests of protocol-routing must pass unchanged. Do not rewrite their expectations.
5. Add a test that proves the caller goes through the producer, not the kernel: for example, provide a producer Layer whose implementation is observably a wrapper (a counting decorator) and assert the counter increments for a real `routeRuntimeRequest` call, with the same decision as the kernel for the same input. A test that only re-asserts equal output cannot prove the wiring.

## Files you may write
- `role-model-router/packages/protocol-routing/src/index.ts`
- at most one new small module under `role-model-router/packages/protocol-routing/src/` if the Layer needs a home
- one new or extended test file under `role-model-router/packages/protocol-routing/test/`
- run evidence `evidence/logs/s7b-*` and `evidence/other/s7b-tdd.json`

Nothing else: do not touch core's producer, other packages, root, lockfile, or the private repo.

## Strict TDD
Write the wiring test first so it fails because the caller still bypasses the producer; capture that RED, then change the caller, then GREEN. Record the exact RED message: it must show the bypass, not a missing module.

## Rules
- No installs, no commits, no subagents, no providers.
- Read the vendored 4.0.6 source for any Effect API you use, and cite file and line in the report; if an API is not clearly supported, stop and report.
Report: the files changed, the RED message, GREEN counts, the existing protocol-routing suite counts, tsconfig typecheck exit, the Layer/run boundary you chose and why, sha256 of changed files, and anything unverified.
