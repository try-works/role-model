# s425 — Device-auth correctness repair

Status: verified-bounded — S432 final independent bounded PASS; NOT full M8/R13 (cancellation STATE-ONLY; catalogue/modal/copy/Check now/lifetime remain)
TDD Mode: strict
Inputs: S420 audit reports, original00-requirements/source-proposal/02-plan/00-worktree, owner E1/E2 decision. Patch basis public71151644/privatea86ea7a9; no baseline switch.

Expected write scope: runtime-ui-next/src/device-auth.ts; src/control-view.ts DEVICE-AUTH section only; src/update.ts DeviceAuthCancelled only; test/s425-device-auth-correctness.test.ts; existing test/s397-device-auth-form.test.ts only if needed. No other update/control-view regions, commands/app/model/messages or route files.

Read S420 audit/UI report and actual host device start/list/poll responses. Strict behavioral RED before product edit. Fix real host failed status interpreted pending, preserve typed error/reason and real retry interval where supported; cancel must clear inflight and permit new start, stale results remain fenced. Pending view must render actual userCode and verification link before authorization (safe URL protocol allowlist), keyboard-accessible controls; no new real provider calls. Test real parser fixtures from host and mounted pending code/link, cancel->restart through shellUpdate. Avoid claiming timer cancellation if only state fencing. Read recursive-tdd/effect-ts and design skill before work. Treat original payload contracts as authority. No new endpoint/admission edits.

Coordination: only listed scopes; all peers share filesystem. Read current files before edit; prefer edit, no whole-monolith scripted rewrites or checkout/reset. No formatter on shared files. No commit. Before substantive work verify live deepseek-flash via list_agents; report mismatch. Evidence run logs s425-red/green.log; report actual counts, hashes, tsc/syntax, anti_slop_lint filesScanned>0. Keep existing operator3456/3457/3458/state untouched; os.tmpdir disposable roots. Independent review must be different member after freeze. No whole-feature COMPLETE.

## Completion record (author s10-capqueue-close; independent reviewer s9-private-readonly, deepseek-flash)

Verdict: PASS (bounded auth correctness) — evidence/other/s432-device-auth-review.md (final review sha256 AE4E4A5A7D781D34F59B91EEB02DD0320DA1B6C357EA334AC62EFE0706B97BD1). Lead acceptance: evidence/other/s437-device-auth-lead-acceptance.md — Audit PASS (bounded auth correctness). Lead committed the frozen slice as 54e4e49e; the author made no product/test edits after freeze and no commit.

RED (before product): s425-red.log 9 failed/1 passed; s425-red2.log retry-interval 1 failed/10 skipped; s432-red.log challenge retention 2 failed/13 passed (same-auth state merge + mounted post-poll).
GREEN (frozen): s432-green.log — 2 files, 30/30 passed (15 s425/s432 + 15 s397), exit 0; UI tsc exit 0. Lead neighbors run: s432-lead-green.log — 4 files, 50/50.
Lint (absolute, filesScanned=1 each): device-auth 13 (baseline residual reduced from 19; NEW=0), update 10 pre-existing (none on changed lines), control-view 0, s425 test 0.

Final sha256:
- src/device-auth.ts 384343ABFA069C609E186A05809B789AF8F54C66FB03166A51BA6B1A57B99F53
- src/control-view.ts F70A191BBF6F22F3E2CF279A9C91C219C91E81035C39E60BF031CEEBD0300C1F
- src/update.ts 7ECD7283F712B86D480DE9DA9DF8618805F75F2D98F96904FCC71B3D3D9ED19B
- test/s425-device-auth-correctness.test.ts 237B3707F256E85C596BBE4F30385BADADAB44407C279AD1054C6EFE52E1518F

Repaired behavior: host failed/expired/unknown no longer pending; reason and finite-positive retry preserved; pending view renders the real userCode plus an https-only verification link; cancel clears inflight (STATE-ONLY) with token fencing; a same-auth pending poll keeps the challenge while foreign/terminal polls never inherit it.
Retained gaps: cancellation is STATE-ONLY (scheduled timer/fetch may still execute; results are token-fenced, no I/O lifetime contract); catalogue/modal/copy/Check now/lifetime refactor not done; not full M8/R13; the link protocol allowlist does not authenticate provider origin.
