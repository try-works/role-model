# S517 independent review — S516 named RouteViewContext + registry

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hash verified

- `src/view.ts` = `516723422B4AD22505647EB93D0A7963EE85FF40A241903B1E84F44B92945541`, 78409 B (match).

## Verdict: bounded PASS

## Structure verification

- `src/view.ts:929-949` defines one named `RouteViewContext` with exactly the former 19 field names; `routeContent(ctx)` destructures it (`:951-972`). The call site builds the object with the same values/fallbacks (`:1318-1338`). No positional parameter remains.
- `routeRegistry` (`:973-1095`) is keyed by route tag and ends with `satisfies Record<AppRoute["_tag"], (route: AppRoute) => Html>`; dispatch is `routeRegistry[route._tag](route)` (`:1096`).
- The task/design’s “47-key” count is stale: the current `routeCases` has **49** tags and the registry has **49 unique keys**, including `NotFound` and `Index`. The registry is exhaustive against the actual union (type-level `satisfies` enforces it); no route is missing. This is a count correction, not a coverage gap.
- Renderer bodies are preserved: readback/observe/router/system calls are unchanged; `Diagnostics` and `NotFound` now receive `route` and narrow their own payload with a one-line cast, producing the same markup/id/path as before. Providers/Endpoints/Control/Index markup unchanged.
- No test edits; other slices untouched.

## Compensation evidence

- 7 unchanged suites: **61/61 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3** passed.
- Packaged `audit-rendered-ui` (`s516-audit.log`): **20/20 routes PASS**, failures 0, including `/models` (1201 chars) with the fixture root. `/models` needs the fixture-root seed; that is recorded in the command and is not a view-registry regression.
- anti-slop effect:true `view.ts`: **30 findings**, identical to the HEAD copy (30) — pre-existing, zero added-line.
- `s516-green.log` records pragmatic RED=N/A rationale; no test changes.

## Non-blocking notes

- The registry is built inline per render; behavior is unchanged and this slice intentionally did not extract separate family modules (that is the next design slice).
- The two payload casts are localized and safe by tag; no runtime verification of the tag/payload pair beyond dispatch. A later cleanup could use per-tag handlers to remove the casts.
- This is only the named-context/readback-registry slice; update partition/cleanup remain future work. No whole Workspace claim.

