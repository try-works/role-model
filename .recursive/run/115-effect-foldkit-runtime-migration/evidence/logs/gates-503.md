# Final gate record — artifact 6d90b28a (503 / 505 label)

## Artifact identity

- Requested target: **0.0.20-503-ga7aafb46**
- sha256: **6d90b28aa2092e7af074324e7f1f0cc5c30d3d9d039c1a0ee25524aa52eea3ed**
- After the mandatory repackage at the then-current public HEAD (e0b1800a), the executable retained the **same sha256** and reports **0.0.20-505-ge0b1800a**. The 503 label is no longer reproducible because the checkout advanced, but the artifact bytes are the same.

## 1. validate-packaging

The requested root command repackages first:

`ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=.../dist/run00-dev corepack pnpm run runtime:validate-packaging`

At e0b1800a this failed **before validation** with:

`Track B runtime distribution public source tree does not match this package`

because the private distribution manifest was built for a7aafb46. This is a manifest/checkout ordering issue, not a product or gate failure. The distribution was rebuilt at e0b1800a and the package regenerated (same sha 6d90). Direct validation of the valid package then PASSED:

`corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx src/validate-packaging.ts`

Result: healthy, 8 models, 28 roles, 13 extensions, scope standalone-runtime-dev, chat/responses output text OK.
Log: gates-505-validate.log; failed attempt preserved as gates-503-validate-attempt.log.

## 2. verify-packaged-candidate

`corepack pnpm run runtime:verify-packaged-candidate`

- version=healthy **0.0.20-505-ge0b1800a**
- sha256=**6d90b28aa2092e7af074324e7f1f0cc5c30d3d9d039c1a0ee25524aa52eea3ed**
- PASS health, models, telemetry, controller, learning, replay jobs, evaluation jobs
- PASS ui css: 65632 bytes, both theme blocks
- PASS ui bundle: 3335314 bytes
- PASS ui theme boot, chat completion, ui shell

Log: gates-505-verify.log.

## 3. audit — 20/20

From the pre-rebuild 503 chain (gates-final.log):

`{"routes":20,"failures":0,"focus":false}`

## 4. dialog — PASS

From gates-final.log:

`PASS: dialog aria-modal, initial focus Dismiss, Tab trapped, Escape closed, focus returned to Start device authorization`

## 5. compare-release

`node scripts/runtime/compare-release.mjs --left-exe D:/role-model-router/0.0.20/role-model.exe --left-port 6337 --right-exe role-model-router/dist/release/win32-x64/role-model-dev.exe --right-port 6343 --allow-cross-channel`

Result: **6 same / 2 additive-shape / 1 environment-state / 0 different**

- additive-shape: /healthz, /api/role-model/runtime/summary
- environment-state: /api/role-model/telemetry/summary
- same: models, endpoints, router/summary, operator learning, replay jobs, evaluation jobs

Log: gates-505-compare.log.

## Honest caveat

The final on-disk package is labelled 505 because the mandatory validate-packaging step rebuilt at the current checkout; its sha is byte-identical to the 503 artifact (6d90...). The requested 503 label cannot be re-created without checking out a7aafb46, and no source/gate code was changed.
