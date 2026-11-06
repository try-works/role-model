# S224 The workspace typecheck task exists but nothing runs it - and it cannot run here

## Fact 1: CI never invokes typecheck

    turbo.json tasks: build, test, test:critical, test:ci, test:critical:ci, test:router:ci, typecheck, ...
    ci:quality  = lint && schemas:validate
    ci:build-test = ci:build && test:workspace
    test:workspace = test:release-workflows && turbo run test ...

`typecheck` is declared as a task and **referenced by no script and no workflow step**. So a type error
outside `runtime-ui-next` (whose test script I added tsc to in S223) can reach CI unnoticed.

## Fact 2: it cannot be run in this worktree as-is

    turbo run typecheck --filter=@role-model-router/runtime-ui-next --filter=@role-model-router/runtime-host-bridge
    -> Tasks: 23 successful, 30 total; Failed: @role-model-router/provider-anthropic#build
         route-decision-boundary.ts(49,41): error TS2339: Property "use" does not exist on type "typeof RouteDecisionProducer"
         Try npm i --save-dev @types/effect ...

The `effect` package resolves to nothing here:

    role-model-router/packages/effect/dist       578 files  (built)
    node_modules/effect                          MISSING

This tree has never had its workspace dependencies installed (the same fact that made the earlier
"no dependencies installed in new trees" baseline note true). So the failure is an **environment gap,**
not evidence that provider-anthropic is broken. Recording it as such rather than filing it as a bug.

## What this means for the run

| Scope | Typecheck status |
|---|---|
| `runtime-ui-next` (the port) | **enforced** in `pnpm run test`: `tsc --noEmit && vitest && node --test` |
| everything else | unenforced by CI; unverifiable in this worktree |

## What I am not doing

Adding `turbo run typecheck` to `ci:quality` blindly: it would either fail on this environment or, if it
passes upstream, needs a full install plus a green baseline that I cannot produce from here. The honest
next step is a CI dispatch (the one the R39 advisory steps already need) to learn whether workspace
typecheck is green there - then wire it, or fix what it finds.