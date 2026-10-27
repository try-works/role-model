# S260 typed UI harness repair

Status: implemented and verified in the working tree. Not committed.
Task: `.recursive/run/115-effect-foldkit-runtime-migration/tasks/s260-typed-ui-harness.md`
Worker provider/model: `deepseek-official/deepseek-flash`, GPT Lead. No delegation.
Diff basis for this bounded slice: `git diff` against working-tree HEAD `9ac82847af56b3360fd423361d78253c8b78ae14`.
(Phase 0 canonical run basis `f0d50fab...` is unchanged; this is a bounded follow-on receipt.)

## Scope

Changed only `role-model-router/apps/runtime-ui-next/test/`:

| Path | Change |
| --- | --- |
| `test/support/runtime-shell.ts` (new, 65 lines) | Typed test harness: real `defineReadDiagnostics` / `defineDispatchControl` / `defineDispatchStudio` / `defineSaveRuntimeConfig` Command definitions, typed client stubs, and a `Model`-schema-decoded `shellModel`. |
| `test/s245-scene-smoke.test.ts` | Uses `scene({ update: shellUpdate, view }, given(shellModel()))`; inference only. |
| `test/s250-control-rendering-scene.test.ts` | Same scene harness; action state typed as `Pick<ControlState, "actionMessage" \| "actionStatus">`. |
| `test/s251-control-dispatch-once.test.ts` | Asserts the returned `DispatchControl` Command name/args and the model transition. |
| `test/s253-studio-dispatch-guard.test.ts` | Asserts the returned `DispatchStudio` Command name/token and exact `StudioState` payload. |
| `test/s255-studio-rendering-scene.test.ts` | Same scene harness; `StudioTab`-keyed decoded model; ArrowRight runs the real reducer. |
| `test/s256-runtime-config-rendering-scene.test.ts` | Same scene harness; `Editor = NonNullable<Model["runtimeConfigEditor"]>` instead of a hand-written shape. |
| `test/s257-runtime-config-invalid-save.test.ts` | Asserts empty command batch on invalid request AND invalid confirm; exact one real `SaveRuntimeConfig` on the valid control. |

No `src/**` changes. No integration test was deleted or weakened. No budget change. No commit.

## What the repair removes

All seven tests previously erased the harness: `undefined as never`, `as unknown as`, local
`Record<string, unknown>` model views, hand-written fake command factories, and (S251/S253/S257)
call-count proof instead of command proof. Those constructs are gone from all seven files and the
new support file (scan below). Assertions read the production Command the reducer returned.

## Behavioral assertions preserved / strengthened

- S245/S250/S255/S256: every existing `expect(...)` assertion is unchanged; only the typed harness changed.
- S251: `one command per request`, pending transition, advanced token, and `second request emits nothing` preserved; now proven on the returned `DispatchControl` name/args.
- S253: `one command per run`, loading transition, unchanged loading token, and `second run emits nothing` preserved; now proven on the returned `DispatchStudio` name/args and its exact `StudioState`.
- S257: invalid JSON keeps text/status/message; invalid confirm is a no-op; the valid control emits exactly one save. New: both invalid paths assert the whole returned command batch is empty (a different command would fail), and the valid path asserts exact `configText`, `originalText`, and `token` args.

## Verification (actual commands and counts)

All commands run from `role-model-router/apps/runtime-ui-next` with `TMP=TEMP=E:/rm-tmp`.

1. `corepack pnpm exec tsc --noEmit -p tsconfig.json` — exit 0 before the repair and after it.
2. Baseline targeted run (before edits): 7 files / 22 tests passed.
3. Post-rewrite targeted run: 7 files / 22 tests passed (exit 0).
   Log: `evidence/other/s260-targeted-tests.log` (s251 2, s257 2, s253 2, s245 1, s250 3, s256 5, s255 7).
4. Negative typecheck (temporary `test/support/__s260-negative-probe.ts`, deleted; no `src` mutation):
   - `error TS2739` — bare `async () => ({ body, status })` passed where a `ReadDiagnostics` Command definition is required (bad command slot).
   - `error TS2322` — `shellModel({ clicks: "zero" })` (wrong model field type).
   - `error TS2322` — `Message.StudioRunRequested({ token: "0" })` (wrong message payload type).
   - `tsc` exit 2; log `evidence/other/s260-negative-typecheck.log`.
   - Probe deleted, `tsc` re-run: exit 0 (restored green). No persistent production mutation.
5. Final full command `corepack pnpm run test` (tsc && vitest && node --test test/*.test.mjs): exit 0.
   - `Test Files 39 passed (39)`, `Tests 326 passed (326)`.
   - Invariants: `pass 20`, `fail 0`.
   - Restored S258-authoritative suites all pass inside that run: `s46a-studio` 5, `s76a-runtime-config` 6, `s254-studio-request-shape` 8 (plus this slice's `s255` 7, `s256` 5, `s257` 2).
   - Click-budget invariant `S247: the total click count does not grow` passes; budget remains 27.

## Lint

- `anti_slop_lint`: **not available in this harness.** No such tool is exposed to the worker, no
  local binary or MCP server exists (checked PATH, repo `node_modules/.bin`, `.codex` config/plugins),
  and prior run evidence shows it is a controller-side Codex tool. I did not run it and do not claim
  a lint PASS.
- Substitute checks actually run:
  - `biome lint` over the 8 changed files: checked 8 files, 0 findings, exit 0
    (`evidence/other/s260-biome-lint.log`).
  - Targeted banned-pattern scan over the same 8 files (`as never`, `as unknown as`, `as Record<`,
    `Record<string, unknown>`, `readonly unknown[]`, `: unknown`, `unknown)`/`unknown,`,
    fake-command names, `@ts-ignore`, `@ts-expect-error`): 0 matches, `filesScanned=8`; a temporary
    positive-control probe was detected (1 match), so the scan is not vacuous
    (`evidence/other/s260-antislop-equivalent-scan.log`).
- The Lead/controller should still run the real `anti_slop_lint` tool on these 8 files before
  accepting this as lint-clean.

## Bounded diff

```
 M role-model-router/apps/runtime-ui-next/test/s245-scene-smoke.test.ts
 M role-model-router/apps/runtime-ui-next/test/s250-control-rendering-scene.test.ts
 M role-model-router/apps/runtime-ui-next/test/s251-control-dispatch-once.test.ts
 M role-model-router/apps/runtime-ui-next/test/s253-studio-dispatch-guard.test.ts
 M role-model-router/apps/runtime-ui-next/test/s255-studio-rendering-scene.test.ts
 M role-model-router/apps/runtime-ui-next/test/s256-runtime-config-rendering-scene.test.ts
 M role-model-router/apps/runtime-ui-next/test/s257-runtime-config-invalid-save.test.ts
?? role-model-router/apps/runtime-ui-next/test/support/
```

`git diff --stat` for the tracked seven: 7 files changed, 139 insertions(+), 280 deletions(-);
new support file is 65 lines. `git status --porcelain -- role-model-router/apps/runtime-ui-next/src`
is empty (source diff empty). No operator runtime or port was touched.

## Irreducible generic variance

None encountered. `scene<Model, Message>` accepts the real `createUpdate` return
(`UpdateReturn<Model, Message>`) and the real `view(model, h)` signature by inference; no variance
cast was needed or used. The one remaining `Record<string, unknown>` is `Command.args` as declared
by the vendored Foldkit `Command` type; the tests read named args and deep-compare the
`StudioState` payload, so they do not restate that dictionary in test-owned types.

## Limits / unchanged open items

- `anti_slop_lint` could not be run by this worker (see Lint); the substitute checks are not it.
- The full app suite was run once; no repeated flake run.
- This bounded slice does not address S258's remaining open items: broad audio/advanced/rerank
  live-capability claims, the actual configured agent route, backend R27 CLI Layer DAG, or F152.
- Not committed, per task.
