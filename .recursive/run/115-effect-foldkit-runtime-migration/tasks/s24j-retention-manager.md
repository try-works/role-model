# S24j close the retention manager domain (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
The last domain from the S24a inventory: the retention manager is constructed inline and shares the module registry without its own boundary. The write-authority factory exists; the MANAGER does not.

## Requirements
1. Give the retention manager an explicit factory taking the registry and its policy/store dependencies, failing loudly without them - no inline construction at the composition root and no implicit module registry.
2. Keep behaviour identical where the same inputs are passed; re-run the accepted retention suites unchanged.
3. Prove: missing dependency throws; two managers with different registries/policies are isolated; the same inputs reopen the same state; a policy denial still refuses the write through the manager path.
4. State what R32 still needs to finish the domain (Layer, capability negotiation).

## Files
`shared/retention/index.mjs` (manager factory), the construction site, one new test under `tests/track-b/`, evidence in the private run dir.

No public changes, no commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## TDD
RED per proof. Report factory shape, counts, REDs, what remains.