# S153 Event-log retain/rollbackRetention converted; burndown at 49

Two of event-log's three hand-rolled transactions now delegate to `withSqlTransaction`; the third (`append`, line 175) is deliberately left alone.

## Why the third one is different

`append` commits **and then** does post-commit work - idempotency readback and `#pruneAtWatermark` - whose failures must surface with their own cause and must **not** trigger a rollback of a closed transaction (the comment at `:203-205` records exactly that). Wrapping the whole body in `withSqlTransaction` would move the commit boundary and change that behaviour. It needs its own design pass, not a mechanical conversion.

## The two converted sites

`retain` and `rollbackRetention` both followed BEGIN -> archive/restore work -> COMMIT -> return, with `catch { throw this.#recoverAfterFailure(error) }`.

The conversion is safe **because `#recoverAfterFailure` is already idempotent about rollback**: it checks `database.isTransaction` before attempting `ROLLBACK` (twice), and if the connection is clean it just returns the original cause. After the helper rolls back, that path is a no-op - and if the helper's rollback had failed, the retry logic still runs. Behaviour is preserved and the recovery semantics are unchanged.

## Verification

| Suite | Result |
|---|---|
| `*event-log*` tests (2 files) | **10/10** |
| wider `*event*` tests (4 files) | **15/15** |
| transaction inventory | **2/2**, **49 sites** |

## R23 burndown

| Round | Converted | Inventory |
|---|---|---|
| 125 | 4 | 21 booked (undercounted) |
| 127 | 5 | 53 |
| 129 | 7 | 51 |
| **130** | **9** | **49** |

Two rounds, five conversions, and the inventory has moved for the second time. The remaining 49 are concentrated in `evaluation-core` (15) and `artifact-store` (12), which need the same care as `append`: several are commit-then-work shapes rather than plain BEGIN/work/COMMIT.