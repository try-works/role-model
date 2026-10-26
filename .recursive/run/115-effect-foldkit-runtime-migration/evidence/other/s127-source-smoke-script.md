# S127 A maintained source-host smoke (`runtime:smoke-host-source`)

The R27 rewiring needs a gate that fails when a structural change stops the host from starting or serving. S126 found that the host can run from source; this round turns that into a maintained, fail-closed script.

## `scripts/runtime/smoke-host-source.mjs`

- starts `src/cli-entry.ts` through the workspace `tsx` CLI **via node directly** (spawning the `corepack.cmd` shim is rejected by modern Node: `EINVAL`, and `spawn` without a shell fails `ENOENT` on Windows),
- allocates a free loopback port unless `--port` is given,
- refuses operator ports (3456/3457/3458), a missing repo root, a missing fixture root, and an **occupied port** (never measures another process),
- waits for `/healthz` inside a bounded budget (default 120 s) and reports `FAIL` with the child's stderr tail if the host never answers - typed, never an uncaught throw,
- asserts health version, models, endpoints and the UI shell, then kills the process **tree** (`taskkill /T /F` on win32),
- exit **0** pass / **1** fail / **2** invalid or NOT RUN.

State roots live under the OS temp directory (`.smoke-state` inside the worktree was my first version - it dirtied the tree, which a smoke run must never do).

## Verified for real

```
$ node scripts/runtime/smoke-host-source.mjs --repo-root D:/DEV/.../115-effect-foldkit-runtime-migration
version=0.0.20-121-ge5d730a2-dirty
port=50076 fixtures=D:\...\testdata\router-runtime\fixtures state=E:\rm-tmp\r39-source-smoke-50076
PASS health: 0.0.20-121-ge5d730a2-dirty
PASS models: 3 models
PASS endpoints: 3 endpoints
PASS ui shell: 4945 bytes
exit=0
```

The `-dirty` suffix is the point: the run executes the **working tree**, so a rewiring change cannot hide behind a stale build.

## Tests

`test/s127-source-smoke.test.ts` - 4/4: missing `--repo-root` -> exit 2 NOT RUN; operator port refused; missing fixture root refused; occupied port refused instead of measuring the listener that holds it.

## What this unlocks

The rewiring can now proceed one acquisition at a time, with `runtime:smoke-host-source` plus the affected suites as the gate after each slice. That is the executable plan S126 described; this round built the tool it needs.