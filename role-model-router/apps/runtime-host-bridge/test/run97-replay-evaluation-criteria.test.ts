import { expect, test } from "vitest";

import {
  deriveAutomaticReplayCriteria,
  deriveSemanticEvaluationCriteria,
  extractTaskInstructionText,
  extractSourceOutputText,
} from "../src/track-b-replay-evaluation-criteria.js";

test("run97 derives schema-valid semantic criteria from the recorded source output", () => {
  const derived = deriveSemanticEvaluationCriteria({
    sourceOutput:
      "Router replay keeps the shared prefix and appends a counterfactual branch for evaluation.",
  });
  expect(derived).not.toBeNull();
  expect(derived?.criteria.schemaVersion).toBe("role-model.semantic-criteria.v1");
  expect(derived?.criteria.requiredTerms.length).toBeGreaterThan(0);
  expect(derived?.criteria.requiredTerms.length).toBeLessThanOrEqual(3);
  expect(new Set(derived?.criteria.requiredTerms).size).toBe(
    derived?.criteria.requiredTerms.length,
  );
  for (const term of derived?.criteria.requiredTerms ?? []) {
    expect(term).toBe(term.toLowerCase());
    expect(term.length).toBeGreaterThanOrEqual(4);
  }
  expect(derived?.criteria.minOutputChars).toBe(1);
});

test("run97 criteria derivation is deterministic and ignores stopwords and punctuation", () => {
  const first = deriveSemanticEvaluationCriteria({
    sourceOutput: "The counterfactual branch, the branch! Evaluation evaluates both.",
  });
  const second = deriveSemanticEvaluationCriteria({
    sourceOutput: "The counterfactual branch, the branch! Evaluation evaluates both.",
  });
  expect(first?.criteria).toEqual(second?.criteria);
  expect(first?.criteria.requiredTerms).toEqual(["counterfactual", "branch", "evaluation"]);
});

test("run97 criteria derivation declines unusable output instead of inventing terms", () => {
  expect(deriveSemanticEvaluationCriteria({ sourceOutput: "   " })).toBeNull();
  expect(deriveSemanticEvaluationCriteria({ sourceOutput: "a b c d e" })).toBeNull();
  expect(deriveSemanticEvaluationCriteria({ sourceOutput: "!!! ??? ---" })).toBeNull();
});

test("run97 short but substantive outputs still yield a bounded criterion", () => {
  const derived = deriveSemanticEvaluationCriteria({ sourceOutput: "OK" });
  expect(derived?.criteria.requiredTerms).toEqual(["ok"]);
  const stopwordOnly = deriveSemanticEvaluationCriteria({ sourceOutput: "yes no" });
  expect(stopwordOnly).toBeNull();
});

test("run97 extracts recorded output text from response content, outputText, or messages", () => {
  expect(extractSourceOutputText({ response: { content: "router replay works" } })).toBe(
    "router replay works",
  );
  expect(extractSourceOutputText({ outputText: "legacy output text" })).toBe("legacy output text");
  expect(
    extractSourceOutputText({
      messages: [
        { role: "user", content: "please reply" },
        { role: "assistant", content: "router replay works" },
      ],
    }),
  ).toBe("router replay works");
  expect(
    extractSourceOutputText({
      messages: [
        { role: "user", content: "please reply" },
        { role: "assistant", content: [{ type: "text", text: "part based replay works" }] },
      ],
    }),
  ).toBe("part based replay works");
  expect(
    extractSourceOutputText({ messages: [{ role: "user", content: "only a question" }] }),
  ).toBe("only a question");
  // The operations boundary may return a bounded response excerpt instead of inline
  // message content; automatic replay must accept it.
  expect(extractSourceOutputText({ responseText: "bounded replay excerpt" })).toBe(
    "bounded replay excerpt",
  );
  expect(extractSourceOutputText({})).toBeNull();
});

test("run97 falls back to the recorded prompt when the assistant output is empty", () => {
  // Some captures persist an empty assistant message because the provider streamed the
  // answer into its execution artifact. The recorded request text is still branch-shared
  // evidence, so criteria derive from it instead of deferring the capture forever.
  expect(
    extractSourceOutputText({
      response: { role: "assistant", content: "" },
      messages: [
        { role: "system", content: "You are a coding assistant." },
        { role: "user", content: "Summarize the role-model router replay and evaluation loop." },
      ],
    }),
  ).toBe("Summarize the role-model router replay and evaluation loop.");
});

test("run97 derives automatic criteria from the task literal, never from the graded source output", () => {
  // The recorded source output is the text the source trial is graded on. Deriving
  // required terms from it makes the source satisfy its own criterion by
  // construction, so a counterfactual can never win and the learner never sees a
  // candidate comparison. The task instruction is branch-shared evidence.
  const derived = deriveAutomaticReplayCriteria({
    taskText: "Write the report, then reply with exactly ZQ97-MARKER-DONE.",
    sourceOutput: "sourceonlyword report complete with no marker at all",
  });
  expect(derived).not.toBeNull();
  expect(derived?.evidenceSource).toBe("task_literal");
  // "done" is a declared stopword, so the bounded literal keeps the two content terms.
  expect(derived?.criteria.requiredTerms).toEqual(["zq97", "marker"]);
  expect(derived?.criteria.requiredTerms).not.toContain("sourceonlyword");
  expect(derived?.criteria.schemaVersion).toBe("role-model.semantic-criteria.v1");
  expect(derived?.derivation).toContain("task literal");
});

test("run97 extracts a quoted task literal without an exactly phrase", () => {
  const derived = deriveAutomaticReplayCriteria({
    taskText: "Include `SHA-ABC123` in the final answer.",
    sourceOutput: null,
  });
  expect(derived?.evidenceSource).toBe("task_literal");
  expect(derived?.criteria.requiredTerms).toEqual(["sha", "abc123"]);
});

test("run97 extracts an unquoted marker named by the task wording", () => {
  const derived = deriveAutomaticReplayCriteria({
    taskText: "Reply with the single token run97-canary-015 and nothing else.",
    sourceOutput: "run97-canary-015",
  });
  expect(derived?.evidenceSource).toBe("task_literal");
  expect(derived?.criteria.requiredTerms).toEqual(["run97", "canary", "015"]);
});

test("run97 falls back to bounded task text when the instruction names no literal", () => {
  const derived = deriveAutomaticReplayCriteria({
    taskText: "Audit the export pipeline and summarize the findings.",
    sourceOutput: "sourceonlytoken repeated twice",
  });
  expect(derived?.evidenceSource).toBe("task_text");
  expect(derived?.criteria.requiredTerms).toEqual(["audit", "export", "pipeline"]);
  expect(derived?.criteria.requiredTerms).not.toContain("sourceonlytoken");
});

test("run97 keeps the recorded-output derivation only when no task evidence exists", () => {
  const derived = deriveAutomaticReplayCriteria({
    taskText: "yes no",
    sourceOutput: "counterfactual branch evaluation",
  });
  expect(derived?.evidenceSource).toBe("recorded_output");
  expect(derived?.criteria.requiredTerms).toEqual([
    "counterfactual",
    "branch",
    "evaluation",
  ]);
  expect(
    deriveAutomaticReplayCriteria({ taskText: "yes no", sourceOutput: "   " }),
  ).toBeNull();
});

test("run97 reads the task instruction from the last user message only", () => {
  expect(
    extractTaskInstructionText({
      messages: [
        { role: "system", content: "You are a coding assistant." },
        { role: "user", content: "first request" },
        { role: "assistant", content: "assistant answer" },
        { role: "user", content: "second request" },
        { role: "assistant", content: "final answer" },
      ],
    }),
  ).toBe("second request");
  expect(
    extractTaskInstructionText({ messages: [{ role: "assistant", content: "only an answer" }] }),
  ).toBeNull();
  expect(extractTaskInstructionText({ promptText: "inline request" })).toBe("inline request");
  expect(extractTaskInstructionText({})).toBeNull();
});
