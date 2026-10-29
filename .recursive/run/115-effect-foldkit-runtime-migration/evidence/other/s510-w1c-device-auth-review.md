# S510 independent review — W1c device-auth feature co-location

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/features/device-auth/model.ts` = `384343ABFA069C609E186A05809B789AF8F54C66FB03166A51BA6B1A57B99F53` (match).
- `messages.ts` = `70E407181C3F563857BF8DA539ED1CB22CC875F842E85E729FDD358486A2C562` (match).
- `update.ts` = `8DDC7605242C5E539059A02F0E081EDF98D98A228B342E1995B18AFE5AAD8363` (match).
- `view.ts` = `C0D97482012C320033F8E521C3F5F28C95428366486A2CFEAF6B24044F290AE6` (match).
- `index.ts` = `5F6265BF0B4304DE635D5219BFE0C3E3522F372E9396935E7214D4C94110B157` (match).
- `src/control-view.ts` = `0B6F4050C7EA3C3AB0F6372BA64BB342708C970F4BA8CB04B854619848D49154` (match).
- `src/device-auth.ts` = `2AFDB85F565656CD456F9B62E44558E64E4580AF6D676A92D8FD3C1DFB36E57F` (match).
- `src/update.ts` = `46BC8A41BAC05CE8B1B228851261A742F1AD8E5B414A2F07D795D3E5CDB3B2CD` (match).

## Verdict: bounded PASS

## Purity verification

- `features/device-auth/model.ts` is **byte-identical** to the old clean-HEAD `src/device-auth.ts` (353 lines); the old path is an `export *` shim, so every existing import specifier resolves unchanged.
- `features/device-auth/view.ts` carries the old `renderDeviceAuthSession` + `renderDeviceAuthorizationForm` markup; `control-view.ts` now only re-exports it. Selectors (`data-route`, `data-device-auth-*`, `device-auth-user-code`, verification link href/target/rel) and Dismiss/Cancel semantics are unchanged.
- `features/device-auth/update.ts` extracts `withDeviceAuthDialog`, `deviceAuthCancelledState`, `deviceAuthFailedState` with the same pending+userCode key/open, same cancelled reset/token increment, and same failed error/inflight state. Parent `createUpdate` still owns commands and routes `GotDeviceAuthDialogMessage` through `updateDeviceAuthDialog` exactly as before; dialog/listbox imports unchanged.
- All three `withDeviceAuthDialog` call sites remain in the parent (start restore, poll, retry/restore), so command/interrupt flow is not altered.
- **No test edits:** `git status` shows no changes under `test/`; unchanged suites pass.
- Flat `Model`/`routeContent`/`createUpdate` remains; no other family or shared client touched.

## Verification executed

- s397/s425/s499/s491/s458/s25d/s111: **7 files, 61/61 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3** passed.
- `audit-rendered-ui --routes /control/endpoints,/control/providers`: **PASS both**, failures 0.
- anti-slop effect:true: `model.ts` **13 findings**, exactly the same 13 as the clean-HEAD `device-auth.ts` (relocated, not new logic); messages/update/view/index/shim/control-view **0**; parent update **10 = HEAD baseline**, view **30 = HEAD baseline**.
- `s509-green.log` header records `TDD Mode pragmatic` and `RED=N/A rationale` as required.

## Non-blocking notes

- The packaged audits used the current final6 exe/static root; this source refactor was not rebuilt into a package in this slice. The extraction is behavior-preserving and the unchanged 61-suite gate covers it, but this is not a rebuilt-package proof.
- `features/device-auth/update.ts` is an extraction, not a pure re-export; that is the intended W1c shape with the parent still the single dispatcher.
- No whole Workspace claim; only the device-auth family is reviewed. Other families remain untouched.

