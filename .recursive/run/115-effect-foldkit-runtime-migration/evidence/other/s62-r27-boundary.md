# S62 R27 slice 2: blocked at a real boundary (correct refusal)

The worker stopped instead of leaving the host red, and the reason is a genuine architectural fact worth recording.

## What it established

- `startBridgeServer` owns **only** the HTTP listener: `createServer` `index.ts:20697`, `listen` `:20737`, `close` `:20741`.
- The **runtime bridge backend is created in `cli.ts:9322`**, before and outside `startBridgeServer`.
- `StartBridgeServerOptions` carries bound backend methods, not a backend resource with an acquire/release pair.
- Therefore "release the backend on failed listen / on close" **cannot** be implemented inside `startBridgeServer` without changing the CLI composition root and the lifecycle ownership.

Wiring the listener alone would be another scaffold, and inventing an optional backend hook without the CLI is the same class of fake seam the review already rejected. Stopping was correct.

## State after this slice

- Host source **unchanged**; host `tsc` 0.
- Inventory retained (`s60a-tdd.json`); `r27-composition.ts` and its 3 toy-graph tests retained, still **unwired**.
- `index.test.ts` not run, because there is nothing to validate - and no RED logs, because no behaviour changed. Not claimed.

## The next slice this implies (needs its own review)

A composition root in `cli.ts` that:

1. builds `backend` and `server` through two `managedLayer`s;
2. passes only scoped handles to the CLI long-lived holders;
3. closes the **scope** instead of calling `server.close` directly;
4. keeps `startBridgeServer`'s signature unchanged so the 218-test file still describes the same contract.

That is a real ownership change to the composition root, so it gets a design review before the 218-test file is touched. A red host remains worse than an unwired graph.
