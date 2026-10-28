# s425 — Device-auth correctness repair

Status: pending
TDD Mode: strict
Inputs: S420 audit reports, original00-requirements/source-proposal/02-plan/00-worktree, owner E1/E2 decision. Patch basis public71151644/privatea86ea7a9; no baseline switch.

Expected write scope: runtime-ui-next/src/device-auth.ts; src/control-view.ts DEVICE-AUTH section only; src/update.ts DeviceAuthCancelled only; test/s425-device-auth-correctness.test.ts; existing test/s397-device-auth-form.test.ts only if needed. No other update/control-view regions, commands/app/model/messages or route files.

Read S420 audit/UI report and actual host device start/list/poll responses. Strict behavioral RED before product edit. Fix real host failed status interpreted pending, preserve typed error/reason and real retry interval where supported; cancel must clear inflight and permit new start, stale results remain fenced. Pending view must render actual userCode and verification link before authorization (safe URL protocol allowlist), keyboard-accessible controls; no new real provider calls. Test real parser fixtures from host and mounted pending code/link, cancel->restart through shellUpdate. Avoid claiming timer cancellation if only state fencing. Read recursive-tdd/effect-ts and design skill before work. Treat original payload contracts as authority. No new endpoint/admission edits.

Coordination: only listed scopes; all peers share filesystem. Read current files before edit; prefer edit, no whole-monolith scripted rewrites or checkout/reset. No formatter on shared files. No commit. Before substantive work verify live deepseek-flash via list_agents; report mismatch. Evidence run logs s425-red/green.log; report actual counts, hashes, tsc/syntax, anti_slop_lint filesScanned>0. Keep existing operator3456/3457/3458/state untouched; os.tmpdir disposable roots. Independent review must be different member after freeze. No whole-feature COMPLETE.
