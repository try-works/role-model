# S682 - R39 blocking CI verification passed end-to-end (run 42357317478)

Date: 2026-11-07. Branch recursive/115-effect-foldkit-runtime-migration @34d69b1a, workflow_dispatch
channel=development with private_sha=b4688938ecbe467b5a2fb11fe407fd9fcc962e45.

## What made the paired development build possible
The workflow only provisioned the paired private distribution for stage/production channels; a development
dispatch therefore failed at "Package SEA runtime". The workflow now:
- provisions the private checkout + build for a development build that supplies private_sha (commits
  0ac6a500, 734b17e6, 670aebd9),
- builds the Foldkit wrapper packages and the browser platform wrapper before packaging,
- keeps the R39 gates blocking because R39_VERIFY_BLOCKING=true.

## R39 result (win32-x64 job)
- Verify packaged client journeys (R39): **success** (blocking).
- Audit rendered UI (R39): **success** (blocking).
- Compare accepted stage package against the production candidate (R39): skipped (production-only step).

The earlier failures were real and were fixed along the way:
- /models control "control name repeats its content" -> single-line aria-label on the model card (6d5f1886).
- role toggle "control name repeats its content" -> single-line aria-label (e4a2ed5c).
- "studio run: raw:error" after the click sweep -> the audit now drives the studio run before the sweep
  mutates role/maintenance state (f6f3068a).

## Remaining lane on the same run (not R39)
The next step, "Parity selfcheck lane (R14)", failed with
"temp-root: C:\Users\RUNNER~1\AppData\Local\Temp is not on the required drive D:".
Cause: the workflow selects the required drive from RUNNER_TEMP (D:\a\_temp on the GitHub runner) while
the selfcheck still used os.tmpdir() (C:). Fixed by relocating the selfcheck temp root onto the required
drive when it exists (scripts/runtime/parity-selfcheck.mjs relocateTempRootForDrive + test; the fail-fast
for a missing drive is preserved). Parity selfcheck unit tests 34/34.

## Ledger
R39 moves from PARTIAL to VERIFIED: the blocking gates ran and passed on a real CI run for the paired
development build. The stage-vs-production comparison remains a production-release step.
