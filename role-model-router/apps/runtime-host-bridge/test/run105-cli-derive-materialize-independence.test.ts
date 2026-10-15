import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

/**
 * Run 105 Phase 3.5 follow-up, UPDATED 2026-10-15 after the queue-mode frozen-ladder fix: the CLI's ladder
 * materialization must be INDEPENDENT of the legacy durable-evaluation authority secret AND of the legacy
 * derive sweep entirely.
 *
 * Original RED: the materialization call sat AFTER the two early returns in `deriveLearnerCandidates`
 * (`if (!runtime)` and `if (!authority)`), so a runtime without a resolvable legacy consumer secret never
 * materialized ladders. The first fix reordered that block.
 *
 * Live supersession (024b1900): queue mode RETIRES `deriveLearnerCandidates`, and materialization was still
 * only reachable through it - so the ladder FROZE at version 23 while new groups finalized. The structural
 * contract is therefore now STRONGER than the original test: materialization is hoisted to the sweepOperations
 * scope as its own operation, and the auto-replay tick calls it in EVERY plane mode (evidence producer, like the
 * finalization-signals producer). This test pins that new structure:
 *  1. the helper is defined at the sweepOperations scope, not inside deriveLearnerCandidates;
 *  2. the sweepOperations object exposes it as materializeRouteLadders (overriding the spread op);
 *  3. the tick calls input.operations.materializeRouteLadders() unconditionally, in every plane mode;
 *  4. the helper body uses only the authenticated host op (operations.materializeRouteLadders) - never
 *     runtime.invoke, never an authority secret.
 */
describe("run105 cli derive materialize independence", () => {
  test("materialization is its own operation, called in every plane mode, using only the host op", () => {
    const cliSource = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");

    // 1. The helper is NOT inside deriveLearnerCandidates any more.
    const deriveStart = cliSource.indexOf(
      "async deriveLearnerCandidates(input: Record<string, unknown> = {})",
    );
    const deriveEnd = cliSource.indexOf("async retroFinalizeEvaluations()", deriveStart);
    expect(deriveStart).toBeGreaterThan(-1);
    const deriveBlock = cliSource.slice(deriveStart, deriveEnd);
    // The derive block itself must not reference the materialization helper: queue mode retires it and
    // materialization must survive that retirement.
    expect(deriveBlock).not.toContain("materializeDerivedLadders");

    // 2. The helper lives at the sweepOperations scope and the object exposes it as its own operation.
    const helperStart = cliSource.indexOf("const materializeDerivedLadders = async () => {");
    expect(helperStart).toBeGreaterThan(-1);
    const helperEnd = cliSource.indexOf("const sweepOperations = {", helperStart);
    expect(helperEnd).toBeGreaterThan(helperStart);
    const helper = cliSource.slice(helperStart, helperEnd);
    expect(helper).toContain("operations.materializeRouteLadders");
    expect(helper).toContain("configuredEndpointIds: endpoints()");
    expect(helper).toContain("defaults: defaultsSnapshot");
    expect(helper).not.toContain("runtime.invoke");
    expect(helper).not.toContain("authoritySecret");

    const sweepStart = cliSource.indexOf("const sweepOperations = {");
    const sweepEnd = cliSource.indexOf("async expireStaleReplayJobs", sweepStart);
    const sweepHead = cliSource.slice(sweepStart, sweepEnd);
    expect(sweepHead).toContain(
      "materializeRouteLadders: async (): Promise<unknown> => await materializeDerivedLadders(),",
    );
    // The override must come AFTER the ...operations spread, or the spread wins.
    expect(sweepHead.indexOf("...operations")).toBeLessThan(
      sweepHead.indexOf("materializeRouteLadders: async"),
    );

    // 3. The tick calls the operation in every plane mode (not gated on learnerQueueAuthoritative).
    const loopSource = readFileSync(
      new URL("../src/track-b-auto-replay-runtime.ts", import.meta.url),
      "utf8",
    );
    const callStart = loopSource.indexOf(
      'if (typeof input.operations.materializeRouteLadders === "function")',
    );
    expect(callStart).toBeGreaterThan(-1);
    const callEnd = loopSource.indexOf(
      "if (learnerQueueAuthoritative && input.operations.revalidateStrandedLearnerCandidates)",
      callStart,
    );
    expect(callEnd).toBeGreaterThan(callStart);
    const callBlock = loopSource.slice(callStart, callEnd);
    expect(callBlock).toContain("await input.operations.materializeRouteLadders();");
    // The learner-queue gate must come AFTER the materialization call, so queue mode does not retire it.
    expect(callBlock.indexOf("await input.operations.materializeRouteLadders();")).toBeLessThan(
      callBlock.length,
    );
  });
});
