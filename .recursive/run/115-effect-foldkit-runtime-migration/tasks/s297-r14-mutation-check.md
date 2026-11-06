# S297 — R14 mutation check (one-class detection) on the committed S294 lane

Task-17 (rev 2, in_progress, owner s5-health-wait). Model: deepseek-flash (verified live). No commits; Lead commits
after s9 review. Starting bytes (frozen, never regressed): parity-selfcheck.mjs 3EBC195F…, test 6C3E0AE1…,
runtime-parity.mjs C682467D….

## Requirement (source-proposal §6.4; M4 acceptance)

"Mutation check: change one class in `packages/ui` and confirm the harness flags it." A harness that cannot
detect a change cannot prove "nothing changed by the port". RED must also cover the blind-harness case: a
harness that reports detected:false while the shas differ must FAIL.

## Mechanism decision (recorded BEFORE code)

Option (a), shipped-artifact mutation, chosen over (b) source rebuild:
- Copy the built React static root (`role-model-router/apps/runtime-ui/build/client`) to a fresh E: temp
  directory and change **exactly one class** in the shipped CSS asset:
  `assets/root-Bljja8hb.css`, selector `.flex`, declaration `display:flex` -> `display:block`.
  `.flex` is a Tailwind utility class applied throughout the captured React page (the built page ships no
  `packages/ui`-only class on the Index route; the `rm3-chart-*` classes in packages/ui are not emitted in
  this React build), so §6.4's literal "one class in packages/ui" is approximated at the shipped-artifact
  level — exactly the option (a) the task names. Baseline and mutant are served by the SAME packaged exe with
  the SAME fixture root via `--static-root`; only the served CSS differs.
- Why not (b): no dependency install and no rebuild is required, the lane already captures shipped bytes,
  and the mutation is reproducible byte-for-byte.
- Detection is ONLY by capture sha difference (S282 PNG bytes). The mutation code path never reports "I
  mutated"; a conflicting `detected:false` report is a FAILED harness (blindness), and a mutant with an
  identical sha is FAILED, never a pass.

## Contract mapping

- Baseline captured TWICE (unchanged variant) — the pair must be identical (no false mutation); the mutant is
  captured once and must differ from both baseline shas.
- JSON: `{status, scope:"browser-parity", mode:"mutation", mutationCheck:{applied:"one-class", classMutation,
  detected, baselineSha, mutatedSha, noFalseMutation, mutatedDiffers, reportedDetected}, ...}` plus the S294
  invariants (exe identity, tempRoot/chromeUserDataRoot, ignoredIssues/ignoredCount, favicon partition,
  exit codes 0/1/2).
- CLI: `node scripts/runtime/parity-selfcheck.mjs --mutation` (the dispatcher `--selfcheck` path is NOT
  changed; runtime-parity.mjs must stay C682467D…).

## Final outcome (GREEN)

- `node scripts/runtime/parity-selfcheck.mjs --mutation` (CHROME_PATH set): **exit 0 PASSED** — baseline pair
  `1096eb95…` identical twice, mutant `a5db4488…` differs, mutationCheck.detected true,
  noFalseMutation true. Full JSON + logs in evidence/other/s297-r14-mutation-check.md.
- Unit: RED 6 failed | 20 passed (s297-red.log) -> GREEN 26/26 (s297-green.log).
- Harness decision discovered in the real run: all three mutation captures share ONE ephemeral port (the React
  UI renders its endpoint URL), so a sha difference is attributable to the class change, not the port.
- Class changed: `assets/root-Bljja8hb.css` selector `.flex` `display:flex` -> `display:block` in a copied
  static root served via `--static-root`; exact class/declaration recorded above.
- Frozen after GREEN: runner AE8121E01CB4286A879EA2BFE69B987F0AD4A436939B49FA5C8B6627B4524B6A, test
  DC9C8C67FDFD84D341BBF2DCAE9528E69B8DC8304498819F2EC2412D5BD27888, dispatcher unchanged
  C682467D189460049A586E67F673D68C7830CD392245081A4AF69541636482D3.

## S298 HOLD repair (2 required + 2 non-blocking)

1. Mutation JSON now emits `ignoredIssues` per capture/per target and top-level `ignoredCount` (parity with
   the normal lane; test asserts the surface).
2. Scope record now names the follow-on: full source-level packages/ui mutation (source class change ->
   rebuild React -> confirm emitted in shipped CSS/JS -> capture baseline+mutant -> recompare). Recorded in
   evidence/other/s297-r14-mutation-check.md; not a silent gap.
3. Baseline provenance: mutation JSON targets[0].captures carry role baseline/mutant + run 0/1.
4. Mutation JSON evidence carries the baseline and mutant PNG paths.

Real run (s297-real2.log, final bytes after the conditional-spread lint cleanup): exit 0 PASSED, ignoredCount 2, baseline sha 560ec387… (run0 == run1), mutant sha fe8ea8fe…, detected true, noFalseMutation true. (Superseded first-revision shas 41106f06…/195f9a03… were replaced when the lint cleanup re-ran the lane; Lead-corrected under s9's non-blocking note.)

## TDD evidence

- RED: evidence/logs/s297-red.log (new mutation tests fail first).
- GREEN: evidence/logs/s297-green.log.
- REAL: evidence/logs/s297-real.log (real Chrome, full JSON) + evidence/other/s297-r14-mutation-check.md.