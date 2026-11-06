# R11/R13 route focus and surface disposition

Status: GREEN in source/tests; packaged focus verification pending a clean shared tree.

## R11 focus restoration
- `main#main-content` now carries `tabindex="-1"`.
- `scrollShellToTopCommand` scrolls and focuses `#main-content` after every completed navigation; focus
  no longer remains on the now-stale nav trigger.
- Test: `test/s26b-wave1.test.ts` (theme/title/scroll/focus facts) asserts `document.activeElement.id`
  is `main-content` after a real nav click.

## R11 route-family mapping
- `src/route-family-map.ts`: one row per Foldkit route tag with React file(s), status
  (ported/consolidated/new-only), two unported reference routes with explicit owner dispositions, and
  infrastructure files.
- `test/s654-route-family-map.test.ts` checks every tag exactly once, every React route file mapped or
  dispositioned, every mapped file exists, and s26a inventory sources are covered.

## R13 surfaces / de-preview
- `SURFACE_DISPOSITIONS`: command palette and media capture are explicit owner dispositions (no React
  route, s26a row, or host API); device auth is ported through `providersPage`; preview editors are
  de-previewed.
- Removed the unused `previewDisclosure` and dead disabled `textField`/`selectField` helpers; no
  `preview-only` disclosure or disabled preview write control remains.
- Test: `test/s655-surface-dispositions.test.ts`.

## Evidence
- RED/GREEN: `evidence/logs/r11-focus-red.log`/`r11-focus-green.log`,
  `r11-route-map-red.log`/`r11-route-map-green.log`,
  `r13-surface-disposition-red.log`/`r13-surface-disposition-green.log`.
- Targeted GREEN: s26b 4/4, s654 3/3, s655 3/3; `runtime-ui-next` tsc 0 and client build PASS.
- Commit: `10f385d1`.

## Packaged-host focus check
- Ran the current `runtime-ui-next/dist/client` under the packaged executable at
  `E:/role-model-run115/r14-release-e07b60c3/win32-x64/role-model-dev.exe` (sha256 `1412aa72...`),
  clicked the Models nav, and read the live DOM: `activeId=main-content`, `activeTag=MAIN`,
  `title=Models | RM3 Foldkit shell`. Log: `evidence/logs/r11-focus-packaged-host.log`.
- This proves the served client behaviour through the packaged host; a fresh SEA built at this exact
  commit was blocked by concurrent shared-tree edits in `package-sea.ts`/`package-ui-shell.mjs`
  (other lanes). The unit s26b mount test covers the same command against the same client.

## Remaining
- Fresh SEA at the final commit once the shared tree is clean; the packaged host focus result above
  uses a prior executable with the current client bundle.
- Palette/media remain owner-dispositioned, not implemented.
