# S104 R39 scripts: implemented, then repaired after my own run exposed two defects

The worker delivered both scripts and a 4/4 fail-closed test. My first real run against the shipped artifact **failed**, and the failure was worth more than the delivery.

## Defect 1 - `--fixture-root` was never parsed

The script resolved a fixture root from `--repo-root` only: `repoRoot/testdata/router-runtime/fixtures`. Against a packaged `--repo-root` that path does not exist, so the child died at startup looking for `provider-accounts.json`. I added `fixtureRoot: value("--fixture-root")` to the input parsing and let the resolved value flow into the spawn.

## Defect 2 - a startup failure threw an uncaught error

`if (health === undefined) throw new Error("health did not become ready")` produced a Node stack trace and exit 1 - contradicting the script's own contract that NOT RUN is distinct and typed. It now prints a typed line that includes the child's exit state and the last stderr lines:

```
FAIL: health did not become ready on port 5932 (child exited 0; stderr: syscall: 'open', | path: ...provider-accounts.json)
```

and exits 1 when the child exited, 2 when it is still running (NOT RUN). That single line is what identified defect 1.

## Verified after the repair

**`runtime:verify-client-journeys`** against `E:/rm-tmp/s97a/release/win32-x64/role-model-dev.exe`:

```
version=healthy 0.0.20-81-g17cbdd21
sha256=4898f865c06c1e7364748641cff4889d8901bf8d3f70c5109de296e748f044c7
port=5933 state=E:\rm-tmp\lead-r39c-state fixtures=D:\DEV\...\testdata\router-runtime\fixtures
PASS health / models (3) / telemetry (0) / controller / learning / replay jobs (0) / evaluation jobs (0) / ui shell (1960 bytes)
exit=0
```

**`runtime:compare-release`** between D (`0.0.20-1-g9b0ca8bd`, port 5940) and C (`0.0.20-81-g17cbdd21`, port 5941):

```
same 8 (healthz, runtime/summary, models, endpoints, router/summary, learning, replay jobs, evaluation jobs)
environment-state 1 (telemetry)
{"same":8,"environment-state":1}   exit=0
```

The fail-closed test still passes **4/4** after my edits (missing inputs and operator ports both exit 2 with a NOT RUN line).

## What R39 still needs

The scripts exist, are wired into the root `package.json`, fail closed, distinguish NOT RUN from pass, and have been run for real against packaged artifacts. The remaining half is **CI wiring**, which I will not fake: the workflow must call `runtime:verify-client-journeys` after `validate-packaging` for each candidate and `runtime:compare-release` before promotion, and editing workflows needs review.