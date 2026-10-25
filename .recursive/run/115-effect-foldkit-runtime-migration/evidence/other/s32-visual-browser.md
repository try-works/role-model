# S32 browser visual verification of the Foldkit client (real Chrome)

Owner direction: "all ui needs to actually be verified visually in the browser".

## What was served

The packaged executable (`dist/release/win32-x64/role-model-dev.exe`) started on an ephemeral loopback port with `--static-root` pointing at the NEW client build (`apps/runtime-ui-next/dist/client`, `assets/main.js` 2,570,138 bytes). The served index references `/assets/main.js` and contains no `entry.client-*` bundle.

## Batch 1 - eight routes driven in a real browser

For each route: navigate, read `document.title`, the rendered text, the state attributes and any `[role=alert]`, then capture a PNG into `evidence/visual/`.

| Route | Title | States seen | Notes |
|---|---|---|---|
| `/` | Overview \| RM3 Foldkit shell | idle, idle, success | overview cards render |
| `/diagnostics/abc123` | Diagnostics abc123 | idle, idle | route param rendered |
| `/observe/observability-snapshot` | Observability | live, live, ok | real host read succeeded |
| `/observe/queues` | Queues | live, live, ok | real host read succeeded |
| `/requests` | Requests | live, live, empty | real host answered empty, state is honest |
| `/control/providers` | Providers | idle, idle | control surface mounted |
| `/control/endpoints` | Endpoints | idle, idle | control surface mounted |
| `/control/controller` | Controller | idle, idle | control surface mounted |

No `[role=alert]` appeared on any route. Anchors: 22 client routes are reachable from the shell navigation.

## Finding that had to be fixed first

The packaged artifact had been copying `apps/runtime-ui/build/client` - the legacy React app - and `apps/runtime-ui-next` had no build pipeline at all, so the Foldkit client was never deployable. This run added `src/main.ts`, `index.html`, `build.mjs` (esbuild, no new dependency) and a `build` script, and switched `package-sea.ts` to copy the new client build.

## Limits

- Batch 1 covers 8 of 22 routes. The remaining 14 are next.
- This is a same-origin serve of the new client through the packaged backend; the packaged ARTIFACT (SEA with the new client inside) has not been rebuilt yet because `package-sea` refuses a dirty worktree. Once the tree is committed and the artifact rebuilt, the visual pass must be repeated against the packaged bytes, not only against `--static-root`.
- Screenshots are evidence of rendering, not of pixel-perfect design: no visual diff against a design source exists.
