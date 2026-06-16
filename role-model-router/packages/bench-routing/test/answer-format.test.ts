import { describe, expect, test } from "vitest";
import { type AnswerFormatCaseRef, buildScaffoldFollowUp } from "../src/answer-format.js";

type TestToolCall = { function: { name: string; arguments: string } };

function makeCase(overrides: Partial<AnswerFormatCaseRef>): AnswerFormatCaseRef {
  return {
    case_id: "test-case",
    category: "tools-heavy",
    messages: [{ role: "user", content: "Do the workflow." }],
    expected_tool_names: [],
    answer_format: { kind: "tool_calls_with_answer", instruction: 'Output {"answer":"..."}' },
    ...overrides,
  };
}

describe("buildScaffoldFollowUp", () => {
  test("emits role:tool messages for completed tool calls when tools remain missing", () => {
    const caseItem = makeCase({
      expected_tool_names: ["read_file", "apply_patch"],
    });
    const answerFormat = caseItem.answer_format;
    if (!answerFormat) {
      throw new Error("Expected answer format for scaffold follow-up test case.");
    }

    const toolCalls: TestToolCall[] = [
      { function: { name: "read_file", arguments: '{"path":"src/router.ts"}' } },
    ];

    const result = buildScaffoldFollowUp(
      caseItem,
      [{ role: "user", content: "Workflow: read_file and apply_patch" }],
      "",
      ["read_file"],
      {
        format: answerFormat,
        payload: null,
        serialized: "",
        extractionMethod: "missing",
      },
      toolCalls,
    );

    // Should contain one role:"tool" message for the completed read_file
    const toolMsgs = result.filter((m) => m.role === "tool");
    expect(toolMsgs.length).toBe(1);
    expect(toolMsgs[0].tool_call_id).toBe("bench_scaffold_0");
    expect(toolMsgs[0].content).toBeTruthy();

    // Should contain a prompt for the next missing tool
    const userMsgs = result.filter((m) => m.role === "user");
    expect(userMsgs.some((m) => String(m.content).includes("apply_patch"))).toBe(true);
  });

  test("emits role:tool messages for ALL completed tools then prompts for answer", () => {
    const caseItem = makeCase({
      expected_tool_names: ["read_file", "apply_patch"],
    });
    const answerFormat = caseItem.answer_format;
    if (!answerFormat) {
      throw new Error("Expected answer format for scaffold follow-up test case.");
    }

    const toolCalls: TestToolCall[] = [
      { function: { name: "read_file", arguments: "{}" } },
      { function: { name: "apply_patch", arguments: "{}" } },
    ];

    const result = buildScaffoldFollowUp(
      caseItem,
      [{ role: "user", content: "Workflow" }],
      "",
      ["read_file", "apply_patch"],
      {
        format: answerFormat,
        payload: null,
        serialized: "",
        extractionMethod: "missing",
      },
      toolCalls,
    );

    // Two tool messages
    const toolMsgs = result.filter((m) => m.role === "tool");
    expect(toolMsgs.length).toBe(2);
    expect(toolMsgs[0].tool_call_id).toBe("bench_scaffold_0");
    expect(toolMsgs[1].tool_call_id).toBe("bench_scaffold_1");

    // Last message should be user prompt for answer, not another tool prompt
    const lastMsg = result[result.length - 1];
    expect(lastMsg.role).toBe("user");
    expect(String(lastMsg.content)).not.toContain("Emit exactly one API tool call");
    expect(String(lastMsg.content)).toContain("Tools received");
  });

  test("handles cases with no expected_tool_names (no tool messages)", () => {
    const caseItem = makeCase({ expected_tool_names: [] });

    const result = buildScaffoldFollowUp(
      caseItem,
      [{ role: "user", content: "Write code" }],
      "some code output",
      [],
      {
        format: { kind: "code_fence", instruction: "", language: "typescript" },
        payload: null,
        serialized: "",
        extractionMethod: "missing",
      },
      [],
    );

    // No tool messages
    expect(result.filter((m) => m.role === "tool").length).toBe(0);
    // Assistant message present
    expect(result.some((m) => m.role === "assistant")).toBe(true);
    // User prompt present
    expect(
      result.some((m) => m.role === "user" && String(m.content).includes("Reply with ONLY")),
    ).toBe(true);
  });

  test("generates unique tool_call_ids when multiple calls present", () => {
    const caseItem = makeCase({
      expected_tool_names: ["read_file", "grep_search", "apply_patch"],
    });
    const answerFormat = caseItem.answer_format;
    expect(answerFormat).toBeDefined();
    if (!answerFormat) {
      throw new Error("Expected answer_format to be defined for scaffold follow-up tests.");
    }

    const toolCalls: TestToolCall[] = [
      { function: { name: "read_file", arguments: "{}" } },
      { function: { name: "grep_search", arguments: "{}" } },
      { function: { name: "apply_patch", arguments: "{}" } },
    ];

    const result = buildScaffoldFollowUp(
      caseItem,
      [{ role: "user", content: "Workflow" }],
      "",
      ["read_file", "grep_search", "apply_patch"],
      {
        format: answerFormat,
        payload: null,
        serialized: "",
        extractionMethod: "missing",
      },
      toolCalls,
    );

    const toolMsgs = result.filter((m) => m.role === "tool");
    const ids = toolMsgs.map((m) => m.tool_call_id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual(["bench_scaffold_0", "bench_scaffold_1", "bench_scaffold_2"]);
  });
});
