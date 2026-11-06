# S123 A real leak: registered resources the release path silently skipped

While checking the extension phase for the R27 rewiring, I read `release-host-resources.ts` rather than trusting its green tests - and found an `else` that skipped a registered release.

```ts
if (resources.packagedRuntime !== undefined) await attempt("packaged", resources.packagedRuntime);
else await attempt("backend", resources.backend);
if (resources.extensionRuntimeOwner !== undefined) await attempt("extensionRuntimeOwner", ...);
else await attempt("extension", resources.extensionRuntime);
```

Both branches assume the two resources are **mutually exclusive**. The CLI does not guarantee that: the extension owner is registered at `cli.ts:12399` and the extension runtime inside `beforeReady`, so a host that registers both would release the owner and **never** call the runtime close.

## Reproduced first

Two tests written against the current code, both failed:

```
× releases both owner and runtime  -> expected [ "owner" ] to deeply equal [ "owner", "runtime" ]
× releases both packaged and backend -> expected [ "packaged" ] to deeply equal [ "packaged", "backend" ]
```

## Fixed

`releaseHostResources` now attempts **every registered step** in a fixed order (server -> packaged -> backend -> owner -> runtime) instead of choosing between them. 7/7 pass.

## A second defect found in the same read

`hostScope.register("extensionRuntime", ...)` was sitting **inside** the `for (const extension of qaExtensions)` loop inside `beforeReady`:

- on a host with **no** QA extensions the loop body never runs, so the runtime was **never registered** - the registration was decorative;
- on a host with **two** QA extensions it would throw `Host runtime resource already registered: extensionRuntime` during startup.

Moved above the loop: registered exactly once, at `cli.ts:12480`, before `for (...)` at `:12481`.

## Verification

```
release-host-resources (7) + host-runtime-scope (5) + s120 ownership guard (3) + cli-composition-scope (7) + r39-scripts (11) = 33 passed
tsc = 0
```

## Why this matters for R27

The rewiring plan assumed the release path was trustworthy because it had tests. It had tests for the shapes its author imagined (one resource per branch), not for the shapes the CLI actually registers. That is the same class of gap as the origin-gate bug: the suite was green and the behaviour was wrong.

The extension phase is therefore still **not wired**, but the two defects that would have made wiring it dangerous are now fixed and pinned.