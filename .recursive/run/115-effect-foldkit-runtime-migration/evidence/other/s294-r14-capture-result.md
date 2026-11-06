# S294 — R14 React capture / determinism / dual-build selfcheck (result)

Task-16 (in_progress, owner s5-health-wait). Branch recursive/115-effect-foldkit-runtime-migration. No commit.
Real Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`), ephemeral loopback ports only, TMP/TEMP=E:/rm-tmp,
state roots + user-data under E:. No operator port 3456/3457/3458 touched.

## Lane

`node scripts/runtime-parity.mjs --selfcheck` now runs the real runner and prints the JSON contract.
Each target is served by the packaged dev executable (`--static-root <build/client> --fixture-root
testdata/router-runtime/fixtures --runtime-state-root <fresh E: root> --host 127.0.0.1 --port <ephemeral>`) and captured with
the committed S282 primitive (two captures per target in two identical full runs, fresh browser contexts).
React build was produced locally for this slice: `react-router build` (vite, 2440 modules, ssr:false) from
`apps/runtime-ui`; evidence: E:/rm-tmp/s294-react-build.log. Foldkit build: `apps/runtime-ui-next/dist/client`.

## Final result (evidence/logs/s294-real5.log) — PASSED, exit 0

| Target | sha256 (both runs) | deterministic | issues |
| --- | --- | --- | --- |
| React build | `4cf7b45cc545062b35a7925d2352ef66d710662b3e4f6b7fec98f2b6ec12059e` | yes | none |
| Foldkit build | `9415dd97969c42ccb09414eddaf95e4a78c97baba3256baeb1baaa4817dc35d6` | yes | none |

- React-vs-React: **equal** (0 differences); determinism: both targets identical across the two full runs;
  dual build: React vs Foldkit = **different**, classified `different`, never forced equal.
- Capture options: `quietMs: 1200`, `stableCount: 3` (the S282 primitive's documented options; semantics untouched).
  Added after a real run caught a *stable* "Loading runtime overview…" placeholder — the earlier 400 ms quiet
  window could end before the SPA's readback data arrived. This makes a false placeholder PASS materially less
  likely but does NOT eliminate it (a stable placeholder can still pass); a content-readiness assertion belongs
  to a later comparator slice.
- `ignoredCount`: 4 (favicon 404 network line + its URL-less console echo only; recorded per capture).
- Executable: `role-model-dev.exe` version `0.0.20-231-gd61c32dc` sha `e3181d507a6ccd757407024dda25b1813329dd6e7895ae5d4e52b4f84c63e7a7`;
  tempRoot `E:\rm-tmp`, chromeUserDataRoot under `E:\rm-tmp\s294-chrome-*`.
- `--selfcheck` without CHROME_PATH: `{"status":"NOT_RUN","scope":"browser-parity","reason":"no-browser-available","exitCode":2}` (exit 2).
- `--request-selfcheck`: byte-unchanged branch (tsx-loaded import; verified PASSED under tsx).

## TDD evidence

- RED (`s294-red.log`): 8/8 contract tests failed against the runner skeleton (behavioural equality/determinism/exit-code assertions).
- RED2 (`s294-red2.log`): 6 first-round S295 tests failed first; GREEN2 (`s294-green2.log`): 15/15.
- RED3 (`s294-red3.log`): 3 second-round tests failed first (provenance shape, temp drive, launch orphan); GREEN3 (`s294-green3.log`): 19/19.
- Real-run REDs, each fixed in the runner and never by faking equality: favicon capture-issues; port-in-UI
  nondeterminism (one ephemeral port per target reused across runs); one stable loading-placeholder capture
  (stronger quiet/stable options).

## S295 repair map (current bytes)

| Round | Item | Where |
| --- | --- | --- |
| 1 | exact capture count + both targets present | `evaluateSelfcheck` run-count (parity-selfcheck.mjs:145), per-run shape (:147-156), target-missing (:159-160) |
| 1 | ignoredIssues emitted | per-capture entries, per-target `ignoredIssues`, `ignoredCount` (:200) |
| 1 | failure containment | `main` try/catch/finally (:405-460), `runSelfcheck` capture-failed, dispatcher try/catch (runtime-parity.mjs:17-21) |
| 1 | exe identity | `resolveExecutableIdentity` (:82), recorded in `main` |
| 1 | temp root recorded | `tempRoot`/`chromeUserDataRoot` in the result (:423-424, :455) |
| 1 | reactVsReact from the two react shas, emitted on FAILED | `buildComparisons` (:112-117) |
| 1 | single evaluate + both pngs | one `evaluateSelfcheck` on the success path; `evidence.targets` pngs |
| 2 | provenance: exactly two runs AND one capture per target per run | run-count (:145), incompleteRuns shape (:147-156) |
| 2 | Chrome orphan + pre-try filesystem | `launchChrome` child tracked before the endpoint await and killed on failure (:301-337); FS/launch inside the protected region (:423-425); host error/exit handlers (:445-449); idempotent `killAll` in finally (:411-417) |
| 2 | temp-root enforcement (E: default, overridable) | `DEFAULT_TEMP_DRIVE` (:43), `enforceTempRoot` (:46), fail-fast guard in `main` (:393) |
| 2 | result doc rewritten to final state | this file |
| 3 | spawn-error child handling | `launchChrome` child `error` listener (:327-332) clears the timer and rejects the endpoint promise; the existing catch (:334-343) kills the child; the injected test proves rejection + killed child and `main`'s injected-launch test proves FAILED JSON |

Lint: `parity-selfcheck.mjs`, `parity-selfcheck.test.mjs` and `runtime-parity.mjs` are all **clean** (no findings).

## Harness decisions (recorded)

1. **One ephemeral port per target, reused across both runs.** The UI renders its endpoint URL; a new
   port per run is harness state, not app behaviour. OS-assigned loopback port only (never 3456/3457/3458).
2. **Favicon 404 partitioned and recorded.** The fixture server has no favicon; the network line and its
   URL-less console echo are ignored together and listed in `ignoredIssues`. A URL-less 404 echo without
   a favicon network line is still surfaced (tested).
3. Scenario: route `/` (Index) per build in both runs, same fixture backend. The full §6.5 matrix is a later slice.

## Deviations / limits

- The React build is produced from `apps/runtime-ui` via its own `react-router build` (no installs, no package.json edits).
- No single "mutation check" byte-diff in this slice (R14 §6.4 mutation belongs to the comparator pilot); the
  runner reports captures + equality and is the extension point for it.
- Lint: all three files (`parity-selfcheck.mjs`, `parity-selfcheck.test.mjs`, `runtime-parity.mjs`) are **clean**;
  the former `server.address()` `no-runtime-typeof` finding was replaced by an `in` narrowing.