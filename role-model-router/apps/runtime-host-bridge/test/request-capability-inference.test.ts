import { describe, expect, test } from "vitest";

import {
  inferChatCompletionsCapabilityRequirements,
  inferResponsesCapabilityRequirements,
} from "../src/request-capability-inference.js";

describe("request capability inference", () => {
  test("infers image input and function tools consistently across chat completions and responses", () => {
    const chat = inferChatCompletionsCapabilityRequirements({
      model: "hybrid.hybrid",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image." },
            { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "lookup",
            parameters: { type: "object", additionalProperties: false },
          },
        },
      ],
    } as never);

    const responses = inferResponsesCapabilityRequirements({
      model: "hybrid.hybrid",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Describe this image." },
            { type: "input_image", image_url: "data:image/png;base64,abc" },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          name: "lookup",
          parameters: { type: "object", additionalProperties: false },
        },
      ],
    } as never);

    expect(chat.requiredInputModalities).toEqual(["image", "text"]);
    expect(responses.requiredInputModalities).toEqual(["image", "text"]);
    expect(chat.requiredCapabilities).toContain("tools.function_calling");
    expect(responses.requiredCapabilities).toContain("tools.function_calling");
  });

  test("infers structured output and reasoning controls as hard requirements", () => {
    const requirements = inferChatCompletionsCapabilityRequirements({
      model: "hybrid.hybrid",
      messages: [{ role: "user", content: "Return JSON." }],
      response_format: {
        type: "json_schema",
        json_schema: {
          strict: true,
          schema: { type: "object", additionalProperties: false },
        },
      },
      reasoning_effort: "high",
    } as never);

    expect(requirements.requiredCapabilities).toEqual(
      expect.arrayContaining(["structured.output", "reasoning.effort_control"]),
    );
  });
});
