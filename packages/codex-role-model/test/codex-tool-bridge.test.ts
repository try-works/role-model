import { describe, expect, test } from "vitest";
import {
  flattenCodexToolsForUpstream,
  restoreCodexToolCallsInPayload,
  restoreCodexToolCallsInSseChunk,
  createBridgeTraceId,
  summarizeToolTypeHistogram,
} from "../src/codex-tool-bridge.js";

describe("CodexToolBridge request flatten", () => {
  test("flattens namespace tools to canonical mcp__ function names", () => {
    const { payload, reverseMap, stats } = flattenCodexToolsForUpstream({
      model: "baseline.remote-only",
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
              description: "Search",
              parameters: {
                type: "object",
                properties: { q: { type: "string" } },
                required: ["q"],
              },
            },
          ],
        },
        { type: "web_search" },
        { type: "tool_search" },
        {
          type: "custom",
          name: "apply_patch",
          description: "Apply a patch",
        },
      ],
    });

    const tools = payload.tools as Array<Record<string, unknown>>;
    // Default: web_search is a function shim (Codex client → ChatGPT alpha/search).
    expect(tools.filter((t) => t.type === "function").map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "shell_command",
        "mcp__demo__search",
        "tool_search",
        "apply_patch",
        "web_search",
      ]),
    );
    expect(tools.every((t) => t.type === "function")).toBe(true);
    expect(stats.flattenedNamespaceCount).toBe(1);
    expect(stats.shimCounts.tool_search).toBe(1);
    expect(stats.shimCounts.apply_patch).toBe(1);
    expect(stats.shimCounts.web_search).toBe(1);
    expect(reverseMap.get("mcp__demo__search")).toEqual({
      kind: "namespace",
      namespace: "mcp__demo__",
      name: "search",
    });
    expect(reverseMap.get("tool_search")).toEqual({ kind: "tool_search" });
    expect(reverseMap.get("web_search")).toEqual({ kind: "web_search" });
    expect(reverseMap.get("apply_patch")).toEqual({
      kind: "custom",
      name: "apply_patch",
    });
  });

  test("hosted mode passes through type web_search", () => {
    const { payload, reverseMap, stats } = flattenCodexToolsForUpstream(
      {
        tools: [{ type: "web_search" }, { type: "function", name: "shell_command", parameters: {} }],
      },
      { webSearchMode: "hosted" },
    );
    const tools = payload.tools as Array<Record<string, unknown>>;
    expect(tools.some((t) => t.type === "web_search")).toBe(true);
    expect(stats.shimCounts.web_search).toBe(0);
    expect(reverseMap.get("web_search")).toBeUndefined();
  });

  test("shim mode still flattens hosted web_search to a function", () => {
    const { payload, reverseMap, stats } = flattenCodexToolsForUpstream(
      {
        tools: [{ type: "web_search" }, { type: "function", name: "shell_command", parameters: {} }],
      },
      { webSearchMode: "shim" },
    );
    const tools = payload.tools as Array<Record<string, unknown>>;
    expect(tools.every((t) => t.type === "function")).toBe(true);
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(["web_search", "shell_command"]));
    expect(stats.shimCounts.web_search).toBe(1);
    expect(reverseMap.get("web_search")).toEqual({ kind: "web_search" });
    const web = tools.find((t) => t.name === "web_search");
    expect(String(web?.description ?? "")).toMatch(/search|web/i);
  });

  test("histogram counts inbound tool types", () => {
    expect(
      summarizeToolTypeHistogram([
        { type: "function", name: "a", parameters: {} },
        { type: "namespace", name: "n", tools: [] },
        { type: "web_search" },
        { type: "mystery" },
      ]),
    ).toEqual({
      function: 1,
      namespace: 1,
      tool_search: 0,
      custom: 0,
      web_search: 1,
      other: 1,
    });
  });
});

describe("CodexToolBridge response restore", () => {
  test("restores flat function_call names to namespace + tool_search_call", () => {
    const reverseMap = new Map([
      [
        "mcp__demo__search",
        { kind: "namespace" as const, namespace: "mcp__demo__", name: "search" },
      ],
      ["tool_search", { kind: "tool_search" as const }],
    ]);

    const restored = restoreCodexToolCallsInPayload(
      {
        output: [
          {
            type: "function_call",
            name: "mcp__demo__search",
            call_id: "c1",
            arguments: "{\"q\":\"hi\"}",
          },
          {
            type: "function_call",
            name: "tool_search",
            call_id: "c2",
            arguments: "{\"query\":\"x\"}",
          },
          {
            type: "function_call",
            name: "shell_command",
            call_id: "c3",
            arguments: "{}",
          },
        ],
      },
      reverseMap,
    );

    const output = restored.payload.output as Array<Record<string, unknown>>;
    expect(output[0]).toMatchObject({
      type: "function_call",
      namespace: "mcp__demo__",
      name: "search",
      call_id: "c1",
    });
    expect(output[1]).toMatchObject({
      type: "tool_search_call",
      call_id: "c2",
      execution: "client",
      arguments: { query: "x" },
    });
    expect(output[1].name).toBeUndefined();
    expect(typeof output[1].arguments).toBe("object");
    expect(output[2]).toMatchObject({
      type: "function_call",
      name: "shell_command",
      call_id: "c3",
    });
  });

  test("restores tool_search with client execution so Codex dispatches MCP discovery", () => {
    const reverseMap = new Map([["tool_search", { kind: "tool_search" as const }]]);
    const restored = restoreCodexToolCallsInPayload(
      {
        output: [
          {
            type: "function_call",
            name: "tool_search",
            call_id: "call_ts_1",
            arguments: "{\"query\":\"browser\"}",
            status: "completed",
          },
        ],
      },
      reverseMap,
    );
    const output = restored.payload.output as Array<Record<string, unknown>>;
    expect(output[0]).toEqual({
      type: "tool_search_call",
      call_id: "call_ts_1",
      execution: "client",
      status: "completed",
      arguments: { query: "browser" },
    });
    expect(restored.stats.restoredByKind.tool_search).toBe(1);
  });

  test("restores leftover web_search function_call to Codex web_search_call", () => {
    const reverseMap = new Map([["web_search", { kind: "web_search" as const }]]);
    const restored = restoreCodexToolCallsInPayload(
      {
        output: [
          {
            type: "function_call",
            name: "web_search",
            call_id: "call_ws_1",
            arguments: "{\"query\":\"what day is 2026-08-05\"}",
            status: "completed",
          },
        ],
      },
      reverseMap,
    );
    const output = restored.payload.output as Array<Record<string, unknown>>;
    expect(output[0]).toMatchObject({
      type: "web_search_call",
      call_id: "call_ws_1",
      execution: "client",
      status: "in_progress",
      action: { type: "search", query: "what day is 2026-08-05" },
    });
    expect(restored.stats.restoredByKind.web_search).toBe(1);
  });

  test("forces completed hosted web_search_call back to client in_progress", () => {
    const restored = restoreCodexToolCallsInPayload(
      {
        output: [
          {
            type: "web_search_call",
            id: "ws_done",
            status: "completed",
            action: { type: "search", query: "SanDisk SNDK" },
          },
        ],
      },
      new Map(),
    );
    const output = restored.payload.output as Array<Record<string, unknown>>;
    expect(output[0]).toMatchObject({
      type: "web_search_call",
      execution: "client",
      status: "in_progress",
      action: { type: "search", query: "SanDisk SNDK" },
    });
  });

  test("restores stray web_search as web_search_call not a local function", () => {
    const restored = restoreCodexToolCallsInPayload(
      {
        output: [
          {
            type: "function_call",
            name: "web_search",
            call_id: "call_ws_1",
            arguments: "{\"query\":\"day of week\"}",
          },
        ],
      },
      new Map(),
    );
    const output = restored.payload.output as Array<Record<string, unknown>>;
    expect(output[0]).toMatchObject({
      type: "web_search_call",
      execution: "client",
      status: "in_progress",
      action: { type: "search", query: "day of week" },
    });
    expect(JSON.stringify(output[0])).not.toContain('"type":"function_call"');
  });

  test("harvests deferred tools from tool_search_output into reverseMap", () => {
    const { reverseMap, stats, payload } = flattenCodexToolsForUpstream({
      tools: [{ type: "tool_search" }],
      input: [
        {
          type: "tool_search_output",
          call_id: "ts1",
          tools: [
            {
              type: "namespace",
              name: "mcp__codex_apps__github",
              tools: [
                { type: "function", name: "_list_recent_issues", parameters: {} },
                { type: "function", name: "_get_user_login", parameters: {} },
              ],
            },
          ],
        },
      ],
    });
    expect(stats.harvestedFromSearch).toBe(2);
    expect(payload.tools?.map((t: { name?: string }) => t.name)).toEqual(
      expect.arrayContaining([
        "tool_search",
        "mcp__codex_apps__github__list_recent_issues",
        "mcp__codex_apps__github__get_user_login",
      ]),
    );
    expect(reverseMap.get("mcp__codex_apps__github__list_recent_issues")).toEqual({
      kind: "namespace",
      namespace: "mcp__codex_apps__github",
      name: "_list_recent_issues",
    });
    expect(reverseMap.get("mcp__codex_apps__github___list_recent_issues")).toEqual({
      kind: "namespace",
      namespace: "mcp__codex_apps__github",
      name: "_list_recent_issues",
    });
  });

  test("restores harvested and inferred mcp__ flat names to namespaced calls", () => {
    const { reverseMap } = flattenCodexToolsForUpstream({
      tools: [{ type: "tool_search" }],
      input: [
        {
          type: "tool_search_output",
          call_id: "ts1",
          tools: [
            {
              type: "namespace",
              name: "mcp__codex_apps__github",
              tools: [{ type: "function", name: "_list_recent_issues", parameters: {} }],
            },
          ],
        },
      ],
    });
    const restored = restoreCodexToolCallsInPayload(
      {
        output: [
          {
            type: "function_call",
            name: "mcp__codex_apps__github__list_recent_issues",
            call_id: "c1",
            arguments: "{\"top_k\":5}",
          },
          {
            type: "function_call",
            name: "mcp__codex_apps__figma___whoami",
            call_id: "c2",
            arguments: "{}",
          },
          {
            type: "function_call",
            name: "mcp__node_repl__js",
            call_id: "c3",
            arguments: "{\"code\":\"1+1\"}",
          },
        ],
      },
      reverseMap,
    );
    const output = restored.payload.output as Array<Record<string, unknown>>;
    expect(output[0]).toMatchObject({
      type: "function_call",
      namespace: "mcp__codex_apps__github",
      name: "_list_recent_issues",
      call_id: "c1",
    });
    // inferred (not harvested): leading-underscore encoding + codex_apps prefix rule
    expect(output[1]).toMatchObject({
      type: "function_call",
      namespace: "mcp__codex_apps__figma",
      name: "_whoami",
      call_id: "c2",
    });
    expect(output[2]).toMatchObject({
      type: "function_call",
      namespace: "mcp__node_repl",
      name: "js",
      call_id: "c3",
    });
    expect(restored.stats.restoredByKind.namespace).toBe(3);
    expect(restored.stats.reverseMapMisses).toBe(0);
  });

  test("restores apply_patch function_call to custom_tool_call with freeform input", () => {
    const reverseMap = new Map([
      ["apply_patch", { kind: "custom" as const, name: "apply_patch" }],
    ]);
    const patch = "*** Begin Patch\n*** Update File: a.ts\n@@\n- old\n+ new\n*** End Patch";
    const restored = restoreCodexToolCallsInPayload(
      {
        output: [
          {
            type: "function_call",
            name: "apply_patch",
            call_id: "call_patch_1",
            id: "fc_patch_1",
            arguments: JSON.stringify({ input: patch }),
            status: "completed",
          },
        ],
      },
      reverseMap,
    );
    const output = restored.payload.output as Array<Record<string, unknown>>;
    expect(output[0]).toMatchObject({
      type: "custom_tool_call",
      name: "apply_patch",
      call_id: "call_patch_1",
      input: patch,
    });
    expect(output[0].arguments).toBeUndefined();
    expect(restored.stats.restoredByKind.custom).toBe(1);
  });

  test("restores mapped names inside SSE data frames", () => {
    const reverseMap = new Map([
      [
        "mcp__demo__search",
        { kind: "namespace" as const, namespace: "mcp__demo__", name: "search" },
      ],
    ]);
    const frame = `event: response.output_item.done\ndata: ${JSON.stringify({
      type: "response.output_item.done",
      item: {
        type: "function_call",
        name: "mcp__demo__search",
        call_id: "c1",
        arguments: "{}",
      },
    })}\n\n`;
    const out = restoreCodexToolCallsInSseChunk(frame, reverseMap);
    expect(out).toContain('"namespace":"mcp__demo__"');
    expect(out).toContain('"name":"search"');
  });

  test("preserves SSE blank-line framing when restoring multiple data events", () => {
    const reverseMap = new Map([
      [
        "mcp__demo__search",
        { kind: "namespace" as const, namespace: "mcp__demo__", name: "search" },
      ],
    ]);
    const chunk = [
      `data: ${JSON.stringify({
        type: "response.output_item.done",
        item: {
          type: "function_call",
          name: "mcp__demo__search",
          call_id: "c1",
          arguments: "{}",
          status: "completed",
        },
      })}`,
      "",
      `data: ${JSON.stringify({
        type: "response.completed",
        response: { id: "r1", status: "completed", output: [] },
      })}`,
      "",
    ].join("\n");
    const out = restoreCodexToolCallsInSseChunk(chunk, reverseMap);
    expect(out.includes("}}data:")).toBe(false);
    expect(out.split("\n\n").filter((part) => part.startsWith("data:")).length).toBe(2);
    expect(out).toContain('"namespace":"mcp__demo__"');
    expect(out).toContain("response.completed");
  });
});

describe("CodexToolBridge tracing helpers", () => {
  test("createBridgeTraceId returns non-empty id", () => {
    const a = createBridgeTraceId();
    const b = createBridgeTraceId();
    expect(a.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });
});
