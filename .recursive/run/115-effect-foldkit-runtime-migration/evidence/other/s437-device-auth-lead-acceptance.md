# S437 — bounded device-auth correctness acceptance

Author existing s10-capqueue-close and independent s9-private-readonly liveverified deepseek-flash. Patch basis public71151644; only deviceauth parser/UI/updatepolled+cancel and dedicatedtest; sharedroute/private changes reviewed separately.

Repair: host failed/expired/unknown no longer pending; error/retry hints preserved; finitepositive retryinterval fallback; pending code+https-only safe verification link visible; cancelinflightfalse so restart possible, stale results tokenfenced. IndependentS432 found first realpoll dropped challengefields; strictRED2 genuine state+mountedafterpoll failures before fix, then sameauthpending merge keeps challenge only, pollstatus/retry/reason wins; foreign/terminal do not inherit.

Strict S425RED9failed1passed before source; retryinvalidRED1failure. Final S432green2files30/30+UItsc0. Lead neighbors4files50/50 at s432-lead-green.log. Independent S432 finalboundedPASS SHA256AE4E4A5A7D781D34F59B91EEB02DD0320DA1B6C357EA334AC62EFE0706B97BD1. FinalbroadUI snapshot still being collected separately; no premature whole-suite claim.

Final hashes device-auth384343ABFA069C609E186A05809B789AF8F54C66FB03166A51BA6B1A57B99F53; control-viewF70A191BBF6F22F3E2CF279A9C91C219C91E81035C39E60BF031CEEBD0300C1F; update7ECD7283F712B86D480DE9DA9DF8618805F75F2D98F96904FCC71B3D3D9ED19B; test237B3707F256E85C596BBE4F30385BADADAB44407C279AD1054C6EFE52E1518F.

Absolute anti_slop_lint files1each: control-view/test0; device-auth13baseline residual reducedfrom19, no new; update10baseline no new in authregion. Not whole-fileclean.

Not fullM8/R13: cancellation STATEONLY (oldtimer/fetch may execute and results ignored), catalogue/modal/copy/checknow/lifetime work remain; endpointmultiactivation completion stillbuggy and designedS436 next; realprovider/package/browserauth acceptance not exercised. Verification link protocolallowlist doesnot authenticate provider origin. Only E1/E2scope deferred; no new waiver.
Audit: PASS (bounded auth correctness)
