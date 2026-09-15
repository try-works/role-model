import { describe, expect, it } from "vitest";

import {
  CONTROLLER_MAX_TRANSCRIPT_BYTES,
  buildCompactControllerRoutingMessages,
  buildControllerRoutingMessages,
} from "../src/index.js";

/**
 * Run 99 R33 live finding (stage v145, operator report): the difficulty classifier overflowed first
 * (`CONTEXT_WINDOW_EXCEEDED` on `difficulty.remote-only`) and the controller prompt had exactly the
 * same shape — it serialized the whole transcript into its own prompt, so a multi-megabyte
 * coding-agent turn would overflow the controller next.
 */
describe("run99 R33 controller input bounds", () => {
  const input = (messages: readonly unknown[]) => ({
    requestedModel: "controller.hybrid",
    messages,
    toolCount: 0,
    candidateEndpointIds: ["endpoint:a", "endpoint:b"],
  });

  it("keeps a small transcript intact in both controller prompts", () => {
    const messages = [{ role: "user", content: "review the diff in src/parser.ts" }];
    for (const built of [
      buildControllerRoutingMessages(input(messages) as never),
      buildCompactControllerRoutingMessages(input(messages) as never),
    ]) {
      expect(built).toHaveLength(2);
      expect(built[1].content).toContain("review the diff in src/parser.ts");
    }
  });

  it("bounds a multi-megabyte transcript for both controller prompts", () => {
    const filler = "y".repeat(64 * 1024);
    const messages = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `turn-${index}:${filler}`,
    }));

    for (const built of [
      buildControllerRoutingMessages(input(messages) as never),
      buildCompactControllerRoutingMessages(input(messages) as never),
    ]) {
      const newest = built[built.length - 1];
      expect(Buffer.byteLength(newest.content)).toBeLessThanOrEqual(
        CONTROLLER_MAX_TRANSCRIPT_BYTES + 16 * 1024,
      );
      expect(newest.content).toContain("turn-39:");
      expect(newest.content).toMatch(/truncated|omitted/i);
    }
  });
});
