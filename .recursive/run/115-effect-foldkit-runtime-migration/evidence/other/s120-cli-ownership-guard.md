# S120 R27: a static guard on the ownership contract the DAG will replace

The rewiring is not done - `cli.ts` still acquires imperatively at five registration points spread
across ~7,000 lines (server at :5685, extension owner at :12399 and :12481, packaged at :12523,
backend at :12532). Attempting that restructure without integration-level CI coverage would be
reckless, so this round instead **locks the contract** the rewiring must preserve.

## `test/s120-cli-ownership-guard.test.ts`

Three static assertions over `cli.ts`:

1. **Kinds**: every `hostScope.register("<kind>")` names a member of `HOST_RUNTIME_KINDS`, no kind is registered twice, and the registered set equals the five contracted kinds - so a sixth owner cannot appear unregistered or under a typo.
2. **Shutdown**: the function contains `await hostScope.close()` and exits **non-zero when a release rejects** (`process.exit(releaseResult.errors.length > 0 ? 1 : 0)`).
3. **Order**: all five resource holders (`server`, `extensionRuntimeOwner`, `extensionRuntime`, `packagedRuntime`, `backend`) are nulled **after** the close - the exact bug I introduced by hand and fixed by reading, now guarded against regression.

## Two failed attempts, and what they taught

- My first version searched a 4,000-character window for any `= null`, which caught `activeAutoReplayLoop = null` (a loop handle, legitimately nulled before the close). Narrowed to the five resource holders.
- My second version ended the slice at the first `return shutdownPromise;` - which is the function's **early guard**, before the close. A bounded window fixed it.

Both failures were my test being wrong about the code, not the code being wrong. That is worth stating because a static guard that passes for the wrong reason is worse than none.

```
S120 (3) + S119 (4) + S118 (4) + S117 (4) + S116 (4) + S115 (5) + S114 (2) + S21a (6) = 32 passed, tsc = 0
```

## R27 - what remains, concretely

The composition has **not** moved onto the DAG. The remaining work is one project, not a slice:

1. introduce an `acquireHost` that builds server -> runtime -> extension through typed owners (the S117 shape) and returns the acquired set;
2. register that set with the scope in the same call, so no call site can forget a registration;
3. delete the five imperative registration points and the manual try/finally rollback;
4. prove equivalence with an integration test that fails acquisition at each step and asserts the released sequence.

Step 4 is the gate this environment can actually satisfy; steps 1-3 are why it is a separate run.