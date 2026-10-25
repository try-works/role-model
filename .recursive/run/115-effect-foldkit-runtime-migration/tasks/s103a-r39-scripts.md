# S103a R39: implement the two maintained verification scripts (public)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R39 is currently UNIMPLEMENTED - neither script exists anywhere in the tree. Implement both, to the acceptance criteria:

> Implement `runtime:verify-client-journeys` and `runtime:compare-release` as maintained scripts with controller-owned root/CI wiring; actual target/config/port/root validation **fails closed**, no silent mocks, **NOT RUN distinct from successful test exit**.

## 1. `scripts/runtime/verify-client-journeys.mjs` (+ npm script `runtime:verify-client-journeys`)

- Inputs (flags or env, document which): `--executable <path>`, `--repo-root <path>`, `--static-root <path>`, `--port <n>`, `--state-root <path>`, optional `--fixture-root`.
- **Fail closed**: each required input is validated (file exists, dir exists, port is a free positive integer, state root is writable and EMPTY or `--allow-dirty-state`); a missing/invalid input exits **2** with a NOT RUN line naming the input. Never invent defaults.
- Starts the executable with an explicit state root (never an operator root, never 3456/3457/3458 - refuse those ports explicitly), waits for health with a bounded timeout, runs the journeys as HTTP assertions: health, models shape, telemetry summary shape, controller read, learning read, replay/evaluation job lists (empty allowed, shape asserted), and the UI shell served when `--static-root` is given.
- Output: one line per journey with `PASS` / `FAIL` / `NOT RUN` (NOT RUN = precondition unavailable, e.g. no static root supplied, or the host reports a capability disabled). Exit codes: **0 all pass, 1 any fail, 2 any not-run or invalid input**. A run that is entirely NOT RUN must never exit 0.
- Prints the executable's version and sha256 (computed) and the port/state root used, so the evidence identifies the artifact.

## 2. `scripts/runtime/compare-release.mjs` (+ npm script `runtime:compare-release`)

- Inputs: `--left <baseUrl>` and `--right <baseUrl>` (or `--right-executable` + the same inputs as above to start the right side itself); both are validated and fail closed.
- Compares a fixed endpoint set (healthz, models, endpoints, router/summary, operator/learning, operator/replay/jobs, operator/evaluation/jobs, runtime/summary) and classifies every difference as `same` / `environment-identity` (commit, version, tree, exe sha, pid, rss, build date, state paths) / `environment-state` (counts, history) / `different`.
- Output: table + counts + a final verdict; exit **0** when no `different` rows, **1** when any `different`, **2** on invalid input (NOT RUN).

## 3. Wiring and tests

- Add both to the root `package.json` scripts. **Do not** claim CI is wired: state exactly where a CI job would call them and what the workflow needs (the run cannot edit workflows without review).
- Add a test that proves the fail-closed behaviour: invoking each script with a missing input or an operator port exits 2 with a NOT RUN line (spawn the script, assert exit code and output).

## Constraints

NO operator state or operator ports, no packaging, no installs, no commits, no subagents. Everything runs against temp state on E:.

## Report
The two scripts' contracts, exit-code table, the fail-closed test, a real run of `verify-client-journeys` against the packaged artifact `E:/rm-tmp/s97a/release/win32-x64/role-model-dev.exe`, and a real `compare-release` run between two packaged candidates (D and C) with its classification counts.