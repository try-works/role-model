# S519 independent review — S518 control/feature route modules

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/view.ts` = `568B41FC02AC9F45645CDD18FFABC30EF50A0683A45B080A1637741409DCFFD6` (match).
- `features/control/routes.ts` = `F46C84FAE34B326DD6876C53430DC1022603A6EB6677F0609B6A7A73DBD4A0ED` (match).
- `features/requests-ranking/routes.ts` = `6A58476DFEA4BE395956FD0A2D25F06BD64234ECE3B603CD6E3D86D85E74BECC` (match).
- `features/learning-ranking/routes.ts` = `80DCD5E0531B56D6F6302A748476C46A46133A8EDF4105C359EA9F5D182D2D0E` (match).
- `features/studio/routes.ts` = `96CBB2BA28F1AE99CFFE3249922123E4C227254078C071468946417C5ADFE888` (match).
- `features/runtime/routes.ts` = `E037DC2DDFB3A4626043F54B82A72E1E5786E56CF50439E908AD54F42E2A53A1` (match).
- `features/overview/routes.ts` = `14478387AE3D827E813C372F490723F3FEFD47198B538FE296B090E2EEA4A913` (match).

## Verdict: bounded PASS

## Structure verification

- `view.ts` registry entries for Providers/Endpoints/Requests/Learning/Studio/Runtime/Index are now thin calls: `providersRoute(...)`, `endpointsRoute(...)`, `requestsRoute(...)`, `learning*Route(...)`, `studioRoute(...)`, `runtimeRoute(...)`, `indexRoute(...)` (`:1004-1052`).
- Renderer bodies moved verbatim: providers/endpoints sections, requests section, learning page/family calls, studio configuredModels mapping, runtime page args and overview index args are unchanged in markup/args/order.
- The registry remains a 49-key `satisfies Record<AppRoute["_tag"], …>` with `NotFound`; no route coverage was lost. The task’s “49-key” is correct here (S512’s 47 was stale).
- **Callback injection avoids cycles without behavior change:** learning/studio/runtime/overview route modules receive the parent helpers (`learningPage`, `learningFamilyPage`, `studioPage`, `runtimeConfigPage`, `overviewPage`) as typed callbacks instead of importing `view.ts`. `features/control/routes.ts` imports `control-view` (which does not import `view.ts`), so no cycle exists; the control device-auth/endpoint-admission subviews still come from their feature modules.
- No test edits; other slices untouched.

## Verification executed

- 7 unchanged suites: **61/61 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3** passed.
- Packaged `audit-rendered-ui` (`s518-audit.log`): **20/20 routes PASS**, failures 0, with final6 exe + rebuilt current static + fixture root + fresh state; `/models` 1201 chars, `/control/providers` 473, `/control/endpoints` 298, `/requests` 365, `/learning` 872.
- anti-slop effect:true: `view.ts` **30 findings = HEAD baseline**, zero added-line; all six new route modules **0**, filesScanned 1.
- `s518-green.log` records pragmatic RED=N/A rationale.

## Non-blocking notes

- `providersRoute`/`endpointsRoute` share a broad `ControlRouteContext` containing fields each route does not use; harmless but a later cleanup could narrow per route.
- `learningRoute` receives `learningFamilyPage` though it only uses `learningPage`; harmless callback-context breadth.
- No whole Workspace claim; the final update-dispatch partition/cleanup slices remain future work.

