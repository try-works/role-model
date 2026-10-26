# S171 The narrowed identity strip immediately found a "difference" that was environmental - and a crash

The reviewer wrote that stripping the generic keys `endpoint` and `path` from `runtime/summary` can hide a real configuration difference. They were right, so I narrowed the strip to identity fields plus **per-side runtime locations only**.

The first comparison after that change reported:

```
different /api/role-model/runtime/summary      (D 0.0.20-1 vs C 0.0.20-163)
```

## What was actually different

Adding a value-diff printer answered it instead of guessing:

```
processMetrics.rssBytes (143523840 -> 144666624)
unifiedConfig.path ("...compare-left-9c1bCy\state\runtime-config.yaml" -> "...compare-right-Yyx8r2\state\runtime-config.yaml")
operatorIntent.path ("...compare-left-...\operator-intent.json" -> "...compare-right-...\operator-intent.json")
configuredMembershipReconciliation.reconciledAt ("...57.058Z" -> "...57.100Z")
```

Four values, all environmental: a memory reading, two per-side state paths, a timestamp. **No migration difference.**

## The fix is a classification, not a wider strip

Stripping whole subtrees hid the question; the tool now classifies **per leaf**:

- a value under a path-like key that differs only by the side's own state directory is environmental;
- volatile keys (`rssBytes`, `reconciledAt`, `startedAt`, ...) are environmental;
- a leftover key-set difference is `shape-delta` (version skew), printed with the added/removed keys;
- a value difference on a shared key is `different` and fails, printed as `value-diff <path> (left -> right)`.

Result on D vs C:

```
{"same":7,"environment-state":2}   exit 0
```

## Two more defects found while testing this

1. **The comparison crashed after finishing** in URL mode: `process.exit` while undici sockets were closing trips a libuv assertion on Windows (`0xC0000409`), so a completed comparison reported a crash. Post-fetch exits now set `process.exitCode` and let the loop drain.
2. **My first test could never pass**: it hosted the fixture servers in the same process as a **synchronous** spawn, so the servers could not answer while the parent blocked. Moved them into a child process. A test that deadlocks by construction is not a test of the code.

## New tests (17/17 in `r39-scripts.test.ts`)

- URL-pair classification: same, `environment-state`, and a real value difference with `value-diff` output;
- same-port refusal;
- cross-channel refusal;
- no forced `--scope-id` in either verifier;
- health-failure path throws instead of exiting past the cleanup.

## Also in this round

- fresh per-run temporary state directories (a stale fixed directory can no longer block a package);
- the right child is killed when the left is not ready;
- `IDENTITY` no longer strips `endpoint`/`path` wholesale.

## Still outstanding

- cross-channel refusal still requires both sides to be executables with adjacent manifests (URL/exe bypasses it);
- the R32 operations-server wiring has no test that would fail if reverted;
- the rollback-failure behaviour change belongs in an addendum.