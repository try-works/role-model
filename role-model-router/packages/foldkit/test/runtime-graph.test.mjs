/**
 * Run 115 S3d (R5) - maintained runtime graph test.
 *
 * The graph-closure suite proves the BUILT bytes carry no `node:*`/`@effect/platform-node`
 * specifier. This suite is the runtime counterpart: every built browser entry of the three
 * first-party wrappers is dynamically imported, so each bare `effect/<subpath>` it externalises
 * must resolve against the BUILT effect wrapper. Controller fix (S3d follow-up): the effect
 * wrapper's entry discovery now includes the platform/browser source root, so the 14 missing
 * `effect/dist/*` modules (Pipeable, PlatformError, http/HttpClientError, Runtime, Deferred,
 * Effectable) are published and load.
 *
 * Exactly ONE non-load is permitted: `@role-model-router/foldkit./test/vitest`, the Vitest plugin
 * entry, which is only importable inside the Vitest runner ("Vitest failed to access its internal
 * state" when imported by plain Node). Any other failure fails this test and names the wrapper and
 * subpath, so a future un-published `effect/<subpath>` cannot slip through again.
 *
 * Runnable both ways (node:test is honest for both):
 *   node --test test/runtime-graph.test.mjs
 *   node test/runtime-graph.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { probeRuntimeGraph } from "./runtime-graph-probe.mjs";

/** The one entry that is only valid inside the Vitest runner. */
const PERMITTED_NON_LOAD = "@role-model-router/foldkit./test/vitest";
const EXPECTED_ENTRIES = 85; // 18 effect-platform-browser + 37 foldkit + 30 foldkit-ui

test("every built browser entry resolves against the built effect wrapper", async () => {
  const probe = await probeRuntimeGraph();

  assert.equal(
    probe.total,
    EXPECTED_ENTRIES,
    `the three wrappers must publish ${EXPECTED_ENTRIES} built browser entries, saw ${probe.total}`,
  );

  const failures = probe.failures;
  const unexpected = failures.filter((failure) => !failure.startsWith(`${PERMITTED_NON_LOAD}:`));

  assert.deepEqual(
    unexpected,
    [],
    `every built browser entry must resolve; these imports failed (wrapper/subpath named): ` +
      JSON.stringify(unexpected, null, 2),
  );

  assert.equal(
    failures.length,
    1,
    `only the Vitest-runner entry may fail to load; actual failures: ${JSON.stringify(failures, null, 2)}`,
  );
  assert.match(
    failures[0],
    /Vitest failed to access its internal state/,
    `the permitted non-load must be the Vitest-runner entry: ${failures[0]}`,
  );

  assert.deepEqual(
    probe.emptyNamespaces,
    [],
    `every loaded entry must expose at least one export: ${JSON.stringify(probe.emptyNamespaces)}`,
  );

  assert.equal(
    probe.loaded,
    probe.total - failures.length,
    `loaded count must equal entries minus permitted non-loads: loaded=${probe.loaded} total=${probe.total}`,
  );
  assert.equal(probe.loaded, EXPECTED_ENTRIES - 1, "84 of 85 entries load; the Vitest plugin entry is runner-only");
});
