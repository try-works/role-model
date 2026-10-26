# S222 The runtime-config PUT is now pinned - the last hand-only leg

The chain for the config save was: transitions (S220, automated), command (S221, automated), network
request (hand only). This closes it without a browser.

## test/s222-runtime-config-client.test.ts (2/2)

| Test | Asserts |
|---|---|
| save issues exactly one PUT | method PUT, path /api/role-model/runtime/config, content-type application/json, bearer token, body is the config, status and body returned |
| read returns the status unchanged | a 400 reaches the caller instead of looking like success |

## Falsifiability, both directions

    method PUT -> POST              x save issues exactly one PUT
    status response.status -> 200   x read returns the status unchanged

Restored, both green.

## Why the second test matters

read is the path the editor uses to load the file. If it flattened the status to 200, a rejected read
would render as an empty editor with no error - the same class as the not-run classification fix in
compare-release.

## Coverage of the save chain now

| Leg | Evidence |
|---|---|
| text change -> editing | S220 test (falsifiable) |
| save -> confirming + diff | S220/S221 tests |
| confirming -> one command | S221 test (falsifiable) |
| command -> PUT request | S222 test (falsifiable, both assertions) |
| PUT -> applied -> re-read | by hand, S219 |

## Full UI surface

    ui vitest        297/297  (31 files)
    invariants        17/17