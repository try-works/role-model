import { readFileSync } from "node:fs";
import { ScriptTarget, transpileModule } from "typescript";
import { describe, expect, test } from "vitest";
import { buildAutoReplayIdempotencyKey } from "../src/track-b-auto-replay.js";

describe("actual CLI replay-round forwarding", () => {
  test("the actual replay command key preserves explicit round across retries and separates completed rounds", () => {
    const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    const start = source.indexOf("idempotencyKey: buildAutoReplayIdempotencyKey({");
    const end = source.indexOf("\n            }),", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const expression = source.slice(
      start + "idempotencyKey: ".length,
      end + "\n            })".length,
    );
    const js = transpileModule(`return ${expression};`, {
      compilerOptions: { target: ScriptTarget.ES2022 },
    }).outputText;
    const evaluate = new Function(
      "buildAutoReplayIdempotencyKey",
      "capture",
      "policySet",
      "candidates",
      "resolveReplayProviderCallBudget",
      "dispatchRoundId",
      js,
    );
    const run = (round: string) =>
      evaluate(
        buildAutoReplayIdempotencyKey,
        { captureRef: "immutable-capsule" },
        { policySetDigest: "actual-policy" },
        ["endpoint:b"],
        () => 2,
        round,
      );
    expect(run("completed-round-a")).toBe(run("completed-round-a"));
    expect(run("completed-round-a")).not.toBe(run("completed-round-b"));
    const signature = source.slice(
      source.indexOf("executor: async ("),
      source.indexOf("executor: async (") + 160,
    );
    expect(signature).toContain("dispatchRoundId");
  });
});
