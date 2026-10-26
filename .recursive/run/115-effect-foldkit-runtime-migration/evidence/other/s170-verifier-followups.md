# S170 Reviewer follow-ups: two silent failures in the verifiers, and a test that caught me

Working the four outstanding review items, starting with the two that could make a verifier lie.

## 1. `verify-client-journeys` forced a development scope id

Same defect the reviewer found in `compare-release`: `--scope-id standalone-runtime-dev` was passed unconditionally, so a production-channel package could refuse to start and the verifier would report a health failure for a binary that runs fine by hand. Removed; the profile owns the scope. A test now scans **both** scripts and fails if either re-introduces it.

## 2. A health failure exited past the cleanup

`process.exit(...)` inside the `try` skipped the `finally` that kills and waits for the child - a failed health check could leave the packaged runtime running on the port. Now the failure is recorded and **thrown**, the `finally` runs, and the exit code is applied after cleanup.

## 3. `compare-release`: two more ways to print a misleading `same`

| Hole | Guard now |
|---|---|
| same `--left-port` and `--right-port`, so the right child never bound and every surface compared left with left | **refuse**, exit 2: "the same port on both sides compares one process with itself" |
| two `200 text/html` bodies both `JSON.parse` to `undefined`, which compared equal | bodies go through one `readJson`; a non-JSON body classifies the row **not-run**, never `same` |

Verified after: same-channel D-vs-C still `{"same":8,"environment-state":1}` exit 0; same-port invocation exits 2 with the message.

## The test that caught me being sloppy

My first version of the health-cleanup test asserted the block did not contain the substring `process.exit` - and failed, because my own explanatory **comment** inside that block contains the words "A process.exit here...". The assertion was checking prose, not code. It now matches a statement (`/\n\s*process\.exit\(/`).

: this is the same class of error as the whole review: measuring text where behaviour was meant.

## Adjacent fix while in the file

The comparison loop built its rows from `fetch` results and `text()`; it now takes `{response, body, notJson}` from `readJson`, so status and body come from one read instead of two.

## Still outstanding

- `IDENTITY` still strips `endpoint`/`path` from `runtime/summary`, which can hide a real configuration difference;
- cross-channel refusal only applies when **both** sides are executables with an adjacent manifest (a URL/exe pair bypasses it);
- `compare-release` uses a fixed state directory name, so a stale directory can block a legitimate package;
- if the **left** side is not ready, the right child is not killed;
- the R32 operations-server wiring still has no test that would fail if reverted.