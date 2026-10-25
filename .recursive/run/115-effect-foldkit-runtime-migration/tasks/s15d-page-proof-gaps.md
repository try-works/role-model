# S15d close the page's proof gaps found in review (public, R21 UI half)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The reviewer proved three gaps by mutation: the tests still pass with the guard removed, with labels swapped, and with a fabricated AbortSignal. Close them; do not restate them as prose limits.

## Gap A - the route-id guard is untested
Concrete failing input: delete the id equality from `update.ts:48` and `:52` and all 18 tests still pass.
Add a test that mounts `/diagnostics/a` with a deferred reader, navigates to `/diagnostics/b` before resolving, resolves `a`, and asserts `b`'s state is not overwritten. If a same-id refresh race (two refreshes, older resolves last) is not guarded, add the guard and a test for it, or record it explicitly as a named follow-up in the evidence rather than prose.

## Gap B - render assertions do not pin which label owns which number
Concrete failing input: swap age and rule in the render function and both numbers still appear, so the tests pass.
Assert exact phrases (for example `rule 5m` and `age 15m`, and the dropped line with its count and window) rather than the presence of numbers. Also assert the tone/class of the disabled state so a disabled page cannot keep a danger border.

## Gap C - the AbortSignal assertion only proves the type
Concrete failing input: pass `new AbortController().signal` instead of the one Effect supplies and the test still passes.
Add a dispose-mid-flight test: mount the page with a reader that blocks on its signal, dispose the shell, and assert the forwarded signal becomes aborted. That ties the assertion to Effect's lifecycle rather than to the shape of the object.

## Also from the review (minor, do them if they fit the same files)
- A 403 owner-header/context error is labelled 'Access denied: not authorized'; make the label status-accurate without inventing a cause the page cannot know.
- The test title 'keeps controls reachable' overclaims; either rename it to what it proves or assert something that supports the word.
- `role=status` / `aria-live` / `aria-busy` are rendered but unasserted; assert them if the page claims screen-reader semantics.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and `test/diagnostics.test.ts`
- `evidence/logs/s15d-*` and `evidence/other/s15d-tdd.json`

Nothing else.

## Rules
One RED per gap using the reviewer's mutation, then GREEN. No installs, no commits, no subagents, no servers.
Report: each gap with its mutation-as-test and RED message, GREEN counts, tsc exit, and any gap you judge to need a product change rather than a test.