# S126 Found the missing verification layer: the host runs from source

The R27 rewiring has been blocked on "no way to verify a host change end to end without packaging". That was wrong.

## The command

From `role-model-router/apps/runtime-host-bridge`:

```
corepack pnpm exec tsx src/cli-entry.ts --repo-root <worktree> \
  --runtime-state-root <temp> --host 127.0.0.1 --port <free> \
  --fixture-root <worktree>/testdata/router-runtime/fixtures
```

`src/cli.ts` is a **module**; `src/cli-entry.ts` is the executable (`void main()`). Running the module directly exits silently - which is what my first attempt did, and why it looked like the host could not run from source.

## Verified

```
/healthz                    -> 200 {version: 0.0.20-120-gc079d8bd, commit c079d8bd...}
/api/role-model/models      -> 200 [claude-3.7-sonnet, ...]
/api/role-model/endpoints   -> 200 [openai.personal.primary.us-east-1.fast, ...]
/                           -> 200 <!DOCTYPE html>...
```

It reports the **working-tree** version (`0.0.20-120-gc079d8bd`), so a source run provably executes the code under review rather than a stale package.

## Why this matters

The rewiring project needs a gate that fails when the host stops starting or stops serving after a structural change. A source run of the real entry point, with a real fixture root and a real static root, is that gate - and it takes seconds rather than the ~15 minutes `runtime:package-sea` needs.

## What it still does not cover

**Graceful shutdown.** Windows cannot deliver SIGINT/SIGTERM to another process the way the host expects, so the shutdown path stays covered by the suite (release functions, S124 close-once) rather than by an end-to-end stop. I am not going to claim otherwise.

## Next

With a local end-to-end gate in hand, the rewiring can proceed in slices: move one acquisition at a time onto `host-runtime-resource.ts`, re-running this smoke plus the affected suites after each. That plan is now executable; before this round it was not.