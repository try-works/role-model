# S132 Full host suite after the R27 rewiring slices

```
Test Files  1 failed | 433 passed | 3 skipped (437)
     Tests  1 failed | 2673 passed | 5 skipped (2679)
  Duration  1767.67s (29.5 min)
```

The single failure is the **same pre-existing** one: `run105-review-advisory-safety.test.ts > refused larger admission leaves bounded prior real snapshot routable`, which reproduces at baseline `24678a66` and is unrelated to this work.

Compared with the run before the slices (2,663 passed / 2,669), the tree gained **10 passing tests and 3 files** (s127 source smoke, s128 scope-owned server, s130 scope-ownership guard) with no new failures - after `cli.ts` changed the ownership of the server, the non-packaged backend, and the packaged runtime acquisition.

## Verification matrix for the three slices, final for this round

| Slice | Verified by | Strength |
|---|---|---|
| server (S128) | source smoke PASS 4/4 + full suite | runtime |
| non-packaged backend (S129) | SEA binary `cfdcc1ae…` (0.0.20-125-gccd934db), packaged candidate gate PASS 8/8 | runtime, shipped binary |
| packaged runtime (S130) | `tsc` only | **weak** - stage-only branch |

## Why S130 cannot be closed without a stage build

`cli.ts:12261` gates the packaged branch on `packagedReleaseId = run88StageIdentity?.releaseId`, and `package-sea` refuses `stage`/`production` packaging without a `sha256:<64 hex>` Run 88 release identity. Producing one locally would mean inventing a release identity - a fabricated artifact identity of exactly the kind this run has spent its time refusing. So it stays type-checked only, and R27 stays blocked.

## What this means for R27

Ownership has moved for three of five resources, with the release order and single-close semantics unchanged, and the guard (s130) prevents silent reversion. What R27 still lacks is precisely what it lacked before the slices, minus three resources: a **closed composition Layer** providing them together, and runtime verification of the packaged branch.