Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `05 Manual QA`
Addendum: `03`
Status: `LOCKED`
LockedAt: `2026-07-18T03:41:59Z`
LockHash: `24d7319771eb1697a8547d6ee750e97eff86b39ddc6a1a9c0e4b020c9f57f8f8`
Workflow version: `recursive-mode-audit-v2`
QA Execution Mode: `agent-operated`
Inputs:
- user request on `2026-07-18` to verify telemetry and every route formerly dependent on refactored data
- user request to run real alias and direct-model requests from Pi CLI
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/03-implementation-summary.md`
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/04-test-summary.md`
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/05-manual-qa.md`
Outputs:
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/05-manual-qa.telemetry-route-and-pi-routing.addendum-03.md`
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-addendum-03/`
Scope note: Extends locked Phase 5 with rebuilt-runtime telemetry compatibility, affected-route coverage, and real Pi CLI alias/direct-model routing proof without changing the locked original receipt.

## TODO

- [x] Audit every production route and telemetry consumer dependent on recent observations, candidate/profile reads, or hydrated catalog data
- [x] Verify the affected API and browser-route matrix against the rebuilt runtime
- [x] Generate real successful traffic and prove summary, ledger, detail, analytics, stream, and routing telemetry remain coherent
- [x] Run real Pi CLI requests through canonical aliases and direct model ids
- [x] Confirm selected endpoint/model/provider and routing diagnostics in persisted telemetry
- [x] Verify request-list/detail separation and runtime responsiveness after traffic
- [x] Stop the rebuilt runtime and remove isolated state
- [x] Lock the addendum and re-run strict lint plus lock verification

## Acceptance Matrix

- Telemetry summary, request ledger, request detail, analytics query, routing/candidate, model discovery, provider, Models, Benchmark, Dashboard, Observe Requests, Observe Routing, and request-detail surfaces must return/render without schema or hydration failures.
- New Pi traffic must appear in request ledger/detail and telemetry analytics with matching request ids and selected routing facts.
- Alias traffic must preserve alias resolution and select a routable concrete endpoint/model.
- Direct-model traffic must preserve the requested concrete model identity and select a compatible endpoint.
- No route may restore rich observation blobs to list/bootstrap paths or depend on a direct compact-catalog JSON import.
- Health must remain responsive during and after telemetry reads and Pi traffic.
- Credential values, OAuth tokens, and user state contents must not be written to evidence.

## Rebuilt Runtime Under Test

- Executable: `/role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA-256: `b4c1592881622abe69e3847e098638f2fdab34ae68d2cd5aee28fde6692c6fb8`
- Listener: `http://127.0.0.1:55725`
- Scope: `run77-phase5-addendum03`
- State: fresh disposable Windows temp root; the user database was not copied or mutated
- Credentials: environment presence was checked by variable name only; values were never printed or written to run evidence
- Live endpoints: disposable DeepSeek V4 Pro and Moonshot Kimi K3 accounts/endpoints using isolated credential references

## Static Dependency Audit

Evidence: `evidence/phase5-addendum-03-route-consumer-audit.txt`.

- Every registered runtime UI route was scanned for `fetchRuntimeSnapshot`, `fetchRuntimeRequests`, router candidates, telemetry contracts, and normalized catalog access.
- No production route imports or calls the retired rich snapshot/history bootstrap.
- Pi request inspection remains an explicit bounded consumer of `/api/role-model/requests` and individual request detail.
- Dashboard and Observe surfaces consume telemetry summary/request/analytics contracts; Providers uses the latest-id projection; Models and Benchmark use bounded candidate/profile contracts.
- Catalog file paths in production CLI entrypoints pass through the catalog package's canonical loader/hydrator; no route bypasses hydration with a direct compact-wire import.

## Real Pi CLI Routing Matrix

Pi version: `0.80.2`. The installed real Pi package discovered all configured Role-Model aliases plus `deepseek/deepseek-v4-pro` and `moonshot/kimi-k3` from the rebuilt runtime.

Final execution evidence: `evidence/phase5-addendum-03/pi-case-results.json` and the matching stdout/stderr logs.

| Case | Pi model | Result | Runtime receipt |
| --- | --- | --- | --- |
| Alias baseline | `baseline.remote-only` | PASS, `RUN77_ALIAS_BASELINE_OK`, exit `0`, `5724 ms` | request `req-0b7dec90-c660-472a-8884-c32c55322927`; selected DeepSeek endpoint/model; alias rewrite applied |
| Alias difficulty | `difficulty.remote-only` | PASS, `RUN77_ALIAS_DIFFICULTY_OK`, exit `0`, `5140 ms` | request `req-1bb4d521-6b2b-456a-991b-c583e1eea4e8`; easy/cost route to DeepSeek; alias rewrite applied |
| Direct DeepSeek | `deepseek/deepseek-v4-pro` | PASS, `RUN77_DIRECT_DEEPSEEK_OK`, exit `0`, `5279 ms` | request `req-e82c0358-f856-4769-8aec-26f9d8872127`; exact model preserved; rewrite not applied |
| Direct Kimi K3 | `moonshot/kimi-k3` | BLOCKED, exit `1` | request `req-9f44928d-4a14-4a18-ac1c-597d393d4ee8`; honest `400` failure telemetry |

The three successful Pi requests recorded provider `deepseek`, adapter `ai-sdk-openai-compatible`, the selected concrete endpoint/model, 200 status, normalized token counts, latency, cache state, pricing/cost fields, taxonomy fields, and request-detail/router-decision linkage.

### Configuration diagnostics retained

- A first isolated pass correctly failed closed with `503 Configure litellm_proxy.providers` because the copied routing policy did not contain executable remote providers.
- After adding real LiteLLM provider configuration, the installed native provider adapters rejected the newly advertised provider model names (`deepseek-v4-pro` and `k3`) even though direct DeepSeek `/v1/chat/completions` accepted `deepseek-v4-pro`.
- The final successful proof used the runtime's supported direct provider execution path with isolated local credential references; no production config was changed.
- Kimi live success is not claimed. A direct provider `/models` credential check returned `invalid_authentication_error`, and the final direct Pi request remained a coherent failure. The original Phase 5 deterministic K3 wire-mapping/stream proof remains valid, but a new valid Kimi credential is required for a live success receipt.

## Telemetry Compatibility Matrix

Evidence: `evidence/phase5-addendum-03/api-telemetry-route-receipt.json`.

- All 19 affected API contracts returned `200`: health, runtime summary, providers, accounts, endpoints, models, router summary/candidates, benchmark suite/summary/by-mode/runs, telemetry summary/rows/requests/query/stream, recent request list/latest ids, downstream OpenAI discovery, and `/v1/models`.
- Telemetry summary and analytics reconciled to `28` rows: `3` successes, `25` intentionally retained setup/provider failures, and `1337` successful tokens.
- Analytics scanned/matched/aggregated all `28` rows with `truncated: false`; totals matched the summary and included cost and latency.
- Telemetry SSE opened with `200 text/event-stream`.
- Each of the four final Pi cases resolved through recent summary -> full request detail -> router decision. The successful endpoint profile route also returned `200`.
- The recent-request response remained a compact projected list (`5387` bytes for the retained slice) while detail payloads remained explicit drill-ins, proving the projection/detail separation survived real traffic.

## Rendered Browser Route Matrix

Evidence: `evidence/phase5-addendum-03/browser-route-receipt.json`.

Fourteen affected operator routes rendered headings and data with no API failures, failed requests, or fatal route errors:

- Dashboard
- Models
- Models Benchmark
- Remote Providers
- Router overview
- Router Candidates
- Router Strategy
- Router Decisions and decision detail
- Observe Requests
- Observe Routing
- Observe request detail
- Downstream connection/discovery
- Runtime topology

Expected telemetry SSE cancellation during page navigation was classified as navigation cleanup and excluded from failure accounting; the standalone SSE contract check passed.

## Automated Regression Receipts

- Focused runtime UI regression: `4` files, `86/86` tests PASS (`runtime-api`, all-route startup guard, Models, Benchmark).
- `runtime:validate-observability`: PASS; routed request and mixed-alias telemetry list/detail/router-decision linkage all true.
- `runtime:validate-ui`: PASS; provider/account/endpoint, routed request, alias resolution, telemetry, and decision readback all true.
- The initial browser script intentionally failed on navigation-aborted SSE connections; the corrected classifier retained genuine API/network failures and the final `14/14` route matrix passed.

## Runtime Responsiveness And Cleanup

- Affected API responses in the parallel rebuilt-runtime matrix completed in `15.5-366 ms`; `/healthz` completed in `78 ms`.
- Browser routes rendered their data-bearing headings in roughly `0.99-1.12 seconds` including the fixed `900 ms` observation interval.
- Cleanup receipt: `evidence/phase5-addendum-03/cleanup-receipt.json`.
- Rebuilt runtime process absent, port `55725` closed, disposable QA root removed.

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `not performed; active collaboration policy prohibited delegation unless explicitly requested.`
Delegation Decision Basis: `Phase 5 required controller-owned credential hygiene, process ownership, real Pi execution, telemetry correlation, and cleanup.`
Delegation Override Reason: `No override; self-audit was mandatory under the active collaboration constraint.`
Audit Inputs Provided: rebuilt executable/hash, route-source audit, Pi logs, telemetry/API/browser receipts, validator output, and cleanup receipt.

## Gaps Found

- Kimi live success remains blocked by an invalid/expired available credential.
- The installed LiteLLM native mappings do not currently accept the newly advertised DeepSeek/Kimi provider wire model names; direct DeepSeek execution is healthy and supplied the required successful routing proof.

## Repair Work Performed

- No product change was required for the Run 77 refactor. The verification harness was corrected to provide executable remote configuration, use the supported direct-provider credential path, and distinguish expected SSE navigation cancellation from real route failure.

## Earlier Phase Reconciliation

- The new proof confirms the locked Run 77 projection, hydration, candidate, telemetry, stream, and routing conclusions.
- No locked phase artifact was edited; this addendum extends Phase 5 only.
- The Kimi credential/LiteLLM compatibility findings do not invalidate deterministic K3 provider mapping coverage and are not represented as successful live Kimi execution.

## Coverage Gate

- [x] Static consumer audit covers every registered route and direct catalog loader boundary
- [x] Nineteen affected APIs pass against the rebuilt runtime
- [x] Fourteen rendered operator routes pass against real telemetry
- [x] Two real aliases and direct DeepSeek pass through Pi CLI
- [x] Direct Kimi is exercised and its credential blocker is recorded honestly
- [x] Summary, ledger, detail, analytics, stream, profile, and router decision remain coherent
- [x] Focused tests and UI/observability validators pass
- [x] Isolated runtime state is removed

Coverage: PASS

## Approval Gate

- [x] Proof uses the rebuilt SEA executable and real Pi CLI, not only direct HTTP
- [x] No credential value or user database content appears in evidence
- [x] Setup/configuration failures are retained rather than overwritten or misclassified
- [x] Kimi success is not claimed without a valid credential
- [x] Cleanup and lock-chain verification are required before handoff

Approval: PASS

## Audit Verdict

Audit: PASS
