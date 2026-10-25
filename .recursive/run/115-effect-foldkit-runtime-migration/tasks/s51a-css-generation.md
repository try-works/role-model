# S51a generate the real stylesheet and fix the header (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The layout is much closer now (one sidebar, grouped nav, counts rail, no debug control, cards), but two problems remain and one of them is systemic.

## 1. Systemic: the copied stylesheet does not contain OUR classes
`build.mjs` copies the legacy app's compiled CSS. That CSS was generated for the legacy markup, so any utility only OUR client emits has no rule - which is exactly why `md:flex-col` was missing and the sidebar laid out horizontally. The next missing class will break silently.

Fix: GENERATE the stylesheet for our client with the repo's Tailwind (it exists at `role-model-router/apps/runtime-ui/node_modules/tailwindcss`), using the SAME theme/config and the design-system sources the legacy app uses (`apps/runtime-ui/app/app.css`, `apps/runtime-ui/app/rm3-tokens.css` as inputs, `content` scanning `apps/runtime-ui-next/src/**/*.ts`). Emit `dist/client/assets/main.css`, fail the build if Tailwind is missing or the output is empty.

Add a guard test: every utility class our source emits must appear in the generated CSS - at minimum assert a set of classes actually used by the shell (including a responsive variant such as `md:flex-col`, a token class and a size class). If Tailwind cannot run in this worktree, say so precisely and leave the copy as a documented stopgap with the guard failing loudly.

## 2. Header duplication
The header bar renders `RUNTIME` and `Overview` stacked (wrapping), while the content also renders `OBSERVABILITY` + `Runtime overview`. The reference has ONE page title. Fix: single header title from the route, no wrapping duplicate, and the content keeps its eyebrow only if it does not repeat the title.

## 3. Empty state should not be a blank void
With no telemetry the Overview shows chips and one sentence in an otherwise empty page. Render the card structure with an in-card empty message (so the page reads as a product, not a failed render), or a clearly designed empty page - not a huge blank area.

## Verification
Rebuild, serve on an ephemeral port through the packaged executable with `--static-root`, screenshot at 1920x1080, and compare against `evidence/reference/reference-app.png`. Report: the CSS generation command and size, the class guard result, the header before/after, the empty-state treatment, and remaining differences.

`apps/runtime-ui-next/{build.mjs,index.html,src/**}` and its tests; evidence `s51a-*`.

NO host changes, no new dependency (Tailwind already exists in the repo), no packaging, no installs, no commits, no subagents; never modify the legacy app's sources.

## Report
Tailwind invocation and inputs, generated size/hash, the class guard, header fix, empty-state fix, screenshot comparison, counts and typecheck.