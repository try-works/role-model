# S220 The config editor transitions are pinned at the message level (and can fail)

S219 removed a DOM journey that could not reach the confirm state, and left the follow-up: pin the
transition at the message level instead. Done.

## `test/s220-runtime-config-transitions.test.ts` (3/3)

| Test | Pins |
|---|---|
| a text change moves the editor into `editing` with the typed text | the transition the DOM journey could not produce |
| invalid JSON reports `invalid` **with a message** | the editor never claims to save something it cannot parse |
| a save with no top-level change does not enter `confirming` | no phantom review panel |

## Falsifiability

Changing `RuntimeConfigTextChanged` to write `status: "applied"` instead of `"editing"`:

    x a text change moves the editor into editing with the typed text
    Tests  1 failed | 2 passed (3)

Restored -> 3 passed. So the test measures the transition, not the file's shape.

## How the model is built

The test assembles a real `Model` from the same pieces `init` uses (`emptyControls`, `idleDiagnostics`,
`idleObservability`, `emptyReadbacks`, `initialRuntimeRefreshState`, route `Runtime`) and decodes it
with the schema. My first two attempts failed (`Expected object`, then `update.RuntimeConfigTextChanged
is not a function`) because `createUpdate` returns a **reducer** `(model, message)`, not a message map -
worth recording, since the shape is not obvious from the call site.

## Full UI surface after the change

    ui vitest        292/292  (29 files, +3 here)
    invariants        17/17

## Still open

- the confirm-to-PUT leg is proven by hand (S219) but not by an automated journey;
- unknown-key handling on PUT (owner decision).