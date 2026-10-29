# S523 independent review — S522 cleanup slice

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/view.ts` = `CF58263B89F17FF0FC73CD4F5762A3E64A8C1DD1B5F038436E61C4867FBDFCCA` (match).
- `features/control/routes.ts` = `ECADDED3ED71F3252C77DC0E7C876485AF59A18D38023E1C6657EEEB942F3595` (match).
- `features/learning-ranking/routes.ts` = `12CABD85A54B1FFD6E0B3D73913E102F5AFE1856240A62998CC00B90BFF24C15` (match).

## Verdict: bounded PASS

## Cleanup verification

- The two **payload** casts in Diagnostics/NotFound are gone: `Diagnostics: (route) => { const { id } = route; ... }` and `NotFound: (route) => { const { path } = route; ... }` now narrow through the mapped registry type (`view.ts:986-994,1052-1054`).
- The registry is declared as `{ [K in AppRoute["_tag"]]: (route: Extract<AppRoute, { readonly _tag: K }>) => Html }` with `satisfies` (`:1087-1089`) and remains the single 49-key dispatch path. One **dispatch assembly** cast remains: `const renderRoute = routeRegistry[route._tag] as (route: AppRoute) => Html` (`:1090-1092`), with a SAFETY comment; this is a union-dispatched function cast, not a payload cast, and is unavoidable in this registry shape without a more elaborate dependent helper.
- `routeContent` still takes exactly one named `RouteViewContext`; no positional remnants remain.
- Per-route contexts are now minimal: `ProvidersRouteContext` only `controls.providers` + device-auth/provider-account fields; `EndpointsRouteContext` only `controls.endpoints` + endpoint-admission; learning page/family contexts are split (`LearningPageContext` vs `LearningFamilyContext`), removing the unused `learningFamilyPage` from `learningRoute`.
- No route module imports `view.ts`/another feature’s internals for helper functions; studio/runtime/overview/learning use callback injection, and control/requests compose their own feature views. `control-view.ts` remains a shell compatibility re-export of the device-auth/endpoint view modules; that is a shell boundary, not a new cross-feature dependency.
- No test edits; no other slices touched.

## Compensation evidence

- 7 unchanged suites: **61/61 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3** passed.
- Packaged `audit-rendered-ui` (`s522-audit.log`): **20/20 routes PASS**, failures 0 (final6 exe + rebuilt static + fixture root + fresh state).
- anti-slop effect:true: `view.ts` **30 = HEAD baseline**, zero added-line; control/learning route modules **0**, filesScanned 1.
- `s522-green.log` records pragmatic RED=N/A rationale.

## Non-blocking notes

- The remaining dispatch cast could be removed with a helper that takes the route as a discriminated union and calls the exact entry, but the current form is type-checked at the map and localized.
- `control/routes.ts` still imports `control-view` for the endpoint-admission/provider/control helpers; that shell file re-exports feature views, so the dependency remains one indirection away. Not a behavior issue for this slice.
- No whole Workspace claim; final sealed rebuild/gate matrix remains future work.

