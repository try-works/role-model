# S264 bounded repair review

Status: bounded review complete. No product edits, no commits, no delegated children.
Reviewer: deepseek-flash (explicit bounded role). Lead: GPT.
Diff basis: public `HEAD 9ac82847af56b3360fd423361d78253c8b78ae14` and private
`HEAD 263f02603db30eef01378552b2e3d13687025f4a` -> working tree. Canonical `00-worktree.md`
baseline `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1` is unchanged; these are bounded follow-on slices.

Inputs read: `00-requirements.md` R2/R3/R18/R28/R32/R33, `owner-scope-decision.md`,
`00-worktree.md`, `s258-coverage-repair.md`, private `s259-f152-repair.md` with its RED/GREEN/
mutant logs, `s260-typed-ui-harness.md` with its logs, `s259-s260-actual-worker-routes.json`,
and both actual working-tree diffs (not the receipts' claims).

Checks executed: public app `corepack pnpm exec tsc --noEmit -p tsconfig.json` exit 0; per-file
`expect(`/`assert.` count equal-or-higher at HEAD -> working tree; cast/erasure scan of the eight
public files = 0 matches (`as never`, `as unknown as`, `Record<string, unknown>` views, suppressions);
S247 budget sum = 27. Did not run `anti_slop_lint` or full suites (Lead did).

## Slice A - private F152 packaged shadow

### Findings, priority order

1. **[no defect] Fixed journal layout matches the decoder.** `scripts/track-b/runtime-shadow-pipeline.mjs:450`
   roots the shadow journal under `<stateRoot>/scope/track-b/extensions/...`. The public decoder tries
   `<root>/<scope>/track-b/extensions/workers` (`role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts:6407`)
   and then fallback-scans the stateRoot's subdirectories (`:6417-6427`); the extension host roots workers at
   `<journalDir>/workers/<id>` (`packages/extension-host/index.mjs:533`). `scope` is therefore a path-safe
   harness stand-in for a colon-bearing fixture scope, not a contract change. Accurate.
2. **[no defect] Host-owned root after the spread is authoritative.** `runtime-shadow-pipeline.mjs:903-906`
   places `contractStateRoot: stateRoot` after `...input`, so the caller cannot override it. The regression at
   `tests/track-b/run96-f152-packaged-shadow.test.mjs:275-296` supplies an empty caller root and still requires
   `evaluation-core` to reach `completed`. The precedence mutant (`s259-precedence-mutant.log`) fails that test
   0/1, so the test is genuinely sensitive rather than tautological.
3. **[low] Fixed `scope` depends on the decoder's bounded fallback scan.** Because the declared fixture scope is
   only tried verbatim, discovery relies on the `readdirSync(stateRoot)` fallback (capped at 16 entries).
   Today the per-run root contains only `scope` plus a sanitized contract directory, so the cap is never close;
   it would only matter if more direct children were added before readback. Harness-only; no production path.
4. **[low] Forwarding the root also enables v1.1 contract emission under it.**
   `role-model-router/apps/runtime-host-bridge/src/track-b-contract-emission.ts:66` now writes
   `<stateRoot>/<file-safe-scope>/track-b/contracts`. The directory is sanitized and removed with the per-run
   root; no trust/storage assertion was relaxed. Incidental, acceptable.
5. **[low] Temp-parent residue.** The new test sets a fixed `ROLE_MODEL_TEST_TEMP_ROOT`
   (`tests/...:279`) and removes the `mkdtemp` child and caller root, but the empty parent remains. Trivial and
   consistent with the pre-existing test at `:301`.

### Evidence and requirement touchpoints

- TDD: RED logs include the new regression failing (`s259-red-after-test.log` and
  `s259-red-forwarding-only.log`, both 4 pass / 2 fail); GREEN is 6/6 (`s259-green-final.log`); mutant is 0/1.
  This satisfies R3's assertion-level RED-before-GREEN expectation for the bounded fix.
- R28/R32: only the private shadow harness and its test changed; no production storage, composition, trust, or
  finalization code changed. The host-owned root forwarding is consistent with keeping storage authority with
  the host.
- R2: `s259-s260-actual-worker-routes.json` records provider/model/session (`deepseek-official/deepseek-flash`),
  but not the config hash, exit, or controller-verification join R2 describes; if closure rests on that file
  alone the proof is thin. Evidence note, not a repair defect.
- R33 lint: Lead's `anti_slop_lint` -- test file clean; pipeline 28 pre-existing findings, none on changed lines.
  The worker's equivalent-engine run (`s259-antislop.json`) agrees, but is not the tool.

### Verdict

**PASS (bounded).** The two-part repair is correct for the reviewed fixture: decoder layout, host precedence,
wrong-root sensitivity, and cleanup all hold. Findings 3-5 are low-risk notes; no blocker in this slice.

## Slice B - public typed UI harness

### Findings, priority order

1. **[no defect] Every behavioral assertion is retained or strengthened.** Per-file
   `expect(`/`assert.` counts HEAD -> working tree: s245 2 -> 2, s250 3 -> 3, s251 5 -> 9,
   s253 4 -> 8, s255 15 -> 15, s256 17 -> 17, s257 9 -> 16. The s251/s253 call-count proofs became
   returned-Command assertions (`s251-control-dispatch-once.test.ts:37-42`,
   `s253-studio-dispatch-guard.test.ts:24-31`), and s257 now proves the invalid request and the confirm from
   the invalid state return an empty batch of *any* command (`s257-runtime-config-invalid-save.test.ts:38,41`),
   while the valid control pins exactly one real `SaveRuntimeConfig` with `configText`, `originalText`, and
   `token` (`:57-60`) and confirms review emits nothing (`:52`). No assertion was dropped.
2. **[no defect] Types are inferred; no fake factory or erasure cast hides a slot.**
   `test/support/runtime-shell.ts:50-59` calls the real `createUpdate` with the real `define*` command
   definitions in the production argument order (`src/app.ts:120-129`); `shellModel` at `:73-74` schema-decodes
   the real `Model`. The scan found no `as never`, `as unknown as`, hand-written model view, or suppression in
   the eight files. My independent `tsc --noEmit` run is exit 0, and the Foldkit scene signature accepts the
   inferred `{ update, view }` pair (`packages/foldkit/dist/types/test/scene.d.ts:418-426`).
3. **[low residual] Command args remain a runtime-checked dictionary.** The vendored `Command.args` is
   `Record<string, unknown>`, so arg-field names (`key`, `token`, `configText`, ...) are pinned by
   `assert.equal` at runtime, not by the compiler. The negative typecheck (`s260-negative-typecheck.log`:
   TS2739 command slot, TS2322 model field, TS2322 message payload) covers slots/model/message, not arg keys.
   This is the stated irreducible variance, not a defect in this slice.
4. **[no defect] Integration coverage and budget intact.** `git status` shows only the seven scene/reducer test
   files plus the new `test/support/`; `s46a`, `s76a`, `s254`, and `s247` are untouched. The S247 budget map
   still sums to 27 (`s247-click-budget.test.mjs:12-25`), and the restored S258 suites were not edited.
5. **[low evidence] Lint proof is Lead-side.** The worker could not run `anti_slop_lint`; its biome and
   banned-pattern scans (`s260-biome-lint.log`, `s260-antislop-equivalent-scan.log`) corroborate but do not
   replace the tool. Acceptance here relies on the Lead's required 8/8-files-clean `anti_slop_lint` run stated
   in the task brief.
6. **[low evidence] Receipt line count is stale.** `s260-typed-ui-harness.md:15` says the support file is 65
   lines; the actual file is 74. Cosmetic only; the behavioral and lint claims above were checked against the
   file itself.

### Evidence and requirement touchpoints

- R3: the repaired tests keep the pre-existing 22 targeted tests green (`s260-targeted-tests.log`) and add
  command/args assertions; the negative typecheck log is compensating evidence that the typed harness is not
  vacuous.
- R33: this slice changes tests only; no first-party backend/client code changed. The required
  `anti_slop_lint` disposition is the Lead's run, not the worker's substitute.
- R18: the private implementation remains under private evidence; this public report uses path:line references
  and behavioral descriptions only.

### Verdict

**PASS (bounded).** The typed harness removes the erasure casts, reads the production commands the real reducer
returns, and restores/strengthens every assertion, including the all-commands-empty invalid paths and the exact
valid control. Findings 3-6 are residual notes; no blocker in this slice.

## Overall

Both bounded repairs are accepted for their stated slices. No product edits were made by this review, and no
broader scope, full-suite, live, or release claim is made here. The only evidence gap worth carrying forward is
R2's route-proof completeness (Slice A note): the designated JSON records provider/model/session but not the
config hash, exit, or controller-verification join that R2 describes.
