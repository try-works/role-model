# S490 independent review — shared RuntimeHttpClient W1a

Date: 2026-10-29. Read-only review; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/http/runtime-client.ts` = `0D66D8044CD80055008EDAA86C0FAEACCC2B4E5F573B353D32961F40D9E61A96`, 3466 bytes (match).
- `src/commands.ts` = `9962E8BBC5B42EC257739563E8DA90179D7AC2D6C35B96EFD7BDAB7DEE8A7315`, 29771 bytes (match).
- `test/s458-local-policy.test.ts` = `8CC23A45C9CA298FF4DE06DC8AD27828928CC0855293632B08E64362DDC45046`, 8634 bytes (match).

## Verdict: bounded PASS

## Source verification

- `createRuntimeHttpClient` owns `baseUrl`, token (`token` or per-request `tokenProvider`), per-request `AbortSignal`, JSON decode, `RuntimeHttpError` with status/body, and injectable `fetchImpl` (`runtime-client.ts:10-95`).
- **Only** the localPolicy path migrated: `createLocalPolicyClient` calls `http.request` with `method:"PUT"`, `path: READBACK_PATHS.localPolicy`, body = payload, signal pass-through (`commands.ts:529-537`); `localPolicyCommands` is the only consumer (`:561-567`). No other client imports or uses the new module; all other clients untouched.
- Exact prior contract preserved: same URL path `READBACK_PATHS.localPolicy` (`runtime-endpoints.ts:28`), same `PUT`, same JSON body shape. Headers keep `accept` and `content-type`; `authorization` is added.
- Host target is source-verified to ignore/accept the header: `runtime-host-bridge/src/index.ts:20292-20298` handles `PUT /api/role-model/local/policy` with no auth gate, so the added bearer header cannot break the route.
- AbortSignal now reaches `fetch` via `Effect.tryPromise` callback (`commands.ts:545-549`), satisfying the W1a signal requirement.

## Verification executed

- RED: `s488-red.log` shows **1/9 failed** — pre-fix direct fetch headers lacked `authorization: Bearer shared-client-token`; genuine behavioral RED.
- GREEN: `s488-green.log` — **19/19 passed** across `test/s458-local-policy.test.ts` (9) + `test/s25d-request-parity.test.ts` (10). I re-ran the same two files: **19/19 passed**.
- UI `tsc --noEmit -p tsconfig.json`: **exit 0**.
- anti-slop effect:true: `src/commands.ts` **18 findings**, identical to the HEAD copy (18) — zero added-line findings; `src/http/runtime-client.ts` **0**, `test/s458-local-policy.test.ts` **0**, filesScanned 1 each.

## Non-blocking caveats

- The live probe for the added Authorization header is **not recorded in run evidence** (the handoff says the harness import failed). The header is nevertheless source-verified safe against the host route above; no live claim is made.
- The new test covers the success path only. `RuntimeHttpError`/non-JSON decode, `baseUrl` joining, signal-abort propagation and empty-body handling are untested, so the client is a bounded seam, not a fully proven one.
- `baseUrl + path` is naive concatenation; with the default `""` it is identical to today, but a future non-empty base URL ending in `/` would produce `//`.
- No whole Workspace/R33 claim; other clients and W1b/W1c remain untouched.

