# S213 The gate now refuses a static root the package does not ship

S212 found that every gate run for several rounds was auditing a worktree UI build while the package
carried older bytes. A note in the evidence is not a guard; this is.

## The check

`verify-packaged-candidate.mjs` compares the `--static-root` against `<package>/build/client` and
**exits 2** when they differ, naming the file and printing the root to use instead:

    FAIL ui identity: the static root is not the bytes this package ships (assets/main.js differs)
    Pass --static-root ...\dist\release\win32-x64\build\client, or rebuild the distribution.
    exit=2

Restored (no drift): the gate proceeds normally (`PASS health: healthy 0.0.20-214-g2ec2f916`).

## Why the first attempt looked broken

My initial run against the worktree root **passed**, which I read as the check not firing. It was
firing: round 185 rebuilt the distribution after the UI revert, so package and worktree were
byte-identical at that moment. The check was correct and my expectation was wrong - a reminder that
"the guard did not fail" and "the guard did not run" look the same from the outside.

Proving it needed deliberate drift (one appended byte), not a passing run.

## Consequence for how this run gates UI

| Root | Status |
|---|---|
| `<package>/build/client` | the only root the gate accepts when the package has one |
| worktree `dist/client` | rejected unless byte-identical (i.e. just rebuilt + repackaged) |

So the sequence is: build UI -> rebuild distribution -> repackage -> gate against the package. Any
shorter path now fails loudly, which is what S212 cost several rounds to notice.