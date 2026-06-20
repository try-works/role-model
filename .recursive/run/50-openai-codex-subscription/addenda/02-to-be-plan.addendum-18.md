Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `18`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-18.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-18.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-12.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Scope note: documentation-only clarification of provider capability semantics; no runtime behavior change.

## Objective

Make the routing architecture doc state the provider/tooling distinction precisely:

1. ordinary function calling is broad across providers
2. OpenAI Responses hosted tools are a narrower normalized runtime contract
3. Kimi and DeepSeek have provider-native web-search/tool surfaces that are not yet
   normalized to the same hosted-tool contract in this repo

## Implementation Plan

### Phase 1: terminology repair

1. replace ambiguous `hosted web search` wording where it currently implies a generic
   cross-provider capability
2. rename it in context to `OpenAI Responses hosted web search`,
   `normalized hosted tool contract`, or `provider-native hosted tools` as appropriate

Acceptance:
- the document no longer implies that all provider web-search features share the same
  request shape

### Phase 2: explicit provider capability matrix

1. add a compact matrix for `OpenAI`, `Kimi`, and `DeepSeek`
2. distinguish:
   - vendor-documented function calling
   - vendor-documented provider-native web search or official tools
   - repo-modeled runtime capability today
   - repo-supported normalized hosted-tool contract today

Acceptance:
- an operator can read one table and understand why Kimi or DeepSeek web search support
  does not automatically mean `tools: [{ type: "web_search" }]` works on those
  endpoints in this runtime

### Phase 3: examples and decision-flow updates

1. update the hosted-tool filtering section and live examples so they explicitly refer
   to the OpenAI Responses `web_search` contract
2. preserve the existing alias, role/task, and routing diagrams while correcting the
   surrounding terminology

Acceptance:
- the request-flow and controller examples still match live runtime behavior

### Phase 4: verification

1. self-audit the patched doc against:
   - current runtime-host-bridge code
   - provider-openai adapter behavior
   - official Kimi and DeepSeek docs used as sources

Acceptance:
- the doc matches implemented runtime behavior and current vendor documentation
