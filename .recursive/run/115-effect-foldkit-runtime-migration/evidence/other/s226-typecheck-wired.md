# S226 Workspace typecheck: green once installed, now wired into CI

S224 concluded that the workspace `typecheck` task could not be adopted because it failed in this tree.
That conclusion was wrong in a specific way: the tree had never been installed, and the `effect` package
dist was stale (S225). With both fixed:

    pnpm exec turbo run typecheck --concurrency=4
    Tasks: 38 successful, 38 total      Time: 51.6s

Including the port app, which surfaces as its own `typecheck` task:

    @role-model-router/runtime-ui-next:typecheck: $ tsc --noEmit -p tsconfig.json   (exit 0)

## Wired in

    "typecheck": "pnpm exec turbo run typecheck --concurrency=4"
    "ci:build-test": "ci:build && typecheck && test:workspace"

So the ordering is: build (which produces the declarations consumers need) -> typecheck -> tests.
Running typecheck before the build would fail on exactly the missing-declaration error S225 found.

## The hazard that made this look impossible

`effect#build` has outputs `dist/**` and a turbo cache. A cache restore replayed a `dist` that
predated the root-declaration shim, so every consumer of `effect` typechecked against a package whose
`types` entry did not exist:

    dist/types/index.d.ts absent  -> core/protocol-routing: TS7016 "Could not find a declaration file for module effect"
    dist/types/index.d.ts present -> all 38 tasks pass

`turbo run build --filter=effect --force` regenerates it. The S225 guard (every published types entry
must exist) now fails loudly when a cache restore produces that state, instead of leaving consumers
to discover it one package at a time.

## What changed about earlier conclusions

Three "cannot verify here" statements from earlier rounds were really "the tree was never installed":

| Claim | Reality |
|---|---|
| workspace typecheck not adoptable (S224) | green in 51s once installed |
| turbo typecheck fails in provider-anthropic | it was the missing effect declarations |
| private suites blocked by environment | still unverified - not yet retried |

The third one is the open question: if installing fixes the public tree, the private track-b failures
from earlier rounds deserve a fresh run before being accepted as environmental.