Run: `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
Phase: `05 Manual QA upstream-gap addendum for 02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-06-17T06:01:43Z`
LockHash: `45854165408cdd2443b848fef88cfb1fed4d4b7cbf6f2f662e5f9fde6890dcc9`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/03-implementation-summary.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/04-test-summary.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/evidence/logs/sp48-phase5-runtime-package-sea.green.log`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/evidence/logs/sp48-phase5-runtime-validate-ui.log`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/studio-rerank.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
Outputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This current-phase upstream-gap addendum records Phase 5 browser findings that invalidate the locked assumption that only verification remained, reopens bounded implementation work for route-loading regressions and Apple-reference drift, and amends the effective plan for the remainder of run 48 without editing locked Phase 2 through Phase 4 artifacts.

## TODO

- [x] Reconcile the locked plan/implementation/test assumptions against the packaged-runtime browser findings
- [x] Record the specific gaps that require reopened implementation work
- [x] Amend the effective remainder plan without editing locked earlier artifacts

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: the active tool surface for this run still does not expose a callable recursive-subagent workflow, so the Phase 5 gap analysis and plan amendment remained controller-owned.
- Delegation Decision Basis: the gap was discovered by direct browser exercise of the packaged runtime plus source inspection of the shared runtime-ui shell/theme surfaces; the corrective plan therefore needed direct reconciliation against the locked plan, implementation summary, and test summary.

## Effective Inputs Re-read

- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/03-implementation-summary.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/04-test-summary.md`

## Earlier Phase Reconciliation

- The locked Phase 2 plan correctly required rebuilt-runtime browser QA, but it under-specified two critical items that Phase 5 proved were necessary:
  - a full route-loading browser matrix across the declared runtime UI route set, not only Overview plus one additional route
  - explicit post-browser remediation steps for shared shell-header contract failures and typography/control drift if browser QA disproved the implementation summary
- The locked Phase 3 implementation summary stated that remaining work was verification only. Phase 5 evidence disproves that claim: the packaged runtime shows real client-render failures and incomplete Apple-reference rollout.
- The locked Phase 4 test summary remains valid as an automated floor, but its passing suite/build/typecheck evidence was insufficient to prove the packaged runtime behaved correctly in the browser.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: compared the locked requirements and locked plan against the packaged-runtime browser results, the current runtime-ui source, and the Apple reference artifact
- Acceptance Decision: accepted
- Repair Performed After Verification: none in product code; this artifact records the formal compensation path

## Worktree Diff Audit

- Baseline: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Comparison: `worktree`
- Normalized diff command: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Product files re-opened by this addendum:
  - `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `/role-model-router/apps/runtime-ui/app/app.css`
  - `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
  - `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
  - `/role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/studio-rerank.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- Evidence-only additions expected:
  - updated Phase 5 logs
  - rebuilt packaging/browser QA evidence
  - this addendum
- Unexplained drift:
  - none recorded by this addendum

## Gaps Found

### Gap 1: the locked plan did not require a full route-loading browser matrix

Evidence:

- Packaged runtime browser sweep against `http://127.0.0.1:3457` visited `59` declared routes and found `27` broken in-client while still returning HTTP `200`.
- Broken routes include:
  - `/app/studio/images`
  - `/app/studio/audio`
  - `/app/studio/rerank`
  - `/app/studio/advanced`
  - `/app/local/peer-models`
  - `/app/local/llama-swap/models`
  - `/app/local/llama-swap/matrix`
  - `/app/local/endpoints`
  - `/app/router`
  - `/app/router/strategy`
  - `/app/system/runtime-config`
  - `/app/connect/downstream`
  - `/app/observe/activity`
  - `/app/observe/logs`
  - `/app/system/runtime`
  - `/app/system/session-readiness`
  - `/app/system/peers`
- Console evidence on the failing routes consistently showed React error `#185` with the stack terminating in `shell-header-context`.

Implications:

- `R2`, `R5`, `R8`, `R10`, and `R11` cannot be accepted from the locked implementation/test artifacts.
- Phase 5 cannot lock as a verification-only phase; bounded remediation must occur first.

Current-phase compensation:

- Treat this addendum as a plan amendment requiring full route-loading browser verification for the declared route set before Phase 5 completion.
- Reopen bounded implementation to fix the shared shell-header contract and rerun the full route matrix after packaging.

### Gap 2: the locked plan did not anticipate a shared shell-header contract regression

Evidence:

- `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx` currently treats inline `actions` and `override` values as layout-effect dependencies while also mutating provider state.
- Failing routes are concentrated on pages that use `usePageActions()` or `useShellHeaderOverride()` with fresh JSX or object literals.

Implications:

- The route failures are not isolated page bugs; they are a shared client-render regression rooted in the shell-header hook contract.
- Any route-level cosmetic remediation is secondary until the shared hook contract is repaired.

Current-phase compensation:

- Add a bounded remediation slice that repairs the shell-header hook contract first, adds focused RED/GREEN coverage for stable page actions and header overrides, and reruns affected routes before broader theme cleanup is considered complete.

### Gap 3: the locked plan under-specified exact Apple-reference cleanup after real-browser review

Evidence:

- `DESIGN_SYSTEM.md` still contains conflicting lower rules such as `Rectilinear only`, `No rounded treatments`, and `never introduce amber, emerald, rose...`.
- Shared shell/primitives still rely on generic `text-sm`, `font-medium`, and generic large-title classes instead of the approved Apple typography matrix.
- `app.css` still forces generic text/search inputs and `textarea` into the mono stack.
- Remaining Swiss strings persist in route content, including the default prompt in `studio-images.tsx` and the sample text in `studio-rerank.tsx`.

Implications:

- `R1`, `R3`, `R4`, `R5`, `R6`, `R7`, and `R9` are only partially satisfied by the locked implementation.
- The design is close enough to pass a casual glance but still materially drifts from the approved Apple-reference contract and user-approved requirements.

Current-phase compensation:

- Amend the remaining implementation scope to explicitly:
  - repair `DESIGN_SYSTEM.md` first
  - rebuild the shared typography/control layer
  - quiet shell chrome and remove token leaks
  - remove the remaining Swiss-era strings from runtime-ui route content

## Plan Amendment

This addendum amends the effective plan for the remainder of run 48. The locked `02-to-be-plan.md` remains the base plan, but the following remediation slices are now mandatory before Phase 5 can complete.

### SP48-E1 — Repair the shared shell-header route contract

Required work:

1. Repair the shared shell-header contract before any further styling work:
   - `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
   - any directly affected shared-shell consumers
2. Add focused failing regression coverage first for:
   - stable `usePageActions()` behavior with inline JSX
   - stable `useShellHeaderOverride()` behavior with route-level title overrides
   - route render paths that previously crashed because of the shared hook contract
3. Re-run focused runtime-ui tests and then browser-check the previously broken routes after rebuilding.

Required verification:

- focused RED log for shell-header regression
- focused GREEN log after repair
- targeted browser proof that the previously broken route family loads without uncaught React render errors

### SP48-E2 — Repair the design-system contract and shared typography/control layer

Required work:

1. Repair the contract first:
   - update `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` so it contains the exact approved token and typography tables
   - remove the conflicting lower Swiss-era rules that contradict the approved Apple contract
2. Rebuild the shared typography/control layer:
   - introduce explicit shared type roles and control variants for display, body, caption, utility, and pill CTA usage
   - replace generic `text-sm`, `font-medium`, `text-3xl`, and similar fallback styling across:
     - `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
     - `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
     - `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
     - `/role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
   - remove mono from generic text/search inputs in `/role-model-router/apps/runtime-ui/app/app.css`
3. Remove remaining Swiss-language route strings in runtime-ui route content.

Required verification:

- updated RED/GREEN regression coverage for design-system and theme/runtime-ui shared surfaces
- focused runtime-ui suite
- runtime-ui build

### SP48-E3 — Quiet shell chrome and clean token leaks

Required work:

1. Reduce the visual weight of nav chrome in `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`.
2. Replace raw Tailwind semantic colors with design-system tokens in:
   - `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
   - `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
3. Verify shared pills keep transparent backgrounds while preserving semantic border and text colors.

Required verification:

- focused RED/GREEN coverage where practical
- focused runtime-ui suite
- runtime-ui build
- packaged browser proof on the affected surfaces

### SP48-E4 — Rebuild and complete the full browser route matrix

Required work:

1. Rebuild the packaged runtime after the remediation slices above.
2. Re-run the browser route matrix for the declared runtime-ui route set, including redirect aliases and parameterized route drill-ins.
3. Confirm:
   - no route in the declared matrix crashes in-client
   - Overview works in light and dark
   - the theme toggle exposes only `Light` and `Dark`
   - persisted theme survives reload
   - transparent status pills remain correct
   - at least one non-Overview route and the previously broken route families now load cleanly

Required verification:

- updated packaging log
- updated browser QA evidence
- updated route-matrix result captured in Phase 5 evidence

## Repair Work Performed

- Created this current-phase upstream-gap addendum as the formal plan amendment for the remainder of run 48.
- No product code changes were made by this artifact.

## Requirement Completion Status

- `R0 | Status: superseded by approved addendum | Rationale: the locked Phase 2 sequence did not include a full route-loading browser matrix or post-browser remediation steps. Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R1 | Status: incomplete | Blocking Evidence: remaining Swiss strings in /role-model-router/apps/runtime-ui/app/routes/studio-images.tsx and /role-model-router/apps/runtime-ui/app/routes/studio-rerank.tsx plus conflicting lower rules in /role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R2 | Status: incomplete | Blocking Evidence: packaged-runtime browser sweep found 27 broken routes despite passing automated suite/build | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R4 | Status: incomplete | Blocking Evidence: shared shell/primitives still rely on generic typography classes and generic inputs still use mono in /role-model-router/apps/runtime-ui/app/app.css | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R5 | Status: incomplete | Blocking Evidence: shell chrome remains visually heavy and route-loading regressions block acceptance of shared shell/panel rollout | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R6 | Status: incomplete | Blocking Evidence: theme toggle and control grammar still drift from the approved Apple type/control contract | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R8 | Status: incomplete | Blocking Evidence: multiple non-Overview routes fail to render in the packaged browser surface | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R9 | Status: incomplete | Blocking Evidence: the design-system document still contains conflicting Swiss-era downstream rules and remaining token leaks persist in route code | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R10 | Status: incomplete | Blocking Evidence: Phase 5 browser QA disproved the locked assumption that verification would close cleanly; rebuilt-runtime browser proof must be repeated after remediation | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `R11 | Status: incomplete | Blocking Evidence: new remediation slices require fresh RED/GREEN evidence before the reopened production changes can be accepted | Addendum: /.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`

## Audit Verdict

- Audit summary: Phase 5 browser evidence found a real plan/verification gap that cannot be reconciled by editing locked history. This addendum formally reopens bounded implementation and verification work while keeping the run inside the approved Apple-theme and route-stability scope.
Audit: PASS

## Coverage Gate

- [x] The addendum states what in the locked plan was missing or incorrect
- [x] The addendum records concrete evidence for why the amendment is needed
- [x] The addendum specifies amended remaining implementation, test, packaging, and browser-QA steps
- [x] The addendum states which requirements are affected
- [x] The addendum includes route-loading remediation together with the approved Apple-reference cleanup work

Coverage: PASS

## Approval Gate

- [x] The user approved the remediation proposal in chat
- [x] The addendum preserves the locked-history rule by amending the current phase instead of editing locked Phase 2 through Phase 4 artifacts
- [x] The amended work remains bounded to runtime-ui route stability plus the approved Apple-theme implementation scope

Approval: PASS
