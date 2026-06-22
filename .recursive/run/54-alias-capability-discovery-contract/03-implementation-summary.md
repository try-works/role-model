Run: `/.recursive/run/54-alias-capability-discovery-contract/`
Phase: `03 Implementation`
Status: `LOCKED`
LockedAt: `2026-06-22T05:16:53Z`
LockHash: `66ed02ae921b8896b2c122660205307b1e9e70cc81f9904b202d560d15ae1cfe`
Inputs:
- `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`
- `/.recursive/run/54-alias-capability-discovery-contract/00-worktree.md`
- `/.recursive/run/54-alias-capability-discovery-contract/01-as-is.md`
- `/.recursive/run/54-alias-capability-discovery-contract/01.5-root-cause.md`
- `/.recursive/run/54-alias-capability-discovery-contract/02-to-be-plan.md`
Outputs:
- `/role-model-router/apps/runtime-host-bridge/src/model-capability-resolver.ts`
- `/role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`
- `/role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/protocol/schemas/downstream-openai-discovery.schema.json`
- `/protocol/fixtures/downstream-openai/`
- `/packages/schema-tools/src/validate-schemas.ts`
- `/packages/protocol-types/src/generated.ts`
- `/docs/architecture/12-downstream-alias-capability-discovery.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`

## Summary

Implemented rich alias capability discovery and request capability enforcement for the
OpenAI-compatible downstream surface.

The implementation is intentionally resolver-driven rather than hard-coded to
`hybrid.hybrid`:

- catalog-backed runtime model metadata resolver with `chatgpt/* -> openai/*`
  canonicalization
- request capability inference for chat-completions and responses payloads
- endpoint eligibility filtering before difficulty/controller scoring
- versioned rich downstream discovery contract at
  `/api/role-model/downstream/openai`
- schema, golden fixtures, generated protocol types, and downstream-consumer docs
- runtime diagnostics under `routingDiagnostics.capabilityEligibility`
- sanitized rich discovery endpoint ids so credential-shaped account labels are not
  exposed to downstream consumers

## TDD Evidence

Initial RED:

- `evidence/logs/red/phase3-initial-red.log`
- Result: failed as expected because new resolver/discovery/inference modules were
  missing and existing alias routing still treated image input as text-only.

Focused GREEN:

- `evidence/logs/green/phase3-focused-green-2.log`
- `evidence/logs/green/phase3-focused-green-3.log`
- `evidence/logs/green/phase3-focused-green-4.log`
- Result: 4 focused test files, 8 tests passed.

Post-sanitizer focused GREEN:

- `evidence/logs/green/post-sanitize-focused-1.log`
- `evidence/logs/green/post-error-sanitize-1.log`
- Result: bridge build passed; downstream discovery and alias capability routing tests
  passed.

Existing compatibility subset:

- `evidence/logs/green/existing-downstream-index-tests-1.log`
- Result: existing `index.test.ts` downstream/model-list/alias subset passed, 6 tests.

## Automated Verification

Passed:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge run build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/model-capability-resolver.test.ts test/request-capability-inference.test.ts test/downstream-openai-discovery.test.ts test/alias-capability-routing.test.ts`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run types:generate`
- `corepack pnpm --filter @role-model/protocol-types run build`
- `corepack pnpm --filter @role-model/schema-tools run build`
- touched-file Biome check:
  - `packages/schema-tools/src/validate-schemas.ts`
  - new runtime-host bridge source modules
  - runtime-observability type update
  - downstream schema and fixtures
  - docs

Inherited/non-blocking failures observed:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge run test:critical`
  still times out in `test/validate-observability.test.ts` and
  `test/validate-ui.test.ts` at 60000ms.
  - This matches the locked worktree baseline caveat.
  - Same command passed the other 4 files / 78 tests before those timeouts.
- `corepack pnpm --filter @role-model/schema-tools run test` builds first, but its
  broad recursive Biome regression tests still report pre-existing unrelated formatting
  and lint findings in legacy runtime files.
  - The formatting issue introduced in `validate-schemas.ts` was repaired.
  - The touched-file Biome check passes.

## Updated Runtime Verification

Started the updated worktree runtime on Pi's configured port:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx src/cli-entry.ts --host 127.0.0.1 --port 3456 --repo-root D:\DEV\role-model\.worktrees\54-alias-capability-discovery-contract --runtime-state-root "C:\Users\erikb\AppData\Local\Role Model Runtime\state" --scope-id runtime-host-bridge --unified-runtime-config "C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml"
```

Captured evidence:

- `evidence/runtime-probes-real-state/downstream-openai.json`
- `evidence/runtime-probes-real-state/downstream-openai-sanitized.json`
- `evidence/runtime-probes-real-state/runtime-models.json`
- `evidence/runtime-probes-real-state/v1-models.json`
- `evidence/runtime-probes-real-state/deepseek-image-rejection.json`
- `evidence/runtime-probes-real-state/deepseek-image-rejection-sanitized.json`
- `evidence/logs/green/live-discovery-schema-validate.log`
- `evidence/logs/green/live-discovery-sanitized-schema-validate.log`

Key live results:

- contract version: `role-model.downstream.openai.v1`
- discovery model count: `19`
- `hybrid.hybrid` safe context window: `262144`
- `hybrid.hybrid` safe max output: `128000`
- `hybrid.hybrid` max context window: `1050000`
- `hybrid.hybrid` max output: `384000`
- `hybrid.hybrid` guaranteed input: `text`
- `hybrid.hybrid` available input: `image`, `pdf`, `text`, `video`
- image-capable targets: `chatgpt/gpt-5.4`, `moonshot/kimi-k2.7-code`
- video-capable target: `moonshot/kimi-k2.7-code`
- available capabilities include `reasoning`, `structured.output`, `text.chat`,
  and `tools.function_calling`
- exact `chatgpt/gpt-5.4` runtime metadata reports context `1050000`, max output
  `128000`, and modalities `text`, `image`, `pdf`
- sanitized live discovery payload validates against the new JSON Schema and contains
  no `api-key`, `credentialRef`, or local Windows path strings

Live request-path enforcement:

- image input sent directly to `deepseek/deepseek-v4-flash` returned HTTP `400`
- stable error code: `no_eligible_target`
- excluded target reason: `missing_input.image`
- sanitized client-facing error body contains no `api-key`, `credentialRef`, or local
  Windows path strings

The verification runtime was stopped after probes; `127.0.0.1:3456` was confirmed
stopped.

## Pi Verification

Pi config inspected:

- `D:\pi\agent\models.json`
- provider: `role-model`
- configured base URL: `http://127.0.0.1:3456/v1`
- configured model: `hybrid.hybrid`

Captured evidence:

- `evidence/pi-probe/pi-role-model-discovery.json`

Pi's static config remains stale:

- input: `["text"]`
- contextWindow: `128000`
- maxTokens: `16384`
- reasoning: `false`

But using Pi's configured base URL, a downstream consumer can now discover:

- contextWindow: `262144`
- maxTokens: `128000`
- guaranteed input: `text`
- available input: `image`, `pdf`, `text`, `video`
- image targets: `chatgpt/gpt-5.4`, `moonshot/kimi-k2.7-code`
- video target: `moonshot/kimi-k2.7-code`
- reasoning supported: `true`
- reasoning effort control: `true`
- function tools: `true`

No Pi executable or built-in discovery command was present under `D:\pi\agent`; that
directory contains config/session data plus `rg.exe` and `fd.exe`. Verification used
Pi's configured provider URL as the downstream-consumer source of truth.

## Requirement Completion Status

- `R1`: `implemented`; GPT runtime IDs resolve through canonical OpenAI metadata.
- `R2`: `implemented`; shared resolver is used for runtime model records and discovery.
- `R3`: `implemented`; rich downstream OpenAI discovery contract added.
- `R3.1`: `implemented`; schema, fixtures, and generated protocol types added.
- `R3.2`: `implemented`; declared/routable layers exposed.
- `R3.3`: `implemented`; freshness hash and sanitization implemented and verified.
- `R4`: `implemented`; alias safe/max aggregate limits implemented.
- `R5`: `implemented`; guaranteed/available/conditional modalities implemented.
- `R6`: `implemented`; images/videos route only to capable targets.
- `R6.1`: `implemented`; stable `no_eligible_target` error path added.
- `R7`: `implemented`; tool and structured-output capability discovery/enforcement added.
- `R8`: `implemented`; reasoning capability discovery and request inference added.
- `R9`: `implemented`; caching advisory metadata exposed.
- `R10`: `implemented`; Pi mapping hints and Pi-configured probe added.
- `R11`: `implemented`; capability eligibility diagnostics added.
- `R12`: `implemented`; strict TDD, automated checks, updated runtime verification, and
  Pi verification recorded.
- `R13`: `implemented`; downstream alias capability resolution docs added.

## Residual Risks

- Pi still needs its own consumer-side update if it should automatically replace the
  stale static fields in `D:\pi\agent\models.json` with discovery values.
- The rich discovery contract sanitizes endpoint IDs, so those IDs are for downstream
  inspection and conditional support, not for exact endpoint override calls.
- Full package critical verification remains limited by the inherited 60000ms
  validator timeouts documented at baseline.

## Coverage Gate

- [x] Root causes from `01.5-root-cause.md` addressed directly
- [x] Strict RED before production implementation recorded
- [x] Focused GREEN tests pass
- [x] Schema and generated types pass
- [x] Updated runtime on Pi port verified
- [x] Pi-configured downstream discovery verified
- [x] Docs added and routing doc cross-linked

Coverage: PASS
