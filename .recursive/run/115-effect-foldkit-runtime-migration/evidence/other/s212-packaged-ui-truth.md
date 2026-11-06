# S212 The packaged UI now carries the fixes - and my admission change crashed it

Two things this round, in the order they happened.

## 1. The package was shipping an OLDER UI than the source build

    package build/client/assets/main.js  2,661,513 bytes
    source  dist/client/assets/main.js  2,663,155 bytes

Every UI fix from S175-S209 lived only in the locally built `dist/client`. Passing
`--static-root <worktree>/dist/client` to the gate had been testing code that a release would not ship.

After rebuilding the private distribution and repackaging:

    package main.js == source main.js  (byte-identical, sha match)
    contains 'configuredModels.includes' and 'targetField'  -> yes

## 2. Gating the packaged client found a crash I had just introduced

    FAIL /control/endpoints - no [data-route] section rendered; application crash banner
        Cannot read properties of undefined (reading 'label')

Cause: in S210 I wired admission readbacks with

    readReadback({ key: "providers", token })

but `providers` is a **control** key, not a readback key. The readback spec lookup returned
undefined and the shell crashed. It only appeared now because the earlier check ran against the
older bundle.

Reverted: `/control/endpoints` renders again (3 rows, no crash), and 20/20 routes pass with focus.

## Verified on the PACKAGED client (not the worktree)

    PASS ui css / ui bundle / ui theme boot / chat completion / expected model
    PASS studio run: clicked -> raw:success
    {"routes":20,"failures":0,"focus":true}
    gate exit=0

with `--static-root role-model-router/dist/release/win32-x64/build/client`, i.e. the bytes a release
would actually ship.

## The lesson, stated plainly

I had been treating the worktree build as the artefact under test. It is not: the package copies the
UI at distribution-build time. **A gate that points at the worktree can pass while the package ships
something else** - and that is exactly what happened for several rounds.