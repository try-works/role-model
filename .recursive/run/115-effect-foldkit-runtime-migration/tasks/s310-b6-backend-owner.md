# S310 — B6/R27 Backend owner extraction: STOP characterization (S21d-style)

Task-21 (rev 2). Model: deepseek-flash verified live. Allowed files: composition-dag.ts, composition region of
index.ts, test/**. No cli.ts, no other packages, no commit.

## Decision: STOP (blocker outside the allowed files)

The backend OPTIONS object is `StartBridgeServerOptions`, constructed by `createCliServerOptions` in
`src/cli.ts` (:4300; return type :4324), which binds 161 `StartBridgeServerOptions["..."]` callbacks
(:4338-4937) and is invoked at :5640 `startBridgeServer(createCliServerOptions(...))`. index.ts only has 2 such
bind sites (:10131/:10137 type re-exports). `createRuntimeBridgeBackend` (index.ts:20905) builds the
`RuntimeBridgeBackend` SERVICE (:3840-3867), not the options object; the DAG BackendContract is
`{id, artifactStore, eventLog}`. Making the DAG the construction site therefore requires editing cli.ts, which
this slice explicitly excludes.

## Type proof

A temporary `s310BackendOwnerProof(backend: BackendContract): StartBridgeServerOptions => backend` in index.ts,
typechecked with `tsc -p tsconfig.json --noEmit`, fails exactly as S21d predicted:
`TS2739: Type 'BackendContract' is missing ... host, port, registry, executeChatCompletions, executeResponses`
(`evidence/logs/s310-typeproof.log`). The temp proof was removed; index.ts is byte-identical
(`C27188C2...`), composition-dag.ts unchanged (`54E78CDD...`).

## What stayed / what moved

Nothing moved. `createRequestHandler` (index.ts:17437) still closes over `StartBridgeServerOptions`; start/stop
order is unchanged (listener -> createServer -> trace handlers -> listen -> close; shutdown server.close-only;
readiness is the route readback). The S21c seams (:4341-4346, consumed :20916) stay because their removal
condition is "backend returns its composition owners", independent of this blocked move.

## Counts

- s21a-composition-dag 6/6 + s21c-bootstrap-owner-wiring 2/2 = **8/8 passed** (`s310-characterization.log`).
- `tsc -p apps/runtime-host-bridge/tsconfig.json --noEmit` **exit 0** (`s310-typecheck.log`).
- No listener/server started; no operator ports.

## Remaining-owner table (updated)

Backend: **blocked** — options object construction is cli.ts. Server: blocked (needs backend bundle + lifecycle
owner). Refresh/Drain/Benchmark/Cli: blocked as tabulated in s21d. ProviderPermits: shape only, unconnected to
provider dispatch (identity cannot be established while options construction is cli-owned).

## Next mechanical step

Move `createCliServerOptions` (+ its CliBackend binding) into the DAG as a typed Backend owner input, with
cli.ts in the write scope; then identity/no-fallback and `ProviderPermits.withPermit` wiring around the real
`executeChatCompletions/executeResponses` path.
