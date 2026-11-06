# S273 — finite SQL test cleanup/evidence repair

Run: `115-effect-foldkit-runtime-migration`. Exact Flash implementer, GPT Lead. No children, no commits.
Owned files only: `role-model-router/packages/sql-sqlite-node/test/s268-mixed-owner.test.ts`,
NEW `test/support/s273-cleanup.ts`, NEW `test/s273-cleanup.test.ts`, this addendum, and `evidence/logs/s273-*`.
`src/service.ts` and all URL/client files were not edited. This is the S268 addendum that supersedes the
S268 report's test-byte/receipt claims; the previous `s268-green.log` and line citations are historical.

## Inputs reread

- `tasks/s273-sql-cleanup-repair.md`
- `evidence/other/s270-sql-owner-review.md` (Finding 2 teardown/masking; Finding 1 evidence HOLD)
- `evidence/other/s268-sql-owner-safety.md`, `evidence/other/s268-lead-verification.md`
- current `test/s268-mixed-owner.test.ts` (hash `87DB…` at start)
- `test/sqlite-service.test.ts` teardown precedent and `test/s18a-sql-truth.test.ts` regression scope

## Strict RED (test first, no service change)

1. `evidence/logs/s273-red-initial.log` — the new deterministic suite was added before the helper existed:
   `1 failed suite`, no tests, `Cannot find module './support/s273-cleanup'`.
2. The existing S268 `finishSuspended` logic and the current unguarded freshService/teardown semantics were then
   represented unchanged in the support module so the RED could prove behavior rather than only an import
   failure. `evidence/logs/s273-red.log` — `1 failed file`, `Tests 10 failed | 1 passed (11)`:
   - inspect primary was replaced by the release error;
   - commit was skipped after a release failure;
   - ready rejection skipped release and commit entirely;
   - `undefined`/falsey primary was replaced by a cleanup error;
   - failed setup left the acquired database open (`isOpen() === true`);
   - teardown removed a live database directory (`EPERM`) and stopped after the first failure;
   - teardown errors threw over an existing test failure;
   - sole teardown failures threw the raw first error rather than a reported aggregate.

The repair edit to the helper followed these RED runs.

## Repair

`test/support/s273-cleanup.ts` (test-only, module-local, typed):

- `finishSuspended`: records ready/inspect primary with a presence flag (so `throw undefined` survives), always
  attempts `release` and `commit`, reports each cleanup failure separately, rethrows the primary by identity, and
  rethrows the first cleanup failure when there is no primary.
- `makeTempDatabase`: on failed open/initialize, closes the acquired database, removes the temp directory,
  reports best-effort cleanup errors, and rethrows the setup error. On success it registers close-then-remove
  teardown steps.
- `makeCleanupBatch` / `disposeAfterTest`: attempt every teardown step even after an earlier failure, report each
  failure, do not throw over an existing test assertion (`afterEach` context `task.result.state === "fail"`), and
  still throw an `AggregateError` when cleanup is the sole failure.
- Named callback/report types; no module mocks, no `as` casts, no broad `unknown` return types. Only caught error
  values are typed `unknown`.

`test/s268-mixed-owner.test.ts`: only wiring changed to the helper (`freshService`, teardown, `finishSuspended`,
lazy `commit: () => commit`, type-correct `release` wrapper). All seven real tempDB/Deferred behavioral
assertions are unchanged.

## GREEN

`evidence/logs/s273-green.log` — `Test Files 4 passed (4)`, `Tests 39 passed (39)`, exit 0:

| File | Tests |
|---|---:|
| `test/s268-mixed-owner.test.ts` | 7 passed |
| `test/sqlite-service.test.ts` (legacy, unchanged) | 11 passed |
| `test/s18a-sql-truth.test.ts` (unchanged) | 10 passed |
| `test/s273-cleanup.test.ts` (new) | 11 passed |

`evidence/logs/s273-tsc.log` — targeted strict type-check of the three changed test/support files, exit 0
(`--strict --noEmit --module ESNext --moduleResolution Bundler`).
`evidence/logs/s273-biome.log` — `biome check` on the three changed files, exit 0, no fixes applied.

## Final hashes

From `evidence/logs/s273-hashes.log`:

| Artifact | SHA-256 |
|---|---|
| `src/service.ts` (unchanged from S270 pin) | `485AC00EC71FEC0134BD3CD094646FA81235E45824FD9211C8CA36413A5E82BF` |
| `test/s268-mixed-owner.test.ts` | `1BB6116FA9A8EA34FA1DD459A523E9545AE4F6768B443ECFE8C81721D31A34D8` |
| `test/s273-cleanup.test.ts` | `85805EAE3C5B0A70493B2DFF2C2A6B46E09C6093583496658451511CDC52EC39` |
| `test/support/s273-cleanup.ts` | `A0E7588D0C77CF31E6290B04E5A1A252D8DCBED59A492A2A29339EB93511245E` |

The S268 test hash changed from `87DBB1F0…` (S270 review) to `1BB6116F…`; do not cite the old GREEN/report
lines as current.

## Anti-slop / hygiene

- `anti_slop_lint` is **unavailable in this harness** (`Get-Command anti_slop_lint` not found). Lead must run
  the actual tool; no shell-equivalent PASS is claimed.
- Biome 3 changed files clean; targeted strict tsc clean.
- No `src/service.ts`, URL/client, package, vendor, operator, network, provider, or build edits.
- No commits, no children, no full suite, no packaged/SEA verification.
- TMP/TEMP were `E:/rm-tmp`; leftover RED temp directory was removed. Final teardown closed owned handles and
  removed its directories.

## Limitations

- Bounded test-cleanup slice only; it does not address S270 Findings 4/5 (owner self-close/nested async close,
  BEGIN outside try) or finish R23/R24.
- The Vitest failing-test integration (`afterEach` reading `task.result.state`) is implemented against the
  documented context but not executed by a deliberately failing test; the `disposeAfterTest(true, …)` branch is
  covered directly. No production assertion path was weakened.
- No service behavior was changed, so the S270 product PASS remains the product-behavior reference at the
  unchanged service hash.

## Commands (cwd = `role-model-router/packages/sql-sqlite-node`, `TMP=TEMP=E:/rm-tmp`)

```powershell
node ../../../node_modules/vitest/vitest.mjs run test/s273-cleanup.test.ts        # RED then GREEN
node ../../../node_modules/vitest/vitest.mjs run test/s268-mixed-owner.test.ts test/sqlite-service.test.ts test/s18a-sql-truth.test.ts test/s273-cleanup.test.ts
node ../../../node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --types node --skipLibCheck test/s268-mixed-owner.test.ts test/s273-cleanup.test.ts test/support/s273-cleanup.ts
node ../../../node_modules/@biomejs/biome/bin/biome check test/s268-mixed-owner.test.ts test/s273-cleanup.test.ts test/support/s273-cleanup.ts
```
