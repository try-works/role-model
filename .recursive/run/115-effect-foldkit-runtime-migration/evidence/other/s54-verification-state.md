# S54 full verification state (host + client), with the one failure classified

## Host suite (full, 420 files)

- **416 passed / 1 failed / 3 skipped** files; **2,598 passed / 1 failed / 5 skipped** tests; 2,208 s.
- The single failure is `test/run105-review-advisory-safety.test.ts` -> "refused larger admission leaves bounded prior real snapshot routable" (`expected 'written' to be 'refused'`).
- **Classified as pre-existing, not our regression**: the same failure reproduces in the baseline worktree at commit `24678a66` (before the fallback and proxy edits) with the same paired private worktree; no run105/materializer file changed between baseline and now; the only public delta is `runtime-host-bridge/src/index.ts`. Left unfixed by instruction, with both logs retained.

## Client suite

**197 / 197 tests, 20 files, `tsc` 0.**

## Packaging-related test updated to the new intent

`test/executable.test.ts` now asserts the copy source `role-model-router/apps/runtime-ui-next/dist/client` with destination `build/client`, and that the root `runtime:package-sea` script declares `@role-model-router/runtime-ui-next`. It fails if the copy source reverts. 24/24 in that file.

## What this means for the requirements

- The packaged client is now the Foldkit client, styled by a **generated** Tailwind stylesheet with a class guard, with fonts served and a build guard that fails on a missing asset reference.
- The shell is a single sidebar + counts rail with one page title, aligned content column (h1.x == main.x), no debug artifacts, honest empty state.
- Remaining UI differences from the reference: charts are aggregate cards rather than the model-pool visualization, and sidebar group labels differ.
- Studio: tabs, forms, typed-value dispatch and llama-swap routing are proven; a successful generation needs real model weights that do not exist in this worktree.
