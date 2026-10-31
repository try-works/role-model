# S599 - R27 production acquisition closed (final HOLD B) (2026-10-31)

## What changed (commit fbab6294)
- cli.ts acquires the closed DAG EAGERLY at startup: Layer.buildWithScope(composeR27HostLayer({ events, readiness }), heldScope) is awaited before any imperative resource exists. The acquire effects run in closed order in production; a failed acquisition rejects and aborts host startup.
- Readiness is marked ONLY by the DAG host leaf (acquire:host). completeCliStartupReadiness no longer calls markReady; it only flips the observable bootstrap state.
- The r27-dag shutdown drain closes the held scope, releasing the DAG nodes in reverse order.
- New CLI-level acquisition test run115-s598-cli-acquisition.test.ts mirrors the production sequence: closed-order acquire, leaf-marked ready, reverse release, and a startup-aborting failure (rejects with "r27 layer acquisition failed: benchmarks"). 7/7 together with s593.

## Verification at HEAD fbab6294
- host-bridge tsc 0; s598 3/3 + s593 4/4 + s324 green; UI suite 833/833, tsc 0.
- Packaged artifact 0.0.20-453-gfbab6294: validate-packaging PASS, verify PASS (the packaged CLI boots with the eager DAG acquisition - the production caller proof), audit-rendered-ui 20/20, dialog a11y PASS.
- compare-release vs preserved 0.0.20: 6 same / 2 additive-shape / 1 environment-state / 0 different.

## Remaining
- Final re-review verdict from s9b-reviewer (dispatched).
- Recorded follow-up (not owner-gated): fold the imperative resource builders into the DAG nodes themselves (the DAG currently owns acquisition ORDER and readiness; individual resources are still built imperatively).
- Owner-gated (unchanged, excluded): R15 live provider, R16 seeding approval, R39-live CI dispatch/toggle, stage/prod Run88 identity, pixel visual-delta sign-off. E1/E2 deferred by owner.
