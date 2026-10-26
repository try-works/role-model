# S239 The UI identity guard is now a tested function, not inline gate code

The gate refuses a static root that is not byte-identical to the UI the package ships (S212/S213). That
comparison was inline, so the only way to exercise it was to run the whole gate against real binaries -
which is why S213 could only be proven by appending a byte to a real package.

## Extracted

`scripts/runtime/ui-identity.mjs`

    listFiles(root) -> string[]
    staticRootIdentity({ packageClient, staticRoot }) -> { differences: string[] }

and `verify-packaged-candidate.mjs` calls it. Behaviour unchanged, verified against the real gate:

    append one byte to the worktree client
    -> FAIL ui identity: the static root is not the bytes this package ships (assets/main.js differs)
    -> exit=2

## Tests (3/3)

| Test | Asserts |
|---|---|
| identical trees | no differences |
| one changed byte | `["assets/main.js differs"]` |
| extra file on either side | `["file lists differ"]` |

They use two temp directories, so they run in milliseconds and cannot be affected by build state.

## Wired into CI

`test:release-workflows` -> **76/76**.

## What is still untested in the harnesses

| Script | Coverage |
|---|---|
| `compare-release.mjs` | 5 tests (S238) - classifier, identity flags, exit codes |
| `ui-identity` (gate) | 3 tests (S239) |
| `audit-rendered-ui.mjs` | **none** - the check logic is inline and browser-driven |
| `verify-packaged-candidate.mjs` | **none** end-to-end; only its identity piece |
| `verify-client-journeys.mjs` | **none** |

The audit is the next candidate: its rules (contrast computation, naming heuristics, overflow detection)
are pure functions trapped inside a page-evaluated string. Extracting them would let the rules be tested
against fixtures instead of trusting the browser run.