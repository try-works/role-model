/**
 * Run 101 / R1: the vendored effect-mq tree is consumed in place.
 *
 * effect-mq imports `effect` by name; because this workspace package declares
 * the vendored `effect` package as a workspace peer, those imports resolve to
 * the same runtime the rest of the repository bundles.
 */
export * from "../../../../vendor/effect-mq/packages/effect-mq/src/index.ts";
