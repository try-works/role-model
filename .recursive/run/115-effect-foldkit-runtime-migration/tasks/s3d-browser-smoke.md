# S3d browser runtime smoke of the wrapper graph (public, R5)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R5: the graph closure is currently static. A runtime smoke under a DOM environment is the next honest step.

## Contract
1. A test that runs in a DOM environment (jsdom or an equivalent already present in the workspace - check first, do not install) and imports every built browser entry of `@role-model-router/effect-platform-browser`, `@role-model-router/foldkit` and `@role-model-router/foldkit-ui`, asserting each loads and exposes at least one export.
2. The same test must prove no Node builtin is reached at runtime: assert the environment has `window`/`document` and that importing under DOM does not throw a resolve error for `node:*`.
3. A minimal but real use of one browser service: for example construct the browser runtime or a key-value store from `BrowserKeyValueStore`/`IndexedDb` under jsdom and assert it returns a value, or if jsdom cannot support that service, state which service you exercised and why the others cannot run there.
4. Keep it fast: no network, no real browser download, no Playwright run in this slice.

## Files you may write
- one new test under `role-model-router/packages/foldkit/test/` and/or a small harness module in that package
- `role-model-router/packages/foldkit/package.json` only to add a `test:runtime` script if a separate lane is warranted
- `evidence/logs/s3d-*` and `evidence/other/s3d-tdd.json`

Do not touch vendor/**, other packages' source, root or lockfile files, or the private repo.

## Strict TDD
Write the smoke test first. If jsdom is absent, that is a setup blocker: report it rather than installing. Capture whatever RED you can honestly produce (for example the test failing on a real runtime import that the static scan missed).

Report: environment chosen, which services loaded, which services were exercised versus merely imported, the RED you got, GREEN counts, and anything that cannot be proven without a real browser.