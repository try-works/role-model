# S297 — R14 mutation check (one-class detection) result

Task-17 (rev 2, completed). Model: deepseek-flash (verified live). Branch recursive/115-effect-foldkit-runtime-migration.
No commit; Lead commits after s9 review. Starting bytes preserved: dispatcher runtime-parity.mjs **unchanged**
(C682467D…).

## Mechanism (recorded before code in tasks/s297-r14-mutation-check.md)

Option (a), shipped-artifact mutation: copy `role-model-router/apps/runtime-ui/build/client` to a fresh E: temp root
and change exactly one class in the shipped CSS:

- file: `assets/root-Bljja8hb.css`
- selector: `.flex`
- declaration: `display:flex` -> `display:block` (first occurrence)

`.flex` is a Tailwind utility class applied throughout the captured React page; the built React page does not
ship a `packages/ui`-only class on the Index route (`rm3-chart-*` classes from packages/ui are not emitted in
this React build), so §6.4's literal "one class in packages/ui" is approximated at the shipped-artifact level —
the option (a) the task allows. No source rebuild, no dependency install; baseline and mutant are served by the
SAME packaged exe + SAME fixture root, only the served CSS differs.

Detection is ONLY by capture sha difference (S282 PNG bytes). The mutation code path never reports "I mutated";
a conflicting `reportedDetected` is FAILED and an identical mutant sha is FAILED.

## Real Chrome GREEN (evidence/logs/s297-real.log) — exit 0 PASSED

- baseline pair identical: `1096eb95169138baef9b3999fd28a0919a47040562421fac630f7cfe7184408a` (twice)
- mutant sha: `a5db448839ebab474e80bd9819ceb3eb27ec58610979966d387b8602c9cd2079` — differs
- `mutationCheck`: { applied: "one-class", detected: true, noFalseMutation: true, mutatedDiffers: true }
- executable 0.0.20-231-gd61c32dc sha e3181d50…; tempRoot E:\rm-tmp; chromeUserDataRoot E:\rm-tmp\s294-chrome-03TXLq.

Full JSON:

```json
{"chromeUserDataRoot":"E:\\rm-tmp\\s294-chrome-03TXLq","executable":{"path":"D:\\DEV\\role-model\\.worktrees\\115-effect-foldkit-runtime-migration\\role-model-router\\dist\\release\\win32-x64\\role-model-dev.exe","sha256":"e3181d507a6ccd757407024dda25b1813329dd6e7895ae5d4e52b4f84c63e7a7","version":"0.0.20-231-gd61c32dc"},"scope":"browser-parity","tempRoot":"E:\\rm-tmp","classMutation":{"file":"assets/root-Bljja8hb.css","from":"display:flex","selector":".flex","to":"display:block"},"mode":"mutation","mutationCheck":{"applied":"one-class","baselineSha":"1096eb95169138baef9b3999fd28a0919a47040562421fac630f7cfe7184408a","classMutation":{"file":"assets/root-Bljja8hb.css","from":"display:flex","selector":".flex","to":"display:block"},"detected":true,"mutatedDiffers":true,"mutatedSha":"a5db448839ebab474e80bd9819ceb3eb27ec58610979966d387b8602c9cd2079","noFalseMutation":true},"status":"PASSED","evidenceDir":"D:\\DEV\\role-model\\.worktrees\\115-effect-foldkit-runtime-migration\\.recursive\\run\\115-effect-foldkit-runtime-migration\\evidence\\other\\s294-captures","exitCode":0}
```


## Named follow-on: full source-level packages/ui mutation check (NOT done in this slice)

This slice mutates the shipped artifact. The source-level §6.4 check is a named follow-on with concrete steps:

1. change one class in `role-model-router/packages/ui` source;
2. rebuild the React app (`apps/runtime-ui`, `react-router build`) so the change is emitted;
3. confirm the changed class is actually present in the shipped CSS/JS of `build/client` (not tree-shaken);
4. capture the React baseline and the rebuilt mutant with the same lane (same exe, fixture root, port);
5. recompare shas and report `mutationCheck` (detected must be true) plus the no-false-mutation baseline pair.

Status: recorded as a required follow-on, not a silent gap. This slice's `mutationCheck` proves the harness
detects a served-artifact class change; it does not yet prove the source→build→serve path.

## S298 HOLD repair (2 required + 2 non-blocking) — final bytes

1. **ignoredIssues parity**: mutation JSON now carries per-capture `ignoredIssues`, per-target `ignoredIssues`
   and top-level `ignoredCount`, identical in shape to the normal lane (test asserts all three; real JSON
   `ignoredCount: 2` with the favicon pair).
2. **Source-level follow-on named**: see the "Named follow-on" section above (source class change -> rebuild
   React -> confirm emitted in shipped CSS/JS -> capture baseline+mutant -> recompare). Recorded, not a gap.
3. **Baseline provenance**: `targets[0].captures` are `{role:"baseline", run:0}`, `{role:"baseline", run:1}`
   and `{role:"mutant", run:0}`.
4. **PNG evidence**: `evidence.baseline` (both run PNGs) and `evidence.mutant` (mutant PNG).

Final real run (`s297-real2.log`): exit 0 PASSED — baseline `560ec387a6e5eb01234456337e1f9f9fb971cd6483a1e329ee62260cca22fee8`
(run 0 == run 1), mutant `fe8ea8fe86a8c7916fe3f7f53ceb625f16583e0043f2e18e6c18829c8611a11c`, detected true,
noFalseMutation true. Lint: all three files clean (the two conditional-spread findings introduced by the first
S298 revision were replaced with explicit branches).

## TDD

- RED (`s297-red.log`): 26 tests, **6 failed | 20 passed** — all six mutation tests failed against the zeroed
  skeleton (including the blind-harness cases: identical mutant sha -> FAILED, `reportedDetected:false` while
  shas differ -> FAILED, baseline-pair drift -> FAILED).
- GREEN (`s297-green.log`): **26/26 pass**.
- REAL (`s297-real.log`): exit 0 PASSED. First real attempt FAILED with `nondeterministic: the unchanged
  baseline pair differs` because each capture got a new ephemeral port and the React UI renders its endpoint
  URL; fixed by sharing ONE ephemeral port for the baseline pair and the mutant, so any sha difference is
  attributable to the class change, not the port (recorded as a harness decision).

## Invariants kept

JSON contract + exit codes (0 PASSED / 1 FAILED / 2 NOT_RUN), provenance (baseline pair = exactly two
captures), ignoredIssues emission, exe identity, tempRoot E: enforcement, favicon partition conservative,
`--request-selfcheck` untouched, anti-slop clean (all three files), no operator ports, real Chrome only in
the final GREEN, non-mutation lane unchanged.

## Deviations

1. Artifact-level mutation (option a) instead of a packages/ui source rebuild — allowed by the task; the exact
   class/file/declaration is named above.
2. `.flex` is a Tailwind utility, not a packages/ui-only class: the React build does not emit a
   packages/ui-only class on the route it captures.
3. Mutation mode is invoked as `node scripts/runtime/parity-selfcheck.mjs --mutation` (runner isMain arg
   parse). The dispatcher `--selfcheck` branch is byte-unchanged (runtime-parity.mjs C682467D…).
4. Mutation mode captures the React target only (baseline twice + mutant once); the Foldkit target and the S282
   primitive are not mutated.