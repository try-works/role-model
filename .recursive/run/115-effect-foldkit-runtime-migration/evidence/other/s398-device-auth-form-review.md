# S398 — independent review: S396a provider device-auth connect form

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 6 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/device-auth.ts` | `DE1AFA4562F25888D12EF19467C01231035D8733217F7DEA8B35C326F0C862D6` | 8577 |
| `src/message.ts` | `858E210581A1384D5EEB46BFF3458BCB9A0C69630FA35F8E284EC2F6C7B4169E` | 9428 |
| `src/model.ts` | `6D439EAA70B787288A80916E25A3BA7499B7B9545F57CC6EA22C4AF54F46AA18` | 1811 |
| `src/commands.ts` | `A0FCADE8A32BF8F06236D7B17B514EAEAD6739FDF3FB0E742C2DDFE6062C5999` | 19421 |
| `src/update.ts` | `D4D57DD08304CCC800709067725999A3BDA573568214CEA3E6D1F885FC588ADD` | 42299 |
| `src/app.ts` | `09D40482761C075E69FE8E7855029294A51450AF7905AADEBD31BE03E5E12166` | 6360 |
| `src/control-view.ts` | `2120BF71D0BCFE49B977D7F0DCC62E462181CC29FBBF67FD1B238C45D895A12D` | 9296 |
| `src/view.ts` | `6D6452D48F363AC9A7FD90B9D9F7F91756537CFB41CBB2A68AE9EA383A04C5D7` | 69544 |
| `test/s397-device-auth-form.test.ts` | `E61C77B9F612D19D10572A6136E055C16388784A42F78F524BE465EBFD5FF1C0` | 8812 |

All match. Affected 6 files: **138/138 pass**; UI tsc exit 0.

## Q1 — Start payload contract: HOLD

The original `providers.tsx:1091-1106` start sends `providerAccountId, providerId, providerKind, variantId, allowedModels, modelRoleBindings (computed via buildModelRoleBindings), deniedModels, entitlementTags, budgetPolicyRef, quotaPolicyRef` — no `region`. The new payload adds `region` (`device-auth.ts:92-104,122-136`) and always sends `modelRoleBindings: []`, while `allowedModels` is every selected model (the original uses one selected model). The host accepts the optional region and empty bindings, so it is a compatible extension rather than a wire failure, but the claim “exact start payload” is not true; the test uses `toMatchObject` and does not assert exact equality (`s397:64-81`). Required: either remove region/use the computed bindings to match the original contract, or document the extension (and tighten the test) explicitly.

## Q2 — Conflict restore: PASS

Loaded pending session plans `restore` (`device-auth.ts:117-121`); the update returns exactly one `PollDeviceAuthorization` and no start (`update.ts:844-849`); the test asserts the single poll and authRequestId (`s397:154-161`). PASS.

## Q3 — One poll in flight: HOLD

The poll command itself is one Effect sleep+fetch (`commands.ts:349-363`), but there is no in-flight guard in the update: `DeviceAuthRetryRequested` unconditionally schedules another poll if a session exists (`update.ts:892-906`), even while a slow poll is outstanding, and only token-fences the late result afterward. The start button is `AriaDisabled(busy)` with an always-attached OnClick, while `DeviceAuthStartRequested` has no busy guard (`control-view.ts:51-59`; `update.ts:828-834`), so a double click can also open a second read/start. The test only retries after a failure and does not simulate a slow poll/second click (`s397:173-182`). Required: add an explicit in-flight/status guard (and real disabled semantics) so a slow poll cannot stack a second, plus a test.

## Q4 — Retry same authRequestId: HOLD (not reachable from the form)

The state transition keeps `state.session.authRequestId` on retry (`update.ts:892-906`), and the unit test covers that (`s397:173-182`). But `renderDeviceAuthorizationForm` has only Start and Cancel buttons; `DeviceAuthRetryRequested` is declared in message/update and has no UI control (`control-view.ts:41-76`; grep finds no view reference). After an error the user can only press Start, which clears the session and starts a new authorization rather than retrying the same one. Required: wire a Retry action (visible in error state) or drop the claim.

## Q5 — Cancel token fence: PASS

Cancel clears session/sessions, returns to draft, and increments token (`update.ts:908-915`); a late poll with the old token is ignored (`s397:184-193`). PASS.

## Q6 — Controlled form/error draft: PASS for state

Fields are controlled by Value/OnInput; invalid validation leaves the draft and sets the error (`update.ts:839-842`); failure keeps session/authRequestId and error. The test covers validation and failed retry state (`s397:110-115,173-178`). PASS. The activation fan-out is one command per unique model (`s397:195-203`).

## Q7 — Run: PASS

6 files **138/138 pass**; UI tsc exit 0.

## Q8 — Lint: HOLD

`anti_slop_lint(test/s397-device-auth-form.test.ts)` reports two findings: `require-safety-comment-for-type-assertion` at `:57` (the `as typeof fetch` cast) and `no-runtime-typeof` at `:58` (`typeof init?.body`). The task's “lint clean” claim is false. Required: typed fetch wrapper/SAFETY comment and a narrow init type instead of runtime typeof.

## VERDICT: HOLD (3 repairs)

1. **Align or document the start payload:** remove the `region` extra and send the computed `modelRoleBindings` (or explicitly document the extension and make the test assert it exactly); current test only uses `toMatchObject`.
2. **Enforce one poll in flight and expose retry:** guard retry/start against pending/in-flight state (real disabled + update guard), and wire a Retry control that keeps `authRequestId`; otherwise a slow poll can stack and retry is unreachable from the form.
3. **Fix the s397 lint findings** at :57/:58 (typed fetch/init, SAFETY) — the “clean” claim does not reproduce.

No product file was modified; no commit made.

## Final re-review after payload/in-flight/retry fixes — HOLD (2 remaining)

Final hashes: device-auth BF77D9F3A413236A76A8B599A253FCB9333CDD24A1AAD8056C56F8D1AF4B216B (9044 B); update D8D74C3F4FBD327B72A889ED248B3769F7930ADE8176852BAA3EECBF5E30BF6A (42698 B); control-view 64C100B4F112FE625A478D76FAED9122D797884BBA8EA3CB62154BC44F1D4F08 (9802 B); s397 test EA13B7F57344016A6C3E97C70F03A32F62E2DED761E9B814AA51AC4A779A59BF (12183 B). 6 files 140/140; UI tsc 0.

- **Payload:** device-auth now sends NO region; modelRoleBindings is a per-selected-model array with empty role IDs; the client test asserts the shipped payload with toEqual (s397:69-98). PASS.
- **Retry control/retry-after-settle:** a Retry button appears only on error and sends DeviceAuthRetryRequested (control-view:69-81); retry refuses while inflight and proceeds once inflight false (update:892-912); tests cover both (s397:201-208). PASS.
- **One poll in flight is still incomplete:** DeviceAuthStartRequested has NO inflight/busy guard and the form's Start button still only sets AriaDisabled(busy) with an attached OnClick (control-view:51-59; update:828-834). A click while a slow poll is pending clears the session, increments the token and starts a new read/start, leaving two requests in flight (the old one is only token-fenced on completion). The test covers retry refusal but not a Start click while inflight. Required: refuse/disable Start while inflight (real disabled/guard) and add that test.
- **Lint still not clean:** anti_slop_lint(test/s397) reports require-safety-comment-for-type-assertion at the fetch cast (reported :251, cast at :257; no SAFETY comment). The claim of clean lint does not reproduce. Required: add SAFETY or a typed fetch wrapper.

## FINAL VERDICT: PASS

Final update hash 6903B6A00B60F21F6856E89CD407E1D63D5FD04CA3E401CD22289E419967B02C (42992 B); s397 test B74F04D7BA54EBC4AC5E94645F46567AA50F174CC94FADFE3C1DFE7D813EB1FB (12945 B). DeviceAuthStartRequested now refuses while inflight/starting/pending (update:828-837); the retry control is reachable and the retry guard remains; the s397 test lint is **0 findings**; 6 files **141/141**; UI tsc 0.

No remaining items. No product file was modified; no commit made.

