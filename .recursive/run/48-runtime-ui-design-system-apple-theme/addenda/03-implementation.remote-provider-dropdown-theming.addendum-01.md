Run: `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
Phase: `03 Implementation Addendum`
Status: `DRAFT`
Inputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- Browser evidence from `http://127.0.0.1:3457/app/remote/providers` showing unthemed dropdown option lists on Windows
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Outputs:
- `/role-model-router/apps/runtime-ui/app/components/themed-select.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Scope note: This addendum repairs the remaining remote-provider dropdown theming gap without changing route architecture or broad page layout.

## Issue

The dropdown fields on `/app/remote/providers` were still implemented as native `<select>` elements. On Windows, the expanded option popup is OS-rendered and does not reliably inherit the runtime UI design-system theme, so the open lists appeared effectively unstyled even though the closed field shell used the correct tokens.

## Root Cause

The route relied on raw native `<select>` controls for:

- provider selection
- connection-method selection
- model selection

CSS in `app.css` styled the collapsed field chrome, but it could not fully theme the open option list rendered by the OS/browser chrome on Windows. The defect therefore had to be fixed at the component level, not with more token/CSS tweaks.

## Effective Requirement Extension

For remote-provider onboarding fields that must visually match the Apple-theme design system across Windows light/dark mode, the UI must use a repo-owned themed selector/listbox instead of raw native `<select>` controls.

## TDD Compliance Log

TDD Mode: `strict`

### RED

Command:

```powershell
corepack pnpm exec vitest run apps/runtime-ui/app/lib/design-system.test.ts -t "providers setup fields use a repo-owned themed selector instead of raw native selects"
```

Observed failure:

- `design-system.test.ts` failed because `providers.tsx` still contained raw native `<select>` usage and did not reference a repo-owned `ThemedSelect`.

### GREEN

Implementation:

- added shared repo-owned `ThemedSelect` listbox control in `app/components/themed-select.tsx`
- replaced the three raw dropdowns in `app/routes/providers.tsx` with `ThemedSelect`
- kept the existing route flow and state model intact

Command:

```powershell
corepack pnpm exec vitest run apps/runtime-ui/app/lib/design-system.test.ts -t "providers setup fields use a repo-owned themed selector instead of raw native selects"
```

Observed result:

- focused regression passed

### Regression / Build Verification

Commands:

```powershell
corepack pnpm --dir apps/runtime-ui test
corepack pnpm --dir apps/runtime-ui build
```

Observed result:

- runtime-ui tests: PASS (`138 passed`)
- runtime-ui build: PASS

## Browser Verification Status

Attempted in-app browser verification is currently blocked in this Codex environment because the bundled Browser skill references `scripts/browser-client.mjs`, but that file is missing from:

`C:\Users\erikb\.codex\plugins\cache\openai-bundled\browser\26.609.71450\scripts\`

As a result, automated live browser inspection could not be completed from this session even though the route-level regression and production build both passed.
