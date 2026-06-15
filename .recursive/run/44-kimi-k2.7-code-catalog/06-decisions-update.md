Run: `/.recursive/run/44-kimi-k2.7-code-catalog/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-15T03:07:41Z`
LockHash: `038c3dc8746822bb314a606f47e07118f5efb599aceefcdffa11ba569e4c4574`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/44-kimi-k2.7-code-catalog/05-manual-qa.md`
- `/.recursive/run/44-kimi-k2.7-code-catalog/03-implementation-summary.md`
Outputs:
- `/.recursive/run/44-kimi-k2.7-code-catalog/06-decisions-update.md`
- `/.recursive/DECISIONS.md`

## Decisions Changes Applied

Added run index entry **44-kimi-k2.7-code-catalog**:

1. **Moonshot K2.7 operator catalog slice** — `moonshot/kimi-k2.7-code` added via supplement + models.dev refresh; shown on Moonshot Open Platform and Kimi Code variants without Connect UI changes.
2. **Pricing alias** — `moonshot/kimi-k2.7-code` → `moonshotai/kimi-k2.7-code` for catalog economics (same pattern as k2.6).
3. **Capability mapping** — models.dev `structured_output` maps to catalog `structured.output` during refresh.
4. **LiteLLM fixture row** — repo `litellm-model-prices.json` includes k2.7 until vendored LiteLLM upstream catches up.

## Rationale

Prior catalog work for K2.7 never merged to `main`; Connect omitted the model because `listProviders()` reads normalized catalog only. Run 44 lands the models.dev row and operator slice through the established refresh/supplement/export pipeline.

## Requirement Completion Status

| R# | Status | Notes |
| --- | --- | --- |
| R0–R7 | verified | See `03-implementation-summary.md` |

Audit: PASS
