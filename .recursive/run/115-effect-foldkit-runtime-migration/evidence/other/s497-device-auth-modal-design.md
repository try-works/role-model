# S497 — device-auth modal migration design (read-only)

Date: 2026-10-29. No source edits; this design file only. Public basis `705bb44f`.

## Inputs reviewed

- `role-model-router/apps/runtime-ui-next/src/control-view.ts:135-293` (inline session + form).
- Original React modal `role-model-router/apps/runtime-ui/app/components/device-authorization-modal.tsx:16-94` and its trigger in `app/routes/providers.tsx:463-480,814-835,1597-1605`.
- Foldkit dialog API: `role-model-router/packages/foldkit-ui/dist/types/dialog/index.d.ts` and `dist/chunks/chunk-7S4IB4HD.js:336-428`.
- Actual scene tests: `test/s397-device-auth-form.test.ts:257-315` and `test/s425-device-auth-correctness.test.ts:300-499`. **S442 is a review artifact (`evidence/other/s442-click-invariants-review.md`), not a test file.**

## Current vs original behavior

The React original keeps a normal provider card on the page and mounts `DeviceAuthorizationModal` only for a pending session with a userCode; the modal shows title “OpenAI verification code”, the code, instructions, copy/open buttons, a “Dismiss” close and Escape; closing only hides the modal (it does not cancel polling). The Foldkit port currently renders the draft form **and** the pending session inline in one section; the only close-ish control is “Cancel”, which interrupts polling.

Recommended bounded scope: **move only the session display into the dialog**; keep the draft/start/retry/error form inline exactly where it is. This matches the original card+modal structure, keeps the existing scene entry points, and avoids touching device-auth command/update semantics beyond modal open/close.

## 1. Exact DOM/attribute mapping

### Keep outside the dialog (existing form, unchanged)

| Current selector / attribute | Source | Keep? |
|---|---|---|
| `section[data-route="device-authorization"]` | `control-view.ts:228-229` | Yes — s425 `draftSteps()` scopes typing here (`s425:323-331`). |
| `[data-device-auth-state]` on the section | `:229` | Yes — form state attribute. |
| labels/inputs Provider / Provider kind / Variant / Auth mode / Region / Model | `:214-245` | Yes — s425 types by label inside the scoped section. |
| button “Add model” | `:246-249` | Yes. |
| button “Start device authorization” + `[data-device-auth-start]` | `:256-265` | Yes — s397:296-297; s425:354,392,422,466. |
| button “Retry” + `[data-device-auth-retry]` | `:274-286` | Yes — s397:305-306. |
| error `<p role=alert>` + `[data-device-auth-error]` | `:287-289` | Yes. |

### Move inside the dialog panel, preserving every session attribute

| Attribute | Current source | Modal placement | Tests that must keep passing |
|---|---|---|---|
| `[data-device-auth-session="pending|connected|expired|..."]` | `control-view.ts:135-210` | Same wrapper inside `render.panel` | s425 state/text assertions |
| `[data-device-auth-user-code]` (the code text) | `:152-158` | Same `<code>` element, panel body | s425:358,396,400; s397 indirect |
| `[data-device-auth-verification-link]` + `href/target=_blank/rel=noreferrer noopener` | `:171-181` | Same anchor, panel body | s425:359-361,401,492-497 |
| `[data-device-auth-verification-unavailable]` | `:160-168` | Same paragraph | s425:425 |
| `[data-device-auth-note]` | `:184-194` | Same paragraph | current behavior |
| pending wrapper `role=status aria-live=polite`; terminal wrapper `role=alert` | `:145,200-202` | Keep exactly | s111 a11y; s425 |
| “Cancel” button (busy) | `:266-273` | Keep the button inside the panel with the same accessible name and `Message.DeviceAuthCancelled({})` click | s425:457-459 (asserts `PollDeviceAuthorization.Interrupt`) |

### New dialog-only attributes

- `<dialog id="device-auth-modal" ...>` via `render.dialog`; `aria-labelledby` via `render.title` spread on the `<h2>`; `aria-modal="true"` is supplied by the component only while visible (chunk `:369-378`).
- `render.backdrop` attributes on the backdrop element; `render.panel` on the content panel.
- `render.initialFocus` on the intended first focus target (recommended: the “Dismiss”/close control; see §2).
- Optional test anchor: `h.DataAttribute("device-auth-modal", "")` on the `<dialog>` (new, additive; does not replace any existing attribute).

### Test-update list (precise)

- **No selector changes required** if the table above is followed: s397 start/retry and s425 code/link/cancel/terminal text keep resolving. `s425` scopes only the draft form with `[data-route="device-authorization"]`; the modal panel must not be placed between that section and its inputs (render the dialog as a sibling of the section).
- If a **new “Dismiss” button** is added, s247’s click-budget invariants must be re-baselined or the extra button avoided. Recommended: use `render.closeButton` on the existing “Cancel” button (closes modal) and make its click also dispatch `DeviceAuthCancelled`; add no second dismiss button. Backdrop click and Escape provide the other close paths.
- If terminal session is hidden when modal closes, s425’s `text("Device code expired.")` fails. Keep the dialog visible while `state.session` is non-null (including terminal) until the user dismisses; the original React pending-only rule must be adjusted to preserve the port’s tested behavior.
- If the dialog Show/Close Commands are not resolved in scene, add the same `Command.resolve` steps used by s397. The current scene tests do not know about Dialog lifecycle commands; this is the main test-harness change.

## 2. Foldkit dialog API usage

Import: `import * as Dialog from "@role-model-router/foldkit-ui/dialog";`

- **Model slice:** add optional `deviceAuthDialog: Dialog.Model` to `Model` (same optional-slice pattern as S491 listbox) plus `deviceAuthModalKey: string | null` for show-once semantics. Initialize with `Dialog.init({ id: "device-auth-modal", focusSelector: "..." })` or `Dialog.boot(...)` when a session is already pending at startup.
- **Open:** `Dialog.open(model.deviceAuthDialog)` returns `{ model, commands }`; store the returned model and map its commands to a parent `GotDeviceAuthDialogMessage`. Trigger only when `state.session` is pending with a userCode and `authRequestId:userCode` differs from `deviceAuthModalKey` (mirrors original `buildPendingDeviceAuthorizationModalKey`, `providers.tsx:463-480`).
- **Close:** `Dialog.close(model.deviceAuthDialog)`; parent also clears `deviceAuthModalKey` on close. Closing the dialog must not cancel polling unless the “Cancel” control was used.
- **View:** `h.submodel({ slotId: "device-auth-modal", model, view: Dialog.view, viewInputs: { hasDescription: true, toView: (render) => render.isVisible ? h.dialog([...render.dialog], [backdrop, panel]) : h.span([], []) }, toParentMessage })`. The component requires a real `h.dialog` element; do not substitute a div.
- **Focus/scroll:** the component traps focus, locks scroll, restores return focus, isolates the background, and handles Escape via its own `cancel` mapping (`dialog/index.d.ts:52-86`; chunk `:369-402`). Use `render.initialFocus` or `focusSelector`; recommended initial focus is the close control, not the code.

## 3. Message/update wiring

- Add `GotDeviceAuthDialogMessage: { message: Schema.Unknown }` to `Message` (mirroring S491’s `GotRequestsRankingMetricListboxMessage`, `message.ts:81`).
- In `createUpdate`, route that message to `Dialog.update(model.deviceAuthDialog, message)`; persist the returned child model and map child commands through `Command.mapMessages` to `GotDeviceAuthDialogMessage`.
- On `Dialog.OutMessage.Closed`, clear `deviceAuthModalKey` and leave `DeviceAuthState` untouched (modal closed, polling continues) unless the close originated from “Cancel”, whose existing `DeviceAuthCancelled` message already interrupts polling.
- On session transitions (`DeviceAuthSessionsLoaded`, `DeviceAuthPolled`, `DeviceAuthRetry...`), compute the modal key and call `Dialog.open` only for a new pending+userCode session; do not reopen after the user dismisses the same key (original `shownDeviceAuthModalKeyRef` behavior, `providers.tsx:814-835`).
- No change to `DeviceAuthStartRequested`, `DeviceAuthCancelled`, polling commands, payloads, or the draft model.

## 4. Accessibility requirements

- Native `<dialog>` supplies role `dialog`; `render.dialog` supplies `aria-labelledby` and conditional `aria-modal="true"` (chunk `:369-378`). Render `h.dialog` so those attributes apply.
- Spread `render.title` on the `<h2>` (“OpenAI verification code”) and `render.description` on a description paragraph with `hasDescription: true`, so the accessible name/description are wired without hand-rolled ids.
- Use `render.initialFocus` (or `focusSelector`) for deterministic initial focus; the component traps focus and restores it on close.
- Escape, backdrop click and the close control all go through `Dialog.RequestedClose`; keep the existing `role=alert`/`role=status` wrappers for terminal/pending messages.
- Preserve accessible names: “OpenAI verification code”, “Dismiss”/“Cancel”, “Start device authorization”, “Retry”, “Open verification page”.

## 5. Risks

1. **Test command lifecycle:** Dialog open/close emits Commands (`ShowDialog`, `CloseDialog`, `AcquireResources`). Scene tests currently resolve only device-auth Commands; they will need explicit resolution or they may stall.
2. **Click budget:** adding a Dismiss button adds one click per scene invocation; s247 counts clicks. Prefer reusing Cancel/closeButton or subtract elsewhere with owner approval.
3. **Terminal status:** original React closes the modal when the session is no longer pending; the port’s s425 test expects “Device code expired.” after a terminal poll. Keep the dialog open while a session exists; do not copy the original pending-only condition blindly.
4. **Cancel semantics:** `Cancel` both interrupts polling and closes the modal; backdrop/Escape must only hide, matching the original modal. Do not let `Dialog.CloseDialog` cancel polling.
5. **Route/refresh unmount:** navigating away unmounts the dialog and releases resources; the optional model could remain open on return. Close/reset on route change or keyed subtree removal.
6. **Duplicate pending sessions:** key by `authRequestId:userCode` and keep show-once per key to avoid reopening on every poll.
7. **SSR/renderToString:** a dialog with `open` and no effect execution must still render the same session text; `s425:474-498` server-render test needs the code/link attrs inside the dialog markup.
8. **Focus target:** focusing the code element is not interactive; focus the close button or a real control to avoid an invisible focus ring.

## 6. Bounded implementation plan (not executed)

1. Add `src/ui/dialog.ts` facade + optional model/message slice, mirroring S491 listbox.
2. Extract `renderDeviceAuthSession` into a `deviceAuthSessionPanel` (same attrs) and render it via `h.submodel`/`h.dialog`; keep the form section unchanged.
3. Add open/close wiring keyed by pending+userCode; keep Cancel interrupt behavior; keep terminal dialog visible.
4. Add scene tests: open on pending, Escape closes and returns focus, backdrop closes, Cancel interrupts, terminal stays visible; resolve Dialog commands.
5. Run s397/s425/s111/s247 + UI tsc; no changes to commands/payloads.

## Limitations

- Read-only design; no implementation, no scene run, no live browser/device-auth provider call.
- S442 is cited by the task as a scene test but is a review artifact; the actual scene suites are s397 and s425. This design targets both.
- No claim that the migration is complete or that the whole W1b/dialog requirement is satisfied by this slice.

