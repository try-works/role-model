# S135 Lead verification of the private R32 slice (retention manager boundary)

The worker left WIP in the **private** worktree for R32. My job is to verify it rather than take the claim, so I ran and read it.

## What I ran

```
node --test tests/track-b/run115-r32-retention-manager.test.mjs      # private worktree
tests 4 | pass 4 | fail 0 | duration_ms 208
```

Cases: the factory fails loudly without dependencies; two managers with different registries and stores are isolated; the same inputs reopen the same state; a policy denial still refuses the write through the manager path.

## Why it is not self-fulfilling

- The test imports `createRetentionManager` from `shared/retention/index.mjs`, and **that export did not exist before this change** (`git diff` shows the whole factory added at the end of the file) - so the RED state is an import/undefined failure, not an assertion tweak.
- The behavioural diff is real, not cosmetic: the constructor gained an `authority` parameter, a private `#assertWriteAllowed` replaces the module-global `assertStorageWriteAllowed` on the write paths, and a new `createRetentionManager` composes the registry + store + authority.
- The worker left four RED logs (`s24j-red-m1-missing-registry.log`, `-m2-authority-ignored`, `-m3-shared-manager`, `-m4-drop-store`) plus `s24j-retention-manager-tdd.json` in the private run evidence.

## What this does NOT establish

It does not move R32 to verified. R32 is "private composition B9": closed private domain Layers, authenticated DTO/version/capability/readiness with bounded joins, scoped processes/stores, cross-repo capture/queue/projection, child-process scope with readline ready protocol/ephemeral auth/timeouts, and post-acquire endpoint rejection with partial-startup release. The retention manager boundary is **one** of those, and the rest are untouched.

So: one slice verified by the lead, requirement unchanged at blocked.

## Note on the private tree

The private worktree is **dirty** with this WIP (modified `shared/retention/index.mjs`, `scripts/track-b/runtime-operations-server.mjs`, the run96 acceptance ledger, and untracked test/evidence files). That is why the pair-distribution build for the public repackage needed `ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=1` this session - and why a release build must not run from that tree until the WIP is committed or stashed.