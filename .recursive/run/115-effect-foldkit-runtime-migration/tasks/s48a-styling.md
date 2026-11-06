# S48a ship the design-system stylesheet so the client actually looks like the product (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The owner compared :5790 with the reference :3456 and the new client is UNSTYLED plain HTML. My previous 'verified' passes checked text and state attributes, not appearance - that was a verification gap, not just a styling gap.

## Cause

`apps/runtime-ui-next/build.mjs` bundles JS only. The class names the client uses (`text-[11px]`, `mt-4`, `rm3-next-route`, `border`, `rounded`, ...) are defined by the design-system stylesheet that only the LEGACY app build emits (`apps/runtime-ui/build/client/assets/root-*.css`, 83 KB). Our `index.html` links no stylesheet, and `packages/ui` exports no CSS.

## Required work

1. GENERATE the stylesheet for the new client from the same design-system source the legacy app uses (Tailwind config/theme), with content scanning over `apps/runtime-ui-next/src/**/*.ts` - so the classes our client emits are actually present and the tokens/fonts match. Preferred: run the repo's Tailwind CLI from `build.mjs` (input/theme from the legacy app config; do not hand-edit the CSS). If generation is not feasible, fall back to shipping the repo-built `root-*.css` verbatim, state why, and leave a follow-up.
2. `index.html` must link the emitted stylesheet (hashed name or stable `assets/app.css`); the build must fail if the CSS is missing or empty.
3. Fonts: confirm the font faces resolve (the design system references Geist woff2 assets). Either copy the font files into the bundle or use the same asset paths the legacy build uses; a 404 font must fail a check.
4. TESTS: a build-level test that `dist/client` contains a non-empty CSS file and that `index.html` links it; a client test asserting key class names exist in the rendered markup (not just text).
5. VISUAL PROOF: after building, compare against the reference at `:3456/app` and report computed styles for the same elements on both - at minimum background color, foreground color, font family, font size, and border color on the shell and a card - plus screenshots. Styling parity is the acceptance bar, not 'it renders'.

## Files
`apps/runtime-ui-next/{build.mjs,index.html,src/**}`, `packages/ui/**` if a CSS export is the right seam; evidence `s48a-*`.

NO host changes, no new dependency if the repo already has Tailwind (it does, in the legacy app), no packaging, no installs, no commits, no subagents; never modify the legacy app.

## Report
How the CSS is generated, the emitted size and hash, the font handling, the build test, the computed-style comparison table with the reference, screenshots, counts and typecheck.