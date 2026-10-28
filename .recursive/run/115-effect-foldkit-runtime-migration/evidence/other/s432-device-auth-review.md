# S432 — independent review: S425 device-auth correctness repair

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only product/test/config; no product edits, no commit. Patch basis 71151644. Inputs read: S425 task, S420 audit/UI report, real host device responses, R20/R21 scope, 00-worktree basis. Disposable temp SQLite/tsx probes only; probe files removed.

## Verified artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/device-auth.ts` | `3D0341E54BAA69E4FEC9D92DB45C50D24F28C1AB9CB08121B6F2E25B36A6DCA4` | 12505 |
| `src/control-view.ts` | `F70A191BBF6F22F3E2CF279A9C91C219C91E81035C39E60BF031CEEBD0300C1F` | 18598 |
| `src/update.ts` | `63D12114C2923318D761241DA2D20F8B4B0F9988376AD8674B20EF3B8BEC4715` | 58210 |
| `test/s425-device-auth-correctness.test.ts` | `C97E0CBE250FC57C4268B7EAB9AF983B5143153F8C9425DE37AD883DBDAB5589` | 13093 |

All hashes match the frozen values. s397 remains the prior hash `B74F04D7…1FB`. The diff is confined to the listed auth/parser/view/update-cancel scope.

## What passes

- **Host status parsing:** `parseStatus` preserves `failed` and `expired` as terminal (unknown/missing -> failed), never pending (`device-auth.ts:257-261`). The test fixtures use the real host poll bodies with `lastError` (`s425:110-125,146-166`).
- **Finite positive retry:** `positiveSeconds` rejects 0/negative/NaN; `deviceAuthPollDelayMs` uses retryAfterSeconds, then intervalSeconds, minimum 1s (`device-auth.ts:181-195`). The retry interval test failed on the pre-fix product and now passes; zero/negative fall back to 5s (`s425:121-132`).
- **Safe pending view:** pending renders the real userCode and a verification link only for parsed `https:` URLs up to 2048 chars; `javascript:`/data/file and unsafe values show an honest unavailable message, with `target=_blank` and `rel=noreferrer noopener` (`device-auth.ts:197-219`; `control-view.ts:109-150`). The mounted test checks the code, href, target/rel and `tabIndex=0` (`s425:268-296`).
- **Cancel/restart state:** cancel clears `inflight`, session, sessions and status; the token advances so a late poll is ignored. `DeviceAuthStartRequested` then permits a new read (`update.ts:874-883,970-980`; `s425:177-189`). This is explicitly **STATE-ONLY**: the scheduled poll timer is not cancelled by this slice; an old poll may still execute and is only fenced by the advanced token. I do not accept a full lifetime/cancellation contract.
- **Terminal/retry identity:** failed/expired polling stops, clears inflight, keeps the same authRequestId and shows lastError; unsafe URL fallback is tested. No new provider call is made.

## HOLD — pending poll replaces the restored session and loses the authorization challenge

The host's real pending/transient poll response contains only `{authRequestId, providerAccountId, status:"pending", retryAfterSeconds, lastError}` (host `index.ts:33255-33278`), not userCode/verification fields. The initial restored session from the readback does contain `userCode`, `verificationUri`, and `verificationUriComplete` (`s425:48-59`).

`DeviceAuthPolled` on pending assigns the parsed poll session directly:
`model: { ...state, session, status:"pending" }` (`update.ts:926-932`). It does not merge the initial challenge fields. I reproduced this with a direct shellUpdate probe:

- initial pending session: authRequestId auth-a, userCode ABCD-EFGH, https verification link;
- deliver `DeviceAuthPolled({session:{authRequestId:"auth-a", providerAccountId:"openai.personal.default", status:"pending", retryAfterSeconds:5}, token:1})`;
- resulting `deviceAuth.session` = `{authRequestId:"auth-a", providerAccountId:"openai.personal.default", retryAfterSeconds:5, status:"pending"}` — **userCode and verificationUriComplete are gone**.

Impact: after the first real poll, the view stops rendering the code/link and shows “Verification link unavailable”; the user cannot complete the authorization even though the restored list session had it. The mounted test waits for the link before the first 5s poll, so it misses this. Required: merge poll status/retry/reason into the existing same-authRequestId session, retaining userCode/verification fields (or carry the challenge separately), and add a mounted/state test that polls pending once and still shows the code/link. Also assert terminal/retry keeps sameauthid and unsafe URL fallback after that merge.

## Tests/run

- RED `s425-red.log`: 9 failed / 1 passed (10 tests) against current product, no setup failure; corrected tsc 0.
- Retry-interval RED `s425-red2.log`: 1 failed / 10 skipped, zero/negative interval assertion.
- Our final run: **2 files / 26 tests passed** (s425 11 + s397 15); UI tsc exit 0.
- Mounted test verifies code/link/keyboard focus before the first poll; no post-poll retention assertion.

## Lint (absolute filesScanned=1)

- `device-auth.ts`: 13 findings = frozen baseline residual; none introduced on the new retry/URL/parser lines (the findings are the existing unknown/typeof/dictionary/cast/spread set at 228-305).
- `control-view.ts`: 0; `s425` test: 0.
- `update.ts`: 10 pre-existing findings at 170-173/568/595/604, none on the DeviceAuthCancelled lines. No new diagnostic/auth finding.

## Bounded verdict: HOLD (1 repair)

The failed/expired/retry/unsafe-link/cancel-state pieces are correct and tested, but the pending poll **drops the restored userCode and verification link**, a concrete user-facing regression that the mounted test misses because it asserts before the first poll. Merge same-authRequestId session fields on pending and add the post-poll mounted/state assertion. With that, this would be a bounded auth PASS; it is not full M8 and not a full cancellation/lifetime contract.

No product/test/config file was modified; no commit.

## Final re-review after S432 challenge merge — PASS (bounded)

Active model verified **deepseek-flash**. Final hashes: device-auth `384343ABFA069C609E186A05809B789AF8F54C66FB03166A51BA6B1A57B99F53` (13635 B); update `7ECD7283F712B86D480DE9DA9DF8618805F75F2D98F96904FCC71B3D3D9ED19B` (58567 B); s425 test `237B3707F256E85C596BBE4F30385BADADAB44407C279AD1054C6EFE52E1518F` (17152 B); control-view unchanged `F70A191B…BD0300C1F`. No product edit or commit by me.

- **Merge semantics:** `mergeDeviceAuthPoll` preserves only the challenge (`userCode`, `verificationUri`, `verificationUriComplete`) and `intervalSeconds` when the poll is the **same** authRequestId and still pending, using nullish coalescing; the polled status/retryAfterSeconds/lastError win (`device-auth.ts:204-222`). A foreign auth or a terminal poll returns the polled session unchanged, so no stale challenge is resurrected. `DeviceAuthPolled` uses `nextSession` for pending/connected/terminal branches (`update.ts:916-945`).
- **Mounted after-poll:** the new test starts from a restored pending session, waits for a real first pending poll, waits an extra 80ms, and asserts the same userCode and `https://auth.openai.com/device?user_code=ABCD-EFGH` link remain (s425:363-389). This closes the earlier before-poll-only gap. Foreign-auth and terminal-no-inherit tests are present (s425:218-245). Unsafe protocol fallback remains tested.
- **RED/GREEN:** `s432-red.log` is the genuine pre-merge RED: 2 failed / 13 passed, including the state merge and mounted after-poll tests; `s432-green.log` is 2 files / **30/30 passed**, exit 0, UI tsc 0. Our independent run also 30/30 and tsc0.
- **Lint absolute (filesScanned=1):** device-auth **13** = baseline residual (no new line/rule), control-view 0, s425 0, update 10 pre-existing at 170-173/569/596/605. No new finding.
- **Timer/I/O limitation remains open:** cancel is state-only, resets inflight/token, and may leave the previously scheduled poll timer running; the token fence ignores its result. I do not accept a full cancellation/I/O lifetime contract.

### FINAL BOUNDED VERDICT: PASS

The pending challenge survives same-auth polls, foreign/terminal polls do not inherit it, the mounted post-poll behavior is tested, and failed/expired/retry/safe-link/cancel-state behavior remains green with no new lint. This is not full M8 and not a full timer-cancellation contract. No product/test/config file was modified; no commit made.

