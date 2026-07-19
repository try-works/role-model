Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation Summary`
Addendum: `15`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:50Z`
LockHash: `83f30ae7d917594f6b0bdc0d6a9e076527ef873314cd4b3bac0becb744b2037c`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-assistant-history-content-parts.addendum-15.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.codex-assistant-history-content-parts.addendum-15.md`
Scope note: Summarizes the role-aware Codex Responses content-part conversion implementation.

# Addendum 15 Implementation Summary: Codex Assistant History Content Parts

## TODO

- [x] Implement role-aware content part conversion.
- [x] Keep Pi, Craft, alias, model, and provider branches out of the fix.
- [x] Preserve native Codex Responses streaming and telemetry behavior.

## Change

`role-model-router/apps/runtime-host-bridge/src/index.ts` now translates chat-completions content parts for the native Codex Responses adapter with role awareness.

The converter now emits:

- `input_text` for user-side text input
- `output_text` for assistant-side text history
- unchanged `refusal` parts for assistant refusal history
- `input_image` only for user-side image input

This directly matches the OpenAI Responses contract for replaying previous assistant output while preserving Chat Completions compatibility at ingress.

## Non-Goals

- No Pi code changed.
- No Craft code changed.
- No model-id special case added.
- No alias-specific special case added.
- No provider-specific downstream consumer branch added.
- No Codex app-server execution code reintroduced.

## Notes

During live probing, a manually constructed direct runtime request with `temperature: 0` failed against the Codex Subscription backend with `Unsupported parameter: temperature`. That request shape was not counted as verification for this addendum because it was not the Pi-reproduced shape. The real Pi CLI requests in this addendum did not send that unsupported field and completed successfully.

## Coverage Gate

- [x] Implementation summary covers the changed conversion behavior.
- [x] Non-goals preserve the downstream consumer boundary.
- [x] Unsupported-temperature live probe is documented as non-verification for this addendum.

Coverage: PASS

## Approval Gate

- [x] Implementation matches the addendum plan.
- [x] No consumer-specific branch is introduced.
- [x] Ready for test-summary verification.

Approval: PASS

Audit: PASS
