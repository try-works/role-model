# S104b R39 CI-wiring decision review

Read-only decision review. No workflow or code edits. Sources: `ci.yml`, `build-binaries.yml`, `accept-release-candidate.yml`, `scripts/runtime/verify-client-journeys.mjs`, `scripts/runtime/compare-release.mjs`, root `package.json`, task/evidence s103a/s104.

## Verdict

Wire the **real packaged-artifact gate into `build-binaries.yml` / `build-runtime`**, not into PR `ci.yml`: that is the only place a SEA artifact exists, and it already has the per-platform package directory before archiving. Add `verify-client-journeys` there on **linux-x64 first**, after the identity/package checks and **before archive/attest/upload**, and run `compare-release` in the **production** channel of the same job after the production package is verified (accepted stage candidate vs production package). Land both behind a repo variable for the first green run, then make them blocking without touching the YAML again.

Do **not** put the journey in `ci.yml`: the PR jobs do not package the SEA, and building one in every PR is slower and more variable than the release job that already does it. Add only the cheap fail-closed script test to the existing runtime-critical/quality lane.

The scripts are **not CI-ready yet**. Wiring them before fixing the fail-open compare path and the verify input/forwarding defects would add a green step that does not prove what it claims.

## Q1 - which workflow/job, after which step

**`verify-client-journeys`:** `.github/workflows/build-binaries.yml`, job `build-runtime`, after:

1. `Verify channel manifest identity` (line ~381) - executable name/channel/source tree verified;
2. `Verify Windows standalone package` (line ~427, on Windows only), `Verify package contains no QA fixtures...` (line ~447), `Assert release package has no bundled secret material` (line ~478);

and **before** `Archive standalone package` (line ~493) / attestation / upload (line ~566). At that point the package directory, manifest, exe and `build/client` are local; no artifact download/extraction is needed, and a failure blocks `publish-stage-prerelease` and `publish-release` because both `needs: build-runtime`.

Start with `if: matrix.target == 'linux-x64'`. The matrix runners are isolated, so a Linux-only gate is a valid first ticket; add the other targets later only after the Linux form is stable (macOS SEA execution/unsigned artifacts and Windows spawned-process cleanup are untested by the current script run, which was win32-x64).

**`compare-release`:** `.github/workflows/build-binaries.yml`, same `build-runtime` job, **production channel only**, after `Verify complete production pair matches the tested stage candidate` (line ~422), before archive. The accepted stage package is already extracted at `$RUNNER_TEMP/stage-package` from `Resolve tested stage candidate`; the production package is local. That gives a deterministic "stage candidate vs production candidate" comparison with no extra download and no prior-release dependency.

If "before promotion" means **before the human acceptance receipt**, the alternative is `accept-release-candidate.yml` after `Verify packaged stage identities` and before `Create immutable acceptance receipt`: download the latest stable Linux archive as the left artifact, start it, and compare it to the candidate. That is the D-vs-C form, but it introduces a network/prior-release dependency and a first-release NOT RUN. Prefer stage-vs-production in `build-binaries`; do D-vs-C as a separate manual acceptance check if the owner wants it.

## Q2 - exit-code policy

- **0** = pass.
- **1** = fail.
- **2** = NOT RUN / invalid inputs. It must never be reported as success. In CI, print a distinct step-summary line (`R39_RESULT=NOT_RUN`) and keep the raw NOT RUN line.
- **Blocking release gate:** fail on both 1 and 2, after **one clean retry** for the environmental 2 (fresh port/state, child cleanup). A release must not be blocked by a one-off port/startup problem, but a repeat NOT RUN must block rather than silently pass. For a deterministic invalid-input 2 (missing exe/root/static/fixture, operator port), fail immediately without retry - that is a wiring bug.
- **Advisory first run:** do not use `continue-on-error` as the permanent policy. Use a repository variable (e.g. `vars.R39_VERIFY_BLOCKING`) so the step runs and reports while non-blocking until the first green dispatch, then flip the variable; no workflow edit, no silent pass after enablement. When non-blocking, the job summary must say ADVISORY - not verified; do not let a green job imply R39 verification.
- `compare-release`: exit 1 and 2 both fail the production job; no advisory mode before promotion. If the two sides are unreachable or both unauthorized, it must be a 2 (see Q5), never 0.

## Q3 - compare-release artifacts

Recommended: **accepted stage candidate (left) vs production candidate (right)** in the production `build-runtime` job. Both artifacts are produced/downloaded by that job; it checks the packaging promotion actually preserves the tested contract. This is the "stage vs candidate" option and needs no previous release.

D-vs-C (baseline dev vs candidate) is only appropriate in `accept-release-candidate.yml` with the previous accepted/stable archive downloaded as left. It should not be the only gate: the left artifact can be missing on a first release, producing a legitimate NOT RUN that would block acceptance if treated as failure. If used, define the first-release policy explicitly.

## Q4 - minimal accepted patch

I would accept, as reviewed wiring, **two small changes plus two workflow guards**:

1. **Cheap contract test in existing CI:** add `role-model-router/apps/runtime-host-bridge/test/r39-scripts.test.ts` to a required lane (e.g. `runtime-critical` or `quality`) - it proves missing inputs and operator ports exit 2, and would catch the fixture/optional-flag contract drift. No SEA needed.
2. **`build-binaries.yml`:** add the verify step after the checks listed in Q1, and the compare step in production, both on `linux-x64`, both gated by `vars.R39_VERIFY_BLOCKING == 'true'` for failure semantics (advisory until validated). Pass explicit `--executable`, `--repo-root`, `--static-root`, a freshly allocated port, a fresh `$RUNNER_TEMP` state root and `--fixture-root` (the script requires it even though the task says optional - see Q5).
3. Do **not** alter `publish-stage-prerelease`/`publish-release` `needs`; they already depend on `build-runtime`, so a blocking build step is the gate.
4. Only after a green `workflow_dispatch` run on this branch, set the variable to `true`; only then add macOS/Windows targets.

YAML sketch (verify step, bash, linux only):

```yaml
      - name: Verify packaged client journeys (R39)
        if: matrix.target == 'linux-x64'
        shell: bash
        timeout-minutes: 15
        env:
          PACKAGE_DIR: role-model-router/dist/release/${{ matrix.target }}
        run: |
          set -euo pipefail
          exe_rel="$(node -p "require('./'$PACKAGE_DIR'/manifest.json').executable")"
          exe="$PACKAGE_DIR/$exe_rel"
          test -f "$exe"; chmod +x "$exe"
          static="$PACKAGE_DIR/build/client"; test -f "$static/index.html"
          port="$(node -e 'const n=require("node:net");const s=n.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close();console.log(p)})')"
          state="$RUNNER_TEMP/r39-state-${{ matrix.target }}"; rm -rf "$state"; mkdir -p "$state"
          set +e
          node scripts/runtime/verify-client-journeys.mjs \
            --executable "$exe" --repo-root "$GITHUB_WORKSPACE" \
            --static-root "$static" --port "$port" --state-root "$state" \
            --fixture-root "$GITHUB_WORKSPACE/testdata/router-runtime/fixtures" \
            | tee r39-verify.log
          rc=${PIPESTATUS[0]}
          set -e
          grep -E '^(PASS|FAIL|NOT RUN) ' r39-verify.log || true
          if [ "$rc" -ne 0 ]; then
            echo "R39_RESULT=$([ "$rc" -eq 2 ] && echo NOT_RUN || echo FAIL)" >> "$GITHUB_STEP_SUMMARY"
            echo "verify-client-journeys exited $rc (0 pass, 1 fail, 2 NOT RUN/invalid)" >&2
            exit "$rc"
          fi
          echo "R39_RESULT=PASS" >> "$GITHUB_STEP_SUMMARY"
```

For the first run, add `continue-on-error: ${{ vars.R39_VERIFY_BLOCKING != 'true' }}` and make the step summary say ADVISORY unless the variable is true. Remove that line (or set the variable) after green.

Compare sketch (production, linux only) - start the accepted stage exe and let the script start the production exe:

```yaml
      - name: Compare accepted stage vs production package (R39)
        if: matrix.target == 'linux-x64' && env.ROLE_MODEL_BUILD_CHANNEL == 'production'
        shell: bash
        timeout-minutes: 15
        run: |
          set -euo pipefail
          stage_dir="$RUNNER_TEMP/stage-package"
          stage_exe="$(find "$stage_dir" -name "$(node -p "require('./'$stage_dir'/manifest.json').executable")" -type f | head -1)"
          test -x "$stage_exe" || chmod +x "$stage_exe"
          left_port="$(node -e 'const n=require("node:net");const s=n.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close();console.log(p)})')"
          left_state="$RUNNER_TEMP/r39-left"; rm -rf "$left_state"; mkdir -p "$left_state"
          "$stage_exe" --repo-root "$(dirname "$stage_exe")" --runtime-state-root "$left_state" \
            --scope-id standalone-runtime-dev --host 127.0.0.1 --port "$left_port" &
          left_pid=$!
          trap 'kill "$left_pid" 2>/dev/null || true' EXIT
          for i in $(seq 1 120); do curl -fsS "http://127.0.0.1:$left_port/healthz" >/dev/null && break; sleep 1; done
          curl -fsS "http://127.0.0.1:$left_port/healthz" >/dev/null
          prod_exe="role-model-router/dist/release/${{ matrix.target }}/role-model"
          right_port="$(node -e '...same allocation...')"
          node scripts/runtime/compare-release.mjs \
            --left "http://127.0.0.1:$left_port" --right-exe "$prod_exe" \
            --right-port "$right_port" --right-state "$RUNNER_TEMP/r39-right" | tee r39-compare.log
          echo "R39_COMPARE=$(tail -1 r39-compare.log)" >> "$GITHUB_STEP_SUMMARY"
```

(Use the production manifest `executable`/name rather than the literal `role-model` above; the stage package path is the one the "Resolve tested stage candidate" step extracted.)

## Q5 - script behaviour on a GitHub runner (must fix or wrap)

**Before any blocking wiring:**

1. **`compare-release` fails open.** If both sides are unreachable (left fetch throws, right never starts) then `ls === rs === undefined`, both bodies are `""`, `JSON.stringify(undefined)` is equal, and all nine rows classify `same`; exit 0. The same happens when both return the same 401/404. A CI job comparing two wrong/unstarted artifacts would be green. Fix: require every left/right response 2xx (or health 200 plus explicit classification of non-2xx as NOT RUN/exit 2), and do not classify equal errors as same. Add a fail-closed test for two unreachable URLs and two 401s; the current 4 fail-closed tests do not cover it.
2. **`verify-client-journeys` claims optional `--fixture-root` but requires it.** The input loop checks every entry, including `fixtureRoot`; pass it always (CI does above) or fix the script to only require it when needed. The task contract says optional.
3. **`--static-root` is validated but never forwarded to the child.** The spawn args omit it; the UI shell check exercises the packaged default static root, not the supplied one. Either forward `--static-root` or document that the flag only guards existence. In CI pass the package's `build/client`, but do not claim it selected the root until fixed.
4. **No free-port check.** A fixed/occupied port can make the health fetch hit another process and pass against the wrong artifact, or make the child exit while a stale service answers. Allocate (as above) and, ideally, verify the child is alive and the reported executable sha256 equals `manifest.executable_sha256`; the script prints the sha but does not compare it.
5. **State root is not required to be empty and has no `--allow-dirty-state`.** The task says empty/writable or explicit override; CI should use a fresh `$RUNNER_TEMP` dir and the script should validate emptiness.
6. **Health timeout is 30 s (120 x 250 ms).** A packaged stage runtime with 13 private extensions may exceed that on a cold runner; the current script run was Windows. Add a timeout flag or raise it before making it a release gate.
7. **Child cleanup is `child.kill()` + 500 ms, no exit wait/force.** On Linux/macOS a SIGTERM-ignoring server or a spawned helper can leave the port/state; a 2 may be reported while the process stays. Wait for exit, then force-kill, and remove temp state in CI.
8. **Platform: run linux-x64 first.** The real proof was `win32-x64`; the SEA path, executable bit (chmod), and static-root resolution differ on Linux. The build-binaries Linux archive had no execution proof. The script itself is Node and should run, but the child's `--repo-root`/fixture paths and static default must be exercised.
9. **Operator access relies on loopback device-owner trust.** The script has no token option; on 127.0.0.1 the host's `deviceOwnerTrust` is on by default, but a packaged profile with trust off will make learning/replay/evaluation return 401 and the script exits 1, not 2. For a release candidate this should be a deterministic configuration error (or support a token); do not add a token around the release gate without a secret-handling decision.
10. **`compare-release` default right state is `E:/rm-tmp/...`.** On Linux it creates a literal `E:`-named directory under the workspace (works but wrong); on a Windows GitHub runner E: may not exist and `mkdirSync` fails. Always pass `--right-state "$RUNNER_TEMP/..."` (as above) and fix the default to `os.tmpdir()`.
11. **No fetch timeout/abort in compare-release.** A hung left/right fetch can sit until the job timeout; add AbortSignal/timeout.
12. **No identity/distinctness check.** compare-release strips version/commit/executable sha (by design), so the same URL passed twice, or two wrong but equal artifacts, yields `same`/exit 0. CI must pin left/right from distinct artifacts and check their manifest sha before invoking the script; optionally add `--left-exe`/expected identity.
13. **Fixture root in a release package:** use the repo's `testdata/router-runtime/fixtures` on the runner, not a package path; the package deliberately excludes testdata. The above sketch does that.
14. **`verify-client-journeys` health check does not validate the child process identity.** It prints `sha256` but does not compare to the manifest; a stale process answering on the port can pass. CI should compare the printed sha256 to `manifest.executable_sha256` (and fail on mismatch).

## Recommended insertion summary

1. Add the r39 script contract test to the existing required runtime lane (no SEA).
2. Add the `verify-client-journeys` step to `build-binaries.yml` `build-runtime`, linux-x64, after the manifest/package checks, before archiving; use a fresh port/state, pass `--fixture-root`, and gate blocking via `vars.R39_VERIFY_BLOCKING` until the first dispatch run is green.
3. Add the production `compare-release` step after the production pair verification, stage candidate vs production package, linux-x64, fail on exit 1/2.
4. Fix the script defects in Q5 first: compare-release fail-open, verify fixture/static/empty-state/port/identity/cleanup, compare-release default state and fetch timeouts.
5. Keep `ci.yml` PR jobs unchanged except the cheap script test; do not make a PR job build/execute a SEA until the release gate has run green.
