# Run: `32-router-runtime-routing-operator-surface`

## Phase: `08 Memory Impact`

Status: `COMPLETE`

## Durable repo facts reinforced

- The runtime operator shell now has a first-class `Router` section separate from `Control` and `Observe`.
- The bridge now owns a structured Router API family under `/api/role-model/router/*` for summary, config, candidates, decisions, and decision detail.
- The QA launcher for runtime-host-bridge must use `testdata/router-runtime/fixtures` so live QA has the complete fixture-backed registry and Router control-plane surfaces.

## Non-durable or environment-local observations not stored as repo memory

- The default runtime-ui Vitest package command hit a local worker OOM during teardown even though the suites themselves passed; this appears environment-local rather than a durable repo convention.
- The root `ci:check` formatter-drift failure remains inherited baseline noise and is already captured as a baseline fact in the run artifacts.
