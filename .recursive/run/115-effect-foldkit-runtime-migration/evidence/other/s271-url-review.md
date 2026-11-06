# S271 bounded canonical URL review

Reviewer: deepseek-official/deepseek-flash (exact model), independent. Date: 2026-10-27.
Task: `.recursive/run/115-effect-foldkit-runtime-migration/tasks/s271-url-review.md`.
Mode: read-only, self-review (no children per task), no commits, no product edits, no full suite.
Only this file was written.

Diff basis: original `9ac82847` -> working (`84192c5e` + uncommitted S260/S269 edits).
Reviewed only `apps/runtime-ui-next/src/route.ts`, `src/legacy-redirects.ts` (new), `src/init.ts`,
`src/update.ts`, `src/studio.ts`, `test/s269-canonical-url.test.ts`,
`test/s269-canonical-url.scene.test.ts`. SQL untouched and not reviewed.

Inputs reread: s269 task + s269 report, `REASSESSMENT-AND-EXECUTION.md`,
`addenda/02-workspace-reference-implementation.md`, `evidence/other/s262-ui-assessment.md`,
original `apps/runtime-ui/app/routes.ts` and `app/routes/legacy-redirect.tsx`, and the S269
RED/GREEN logs.

## Verdict: HOLD (bounded slice)

The canonical mapping and the history-replace/exactly-once read mechanism are correct, but the echo
suppression is over-broad and silently drops genuine same-route navigation refreshes, and the new
bare `/studio` alias does not reset the tab. Both are explicitly in the S271 review checklist, so
this does not pass as-is.

## Verified correct

- Inventory/partition exact: the 20 `legacy-redirect.tsx` entries and the 22 map strings are copied
  verbatim; all 20 are keys of the map; map-only keys are exactly `/app/local/models` and
  `/app/router/config` (`legacy-redirects.ts:24-71`; unit 244-279).
- 16 entries resolve to a current target, 4 stay missing (`/app/local/policy`,
  `/app/local/matrix`, `/app/control/routing-strategy`, `/app/control/roles`)
  (`legacy-redirects.ts:79-132`; unit 281-292).
- Baseline partition: 37 supported original patterns (35 static + 2 detail) + always-canonical `/`
  + 15 missing = the 53 original canonical patterns.
- All 37 supported rows resolve to a real typed route and canonical href (unit 64-190); no broad
  generic-success mapping was fabricated. `/app/local/models` -> `/local/choose` is correct because
  the original route itself was a `<Navigate>` to choose.
- Original target semantics match manually for all 16 resolvable entries and the 4 missing ones;
  the 15 missing canonical paths stay explicit `NotFound` with unchanged pathname
  (unit 209-241; scene 237-249).
- Typed route/ID/query/tab preservation: `/app/observe/requests/req-7?window=3600000` ->
  `/requests/req-7?window=3600000` (unit 325-333), `/app/router/decisions/dec-1` ->
  `/router/decisions/dec-1` (unit 47-56), Studio tabs -> `/studio?tab=<tab>` (unit 177-181,
  202-206); `/app` -> `/` resolves to Index, the current overview equivalent of the original
  `/app` dashboard.
- Redirect is a real history-replace Command, not module aliasing: `ReplaceLegacyUrl` executes
  `Navigation.replaceUrl` (`legacy-redirects.ts:275-279`), is emitted on initial load
  (`init.ts:172-177`) and on in-app URL changes (`update.ts:276-284`); no reducer mutates location.
- Mounted tests prove `history.replaceState` (length unchanged), back/forward, and in-app
  `foldkit:urlchange` redirects (scene 99-235).
- Exactly-once read for the redirect: the replace echo is suppressed; mounted counts are 1 for
  requests, request detail and runtime config (scene 99-177).
- The runtime merge `/app/system/runtime` and `/app/system/runtime-config` -> `/runtime` is
  inspected and disclosed; the current Runtime view renders both readback and config editor
  (`view.ts:719-737,791`), so both original surfaces remain reachable.
- Native push codec is the real `urlToString` codec, replacing the broken wrapper `Url.toString`
  (`update.ts:291`); existing routes/s25b/s26b are green in the supplied GREEN log.
- `init.ts` / `update.ts` reflow is behaviour-preserving for the pre-existing branches; the only
  intended additions are the Studio init tab, the Studio update branch, and the redirect/suppression.
- Unknown/missing URLs remain truthful `NotFound` (no generic page, no Learning read).

## Defects

1. **P1 — same-route echo suppression swallows genuine navigation refreshes.**
   `src/update.ts:265-275` returns `{ model }` for *any* canonical `ChangedUrl` whose tag/instance
   matches `model.route`, with no evidence that it is the replace echo. Baseline always issued the
   route read, reset refresh state (`message: undefined`, `resyncToken + 1`, `status: "idle"`) and
   scrolled. Now a real same-route navigation — clicking the active `/requests`, Studio or
   Diagnostics nav link, repeating a `pushState` to the current URL, or back/forward between
   same-route entries — produces no `ReadReadback`, no refresh-state reset and no scroll.
   `sameRoute` (`route.ts:204-215`) compares only tag/id/NotFound path and is applied before any
   canonical-URL comparison.
   Fix: suppress only the specific pending replace echo (pending href/token), or accept one echo
   read; do not key suppression on `sameRoute` alone.
2. **P2 — bare `/studio` does not reset the tab to the documented chat alias.**
   `src/update.ts:266-274`: when the canonical URL has no `tab`, `studioTabFromUrl` returns
   `undefined` and the branch returns `{ model }`. So `/studio?tab=images` -> click the sidebar
   Studio link (`view.ts:176`, href `/studio`) leaves `model.studio.tab = "images"` while the
   address bar is `/studio`; a reload then opens `chat`, contradicting the S269 report's
   "`/studio` remains the compatible chat alias". Initial-load coverage (unit 336-351) does not
   catch this in-app alias change.
3. **P3 (evidence only) — report table inaccuracy.**
   `evidence/other/s269-canonical-url-slice.md:72-73` lists canonical "same path" for
   `/app/observe/store-degradation-receipts` and `/app/observe/observability-snapshot`; the code and
   tests canonicalise to `/observe/...` (the `/app` prefix is dropped). Minor, but the evidence
   table should show the actual hrefs.

## RED/GREEN chronology

- GREEN is consistent with the supplied log: typecheck exit 0; targeted S269 60/60; affected lane
  77/77; full package lane reported 386/386 + 20/20. Not re-run here (bounded review; Lead owns
  S269 + route regressions and any packaged rebuild).
- RED is only partly behavioural. `s269-red-tests.log` shows the unit suite failed to resolve
  `../src/legacy-redirects` (`Failed to resolve import`), so the 52 unit
  resolver/Command/inventory tests never ran; the 6 mounted supported-redirect failures are the
  genuine RED evidence, and the 2 passed guards are correct negative guards.
- `s269-canonical-url.test.ts:16-18,33` claims the dynamic import defers the module failure to the
  behaviour assertions; that claim is contradicted by the RED log.

## Test gaps

- **20-entry exact-target/history gap.** `s269-canonical-url.test.ts:281-292` only classifies
  entries as resolvable/unresolvable; it never asserts the 16 canonical hrefs/tags or a
  `ReplaceLegacyUrl`/history replace for any of `/app/local/swap`, `/app/control/providers`,
  `/app/observe`, etc. The mounted tests use canonical `/app/...` paths, not map entries, so a
  wrong legacy target would pass today's tests even though the manual mapping is currently correct.
- **No genuine same-route navigation test.** `s269-canonical-url.test.ts:307-317` asserts 0 commands
  for a same-route canonical `ChangedUrl` and thereby locks in defect 1; there is no companion
  asserting a user same-route change still reads/resets refresh.
- **No same-route different-entity test** (`RequestDetail` req-1 -> req-2, `Diagnostics` 42 -> 7),
  no `/studio` -> chat-reset test, and no hash/trailing-slash/duplicate-`tab` test.
- **No `SUPPORTED_ORIGINAL_PATHS` / 53-partition assertion.** The 37 supported rows are a separate
  hard-coded table; the exported constant's count/contents are not pinned.
- Query strings are preserved in the address bar but are not consumed by the read path (`?window`,
  `?status`); that is the known R12 scope, not an S269 regression, but the "query preserved"
  evidence must not be read as filter application.

## Out of scope / unchanged

- No product edits, no commits, no children, no provider/operator calls, no channel-state writes,
  no vendor/pin changes; SQL untouched.
- Lead still owns the S269 + existing route regression lane, the packaged rebuild (source changed),
  and any decision to fix defects 1-2 and add the missing tests.
