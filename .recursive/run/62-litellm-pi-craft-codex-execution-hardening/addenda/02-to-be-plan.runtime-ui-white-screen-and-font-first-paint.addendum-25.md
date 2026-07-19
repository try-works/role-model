Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Addendum: `25`
Phase: `02 TO-BE Plan`
Status: `DRAFT`

## Goal

Eliminate the packaged runtime's white-screen startup regression and make bundled typography participate in first paint.

## Requirements

- The root route must provide a visible React Router `HydrateFallback`.
- The fallback must not restore the old launcher boot screen or use "Runtime boot" / "Opening role-model runtime" copy.
- Root links must preload the bundled design-system font assets from local `/assets/fonts/...` paths only.
- No remote font hosts may be introduced.

## TDD Plan

- Update `root.test.tsx` to fail until `HydrateFallback` exists and old boot strings remain absent.
- Add assertions that `links()` preloads bundled Inter and IBM Plex Mono font assets with `as: "font"` and `crossOrigin: "anonymous"`.

## Live Verification

- Run targeted root tests.
- Rebuild runtime UI and Windows package.
- Load `http://127.0.0.1:3456/app` with a browser trace and record DOM visibility timing, asset failures, and computed font family.
