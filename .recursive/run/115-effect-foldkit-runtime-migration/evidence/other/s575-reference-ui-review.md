# S575 — independent review: reference-UI rebase (738a2d1e)

Reviewer: `s9-private-readonly`, actual model **deepseek-flash**. Read-only public worktree; no edits, no commit.

## Bounded verdict: HOLD

The rebase is substantial and the main gates are green, but the review requested exact checks that do not hold: s540 was loosened, one s76a test was removed, the shell geometry is not asserted, and the S574 honest-limits list is incomplete.

## What passes

- **Diff basis:** current HEAD `738a2d1e`; `git diff 8bc397b2..738a2d1e` covers 51 src/test files.
- **tsc:** `tsc --noEmit` exit **0**.
- **Full suite:** **76 files / 810 tests pass**.
- **Shell basics:** `src/view.ts:1291` aside is `w-56` (224) and `h-full`; `view.ts:1370` content is `max-w-[1216px]`; `test/s560-shell-layout.test.ts:25-51` asserts 224/h-12 and the ten flat nav links + footer stack (`role-model-model-inventory`, `role-model-cache`, `role-model-router-endpoint`).
- **Story capture:** `test/support/page-stories.ts:1-5` states the :3456 capture provenance; sampled `Index` values match `D:/DEV/rm-clean/audit/story/stories.json` (title, seven headings, filter combos). The captured viewport is 1806x963, aside 224x963, header 48, main 1582x915.
- **Runtime split:** `src/route.ts:56,132` defines `RuntimeConfig` at `/runtime/config`; `src/legacy-redirects.ts:135-136` redirect legacy paths; `src/update.ts:488` requests `runtimeConfig` on entry. s256/s76a tests were retargeted to the new route and pass.

## Blocking findings

### 1. s540 runtime assertion was loosened, not retargeted

Before the rebase, `check()` required at least one table and one SVG on every page. The rebase adds optional `tables/svgs` and changes runtime to:

`test/s540-system-local-density.test.ts:37`
```ts
await check("Runtime", [...], { tables: 0, svgs: 0 });
```

This is `>=0`, so it accepts any count, including the previous requirement failing. It does not assert the reference truth (“Runtime has exactly zero tables/SVGs”); it removes the assertion. Endpoint labels were also re-cased at line36, which is reference copy, but the runtime override is a weakening.

### 2. An existing s76a test was removed

The diff replaces `s76a-runtime-config.test.ts` “does not offer Review before Load” with “auto-loads the config on mount…”. Auto-load is the new intended behavior, but the old assertion/test is gone rather than updated to cover the new no-Review-before-load invariant. This contradicts “no test deleted.”

### 3. s380 scope weakened to body text

`s380-models-roles.test.ts:118-137` replaced route-container assertions with `document.body.textContent` for “Runtime roles”/“Loading model roles”/“read failed”/“No configured models”. The `data-models-roles-state` attribute is still asserted truthful, but the rendered-card assertions are now page-wide, so text elsewhere in the shell can satisfy them.

### 4. Shell geometry claim is not actually verified

The test asserts `w-56` and `h-12`, but not aside height **865** or content track **1216** as a rendered measurement. The capture says aside height **963** at viewport 963, not 865; source uses `h-full`, so 865 is viewport-dependent and unasserted. The “224x865” claim therefore has no capture/test basis in this evidence.

### 5. S574 honest limits are incomplete

`evidence/other/s574-reference-ui-rebase-commit.md:22-24` records only:
- data-state limitation,
- providers picker,
- queue empty table.

It omits two of the four limits named in the review request: **candidates/decisions MetricStrip** and **routing single chart**. The recorded limits are therefore not the complete honest-limits list.

## Other notes

- `s563-layout.ts` and `s563-pages.ts` exist and are exercised by S563/S565; the primitives are reference-shaped. This review did not pixel-compare every route; the separate story scene remains the visual gate.
- No pixel/visual acceptance is claimed here; the full suite is structural.

## Required repair

1. Make s540 runtime assert the reference truth explicitly (or restore the >=1 table/SVG contract); do not use `{tables:0,svgs:0}` as an unasserted escape.
2. Preserve the old s76a no-Review-before-load invariant in a new auto-load test, or document the intentional replacement as a behavior change.
3. Restore route-contained s380 card assertions (or add explicit card checks) while keeping the state attribute truthful.
4. Add shell geometry assertions for the actual captured measurements (or correct the 865 claim).
5. Complete the S574 limits with the MetricStrip and routing-chart omissions.
6. Re-run tsc + the full suite and record exact hashes.

No source/test/config file was modified; no commit.

