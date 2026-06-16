/**
 * Probe ask-mode difficulty rubric with user-only code/schema burden (R11).
 */
const CODE_OR_SCHEMA_RE = /\b(code|diff|patch|refactor|schema|contract|validation|test)\b/i;

function readText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "object" && part && "text" in part
          ? String((part as { text?: unknown }).text ?? "")
          : "",
      )
      .join("\n");
  }
  return "";
}

function combineMessages(
  messages: Array<{ role: string; content: unknown }>,
  roles?: string[],
): string {
  const selected = roles ? messages.filter((message) => roles.includes(message.role)) : messages;
  return selected.map((message) => readText(message.content)).join("\n");
}

function summarize(
  messages: Array<{ role: string; content: unknown }>,
  toolCount = 0,
): Record<string, unknown> {
  const combined = combineMessages(messages);
  const askModeBurdenSource = toolCount === 0 ? combineMessages(messages, ["user"]) : combined;
  const instructionConstraintCount = (
    askModeBurdenSource
      .toLowerCase()
      .match(
        /\b(must|should|need to|required|preserve|verify|strict|do not|don't|never|without|constraint|compatible)\b/g,
      ) ?? []
  ).length;
  const decompositionKeywordCount = (
    combined
      .toLowerCase()
      .match(
        /\b(analyze|compare|iterate|plan|step|decompose|refactor|workflow|multi-step|across)\b/g,
      ) ?? []
  ).length;
  const codeOrSchemaBurden = CODE_OR_SCHEMA_RE.test(askModeBurdenSource);
  let score = 0;
  const contextTokens = Math.ceil(combined.length / 4);
  if (contextTokens >= 2000) score += 3;
  else if (contextTokens >= 600) score += 1;
  if (toolCount >= 2) score += 3;
  else if (toolCount === 1) score += 1;
  if (messages.length >= 4) score += 2;
  else if (messages.length >= 2) score += 1;
  if (instructionConstraintCount >= 5) score += 2;
  else if (instructionConstraintCount >= 2) score += 1;
  if (decompositionKeywordCount >= 3) score += 2;
  else if (decompositionKeywordCount >= 1) score += 1;
  if (codeOrSchemaBurden) score += 2;
  const difficulty = score >= 7 ? "hard" : score >= 3 ? "medium" : "easy";
  return {
    difficulty,
    rubricSignals: {
      contextTokens,
      toolCount,
      historyTurnCount: messages.length,
      instructionConstraintCount,
      decompositionKeywordCount,
      codeOrSchemaBurden,
    },
    userOnlyPreview: askModeBurdenSource.slice(0, 120),
  };
}

const craftAssistant =
  "My name is Craft Agent. I help with schema validation and system contract tooling.";

for (const label of [
  "assistant+user hello (R11 expected easy)",
  "system+user hello",
  "user only hello",
]) {
  const messages = label.startsWith("assistant")
    ? [
        { role: "assistant", content: craftAssistant },
        { role: "user", content: "hello" },
      ]
    : label.startsWith("system")
      ? [
          { role: "system", content: craftAssistant },
          { role: "user", content: "hello" },
        ]
      : [{ role: "user", content: "hello" }];
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(summarize(messages), null, 2));
}
