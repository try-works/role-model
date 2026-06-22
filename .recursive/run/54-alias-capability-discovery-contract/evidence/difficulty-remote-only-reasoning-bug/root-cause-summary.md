Run: `/.recursive/run/54-alias-capability-discovery-contract/`
Issue: `difficulty.remote-only` returned HTTP 400 for Pi requests with high thinking enabled.

## Error Analysis

The live OpenAI-compatible request failed with:

```text
HTTP 400
Chosen endpoint  is not present in the registry result.
```

The empty value after `Chosen endpoint` means the core router produced an empty
`chosen_endpoint_id`, not that a named endpoint was missing from adapter execution.

## Reproduction

The failure reproduced with a direct multi-turn request to:

```text
POST http://127.0.0.1:3456/v1/chat/completions
model: difficulty.remote-only
reasoning_effort: high
```

The same request without `reasoning_effort` succeeded. This isolated the trigger
to the reasoning-effort capability requirement inferred from Pi's high thinking
setting.

## Root Cause

The runtime host bridge inferred `reasoning.effort_control` for requests with
`reasoning_effort`, and its capability pre-filter accepted endpoints that declare
generic `reasoning`. The core router later used exact string matching for
required capabilities, so endpoints declaring `reasoning` were rejected for
`reasoning.effort_control`. That left no eligible candidates and produced an
empty `chosen_endpoint_id`.

## Fix

`role-model-router/packages/core/src/router.ts` now uses a shared capability
matcher for required and preferred capability checks. It accepts exact matches,
child capabilities, generic `reasoning` for reasoning sub-capabilities, and the
structured-output/json-schema naming aliases.

## TDD Evidence

RED:

```text
.recursive/run/54-alias-capability-discovery-contract/evidence/difficulty-remote-only-reasoning-bug/red-protocol-routing-reasoning-effort.log
```

GREEN:

```text
.recursive/run/54-alias-capability-discovery-contract/evidence/difficulty-remote-only-reasoning-bug/green-protocol-routing-reasoning-effort.log
```

## Verification

Passing checks:

```text
corepack pnpm --filter @role-model-router/protocol-routing exec vitest run test/index.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/alias-capability-routing.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/request-capability-inference.test.ts test/model-capability-resolver.test.ts test/downstream-openai-discovery.test.ts
corepack pnpm --filter @role-model-router/core build
corepack pnpm --filter @role-model-router/protocol-routing build
corepack pnpm --filter @role-model-router/runtime-host-bridge build
git diff --check
```

Live runtime verification after clean restart:

```text
POST /v1/chat/completions with model=difficulty.remote-only, reasoning_effort=high
non-streaming: HTTP 200
streaming: HTTP 200
```
