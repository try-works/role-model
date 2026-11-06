# S162 Corrected private baseline: 2882/2926, and two of the 38 were mine again

After the knowledge-store crash fix I re-ran the whole private `tests/track-b` suite (concurrency 4):

```
ℹ tests 2926 | pass 2882 | fail 38 | skipped 6
```

## The failure sets, compared against the pre-fix baseline

| | Now | Earlier (S147) |
|---|---|---|
| unique failing names | 39 | 39 |

Only-in-now (3):

```
✖ R23: no unallowlisted hand-rolled transaction exists     <- inventory stale after S161 conversions
✖ R23: the inventory has no stale entries                 <- same cause
✖ run169 a write waits for a competing lock instead of failing   <- passes in isolation
```

The two inventory failures are **my own doing**: I regenerated the schema inventory after S161 but not the transaction inventory, so line numbers had shifted and the list was both stale and incomplete. Regenerated (40 sites) and both tests pass again.

`run169` passes on its own; it is a lock-timing test under concurrency 4.

## What this corrects from S147

S147 claimed 38 failures with "four sampled, all environmental or flaky". That baseline was taken while knowledge-store could not be constructed, and two of the failures were my stale inventory. The honest version:

- the suite is **not green** in this environment;
- a portion of its failures are environmental (python/uv bridge, unbuilt distribution), a portion are concurrency-sensitive (lock timing), and a portion have been **mine**;
- after removing mine, the count is 36, and I have not individually proven the other 36.

## Standing rule I am adding

Any conversion that changes **line numbers or file contents** must regenerate *both* inventories and run *both* inventory tests before any "suite baseline" number is quoted. A stale inventory turns my own guard into a failing test, which is noise on top of whatever else is wrong.

## Burndown

| Burndown | Remaining |
|---|---|
| hand-rolled transactions | 40 |
| inline `table_info` | 1 (reasoned) |