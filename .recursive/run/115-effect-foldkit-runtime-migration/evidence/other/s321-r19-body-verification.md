# S321 R19 body verification of the 16 pre-existing entries

Read-only execution (s321). No product edits, commits, builds, installs, operator ports or processes. Commands: grep/read/git only; temp under E:/rm-tmp if used.

Inputs: `evidence/other/s4-contracts-inventory.json` (current, corrected at 17abd5a6), `evidence/other/s300-r19-inventory-correction.md`, `scripts/s4-contracts-inventory.test.mjs`.

Worktree/HEAD: public D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration @ 7f3d498c.

Machine check reference: `scripts/s4-contracts-inventory.test.mjs` enforces unique ids, kinds operation/resource/caller, dispositions in {pure, existing-effect, adapter, convert}, and definition file:line resolving to a non-blank line. It does **not** enforce a particular disposition per entry and has no bodyVerified field. Therefore the disposition corrections below need a JSON edit (author slice) but no machine-test source change.

| Entry | cited body | What the body actually does | Disposition | Verdict |
|---|---|---|---|---|
| `effect-root-wrapper` | effect/src/index.ts:10 | `export *` re-exports the vendored Effect tree in place; no logic. | adapter | CONFIRM |
| `foldkit-wrapper` | foldkit/package.json:7 | Workspace package exports map derived from vendored foldkit; adapter build surface. | adapter | CONFIRM |
| `foldkit-ui-wrapper` | foldkit-ui/package.json:7 | Workspace package exports map for vendored @foldkit/ui; adapter build surface. | adapter | CONFIRM |
| `protocol-route-decision` | protocol-routing/src/route-decision-boundary.ts:45 | `runRouteDecisionThroughProducer` builds `RouteDecisionProducer.use(...)` and runs it via `Effect.runSync(Effect.provide(...))` at :50. | existing-effect | CONFIRM |
| `core-advisory-rung` | core/src/route-advisory-ladder.ts:66 | Pure walk: Schema decode, sort, Set lookup, returns RungWalkOutcome; no Effect at :66-93. | existing-effect | **CORRECT -> pure** |
| `observability-scope` | run108-observability.ts:58 | Returns `{scopeId, registry: new Map()}`; no Effect in the factory. The Effect adoption is `inScope` at :66-67, not this entry. | existing-effect | **CORRECT -> pure** |
| `observability-snapshot` | run108-observability.ts:333 | `collectObservabilitySnapshot` calls `inScope(Metric.snapshot, scope)` and groups series; Effect boundary is inScope :336. | existing-effect | CONFIRM |
| `module-health-writer` | module-health-writer.ts:94 | Bounded in-memory writer plus `observe` Effect combinator at :191-204 using Effect.onExit/sync; factory owns Effect adapter. | existing-effect | CONFIRM |
| `diagnostics-read` | local-diagnostics-read.ts:198 | Pure validation/formatting of diagnostics source/query into LocalDiagnosticsReadResult; no Effect import. | pure | CONFIRM |
| `diagnostics-handler` | index.ts:17058 (inventory says 17098) | `handleLocalDiagnosticsRead`: auth via authorizeOperatorRequest, context validation, then `readLocalDiagnostics`; adapter. Citation drift: 17098 is inside the body. | adapter | CONFIRM disposition; **citation CORRECT** |
| `host-request-handler` | index.ts:17447 (inventory says 17488) | `createRequestHandler` builds the async HTTP dispatcher (health, gates, route dispatch); Promise handler, no Effect boundary. Citation 17488 is the health route branch. | convert | CONFIRM disposition; **citation CORRECT** |
| `host-bridge-server` | index.ts:20840 (inventory says 20537) | `startBridgeServer` composes listener/server/listen/close through the ServerOwner/transport; Node transport adapter. Citation 20537 is R20 comment text. | adapter | CONFIRM disposition; **citation CORRECT** |
| `host-chat-execution` | index.ts:30485 (inventory says 30214) | `async executeChatCompletions` performs provider execution through adapters; Promise boundary. Citation 30214 is inside controller selection, not the definition. | convert | CONFIRM disposition; **citation CORRECT** |
| `host-cli` | cli.ts:4930 (inventory says 5347) | `export async function main` is the large async orchestration entrypoint. Citation 5347 is a comment/outbox setup region. | convert | CONFIRM disposition; **citation CORRECT** |
| `traffic-class` | traffic-class.ts:34 | `toPersistedTrafficClass` uses `Match.value`/`Match.exhaustive`; `Match` is an Effect package helper but no Effect execution/fiber. | existing-effect | **CORRECT -> pure** |
| `unified-runtime-config` | unified-runtime-config.ts:2016 | `parseUnifiedRuntimeConfigText` parses YAML, validates/normalizes; Schema.decodeUnknownResult at :1722 is pure decode. No Effect runtime. | existing-effect | **CORRECT -> pure** |

## Counts

- Entries body-verified: **16/16**.
- Dispositions confirmed: **12**.
- Dispositions corrected: **4** — `core-advisory-rung`, `observability-scope`, `traffic-class`, `unified-runtime-config` (all `existing-effect` -> `pure`).
- Citations corrected (definition line drift to a comment/body line): **5** — `diagnostics-handler` 17098->17058, `host-request-handler` 17488->17447, `host-bridge-server` 20537->20840, `host-chat-execution` 30214->30485, `host-cli` 5347->4930.
- Not-read: **0** entries; all 16 bodies were read.

## JSON-correction author slice (named)

**R19 inventory JSON-correction author slice**: update four dispositions to `pure`, correct five definition citations, refresh the affected reasons, and re-run `node --test scripts/s4-contracts-inventory.test.mjs`. No machine-test change is required; the test permits all four dispositions. This analyst slice makes no JSON edit.

## Not read

None of the 16. Peripheral: package `exports` bodies beyond the cited first entries were not exhaustive; `run108-observability` metric helper bodies outside the cited ranges were not read; host route bodies beyond the five cited definitions were not read.
