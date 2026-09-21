/**
 * Run 99 verification helper: fire real requests through the running runtime so the UI pages have
 * live telemetry, replay, evaluation and learning data to render.
 *
 *   node scripts/run99-real-traffic.mjs <baseUrl> <model> [count]
 */

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3457";
const model = process.argv[3] ?? "baseline.decision-only";

const prompts = [
  { kind: "plain", messages: [{ role: "user", content: "Reply with the single word: ready" }] },
  {
    kind: "plain",
    messages: [
      {
        role: "user",
        content: "Summarise the difference between a router and a gateway in one sentence.",
      },
    ],
  },
  {
    kind: "code-review",
    messages: [
      {
        role: "user",
        content:
          "Review this snippet and name one bug in a single line: `for (let i = 0; i <= arr.length; i++) console.log(arr[i]);`",
      },
    ],
  },
  {
    kind: "planner",
    messages: [
      {
        role: "user",
        content: "List exactly three steps to add a health check endpoint to a Node service.",
      },
    ],
  },
  {
    kind: "tool-call",
    messages: [
      { role: "user", content: "What time is it? Use the get_time tool if it is available." },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_time",
          description: "Return the current time",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
    ],
    tool_choice: "auto",
  },
];

const results = [];
for (const [index, prompt] of prompts.entries()) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 96, ...prompt }),
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep the raw text below */
    }
    results.push({
      index,
      kind: prompt.kind,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      routedModel: parsed?.model ?? null,
      usage: parsed?.usage ?? null,
      toolCalls: Array.isArray(parsed?.choices?.[0]?.message?.tool_calls)
        ? parsed.choices[0].message.tool_calls.length
        : 0,
      preview:
        typeof parsed?.choices?.[0]?.message?.content === "string"
          ? parsed.choices[0].message.content.slice(0, 80)
          : text.slice(0, 120),
    });
  } catch (error) {
    results.push({
      index,
      kind: prompt.kind,
      status: 0,
      latencyMs: Date.now() - startedAt,
      error: String(error?.message ?? error),
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
}

console.log(JSON.stringify(results, null, 1));
