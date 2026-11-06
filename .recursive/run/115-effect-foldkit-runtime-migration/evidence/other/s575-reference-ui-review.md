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

## FINAL re-review on e0439614 — PASS (bounded)

Active model verified **deepseek-flash**. Current HEAD `e0439614 fix(ui): close S575 review findings and reference endpoint format`, immediately after `738a2d1e`. Read-only; no edits, no commit.

### Findings closed

- **s540 runtime:** `test/s540-system-local-density.test.ts:42` now uses `{ cards: 4, skipStructure: true }`. The helper counts `[data-route] > section` exactly four and only skips the generic table/SVG check explicitly; it no longer uses `{tables:0,svgs:0}` as an unasserted escape.
- **s76a pre-load invariant:** restored as its own test at `test/s76a-runtime-config.test.ts:30-37`: while the automatic read is in flight, no editor, save, or confirm button exists. The auto-load test remains.
- **s380 scope:** loading/error/empty assertions are now contained to `[data-route="models"]` (`s380-models-roles.test.ts:118-137`), not `document.body`; state attributes remain truthful.
- **s71b:** waits for the models table and compares headers case-insensitively to the reference title case (`s71b-models.test.ts:16-20`).
- **S574 honest limits:** `s574-reference-ui-rebase-commit.md:24` now records the candidates/decisions MetricStrip and observe-routing single-chart limits, plus the providers picker and queue empty table. Line 25 corrects geometry to browser-measured aside 224/header 48/track 1216 and states the unit scene asserts only the class contract (no unsupported 865 claim).

### Provenance and route checks

- **Page stories:** `test/support/page-stories.ts:1-5` names the :3456 story-dump capture. Sampled entries match `D:/DEV/rm-clean/audit/story/stories.json`: Providers title/headings/combos/textLen 1344, Queues title/heading/empty table/textLen 864, ObserveRouting title/combos/textLen 795; the capture viewport is 1806x963 with aside 224x963/header 48/main 1582x915. The stories are not invented.
- **Runtime-config split:** `route.ts:56,132` defines `RuntimeConfig` at `/runtime/config`; `legacy-redirects.ts:135-136` maps both legacy paths; `update.ts:488` auto-loads `runtimeConfig`; s76a auto-load + in-flight tests and the 29-test targeted run pass.
- **Gates reproduced:** targeted s540/s76a/s380/s71b **29/29**; UI `tsc --noEmit` **0**; full UI suite **811/811 in 76 files**. The S574 record says 810; the extra test is the restored s76a invariant, so update that line to 811 when convenient.
- No pixel/visual acceptance is claimed here; the separate live route comparison remains the visual gate.

### FINAL BOUNDED VERDICT: PASS

The five S575 findings are fixed with concrete file:line evidence, the story capture provenance is real, runtime-config split behavior is covered, and tsc/full gates pass. This is a bounded structural/reference-layout acceptance, not pixel parity or owner visual-delta approval.

No source/test/config file was modified; no commit.

