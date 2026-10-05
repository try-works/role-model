import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

/**
 * Run 105 Phase 3.5 follow-up: the CLI's ladder materialization must be INDEPENDENT of the legacy
 * durable-evaluation authority secret.
 *
 * RED (before the reorder): the materialization call sat AFTER the two early returns
 * (`if (!runtime)` and `if (!authority)`), so a runtime without a resolvable legacy
 * consumer secret never materialized ladders - the exact coupling this task forbids.
 *
 * The order is structural: the materialization helper must appear BEFORE both early returns in the
 * `deriveLearnerCandidates` block, and it must call only the authenticated host operation
 * (`operations.materializeRouteLadders`) - never `runtime.invoke` or the authority secret - so
 * a missing legacy secret cannot suppress it.
 */
describe("run105 cli derive materialize independence", () => {
  test("materialization runs before the runtime/authority early returns and uses only the host op", () => {
    const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    const start = source.indexOf(
      "async deriveLearnerCandidates(input: Record<string, unknown> = {})",
    );
    const end = source.indexOf("async retroFinalizeEvaluations()", start);
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, end);

    const materializeAt = block.indexOf("materializeDerivedLadders");
    const runtimeGuardAt = block.indexOf(
      "if (!runtime) return { examined: 0, derived: 0, pending: 0 };",
    );
    const authorityGuardAt = block.indexOf(
      "if (!authority) return { examined: 0, derived: 0, pending: 0 };",
    );
    expect(materializeAt).toBeGreaterThan(-1);
    expect(runtimeGuardAt).toBeGreaterThan(-1);
    expect(authorityGuardAt).toBeGreaterThan(-1);
    // The helper (and its awaited call) must precede BOTH guards.
    expect(materializeAt).toBeLessThan(runtimeGuardAt);
    expect(materializeAt).toBeLessThan(authorityGuardAt);
    const awaitedCallAt = block.indexOf("await materializeDerivedLadders();");
    expect(awaitedCallAt).toBeGreaterThan(-1);
    expect(awaitedCallAt).toBeLessThan(runtimeGuardAt);
    expect(awaitedCallAt).toBeLessThan(authorityGuardAt);

    // The helper's body uses the authenticated host operation only.
    const helper = block.slice(
      materializeAt,
      block.indexOf("const runtime = extensionRuntimeRef.current;", materializeAt),
    );
    expect(helper).toContain("operations.materializeRouteLadders");
    expect(helper).toContain("configuredEndpointIds: endpoints()");
    expect(helper).toContain("defaults: defaultsSnapshot");
    expect(helper).not.toContain("runtime.invoke");
    expect(helper).not.toContain("authoritySecret");
    expect(helper).not.toContain("authority.authoritySecret");
  });
});
