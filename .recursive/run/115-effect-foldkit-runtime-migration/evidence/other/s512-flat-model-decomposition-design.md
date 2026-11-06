# S512 — flat Model / routeContent / createUpdate decomposition design (read-only)

Date: 2026-10-29. No code changes; this design file only. Public basis `4537248b`.

## Inputs and measured current shape

- `role-model-router/apps/runtime-ui-next/src/model.ts:17-42`: **23** flat `modelFields` keys (the task’s 17-40 line range is stale).
- `src/view.ts:929-949`: `routeContent` currently takes **19 positional arguments**, then `AppRoute.match` at `:950` covers **47** route cases (`src/route.ts:21-71`). The task’s “15-arg” count is stale.
- `src/update.ts`: file is **1511 lines**; `createUpdate` begins at `:222` and closes at `:1511` (~1289 lines for the function, ~959 lines inside `Message.match` at `:552-1510`). The task’s “1456-line” count is close but not exact.
- Three families are already co-located (`features/requests-ranking`, `features/learning-ranking`, `features/device-auth`); the remaining route views/update handlers are still in the flat files.

## Target shape

1. **Feature field groups, flat runtime model preserved.** Define per-feature field objects (`shell`, `requests`, `learning`, `deviceAuth`, `providers`, `endpoints`, `runtime`, `studio`) and compose `modelFields` from them. The runtime `Model` stays a flat object with the same keys/order, so scenes, hydration, and tests that build `shellModel` do not change. Export `Pick<Model, ...>` slice types and `withXSlice` helpers; do not introduce nested runtime objects in this decomposition.
2. **Named view context + per-route registry.** Replace the 19 positional parameters with one `RouteViewContext` object built once in `view()`: `{ route, readbacks, controls, diagnostics, observability, overview, studio, runtime, deviceAuth, providerAccount, endpointAdmission, learning, requests, chartInteraction, h }`. A registry satisfies `Record<AppRoute["_tag"], (ctx) => Html>` so every route is explicit and exhaustively type-checked. Each entry is a thin function reading named fields, not positional arguments.
3. **Family view modules.** Move route handlers into `src/features/<family>/routes.ts` (or `src/routes/<family>.ts` when a family is not feature-owned): `readbacks`, `observe`, `router`, `learning`, `requests`, `control`, `runtime`, `studio`, `system`, `overview`. The registry composes them; `view.ts` keeps only the document shell and the default/not-found fallback.
4. **Partitioned update dispatch.** Keep `createUpdate` as the composition root. Build an explicit ordered array of family handlers; each handler has `{ id, tags, handle(message, model, deps) }` and returns `undefined` when it does not own the message. The parent iterates the array once (first match wins), preserving current tag semantics. Each family handler is the existing `Message.match` branch body moved verbatim; shared helpers (`updateRequestsRankingField`, `readReadback`, refresh commands) are passed in, not reimplemented.

## Stepwise bounded slices

Each slice is independently reviewable and must leave all suites + audits green. No test edits in any slice.

### S513 — Model field grouping (no shape change)
- Add feature field-object modules and compose `modelFields`; add slice types/accessors.
- Acceptance: byte-identical runtime schema shape; `tsc` 0; 61/61; lint zero added; audits unchanged.

### S514 — Named view context + readback-only registry
- Introduce `RouteViewContext`; move the ~27 readback/observe/router/system routes that only call `renderReadbackPage`/family pages into registry entries. Keep markup/selectors/order identical.
- Acceptance: every moved route renders the same outerHTML/text; audits `/`, `/runtime`, `/models`, `/requests`, `/learning`, `/control/*`, `/observe/*`, `/system/*` PASS; 61/61.

### S515 — Control/feature route modules
- Move `Providers`, `Endpoints`, `ControlController`, `Requests`, `Learning`, `Studio`, `Runtime`, `Index` views into family modules; registry entries take named context.
- Acceptance: scene suites s397/s425/s499/s491 unchanged; audits `/control/providers`, `/control/endpoints`, `/requests`, `/learning`, `/runtime` PASS; s247 3/3.

### S516 — Update dispatch partition
- Extract one handler module per family, preserving handler bodies. Parent dispatch iterates explicit ordered handlers; no duplicate tag ownership.
- Acceptance: same command args/models for s397/s425/s499/s491/s458/s25d/s111; 61/61; tsc 0; lint zero added; no selector/DOM change.

### S517 — Cleanup and enforcement
- Remove the old positional `routeContent` signature and dead branches; add a type-level exhaustiveness check for all 47 tags; ensure no family imports another family’s internals (only `src/ui/*` and shell contracts).
- Acceptance: full 61/61, tsc, lint, all route audits, s247; diff shows moves/delegation only (no logic deltas).

## Behavior-preservation strategy

- **Move bodies verbatim**, then adjust only imports/signatures. No rewriting conditions, command arguments, payload builders, or markup strings.
- **Golden rendered evidence:** before each slice, record the current route text/selector set from `audit-rendered-ui` for the routes being moved; compare after. The existing audits already assert text presence and control sizes; keep the full 20-route matrix green.
- **Unchanged suites are the contract:** 61/61 (s397/s425/s499/s491/s458/s25d/s111) and s247 3/3; no test file edits.
- **Type safety:** `Record<AppRoute["_tag"], ...>` and per-family tag unions catch missing/duplicate routes and duplicate message ownership at compile time.
- **Diff discipline:** one family per slice; no formatter/codegen; no shared-file races; single writer.

## Risk list

1. **Route-registry order/exhaustiveness.** The current `AppRoute.match` order is explicit; a registry keyed by tag is order-insensitive for lookup, but any fallback/default change would alter NotFound. Use a total record plus explicit NotFound/Index entries; do not rely on object insertion order.
2. **Message-handler precedence.** `Message.match` currently has one branch per tag. A handler array must preserve first-match semantics and cover every tag; duplicate ownership must fail at type-check/review. Global messages (`Navigation`, theme, refresh) belong to the shell handler and must stay reachable.
3. **Scene selectors/DOM order.** Moving Providers’ form/dialog ordering or wrapping sections changes selectors like `section[data-route="device-authorization"]`, role names, and focus-return targets. Keep the exact tree shape and sibling order.
4. **s247 click budget.** Do not add wrapper/close controls during the move; budget is 3/3 and counts clicks.
5. **Model shape/hydration.** Do not nest feature slices at runtime; `shellModel`, scene `given`, and server render/build state expect flat fields. Group schema definitions and use `Pick` types only.
6. **Circular imports.** Family view/update modules must not import each other; shared contracts (`message`, `model` slices, `ui/*`) stay in shell modules. Review the dependency DAG per slice.
7. **Stale line/arg counts in the task.** Actual counts are 23 model fields, 19 view args, 47 routes, 1511 update lines; the plan uses the measured values.
8. **Audit nondeterminism.** `/models` 39-char and route-content length variation have been observed; use the Lead-authoritative final matrix, not a single transient audit run.
9. **Partial extraction drift.** If a handler body is split, command arg construction/tokens can silently diverge; require side-by-side body comparison and unchanged-command-args assertions in the existing suites.

## Bounded acceptance (design)

This design does not claim any decomposition is implemented. Each slice above needs its own strict/pragmatic TDD gate, no test edits, full unchanged suites, tsc 0, lint zero added, rendered audits, s247, and independent review. No whole Workspace completion claim follows from this document.

