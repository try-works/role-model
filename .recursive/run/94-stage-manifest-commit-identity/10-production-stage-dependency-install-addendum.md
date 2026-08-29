# Addendum 10 — production Stage-checkout dependency installation

## Trigger

The `v0.0.13` production build reached the immutable accepted-Stage checkout
gate successfully, then failed while building the private Track-B runtime.
The checked-out Stage source tree did not have public workspace dependencies
installed, so the private bundler could not resolve public packages such as
`@role-model-router/sqlite-memory`, `trace`, and `profile-aggregator`.

## Requirement

Production packaging must retain the exact accepted Stage public source for
Track-B provenance **and** install its dependencies before the private runtime
builder consumes that source tree.  It must not substitute the production-main
checkout or weaken the accepted Stage commit/tree assertions.

## TDD plan

1. Add a workflow contract test that requires a production-only dependency
   install in `.cache/paired-public`.
2. Run the test and record the expected RED failure against the pre-fix
   workflow.
3. Add the minimal production-only `corepack pnpm install --frozen-lockfile`
   step after the Node/pnpm toolchain is ready and before Track-B bundling.
4. Run the workflow contract suite (GREEN), formatting/static checks, and
   diff hygiene.
5. Promote through dev and Stage, build a fresh Stage RC, checksum it and
   verify its manifest has the accepted public commit/tree plus all 13 Track-B
   extensions.
6. After explicit Stage acceptance, promote to main and publish a new stable
   tag (not the already-failed `v0.0.13`), verifying all platform production
   builds and release artifacts.

## Verification boundary

The failure is in release packaging rather than request handling.  Release
verification therefore proves exact Stage source binding, dependency
resolution, Track-B distribution construction, and 13-extension manifest
integrity.  Runtime UAT remains attached to the freshly built Stage RC before
any stable promotion.
