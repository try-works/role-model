# Run: `32-router-runtime-routing-operator-surface`

## Phase: `06 Decisions Update`

Status: `COMPLETE`

## Decisions recorded during the run

### 1. Router remains an explanation surface, not a Control/Observe replacement

- Decision:
  - keep `Control` as the editing/configuration surface
  - keep `Observe` as the raw telemetry/request-trace surface
  - make `Router` the first-class explanation, provenance, comparison, and decision-interpretation surface
- Reason:
  - this preserves existing operator workflows while resolving the routing-visibility gap the run was created to close

### 2. Router UI consumes structured Router APIs instead of scraping raw request JSON

- Decision:
  - add `/api/role-model/router/*` backend contracts and typed frontend client fetchers
- Reason:
  - this keeps page components stable, typed, and legible while promoting existing runtime data into repo-owned UI contracts

### 3. The QA launcher must use the complete fixtures bundle

- Decision:
  - point the QA bootstrap at `testdata/router-runtime/fixtures`
  - pass Router API readers into `startBridgeServer`
- Reason:
  - the live run exposed that the previous bootstrap path could start a healthy server without populated registry fixtures or Router API wiring, which blocked real browser proof

### 4. Router decision detail must ignore stale fetch completions

- Decision:
  - add cancellation guarding inside the `requestId`-keyed effect
- Reason:
  - review found a real route-race where quick navigation could render the wrong decision detail after out-of-order responses
