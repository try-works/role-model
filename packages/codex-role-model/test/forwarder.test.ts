import { mkdtemp } from "node:fs/promises";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  createCodexSseNormalizeState,
  formatWebSearchFallbackAssistantText,
  handleResponsesProxy,
  normalizeCodexResponsesSseEvent,
  sanitizeSearchSnippetForFallback,
  startForwarder,
} from "../src/forwarder.js";
import { injectRoleModelIntentIntoResponsesPayload } from "../src/responses-intent.js";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("web_search mixed client tools gate", () => {
  test("detects non-web_search client tools alongside web_search", async () => {
    const { outputHasNonWebSearchClientTools } = await import("../src/forwarder.js");
    const reverseMap = new Map();
    expect(
      outputHasNonWebSearchClientTools(
        {
          output: [
            {
              type: "function_call",
              name: "update_plan",
              call_id: "c0",
              arguments: "{}",
            },
            {
              type: "function_call",
              name: "web_search",
              call_id: "c1",
              arguments: '{"query":"SNDK"}',
            },
          ],
        },
        reverseMap,
      ),
    ).toBe(true);
    expect(
      outputHasNonWebSearchClientTools(
        {
          output: [
            {
              type: "function_call",
              name: "web_search",
              call_id: "c1",
              arguments: '{"query":"SNDK"}',
            },
          ],
        },
        reverseMap,
      ),
    ).toBe(false);
  });

  test("mixed update_plan+web_search fulfills search in-place via alpha/search (not Codex client)", async () => {
    let upstreamHops = 0;
    let alphaSearches = 0;
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        const href = String(url);
        if (href.includes("/alpha/search")) {
          alphaSearches += 1;
          return jsonResponse({
            output:
              "Singapore weather is partly cloudy with highs near 34C according to weather.gov.sg. Node.js 22.x is the current Active LTS per nodejs.org.",
          });
        }
        // Enrichment may call DuckDuckGo/Tavily — do not count those as model hops.
        if (!href.includes("upstream.test")) {
          return new Response("<html><body>no results</body></html>", { status: 200 });
        }
        upstreamHops += 1;
        const body = JSON.parse(String(init?.body ?? "{}")) as { input?: unknown[] };
        // Must not upstream-continue (that unpaired update_plan → 400).
        const hasToolOutput = Array.isArray(body.input)
          ? body.input.some(
              (item) =>
                typeof item === "object" &&
                item !== null &&
                (item as { type?: string }).type === "function_call_output",
            )
          : false;
        expect(hasToolOutput).toBe(false);
        return jsonResponse({
          id: "resp_mixed_1",
          status: "incomplete",
          incomplete_details: { reason: "tool_calls" },
          output: [
            {
              type: "function_call",
              name: "update_plan",
              call_id: "call_plan_1",
              arguments: '{"explanation":"phase A","plan":[]}',
            },
            {
              type: "function_call",
              name: "web_search",
              call_id: "call_ws_1",
              arguments: '{"query":"Singapore weather"}',
            },
            {
              type: "function_call",
              name: "web_search",
              call_id: "call_ws_2",
              arguments: '{"query":"Node.js LTS version"}',
            },
          ],
        });
      },
    });
    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer chatgpt-token",
          "chatgpt-account-id": "acct-1",
        },
        body: JSON.stringify({
          model: "baseline.remote-only",
          stream: true,
          input: [
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "facts please" }],
            },
          ],
          tools: [
            { type: "web_search" },
            {
              type: "function",
              name: "update_plan",
              parameters: { type: "object" },
            },
          ],
        }),
      });
      expect(response.status).toBe(200);
      expect(upstreamHops).toBe(1);
      expect(alphaSearches).toBe(2);
      const text = await response.text();
      expect(text).toContain("response.completed");
      expect(text).toContain("update_plan");
      expect(text).toContain("Search evidence:");
      expect(text).toContain("weather.gov.sg");
      // Must not hand Codex a client/native web_search_call (quota path).
      expect(text).not.toContain("web_search_call");
      expect(text).not.toContain("could not synthesize");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe("web_search fallback formatting", () => {
  test("near-duplicate detector collapses temporal / rephrase variants", async () => {
    const { normalizeWebSearchQuery, webSearchQueriesNearDuplicate } = await import(
      "../src/forwarder.js"
    );
    expect(
      webSearchQueriesNearDuplicate(
        "Alpha Beta current status today",
        "Alpha Beta status August 2026",
      ),
    ).toBe(true);
    expect(
      webSearchQueriesNearDuplicate("Project Orion release notes", "Unrelated Topic Zeta weather"),
    ).toBe(false);
    // Temporal chrome alone should not create a distinct normalize key subject.
    expect(normalizeWebSearchQuery("Alpha Beta today")).toBe(
      normalizeWebSearchQuery("Alpha Beta August 2026"),
    );
  });

  test("strips [wordlim] chrome and never returns raw SERP as fallback text", () => {
    const raw = [
      "Example Corp (XYZ) Second Quarter Fiscal 2020",
      "[wordlim: 200] Published: 6.0 years ago; Crawled: 5.6 years ago",
      "Results for the quarter ended June 30, 2020.",
    ].join("\n");
    expect(sanitizeSearchSnippetForFallback(raw)).not.toContain("[wordlim:");
    const text = formatWebSearchFallbackAssistantText([
      { query: "Example Corp status", source: "chatgpt", output: raw },
    ]);
    expect(text).toContain("could not synthesize");
    expect(text).not.toContain("[wordlim:");
    expect(text).toContain("Example Corp status");
  });
});

describe("Responses forwarder", () => {
  test("remaps native picker slugs to role-model ids before upstream", async () => {
    let upstreamBody = "";
    let upstreamUrl = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const aliasPath = join(stateDir, "native-aliases.json");
    const { writeNativeAliases } = await import("../src/native-alias.js");
    writeNativeAliases(aliasPath, { "gpt-5.6-sol": "baseline.remote-only" });
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeAliasesPath: aliasPath,
      fetchImpl: async (url, init) => {
        upstreamUrl = String(url);
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({ id: "resp_1" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6-sol",
        input: "Implement a regression test for the adapter.",
      }),
    });
    expect(response.status).toBe(200);
    const parsed = JSON.parse(upstreamBody) as Record<string, unknown>;
    expect(parsed.model).toBe("baseline.remote-only");
    expect(parsed.role_model).toBeTruthy();
    expect(upstreamUrl).toBe("http://upstream.test/v1/responses");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("proxies native GPT models to ChatGPT Codex backend", async () => {
    let upstreamUrl = "";
    let sawAuth = false;
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        upstreamUrl = String(url);
        const headers = init?.headers as Record<string, string>;
        sawAuth = Boolean(headers?.authorization);
        return jsonResponse({ id: "resp_native" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer chatgpt-token",
        "chatgpt-account-id": "acct_1",
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: "hello native",
      }),
    });
    expect(response.status).toBe(200);
    expect(upstreamUrl).toBe("https://chatgpt.com/backend-api/codex/responses");
    expect(sawAuth).toBe(true);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("injects intent before proxying POST /v1/responses", async () => {
    let upstreamBody = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async (url, init) => {
        expect(String(url)).toBe("http://upstream.test/v1/responses");
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({ id: "resp_1" }, 200, { "content-type": "text/event-stream" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "baseline.remote-only",
        input: "Implement a regression test for the adapter.",
      }),
    });
    expect(response.status).toBe(200);
    expect(JSON.parse(upstreamBody).role_model).toBeTruthy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("flattens Codex hosted tools but preserves input and reasoning passthrough", async () => {
    let upstreamBody = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async (_url, init) => {
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({ id: "resp_1" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const tools = [
      { type: "function", name: "shell_command", parameters: { type: "object", properties: {} } },
      { type: "namespace", name: "mcp__codex_apps__github" },
      { type: "web_search" },
    ];
    const input = [
      { type: "reasoning", summary: [{ type: "summary_text", text: "plan" }] },
      { type: "message", role: "developer", content: [{ type: "input_text", text: "sys" }] },
      { type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] },
    ];
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "baseline.remote-only",
        input,
        tools,
        reasoning: { effort: "none" },
      }),
    });
    expect(response.status).toBe(200);
    const parsed = JSON.parse(upstreamBody) as Record<string, unknown>;
    expect(parsed.role_model).toBeTruthy();
    const forwardedTools = parsed.tools as Array<{ type: string; name?: string }>;
    expect(forwardedTools.every((t) => t.type === "function")).toBe(true);
    expect(forwardedTools.map((t) => t.name).filter(Boolean)).toEqual(
      expect.arrayContaining(["shell_command", "web_search"]),
    );
    expect(forwardedTools.some((t) => t.type === "web_search")).toBe(false);
    expect(parsed.reasoning).toEqual({ effort: "none" });
    // Input is normalized for role-model chat conversion: drop reasoning,
    // developer→system, input_text→text. No behavioral coaching injection.
    expect(parsed.input).toEqual([
      {
        type: "message",
        role: "system",
        content: [{ type: "text", text: "sys" }],
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "text", text: "hi" }],
      },
    ]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("fulfills web_search via ChatGPT alpha/search and continues the model turn", async () => {
    let call = 0;
    const urls: string[] = [];
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        call += 1;
        const href = String(url);
        urls.push(href);
        if (href.includes("/alpha/search")) {
          return jsonResponse({
            output: "NET last traded near $81 (ChatGPT search).",
            results: [
              { type: "text_result", ref_id: "turn0search0", title: "NET", snippet: "$81" },
            ],
          });
        }
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          stream?: boolean;
          input?: unknown[];
          tools?: Array<{ type?: string; name?: string }>;
        };
        if (call === 1) {
          expect(body.stream).toBe(false);
          expect(body.tools?.some((t) => t.type === "function" && t.name === "web_search")).toBe(
            true,
          );
          return jsonResponse({
            id: "resp_ws_1",
            status: "incomplete",
            incomplete_details: { reason: "tool_calls" },
            output: [
              {
                type: "function_call",
                name: "web_search",
                call_id: "call_ws_1",
                arguments: '{"query":"Cloudflare NET share price"}',
              },
            ],
          });
        }
        // Model keeps asking for search — adapter must still not emit web_search_call.
        return jsonResponse({
          id: "resp_ws_2",
          status: "incomplete",
          incomplete_details: { reason: "tool_calls" },
          output: [
            {
              type: "function_call",
              name: "web_search",
              call_id: "call_ws_2",
              arguments: '{"query":"NET after hours"}',
            },
          ],
        });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer chatgpt-token",
        "chatgpt-account-id": "acct-1",
      },
      body: JSON.stringify({
        model: "baseline.remote-only",
        stream: true,
        input: [
          { type: "message", role: "user", content: [{ type: "input_text", text: "price?" }] },
        ],
        tools: [
          { type: "web_search" },
          {
            type: "function",
            name: "shell_command",
            parameters: { type: "object", properties: { command: { type: "string" } } },
          },
        ],
      }),
    });
    expect(response.status).toBe(200);
    expect(urls.some((u) => u.includes("/alpha/search"))).toBe(true);
    const text = await response.text();
    expect(text).toContain("response.completed");
    // Exhausted continues must not dump raw SERP; structured fallback or synthesize ok.
    expect(text).not.toContain("[wordlim:");
    expect(text).not.toContain("web_search_call");
    expect(text.includes("could not synthesize") || text.includes("NET last traded near $81")).toBe(
      true,
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("exhausted web_search continues never dump raw [wordlim] SERP as the answer", async () => {
    const wordlimSerp = [
      "Cloudflare, Inc (NET) Second Quarter Fiscal 2020",
      "[wordlim: 200] Published: 6.0 years ago",
      "Results for the quarter ended June 30, 2020.",
    ].join("\n");
    let alphaSearches = 0;
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        const href = String(url);
        if (href.includes("/alpha/search")) {
          alphaSearches += 1;
          return jsonResponse({ output: wordlimSerp });
        }
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          tools?: Array<{ type?: string; name?: string }>;
          tool_choice?: unknown;
        };
        const hasWebSearch = body.tools?.some(
          (t) => t.type === "web_search" || (t.type === "function" && t.name === "web_search"),
        );
        if (hasWebSearch === false || body.tool_choice === "none") {
          return jsonResponse({
            id: "resp_synth",
            status: "completed",
            output: [
              {
                type: "message",
                role: "assistant",
                status: "completed",
                content: [
                  {
                    type: "output_text",
                    text: "NET quote not found in search results; refuse to invent a price.",
                  },
                ],
              },
            ],
          });
        }
        return jsonResponse({
          id: "resp_loop",
          status: "incomplete",
          incomplete_details: { reason: "tool_calls" },
          output: [
            {
              type: "function_call",
              name: "web_search",
              call_id: `call_ws_${alphaSearches + 1}`,
              arguments: '{"query":"Cloudflare NET share price"}',
            },
          ],
        });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer chatgpt-token",
      },
      body: JSON.stringify({
        model: "baseline.remote-only",
        stream: false,
        input: [
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "NET price?" }],
          },
        ],
        tools: [{ type: "web_search" }],
      }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text =
      body.output
        ?.flatMap((o) => o.content ?? [])
        .map((c) => c.text ?? "")
        .join("\n") ?? "";
    expect(text).not.toContain("[wordlim:");
    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toMatch(/Published: 6\.0 years ago/);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("exhausted search budget keeps shell tools; never disables all tools", async () => {
    let alphaSearches = 0;
    let responsesHops = 0;
    let sawToolsWithoutWebSearch = false;
    let midHopKeptWebSearchWithShell = false;
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        const href = String(url);
        if (href.includes("/alpha/search")) {
          alphaSearches += 1;
          return jsonResponse({
            output: "Example City weather is partly cloudy, high 30C. Source: example-weather.",
          });
        }
        responsesHops += 1;
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          tools?: Array<{ type?: string; name?: string }>;
          tool_choice?: unknown;
        };
        const toolNames = (body.tools ?? [])
          .map((t) => (t.type === "function" ? t.name : t.type) ?? "")
          .filter(Boolean);
        const hasWebSearch = toolNames.includes("web_search");
        const hasShell = toolNames.includes("shell_command");
        if (hasWebSearch && hasShell && responsesHops >= 2 && responsesHops <= 4) {
          midHopKeptWebSearchWithShell = true;
        }
        if (!hasWebSearch && hasShell && body.tool_choice !== "none") {
          sawToolsWithoutWebSearch = true;
          return jsonResponse({
            id: "resp_shell",
            status: "incomplete",
            incomplete_details: { reason: "tool_calls" },
            output: [
              {
                type: "function_call",
                name: "shell_command",
                call_id: "call_shell_1",
                arguments: JSON.stringify({
                  command: 'New-Item -ItemType Directory -Force -Path "ops-lab"',
                }),
              },
            ],
          });
        }
        if (body.tool_choice === "none" || (body.tools && body.tools.length === 0)) {
          return jsonResponse({
            id: "resp_bad_synth",
            status: "completed",
            output: [
              {
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text: "I cannot fully complete this task because tools are disabled for this hop.",
                  },
                ],
              },
            ],
          });
        }
        return jsonResponse({
          id: `resp_${responsesHops}`,
          status: "incomplete",
          incomplete_details: { reason: "tool_calls" },
          output: [
            {
              type: "function_call",
              name: "web_search",
              call_id: `call_ws_${responsesHops}`,
              arguments: JSON.stringify({
                query: `Singapore weather forecast ${responsesHops}`,
              }),
            },
            {
              type: "function_call",
              name: "web_search",
              call_id: `call_ws_b_${responsesHops}`,
              arguments: JSON.stringify({
                query: `GitHub status incidents ${responsesHops}`,
              }),
            },
          ],
        });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer chatgpt-token",
      },
      body: JSON.stringify({
        model: "baseline.remote-only",
        stream: false,
        input: [
          {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Gather live facts then create local files with shell.",
              },
            ],
          },
        ],
        tools: [
          { type: "web_search" },
          {
            type: "function",
            name: "shell_command",
            parameters: { type: "object", properties: { command: { type: "string" } } },
          },
        ],
      }),
    });
    expect(response.status).toBe(200);
    expect(alphaSearches).toBeGreaterThanOrEqual(2);
    // Mid-loop continues must keep web_search available for distinct follow-ups.
    expect(midHopKeptWebSearchWithShell).toBe(true);
    // Only after max continues may web_search be stripped; shell must remain.
    expect(sawToolsWithoutWebSearch).toBe(true);
    const body = (await response.json()) as {
      output?: Array<{ type?: string; name?: string }>;
    };
    const text = JSON.stringify(body);
    expect(text).not.toContain("tools are disabled for this hop");
    expect(body.output?.some((o) => o.type === "function_call" && o.name === "shell_command")).toBe(
      true,
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("duplicate web_search queries are not re-fetched via alpha/search", async () => {
    let alphaSearches = 0;
    let responsesHops = 0;
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        const href = String(url);
        if (href.includes("/alpha/search")) {
          alphaSearches += 1;
          return jsonResponse({ output: "SNDK last near $1350." });
        }
        responsesHops += 1;
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          tools?: Array<{ type?: string; name?: string }>;
          tool_choice?: unknown;
        };
        if (body.tool_choice === "none" || body.tools?.every((t) => t.name !== "web_search")) {
          return jsonResponse({
            id: "resp_done",
            status: "completed",
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: "SNDK last near $1350." }],
              },
            ],
          });
        }
        // Always request the same query — adapter must dedupe after first fetch.
        return jsonResponse({
          id: `resp_${responsesHops}`,
          status: "incomplete",
          incomplete_details: { reason: "tool_calls" },
          output: [
            {
              type: "function_call",
              name: "web_search",
              call_id: `call_dup_${responsesHops}`,
              arguments: '{"query":"SNDK stock price today"}',
            },
          ],
        });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer chatgpt-token",
      },
      body: JSON.stringify({
        model: "baseline.remote-only",
        stream: false,
        input: [
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "SNDK?" }],
          },
        ],
        tools: [{ type: "web_search" }],
      }),
    });
    expect(response.status).toBe(200);
    expect(alphaSearches).toBe(1);
    const body = (await response.json()) as {
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text = JSON.stringify(body);
    expect(text).toContain("1350");
    expect(text).not.toContain("[wordlim:");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("alpha/search relays to ChatGPT Codex backend with caller auth", async () => {
    let upstreamUrl = "";
    let upstreamAuth = "";
    let upstreamBody = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        upstreamUrl = String(url);
        const headers = init?.headers as Record<string, string> | undefined;
        upstreamAuth = headers?.authorization ?? "";
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({
          output: "NET last traded near $81 (ChatGPT search).",
          encrypted_output: "cipher",
        });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/alpha/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer chatgpt-token",
        "chatgpt-account-id": "acct-1",
      },
      body: JSON.stringify({
        id: "search-session",
        model: "baseline.remote-only",
        commands: { search_query: [{ q: "Cloudflare NET stock price" }] },
      }),
    });
    expect(response.status).toBe(200);
    expect(upstreamUrl).toBe("https://chatgpt.com/backend-api/codex/alpha/search");
    expect(upstreamAuth).toBe("Bearer chatgpt-token");
    const relayed = JSON.parse(upstreamBody) as {
      id?: string;
      model?: string;
      commands?: unknown;
    };
    expect(relayed.id).toBe("search-session");
    expect(relayed.model).toBe("gpt-5.4");
    expect(relayed.commands).toEqual({ search_query: [{ q: "Cloudflare NET stock price" }] });
    const body = (await response.json()) as { output?: string };
    expect(body.output).toContain("ChatGPT search");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("alpha/search falls back to DuckDuckGo when ChatGPT auth is missing", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async (url) => {
        const href = String(url);
        expect(href).toContain("duckduckgo.com");
        return new Response(
          `<html><body>
            <a class="result__a" href="https://duckduckgo.com/l/?uddg=${encodeURIComponent("https://finance.example/NET")}">Cloudflare Inc (NET) Stock Price</a>
            <a class="result__snippet">NET last traded near $81 on the NYSE.</a>
          </body></html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/alpha/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "baseline.remote-only",
        commands: { search_query: [{ q: "Cloudflare NET stock price" }] },
      }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      output?: string;
      warning?: string;
      results?: Array<{ title?: string }>;
    };
    expect(body.warning).toMatch(/ChatGPT Authorization/i);
    expect(body.output).toContain("Cloudflare Inc (NET) Stock Price");
    expect(body.results?.[0]?.title).toContain("Cloudflare");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("synthesizes output_item.added before orphan text deltas and always completes", async () => {
    const { finalizeCodexResponsesSse } = await import("../src/forwarder.js");
    const state = createCodexSseNormalizeState();
    const events = [
      'data: {"type":"response.created","response":{"id":"resp_2"}}',
      'data: {"type":"response.output_text.delta","item_id":"msg_orphan","output_index":0,"delta":"Hi"}',
    ];
    const out: string[] = [];
    for (const line of events) {
      out.push(...normalizeCodexResponsesSseEvent(line, state));
    }
    expect(out.some((line) => line.includes('"type":"response.output_item.added"'))).toBe(true);
    out.push(...finalizeCodexResponsesSse(state));
    expect(out.some((line) => line.includes('"type":"response.completed"'))).toBe(true);
  });

  test("converts custom_tool_call history to function_call pairs for upstream", async () => {
    const { normalizeCodexInputForRoleModel } = await import("../src/forwarder.js");
    const patch = "*** Begin Patch\n*** Add File: x.ts\n+hi\n*** End Patch";
    const normalized = normalizeCodexInputForRoleModel({
      model: "baseline.remote-only",
      input: [
        { type: "message", role: "user", content: [{ type: "input_text", text: "edit" }] },
        {
          type: "custom_tool_call",
          call_id: "call_p1",
          name: "apply_patch",
          input: patch,
        },
        {
          type: "custom_tool_call_output",
          call_id: "call_p1",
          output: "Success",
        },
      ],
    }) as { input: Array<Record<string, unknown>> };
    expect(normalized.input.map((item) => item.type)).toEqual([
      "message",
      "function_call",
      "function_call_output",
    ]);
    expect(normalized.input[1]).toMatchObject({
      type: "function_call",
      name: "apply_patch",
      call_id: "call_p1",
      arguments: JSON.stringify({ input: patch }),
    });
    expect(normalized.input[2]).toMatchObject({
      type: "function_call_output",
      call_id: "call_p1",
      output: "Success",
    });
  });

  test("repairs misordered tool call input before forwarding upstream", async () => {
    let upstreamBody = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async (_url, init) => {
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({ id: "resp_order_fix" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "baseline.remote-only",
        input: [
          { type: "message", role: "user", content: [{ type: "input_text", text: "go" }] },
          {
            type: "function_call",
            call_id: "call_1",
            name: "shell_command",
            arguments: "{}",
          },
          {
            type: "message",
            role: "assistant",
            content: [{ type: "input_text", text: "I'll create the file" }],
          },
          { type: "function_call_output", call_id: "call_1", output: "tool-bridge-ok" },
        ],
      }),
    });
    expect(response.status).toBe(200);
    const parsed = JSON.parse(upstreamBody) as {
      input: Array<{ type?: string; role?: string }>;
    };
    expect(parsed.input.map((item) => item.type ?? item.role)).toEqual([
      "message",
      "message",
      "function_call",
      "function_call_output",
    ]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("orders completed.output by output_index so messages precede tool calls", async () => {
    const { finalizeCodexResponsesSse } = await import("../src/forwarder.js");
    const state = createCodexSseNormalizeState();
    const events = [
      'data: {"type":"response.created","response":{"id":"resp_order"}}',
      'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"msg_1","role":"assistant"}}',
      'data: {"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"Working"}',
      'data: {"type":"response.output_item.added","output_index":1,"item":{"type":"function_call","id":"call_1","call_id":"call_1","name":"shell_command","arguments":""}}',
      'data: {"type":"response.function_call_arguments.delta","item_id":"call_1","output_index":1,"delta":"{}"}',
      'data: {"type":"response.output_item.done","output_index":1,"item":{"type":"function_call","id":"call_1","call_id":"call_1","name":"shell_command","arguments":"{}","status":"completed"}}',
      'data: {"type":"response.incomplete","response":{"id":"resp_order","incomplete_details":{"reason":"tool_calls"},"usage":{"input_tokens":1,"output_tokens":1}}}',
    ];
    const out: string[] = [];
    for (const line of events) out.push(...normalizeCodexResponsesSseEvent(line, state));
    out.push(...finalizeCodexResponsesSse(state));
    const completedLine = out.find((line) => line.includes('"type":"response.completed"'));
    expect(completedLine).toBeTruthy();
    if (!completedLine) throw new Error("Expected a response.completed SSE line.");
    const completed = JSON.parse(completedLine.slice("data:".length).trim()) as {
      response: { output: Array<{ type: string }> };
    };
    expect(completed.response.output.map((item) => item.type)).toEqual([
      "message",
      "function_call",
    ]);
  });

  test("pairs web_search_call history with function_call_output for DeepSeek", async () => {
    const { normalizeCodexInputForRoleModel } = await import("../src/forwarder.js");
    const normalized = normalizeCodexInputForRoleModel({
      model: "baseline.remote-only",
      input: [
        { type: "message", role: "user", content: [{ type: "input_text", text: "price?" }] },
        {
          type: "web_search_call",
          call_id: "ws_1",
          status: "completed",
          action: { type: "search", query: "SanDisk share price" },
        },
        {
          type: "message",
          role: "assistant",
          content: [{ type: "input_text", text: "About $x" }],
        },
      ],
    }) as { input: Array<Record<string, unknown>> };
    expect(normalized.input.map((item) => item.type ?? item.role)).toEqual([
      "message",
      "function_call",
      "function_call_output",
      "message",
    ]);
    expect(normalized.input[1]).toMatchObject({
      type: "function_call",
      name: "web_search",
      call_id: "ws_1",
    });
    expect(normalized.input[2]).toMatchObject({
      type: "function_call_output",
      call_id: "ws_1",
    });
  });

  test("stubs unpaired function_call history so DeepSeek never sees orphan tool_calls", async () => {
    const { repairCodexToolCallInputOrder } = await import("../src/forwarder.js");
    const repaired = repairCodexToolCallInputOrder([
      { type: "message", role: "user", content: [{ type: "text", text: "go" }] },
      {
        type: "function_call",
        call_id: "orphan_1",
        name: "web_search",
        arguments: '{"query":"x"}',
      },
    ]);
    expect(
      repaired.map((item) =>
        item && typeof item === "object" && !Array.isArray(item) && "type" in item
          ? String((item as { type?: unknown }).type)
          : "?",
      ),
    ).toEqual(["message", "function_call", "function_call_output"]);
  });

  test("repairs function_call before commentary so tool outputs stay adjacent", async () => {
    const { repairCodexToolCallInputOrder } = await import("../src/forwarder.js");
    const repaired = repairCodexToolCallInputOrder([
      { type: "message", role: "user", content: [{ type: "text", text: "go" }] },
      {
        type: "function_call",
        call_id: "call_1",
        name: "shell_command",
        arguments: "{}",
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "I'll run that" }],
      },
      { type: "function_call_output", call_id: "call_1", output: "ok" },
    ]);
    const types = repaired.map((item) =>
      item && typeof item === "object" && !Array.isArray(item) && "type" in item
        ? String((item as { type?: unknown }).type)
        : "?",
    );
    expect(types).toEqual(["message", "message", "function_call", "function_call_output"]);
  });

  test("converts response.incomplete tool_calls into response.completed for Codex", async () => {
    const { finalizeCodexResponsesSse } = await import("../src/forwarder.js");
    const state = createCodexSseNormalizeState();
    const events = [
      'data: {"type":"response.created","response":{"id":"resp_1"}}',
      'data: {"type":"response.incomplete","response":{"id":"resp_1","usage":{"input_tokens":10,"output_tokens":5},"incomplete_details":{"reason":"tool_calls"}}}',
      'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","id":"call_1","call_id":"call_1","name":"shell_command","arguments":""}}',
      'data: {"type":"response.function_call_arguments.delta","item_id":"call_1","output_index":0,"delta":"{\\"command\\":\\"echo hi\\"}"}',
      'data: {"type":"response.output_item.done","output_index":0,"item":{"type":"function_call","id":"call_1","call_id":"call_1","name":"shell_command","arguments":"{\\"command\\":\\"echo hi\\"}","status":"completed"}}',
    ];
    const out: string[] = [];
    for (const line of events) {
      out.push(...normalizeCodexResponsesSseEvent(line, state));
    }
    expect(out.some((line) => line.includes("response.incomplete"))).toBe(false);
    expect(out.some((line) => line.includes("response.function_call_arguments.done"))).toBe(true);
    out.push(...finalizeCodexResponsesSse(state));
    const completed = out.find((line) => line.includes('"type":"response.completed"'));
    expect(completed).toBeTruthy();
    expect(completed).toContain("shell_command");
    expect(completed).toContain("total_tokens");
    expect(completed).not.toContain("response.incomplete");
  });

  test("ensures response.completed always has response.id for Codex Desktop", async () => {
    const { ensureCodexResponseId, finalizeCodexResponsesSse } = await import(
      "../src/forwarder.js"
    );
    const ensured = ensureCodexResponseId({
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "hi" }],
        },
      ],
    });
    expect(typeof ensured.id).toBe("string");
    expect(String(ensured.id).length).toBeGreaterThan(3);

    const state = createCodexSseNormalizeState();
    // Upstream completed event missing response.id (Desktop: missing field `id`).
    const out = [
      ...normalizeCodexResponsesSseEvent(
        'data: {"type":"response.output_item.done","output_index":0,"item":{"type":"message","id":"msg_1","role":"assistant","content":[{"type":"output_text","text":"ok"}]}}',
        state,
      ),
      ...normalizeCodexResponsesSseEvent(
        'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":1,"output_tokens":1}}}',
        state,
      ),
    ];
    if (!out.some((line) => line.includes("response.completed"))) {
      out.push(...finalizeCodexResponsesSse(state));
    }
    const completed = out.find((line) => line.includes("response.completed"));
    expect(completed).toBeTruthy();
    const payload = JSON.parse(String(completed).replace(/^data:\s*/, "")) as {
      response?: { id?: string };
    };
    expect(typeof payload.response?.id).toBe("string");
    expect(String(payload.response?.id).length).toBeGreaterThan(3);
  });

  test("streamed web_search fulfill SSE response.completed includes id", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (url, init) => {
        const href = String(url);
        if (href.includes("/alpha/search")) {
          return jsonResponse({ output: "SNDK near $1350." });
        }
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          tool_choice?: unknown;
          tools?: Array<{ name?: string }>;
        };
        if (body.tool_choice === "none" || body.tools?.every((t) => t.name !== "web_search")) {
          // Deliberately omit top-level id — adapter must synthesize for Desktop.
          return jsonResponse({
            status: "completed",
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: "SNDK near $1350." }],
              },
            ],
          });
        }
        return jsonResponse({
          status: "incomplete",
          incomplete_details: { reason: "tool_calls" },
          output: [
            {
              type: "function_call",
              name: "web_search",
              call_id: "call_ws_id",
              arguments: '{"query":"SNDK stock price today"}',
            },
          ],
        });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer chatgpt-token",
      },
      body: JSON.stringify({
        model: "baseline.remote-only",
        stream: true,
        input: [
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "SNDK?" }],
          },
        ],
        tools: [{ type: "web_search" }],
      }),
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("response.completed");
    const completedLine = text
      .split("\n")
      .find((line) => line.includes('"type":"response.completed"'));
    expect(completedLine).toBeTruthy();
    const event = JSON.parse(String(completedLine).replace(/^data:\s*/, "")) as {
      response?: { id?: string };
    };
    expect(typeof event.response?.id).toBe("string");
    expect(String(event.response?.id).length).toBeGreaterThan(3);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("normalizes SSE done frames and completed.output for Codex Desktop", () => {
    const state = createCodexSseNormalizeState();
    const events = [
      'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"msg_1"}}',
      'data: {"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"OK"}',
      'data: {"type":"response.completed","response":{"id":"resp_1","usage":{"input_tokens":1,"output_tokens":1}}}',
    ];
    const out: string[] = [];
    for (const line of events) {
      out.push(...normalizeCodexResponsesSseEvent(line, state));
    }
    expect(out.some((line) => line.includes("response.content_part.added"))).toBe(true);
    expect(out.some((line) => line.includes("response.output_text.done"))).toBe(true);
    expect(out.some((line) => line.includes("response.output_item.done"))).toBe(true);
    const completed = out.find((line) => line.includes("response.completed"));
    expect(completed).toContain('"total_tokens":2');
    expect(completed).toContain('"output":[');
    expect(completed).toContain('"text":"OK"');
  });

  test("flush emits each synthesized data line as its own SSE event", async () => {
    const { flushCodexResponsesSseBuffer } = await import("../src/forwarder.js");
    const state = createCodexSseNormalizeState();
    const upstream =
      'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"msg_1"}}\n\n' +
      'data: {"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"Hi"}\n\n' +
      'data: {"type":"response.completed","response":{"id":"resp_1","usage":{"input_tokens":1,"output_tokens":1}}}\n\n';
    const { emitted } = flushCodexResponsesSseBuffer(upstream, state);
    const events = emitted.split("\n\n").filter((chunk) => chunk.startsWith("data:"));
    expect(events.some((e) => e.includes("response.content_part.added"))).toBe(true);
    expect(events.some((e) => e.includes("response.output_text.done"))).toBe(true);
    expect(events.some((e) => e.includes("response.output_item.done"))).toBe(true);
    const completed = events.find((e) => e.includes("response.completed"));
    expect(completed).toBeTruthy();
    if (!completed) throw new Error("Expected a response.completed SSE line.");
    // Must be a single JSON object per event — not concatenated payloads.
    expect(() => JSON.parse(completed.slice("data:".length).trim())).not.toThrow();
    expect(completed).not.toMatch(
      /response\.completed.*response\.output_item\.done|response\.output_item\.done.*response\.completed/,
    );
  });

  test("accepts gzip-compressed JSON request bodies", async () => {
    const { gzipSync } = await import("node:zlib");
    let upstreamBody = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async (_url, init) => {
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({ id: "resp_gz" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const plain = JSON.stringify({
      model: "baseline.remote-only",
      input: "hey",
    });
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-encoding": "gzip",
      },
      body: gzipSync(Buffer.from(plain, "utf8")),
    });
    expect(response.status).toBe(200);
    expect(JSON.parse(upstreamBody).model).toBe("baseline.remote-only");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("accepts zstd-compressed JSON request bodies like Codex Desktop", async () => {
    const { zstdCompressSync } = await import("node:zlib");
    let upstreamBody = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async (_url, init) => {
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({ id: "resp_zstd" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const plain = JSON.stringify({
      model: "baseline.remote-only",
      input: "hey from desktop",
    });
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-encoding": "zstd",
      },
      body: zstdCompressSync(Buffer.from(plain, "utf8")),
    });
    expect(response.status).toBe(200);
    expect(JSON.parse(upstreamBody).model).toBe("baseline.remote-only");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("flattens Codex hosted tools on role-model hops and restores namespace calls", async () => {
    let upstreamBody = "";
    let requestIdHeader = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const { readFileSync, existsSync } = await import("node:fs");
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async (_url, init) => {
        upstreamBody = String(init?.body ?? "");
        const headers = init?.headers as Record<string, string>;
        requestIdHeader =
          headers?.["x-client-request-id"] ?? headers?.["x-role-model-request-id"] ?? "";
        return jsonResponse({
          id: "resp_tools",
          output: [
            {
              type: "function_call",
              name: "mcp__demo__search",
              call_id: "call_1",
              arguments: '{"q":"hi"}',
            },
          ],
        });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "baseline.remote-only",
        input: "search something",
        tools: [
          {
            type: "function",
            name: "shell_command",
            parameters: { type: "object", properties: {} },
          },
          {
            type: "namespace",
            name: "mcp__demo__",
            tools: [
              {
                type: "function",
                name: "search",
                parameters: { type: "object", properties: { q: { type: "string" } } },
              },
            ],
          },
          { type: "web_search" },
          { type: "tool_search" },
        ],
      }),
    });
    expect(response.status).toBe(200);
    const forwarded = JSON.parse(upstreamBody) as { tools: Array<{ type: string; name?: string }> };
    expect(forwarded.tools.every((t) => t.type === "function")).toBe(true);
    expect(forwarded.tools.map((t) => t.name).filter(Boolean)).toEqual(
      expect.arrayContaining(["shell_command", "mcp__demo__search", "tool_search", "web_search"]),
    );
    expect(forwarded.tools.some((t) => t.type === "web_search")).toBe(false);
    expect(requestIdHeader.length).toBeGreaterThan(8);
    const body = (await response.json()) as {
      output: Array<Record<string, unknown>>;
    };
    expect(body.output[0]).toMatchObject({
      type: "function_call",
      namespace: "mcp__demo__",
      name: "search",
      call_id: "call_1",
    });
    const hopPath = join(stateDir, "last-bridge-hop.json");
    expect(existsSync(hopPath)).toBe(true);
    const hop = JSON.parse(readFileSync(hopPath, "utf8")) as {
      bridgeTraceId: string;
      route: string;
      transformRequest?: { flattenedNamespaceCount: number };
    };
    expect(hop.route).toBe("role-model");
    expect(hop.bridgeTraceId).toBe(requestIdHeader);
    expect(hop.transformRequest?.flattenedNamespaceCount).toBe(1);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("does not flatten tools on native GPT hops", async () => {
    let upstreamBody = "";
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
      fetchImpl: async (_url, init) => {
        upstreamBody = String(init?.body ?? "");
        return jsonResponse({ id: "resp_native_tools" });
      },
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer x" },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: "hi",
        tools: [{ type: "web_search" }, { type: "namespace", name: "n", tools: [] }],
      }),
    });
    expect(response.status).toBe(200);
    const forwarded = JSON.parse(upstreamBody) as { tools: Array<{ type: string }> };
    expect(forwarded.tools.map((t) => t.type)).toEqual(["web_search", "namespace"]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("returns 404 for compact endpoint", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "codex-forwarder-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://upstream.test",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "forwarder.json"),
      fetchImpl: async () => jsonResponse({}),
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/v1/responses/compact`, {
      method: "POST",
    });
    expect(response.status).toBe(404);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("responses intent helper preserves explicit intent", () => {
    const payload = {
      model: "baseline.remote-only",
      role_model: { intent: { source: "explicit_user" } },
      input: "hello",
    };
    expect(
      injectRoleModelIntentIntoResponsesPayload(payload, new Set(["baseline.remote-only"])),
    ).toBe(payload);
  });
});
