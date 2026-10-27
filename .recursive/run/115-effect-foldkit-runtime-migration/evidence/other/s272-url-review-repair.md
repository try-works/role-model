# S272 — finite repair of the S271 URL review defects

Date: 2026-10-27. Implementer: deepseek-official/deepseek-flash (exact model per task), GPT Lead.
Task: `.recursive/run/115-effect-foldkit-runtime-migration/tasks/s272-url-review-repair.md`.
Mode: bounded repair, strict RED before source edits, no children, no commits, no provider/operator
calls. This is not a completion claim for R11/R13 or the run.

## Inputs reread

- `REASSESSMENT-AND-EXECUTION.md` (effective Phase 3 plan).
- `addenda/02-workspace-reference-implementation.md` (required Workspace guidance).
- `tasks/s269-canonical-url-slice.md` and `evidence/other/s269-canonical-url-slice.md`
  (plus its new S272 correction addendum).
- `tasks/s271-url-review.md` and `evidence/other/s271-url-review.md` (independent HOLD).
- Original `apps/runtime-ui/app/routes.ts` and `app/routes/legacy-redirect.tsx`, and the current S269
  working diff. SQL was read only as diff context and was NOT changed.

## Scope changed (only the task-owned files)

| File | Change |
|---|---|
| `apps/runtime-ui-next/src/model.ts` | optional `pendingRedirectHref` schema field: the exact canonical href of the one pending replace echo |
| `apps/runtime-ui-next/src/legacy-redirects.ts` | exact object dictionaries + `Object.entries`-built `ReadonlyMap` lookups; explicit `UrlSearchAndHash` return; exported `canonicalHrefForUrl` |
| `apps/runtime-ui-next/src/init.ts` | records `pendingRedirectHref` when the initial legacy replace Command is emitted |
| `apps/runtime-ui-next/src/update.ts` | consumes only the first exact matching `ChangedUrl`; clears the marker on every other navigation; explicit Studio route navigation resets the tab |
| `apps/runtime-ui-next/test/s269-canonical-url.test.ts` | revised no-op test, P1/P2 regressions, 16/4 literal redirect table, 20/22 inventory, 53-pattern partition |
| `apps/runtime-ui-next/test/s269-canonical-url.scene.test.ts` | named JSON-compatible body type, mounted legacy map-entry history proof, mounted same-route re-read proof |
| `evidence/other/s269-canonical-url-slice.md` | correction addendum + corrected same-path rows + corrected RED labelling |

No `view.ts`, `readback.ts`, `refresh.ts`, client, SQL, package, vendor, root or original
integration-test change. No deletion of original integration tests.

## P1 repair (same-route echo no longer swallows genuine navigation)

The old `ChangedUrl` branch returned `{ model }` for any canonical URL whose `sameRoute` matched.
It now:

1. resolves the URL and computes the exact path+query+hash;
2. stores the exact redirect href in `model.pendingRedirectHref` when init/in-app legacy
   navigation emits the `ReplaceLegacyUrl` Command;
3. consumes exactly the first `ChangedUrl` whose exact href matches that marker (zero Commands,
   no duplicate read) and clears the marker;
4. clears the marker on every other navigation and runs the baseline
   `navigateToRoute` path — read, refresh reset (`message: undefined`, `status: "idle"`),
   `resyncToken + 1`, and `ScrollShellToTop`;
5. a genuine same-route navigation after the echo therefore reads/resets/scrolls exactly as
   baseline.

There is no closure-global mutable suppression; the marker is per-model-instance and keyed by the
exact canonical href.

**Bounded limitation (documented, no silent navigation drop):** `ChangedUrl` carries only a `Url`
and the runtime does not expose which `foldkit:urlchange` was caused by our Command. If a genuine
navigation to the exact pending href arrives before the real echo, it is consumed as the one echo;
the real echo then arrives with no pending marker and runs a baseline navigation. The read is
delayed, not dropped. This is the smallest honest identity the current runtime exposes.

## P2 repair (bare `/studio` explicitly becomes chat)

`/studio` with no `?tab=` now goes through the Studio navigation branch, so
`studioTabFromUrl(canonicalUrl) ?? "chat"` resets `/studio?tab=images` -> `chat`. The address bar
and the selected tab agree again. A preserved `?tab=` query is not evidence that any filter was
applied.

## Tests added / revised

- Revised the old "ignores its own echo" test into: one pending echo consumes zero Commands, then a
  genuine same-route navigation reads/scrolls/resyncs.
- Same-route exact URL after echo; changed query; different request-detail IDs; repeated
  diagnostics IDs; interleaved real navigation; stale echo after newer work; the one-echo
  ambiguity/no-silent-drop case; `/studio?tab=images` -> `/studio` chat reset; changed Studio tab
  reads again.
- Independent literal table of the 16 resolvable legacy redirect entries with exact href + route
  tag and `ReplaceLegacyUrl` Command assertions; explicit 4-missing list; 20 route-entry /
  22 map-string inventory; 37 supported + `/` + 15 missing = 53 partition.
- One mounted legacy redirect-map-entry history test (`/app/observe` -> `/requests`) and one
  mounted same-route re-read test.
- No missing family was invented; the 15 explicit missing targets stay `NotFound`.

## RED evidence (before source edits)

- Log: `evidence/other/s272-red-tests.log` (raw: `E:/rm-tmp/s272-red-tests.log`). Command:
  `pnpm --filter @role-model-router/runtime-ui-next exec vitest run --silent=true test/s269-canonical-url.test.ts test/s269-canonical-url.scene.test.ts`.
- Result: exit 1, **7 failed / 84 passed**. Failures were behavioural on the pre-repair source:
  - genuine same-route navigation after the echo: 0 reads instead of 1;
  - changed query suppressed;
  - repeated diagnostics ID suppressed;
  - the real echo after the ambiguous first match suppressed;
  - `/studio?tab=images` -> `/studio` kept `images` instead of `chat`;
  - changed Studio tab produced no read;
  - mounted same-route re-read timed out (no second fetch).
- The historical S269 unit failure (missing `../src/legacy-redirects`) is labelled as a **setup
  failure**, not RED; its 6 mounted supported-redirect failures were the actual RED. The S272 RED
  above is behavioural.

## GREEN evidence (after source edits)

- Log: `evidence/other/s272-green-tests.log` (raw: `E:/rm-tmp/s272-green-tests.log`).
- `tsc --noEmit -p tsconfig.json`: exit 0.
- S269 targeted: 91/91 passed (81 unit + 10 mounted).
- Typed targeted regression lane S269 + `routes` + `s25b` + `s26b`: **108/108 passed**, 5 files,
  exit 0.
- RED->GREEN: the 7 RED failures now pass, and the 84 previously passing tests still pass.

## Lint

- `anti_slop_lint` is UNAVAILABLE in this harness; it was NOT run and the Lead must run it.
- Equivalent disclosed scan: `evidence/other/s272-antislop-equivalent-scan.log`.
- Repaired as requested: the two legacy dictionaries are exact object constants, not
  `Readonly<Record<string, string>>`; lookups use `Object.entries`-built `ReadonlyMap.get`;
  `searchAndHash` has an explicit `UrlSearchAndHash` return; the scene-test JSON body uses the
  named `JsonValue` union instead of `unknown`. No casts/any/unknown were added.
- No vendor pin or dependency change.

## Unchanged / remaining

- No packaged acceptance: source changed, so the Lead must rebuild before any packaged claim.
- No provider/operator calls, no channel-state/port writes, no environment/provider changes.
- No commits, branches, PRs, children, or model changes.
- The 15 missing original feature targets and the broader R11/R12/R13 work remain open; this is a
  bounded P1/P2 + test-coverage repair only.
- Harness note: pnpm printed `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` and used the existing
  virtual store; the recorded typecheck/test exit codes above are the actual command results.
