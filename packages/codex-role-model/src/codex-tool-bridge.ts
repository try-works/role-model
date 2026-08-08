import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type BridgeReverseEntry =
  | { kind: "namespace"; namespace: string; name: string }
  | { kind: "tool_search" }
  | { kind: "custom"; name: string }
  | { kind: "web_search" }
  | { kind: "unknown"; type: string };

export interface ToolTypeHistogram {
  function: number;
  namespace: number;
  tool_search: number;
  custom: number;
  web_search: number;
  other: number;
}

export interface FlattenStats {
  inboundToolCount: number;
  outboundToolCount: number;
  flattenedNamespaceCount: number;
  harvestedFromSearch: number;
  shimCounts: {
    tool_search: number;
    apply_patch: number;
    web_search: number;
  };
  unknownDroppedCount: number;
  reverseMapSize: number;
  histogram: ToolTypeHistogram;
}

export interface FlattenResult {
  payload: Record<string, unknown>;
  reverseMap: Map<string, BridgeReverseEntry>;
  stats: FlattenStats;
}

export interface RestoreStats {
  restoredByKind: {
    namespace: number;
    tool_search: number;
    web_search: number;
    custom: number;
    function: number;
    passthrough: number;
  };
  reverseMapHits: number;
  reverseMapMisses: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createBridgeTraceId(): string {
  return randomUUID();
}

export function summarizeToolTypeHistogram(tools: unknown[]): ToolTypeHistogram {
  const histogram: ToolTypeHistogram = {
    function: 0,
    namespace: 0,
    tool_search: 0,
    custom: 0,
    web_search: 0,
    other: 0,
  };
  for (const tool of tools) {
    if (!isRecord(tool) || typeof tool.type !== "string") {
      histogram.other += 1;
      continue;
    }
    switch (tool.type) {
      case "function":
        histogram.function += 1;
        break;
      case "namespace":
        histogram.namespace += 1;
        break;
      case "tool_search":
        histogram.tool_search += 1;
        break;
      case "custom":
        histogram.custom += 1;
        break;
      case "web_search":
        histogram.web_search += 1;
        break;
      default:
        histogram.other += 1;
    }
  }
  return histogram;
}

function normalizeNamePart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || "x"
  );
}

function allocateFlatName(preferred: string, used: Set<string>): string {
  let name = preferred;
  let i = 2;
  while (used.has(name)) {
    name = `${preferred}__${i}`;
    i += 1;
  }
  used.add(name);
  return name;
}

/** Flat names the model may emit for a namespaced MCP/app tool. */
function flatNamesForNamespaceChild(namespace: string, childName: string): string[] {
  const nsBody = normalizeNamePart(namespace.replace(/^mcp__/, "").replace(/__$/, ""));
  const normalizedChild = normalizeNamePart(childName);
  const names: string[] = [];
  if (namespace.startsWith("mcp__")) {
    names.push(`mcp__${nsBody}__${normalizedChild}`);
    // Models often keep the leading underscore: mcp__server___tool
    if (childName.startsWith("_")) {
      names.push(`mcp__${nsBody}__${childName}`);
    }
  } else {
    names.push(`ns__${normalizeNamePart(namespace)}__${normalizedChild}`);
  }
  return names;
}

function registerNamespaceChildInReverseMap(
  reverseMap: Map<string, BridgeReverseEntry>,
  usedNames: Set<string>,
  namespace: string,
  childName: string,
  options?: { allocateOutboundName?: boolean },
): string | undefined {
  const preferredNames = flatNamesForNamespaceChild(namespace, childName);
  const preferredName = preferredNames[0];
  if (!preferredName) return undefined;
  const primary = options?.allocateOutboundName
    ? allocateFlatName(preferredName, usedNames)
    : preferredName;
  const entry: BridgeReverseEntry = { kind: "namespace", namespace, name: childName };
  reverseMap.set(primary, entry);
  for (const alias of preferredNames) {
    if (!reverseMap.has(alias)) reverseMap.set(alias, entry);
  }
  // If allocateFlatName had to suffix __2, still map the unsuffixed aliases to the same entry.
  return primary;
}

/**
 * tool_search_output discovers deferred namespace tools client-side; Codex often does not
 * re-attach them on later tools[]. Harvest those namespaces into reverseMap AND outbound
 * function tools so the model can call them and restore can turn flat mcp__* names back
 * into namespaced calls Codex can dispatch.
 */
function harvestDeferredToolsFromInput(
  payload: Record<string, unknown>,
  reverseMap: Map<string, BridgeReverseEntry>,
  usedNames: Set<string>,
  outbound?: Record<string, unknown>[],
): number {
  if (!Array.isArray(payload.input)) return 0;
  let harvested = 0;
  for (const item of payload.input) {
    if (!isRecord(item) || item.type !== "tool_search_output") continue;
    const tools = Array.isArray(item.tools) ? item.tools : [];
    for (const tool of tools) {
      if (!isRecord(tool) || tool.type !== "namespace" || typeof tool.name !== "string") continue;
      const nested = Array.isArray(tool.tools) ? tool.tools : [];
      for (const child of nested) {
        if (!isRecord(child) || child.type !== "function" || typeof child.name !== "string") {
          continue;
        }
        const preferred = flatNamesForNamespaceChild(tool.name, child.name)[0];
        if (!preferred) continue;
        const alreadyMapped = reverseMap.has(preferred);
        const flat = registerNamespaceChildInReverseMap(
          reverseMap,
          usedNames,
          tool.name,
          child.name,
          { allocateOutboundName: Boolean(outbound) && !usedNames.has(preferred) },
        );
        if (!flat) continue;
        if (!alreadyMapped) harvested += 1;
        if (outbound && !outbound.some((t) => isRecord(t) && t.name === flat)) {
          outbound.push(
            asFunctionTool({
              name: flat,
              description:
                typeof child.description === "string"
                  ? child.description
                  : `Deferred tool ${child.name} from ${tool.name}`,
              parameters: child.parameters,
            }),
          );
        }
      }
    }
  }
  return harvested;
}

/**
 * Best-effort parse of flat mcp__{namespace-body}__{tool} names when reverseMap missed
 * (e.g. model invents a name after reading tool_search text without an exact alias).
 */
function inferMcpNamespaceEntry(flatName: string): BridgeReverseEntry | null {
  if (!flatName.startsWith("mcp__")) return null;
  const rest = flatName.slice("mcp__".length);
  const sep = rest.lastIndexOf("__");
  if (sep <= 0 || sep + 2 >= rest.length) return null;
  let nsBody = rest.slice(0, sep);
  let toolName = rest.slice(sep + 2);
  // mcp__codex_apps__github___list_recent_issues → body ends with _, tool lost leading _
  if (!toolName.startsWith("_") && nsBody.endsWith("_")) {
    nsBody = nsBody.slice(0, -1);
    toolName = `_${toolName}`;
  }
  // App connector tools are conventionally underscore-prefixed.
  if (nsBody.startsWith("codex_apps__") && toolName.length > 0 && !toolName.startsWith("_")) {
    toolName = `_${toolName}`;
  }
  if (!nsBody || !toolName) return null;
  return { kind: "namespace", namespace: `mcp__${nsBody}`, name: toolName };
}

function asFunctionTool(input: {
  name: string;
  description?: string;
  parameters?: unknown;
}): Record<string, unknown> {
  return {
    type: "function",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    parameters:
      input.parameters && typeof input.parameters === "object"
        ? input.parameters
        : { type: "object", properties: {} },
  };
}

const TOOL_SEARCH_PARAMETERS = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query for deferred tools." },
    limit: {
      type: "integer",
      minimum: 1,
      description: "Max number of tools to return.",
    },
  },
  required: ["query"],
};

const APPLY_PATCH_PARAMETERS = {
  type: "object",
  properties: {
    input: {
      type: "string",
      description:
        "Full apply_patch freeform body beginning with *** Begin Patch and ending with *** End Patch.",
    },
  },
  required: ["input"],
};

/**
 * How hosted Codex `web_search` is sent to role-model.
 * - `shim` (default): ordinary function tool. Adapter fulfills via ChatGPT
 *   alpha/search and continues the model turn (Desktop client continue is unreliable).
 * - `hosted`: pass through `type: "web_search"` for providers with built-in
 *   search (set `ROLE_MODEL_CODEX_WEB_SEARCH_MODE=hosted` explicitly).
 */
export type WebSearchForwardMode = "hosted" | "shim";

export function resolveWebSearchForwardMode(
  env: NodeJS.ProcessEnv = process.env,
): WebSearchForwardMode {
  const raw = (env.ROLE_MODEL_CODEX_WEB_SEARCH_MODE ?? "shim").trim().toLowerCase();
  return raw === "hosted" ? "hosted" : "shim";
}

export const WEB_SEARCH_TOOL_DESCRIPTION =
  "Search the live web and return results for the given query.";

const WEB_SEARCH_PARAMETERS = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Web search query.",
    },
  },
  required: ["query"],
};

/**
 * Flatten Codex Desktop/CLI Responses tool shapes into ordinary function tools
 * so the main role-model router can route to any eligible endpoint.
 * Hosted `web_search` defaults to a function shim (Codex client → ChatGPT alpha/search).
 */
export function flattenCodexToolsForUpstream(
  payload: unknown,
  options: { readonly webSearchMode?: WebSearchForwardMode } = {},
): FlattenResult {
  if (!isRecord(payload) || !Array.isArray(payload.tools)) {
    const emptyPayload = isRecord(payload) ? { ...payload } : {};
    const reverseMap = new Map<string, BridgeReverseEntry>();
    const harvestedFromSearch = harvestDeferredToolsFromInput(emptyPayload, reverseMap, new Set());
    return {
      payload: emptyPayload,
      reverseMap,
      stats: {
        inboundToolCount: 0,
        outboundToolCount: 0,
        flattenedNamespaceCount: 0,
        harvestedFromSearch,
        shimCounts: { tool_search: 0, apply_patch: 0, web_search: 0 },
        unknownDroppedCount: 0,
        reverseMapSize: reverseMap.size,
        histogram: summarizeToolTypeHistogram([]),
      },
    };
  }

  const inbound = payload.tools;
  const histogram = summarizeToolTypeHistogram(inbound);
  const reverseMap = new Map<string, BridgeReverseEntry>();
  const usedNames = new Set<string>();
  const outbound: Record<string, unknown>[] = [];
  let flattenedNamespaceCount = 0;
  let unknownDroppedCount = 0;
  const shimCounts = { tool_search: 0, apply_patch: 0, web_search: 0 };
  const webSearchMode = options.webSearchMode ?? resolveWebSearchForwardMode();

  for (const tool of inbound) {
    if (!isRecord(tool) || typeof tool.type !== "string") {
      unknownDroppedCount += 1;
      continue;
    }

    if (tool.type === "function" && typeof tool.name === "string") {
      const name = allocateFlatName(tool.name, usedNames);
      if (name !== tool.name) {
        // rare collision with earlier flatten; keep identity map only if unchanged
      }
      outbound.push({
        ...tool,
        type: "function",
        name,
      });
      continue;
    }

    if (tool.type === "namespace") {
      const namespace = typeof tool.name === "string" ? tool.name : "namespace";
      const nested = Array.isArray(tool.tools) ? tool.tools : [];
      for (const child of nested) {
        if (!isRecord(child) || child.type !== "function" || typeof child.name !== "string") {
          continue;
        }
        const flat = registerNamespaceChildInReverseMap(
          reverseMap,
          usedNames,
          namespace,
          child.name,
          { allocateOutboundName: true },
        );
        if (!flat) continue;
        outbound.push(
          asFunctionTool({
            name: flat,
            description: typeof child.description === "string" ? child.description : undefined,
            parameters: child.parameters,
          }),
        );
        flattenedNamespaceCount += 1;
      }
      continue;
    }

    if (tool.type === "tool_search") {
      const flat = allocateFlatName("tool_search", usedNames);
      outbound.push(
        asFunctionTool({
          name: flat,
          description: "Search for deferred tools.",
          parameters: TOOL_SEARCH_PARAMETERS,
        }),
      );
      reverseMap.set(flat, { kind: "tool_search" });
      shimCounts.tool_search += 1;
      continue;
    }

    if (tool.type === "web_search") {
      if (webSearchMode === "hosted") {
        // Pass hosted web_search through so role-model can use provider built-in
        // search and filter to capable endpoints. Do not invent answers in-adapter.
        outbound.push({ ...tool, type: "web_search" });
        continue;
      }
      // Eligibility-preserving fallback: ordinary function (no provider search).
      const flat = allocateFlatName("web_search", usedNames);
      outbound.push(
        asFunctionTool({
          name: flat,
          description: WEB_SEARCH_TOOL_DESCRIPTION,
          parameters: WEB_SEARCH_PARAMETERS,
        }),
      );
      reverseMap.set(flat, { kind: "web_search" });
      shimCounts.web_search += 1;
      continue;
    }

    if (tool.type === "custom") {
      const customName = typeof tool.name === "string" ? tool.name : "custom";
      const flat = allocateFlatName(normalizeNamePart(customName), usedNames);
      outbound.push(
        asFunctionTool({
          name: flat,
          description:
            typeof tool.description === "string"
              ? tool.description
              : customName === "apply_patch"
                ? "Apply a freeform V4A patch to create, update, or delete files. Put the entire *** Begin Patch … *** End Patch body in input."
                : customName,
          parameters: APPLY_PATCH_PARAMETERS,
        }),
      );
      reverseMap.set(flat, { kind: "custom", name: customName });
      if (customName === "apply_patch") shimCounts.apply_patch += 1;
      continue;
    }

    unknownDroppedCount += 1;
    reverseMap.set(`unknown:${tool.type}`, { kind: "unknown", type: tool.type });
  }

  const harvestedFromSearch = harvestDeferredToolsFromInput(
    payload,
    reverseMap,
    usedNames,
    outbound,
  );

  return {
    payload: { ...payload, tools: outbound },
    reverseMap,
    stats: {
      inboundToolCount: inbound.length,
      outboundToolCount: outbound.length,
      flattenedNamespaceCount,
      harvestedFromSearch,
      shimCounts,
      unknownDroppedCount,
      reverseMapSize: reverseMap.size,
      histogram,
    },
  };
}

function extractCustomToolInput(argumentsJson: unknown): string {
  if (typeof argumentsJson !== "string") return "";
  const trimmed = argumentsJson.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string") return parsed;
    if (isRecord(parsed)) {
      if (typeof parsed.input === "string") return parsed.input;
      if (typeof parsed.patch === "string") return parsed.patch;
      if (typeof parsed.command === "string") return parsed.command;
    }
  } catch {
    // Upstream sometimes emits the freeform body as the raw arguments string.
    return argumentsJson;
  }
  return argumentsJson;
}

function parseJsonObjectArgument(argumentsJson: unknown): Record<string, unknown> {
  if (isRecord(argumentsJson)) return { ...argumentsJson };
  if (typeof argumentsJson !== "string") return {};
  const trimmed = argumentsJson.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isRecord(parsed)) return parsed;
    if (typeof parsed === "string") return { query: parsed };
  } catch {
    return { query: argumentsJson };
  }
  return { query: trimmed };
}

export function extractWebSearchQuery(item: Record<string, unknown>): string {
  const args = parseJsonObjectArgument(item.arguments);
  if (typeof args.query === "string" && args.query.trim()) return args.query.trim();
  if (typeof args.q === "string" && args.q.trim()) return args.q.trim();
  return "";
}

export function isWebSearchFunctionCall(
  item: Record<string, unknown>,
  reverseMap: Map<string, BridgeReverseEntry>,
): boolean {
  if (item.type !== "function_call" || typeof item.name !== "string") return false;
  if (item.name === "web_search") return true;
  return reverseMap.get(item.name)?.kind === "web_search";
}

export function reverseMapHasWebSearch(reverseMap: Map<string, BridgeReverseEntry>): boolean {
  for (const entry of reverseMap.values()) {
    if (entry.kind === "web_search") return true;
  }
  return false;
}

/**
 * Restore a web_search function_call to a Codex-executable web_search_call.
 * Prefer adapter fulfill paths so this is rarely reached — client/native search
 * uses the ChatGPT/Codex subscription and can fail on quota.
 * Always `in_progress` + `execution: "client"` when restored so Codex can run
 * `/alpha/search`. A `completed` item makes Desktop finish with
 * `last_agent_message: null` after search (no answer).
 */
function toWebSearchCallItem(item: Record<string, unknown>): Record<string, unknown> {
  const query = extractWebSearchQuery(item);
  const callId =
    typeof item.call_id === "string" ? item.call_id : typeof item.id === "string" ? item.id : null;
  return {
    type: "web_search_call",
    ...(callId ? { call_id: callId, id: callId } : {}),
    execution: "client",
    status: "in_progress",
    action: {
      type: "search",
      query,
    },
  };
}

function restoreCallItem(
  item: Record<string, unknown>,
  reverseMap: Map<string, BridgeReverseEntry>,
  stats: RestoreStats,
): Record<string, unknown> {
  if (item.type !== "function_call" || typeof item.name !== "string") {
    stats.restoredByKind.passthrough += 1;
    return item;
  }
  let entry = reverseMap.get(item.name);
  if (!entry) {
    // Stray web_search function_call → Codex client web_search_call (never a bare local fn).
    if (item.name === "web_search") {
      stats.restoredByKind.web_search += 1;
      return toWebSearchCallItem(item);
    }
    const inferred = inferMcpNamespaceEntry(item.name);
    if (!inferred) {
      stats.reverseMapMisses += 1;
      stats.restoredByKind.function += 1;
      return item;
    }
    entry = inferred;
  }
  stats.reverseMapHits += 1;
  if (entry.kind === "namespace") {
    stats.restoredByKind.namespace += 1;
    return {
      ...item,
      type: "function_call",
      namespace: entry.namespace,
      name: entry.name,
    };
  }
  if (entry.kind === "tool_search") {
    stats.restoredByKind.tool_search += 1;
    // Codex only dispatches tool_search_call when execution==="client" and call_id is present
    // (codex-rs tools/router.rs). Missing either → silent Ok(None) / broken MCP discovery.
    const callId =
      typeof item.call_id === "string"
        ? item.call_id
        : typeof item.id === "string"
          ? item.id
          : null;
    const args = parseJsonObjectArgument(item.arguments);
    if (typeof args.query !== "string" && typeof args.q === "string") {
      args.query = args.q;
    }
    return {
      type: "tool_search_call",
      call_id: callId,
      execution: "client",
      status: typeof item.status === "string" ? item.status : "completed",
      arguments: args,
    };
  }
  if (entry.kind === "custom") {
    stats.restoredByKind.custom += 1;
    const { arguments: args, name: _name, type: _type, ...rest } = item;
    return {
      ...rest,
      type: "custom_tool_call",
      name: entry.name,
      input: extractCustomToolInput(args),
    };
  }
  if (entry.kind === "web_search") {
    stats.restoredByKind.web_search += 1;
    return toWebSearchCallItem(item);
  }
  stats.restoredByKind.passthrough += 1;
  return item;
}

function walkRestore(
  value: unknown,
  reverseMap: Map<string, BridgeReverseEntry>,
  stats: RestoreStats,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => walkRestore(entry, reverseMap, stats));
  }
  if (!isRecord(value)) return value;
  if (value.type === "function_call" && typeof value.name === "string") {
    return restoreCallItem(value, reverseMap, stats);
  }
  // Provider/runtime may emit hosted web_search_call as already completed — force
  // client in_progress so Codex continues after /alpha/search.
  if (value.type === "web_search_call") {
    stats.restoredByKind.web_search += 1;
    const action = isRecord(value.action) ? value.action : {};
    const query =
      typeof action.query === "string"
        ? action.query
        : Array.isArray(action.queries) && typeof action.queries[0] === "string"
          ? action.queries[0]
          : "";
    const callId =
      typeof value.call_id === "string"
        ? value.call_id
        : typeof value.id === "string"
          ? value.id
          : null;
    return {
      ...value,
      type: "web_search_call",
      ...(callId ? { call_id: callId, id: callId } : {}),
      execution: "client",
      status: "in_progress",
      action: { type: "search", ...(query ? { query } : action) },
    };
  }
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = walkRestore(child, reverseMap, stats);
  }
  return next;
}

export function restoreCodexToolCallsInPayload(
  payload: unknown,
  reverseMap: Map<string, BridgeReverseEntry>,
): { payload: Record<string, unknown>; stats: RestoreStats } {
  const stats: RestoreStats = {
    restoredByKind: {
      namespace: 0,
      tool_search: 0,
      web_search: 0,
      custom: 0,
      function: 0,
      passthrough: 0,
    },
    reverseMapHits: 0,
    reverseMapMisses: 0,
  };
  const restored = walkRestore(payload, reverseMap, stats);
  return {
    payload: isRecord(restored) ? restored : {},
    stats,
  };
}

export function restoreCodexToolCallsInSseChunk(
  chunk: string,
  reverseMap: Map<string, BridgeReverseEntry>,
): string {
  // Always rewrite when the chunk mentions tools we may restore — including
  // stray `web_search` function_calls even if reverseMap is empty.
  if (!chunk.includes("function_call") && !chunk.includes("web_search")) {
    return chunk;
  }
  // Use horizontal whitespace only — `\s*` would eat SSE `\n\n` separators via `$`
  // matching before newlines (Codex then sees `}}data:` and never gets completed).
  return chunk.replace(
    /^(data:[^\S\r\n]*)(\{.*\})([^\S\r\n]*)$/gm,
    (full, _prefix, jsonText: string, trail: string) => {
      try {
        const parsed = JSON.parse(jsonText) as unknown;
        const { payload } = restoreCodexToolCallsInPayload(parsed, reverseMap);
        return `data: ${JSON.stringify(payload)}${trail}`;
      } catch {
        return full;
      }
    },
  );
}

export interface BridgeHopSummary {
  bridgeTraceId: string;
  route: "role-model" | "native";
  model?: string;
  histogram?: ToolTypeHistogram;
  transformRequest?: FlattenStats;
  restore?: RestoreStats;
  upstreamStatus?: number;
  outcome: "ok" | "error";
  error?: string;
  durationMs?: number;
}

export function writeLastBridgeHop(path: string, summary: BridgeHopSummary): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(summary, null, 2), "utf8");
}

export function bridgeLogEnabled(): boolean {
  return process.env.ROLE_MODEL_CODEX_BRIDGE_LOG === "1";
}

export function logBridgeEvent(event: string, fields: Record<string, unknown>): void {
  if (!bridgeLogEnabled()) return;
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ event, ...fields, ts: new Date().toISOString() }));
}
