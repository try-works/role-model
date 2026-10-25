# S87 R27 interim: one ordered release path, failures now visible

R27 is still NOT complete - acquisition remains imperative and caller-owned. What changed this slice is the release half: the order exists once, is total, observable and idempotent.

## Verified by the lead

- `src/release-host-resources.ts`: `releaseHostResources(resources, onError?)` releases `server` -> `packagedRuntime` **or** `backend` -> `extensionRuntimeOwner` **or** `extensionRuntime`; every step is attempted even after a failure; failures are collected as `{step, error}`; absent resources are skipped; each release function runs at most once (WeakSet).
- `test/release-host-resources.test.ts`: **5 / 5**, run by me.
- Host `tsc`: **0**.
- Both call sites are wired: `cli.ts:5584` (`failExtensionRuntime`) and `cli.ts:5617` (`shutdown`). I read both:
  - `failExtensionRuntime` no longer swallows close errors - it records `"Release failed at <step>: <message>"` into `bootstrapState`, so a failing finalizer is visible instead of `.catch(() => undefined)`;
  - `shutdown` releases, then `process.exit(1)` when any release failed (was unconditional `0`), logging each failing step.

## Behavioural change, stated explicitly

A shutdown whose finalizer fails now exits **1** instead of **0**. That is the point of the slice - a failing teardown must not look like a clean exit - but it is an observable change and belongs in the release notes.

## REDs

`s87a-red-early-return.log` (returning after a failed release skips the rest) and `s87a-red-swallowed.log` (swallowing the catch leaves the error list empty).

## What R27 still needs

Scoped **acquisition** owned by a composition root - the CLI still creates server, packaged runtime, backend and extension runtime imperatively and hands them to holders. The typed pair resource exists but is unwired. Until that lands, R27 stays open.
