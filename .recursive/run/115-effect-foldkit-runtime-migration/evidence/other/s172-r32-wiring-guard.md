# S172 R32 wiring now has a test that fails on revert - and the "E: only" roots are gone

## The gap the review proved

> "no test references operations-server with `createRetentionManager`; reverting the two lines to `new RetentionManager()` would stay green."

Correct. A behavioural test cannot easily reach that wiring (it is one branch inside a very large service), so the guard is a **source assertion**, scoped to the construction sites:

```
assert.match(source, /createRetentionManager\(\{ registry: STORAGE_REGISTRY, inMemory: true \}\)/)
assert.doesNotMatch(source, /new RetentionManager\(/)
assert.match(source, /createRetentionManager,/)   // the import
```

I verified the failure mode is what I claim by reverting the two lines in a scratch copy and watching the test go red - a source assertion that cannot be shown to fail is decoration.

## The deterministic Windows failure

The reviewer also said the R32 temp roots are `E:\`-only and would fail deterministically on a Linux runner. All four files now use `os.tmpdir()`:

| File | Change |
|---|---|
| `run115-r32-artifacts-boundary.test.mjs` | `E_ROOT` -> `TEMP_ROOT` (two sites, one of which I missed on the first pass and the suite caught) |
| `run115-r32-closed-domains.test.mjs` | same |
| `run115-r32-retention-manager.test.mjs` | same |

13/13 R32 tests pass.

## My own error in this round

I replaced `path.join(E_ROOT,` but one site used `path.join(E_ROOT, "run115-r32-artifacts-keyless-" + process.pid)` and was written across the same pattern - the replacement should have caught it. It did not, because that line was `path.join(E_ROOT, ...` with different spacing... actually it was identical, and the failure was `ReferenceError: E_ROOT is not defined` at line 40. The lesson is the same one as the imports: **after a rename, assert there are zero remaining references** - `(s.match(/E_ROOT/g)||[]).length === 0` - instead of trusting the replace.

## Outstanding from the review

- cross-channel refusal still needs both sides to be executables (URL/exe bypass);
- the rollback-failure behaviour change needs an addendum, not just a test.