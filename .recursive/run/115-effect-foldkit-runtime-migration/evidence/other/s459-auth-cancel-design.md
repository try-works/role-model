# S459 — device-auth poll cancellation lifetime (DESIGN ONLY)

Status: design frozen; no source/test edits, no build, no provider/port use. Basis: public HEAD `b9841f94f860cf98b1b2efd522f01b09747a4d22` tree `4e7821095fe1653cde80eaf82b2f4a9c0ee786a1`; private HEAD `3d03ad78f87c6b6e199796b43a0580c1b47463a8` tree `c9a7561787d73140e89400e565f8cd2b181621aa`. Governing: S432 accepted `DeviceAuthCancelled` as STATE-ONLY; S420 keeps auth I/O lifetime open.

Verdict: a minimal correct cancellation contract is achievable **UI-package only**. The vendored foldkit runtime already provides the interrupt registry to every Command and registers interruptible definitions while they run, so **no runtime/vendor executor change is required** (no cross-layer STOP). Implementation needs only the Lead-approved write scope for the UI files listed in §3.

## 1. Exact current scheduler path

1. Update emits the poll Command from four sites, all with args `{ authRequestId, delayMs, intervalMs, token }`:
   - restore after readback: `src/update.ts:994-999` (plan.session authRequestId);
   - start response: `src/update.ts:1006-1014`;
   - next pending poll: `src/update.ts:1030-1036`;
   - manual retry: `src/update.ts:1052-1072` (delay 0).
   The token stored in `state.token` is the same token the scheduled command carries (the fence value).
2. Command definition: `src/commands.ts:353-368` — `Command.define("PollDeviceAuthorization", { args, execute: ({authRequestId, delayMs, intervalMs, token}) => Effect.flatMap(Effect.sleep(delayMs), () => <fetch + DeviceAuthPolled|DeviceAuthFailed>) })`. The delay timer belongs to the Command's Effect fiber; update holds no timer handle.
3. Runtime execution: `vendor/foldkit/packages/foldkit/src/runtime/runtime.ts:671-716` `forkCommand` defers one microtask and runs `command.effect` via `Effect.runForkWith(runtimeContext)(Effect.forkIn(runtimeScope)(...))` after `provideAllResources` (`:692-697`). `provideAllResources` supplies `__CurrentInterruptRegistry` to every Command (`vendor/foldkit/.../runtime/resourceProvider.ts:150-183`, service provided at `:179-183`).
4. Interruption support exists end-to-end in the vendored source: `Command.define` with `interrupt` wraps `execute` in `__registerKeyWhileRunning(key, effect)` (`vendor/foldkit/.../command/index.ts:340,355,377`; registry/registration `command/interruptible/interruptible.ts`); the generated `Definition.Interrupt(args, toMessage)` builds an ordinary Command whose effect calls `registry.interrupt(key)` → `Fiber.interruptAll` and yields `Interrupted`/`NotFound` (`interruptible.ts`; dist chunk `chunk-QXWUX5SJ.js:50-58,65-108`). An interrupted holder's result Message is guaranteed never to dispatch (library contract in `command/index.ts:71-83`).
5. Current cancel: `src/update.ts:1074-1085` clears `inflight`/`session`/`sessions`, sets `status:"draft"`, advances `token`, and returns **no commands**. The scheduled fiber therefore survives the cancel, sleeps out `delayMs`, issues exactly one further device poll, and its `DeviceAuthPolled` carries an old token that update ignores. That is the S432 state-only behaviour and the open I/O-lifetime gap.
6. Original React runtime-ui: `apps/runtime-ui/app/routes/providers.tsx:729-758` schedules auto-poll with `window.setTimeout` and returns cleanup `window.clearTimeout(timer)`; closing/resetting the session re-runs the effect and cancels the scheduled timer. It does **not** abort an in-flight fetch (no AbortController; a `polling` flag only prevents overlap). Manual "Check now" is a one-shot poll (`:1135-1157`). So the original cancels the scheduled timer but not an in-flight request.

## 2. Minimal correct cancellation contract

- Make `PollDeviceAuthorization` interruptible:
  `interrupt: { keyFields: ["authRequestId"], toKey: ({ authRequestId }) => "device-auth-poll:" + authRequestId }`.
  `authRequestId` is Model-derived session identity (foldkit's rule: keys address Model data, never generated values); `token` advances every poll and is not a stable address, though it remains the fence.
- On `DeviceAuthCancelled`, keep the existing state clearing and token advance, and when `state.session?.authRequestId` is defined additionally return `[PollDeviceAuthorization.Interrupt({ authRequestId }, () => Message.DeviceAuthPollCancelCompleted({}))]`. Both `Interrupted` and `NotFound` map to the same no-op Message (nothing to do in either case).
- Guarantees this yields: cancel during the delay interrupts the sleeping fiber → the fetch is never issued and no timer remains; cancel during the in-flight fetch stops awaiting it → its Message never dispatches (runtime contract) and the fetch may complete only at the network layer; the token is still advanced as defence in depth; restart stays allowed (inflight cleared, new read, new authRequestId is a different key).
- Not claimed: network-level abort of an already-started fetch. Optional second layer: thread the AbortSignal provided to `Effect.tryPromise` into `DeviceAuthClient.poll(authRequestId, signal)` and `fetch(..., { signal })` (`src/device-auth.ts`) so interruption aborts the request; this is a UI-package change but is not required for the minimal contract above.
- Do not return `[Interrupt, Read]` in one batch: commands in one batch run concurrently (library contract, `command/index.ts:81-83`). Restart is a separate user Message after cancel.

## 3. Where each change lives (future implementation; requires Lead-approved write scope)

- `role-model-router/apps/runtime-ui-next/src/commands.ts`: add `interrupt` to the poll definition (keyFields/toKey above).
- `role-model-router/apps/runtime-ui-next/src/message.ts`: add `DeviceAuthPollCancelCompleted: EmptyFields` (+ union member and schema map). Naming follows the library recommendation `CompletedCancel<CommandName>`.
- `role-model-router/apps/runtime-ui-next/src/update.ts`: `DeviceAuthCancelled` returns the Interrupt command when a session exists; add a no-op `DeviceAuthPollCancelCompleted` handler; replace the "runtime owns the timer" comment with the lifetime guarantee.
- `role-model-router/apps/runtime-ui-next/src/device-auth.ts` (optional): `poll(authRequestId, signal?)` + fetch signal pass-through for network-level abort.
- Tests: `test/s425-device-auth-correctness.test.ts` cancel scene (:457-459) currently asserts `Command.expectNone()` and must instead assert/resolve the `PollDeviceAuthorization.Interrupt` command; the update-level cancel test (:270) reads state only and needs no change. New S459 behavioural tests implement §5. **No vendored foldkit/runtime edits.**

## 4. Cross-layer verdict

No runtime executor change is needed: the runtime already provides the interrupt registry to Command effects and registers interruptible definitions while running (§1.3-1.4). The change is confined to the UI package and its tests. Therefore no STOP cross-layer contract is required; the only approval needed before edits is the implementation write scope for the UI files in §3 (outside the current read-only design scope).

## 5. Behavioural RED cases (against current code; implementation phase)

Harness: mounted shell with `deviceAuthFetchImpl` counting every poll request, `intervalSeconds: 1` to bound waits (real timers, ≤ a few seconds per case); the readback/poll bodies are the existing S442 host fixtures.

- **R1 cancel immediately after a poll is scheduled (during delay):** start → resolve readback as pending (poll scheduled, no request yet) → cancel before the delay elapses → wait past delay + margin → assert poll fetch count **0** (today: 1) and model stays `draft` with no `DeviceAuthPolled` applied.
- **R2 cancel during the delay:** same, but cancel mid-delay after 100-300 ms of a 1 s delay → wait → poll fetches **0** (today: 1).
- **R3 cancel after a response with the next poll scheduled:** let the first poll response arrive (fetch 1), wait until the next poll is scheduled, cancel, wait → poll fetches stay **1** (today: 2), and state remains `draft`.
- **R4 restart after cancel:** cancel then start → assert the `ReadDeviceAuthorizations` request occurs and a later pending poll for the NEW authRequestId can fetch (interrupt did not poison the key space); a late interrupt outcome Message is a no-op.
- **R5 no scheduled poll:** cancel while `status:"starting"` (no session) returns no Interrupt command and stays state-only; with a session but no live holder the interrupt resolves `NotFound` and is a no-op.
- Existing coverage must be preserved, not deleted: the s425 scene cancel assertion moves from "no commands" to "the interrupt command with the exact authRequestId key", and R1-R4 add the lifetime fetch-count assertions. The update-level token-fence test (:270) is unchanged and still proves stale results are ignored.

## 6. Edge cases / risks

- Interrupt vs restart race: commands in one batch are concurrent; restart must be a separate Message after cancel (no `[Interrupt, Read]` batch).
- Cancel with no session: no key to address → no Interrupt command (nothing scheduled); second cancel with a session but no holder → `NotFound`, no-op.
- Key scope: keyed by authRequestId, so a retry poll for the same authorization is also correctly interruptible; a new authorization has a different key.
- In-flight fetch may still complete at the network layer; no server-side cancellation is claimed. The interrupt guarantees no further poll request and no dispatched result; the token fence remains as defence in depth.
- Subscription/ManagedResource alternative: foldkit guidance prefers Model-derived lifetime in a Subscription/ManagedResource. A poll loop could be modelled there, but that moves scheduling out of update and would rework the command/request test design; interruptible Command is the minimal correct contract for the current one-shot-command structure. Subscriptions remain a longer-term option, not this slice.

## 7. Limitations

- Design only: no source/test edits, no build or run. Runtime semantics are cited from the vendored source (`vendor/foldkit/.../command/interruptible/interruptible.ts`, `runtime/runtime.ts:671-716`, `runtime/resourceProvider.ts:150-183`) and its library tests, not executed against this app.
- Behavioural RED cases are specified, not executed; the "today" failure counts are inferred from the scheduler path (§1.5), not observed in this design pass.
- Implementation needs the Lead-approved UI-package write scope in §3. S432 state-only cancel and the existing tests are otherwise untouched; no whole-requirement claim (S420/R33/B10 etc. remain open).

## 8. Implementation evidence (S459, UI-only; no commit)

Frozen file hashes (sha256, at freeze; see concurrency note):
- src/commands.ts 171924b49ac1c363716b94e1467384e823219801d6100db0aadf8f83582d62af (poll gains `interrupt: { keyFields: ["authRequestId"], toKey: ({authRequestId}) => "device-auth-poll:" + authRequestId }`)
- src/message.ts eb5d4e31fc48bf5d7a8891ac67d9ba43796ec5fc8e8fb813506988f1bfcce29e (`DeviceAuthPollCancelCompleted: EmptyFields` in the type union + schema map)
- src/update.ts 690308544f4864a7780e8f5cb54c3851bdd8c5f40dc1ab839b2ba5a05eb11a82 (`DeviceAuthCancelled` returns `deviceAuthCommands.poll.Interrupt({authRequestId}, () => Message.DeviceAuthPollCancelCompleted({}))` when a session exists; no-op `DeviceAuthPollCancelCompleted` handler; S425/S459 comments)
- test/s459-auth-cancel.test.ts bdfa904769eefb6aaa600941331ac3f695687e42a18fd7962e527f6fd2b87f4f (R1-R5; production reducer + production Command definitions + real interrupt registry; no scene, no click-budget change)
- test/s425-device-auth-correctness.test.ts 93044e1ce111b7b212f9709cbf7b2aa650dab92ec0fbb6cd9161034f68ec7f55 (cancel scene: `Command.expectHas({name:"PollDeviceAuthorization.Interrupt", args:{authRequestId:"auth-pending"}})` + `Command.resolve(commands.poll.Interrupt(...))` replacing `Command.expectNone()`; update-level token-fence test unchanged)

RED (before implementation, `vitest run test/s459-auth-cancel.test.ts`): exit 1, 4 failed / 1 passed — R1 expected 0, received 1; R2 expected 0, received 1; R3 expected 1, received 2; R4 failed with "expected a scheduled PollDeviceAuthorization command" because the test used the pre-restart token (harness bug, repaired in the test, not a product RED); R5 passed. This matches the approved RED expectation exactly (R1 1 → 0, R3 2 → 1).

GREEN (after implementation): `vitest run test/s425-device-auth-correctness.test.ts test/s459-auth-cancel.test.ts` → 2 files passed, 22 tests passed, exit 0 (s425 all 17 including the updated cancel scene; s459 all 5 including R1/R2/R3/R4/R5).

Typecheck: `tsc --noEmit -p tsconfig.json` exit 0 at freeze. Honest note: an earlier tsc run during the concurrent S458 local-policy edit reported one unrelated error (`src/update.ts:136`, `localPolicy` readback missing); that error disappeared when S458 settled. No tsc error ever pointed at an S459 hunk.

Lint: `anti_slop_lint` absolute targets, `effect:true`, `filesScanned=1` each — commands.ts 25 pre-existing findings, update.ts 11 pre-existing, message.ts 0, s459 test 0 (after `// SAFETY:` comments for the three deliberate command/result assertions), s425 test 0. No finding in the S459 hunk regions (commands.ts 360-395, update.ts 1085-1130).

Scope honesty / concurrency hazard: another worker's S458 local-policy changes were present in the same package and shared files (`init.ts`, `legacy-redirects.ts`, `readback.ts`, `route.ts`, `runtime-endpoints.ts`, `view.ts`, plus hunks in `commands.ts`/`update.ts`/`message.ts` and an untracked `test/s458-local-policy.test.ts`). The two slices co-edited three files; the hashes above freeze the whole files at 09:40, so they include the S458 hunks too. No commit; no runtime/vendor/resourceProvider change; no provider/port use; the optional AbortSignal layer was NOT added (contract drift avoided).


## 9. S463 repair evidence (s397 expectation + update.ts re-apply after concurrent overwrite)

Blocker encountered and repaired: the first S463 run found another worker actively writing the shared `src/update.ts`; it removed the two S459 hunks and left the file mid-refactor (learning-ranking imports/type errors, no S459 symbols). Per the Lead's WAIT/GO, the writer was serialized (S458 reported settled/frozen at `update.ts` sha256 `e9f2730965a846f50900520eebceb146d0c281cb9a9ab49747e345b12707719a`, 69912 B). I verified that exact hash before touching the file, then re-applied ONLY the two S459 hunks to it: `DeviceAuthCancelled` returning `deviceAuthCommands.poll.Interrupt({authRequestId}, () => Message.DeviceAuthPollCancelCompleted({}))` when a session exists (state clear/token advance kept) and the no-op `DeviceAuthPollCancelCompleted` handler. No other file was written; no S458/S269 file was touched.

s397 expectation repair: the reducer cancel test now asserts `["PollDeviceAuthorization.Interrupt"]` with args `{ authRequestId: "auth-1" }` instead of `[]`; the late-poll token-fence assertions are unchanged.

Refrozen gates (settled tree):
- `vitest run test/s397-device-auth-form.test.ts test/s425-device-auth-correctness.test.ts test/s459-auth-cancel.test.ts` → 3 files, 37 tests passed, exit 0.
- `tsc --noEmit -p tsconfig.json` → exit 0.
- `anti_slop_lint` absolute, `effect:true`, `filesScanned=1`: update.ts 10 pre-existing findings (elsewhere in the file), s397 0 findings; zero findings in the S463/S459 regions.

Refrozen hashes (sha256):
- src/update.ts `30cbaf209e569021f300fdcd6a6fac18f76c52d78fd57e95826a21d45a4f8576`
- test/s397-device-auth-form.test.ts `4a0a503d5735398f3c41ec2ddefe8e0f49331ab4cdbba2d8e23e26d828131a5e`
- src/commands.ts `2dfb7a7b38487d64f17d6d9cb1d16bb462a74881a120a10bd9127e470d5bcb5c`
- src/message.ts `529926f2da856b127e28b962d70919c6c7a86805637af17b812ac0ea4d27e830`
- test/s425-device-auth-correctness.test.ts `93044e1ce111b7b212f9709cbf7b2aa650dab92ec0fbb6cd9161034f68ec7f55`
- test/s459-auth-cancel.test.ts `bdfa904769eefb6aaa600941331ac3f695687e42a18fd7962e527f6fd2b87f4f`

Limitations: uncommitted shared worktree; the S458 worker's hunks are present in update.ts and its hash includes them; any further write to update.ts invalidates the freeze. No commit, no provider/ports; UI tests use the fake client + real interrupt registry; no packaged/browser proof.
