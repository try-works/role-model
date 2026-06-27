# Addenda Plan: Difficulty Classifier Model Fallback Fix

**Date:** 2026-06-27 | **Session:** 260626-still-diamond
**Based on:** `addenda/04-difficulty-classifier-bug.addendum-01.md`
**TDD Mode:** `strict`
**QA Execution Mode:** `agent-operated`

---

## Bug Recap

When `difficultyClassifier.modelId` is `null` (default) but `controller.modelId` is configured, the classifier endpoint filter `endpoint.identity.model_id === null` matches nothing → classifier falls back to `hard` difficulty → routing degrades.

---

Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `18cbc7ac80dc5c7fedc8ec19890160fb5f06f46b3a96b8e83e84759c4e881a27`

## SP-C1: Fix Classifier Model Fallback

### RED Test

| # | Test | Expected |
|---|---|---|
| C1-R1 | `resolveDifficultyClassifierEndpoint` returns controller's model when classifier is null | Test fails — returns empty/fallback |
| C1-R2 | When both classifier and controller are null, falls back to hard difficulty | Test fails |
| C1-R3 | When classifier is set, uses classifier (not controller) | Test fails |

### Implementation

In `index.ts` line ~16023:

```typescript
// BEFORE:
const classifierAllowEndpoints = currentRegistry.endpoints
  .filter(
    (endpoint) =>
      endpoint.identity.model_id === classifier.modelId &&
      toSourceType(endpoint.identity.endpoint_kind) === classifier.sourceType,
  )

// AFTER:
const effectiveClassifierModelId = 
  classifier.modelId ?? getCurrentControllerAssignment()?.modelId;
const classifierAllowEndpoints = currentRegistry.endpoints
  .filter(
    (endpoint) =>
      endpoint.identity.model_id === effectiveClassifierModelId &&
      toSourceType(endpoint.identity.endpoint_kind) === classifier.sourceType,
  )
```

### GREEN Test

| # | Verification |
|---|---|
| C1-G1 | Host bridge test: classifier with null modelId + configured controller → classifier uses controller's model |
| C1-G2 | Host bridge test: both null → fallback to hard difficulty |
| C1-G3 | Host bridge test: classifier set → uses classifier, ignores controller |
| C1-G4 | `benchmark-start-guards.test.ts` still passes |

### Verification

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge test (selected)
corepack pnpm --filter @role-model-router/runtime-host-bridge build
```

---

## Phase 5 Live QA Verification (After Fix)

1. On the live runtime (:3456), configure controller model but leave difficulty classifier empty
2. Send a request through the alias
3. Verify: request is routed correctly (classifier uses controller's model, not fallback)
4. Verify: routing diagnostics show the effective classifier model
5. Record receipt for this addenda fix

---

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS — implement immediately.
