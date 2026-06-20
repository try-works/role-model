Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `12`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-18.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-18.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-12.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Scope note: documentation-only clarification of provider capability and hosted-tool semantics.

## Implemented

1. updated `/docs/architecture/09-runtime-routing-strategy-interactions.md`
   - clarified that the current hosted-tool narrowing logic is about the normalized
     OpenAI Responses `web_search` contract, not a generic provider-wide web-search bit
   - added a provider capability matrix for OpenAI, Kimi, and DeepSeek
   - clarified that Kimi and DeepSeek have vendor-documented web-search/tool surfaces
     which are not yet normalized to the same runtime hosted-tool contract
2. preserved the existing alias, role/task, and routing-flow diagrams while correcting
   the surrounding terminology and examples

## Verification

Self-audit inputs checked:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- Kimi official docs
- DeepSeek official docs

Result:

- the routing doc now distinguishes provider-native tool capability from
  repo-normalized hosted-tool request-shape support
- the live OpenAI-only hosted-tool filtering behavior remains documented truthfully
