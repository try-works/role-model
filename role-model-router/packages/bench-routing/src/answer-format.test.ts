import { describe, expect, test } from "vitest";

import {
  augmentCaseMessages,
  extractFormattedAnswer,
  isValidDeliverable,
  resolveAnswerFormat,
} from "./answer-format.ts";

describe("answer-format", () => {
  test("uses system message and code fence format for implementation cases", () => {
    const caseItem = {
      case_id: "h01-implement-two-sum",
      category: "code-implementation",
      messages: [
        {
          role: "user",
          content: "Return only the corrected TypeScript in one fenced code block.",
        },
      ],
      grading_criteria: "Must define twoSum",
    };
    const messages = augmentCaseMessages(caseItem);
    expect(messages[0]?.role).toBe("system");
    expect(resolveAnswerFormat(caseItem).kind).toBe("code_fence");
  });

  test("extracts typescript fence deliverable and rejects placeholders", () => {
    const caseItem = {
      case_id: "h01-implement-two-sum",
      category: "code-implementation",
      messages: [{ role: "user", content: "code block only" }],
      grading_criteria: "twoSum",
    };
    const raw = [
      "thinking...",
      "```typescript",
      "function twoSum(nums: number[], target: number): [number, number] {",
      "  const map = new Map<number, number>();",
      "  for (let i = 0; i < nums.length; i++) {",
      "    const c = target - nums[i];",
      "    if (map.has(c)) return [map.get(c)!, i];",
      "    map.set(nums[i], i);",
      "  }",
      "  throw new Error('none');",
      "}",
      "```",
    ].join("\n");
    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: raw,
      structuredToolNames: [],
    });
    expect(extracted.extractionMethod).toBe("code_fence");
    expect(
      isValidDeliverable({ caseItem, extracted, structuredToolNames: [] }),
    ).toBe(true);
  });

  test("finds answer json from earlier turn when later turn is empty", () => {
    const caseItem = {
      case_id: "h04-tool-read-router",
      category: "tools-heavy",
      messages: [{ role: "user", content: "function name" }],
      required_tool_call: true,
      expected_tool_names: ["read_file"],
      answer_format: {
        kind: "tool_calls_with_answer" as const,
        instruction: "tools then answer",
        schema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string", minLength: 1 } },
        },
      },
      grading_criteria: "function name",
    };
    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: "",
      turnRawContents: [
        "reasoning only",
        '```json\n{"answer":"createRouter"}\n```',
        "more reasoning on final turn",
      ],
      structuredToolNames: ["read_file"],
      toolCalls: [
        {
          function: {
            name: "read_file",
            arguments: '{"path":"src/router.ts"}',
          },
        },
      ],
    });
    expect(extracted.serialized).toContain("createRouter");
    expect(
      isValidDeliverable({
        caseItem,
        extracted,
        structuredToolNames: ["read_file"],
      }),
    ).toBe(true);
  });

  test("merges api tools with answer json for tool+text cases", () => {
    const caseItem = {
      case_id: "h04-tool-read-router",
      category: "tools-heavy",
      messages: [{ role: "user", content: "name the first exported function" }],
      required_tool_call: true,
      expected_tool_names: ["read_file"],
      grading_criteria: "function name",
    };
    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: '```json\n{"answer":"routeRuntimeRequest"}\n```',
      structuredToolNames: ["read_file"],
      toolCalls: [
        {
          function: {
            name: "read_file",
            arguments: '{"path":"src/router.ts"}',
          },
        },
      ],
    });
    expect(extracted.serialized).toContain("routeRuntimeRequest");
    expect(extracted.serialized).toContain("read_file");
    expect(
      isValidDeliverable({
        caseItem,
        extracted,
        structuredToolNames: ["read_file"],
      }),
    ).toBe(true);
  });
});
