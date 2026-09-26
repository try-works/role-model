/**
 * Run 101 / R1: the vendored Effect v4 tree is consumed in place.
 *
 * Every export is re-exported directly from `vendor/effect` so that every
 * importer - the host bridge, the queue runtime, the tests and the bundlers -
 * resolves the same module graph and exactly one Effect runtime is bundled.
 * Provenance and the integrity digest live in `vendor/effect/PROVENANCE.md`
 * and `vendor/effect/VENDORED.json`.
 */
export * from "../../../../vendor/effect/packages/effect/src/index.ts";
