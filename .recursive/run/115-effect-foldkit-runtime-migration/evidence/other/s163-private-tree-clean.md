# S163 Private tree is clean again - and it builds without the dirty allowance

The private worktree had carried 16 dirty entries since the R32 slices landed. A clean tree is a release prerequisite (`build-runtime-distribution.mjs` refuses a dirty worktree unless `ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=1`), so I closed it out this round.

## What was in the tree, and what happened to it

| Entry | Disposition |
|---|---|
| `shared/retention/index.mjs` + `scripts/track-b/runtime-operations-server.mjs` + `tests/track-b/run115-r32-retention-manager.test.mjs` + s24j evidence | **committed** (`7b1c5616`) - the retention-manager boundary, with the operations service now constructing through `createRetentionManager({ registry, inMemory })` instead of `new RetentionManager()` |
| `tests/track-b/run115-r32-closed-domains.test.mjs` | committed - the 400 ms -> 2 s timeout fix from S144 |
| seven **regenerated** evidence JSONs (cloud-local lifecycles, run96 acceptance ledger, capacity/exclusion results) | **reverted** - these are test outputs, not source; committing regenerated artifacts would put run noise into the tree |

```
git status --porcelain --untracked-files=all  ->  0 entries
```

## Verified

**Clean-tree distribution build, no dirty allowance:**

```
{"status":"PASS","extensionCount":13,"sidecarSha256":"a3235d308f535d7b80801546213b23988f3135f1e3e894043bb7d8155794fb14"}
```

The sidecar digest differs from the earlier dirty build because the distribution binds the public source tree, which has moved - expected, and the reason a release build must be regenerated per public revision.

## Caveat I am not going to hide

The retention wiring (`createRetentionManager` in `runtime-operations-server.mjs`) has **no test that calls it directly**. 51 test files reference `createRuntimeRetentionService`, and their aggregate run shows only the known environment failures - but that is indirect evidence, not a targeted test. The manager boundary itself is covered 4/4 (factory validation, isolation, reopen, policy denial).

A targeted test for the service path is the next thing worth adding here, not a claim that the wiring is proven.

## State

- private tree: **clean**, distribution builds without allowances;
- public tree: clean (`git status` empty at the last check), host suite 2,673/2,679 with the one classified pre-existing failure;
- R23 burndown: **40** transactions, **1** reasoned `table_info` site.