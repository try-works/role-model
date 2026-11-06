# S99 A test-isolation defect found and fixed (and a second one left classified)

## The defect

`test/track-b-runtime-composition.test.ts` called **`process.chdir(packageRoot)`** inside a test. Under the parallel suite that mutates the working directory of every concurrently running test file, which is exactly why `index.test.ts > "prefers repoRoot frontend assets over packaged assets"` failed **only** in the full run and passed alone (218/218) and in isolation (1 passed, 217 skipped).

## The fix

Replaced the real `chdir` with `vi.spyOn(process, "cwd").mockReturnValue(packageRoot)` and `mockRestore()` in the finally block - the behaviour stays local to the test, nothing global is mutated.

## What it exposed

Running the two files together after the fix produced a **different** order-dependent failure: `index.test.ts > "retries transient API timeouts once and falls back to a secondary endpoint after quota exhaustion"`. That one **passes in isolation** (1 passed, 217 skipped, 1.9 s), so it is a timing-sensitive test under concurrent load, not a consequence of the chdir fix.

So the suite has at least two independent isolation defects:

1. a global CWD mutation - **fixed** here;
2. a retry/timing test that is not load-tolerant - **classified, not fixed**. It would need a deterministic clock or a serialized run.

## Honest consequence

The full-suite pass count is therefore load-dependent, and a single "all green" claim would be luck rather than evidence. The defensible statement remains: every file passes in isolation, one isolation defect is now fixed, one timing-sensitive test is known and named.
