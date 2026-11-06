# S310b — Backend owner extraction with expanded cli.ts scope: STOP characterization

Expanded scope: cli.ts createCliServerOptions (:4300-4937) + startBridgeServer invocation (:5640).

## New blocker

The 178-field literal (:4348-4937) has 161 bindBackendMethod wrappers (generatable) but 17 custom fields
(4349,4350,4352-4356,4364-4367,4398,4416,4497,4498,4505,4605) that capture cli-local state defined OUTSIDE the
expanded ranges: packagedProfile (:5508), staticRoot (:5550), rescoreLearningScoresRef (:5635, read at
the custom binding :5665), activeAutoReplayLoop (:4497). Moving the custom bindings into the DAG therefore
requires editing the createCliRuntime construction region that defines them — outside the allowed lines.

## Status

No product files changed (all three hashes unchanged, see s310b-tdd.json). Prior evidence stands: s21a 6/6 +
s21c 2/2 = 8/8 (s310-characterization.log), tsc exit 0 (s310-typecheck.log), S310 TS2739 type proof.

## Mechanical plan (next revision)

1. DAG typed factory for the 146 bindBackendMethod wrappers keyed by CliBackend keys.
2. Pass resolveBackend/readBootstrapState + the 17 custom bindings as a typed BackendOwnerInput from cli.
3. Thread packagedProfile/staticRoot/rescoreLearningScoresRef/activeAutoReplayLoop as explicit inputs (needs
   those lines in scope).
4. Wrap executeChatCompletions/executeResponses with ProviderPermits.withPermit in the DAG (defaults 4/16).
5. Identity (brand + seam) and no-fallback tests.
## LANDED (final)

- DAG composeBackendOwner builds the 157 bindBackendMethod wires + base/lifecycle + registry/catalog + readStartupReadiness and wraps executeChatCompletions/executeResponses with ProviderPermits.withPermit (defaults 4/16).
- cli createCliServerOptions passes base inputs + 7 entangled overrides, asserts the DAG brand and returns owner.options (identity seam onBackendOwner); legacy local construction is refused by assertComposedBackendOwner.
- RED s310-red2.log 2 failed -> GREEN 10/10 and affected 30/30 across 7 files; tsc exit 0.
- S21c Bootstrap seams kept (injection used by s21c test).
- Hashes: composition-dag 00FA383F..., cli 936B1C55..., index unchanged C27188C2..., test 95BDB7AA.... Lint disclosed in s310b-tdd.json; backups in E:/rm-tmp/s310b.
## S311 repair (LANDED)

- FIDELITY: restored getRoutableInventory (DAG base) and conditional anonymousLearningReads; ledger reconciled 181 = 157 generated + 13 base + 4 conditional + 7 overrides (missing/extra empty; evidence/other/s310b-field-ledger.json). Tests pin the restored fields, the conditional key presence, and Object.keys === 181.
- PERMIT BYPASS: withBackendProviderPermits wraps the backend object in index.ts createRuntimeBridgeBackend; the DAG options bind the wrapped backend, so the pairwise judge's raw input.backend.executeChatCompletions is bounded by the same DAG permits (4/16). Tests cover chat+responses concurrency and permit release after failure.
- TEST LINT: one asNever helper with SAFETY comment; residual line 54 no-known-value-widening on the double's return object is a typed-boundary rule artifact (satisfies FakeBackend above carries the real check).
- DAG LINT classification: 161 = 157 moved-literal verbatim casts + 2 boundary casts + 2 boundary unknown-returns; genuinely new helper/identity/wrapper findings fixed (typed unknown-return helpers, no object/typeof/dictionary params, named empty override instead of conditional empty spreads, mutable double-cast removed, SAFETY comments on wrapper casts).
- RED s310-red3.log 2 failed -> GREEN s310-green3.log 32/32 (7 files); tsc exit 0.
- Hashes: composition-dag 5D41E27C..., cli 3C6396FE..., index ED1BC875..., test B6FEA113....
