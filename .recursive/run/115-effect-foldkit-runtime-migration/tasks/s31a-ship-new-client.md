# S31a ship the Foldkit client in the packaged runtime (public, R13/R33)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
FINDING: the packaged artifact ships the LEGACY React app. `package-sea.ts` copies `apps/runtime-ui/build/client` into the package, and `apps/runtime-ui-next` had no build pipeline at all - so the port was never deployable and every packaged UI observation so far was the old UI.

I have added, for the new client: `src/main.ts` (browser entry that mounts `mountWithDiagnostics` against `window.location.origin`), `index.html`, `build.mjs` (esbuild bundle to `dist/client/assets/main.js`, no new dependency), and a `build` script in its package.json.

## Required work
1. Make `apps/runtime-ui-next` build cleanly: run `node build.mjs`; fix any bundling problem (browser externals, node-only imports pulled in by the shell, `process.env` usage). The bundle must contain no `node:` imports and no server-only modules.
2. Switch the packaged copy: `package-sea.ts` `standaloneReleaseCopies` should copy the NEW client build to `build/client` (the destination the host serves). Keep the legacy app in the repo; this is a copy-source change plus running the new build in the packaging pipeline.
3. Rebuild the packaged candidate and run `validate-packaging`. Report the artifact identity (version/commit/tree/sha) and confirm the served `/` index.html references the NEW bundle (`/assets/main.js`), not `entry.client-*`.
4. State what the served-client switch does NOT change (API surface, channel, scope).

## Files
`apps/runtime-ui-next/{src/main.ts,index.html,build.mjs,package.json}`, `apps/runtime-host-bridge/src/package-sea.ts`, packaging scripts if the build must run there; evidence `s31a-*`.

NO legacy app deletion, no installs, no commits, no subagents, ephemeral ports only for any local run.

## Report
Build exit, bundle size, whether any node imports were found and how they were resolved, the copy-source change, the packaged artifact identity, the served index proof, and what a browser check should look at.