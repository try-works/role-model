Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `23`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.windows-shell-owned-launch-and-boot-fallback.addendum-22.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/root.tsx`
- `role-model-router/apps/runtime-ui/app/root.test.tsx`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.runtime-ui-bundled-typefaces.addendum-23.md`
Scope note: This addendum repairs a visual regression introduced while making the packaged runtime startup self-contained. The correct fix is to keep the approved Paper Linear typeface contract and bundle/load it locally, not to replace it with generic platform stacks.

# Addendum 23 Plan: Restore Runtime UI Typefaces Without Remote Font Fetches

## TODO

- [x] Record the typography regression root cause.
- [x] Define the desired self-contained font loading contract.
- [x] Define RED/GREEN tests for the typography contract.
- [x] Define rebuilt runtime UI and packaged release verification.

## Root Cause Summary

The approved run-60 Paper Linear baseline used:

- display/body: `Inter`
- diagnostic/code/id text: `IBM Plex Mono`

During run-62 packaged startup hardening, remote Google Font links were removed from `root.tsx`, but the source and tests were also changed to bless generic system stacks in `app.css` and `DESIGN_SYSTEM.md`. That made startup self-contained, but it also replaced the approved design-system typefaces. The runtime can therefore render with Segoe UI/Consolas on Windows instead of the intended Paper Linear typography.

The boot-screen/startup fix from addendum 22 remains valid. This addendum only corrects the typeface contract.

## Required Behavior

R23.1 Runtime display and body typography must use `Inter` as the first-choice typeface.

R23.2 Runtime diagnostic, id, path, JSON, and transport-artifact typography must use `IBM Plex Mono` as the first-choice monospace typeface.

R23.3 The packaged runtime must not depend on Google Fonts or any other remote font fetch before first paint.

R23.4 Runtime CSS must provide bundled or local-first font declarations so Inter and IBM Plex Mono are available from the packaged release assets.

R23.5 `DESIGN_SYSTEM.md`, `app.css`, and design-system tests must agree on the same typeface contract.

R23.6 The release package must include the emitted font assets and CSS references after rebuild.

## Implementation Plan

1. Add RED design-system assertions:
   - `DESIGN_SYSTEM.md` contains the Inter/IBM Plex Mono token table
   - `app.css` maps `--linear-font-sans` and `--linear-font-display` to `Inter`
   - `app.css` maps `--linear-font-mono` to `IBM Plex Mono`
   - `app.css` imports or defines local bundled font assets
   - `root.tsx` remains free of `fonts.googleapis.com` and `fonts.gstatic.com`
2. Restore design-system source:
   - update `DESIGN_SYSTEM.md` to record Inter-led, bundled startup-safe typography
   - update `app.css` to restore Inter/IBM Plex Mono tokens
   - load font assets through local build-time CSS imports or explicit packaged `@font-face` assets
3. Keep the no-remote-font startup boundary:
   - do not restore Google Font `<link>` tags in `root.tsx`
   - keep first paint self-contained
4. Rebuild runtime UI and packaged runtime.
5. Verify release output:
   - built CSS contains Inter and IBM Plex Mono font-face references
   - `dist/release/win32-x64/build/client/assets` contains emitted `.woff2` assets
   - release output contains no Google Fonts URLs
   - first `/app` response still stays fast enough to confirm no startup regression from font loading

## Strict TDD Plan

### RED: typography contract rejects generic system replacement

Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts -t "applies the Paper Linear palette"
```

Expected RED:

- test fails while `DESIGN_SYSTEM.md` and `app.css` use generic system stacks instead of Inter/IBM Plex Mono

### GREEN: bundled Inter and IBM Plex Mono

- add bundled/local font dependency or assets
- restore Inter and IBM Plex Mono token values
- keep root free of remote font links
- rerun the focused test and confirm PASS

## Verification Plan

Focused tests:

- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts -t "applies the Paper Linear palette"`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/root.test.tsx`

Build and package:

- `corepack pnpm --filter @role-model-router/runtime-ui run build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run package-sea`

Release checks:

- search release CSS for `Inter` and `IBM Plex Mono`
- search release output for `.woff2` files
- search release output for forbidden remote font URLs
- launch rebuilt `Role-Model.bat`, time first `/app` HTTP `200`, then stop the runtime

## Out Of Scope

- changing the Paper Linear color/radius/layout contract
- restoring remote Google Font links
- modifying Pi, Craft, or provider execution code
- changing routing/provider telemetry behavior

## Requirement Completion Status

- `R23.1` | `planned` | Restore Inter as display/body first-choice typeface.
- `R23.2` | `planned` | Restore IBM Plex Mono as diagnostic monospace first-choice typeface.
- `R23.3` | `planned` | Keep root free of remote font links.
- `R23.4` | `planned` | Bundle/load font assets through the runtime UI build.
- `R23.5` | `planned` | Keep docs, CSS, and tests aligned.
- `R23.6` | `planned` | Verify emitted release assets and rebuilt package.

## Coverage Gate

- [x] Regression root cause is identified.
- [x] Typeface contract is specific and verifiable.
- [x] Self-contained startup boundary remains in scope.
- [x] RED/GREEN test commands are defined.
- [x] Rebuilt release verification is defined.

Coverage: PASS

## Approval Gate

- [x] Plan restores the approved design contract instead of introducing a new visual direction.
- [x] Plan does not reintroduce remote startup font fetches.
- [x] Plan is ready for strict-TDD implementation.

Approval: PASS
