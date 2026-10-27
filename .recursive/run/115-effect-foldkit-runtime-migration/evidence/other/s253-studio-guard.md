# S253 The Studio double-dispatch guard moves to the update; budget 28 -> 27

## What moved

`test/s253-studio-dispatch-guard.test.ts` (2/2):

| Request | Asserts |
|---|---|
| one `StudioRunRequested` | exactly one command emitted, status `loading` |
| a second while loading | **no** second command, loading token unchanged |

It replaces the click-driven half of the final s46a-studio test. That test keeps its rendering assertion (a
real chat response paints `hello`), so the file goes 7 -> 6 clicks and the total 28 -> 27.

## My own arithmetic error, caught by the ratchet

I lowered the budget to 5 by assuming both clicks in the double-dispatch test would go. The replacement still
clicks **once** to produce the success response, so the real count was 6. The invariant failed with

    actual: [ [ "s46a-studio.test.ts", 6 ] ]

and I corrected the number to the measured value rather than deleting the extra click. This is the second time
the ratchet has caught a bookkeeping mistake instead of a behavioural one - which is what it is for.

## State

    app suite 304 tests · invariants 20/20 · click budget 27 (was 30 at S248)

## What is left in s46a

Six clicks, all producing state that other tests do not:
- five tab selections (`data-studio-tab`), asserting the exact method/path/body each tab dispatches,
- one Run click, asserting the rendered success.

Those tab assertions are **wiring**: they check that the tab maps to the right request. A scene conversion
would replace them with "the tab set the tab field". Per S249 they stay until a client-level test can prove
the request shape - the same route s222 took for the runtime-config PUT.

## Next honest decrement

Add a studio-client test asserting the per-tab method/path/body (client level, no DOM). Then the five tab
clicks can go, taking the budget 27 -> 22 in one justified step rather than five cosmetic ones.