# S439 — endpoint aggregate completion implementation

Status: pending
TDD Mode: strict
Public patchbasis d6043768; privateac809d31 unchanged; original paired00-worktree authority unchanged. Inputs: S420 auditfinding4, S436 design, originalR13/sourceproposal, exact S404payload/32bound tests, S438checkpoint.

Expected writes: UI src/endpoint-activation-tracker.ts NEW pure owner, src/endpoint-admission.ts state ONLY; src/message.ts endpoint callbacks ONLY; src/commands.ts endpointmetadata/callback ONLY; src/update.ts endpoint handlers ONLY; src/control-view.ts endpointsection ONLY; NEW test/s439-endpoint-completion.test.ts + existing s404test appropriate callback metadata updates. NO auth, routes, readback, app, private or SQL edits. Sharedfiles no format/wholefile rewrite; use narrow edit afterread.

Execute S436 design, but no stale unconditional full-file replacement. FIRST behavioral RED through REAL shellUpdate using two current ActivateEndpoint commands: firstsuccessmustnotfinish; submitwhilependingrefused; A success B fail and reverse samepartial; callbacks identity/repeat/stale generation; batch atomic oneunit. Current callbacks lackid; first test may use current token API to catch savedregression. Puretracker tests may import newmoduleonly AFTER public shellRED captured; no missingimport-asRED.

Integrate peractivationid/generation commandcallback, bounded runpending+settled; all children settle before saved/partial/error; firstterminalwins; failedmessages retained perid; pending submitguard. Payload HTTPexact single/batch unchanged, no hostschema. Do not auto retry succeeded models without explicit policy; no accidental duplicate duringpending. Batch oneatomicunit, 1..32 preserved. Tests bothordering, duplicate+unknowncallbacks, nextgeneration latecallbacks, allsuccess/allfail, partialerror visibility, mountedorFoldkit scene actualview evidence if feasible. Existing exactpayload tests remain.

Run s439+s404+s425+s397 neighbor suites+UItsc; anti_slop_lint absolutefilesScanned>0 (newmodule/newcodeclean; baselinefindingsclassified, no suppressions). Live verifydeepseek-flash beforework; list/get/claim sharedtask; no commits. Capture s439-red/green logs with command+counts+exit; return frozenhashes actualtests and remaininglimits. Independent reviewer differentauthor. No M8completion.
