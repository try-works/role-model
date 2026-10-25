# S117 R27: partial shutdown is a typed outcome, not a best-effort finally block

R27 pairs "early readiness" with "partial shutdown". The second is now implemented.

## `src/partial-shutdown.ts`

`acquireWithPartialShutdown(owners)` where each owner is `{ kind, acquire, release }`:

- acquires **in order**, keeping the concrete resource so release receives the instance it started;
- on a failure at index *i*, rolls back **`i-1 … 0`** (reverse start order) and returns `{ ok: false, failedAt, error, released, rollbackErrors }`;
- **a release that throws does not stop the others** - it is collected in `rollbackErrors` and the remaining owners are still released;
- on success returns `{ ok: true, resources, release }` where `release()` runs the same reverse-order teardown.

It never throws: a failed start is a **typed value**. That is what lets the host report `failExtensionRuntime()` instead of crashing out of a half-started process.

## Relationship to `releaseHostResources`

They are deliberately different halves of one story:

| Module | Owns |
|---|---|
| `release-host-resources.ts` | the **order of a complete host release** (server -> runtime -> extension) and error collection |
| `partial-shutdown.ts` | **rollback of a partial start** when acquisition at step *n* throws |

Neither replaces the other, and this round did not rewire the CLI to use it - see below.

## Tests (TDD)

RED first (`Cannot find module ../src/partial-shutdown.js`), then 4 green cases:

| Case | Proves |
|---|---|
| failure at the third owner | first two released **backend then server**, typed failure names `extension` |
| a rollback release throws | the remaining owner is still released; the failing one lands in `rollbackErrors` |
| clean shutdown | releases `extension, backend, server` - reverse start order |
| failure at the first owner | resolves `{ ok: false }`, does not reject |

```
S117 (4) + S116 (4) + S115 (5) + S114 (2) + S21a (6) = 21 passed, tsc = 0
```

## R27 status after this round

Modelled and tested: graph identity, metadata cache identity/TTL/cap/invalidation, early readiness, partial shutdown.

**Not done**: the runtime still acquires imperatively in `cli.ts` and still uses `hostScope` for release. These services exist beside it, not under it. Saying otherwise would be the exact overclaim this run has been rejecting all session.