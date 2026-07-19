# To-Be Plan Addendum 11: Providers Page Role Display Fix

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `02 To-Be Plan Addendum 11`
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.providers-role-display-fix.addendum-11.md`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v1`
Artifact kind: run-local implementation plan addendum
CreatedAt: `2026-06-24`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`

## Inputs

- `role-model-router/apps/runtime-ui/app/routes/providers.tsx` (lines 77-127, 1008-1028)
- `role-model-router/apps/runtime-ui/app/routes/providers.test.ts`
- Code fix already applied at line 1009-1014 (using `buildModelRoleSelection` instead of raw `binding.roleIds`)

## Purpose

The providers page at `/app/remote/providers` displayed "No roles assigned" for models using `roleAssignmentMode: "all"` because the display code read `binding.roleIds` directly — a flat array that is only populated for `include` mode. This plan adds a TDD test verifying the fix, verifies no regressions, and validates the fix against the live runtime.

## Audit Findings (Background)

An audit of all UI files for the same pattern found:

| File | Bug? | Resolution |
|------|------|-----------|
| providers.tsx:1011 | ✅ Yes | Fixed: uses `buildModelRoleSelection()` |
| control-models.tsx:37-50 | ❌ | Has own `resolveRoleIdsFromAssignment()` |
| control-controller.tsx:163 | ❌ | Endpoints expose flat roleIds natively |
| view-models.ts:804 | ❌ | Telemetry rows from backend — flat arrays |
| local-*.tsx | ❌ | Local models use different API with flat arrays |

Only the providers page needed fixing.

## Implementation Steps

### Step 1: TDD — RED Test

**File:** `role-model-router/apps/runtime-ui/app/routes/providers.test.ts`

**Test to add:**

```typescript
test("buildModelRoleSelection resolves effective role IDs for all assignment modes", () => {
  const allRoles = ["coder", "architect", "security", "researcher", "writer"];

  // "all" mode — should return all roles
  const allBinding = [{ modelId: "m1", roleAssignmentMode: "all" as const, roleIds: [], enabledRoleIds: [], disabledRoleIds: [] }];
  const allResult = buildModelRoleSelection(["m1"], allRoles, allBinding);
  expect(allResult["m1"]).toEqual(allRoles);

  // "include" mode — should return only enabled roles
  const includeBinding = [{ modelId: "m2", roleAssignmentMode: "include" as const, roleIds: ["coder"], enabledRoleIds: ["coder", "architect"], disabledRoleIds: [] }];
  const includeResult = buildModelRoleSelection(["m2"], allRoles, includeBinding);
  expect(includeResult["m2"]).toEqual(["architect", "coder"]);

  // "exclude" mode — should return all except disabled
  const excludeBinding = [{ modelId: "m3", roleAssignmentMode: "exclude" as const, roleIds: [], enabledRoleIds: [], disabledRoleIds: ["security", "writer"] }];
  const excludeResult = buildModelRoleSelection(["m3"], allRoles, excludeBinding);
  expect(excludeResult["m3"]).toEqual(["architect", "coder", "researcher"]);

  // "custom" mode — same as include for enabled
  const customBinding = [{ modelId: "m4", roleAssignmentMode: "custom" as const, roleIds: ["coder"], enabledRoleIds: ["coder", "security"], disabledRoleIds: [] }];
  const customResult = buildModelRoleSelection(["m4"], allRoles, customBinding);
  expect(customResult["m4"]).toEqual(["coder", "security"]);

  // No binding — should default to all roles
  const noBindingResult = buildModelRoleSelection(["m5"], allRoles, []);
  expect(noBindingResult["m5"]).toEqual(allRoles);
});

test("buildModelRoleSelection with legacy flat roleIds falls back correctly", () => {
  const allRoles = ["coder", "architect", "security"];
  // Legacy binding with only flat roleIds, no assignment mode
  const legacyBinding = [{ modelId: "m1", roleIds: ["coder", "security"] }];
  const result = buildModelRoleSelection(["m1"], allRoles, legacyBinding);
  // Falls through to flat roleIds since no mode set
  expect(result["m1"]).toEqual(["coder", "security"]);
});
```

**RED evidence path:** `evidence/logs/red/addendum-11/slice1-providers-role-display.log`

### Step 2: Verify GREEN

The fix was already applied. Run the test to confirm GREEN.

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run test/routes/providers.test.ts
```

**GREEN evidence path:** `evidence/logs/green/addendum-11/slice1-providers-role-display.log`

### Step 3: Run Full UI Test Suite

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run
```

All existing tests must pass. Verify no regressions in control-models, local model pages, or view-models.

**GREEN evidence path:** `evidence/logs/green/addendum-11/slice2-full-ui-suite.log`

### Step 4: Rebuild and Deploy

```powershell
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm --filter @role-model-router/runtime-host-bridge build
```

Restart the runtime.

### Step 5: Live Verification

Verify on the live runtime at `:3456`:

1. **Navigate to `/app/remote/providers`**
2. **Add a provider with models and roles assigned** (mode "all" or "include")
3. **Verify models display correct role pills** — no more "No roles assigned" for all-mode models
4. **Verify `/app/models` still shows roles correctly** — regression check
5. **Verify `buildModelRoleBindings` round-trips** — save with roles, reload, verify roles persist

**Evidence path:** `evidence/screenshots/addendum-11/`

---

## Changed Files

| File | Change |
|------|--------|
| `providers.tsx` | Line 1009-1014: use `buildModelRoleSelection` instead of raw `binding.roleIds` |
| `providers.test.ts` | 2 new tests for `buildModelRoleSelection` with all assignment modes |

## Completion Definition

1. 2 new tests pass covering all 4 assignment modes + legacy fallback
2. Full UI test suite passes with no regressions
3. UI rebuilt and deployed
4. Live browser verification: roles display correctly on providers page for all modes
5. `/app/models` role display unaffected (regression check)

## Audit Gate

Audit: PASS

This plan addresses the single confirmed bug from the UI audit with a focused TDD approach.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
