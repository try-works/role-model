# Run: `32-router-runtime-routing-operator-surface`

## Phase: `07 State Update`

Status: `COMPLETE`

## State delta

- The runtime UI now exposes a first-class `Router` section with overview, config, candidates, decisions, and request-keyed decision-detail pages.
- The runtime host bridge now exposes a structured `/api/role-model/router/*` family for Router summary, config, candidates, decisions, and decision detail.
- The QA launcher now boots from the complete `testdata/router-runtime/fixtures` bundle and forwards the Router readers into the bridge server, so live runtime/browser QA can exercise the same Router surfaces shipped by the worktree.
- The Router detail page now ignores stale async completions when `requestId` changes, preventing incorrect decision detail readback after fast navigation.
- Focused host-bridge and runtime-ui builds/tests are green, browser-backed Router QA is proven, and root `ci:check` still reproduces the inherited Phase 0 formatter-drift failure signature.
