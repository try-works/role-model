# S249 Where scene can and cannot replace the click tests (refines Phase 1)

Attempting the first mechanical conversions exposed a boundary the plan did not draw.

## The distinction

| Test kind | Example | Can scene replace it? |
|---|---|---|
| asserts **rendering** from a model state | s26k pending/success text, s245 nav links | **yes** - scene renders the real view |
| asserts **wiring**: a DOM click reaches a handler and a real client is called | diagnostics `refresh.click()` -> `readerCalls` toHaveLength(2), s76a PUT body | **no** - scene resolves Commands instead of executing them, so the client call is exactly what would be simulated away |

Concretely, `diagnostics.test.ts` clicks refresh and then asserts `readerCalls` grew by one. In a scene
test that assertion becomes "a RefreshDiagnostics command was requested", which is a weaker fact than "the
real reader was invoked". The same applies to `s76a` (PUT body/409 handling) and `s26k` (dispatch count).

## What this changes in the plan

The plan treated "convert the file" as the unit of work. The right unit is the **assertion**:

1. Split a mixed file: rendering assertions move to `scene`; wiring assertions stay in the DOM test.
2. A file's click count only falls when its wiring assertions are themselves replaced by something better -
   for `s76a` that is the client-level PUT test (s222), for `s26k` it is a dispatch-counting helper that does
   not need a click.
3. Where neither is possible, the DOM test stays and the budget keeps its count - that is the ratchet working
   as intended, not a failure to convert.

## Consequence for the budget

The 30 clicks will not fall to 5 through file conversion alone. Realistic target after Phase 1: rendering
assertions move (roughly 10-12 sites), wiring assertions stay with a written reason. The invariant already
allows that: a recorded count may remain, but it cannot grow.

## What I did not do this round

No conversion was committed. I opened the two smallest candidates (`diagnostics` 1 click, `s76a` 11) and
found both are wiring tests, so converting them would have replaced a real assertion with a weaker one.
Stopping and recording that is the plan's own stop rule.