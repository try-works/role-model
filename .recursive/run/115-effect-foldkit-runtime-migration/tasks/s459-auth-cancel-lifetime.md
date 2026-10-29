# S459 — device-auth poll cancellation lifetime (DESIGN-ONLY first)

Status: design complete (read-only) — awaiting Lead approval of implementation write scope
TDD Mode: not-applicable until design freeze (read-only)
Public patch basis b9841f94; private3d03ad78.

Governing: S432 accepted cancel as STATE-ONLY: DeviceAuthCancelled clears inflight/session and token-fences results, but the already scheduled PollDeviceAuthorization may still execute its delay and fire one more request. S420 keeps auth I/O lifetime open.

Write scope (read-only now): NO source edits. Inspect how PollDeviceAuthorization delayMs is actually scheduled (commands.ts effect sleep + runtime scheduler), whether the command layer supports cancellation/abort, what the runtime executes, and the original runtime-ui behavior if any. Produce tasks/s459 design doc with: exact current scheduler path, minimal correct cancellation contract (cancel aborts pending poll so no further request and no dangling timer; in-flight fetch may complete but is fenced), where each change lives (UI command/message/update vs runtime executor), and behavioral RED cases (cancel immediately after poll scheduled -> 0 subsequent poll fetches; cancel during delay; cancel after response fenced; restart allowed).

If correct cancellation requires runtime executor changes outside the UI package or an approved scope extension, STOP and record the exact cross-layer contract with paths and ask the Lead before any edit. No implementation, no commit, no provider/ports.

## Design record (author s10-capqueue-close, deepseek-flash verified)

Design: `evidence/other/s459-auth-cancel-design.md` sha256 `009896084fbcebb9692c7c72606a755eba80bf58538fefbd2dfd8beeb2fe4372` (10602 B). No source/test edits, no build/provider/port use; basis public `b9841f94` / tree `4e782109`, private `3d03ad78` / tree `c9a75617`.

Current path (cited): update emits `PollDeviceAuthorization` from four sites (restore/started/next/retry) with `{authRequestId, delayMs, intervalMs, token}`; the effect is `Effect.sleep(delayMs)` then the client fetch (`src/commands.ts:353-368`); the runtime forks it in a fiber and provides the interrupt registry (`vendor/foldkit/.../runtime/runtime.ts:671-716`, `runtime/resourceProvider.ts:150-183`); `DeviceAuthCancelled` only clears state and advances the token (`src/update.ts:1074-1085`), leaving the sleep fiber alive for one more poll that the token fence then ignores. The original React UI cancelled the scheduled `setTimeout` on cleanup but never aborted an in-flight fetch (`apps/runtime-ui/app/routes/providers.tsx:729-758`).

Contract: make the poll Command interruptible keyed by `authRequestId` (`keyFields:["authRequestId"]`, `toKey: "device-auth-poll:"+authRequestId`); on cancel return `PollDeviceAuthorization.Interrupt({authRequestId}, () => Message.DeviceAuthPollCancelCompleted({}))` plus the existing state clear/token advance. Interruption cancels the `Effect.sleep` timer (no further request), drops the interrupted result Message, and keeps the token fence. In-flight fetch may complete at the network layer; optional AbortSignal pass-through is a second layer, not required. Restart stays allowed (new authRequestId = new key).

Cross-layer verdict: **UI-only**, no vendored runtime change (interrupt registry is already provided and interruptible definitions are registered while running). Implementation write scope needs Lead approval: `src/commands.ts`, `src/message.ts`, `src/update.ts` (optional `src/device-auth.ts` AbortSignal) and tests; the s425 scene cancel assertion (:457-459, currently `Command.expectNone()`) must become the interrupt-command assertion and new S459 lifetime fetch-count tests added (R1-R4 in the design).

Limitations: design only, cases not executed; "today" fetch counts inferred from the scheduler path; no whole-requirement claim.
