# S581 — sealed packaged rebuild and gate matrix

Sealed artifact built from public HEAD 972ef511 (version 0.0.20-423-g972ef511) paired with the private track-B distribution rebuilt against the same public tree (13 extensions, sidecar sha 57713aca…, compatibility generation N).

## Artifact
- Package: role-model-router/dist/release/win32-x64 (role-model-dev.exe, launcher, .bat, sha sidecar, manifest, build/client, track-b-runtime)
- Executable sha256: fdf2441680e664ba86b7ddbdae2cf896bc9bdd8319eddc44de51b3339792da0e
- validate-packaging: healthy, modelCount 8, roleDefinitionCount 28, extensionCount 13, chat + responses output text present.

## Gates
- verify-packaged-candidate: 12/12 PASS (health, models, telemetry, controller, learning, replay jobs, evaluation jobs, ui css, ui bundle, ui theme boot, chat completion, ui shell).
- audit-rendered-ui (packaged exe + packaged static root): 20/20 routes PASS, including /control/providers after accessible names were added to the setup disclosure and control action.
- dialog-a11y-audit: PASS — aria-modal, initial focus Dismiss, Tab trapped, Escape closes, focus returns to the Start device authorization button.
- ui-parity (@role-model-router/ui-parity): 128/128 PASS.
- compare-release: NOT RUN — the script requires --left/--left-exe (the preserved v0.0.20 React artifact) and --right/--right-exe; the preserved artifact is owner-gated and not available in this workspace.

## Fixes that made the gates pass
- Navigation into /control/providers and /control/endpoints now reads the control surface (readControl + loadingControl) like boot does, with a mount-elsewhere-then-navigate test.
- Accessible names on provider-account and device-authorization inputs and on the control action; sr-only utility with a visible focus state for the skip link; 24px targets for the decision detail links and the local-log auto-refresh checkbox.
- The device-authorization form and dialog render below the reference provider cards instead of inside the collapsed setup disclosure, so Start stays visible and Foldkit dialog focus restoration works.

## Remaining owner-gated items
- compare-release needs the preserved v0.0.20 React artifact (or an explicit path/approval).
- Real-client R15/R16-live/R39 approvals and stage/prod Run88 identity remain outstanding.
- Visual-delta sign-off: this batch is structurally verified and audit-clean; pixel-level owner approval is still required.
