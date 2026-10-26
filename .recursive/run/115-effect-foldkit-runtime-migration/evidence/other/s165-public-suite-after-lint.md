# S165 Full public host suite after the lint-era source changes

```
Test Files  1 failed | 434 passed | 3 skipped (438)
     Tests  1 failed | 2677 passed | 5 skipped (2683)
  Duration  1963.59s (32.7 min)
```

The single failure is the **same classified pre-existing one**: `run105-review-advisory-safety.test.ts > refused larger admission leaves bounded prior real snapshot routable`, which reproduces at baseline `24678a66` and is a load-sensitive ordering test.

## Why this run was necessary

Since the last full public run (2,673/2,679 at round 111) the public source changed in ways a targeted suite would not catch:

- S138 renamed all 13 `*Shape` interfaces to `*Contract` (touching `index.ts` re-exports and `s21a`),
- replaced two type assertions with typed arrays and added `SAFETY:` comments,
- removed an `unknown`-parameter helper,
- typed the metadata cache values as a recursive `MetadataCacheValue` instead of `unknown`,
- and, earlier, moved five host resources onto Effect scopes.

Result: **+4 passing tests** (the new R27/R39 guards) and no new failures.

## Anti-slop re-check, post-change

```
composition-dag.ts   0 findings
run-throttle.ts      0 findings
host-runtime-scope.ts 0 findings
```

## What remains unproven in the public tree, stated plainly

- the stage-only packaged-runtime branch (needs a real Run 88 identity);
- browser-enforced CORS, TLS and screen readers (environment);
- the full R/D/C parity set at this HEAD: the sibling packages built and ran during the session, but a fresh D-versus-C comparison at `0.0.20-163-g6ed7ece9` has not been run since the R23/R32 work landed in the private tree (which does not enter the public package, but the claim should be re-made rather than inherited).