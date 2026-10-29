# S479 independent review — packaged markReady transition

Date: 2026-10-29. Read-only review. Reviewed public `src/cli.ts` and `test/cli-startup-readiness.test.ts`; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified

- `role-model-router/apps/runtime-host-bridge/src/cli.ts` = `8A55B5301945B9185853740F48766AFE1F0E64AF87A79591869947237D84CCD8`, 595760 bytes (match).
- `role-model-router/apps/runtime-host-bridge/test/cli-startup-readiness.test.ts` = `F983E2184DAA307CD8680A949C01F3FE74F37D0B3B8B66E66A8ECF70A1B9A796`, 5123 bytes (match).

## Verdict: HOLD (bounded, test/acceptance evidence only)

The source change is structurally correct. The HOLD is because the required behavioral test of the packaged branch is not present, and RED disclosure is not recorded in evidence.

## Source verification (PASS)

- Diff is bounded: `cli.ts` +13/−3 (helper, removal of duplicate, one shared call); test +13.
- New helper `completeCliStartupReadiness` at `cli.ts:4324-4332`: sets `status="ready"`, deletes `message`, calls `readinessOwner.markReady()` exactly once.
- Single shared transition after the packaged/non-packaged if/else at `cli.ts:12245`; the former duplicate block (`bootstrapState.status="ready"; readinessOwner.markReady(); delete message`) is removed from the non-packaged `else` (previously `:12235-12237`).
- `grep readinessOwner.markReady` in `src/cli.ts` yields exactly **one** call site (inside the helper).
- Packaged branch-specific registrations and watchdog remain inside the packaged branch (`:12212-12219`): `backend = packagedRuntime.backend`, `hostScope.register("packagedRuntime")`, `startCliExtensionRuntimeWatchdog` unchanged.
- Catch path untouched: `failExtensionRuntime(error)` / `console.error` at `:12246-12249`; `readinessOwner.markFailed` remains at `:5178`.
- No public HTTP contract change; no unrelated edits in the diff.

## Verification executed

- `vitest run cli-startup-readiness s120 run96-f166 s475`: **4 files, 14/14 passed**, exit 0. Matches the author green (`s478-green.log` 14/14).
- Host `tsc --noEmit -p tsconfig.json`: **exit 0**.
- UI-next `tsc --noEmit -p tsconfig.json`: **exit 0**.
- `anti_slop_lint` effect:true on `cli.ts`: **1037 findings**, identical to the HEAD copy (1037); **zero added-line findings**.

## Finding 1 (blocking acceptance evidence) — the new test is not the packaged-branch test

The only added test (`cli-startup-readiness.test.ts:134-146`) calls the exported helper directly. It does **not** execute `main()` or the packaged branch, and it does not assert that the call at `cli.ts:12245` exists. Removing the `completeCliStartupReadiness(...)` call at `:12245` would leave this test green, so the regression the task required (“packaged path leaves readiness pending”) is not protected by a test.

The S477 bootdiag is a genuine pre-fix **behavioral** packaged probe (packaged operator route 503 while every awaited step completed), and it is valid pre-fix evidence. But the task explicitly required extending the startup test with a packaged-branch case; a helper-only unit test does not satisfy it. Add an injectable/main-level seam that runs the packaged branch (or refactor the ready decision into a testable function invoked from both branches) and assert exactly one `markReady` and `status=ready` through that path.

## Finding 2 (disclosure) — no RED artifact; unit test is post-fix

No `s478-red.log` or equivalent RED evidence exists in the run. The added unit test is written against the new helper and could not have been RED before the helper existed. The honest RED is the S477 packaged probe (pre-fix pending), which is recorded at `evidence/other/s477-bootstrap-hang-location.md`; the task/evidence should state explicitly that the unit test is **post-fix** and is not claimed as RED. Currently only `s478-green.log` exists.

## Non-blocking notes

- The helper is exported only for the test; acceptable, but the test should exercise the production call path.
- No whole R27/R36 claim is made by this review; only the bounded transition is evaluated.

## Limitations

- Read-only review; I did not rebuild or run the sealed packaged executable. The S477 packaged probe is accepted as the author pre-fix behavioral evidence, not independently re-run.
- I did not inspect every unrelated `cli.ts` line; review is limited to the diff and its immediate call paths.


---

# S479 FINAL re-review on refrozen bytes — **HOLD** (new branch-selection finding)

Date: 2026-10-29. Read-only; no source edits; this append only.

## Refrozen hashes verified
- `cli.ts` = `DBF184736705978DBADB002AFD3081F7271EABF0B6A730C3286E75A17BFFE627`, **596509 bytes** (match).
- `test/cli-startup-readiness.test.ts` = `A3DE8AF7B2B8DF8C69A34296D4D165B42DB62034453F229EFB9BC3017C95ADF0` (match).
- Active model: `s9b-eventlog` = **deepseek-flash** via `list_agents`.

## Prior HOLD items — resolved
1. **Branch seam:** `runCliBackendBranch` (`cli.ts:4324-4336`) now runs either `runPackaged` or `runPlain` and then calls `completeCliStartupReadiness`; test `cli-startup-readiness.test.ts:152-190` invokes the seam, asserts packaged-only execution and exactly one `markReady`. Removing the shared call would fail the test.
2. **RED disclosure:** `s478-red.log` now records the genuine pre-fix behavioral RED (S477 packaged probe: operator models 503 while all awaits completed, no markReady) and explicitly states the unit test was written post-fix and is **not** claimed as RED.
3. Shared transition after the if/else; duplicate removed from the non-packaged else; packaged registrations/watchdog and `failExtensionRuntime`/`markFailed` catch unchanged; exactly one `readinessOwner.markReady` call site.

## Verification executed
- `vitest` four suites: **4 files, 16/16 passed**, exit 0 (matches `s478-green.log`).
- Host `tsc`: **0**; UI-next `tsc`: **0**.
- `anti_slop_lint` effect:true on `cli.ts`: **1037 findings, identical to HEAD**, zero added-line findings.

## NEW blocking finding — branch condition changed semantics
Original clean HEAD structure: `if (trackBManifestText && trackBManifestPath) { ... packaged ... } else { ... plain ... }`; `packagedReleaseId` was used only **inside** the packaged branch to validate private distribution identity.

Refactor uses:
```ts
packaged: packagedReleaseId !== undefined
```
at `cli.ts:12262-12267`, while `runPackagedBackend` is assigned only inside the manifest branch (`:11836`/`:11876`).

Consequences:
- **manifest present but no `packagedReleaseId`** (the supported explicit `--track-b-runtime-manifest` / env-manifest path): original code ran the packaged backend; new code takes `runPlainBackend` and skips the packaged runtime entirely.
- **`packagedReleaseId` set but manifest text missing/unreadable**: `runPackagedBackend` stays uninitialized while `packaged` is true, producing a TypeError instead of the original plain-fallback behavior.

Required fix before PASS: select the branch from the actual manifest presence (`trackBManifestText && trackBManifestPath`), e.g. carry a `hasPackagedDistribution` boolean set in the same `if` that assigns `runPackagedBackend`, and add a seam test for manifest-present/no-release-id selection. The current tests pass booleans directly, so they cannot detect this.

## Final verdict: **HOLD**
Source transition mechanics and prior evidence issues are fixed, but the refactor changes which backend branch runs for a supported manifest-only configuration. No whole R27/R36 claim. Sealed packaged exe not independently re-run; S477 probe accepted as pre-fix RED.

---

# S479 FINAL re-review (corrected bytes) — **bounded PASS**

Date: 2026-10-29. Read-only; no source edits; this append only.

## Refrozen hashes verified
- `cli.ts` = `3CCC987725EA9EF559853CC62C47EF5B6BC09486846C500D131CC2AA98ADAB6B`, **596816 bytes** (match).
- `cli-startup-readiness.test.ts` = `6BB0C9347F1EB6EB5E48A7FBFE69C04E666B24AE8A2B4F6359D4F4266C1EA962` (match).
- Active model: `s9b-eventlog` = **deepseek-flash** via `list_agents`.

## Prior branch-selection HOLD — resolved
- `hasPackagedDistribution` is set true in the same `if (trackBManifestText && trackBManifestPath)` that assigns `runPackagedBackend` (`cli.ts:11843-11845`, assignment at `:11888`).
- `runCliBackendBranch` selects on `hasPackagedDistribution`, not `packagedReleaseId` (`:4324-4347`, call `:12267-12275`). `packagedReleaseId` is passed but unused for selection; release-id-without-manifest takes plain and cannot TypeError.
- The shared `completeCliStartupReadiness` runs once after either branch; duplicate else transition removed; exactly one `readinessOwner.markReady` call site (`:4349`). Packaged registrations/watchdog and `failExtensionRuntime`/`markFailed` unchanged.
- Missing `runPackaged` with packaged now throws a clear Error (code-inspected; see caveat).

## Verification executed
- `vitest` four suites: **4 files, 18/18 passed**, exit 0; matches `s478-green.log` `Tests 18 passed`.
- Host `tsc`: **0**; UI-next `tsc`: **0**.
- `anti_slop_lint` effect:true on `cli.ts`: **1037 findings, identical to HEAD**, zero added-line findings.
- RED disclosure remains honest: `s478-red.log` records the S477 packaged probe as pre-fix behavioral RED and explicitly says the unit tests are post-fix, not RED.

## Verdict: **bounded PASS**
Source mechanics, branch selection, shared transition and evidence now satisfy the bounded S478 acceptance.

## Non-blocking caveats
- The “packaged flag but missing `runPackaged`” guard is code-inspected, not covered by a test.
- `packagedReleaseId` is now an unused selection parameter in the seam (kept for the record); harmless but removable in a cleanup.
- Sealed packaged exe was not independently re-run by this reviewer; the S477 probe is accepted as the pre-fix behavioral RED. No whole R27/R36 claim.
