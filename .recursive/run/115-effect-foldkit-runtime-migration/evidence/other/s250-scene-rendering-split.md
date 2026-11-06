# S250 Phase 1: the rendering half of the control test now runs through scene

First real conversion after the S249 refinement: separate **rendering** assertions from **wiring**
assertions instead of converting files wholesale.

## `test/s250-control-rendering-scene.test.ts` (3/3)

| State | Asserts |
|---|---|
| `actionStatus: "pending"` | the button reads `Dispatching…` |
| `actionStatus: "ok"` | `Providers action completed.` is painted |
| `actionStatus: "error"` | `Providers action failed: HTTP 500` is painted |

Each model is built with the schema and rendered by the **real** `view` with the **real** `update` passed to
`scene` - no `mountShell`, no `element.click()`, no happy-dom event path.

## Mutation proof

Changing the pending label in `control-view.ts` from `Dispatching…` to `Working…`:

    x control action rendering > pending shows the in-flight label and disables the action
    tests 1 failed | 2 passed (3)

Restored -> 3/3. The test measures the rendered output, not the source shape.

## What did NOT change

`s26k-control.test.ts` keeps its three clicks and its dispatch-count assertion. Per S249 that is a wiring
test: scene resolves Commands instead of executing them, so converting it would replace "the client was
called once" with "a Command was requested". The click budget therefore stays at 30 for now - which is the
ratchet behaving as designed, not a failure.

## Suite state

    app suite 301 tests (298 + 3) · invariants 20/20 · tsc in the test script

## Next

- Same split for `s46a-studio` (7 clicks): its rendering assertions are scene-shaped; its fetch assertions
  stay in the DOM test.
- Then the dispatch-count helper: call the update twice directly and keep the one-dispatch fact without a
  click. Only that replacement may lower the budget.