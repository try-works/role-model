import { describe, expect, test } from "vitest";

import {
  augmentCaseMessages,
  buildScaffoldFollowUp,
  extractFormattedAnswer,
  isValidDeliverable,
  resolveAnswerFormat,
  shouldOmitToolsForTurn,
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
    const deliverable = [
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
    const raw = deliverable;
    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: raw,
      structuredToolNames: [],
    });
    expect(extracted.extractionMethod).toBe("code_fence");
    expect(extracted.serialized).toBe(
      [
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
      ].join("\n"),
    );
    expect(isValidDeliverable({ caseItem, extracted, structuredToolNames: [] })).toBe(true);
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

  test("extracts json fences even when a json string contains nested markdown fences", () => {
    const caseItem = {
      case_id: "t03-tools-agent-plan",
      category: "tools-heavy",
      messages: [
        {
          role: "user",
          content: "Return a JSON answer with a diff snippet embedded in the answer text.",
        },
      ],
      grading_criteria: "structured json answer",
    };
    const raw = [
      "```json",
      '{"answer":"Patch summary:\\n```diff\\n--- a/src/router.ts\\n+++ b/src/router.ts\\n@@ -1 +1 @@\\n-old\\n+new\\n```"}',
      "```",
      'TOOL_CALL name=apply_patch args={"diff":"--- a/src/router.ts\\n+++ b/src/router.ts"}',
    ].join("\n");
    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: raw,
      structuredToolNames: [],
    });
    expect(extracted.extractionMethod).toBe("json_fence");
    expect(extracted.serialized).toContain("Patch summary:");
    expect(extracted.serialized).toContain("--- a/src/router.ts");
  });

  test("uses schema-derived follow-up keys for structured tool summaries", () => {
    const caseItem = {
      case_id: "t03-tools-agent-plan",
      category: "tools-heavy",
      messages: [{ role: "user", content: "read, validate, patch, then summarize" }],
      required_tool_call: true,
      expected_tool_names: ["read_file", "validate_schema", "apply_patch"],
      answer_format: {
        kind: "tool_calls_with_summary" as const,
        instruction:
          'Step 1: emit the required API tool calls. Step 2: after tools, output ONLY a ```json fence: {"plan":["..."],"patch_summary":"...","strategy_improvements":["..."]}.',
        schema: {
          type: "object",
          required: ["plan", "patch_summary", "strategy_improvements"],
          properties: {
            plan: { type: "array", items: { type: "string" }, minItems: 3 },
            patch_summary: { type: "string", minLength: 12 },
            strategy_improvements: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
            },
          },
          additionalProperties: false,
        },
      },
      grading_criteria: "emit tools and structured summary",
    };

    const toolCalls = [
      {
        function: {
          name: "read_file",
          arguments: '{"path":"router.ts"}',
        },
      },
      {
        function: {
          name: "validate_schema",
          arguments: '{"document":"{}"}',
        },
      },
      {
        function: {
          name: "apply_patch",
          arguments:
            '{"diff":"*** Begin Patch\\n*** Update File: router.ts\\n@@\\n+const x = 1;\\n*** End Patch"}',
        },
      },
    ] as const;

    const followUp = buildScaffoldFollowUp(
      caseItem,
      caseItem.messages as Record<string, unknown>[],
      "",
      ["read_file", "validate_schema", "apply_patch"],
      extractFormattedAnswer({
        caseItem,
        rawContent: "",
        structuredToolNames: ["read_file", "validate_schema", "apply_patch"],
        toolCalls,
      }),
      toolCalls,
      toolCalls,
    );

    const finalPrompt = String(followUp.at(-1)?.content ?? "");
    expect(finalPrompt).toContain('"strategy_improvements"');
    expect(finalPrompt).not.toContain("test_snippet");
  });

  test("rejects structured tool summaries that miss schema minItems and minLength constraints", () => {
    const caseItem = {
      case_id: "t03-tools-agent-plan",
      category: "tools-heavy",
      messages: [{ role: "user", content: "summarize the tool workflow" }],
      required_tool_call: true,
      expected_tool_names: ["read_file", "validate_schema", "apply_patch"],
      answer_format: {
        kind: "tool_calls_with_summary" as const,
        instruction:
          'Step 1: emit the required API tool calls. Step 2: after tools, output ONLY a ```json fence: {"plan":["..."],"patch_summary":"...","strategy_improvements":["..."]}.',
        schema: {
          type: "object",
          required: ["plan", "patch_summary", "strategy_improvements"],
          properties: {
            plan: { type: "array", items: { type: "string" }, minItems: 3 },
            patch_summary: { type: "string", minLength: 12 },
            strategy_improvements: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
            },
          },
          additionalProperties: false,
        },
      },
      grading_criteria: "emit tools and structured summary",
    };

    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent:
        '```json\n{"plan":["inspect router"],"patch_summary":"short fix","strategy_improvements":["prefer local first"]}\n```',
      structuredToolNames: ["read_file", "validate_schema", "apply_patch"],
      toolCalls: [
        {
          function: {
            name: "read_file",
            arguments: '{"path":"router.ts"}',
          },
        },
        {
          function: {
            name: "validate_schema",
            arguments: '{"document":"{}"}',
          },
        },
        {
          function: {
            name: "apply_patch",
            arguments:
              '{"diff":"*** Begin Patch\\n*** Update File: router.ts\\n@@\\n+const x = 1;\\n*** End Patch"}',
          },
        },
      ],
    });

    expect(
      isValidDeliverable({
        caseItem,
        extracted,
        structuredToolNames: ["read_file", "validate_schema", "apply_patch"],
      }),
    ).toBe(false);
  });

  test("continues requesting repeated same-name tools until duplicate expectations are satisfied", () => {
    const caseItem = {
      case_id: "p18-tools-agent",
      category: "tools-heavy",
      messages: [{ role: "user", content: "compare latency profiles" }],
      required_tool_call: true,
      expected_tool_names: ["list_endpoints", "get_metrics", "get_metrics"],
      answer_format: {
        kind: "tool_calls_with_answer" as const,
        instruction: "tools then answer",
        schema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string", minLength: 1 } },
        },
      },
      grading_criteria: "compare routing strategies",
    };

    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: "",
      structuredToolNames: ["list_endpoints", "get_metrics"],
      toolCalls: [
        { function: { name: "list_endpoints", arguments: "{}" } },
        {
          function: {
            name: "get_metrics",
            arguments: '{"endpoint_id":"local.lfm2.5-8b-a1b"}',
          },
        },
      ],
    });

    expect(
      shouldOmitToolsForTurn(
        caseItem,
        ["list_endpoints", "get_metrics"],
        [
          { function: { name: "list_endpoints", arguments: "{}" } },
          {
            function: {
              name: "get_metrics",
              arguments: '{"endpoint_id":"local.lfm2.5-8b-a1b"}',
            },
          },
        ],
      ),
    ).toBe(false);

    const followUp = buildScaffoldFollowUp(
      caseItem,
      caseItem.messages as Record<string, unknown>[],
      "",
      ["list_endpoints", "get_metrics"],
      extracted,
      [
        {
          function: {
            name: "get_metrics",
            arguments: '{"endpoint_id":"local.lfm2.5-8b-a1b"}',
          },
        },
      ],
      [
        { function: { name: "list_endpoints", arguments: "{}" } },
        {
          function: {
            name: "get_metrics",
            arguments: '{"endpoint_id":"local.lfm2.5-8b-a1b"}',
          },
        },
      ],
    );

    expect(followUp.at(-1)).toMatchObject({
      role: "user",
      content: "Emit exactly one API tool call now (no prose): get_metrics",
    });
  });

  test("preserves original tool call ids in scaffold follow-up history", () => {
    const caseItem = {
      case_id: "p17-tools-multi-hard",
      category: "tools-heavy",
      messages: [{ role: "user", content: "read then patch then answer" }],
      required_tool_call: true,
      expected_tool_names: ["read_file", "apply_patch"],
      answer_format: {
        kind: "tool_calls_with_answer" as const,
        instruction: "tools then answer",
        schema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string", minLength: 1 } },
        },
      },
      grading_criteria: "emit both tools and answer",
    };

    const followUp = buildScaffoldFollowUp(
      caseItem,
      caseItem.messages as Record<string, unknown>[],
      "",
      ["read_file"],
      extractFormattedAnswer({
        caseItem,
        rawContent: "",
        structuredToolNames: ["read_file"],
        toolCalls: [
          {
            id: "tool_kimi_123",
            function: {
              name: "read_file",
              arguments: '{"path":"src/router.ts"}',
            },
          },
        ],
      }),
      [
        {
          id: "tool_kimi_123",
          function: {
            name: "read_file",
            arguments: '{"path":"src/router.ts"}',
          },
        },
      ],
      [
        {
          id: "tool_kimi_123",
          function: {
            name: "read_file",
            arguments: '{"path":"src/router.ts"}',
          },
        },
      ],
    );

    expect(followUp[1]).toMatchObject({
      role: "assistant",
      tool_calls: [
        {
          id: "tool_kimi_123",
          function: {
            name: "read_file",
            arguments: '{"path":"src/router.ts"}',
          },
        },
      ],
    });
    expect(followUp[2]).toMatchObject({
      role: "tool",
      tool_call_id: "tool_kimi_123",
    });
  });
});
