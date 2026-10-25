# S15a authorized local diagnostics read endpoint (public, R21 server half)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R21 server half: an authorized, bounded local diagnostics read path. Do NOT build the page in this slice.

## Read first
1. `00-requirements.md` R21 (lines 199-205) for the exact acceptance criteria.
2. The existing host-bridge read paths and their auth/trust handling: search for the local read-credential and Host/Origin checks already implemented for the current observability snapshot/store-degradation pages, and reuse that machinery instead of inventing a parallel one.
3. The Effect 4.0.6 digest `evidence/other/effect-4.0.6-api-notes.md` before any Effect code.

## Required work
1. A bounded diagnostics query that returns instance/build identity, record loss counters and a cursor, with an explicit maximum record/byte cap and a stated staleness rule. It must not dump fibers or unbounded state.
2. Authorization reuses the existing local read-credential plus Host/Origin checks. A spoofed forwarded owner header must be rejected, and wildcard/reflected CORS must not be possible.
3. Diagnostics must not contaminate business or live aggregates: prove it with a test that reads diagnostics and then asserts the business aggregate is unchanged.
4. Denied, stale, dropped and empty responses are all representable and tested. Disabled diagnostics must be an explicit state, not an error.

## Files you may write
- the smallest set of host-bridge source files that own the existing read path, plus one new module if a clean boundary exists
- one new test file under the host-bridge test directory
- `evidence/logs/s15a-*` and `evidence/other/s15a-tdd.json`

Do not touch the client app, wrappers, packages/ui, root, lockfile, vendor, or the private repo. Do not start servers or bind ports: call the handler functions directly in tests.

## Strict TDD
One behavioural RED per numbered item above. A missing module is a setup RED and does not count.
Report: contract item by contract item with its test, the existing auth machinery you reused (file:line), RED/GREEN, counts, typecheck exit, and anything blocked.