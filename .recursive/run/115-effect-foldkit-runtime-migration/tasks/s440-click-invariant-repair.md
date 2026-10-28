# S440 — preserve coverage while repairing click invariants

Status: verified-bounded — S442 final independent bounded PASS (test-only repair; not full browser/mount DOM proof)
TDD Mode: strict (testmaintenance baselineRED)
Public basisd6043768; S420audit/S438checkpoint/02plan scene-first guidance. ExistingS247 ratchet currently31clicks>27, perfileunregistered s397/s425. Expectedwrites ONLY test/s397-device-auth-form.test.ts,test/s425-device-auth-correctness.test.ts and NEW dedicatedscene tests if needed. May read allsupport/scenes, but do NOT change source/helpers or s247budget. Endpointauthor owns source and s404, no overlaps.

Baseline run node --test test/s247-click-budget.test.mjs and capture actual3fail BEFORE editing. Convert appropriate new authmount clickdriven scenarios to genuine Foldkit scene/story steps capturing/rendering actual viewevents+update+command contracts using existing support. Preserve exactrequest paths/bodies, viewevent-to-command integration, retry/cancel/restore/poll code+link and no-double-submit assertions. No delete/commentout coverage. NO replacing .click() with disguised dispatchEvent/newMouseEvent/call/bracketaccess/helper containing equivalentclick outside scan. No addingbudget/renamingfiles/extensions/hidingtests. If scene tool cannot prove same mount+client behavior, STOP with exact evidence, propose a design; do not forcegreen by hiding the test. A genuine dispatchOf rendered Html event through scene and running real command/client is acceptable per existing scene pattern, not hand-made state-only substitute.

Need mutation sensitivity: a temporary disposable copy/probe (no sourceoverwrite) with retry/start eventwiring disconnected must fail retained integrationassertion; report if infeasible, donot fabricate. Then run bothauthsuites/newscene+all20nodeinvariants+UItsc, capture s440-green; anti_slop_lint absnonempty. Live verifyFlash; sharedtasklist/get/claim; no commits; finalhashes freezes. Independentreview mandatory. If 0clickratchet can be achieved only losingUIcoverage, STOP.

## Completion record (author s10-capqueue-close; independent reviewer s10-reviewer, deepseek-flash)

Verdict: PASS (bounded) — evidence/other/s442-click-invariants-review.md sha256 06DACC6DBC61019C53DEF702E807E2BFDF4E53DE65FCC131B31C19473DBED62A. Lead committed the frozen repair as 8aaadb86 (test(ui): preserve auth wiring with exact-command scene steps; worktree HEAD at closeout). The author made no product/source or s247-budget edit and no commit; the committed test files are byte-identical to the frozen hashes below.

Scope: only test/s397-device-auth-form.test.ts and test/s425-device-auth-correctness.test.ts (converted in place; no new scene file needed).

RED: evidence/logs/s440-red.log — s247 baseline 3 fails before edits (31 clicks > 27; s397 2 / s425 2 over/unrecorded). evidence/logs/s442-red.log — exact-args harness RED: executed poll args (delayMs 0 / intervalMs 1000) vs generated (5000/5000) deep-equality failed (1 failed | 16 skipped).

Repair (exact-args real-wait bridge): one exact args object per command is used to execute the production defineDeviceAuthCommands(real client) effect under the real clock (generated 1s/5s sleeps; per-test timeout 20s) and asserted in the scene with Command.expectHas plus a tap deep-equality of the actual pending command args; the actual returned Message is replayed with Command.resolve. No delay override. Named DeviceAuthReadArgs/DeviceAuthPollArgs union; SceneSimulation-typed tap. Honest split: scene proves view→update→generated command args; the test-side effect proves those same args→real client result. It is not a claim that the scene executes the client.

Coverage restored: SSR keyboard-focus assertion (renderToString {isHydratable:false} + happy-dom): A, tabIndex 0, exact https href, target _blank, rel "noreferrer noopener"; rendered draft input + Add model path scoped inside the device-authorization section with labels Provider/Variant/Model before Start (no prefilled-draft substitute). Mutation evidence preserved: evidence/logs/s440-probe.log (start-disconnected → 4 scene failures; retry-disconnected → 1 failure; disposable copies only).

FINAL: s247 3/3; 20 node invariants 20/20; auth suites 32/32 (s397 15 + s425 17); UI tsc 0; anti_slop_lint absolute filesScanned=1, 0 findings each (evidence/logs/s442-green.log, s442-lint.log).
FROZEN SHA256: s397 6B2B0266E3DF3B92E677103294E1D2DB16EDF7C31DCA853D081EF90AF01A9398; s425 6A07CE5D115B40713D31080BEBFE93228F3B4574E8B1BEDA684B9161699AC6A3.
Preserved limitation: not a browser/mount/packaged-DOM proof; no full-UI or full-requirement claim.
