---
Type: domain
Status: CURRENT
Scope: role-model-router
Owns-Paths: track-b-runtime.ts, 02-to-be-plan.md, node --test tests/track-b/tb10.test.mjs, extensions.tsx, role-model-router/apps/runtime-host-bridge/test/track-b-runtime-composition.test.ts, role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts, role-model-router/apps/runtime-host-bridge/test/track-b-operations-api.test.ts, track-b-operations.ts, role-model/.worktrees/81-kw-activation-browser-recommendation-evidence/role-model-router/apps/runtime-ui/app/routes/extensions.tsx, role-model-router/apps/runtime-ui/e2e/track-b-operations.spec.ts
Watch-Paths:
Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa, 86-runtime-ui-rm3-design-system-frontend
Validated-At-Commit:
Last-Validated: 2026-07-24T23:06:57.809909+00:00
Tags: reasoningbank, training-free-grpo
---

# role-model-router

Domain memory for `role-model-router`.


## ReasoningBank Items (2026-07-24T23:06:57.809909+00:00)

### RB-8: Set mode for extensions

**Description:** Extensions UI uses one Set mode control including disabled

**Content:** 1. Prefer public mutate set_mode (including mode disabled) as the sole enablement authority. 2. Do not invent a UI-only enablement store. 3. Treat intentional disable as neutral status, not ErrorState; clear stale operator_disabled health on re-enable.

```yaml
rb_id: "RB-8"
title: "Set mode for extensions"
description: "Extensions UI uses one Set mode control including disabled"
task_type: "frontend-implementation"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["role-model-router/apps/runtime-ui/app/routes/extensions.tsx", "role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts", "POST /api/role-model/extensions/mutate"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.809909+00:00"
```

### RB-9: Package SEA with Track B root

**Description:** Packaged runtime needs ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT for ExtensionHost

**Content:** 1. Set ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT to private dist/run00-dev (or equivalent) before pnpm runtime:package-sea. 2. Without it ExtensionHost will not register the thirteen packages. 3. Keep core /api/role-model readiness independent of full extension registration.

```yaml
rb_id: "RB-9"
title: "Package SEA with Track B root"
description: "Packaged runtime needs ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT for ExtensionHost"
task_type: "packaging-verification"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT", "pnpm runtime:package-sea", "role-model-router/apps/runtime-host-bridge/"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.809909+00:00"
```

### RB-10: KW unlock is gated

**Description:** Knowledge Worker activation stays policy-gated and distinct from Set mode

**Content:** 1. Keep static/class productionActivation false. 2. Unlock instance activation only under policy v1 + attestation activate-production + verified knowledge_validation claims + shadow candidate. 3. Do not equate Set mode or recommendation apply with KW activation.

```yaml
rb_id: "RB-10"
title: "KW unlock is gated"
description: "Knowledge Worker activation stays policy-gated and distinct from Set mode"
task_type: "extension-policy"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["extensions/knowledge-worker/index.mjs", "tests/track-b/tb10.test.mjs", "role-model-router/apps/runtime-ui/app/routes/extensions.tsx"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.809909+00:00"
```

### RB-11: Browser lifecycle on rebuilt SEA

**Description:** Run 81 closed recommendation UX on a freshly rebuilt packaged SEA

**Content:** 1. Rebuild packaged public SEA before browser QA. 2. Capture Playwright download to preview to apply to dismiss evidence under the run binder. 3. Cite browser-dev-lifecycle logs and recommendation row receipts; keep hop ids in evidence not memory.

```yaml
rb_id: "RB-11"
title: "Browser lifecycle on rebuilt SEA"
description: "Run 81 closed recommendation UX on a freshly rebuilt packaged SEA"
task_type: "qa-verification"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["role-model-router/apps/runtime-ui/e2e/", "evidence/logs/browser-dev-lifecycle.log", "evidence/binder.json"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.809909+00:00"
```

### RB-12: Absolute public RCS paths

**Description:** Dual-repo Changed Files need absolute public worktree paths

**Content:** 1. When private and public worktrees pair, record absolute public paths in Requirement Completion Status Changed Files. 2. Relative private-only paths fail dual-repo RCS checks. 3. Prefer public-product-change-set inventory plus host-bridge/runtime-ui absolute refs.

```yaml
rb_id: "RB-12"
title: "Absolute public RCS paths"
description: "Dual-repo Changed Files need absolute public worktree paths"
task_type: "requirements-scoping"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["03-implementation-summary.md", "evidence/other/public-product-change-set.md", "role-model-router/"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.809909+00:00"
```

### RB-13: Refresh review bundle hash

**Description:** Regenerate the Phase 3.5 review bundle after finalizing the reviewed artifact

**Content:** 1. Prefer recursive-review-bundle for Phase 3.5. 2. After editing the reviewed artifact, regenerate the bundle so hashes match before lock. 3. Put citations in linter-scanned narrative sections, not only frontmatter.

```yaml
rb_id: "RB-13"
title: "Refresh review bundle hash"
description: "Regenerate the Phase 3.5 review bundle after finalizing the reviewed artifact"
task_type: "code-review"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["03.5-code-review.md", "recursive-review-bundle", "evidence/review-bundles/"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.809909+00:00"
```

## RM3 runtime-ui styling authority (run 86)

Run `86-runtime-ui-rm3-design-system-frontend` closed out the RM3 migration. Live styling authority for router runtime-ui is RM3 Paper pages `4-0`/`5-0`/`6-0`/`7-0` plus repo `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` and `@role-model/ui` at `role-model-router/packages/ui`. Run `60-runtime-ui-paper-linear-review-alignment` Linear/Paper-Linear baseline is historical only. Warning pill chrome ink must not use amber (charts keep amber — see `skills/issues/rm3-pill-no-amber.md`).
