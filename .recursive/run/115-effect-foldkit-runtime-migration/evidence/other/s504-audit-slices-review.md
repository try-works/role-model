# S504 independent review — S502 dialog a11y audit + S503 trigger size

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified

- `src/ui/dialog.ts` = `B9A9C81D3551DA3A7D53107A6E4C422477DFAE1E53BBA95BE7F4EE8E952A51BF` (match).
- `src/update.ts` = `7E84C61081A848AB37EDAA49B032AEE16DDA315DC270321CD3E127A168530285` (match).
- `src/ui/listbox.ts` = `1D3AA4DBAD7969FF8EED9937D268C5BE041B00272193A5AAD6725223FE1790B5` (match).
- `test/s491-listbox.test.ts` = `4D2AB79BDEE084E6C2BA2CE1369A24FA0EB310E01A1783088B0CDC360CD32BE2` (match).
- `scripts/runtime/dialog-a11y-audit.mjs` = `319314C5CE0BC481173D12B475386FF9761E1AD37ED83D90E6C2621C818F9F41`, 11348 B (match).
- Root `package.json` = `F8448F4D1AA3471EC1BECFFF14A4FC6CADF6EEA4443BED56315DAF5327BD2002`, 10668 B (match).

## Verdict: **S502 PASS; S503 HOLD; overall HOLD**

## S502 — PASS

- The audit is real Chrome/CDP: it spawns the packaged exe, seeds one pending device-auth row in the host SQLite store, launches headless Chromium with a DevTools endpoint, and asserts `aria-modal`, initial focus on Dismiss, Tab containment, Escape close and focus return to “Start device authorization” (`dialog-a11y-audit.mjs:66-207`).
- RED final4 is clean: `dialogs=0 modalAttrs=0`, inline pending session markup, timeout waiting for the dialog (`s502-red.log`).
- PASS final5: exact PASS line for all five assertions (`s502-green.log`). This closes the S501 named deferral for this route.
- Wiring fix is the **production restore path**, not a test-only hack: `DeviceAuthSessionsLoaded` / restore branch now wraps the pending model with `withDeviceAuthDialog(...)` (`update.ts:1112-1118`), so a pending session restored from the host opens the dialog just like a fresh start. That matches S497 design intent.
- `package.json` adds `runtime:dialog-a11y-audit`; node --check passes.

## S503 — HOLD (evidence and lint)

### What is correct
- `requestsListboxView` adds `buttonClassName: "min-h-6 min-w-6"` (`listbox.ts:53`); the target uses the same wrapper, so both triggers get the class.
- Unit/regression suites: **51/51** across s491/s499/s397/s425/s458/s111; `s491` target/metric 2/2; s247 click budget 3/3; UI tsc **0**.
- lint: update 10 = HEAD, view 30 = HEAD; dialog/listbox/s491 test 0.

### Blocking findings
1. **No 20/20 packaged audit evidence.** `s503-audit.log` is **19/20 with `/models` FAIL (39 chars)**, while `/requests` PASSES. That contradicts the lead-authoritative matrix (“/models PASS 1201; only /requests failing pre-fix”) and does not demonstrate the task’s required post-fix **20/20** result. The provided log cannot distinguish pre-fix from post-fix for `/requests` either. Need a fresh final5 run with the stable static root showing 20/20, or a Lead-owned artifact; the `/models` 39-char state needs a clean rerun and explanation.
2. **The size assertion is class-based, not geometric.** `s491-listbox.test.ts:51-52` now asserts `className` contains `min-h-6`/`min-w-6`. The S503 task required a DOM test asserting `offsetWidth/offsetHeight >= 24`; the RED log shows the earlier `style.minHeight === "24px"` assertion was replaced. Class presence does not prove the rendered target is 24x24; the packaged audit is the only real proof, and it is missing 20/20.
3. **New audit script has a lint finding.** `anti_slop_lint` on `scripts/runtime/dialog-a11y-audit.mjs` reports **1 `no-runtime-typeof` at line 189** (`typeof code !== "string"`), so the “lint zero added-line” requirement is not met for the new file.

### Required before PASS
- Re-run `audit-rendered-ui` on final5 with a clean/fresh state root and the fixed static root; capture **20/20**, including `/requests` and `/models`, or provide the Lead-authoritative run artifact. Explain the 39-char `/models` page only if it still occurs.
- Change the size test to assert actual geometry (`offsetWidth/offsetHeight >= 24`) or add that assertion alongside the class; do not substitute class strings for the required size proof.
- Resolve the lint finding in the audit script (parse/settle the code value without a runtime `typeof` narrowing, or an explicit reviewed suppression) and re-run lint.

## Verification I ran
- s499/s397/s425/s458/s491/s111: **51/51**; s247: **3/3**; UI tsc **0**.
- anti-slop: app files as above; audit script **1 finding**.
- No live packaged exe/Chrome run by me; I relied on the author logs and source inspection.

## Limitations

- Read-only; I did not rebuild or re-run the packaged audit matrix.
- No whole Workspace/W1b/W1c claim; S502 is accepted as a bounded browser audit for the device-auth route only. S503 cannot be accepted until the 20/20 evidence and lint gaps are closed.


---

# S504 FINAL re-review on refrozen bytes — **bounded PASS**

Date: 2026-10-29. Read-only; this append only.

## Refrozen hashes verified
- `src/ui/listbox.ts` = `1B7BB0C2F20647BC84E1CD86EBEB451A5B7FDE3928CD7F7A3FAEB4A2D89F5AEF` (match).
- `test/s491-listbox.test.ts` = `D777D6ABF1367A7BCB3266F8AB378460FF5EFC4C498CBA1110ADC5EE47431200` (match).
- `scripts/runtime/dialog-a11y-audit.mjs` = `04F7618EB0DBCC0A415762B40B70DF0A264285A1D5435F6EFE5ED62E9CFDC0A6` (match).
- Unchanged: dialog `B9A9C81D...`, update `7E84C610...`, s499 `604A63C4...`, s425 `414A4CB5...`, package.json `F8448F4D...` (all match).
- Active model: `s9b-eventlog` = **deepseek-flash** via `list_agents`.

## Prior S503 HOLD items — resolved
1. **Geometry assertion:** the test now reads `getComputedStyle(trigger).minHeight/minWidth` and asserts `>= 24`; the fix supplies inline `minHeight/minWidth: 24px` via `buttonAttributes` (`listbox.ts:54-56`). `s503-red.log` is the genuine NaN RED (`expected NaN to be greater than or equal to 24`), not a class-name check.
2. **Lint:** the audit script’s `typeof` at the old line 189 is gone (`String(code).trim()`); `anti_slop_lint` effect:true on the script is **0 findings, filesScanned 1**.
3. **Suites:** s491/s458/s25d/s111 = **4 files, 28/28 passed**; s499/s397/s425 = **3 files, 33/33 passed**; combined 61/61. UI `tsc --noEmit`: **0**.

## Verification executed
- anti-slop: update **10 = HEAD baseline**, view **30 = HEAD baseline**; dialog/listbox/s491 test **0**; audit script **0**.
- No new files or unrelated edits beyond the previously reviewed S502/S503 scope.

## Verdict: **bounded PASS** for the implementation and local evidence
The two prior HOLD items (geometry test and audit-script lint) are fixed, the RED is genuine, and the local suites/tsc/lint are clean. S502 remains accepted as a bounded real-Chrome audit.

## Explicitly deferred packaged proof
The required **20/20 packaged `audit-rendered-ui`** result is **not yet in this run**; the prior `s503-audit.log` was 19/20 with `/models` 39 chars, and the lead-authoritative matrix will be produced after the final6 rebuild. Acceptance of the packaged `/requests` control-size result remains conditional on that **final6 20/20** artifact (including `/models` PASS). This review must not be cited as proof of the packaged 20/20 result. Geometric browser proof is the packaged `/requests` control-size rule, per the lead.

## Non-blocking notes
- Inline `minHeight/minWidth` styles are intentional and testable; no visual layout change beyond the minimum target.
- No whole Workspace/W1b claim; only S502/S503 bounded slices are reviewed.
