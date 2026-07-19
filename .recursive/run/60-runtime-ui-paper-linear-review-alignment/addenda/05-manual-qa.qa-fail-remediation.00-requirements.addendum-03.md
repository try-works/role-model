Run: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/`
Phase: `05 Manual QA`
Addendum: `qa-fail-remediation.00-requirements.03`
Status: `LOCKED`
LockedAt: `2026-07-04T16:54:23Z`
LockHash: `ac4224d16be251b14a477ac319a28e39c4e3036502f9edbcf63c56ff5b7c4852`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/05-manual-qa.md` (LOCKED)
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/addenda/05-manual-qa.runtime-page-matrix.00-requirements.addendum-02.md`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- user-reported manual QA failures captured in the active thread after the route/page matrix approvals
Outputs:
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/addenda/05-manual-qa.qa-fail-remediation.00-requirements.addendum-03.md`
Scope note: This addendum records the concrete remediation work that landed after manual QA surfaced shared-shell, shared-chart, and transient runtime-summary failures. It is intended as a closeout-ready ledger rather than a replacement for the route matrix.

## TODO

- [x] Record the late manual-QA fail issues that required shared-surface remediation
- [x] Capture the implementation surfaces touched for each remediation
- [x] Record how each fix was verified
- [x] Mark the current user-approval state accurately

## Summary

Manual QA on the rebuilt runtime is now approved. The remaining work in this addendum was not new scope; it was late-stage remediation to remove user-visible regressions or fidelity gaps discovered during route-by-route review. The highest-signal fixes were concentrated in shared surfaces:

1. Shared shell scrolling and scrollbar presentation.
2. Shared telemetry chart spacing and plot utilization.
3. Shared runtime-summary resilience during bridge startup/transient failures.
4. Shared token and control consistency work that multiple pages inherited at once.

## Remediation Ledger

| Issue | User-visible symptom | Remediation landed | Primary code surfaces | Verification |
| --- | --- | --- | --- | --- |
| Shared shell scroll contract | Shell chrome needed to stay fixed while only page content scrolled | Shell layout was reworked so the shell stays fixed-size, the header/sidebar remain pinned, and the content frame owns the vertical scroll behavior | `app/components/app-shell.tsx`, `app/app.css` | Rebuilt runtime reviewed in browser during manual QA; later user-approved |
| Visible content-frame scrollbar | Content-frame scrollbar remained visible after the shell-scroll refactor | Added a dedicated shell-content scroll class and hid the scrollbar while preserving scroll behavior | `app/components/app-shell.tsx`, `app/app.css` | Manual QA pass after the change; `pnpm build` green |
| Telemetry charts wasting left-side space | Several overview/Observe charts started too far in from the left and wasted plot area | Tightened shared Recharts time-series margins and reduced the shared y-axis width so plots use more of the available card width | `app/components/telemetry-charts.tsx` | Manual QA screenshot review plus `pnpm build` green |
| Transient runtime summary `500` on `:3470` | Many pages briefly failed with `Request to /api/role-model/runtime/summary failed with 500` during bridge noise/startup | Added a narrowly scoped retry path for the shared runtime-summary read so brief bridge/bootstrap failures do not immediately fail the whole page surface | `app/lib/runtime-api.ts`, `app/lib/runtime-api.test.ts` | Direct live probe to `http://127.0.0.1:3470/api/role-model/runtime/summary` returned `200`; targeted Vitest regression added and passed; `pnpm build` green |
| Shared filter/control placement on overview | Dashboard filters were incorrectly occupying sidebar/rail space and did not fit the composition | Moved overview filters into the header action area, matching the approved shell/action model | `app/routes/dashboard.tsx`, shared shell/header state surfaces | Browser screenshot review; user approved |
| Incorrect expand/collapse affordance for advanced controls | Advanced filter rows used the wrong interaction pattern and oversized control styling | Reworked advanced controls to use an expand/collapse row instead of a dropdown-like control and aligned token usage with the design system | `app/components/telemetry-controls.tsx`, related Observe routes | Browser screenshot review; user approved |
| Select/pill typography drift | Select fields, dropdown items, and filter pills used inconsistent text sizes relative to shell/header tokens | Brought select-field and filter-pill text styling back onto the shared token contract so controls align with shell nav sizing | shared design-system token exports and control consumers across Observe and other routes | Browser screenshot review across affected pages; user approved |
| Audio route fallback leaking HTML/parse noise | QA bridge fallback for `/v1/audio/voices` could surface a raw HTML/JSON parse failure instead of a controlled unavailable state | Hardened the runtime API HTML-response handling and kept the audio route in a neutral unavailable state instead of leaking raw parser errors | `app/lib/runtime-api.ts`, `app/lib/runtime-api.test.ts`, `app/routes/studio-audio.tsx` | Regression logs captured under `evidence/logs/red` and `evidence/logs/green`; user approved restored Studio batch |
| Model-role grouping inconsistency and checkbox bugs | Remote page showed flat role chips while model pages used group-based disclosure; group checkbox behavior on configured-model pages was inconsistent | Normalized role presentation onto grouped expandable sections, fixed group-level checkbox behavior, and aligned Remote/model role surfaces on the same interaction model | `app/routes/providers.tsx`, `app/routes/control-models.tsx`, `app/components/local-model-role-picker.tsx` and related tests | Browser screenshot review and later route approvals |

## Closeout Notes

- This addendum should be cited together with the route matrix addendum, not instead of it.
- The route matrix remains the canonical per-page parity/approval ledger.
- This addendum is specifically the "what broke during manual QA and what fixed it" summary for shared issues that affected multiple pages or surfaced late in the rerun.
- As of this addendum, the user has explicitly stated that manual QA is approved.
- Effective QA execution mode for the rerun is `hybrid`: browser execution and evidence were agent-operated, while final visual-fidelity acceptance came from explicit user approval in the active thread.

## Evidence Pointers

- Route/page approval and screenshot history: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/addenda/05-manual-qa.runtime-page-matrix.00-requirements.addendum-02.md`
- Locked Phase 5 manual QA artifact: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/05-manual-qa.md`
- Runtime summary resilience regression:
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- Shared shell/content-scroll remediation:
  - `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
  - `role-model-router/apps/runtime-ui/app/app.css`
- Shared chart-space remediation:
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`

## Exit Criteria

- [x] The late QA failures are summarized in one place for closeout consumption
- [x] Each summarized issue points to implementation surfaces
- [x] Verification notes are recorded at a level sufficient for closeout drafting
- [x] The document accurately reflects that manual QA is now approved

## Coverage Gate

- [x] The addendum captures the post-approval shared-surface regressions that mattered to more than one page
- [x] Each remediation points to concrete implementation surfaces and verification evidence
- [x] The addendum records the effective hybrid QA completion context for late-phase closeout

Coverage: PASS

## Approval Gate

- [x] The remediation summary is sufficient for Phase 6-8 closeout receipts
- [x] The effective QA execution mode is explicit
- [x] The recorded remediation state matches the final user-approved runtime

Approval: PASS
