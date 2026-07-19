# Addendum: Difficulty Classifier Model Selection Bug

**Date:** 2026-06-27 | **Auditor:** Session 260626-still-diamond
**Phase:** Phase 5 QA finding
**Severity:** Medium — pre-existing, not introduced by run 58

---

## 1. Bug Description

When a user configures a model as the **controller** (intelligent routing mode), they expect that model to also handle difficulty classification. However, the difficulty classifier and controller are **separate configurations** with independent defaults.

### Affected Code

`role-model-router/apps/runtime-host-bridge/src/index.ts` (line ~15987):

```typescript
const classifierAllowEndpoints = currentRegistry.endpoints
  .filter(
    (endpoint) =>
      endpoint.identity.model_id === classifier.modelId &&   // ← null matches nothing
      toSourceType(endpoint.identity.endpoint_kind) === classifier.sourceType,
  )
```

### Two Separate Configs

| Config | Purpose | Default `modelId` |
|---|---|---|
| `difficultyClassifier` | Picks which model does **difficulty bucket assessment** | `null` |
| `controller` | Picks which model does **controller-guided routing** (intelligent mode) | `null` |

### How It Fails

1. User sets controller `modelId` to `deepseek/deepseek-v4-flash`
2. `difficultyClassifier.modelId` remains at default `null`
3. Filter `endpoint.identity.model_id === null` matches **no endpoints**
4. Classifier falls back to `hard` difficulty for everything
5. Difficulty routing degenerates to basic mode — wrong model selected

### Impact

- Difficulty-based routing silently degrades when only controller is configured
- Controller model may not be used for classification even when intended
- User has no indication that difficulty classifier needs separate configuration

---

Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `98311a32a6f16a37ef0f2e7b31d18d980bd43bbb27068ca099815722cf1c462c`

## 2. Root Cause

The `difficultyClassifier` and `controller` are separate configuration objects in `RuntimeUnifiedConfig` with independent `modelId` fields. There is no fallback relationship between them — if one is configured but the other isn't, the `null` default causes the endpoint filter to match nothing.

The `codex/gpt-5.4` endpoint was selected because after the classifier failed to find a matching endpoint, the fallback path picked a different model than intended.

---

## 3. Reproduction

1. Configure a controller model via RMCS UI or runtime config:
   ```yaml
   controller:
     model_id: deepseek/deepseek-v4-flash
     active: true
   ```
2. Leave `difficultyClassifier` at default (`modelId: null`)
3. Send a request through the alias
4. Observe: difficulty routing falls to `hard` bucket; wrong model selected

---

## 4. Fix Recommendation

**Option A (runtime-level fallback):** When `difficultyClassifier.modelId` is `null` but controller is configured, fall back to the controller's `modelId`. Add to the classifier endpoint resolution:

```typescript
const effectiveClassifierModelId = classifier.modelId ?? controller.modelId;
```

**Option B (UI hint):** In the RMCS UI, when controller is configured but difficulty classifier isn't, show a warning: "Difficulty classifier model not set. Using fallback difficulty bucket. Configure a classifier model for optimal routing."

**Option C (config validation):** On runtime startup, validate that if controller is active, difficulty classifier has a `modelId` set. Emit a diagnostic warning to the operator logs.

---

## 5. Run 58 Relevance

This bug is **pre-existing** — not introduced by run 58 changes. Run 58 does not modify the difficulty classifier endpoint resolution logic. The run 58 changes (benchmark scoring, telemetry dimensions) are additive and do not affect this code path.

However, this bug may affect Phase 5 live QA if:
- The runtime used for QA has controller configured but difficulty classifier not configured
- Benchmark-informed routing (R6) relies on difficulty routing to function correctly
- E2E test cases P5-004 and P5-005 involve difficulty-classified requests

**Recommendation:** Fix before Phase 5 live QA to ensure routing behaves as expected during benchmark and telemetry verification.

---

## 6. Not Yet Implemented

This addendum documents the bug but does not implement a fix. The fix should be applied in the runtime host bridge (`index.ts`) with appropriate test coverage. This is not a run 58 scope item but is noted for awareness during Phase 5 QA.
