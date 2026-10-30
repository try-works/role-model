# S576 — independent review: visual parity batch (12162510..HEAD)

Reviewer: `s9-private-readonly`, actual model **deepseek-flash**. Read-only public worktree at HEAD `ae5b59b8`; no edits, no commit.

## Verdict: HOLD

The batch is broadly coherent and the gates are green (**807/807**, tsc 0), but navigating to Providers or Endpoints drops their control reads. This is a source-level functional regression that the boot-oriented tests do not catch.

## Findings

### BLOCKER — Providers/Endpoints lose control state on navigation

- Init loads the control channel for these routes:
  - `src/init.ts:112-132`: Providers/Endpoints commands include `readControl({ key: controlKey, token })` and set `controls: {...emptyControls(), [controlKey]: loadingControl(token)}`.
- Navigation does not:
  - `src/update.ts:389-416`: the Providers/Endpoints branch reads only `modelEndpoints`, `configuredModels`, and `integrationProviders`; it returns `controls: emptyControls()` and never issues `readControl`.
- Consequence: after navigating from another section to `/control/providers` or `/control/endpoints`, `renderControlPage(CONTROL_SPECS.providers/endpoints, ctx.controls.*)` renders an empty/unloaded control surface. The provider configuration and endpoint-admission/control affordances are reachable on a direct boot only, not on normal in-app navigation. The provider-account/device-auth forms are separate state and may still render, but the control-backed configuration is lost.

This directly violates “Endpoints/Providers get their readbacks on boot and on navigation” and “functional affordances still reachable.”

### MAJOR — s67a Learning coverage was reduced

The batch removes the `replayJobs` and `evaluationJobs` configurations from the loading/empty/error loop and removes the real-row/fabricated-id assertions from `test/s67a-learning.test.ts` (current test only keeps the `learning` surface and checks body text). This is the known explicit limitation, but it is still a coverage reduction: replay/evaluation loading/error/rows/fabricated-id behavior is no longer tested. It should remain recorded as an accepted limitation, not counted as preserved behavioral coverage.

### MINOR — Provider setup is collapsed but discoverable

`src/families-view.ts:131-137` wraps the account/device/control forms in `<details><summary>Provider account setup</summary>` without `display:none`; the summary is visible and keyboard-discoverable. This satisfies “not display:none,” though the functional controls are hidden behind one click.

### Shell membership

`src/view.ts:214-235,378-410` maps Observability under Observe and Endpoints under Connect; section hubs `LocalChoose`/`SystemOperator` are not in their nav entries, so no secondary tab bar is mounted. The ten-section sidebar and active highlight logic remain coherent. No route-highlight loss found in the source maps.

### Data wiring / duplicates

Boot paths issue one control read and three readbacks for Providers/Endpoints; `createInit` adds only rail keys (`models/runtimeSummary/health/dashboard/router/overviewMetrics/routerCandidates`) and skips already-loading keys (`init.ts:251-263`). I found no boot duplicate. The defect is the missing control read on navigation, not a double read.

### Family states and SSR

The family pages still select loading/error/empty/rows from `readback.status/message`; the full suite exercises these. No malformed tbody/tr or missing-import failure surfaced in 807 tests/tsc 0. Spot-checked Requests/Models/Runtime/Queues/Activity/Registry code paths retain table shells and reference card structure; no additional blocker found.

## Gates

- UI `tsc --noEmit`: **0**
- Full UI suite: **76 files / 807 tests pass**

## Required repair

1. Add `readControl({ key: "providers" | "endpoints", token })` to the `navigateToRoute` Providers/Endpoints branch and set the matching control to `loadingControl(token)`; preserve the three readback commands.
2. Add a navigation-focused test (mount elsewhere → click Connect/Providers or Endpoints) asserting the control surface loads, not just direct boot.
3. Keep s67a’s replay/evaluation coverage explicitly recorded as the known limitation; do not claim preserved coverage.

No source/test/config file was modified; no commit.

