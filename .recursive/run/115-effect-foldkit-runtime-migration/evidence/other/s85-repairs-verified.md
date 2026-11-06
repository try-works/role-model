# S85 Repairs verified in the browser (not-loaded editor, title text, honest empty)

## Runtime-config editor: not-loaded gate visible

On `/runtime` with a rebuilt client: `h1` = Runtime, **0 textareas**, only **Load runtime config**, and the page states *"Runtime config not loaded. Click Load runtime config first."* So the "edit before Load" hole from the review is closed at the UI level, not just in a test.

## Titles

`/studio` -> one `h1` reading **Studio**; `/models` -> one `h1` reading **Models**; `/runtime` -> **Runtime**. Text, not just count.

## Models page showed "empty" - and that is correct on this host

`/models` rendered state `empty` with *"No configured models."* I checked rather than assuming a regression: this host answers `models=[]` while `/api/role-model/endpoints` still returns 3 items. The cause is my own seeded `runtime-config.yaml` (routing only) overriding the fixture catalog - the host genuinely has no models, so the empty state is the honest one. The success-state rendering was verified earlier on a host that had a catalog.

## Client suite

Serial run: **257 / 257 across 26 files**, `tsc` 0, and the client rebuilds cleanly.

## Still queued

- Repackage so packaged verification exercises the origin gate and the newest client (the current `s38b` artifact predates both).
- A scripted, logged config-editor E2E to replace my earlier unlogged interactive claim.
