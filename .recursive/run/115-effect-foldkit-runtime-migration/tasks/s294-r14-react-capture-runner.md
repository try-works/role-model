# S294 — R14: wire runtime:parity --selfcheck to a real React capture/dual-run runner

Task: task-16 (rev 2, in_progress, owner s5-health-wait). Model: deepseek-flash (verified live).
Branch: recursive/115-effect-foldkit-runtime-migration. No commits; s9-private-readonly reviews after freeze.

## Reading notes (required reading done before code)

- source-proposal §6.1: the lane runs the packaged lane twice — React build and Foldkit build, same fixture
  backend, same scenario files. §6.2: freeze clock/seed Math.random, stop animations, hide carets/scrollbars,
  wait fonts/images + 400 ms DOM quiet + two stable frames, capture until two byte-identical screenshots;
  networkidle is wrong (SSE never idles). §6.4: React-vs-React must be 0 differences; determinism = two
  identical runs produce identical captures.
- s265 requirement map: R14 = MISSING-CAPTURE ("comparators only; full React capture/selfcheck/determinism/
  dual-build lane absent").
- scripts/runtime/parity-capture.mjs (S282): committed primitive, builds ON it unchanged —
  captureParityScreenshot (single acquireRelease CDP capture: deterministic bootstrap, style hide, fonts/
  images/DOM-quiet readiness, consecutive byte-identical screenshots, typed deadlines, surfaced console/
  network, per-send deadline, pagehide-safe? no — capture only), captureIssues, PARITY_CAPTURE_DEFAULTS,
  ParityCaptureError. Semantics are NOT rewritten.
- scripts/runtime-parity.mjs: the dispatcher; --request-selfcheck imports ui-parity/src/selfcheck.ts (kept
  untouched); --selfcheck currently hard-prints NOT_RUN react-capture-runner-unavailable exit 2.
- scripts/parity-capture.test.mjs: 14 protocol tests with fake CDP — the testing pattern reused.
- E:/rm-tmp/s285-real-capture-smoke.mjs: real-Chrome acquisition pattern (CHROME_PATH, --remote-debugging-port=0,
  DevTools endpoint from stderr, global WebSocket, CDP send with a deadline, two fresh browser contexts).
- evidence/other/s28b-rdc.md: R/D/C channel comparison context (React = dev, Foldkit = candidate; captures
  are reported and classified, never forced equal).

## Serving-mechanism decision (recorded before implementation)

The packaged dev executable is the fixture backend AND the static root server:
`role-model-router/dist/release/win32-x64/role-model-dev.exe --static-root <client> --fixture-root
testdata/router-runtime/fixtures --runtime-state-root <fresh of the target> --host 127.0.0.1 --port <ephemeral>`
— exactly how scripts/runtime/verify-packaged-candidate.mjs serves the Foldkit client (verify-packaged-candidate
lines 32-35, 120-123). Therefore the dual-build lane serves BOTH builds through the SAME fixture backend:
- React target static root: `role-model-router/apps/runtime-ui/build/client` (react-router build, ssr:false;
  built locally for this slice, recorded under E:/rm-tmp/s294-react-build.log).
- Foldkit target static root: `role-model-router/apps/runtime-ui-next/dist/client` (existing build).
Decision: use the packaged exe, NOT a hand-rolled static server + fixture API, because the exe already is the
fixture-backed server the packaged lane uses (same fixtures are the §6.1 "same fixture backend"); a static
server would have to re-implement the API and would not be the real serving path. If the exe rejects the React
static root (e.g. missing manifest), the runner reports FAILED target-unavailable with the reason instead of
faking a capture.

## Contract mapping

1. React-vs-React: two captures of the React build in two fresh browser contexts must have identical sha256 and
   zero captureIssues; a mismatch or any issue fails.
2. Determinism: the whole selfcheck runs twice (run 1, run 2); each target's sha must be identical across runs.
3. Dual build: both targets captured against the same fixture root; both shas + comparison (`identical` or
   `different`) recorded; a difference is classified, never forced equal, and does not fail the lane by itself.
4. Wiring: `runtime:parity --selfcheck` runs the runner and emits {status, scope:"browser-parity", ...} with
   evidence paths; exit 0 PASSED / 1 FAILED / 2 NOT_RUN (only when no Chrome). --request-selfcheck untouched.

## TDD evidence

- RED: evidence/logs/s294-red.log (behavioral capture-equality/determinism/selfcheck assertions against the
  contract stubs, not a setup failure).
- GREEN: evidence/logs/s294-green.log (unit/protocol), evidence/logs/s294-real.log (real Chrome dual-build).
  Final result + capture shas: evidence/other/s294-r14-capture-result.md.

## Final outcome (GREEN)

- `node scripts/runtime-parity.mjs --selfcheck` (CHROME_PATH set): **PASSED exit 0** — React sha
  `7e356ac3…a8c7d` (deterministic, React-vs-React equal), Foldkit sha `9a4379ca…cae72` (deterministic),
  dual comparison `different` (classified, not faked). No CHROME_PATH: NOT_RUN exit 2.
- Protocol tests: RED 8/8 failed (s294-red.log) -> GREEN 9/9 (s294-green.log).
- Real run first FAILED on favicon capture-issues + port-in-UI nondeterminism; fixed by partitioning the
  favicon network line + its console echo (recorded in `ignoredIssues`) and reusing one ephemeral port per
  target across both runs. Recorded in evidence/other/s294-r14-capture-result.md.
- Lint: test + dispatcher clean; runner one `no-runtime-typeof` at line 149 — `server.address()` typed-union
  boundary check (justified, only finding).
- React build produced locally: `node ./node_modules/@react-router/dev/bin.js build` in apps/runtime-ui
  (E:/rm-tmp/s294-react-build.log), no installs/package.json edits.
- No commit; s9-private-readonly reviews independently; Lead commits.

## Notes / limits

Scenarios: one route "/" (Index) per build in both runs, same fixtures; the full §6.5 matrix is a later slice.
Real Chrome only in the final GREEN; protocol tests use injected captures. No operator ports; ephemeral
loopback only; fresh state roots under E:/rm-tmp.
