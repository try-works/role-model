# S304 — Track-B manifest `runtimeUi` dead-binding decision (Lead-owned staging flag)

## Verified facts (S284 independent review + S293 Lead re-check)

- Track-B manifest `runtimeUi.root = "runtime-ui"` with 99 assets and tree hash `1ee721877f961e80233de3dea934d8f87e8c990fc323520630fe1618e59b02ee` (S293 manifest).
- The SEA package carries NO `track-b-runtime/runtime-ui` directory (re-verified on the S293 package: path absent).
- The SEA lane's UI authority is the `build/client` closure (21 files, S293 tree sha256 `57405a7b5978a8ede35b5de60d229c0d88f49f774a34c0d445933e87541da036`), bound by `package-sea.ts` and resolved by `resolveStandaloneStaticRoot` (index.ts:35346-35377) and `launch-packaged-runtime.mjs:283-285`.
- The `runtime-ui` tree is staged and verified ONLY for the non-SEA private distribution lane (private `runtime-ui-distribution.mjs:39-41`, `build-runtime-distribution.mjs:384-388`); no SEA-path consumer of `track-b-runtime/runtime-ui` exists.

## Decision

1. **The Track-B `runtimeUi` binding is dead metadata in the SEA lane** and is hereby flagged not-applicable for SEA consumers. The SEA UI authority is `build/client`; no manifest or seal edit is made (S284 guidance: do not strip or alter the artifact/seal).
2. The binding is **kept intact** for the private-distribution lane that owns it.
3. **Named follow-on:** if any consumer is ever expected to read `track-b-runtime/runtime-ui` from a SEA package, that is a packaging gap to design explicitly (own staging copy step + closure verification), not an incidental fix.

This decision closes the open staging flag from S284; it does not claim any new lane.
