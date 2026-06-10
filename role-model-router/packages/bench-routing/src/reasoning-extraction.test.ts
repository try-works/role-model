import { describe, expect, test } from "vitest";

import { extractFormattedAnswer, isValidDeliverable } from "./answer-format.ts";

describe("reasoning extraction", () => {
  test("h02 selects full counter program instead of mutex-only helper snippet", () => {
    const caseItem = {
      case_id: "h02-fix-async-counter",
      category: "code-implementation",
      messages: [{ role: "user", content: "Fix async race with mutex" }],
      grading_criteria: "Must fix race on shared count",
    };
    const turnRawContents = [
      [
        "We need a mutex.",
        "```typescript",
        "function createMutex() { let locked = false; return async () => { while (locked) await Promise.resolve(); locked = true; }; }",
        "```",
        "```typescript",
        "let count = 0;",
        "let chain = Promise.resolve();",
        "function withLock<T>(fn: () => Promise<T>): Promise<T> {",
        "  const run = chain.then(fn);",
        "  chain = run.catch(() => undefined);",
        "  return run;",
        "}",
        "async function increment() {",
        "  await withLock(async () => {",
        "    const current = count;",
        "    await Promise.resolve();",
        "    count = current + 1;",
        "  });",
        "}",
        "```",
      ].join("\n"),
    ];
    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: turnRawContents[0] ?? "",
      turnRawContents,
      structuredToolNames: [],
    });
    const code = String((extracted.payload as { code?: string })?.code ?? "");
    expect(code).toContain("withLock");
    expect(code).toContain("increment");
    expect(isValidDeliverable({ caseItem, extracted, structuredToolNames: [] })).toBe(true);
  });

  test("h07 selects TypeScript guard function instead of reasoning preamble", () => {
    const caseItem = {
      case_id: "h07-multi-turn-sla-guard",
      category: "code-implementation",
      messages: [
        { role: "user", content: "SLA hard deny on sole candidate" },
        { role: "assistant", content: "Throughput SLA hard-deny leaves zero candidates." },
        { role: "user", content: "Write guard function in typescript fence" },
      ],
      grading_criteria: "Guard references throughput SLA and sole candidate fallback",
    };
    const turnRawContents = [
      [
        "The user wants a TypeScript guard for sole-candidate throughput SLA hard deny fallback logic.",
        "```typescript",
        "export function guardSoleCandidateThroughputDeny(input: {",
        "  readonly candidates: readonly { id: string; hardDeniedBySla: boolean }[];",
        "  readonly throughputSlaHardDeny: boolean;",
        "}): boolean {",
        "  const allowListed = input.candidates.filter((c) => !c.hardDeniedBySla);",
        "  if (allowListed.length !== 1) return false;",
        "  if (!input.throughputSlaHardDeny) return false;",
        "  return true;",
        "}",
        "```",
      ].join("\n"),
    ];
    const extracted = extractFormattedAnswer({
      caseItem,
      rawContent: turnRawContents[0] ?? "",
      turnRawContents,
      structuredToolNames: [],
    });
    const code = String((extracted.payload as { code?: string })?.code ?? "");
    expect(code).toContain("guardSoleCandidateThroughputDeny");
    expect(code).not.toMatch(/^the user wants/i);
    expect(isValidDeliverable({ caseItem, extracted, structuredToolNames: [] })).toBe(true);
  });
});
