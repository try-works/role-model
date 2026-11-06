# S501 independent review — device-auth session dialog

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/ui/dialog.ts` = `9F986366EABB1A2C62282C3D10F2AD5900F983163BD7BB54735E9B53956A5A85` (match).
- `src/control-view.ts` = `C82797CF5F680357063686C8B7722A0ECE8482F6A464D927AB50BDCE247824F3` (match).
- `src/message.ts` = `84DE25A547E791302DD96C212C7E0D3E0629F7B9E9EF0282992348BA072B8B32` (match).
- `src/model.ts` = `7D2CB1B8AEAFD2F0DD48B0B90555CFC2EBE01920EA848320753EA0F16A6AE99A` (match).
- `src/update.ts` = `FEFC391F60334E5813C803CBD283D1E7CCE112C5E13FDAD3280526E38A4DE784` (match).
- `src/view.ts` = `69DB2593A247968D62DF4FDFCD954D1CFE006881A595ED59EF15EC267EE85E38` (match).
- `test/s499-device-auth-dialog.test.ts` = `863E0A2371FEB6910BEC16C7061AE07C47F259DDFC00D138D7A88D70D796194A` (match).
- `s499-red.log` = `6B7BD3B7B68AF4F38CD1F3A0DFAA7CC6A43C7DA6C6FD656F18671E7F99DA06E9` (match, 1156 B).

## Verdict: **(b) HOLD** — do not accept bounded; install the dialog lifecycle first

The markup migration and selector preservation are correct, but this is not yet a functioning modal: the implementation deliberately strips the mount acquisition and does not render a close control or use the modal key. That is the core behavior the task and S497 design require, not a cosmetic follow-up.

## What is correct

- Draft/start/retry/error form stays inline with `data-route="device-authorization"`, `data-device-auth-state`, `data-device-auth-start`, `data-device-auth-retry`, `data-device-auth-error`; only the session moves into `deviceAuthDialogView` (`control-view.ts:230-310`).
- Session attributes are preserved inside the dialog: `data-device-auth-session`, `data-device-auth-user-code`, `data-device-auth-verification-link` href/target/rel, `data-device-auth-verification-unavailable`, `data-device-auth-note`, role/status/alert.
- Cancel remains in the dialog content with `Message.DeviceAuthCancelled({})` when busy (`control-view.ts:296-309`).
- New message/model wiring exists: `GotDeviceAuthDialogMessage`, `deviceAuthDialog` optional slice, `updateDeviceAuthDialog` (`update.ts:1176-1191`).
- RED is clean: same imports/signature with inline session only; failure is the missing `[data-device-auth-modal]`, no renderer crash (`s499-red.log`).
- GREEN: **51/51** across s397/s425/s499/s458/s491/s111; UI tsc **0**; lint update 10/view 30 = HEAD baselines, control-view/dialog/test 0.

## Blocking findings

1. **The dialog lifecycle is suppressed.** `deviceAuthDialogView` filters every dialog attribute with `resolveMountDispatch` (`src/ui/dialog.ts:50`), which removes the component’s `OnMount(AcquireResources(...))`. It then hand-sets `aria-modal`/`open` (`:51-52`). `initDeviceAuthDialog` calls `Dialog.boot(...).model` and discards the returned commands (`:17-18`). Result: no `Dom.showDialog`, no focus trap, no scroll lock, no background isolation, no initial-focus dispatch, no focus return — the S497 §2/§4 requirements.
2. **No close control is rendered.** `render.closeButton` is never used; the only Cancel button exists while `busy`. A `connected`/terminal session has no visible dismiss control. Backdrop/Escape are the only paths, and Escape depends on the lifecycle that is stripped; this is an a11y failure, especially for keyboard users.
3. **`deviceAuthModalKey` is declared but never read.** A grep finds only `model.ts:22`. The design’s show-once/dismissed-key behavior is not implemented, so modal open/close semantics are undefined.
4. **The only new test is markup-only.** It asserts the `[data-device-auth-modal]` element, `aria-modal`, `open`, code and link; it does not assert Escape, focus trap, focus return, close control, or that AcquireResources runs. It cannot fail if the lifecycle remains stripped.

## Required S500 before acceptance

- Keep `Dialog.boot`/`Dialog.open` commands and route `GotDeviceAuthDialogMessage`; do not filter `resolveMountDispatch`. Let `render.dialog` provide `open`, `aria-modal`, the mount acquisition and the unmount backstop.
- Render `render.closeButton` (or an explicit close control) with an accessible name, plus the existing Cancel semantics. Backdrop/Escape must only close unless Cancel was used.
- Consume `deviceAuthModalKey` for open-on-new-pending/dismissed-key behavior; keep terminal session visible to preserve s425.
- Add behavioral tests that fail if focus trap/return, initial focus, Escape, close control, or AcquireResources command are missing; keep s397/s425/s458/s491/s111 green.

## Limitations

- I did not run a live browser; scene/DOM tests and source inspection only.
- No whole W1b/Workspace claim; this review is limited to the device-auth dialog slice.


---

# S501 FINAL re-review on refrozen bytes — **bounded PASS**

Date: 2026-10-29. Read-only; this append only.

## Refrozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)
- `src/ui/dialog.ts` = `E33D040078A7F0A9CE61F47DF19A43B2236AB69AC82FA4253AAD4EE0721AA6B6` (match).
- `src/update.ts` = `EA0920D58597C01FA66EAADFF19CA3897C5A1F19C410E4BBC8998A633E241113` (match).
- `test/s499-device-auth-dialog.test.ts` = `604A63C40FC3FDC5A64A30044B73F35DC47FB690B0DB7672D294505D4F15EAAA` (match).
- `test/s425-device-auth-correctness.test.ts` = `414A4CB59875CE75EDCB1174110339E0D855E8B0A6113199A01E2829BF43CE9C` (match).
- Unchanged: control-view `C82797CF...`, message `84DE25A5...`, model `7D2CB1B8...`, view `69DB2593...` (all match).
- Active model: `s9b-eventlog` = **deepseek-flash** via `list_agents`.

## Prior HOLD items — resolved
1. **Lifecycle no longer suppressed:** `deviceAuthDialogView` spreads `render.dialog` without filtering `resolveMountDispatch` (`src/ui/dialog.ts:55-59`); `AcquireResources` is rendered and the scene tests resolve it. `updateDeviceAuthDialog` maps `Dialog.update` commands through `GotDeviceAuthDialogMessage` (`update.ts:1197-1210`).
2. **Close control:** `render.closeButton` is now rendered as an accessible “Dismiss” button (`dialog.ts:68-75`); `Mount.expectEnded(Dialog.AcquireResources)` covers teardown.
3. **Modal key consumed:** `withDeviceAuthDialog` computes `deviceAuthModalKeyFor(session)` and opens only for a new pending+userCode key (`update.ts:296-308`); `deviceAuthModalKey` is no longer dead.
4. **s425 updated minimally:** only `acknowledgeAcquireResources` and `Mount.expectEnded` were added; no selector or business assertions changed.

## Verification executed
- **51/51** across s499/s397/s425/s458/s491/s111, exit 0.
- **s247 click budget 3/3**, exit 0.
- UI `tsc --noEmit`: **0**.
- anti-slop effect:true: update **10 = HEAD baseline**, view **30 = HEAD baseline**; control-view/dialog/test **0**, filesScanned 1.

## Verdict: **bounded PASS**, with a named follow-on
The dialog now uses the real Foldkit lifecycle (show/acquire/close/focus-trap/scroll-lock wiring via `AcquireResources`/`CloseDialog`), the selectors and 51/51 behavior are preserved, and the previously unused key is wired.

### Explicit deferred gap (named follow-on)
`Escape`, focus-trap containment, initial focus and focus-return are provided by the real `@role-model-router/foldkit-ui/dialog` (`AcquireResources` calls `Dom.showDialog(...isModal:true...)`, chunk `:86-116`) but are **not behaviorally asserted** in this slice; Scene only resolves the mount command. Defer these browser-level assertions to the named follow-on **S502 browser dialog a11y assertions**, to run with the packaged browser audit (Escape closes, Tab stays in dialog, initial focus is Dismiss, focus returns to the trigger). This slice must not be cited as proving those behaviors.

### Non-blocking notes
- `openDeviceAuthDialog` returns only the model and discards the `Dialog.open` command; opening relies on the rendered `AcquireResources` mount command, which the test resolves and which performs `Dom.showDialog`/scroll lock.
- The `Dismiss` control closes the modal without cancelling polling; Cancel keeps `DeviceAuthCancelled` semantics.
- No whole Workspace/W1b claim; provider/device-auth form and other features remain untouched.
