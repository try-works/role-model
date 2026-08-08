Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `03 Implementation Summary` (follow-on)
Addendum: `01b` (`response-completed-id`)
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- Desktop error: `stream disconnected before completion: failed to parse ResponseCompleted: missing field id`
- `packages/codex-role-model/src/forwarder.ts` (`emitCodexJsonOrSse`, SSE normalize/finalize, web_search fulfill)
Outputs:
- `ensureCodexResponseId` + call sites
- tests covering missing-id completed events and streamed web_search fulfill
Scope note: Follow-on to `web-search-serp-dump` addendum 01. Adapter-only.

## Root cause

Buffered web_search fulfill re-emits SSE for Desktop (`stream: true`). Upstream/synthesize payloads sometimes omit `response.id`. `response.created` synthesized an id, but `response.completed` forwarded the id-less object → Codex parse failure + Reconnecting.

## Fix

- `ensureCodexResponseId()` synthesizes `resp_<uuid>` when missing.
- Applied in: `emitCodexJsonOrSse`, SSE `response.completed` normalize, `finalizeCodexResponsesSse`, strip/synthesize/fallback message payloads.

## Verification

- 44 package tests green
- Adapter rebuilt + listening on `:3460`

## Audit

- Audit Execution Mode: self-audit
- Audit: PASS
