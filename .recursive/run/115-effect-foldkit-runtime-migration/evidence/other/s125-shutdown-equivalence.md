# S125 Shutdown equivalence after the S123/S124 changes

The release path changed, so the question is whether a real host shuts down any differently. Answer: it does not, and the reason is worth recording precisely.

## Registered set per branch (unchanged)

| Branch | Registered kinds |
|---|---|
| packaged Track B | `server`, `packagedRuntime`, `extensionRuntimeOwner`, `extensionRuntime` |
| non-packaged | `server`, `backend`, `extensionRuntimeOwner`, `extensionRuntime` |

`packagedRuntime` and `backend` are registered in an **if/else** (`cli.ts:12523` vs `:12532`), so only one is ever present. The old `else` in `releaseHostResources` therefore never skipped a real resource for those two.

## What changed at shutdown

| Step | Before | After |
|---|---|---|
| server | closed | closed |
| packaged / backend | one of them closed | **both attempted**, only one present |
| extensionRuntimeOwner | closed | closed |
| extensionRuntime | **skipped** (the `else`) | attempted, and its closer is the owner's **memoized** close -> no second runtime close |

So the only behavioural change is one extra **no-op** call. The resource that was genuinely skipped before - `extensionRuntime` - is now covered, and S124 proves it closes exactly once.

## Verification running

The full host suite is running in the background (`E:/rm-tmp/host-suite-r104.log`); the last full run was 2,620/2,626 with one classified pre-existing failure. I will report the new numbers rather than assume them.

## Why this matters more than the code change

S123/S124 were about a shutdown path nothing in the suite exercised end to end: the tests used hand-built resource maps, not the CLI's real registration. The equivalence argument above is what connects them, and it is an argument, not a measurement - which is why the suite is re-running.