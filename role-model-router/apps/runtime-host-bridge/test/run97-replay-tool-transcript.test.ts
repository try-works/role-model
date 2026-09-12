import { expect, test } from "vitest";

import { buildReplayDispatchMessages } from "../src/track-b-runtime.js";

test("run97 replay dispatch preserves tool linkage from a durable capture", () => {
  const messages = buildReplayDispatchMessages([
    { role: "system", content: "system sentinel" },
    { role: "user", content: "run the tool" },
    {
      role: "assistant",
      content: null,
      toolCalls: [
        { id: "call-1", type: "function", function: { name: "bash", arguments: "{\"cmd\":\"node -e 1\"}" } },
      ],
    },
    { role: "tool", content: "41", toolCallId: "call-1", name: "bash" },
  ]);
  expect(messages[2]).toMatchObject({
    role: "assistant",
    tool_calls: [
      { id: "call-1", type: "function", function: { name: "bash", arguments: "{\"cmd\":\"node -e 1\"}" } },
    ],
  });
  expect(messages[3]).toMatchObject({ role: "tool", tool_call_id: "call-1", name: "bash" });
  // No re-execution and no synthesized tool result: recorded content is reused.
  expect(messages[3]?.content).toBe("41");
});

test("run97 replay dispatch accepts the provider wire shape unchanged", () => {
  const messages = buildReplayDispatchMessages([
    {
      role: "assistant",
      content: null,
      tool_calls: [{ id: "call-9", type: "function", function: { name: "read", arguments: "{}" } }],
    },
    { role: "tool", content: "ok", tool_call_id: "call-9" },
  ]);
  expect(messages[0]?.tool_calls).toEqual([
    { id: "call-9", type: "function", function: { name: "read", arguments: "{}" } },
  ]);
  expect(messages[1]?.tool_call_id).toBe("call-9");
});

test("run97 replay dispatch drops no tool-free message content", () => {
  const messages = buildReplayDispatchMessages([
    { role: "user", content: "plain" },
    { role: "assistant", content: "plain answer" },
  ]);
  expect(messages).toEqual([
    { role: "user", content: "plain" },
    { role: "assistant", content: "plain answer" },
  ]);
});
