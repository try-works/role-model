import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  brotliDecompressSync,
  gunzipSync,
  inflateSync,
  zstdDecompressSync,
} from "node:zlib";
import { injectRoleModelIntentIntoResponsesPayload } from "./responses-intent.js";
import { injectRoleModelIntentIntoPayload } from "./request-intent.js";
import { createStagedCompactTaxonomyReader } from "./taxonomy/staged-compact-taxonomy.js";
import { normalizeEndpoint } from "./config.js";
import { readNativeAliases, resolveNativeAliasedModelId } from "./native-alias.js";
import {
  createBridgeTraceId,
  extractWebSearchQuery,
  flattenCodexToolsForUpstream,
  isWebSearchFunctionCall,
  logBridgeEvent,
  resolveWebSearchForwardMode,
  restoreCodexToolCallsInPayload,
  restoreCodexToolCallsInSseChunk,
  reverseMapHasWebSearch,
  writeLastBridgeHop,
  type BridgeReverseEntry,
  type RestoreStats,
} from "./codex-tool-bridge.js";
import { enrichWeakSearchEvidence, searchWebLive } from "./web-search.js";

export const DEFAULT_CODEX_NATIVE_BASE_URL = "https://chatgpt.com/backend-api/codex";

/** Mirror duolahypercho/codex-router body limit for decompress safety. */
export const MAX_REQUEST_BODY_BYTES = 32 * 1024 * 1024;

export interface ForwarderOptions {
  listenHost?: string;
  listenPort: number;
  upstreamEndpoint: string;
  aliasIds: ReadonlySet<string>;
  fetchImpl?: typeof fetch;
  stateFilePath: string;
  nativeAliasesPath?: string;
  /** ChatGPT Codex backend for non–role-model models when openai_base_url is hijacked. */
  nativeBaseUrl?: string;
}

export function remapPayloadModel(
  payload: unknown,
  nativeAliasesPath?: string,
): unknown {
  if (!nativeAliasesPath || !isRecord(payload) || typeof payload.model !== "string") {
    return payload;
  }
  const remapped = resolveNativeAliasedModelId(payload.model, nativeAliasesPath);
  if (remapped === payload.model) return payload;
  return { ...payload, model: remapped };
}

export function isRoleModelRoutedModel(
  model: string | undefined,
  aliasIds: ReadonlySet<string>,
  nativeAliasesPath?: string,
): boolean {
  if (!model) return false;
  const aliases = nativeAliasesPath ? readNativeAliases(nativeAliasesPath) : {};
  if (aliases[model]) return true;
  const resolved = aliases[model] ?? model;
  const normalized = resolved.startsWith("role-model/")
    ? resolved.slice("role-model/".length)
    : resolved;
  return aliasIds.has(normalized) || aliasIds.has(resolved);
}

export function nativeResponsesUrl(nativeBaseUrl: string, requestUrl = "/v1/responses"): string {
  const base = normalizeEndpoint(nativeBaseUrl);
  const path = requestUrl.startsWith("/v1/") ? requestUrl.slice(3) : requestUrl;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** ChatGPT Codex backend `POST …/alpha/search` (Codex client search relay target). */
export function chatgptAlphaSearchUrl(nativeBaseUrl: string): string {
  return `${normalizeEndpoint(nativeBaseUrl)}/alpha/search`;
}

/** Default total deadline for one ChatGPT alpha/search relay (non-streaming). */
export const DEFAULT_CHATGPT_SEARCH_TIMEOUT_MS = 200_000;

export function resolveChatgptSearchTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.ROLE_MODEL_CODEX_SEARCH_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_CHATGPT_SEARCH_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CHATGPT_SEARCH_TIMEOUT_MS;
}

/**
 * ChatGPT alpha/search expects a native Codex model slug, not a role-model alias.
 */
export function resolveChatgptSearchModelId(
  requestedModel: unknown,
  options: {
    readonly aliasIds: ReadonlySet<string>;
    readonly nativeAliasesPath?: string;
    readonly fallbackModel?: string;
  },
): string {
  const fallback =
    options.fallbackModel?.trim() ||
    process.env.ROLE_MODEL_CODEX_SEARCH_MODEL?.trim() ||
    "gpt-5.4";
  if (typeof requestedModel !== "string" || !requestedModel.trim()) return fallback;
  if (
    isRoleModelRoutedModel(
      requestedModel,
      options.aliasIds,
      options.nativeAliasesPath,
    )
  ) {
    return fallback;
  }
  return requestedModel.trim();
}

const NATIVE_HEADER_ALLOWLIST = new Set([
  "authorization",
  "chatgpt-account-id",
  "openai-beta",
  "originator",
  "session_id",
  "session-id",
  "thread-id",
  "x-client-request-id",
  "x-codex-beta-features",
  "x-codex-installation-id",
  "x-codex-parent-thread-id",
  "x-codex-turn-metadata",
  "x-codex-turn-state",
  "x-codex-window-id",
  "x-oai-attestation",
  "x-openai-subagent",
  "x-responsesapi-include-timing-metrics",
  "content-type",
  "accept",
]);

export function selectNativeForwardHeaders(
  incoming: IncomingMessage["headers"],
): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "accept-encoding": "identity",
  };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (!NATIVE_HEADER_ALLOWLIST.has(lower)) continue;
    headers[lower] = Array.isArray(value) ? value.join(", ") : value;
  }
  return headers;
}

/** Local Codex login tokens — used when the hop request omitted ChatGPT auth. */
export function loadCodexHomeAuth(
  env: NodeJS.ProcessEnv = process.env,
): { authorization?: string; accountId?: string } {
  try {
    const home = env.CODEX_HOME?.trim() || join(homedir(), ".codex");
    const authPath = join(home, "auth.json");
    if (!existsSync(authPath)) return {};
    const parsed = JSON.parse(readFileSync(authPath, "utf8")) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.tokens)) return {};
    const token = parsed.tokens.access_token;
    const accountId = parsed.tokens.account_id;
    if (typeof token !== "string" || !token.trim()) return {};
    return {
      authorization: `Bearer ${token.trim()}`,
      ...(typeof accountId === "string" && accountId.trim()
        ? { accountId: accountId.trim() }
        : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Live search for adapter web_search fulfill: ChatGPT alpha/search when authed,
 * else DuckDuckGo HTML. Never invents via LLM.
 */
export async function searchViaChatgptAlpha(input: {
  readonly query: string;
  readonly options: ForwarderOptions;
  readonly authorization?: string;
  readonly accountId?: string;
}): Promise<{
  output: string;
  source: "chatgpt" | "duckduckgo" | "tavily" | "chatgpt+enriched";
}> {
  const fetchImpl = input.options.fetchImpl ?? fetch;
  const query = input.query.trim();
  if (!query) return { output: "Empty search query.", source: "duckduckgo" };

  const homeAuth = loadCodexHomeAuth();
  const authorization = input.authorization?.trim() || homeAuth.authorization;
  const accountId = input.accountId?.trim() || homeAuth.accountId;

  if (authorization) {
    const nativeBase = input.options.nativeBaseUrl ?? DEFAULT_CODEX_NATIVE_BASE_URL;
    const timeoutMs = resolveChatgptSearchTimeoutMs();
    const body = {
      id: `search_${randomUUID()}`,
      model:
        process.env.ROLE_MODEL_CODEX_SEARCH_MODEL?.trim() ||
        "gpt-5.4",
      commands: { search_query: [{ q: query }] },
    };
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        authorization,
        ...(accountId ? { "chatgpt-account-id": accountId } : {}),
      };
      const upstream = await fetchImpl(chatgptAlphaSearchUrl(nativeBase), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await upstream.text();
      if (upstream.ok) {
        let primary = "";
        try {
          const parsed = JSON.parse(text) as unknown;
          if (isRecord(parsed) && typeof parsed.output === "string" && parsed.output.trim()) {
            primary = parsed.output;
          }
        } catch {
          // fall through
        }
        if (!primary && text.trim()) primary = text.slice(0, 12000);
        if (primary) {
          const enriched = await enrichWeakSearchEvidence({
            query,
            primaryOutput: primary,
            fetchImpl,
          });
          return { output: enriched.output, source: enriched.source };
        }
      }
      return {
        output: `ChatGPT alpha/search failed (${upstream.status}): ${text.slice(0, 500)}`,
        source: "chatgpt",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        output: `ChatGPT alpha/search error: ${message.slice(0, 500)}`,
        source: "chatgpt",
      };
    }
  }

  const ddg = await searchWebLive(query, fetchImpl);
  return { output: ddg.output, source: "duckduckgo" };
}

/** Max search→continue batches before a last-resort stop-search hop. */
const MAX_WEB_SEARCH_CONTINUES = 6;

function isWebSearchToolDef(tool: unknown): boolean {
  if (!isRecord(tool)) return false;
  if (tool.type === "web_search") return true;
  if (tool.type === "function" && typeof tool.name === "string") {
    return tool.name === "web_search" || tool.name.endsWith("__web_search");
  }
  return false;
}

/** True when the outbound request offers callable tools beyond web_search. */
export function outboundHasNonWebSearchTools(payload: unknown): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.tools)) return false;
  return payload.tools.some((tool) => isRecord(tool) && !isWebSearchToolDef(tool));
}

/** Drop web_search from tools so the model can keep shell/apply_patch/etc. */
export function withoutWebSearchTools(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  return {
    ...payload,
    tools: tools.filter((tool) => !isWebSearchToolDef(tool)),
  };
}

type CollectedSearchHit = {
  readonly query: string;
  readonly source: "chatgpt" | "duckduckgo" | "deduped" | "tavily" | "chatgpt+enriched";
  readonly output: string;
};

function isWebSearchOutputItem(
  item: Record<string, unknown>,
  reverseMap: Map<string, BridgeReverseEntry>,
): boolean {
  if (item.type === "web_search_call") return true;
  return isWebSearchFunctionCall(item, reverseMap);
}

/**
 * True when the model hop also requested client-owned tools (update_plan, shell,
 * apply_patch, MCP, …). Adapter must not fulfill+continue web_search in that
 * case — continuing leaves those call_ids unpaired and DeepSeek/OpenAI reject
 * with "insufficient tool messages" (empty Desktop reply). Hand the whole hop
 * back to Codex instead (CLIProxyAPI-style: never forward unpaired transcripts).
 */
export function outputHasNonWebSearchClientTools(
  payload: unknown,
  reverseMap: Map<string, BridgeReverseEntry>,
): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.output)) return false;
  return payload.output.some((item) => {
    if (!isRecord(item)) return false;
    if (isWebSearchOutputItem(item, reverseMap)) return false;
    return (
      item.type === "function_call" ||
      item.type === "custom_tool_call" ||
      item.type === "tool_search_call"
    );
  });
}

/**
 * Only auto-fulfill+continue web_search when it is the sole client tool work
 * in this hop. Mixed hops use fulfill-in-place instead (see
 * `fulfillWebSearchAlongsideClientTools`) so we never hand Codex a client
 * `web_search_call` (native search / subscription quota) while update_plan
 * etc. remain open.
 */
export function shouldAutoFulfillWebSearch(
  payload: unknown,
  reverseMap: Map<string, BridgeReverseEntry>,
  fulfillEnabled: boolean,
): boolean {
  if (!fulfillEnabled || !isRecord(payload) || !Array.isArray(payload.output)) {
    return false;
  }
  const hasSearch = payload.output.some(
    (item) => isRecord(item) && isWebSearchOutputItem(item, reverseMap),
  );
  if (!hasSearch) return false;
  return !outputHasNonWebSearchClientTools(payload, reverseMap);
}

/** True when shimmed web_search shares the hop with other client tools. */
export function shouldFulfillWebSearchAlongsideClientTools(
  payload: unknown,
  reverseMap: Map<string, BridgeReverseEntry>,
  fulfillEnabled: boolean,
): boolean {
  if (!fulfillEnabled || !isRecord(payload) || !Array.isArray(payload.output)) {
    return false;
  }
  const hasSearch = payload.output.some(
    (item) => isRecord(item) && isWebSearchOutputItem(item, reverseMap),
  );
  if (!hasSearch) return false;
  return outputHasNonWebSearchClientTools(payload, reverseMap);
}

function callIdOf(item: Record<string, unknown>): string {
  if (typeof item.call_id === "string" && item.call_id) return item.call_id;
  if (typeof item.id === "string" && item.id) return item.id;
  return `call_ws_${randomUUID()}`;
}

function queryOfWebSearchItem(item: Record<string, unknown>): string {
  if (item.type === "web_search_call") {
    const action = isRecord(item.action) ? item.action : {};
    if (typeof action.query === "string" && action.query.trim()) return action.query.trim();
    if (Array.isArray(action.queries) && typeof action.queries[0] === "string") {
      return action.queries[0].trim();
    }
    return "";
  }
  return extractWebSearchQuery(item);
}

/** English + temporal fillers only — no domain/prompt-specific vocabulary. */
const WEB_SEARCH_QUERY_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "for",
  "of",
  "and",
  "or",
  "to",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "about",
  "vs",
  "versus",
  "into",
  "over",
  "under",
  "than",
  "then",
  "as",
]);

/**
 * Content tokens for search-query dedupe.
 * Strips calendar/temporal chrome so dated near-duplicates collapse.
 */
export function tokenizeWebSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
      " ",
    )
    .replace(/\b(20\d{2})\b/g, " ")
    .replace(/\b(\d{1,2})(st|nd|rd|th)?\b/g, " ")
    .replace(/\b(today|now|current|latest|as of|as-of)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 1 && !WEB_SEARCH_QUERY_STOPWORDS.has(t));
}

/** Stable key for logging / Set membership after near-dup resolution. */
export function normalizeWebSearchQuery(query: string): string {
  return tokenizeWebSearchQuery(query).slice(0, 6).join(" ");
}

/**
 * Near-duplicate detector: exact token match, shared leading subject, or Jaccard ≥ 0.5.
 * Domain-agnostic — works for any fact-lookup query variants.
 */
export function webSearchQueriesNearDuplicate(a: string, b: string): boolean {
  const ta = tokenizeWebSearchQuery(a);
  const tb = tokenizeWebSearchQuery(b);
  if (ta.length === 0 || tb.length === 0) return false;
  if (ta.join(" ") === tb.join(" ")) return true;
  // Front-loaded subject: first two content tokens match.
  if (ta[0] === tb[0] && (ta.length === 1 || tb.length === 1 || ta[1] === tb[1])) {
    return true;
  }
  const setA = new Set(ta);
  const setB = new Set(tb);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union > 0 && inter / union >= 0.5;
}

/** Strip ChatGPT SERP chrome and hard-cap length for user-visible fallbacks. */
export function sanitizeSearchSnippetForFallback(text: string, maxChars = 280): string {
  const withoutWordlim = text
    .replace(/\[wordlim:\s*\d+\][^\n]*/gi, "")
    .replace(/\bPublished:\s*[\d.]+\s*years?\s*ago[^\n]*/gi, "")
    .replace(/\bCrawled:\s*[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (withoutWordlim.length <= maxChars) return withoutWordlim;
  return `${withoutWordlim.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

/**
 * Last-resort assistant text when synthesis hops fail.
 * Must never echo raw ChatGPT `[wordlim:` SERP blobs.
 */
export function formatWebSearchFallbackAssistantText(
  hits: readonly CollectedSearchHit[],
): string {
  const queries = [...new Set(hits.map((h) => h.query).filter(Boolean))];
  const sources = [...new Set(hits.map((h) => h.source))];
  const snippets = hits
    .slice(0, 3)
    .map((h) => {
      const snip = sanitizeSearchSnippetForFallback(h.output, 220);
      return snip ? `- ${h.query || "(query)"}: ${snip}` : null;
    })
    .filter((line): line is string => Boolean(line));
  return [
    "Web search completed but could not synthesize an answer from the model turn.",
    `Queries tried: ${queries.join("; ") || "(none)"}`,
    `Source(s): ${sources.join(", ") || "unknown"}`,
    snippets.length > 0 ? "Truncated evidence:" : "No extractable snippets.",
    ...snippets,
  ].join("\n");
}

function assistantMessagePayload(
  current: Record<string, unknown>,
  text: string,
): Record<string, unknown> {
  return ensureCodexResponseId({
    ...current,
    status: "completed",
    incomplete_details: undefined,
    output: [
      {
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text }],
      },
    ],
  });
}

function responseHasAssistantText(payload: Record<string, unknown>): boolean {
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.some((item) => {
    if (!isRecord(item) || item.type !== "message") return false;
    if (!Array.isArray(item.content)) {
      return typeof item.content === "string" && item.content.trim().length > 0;
    }
    return item.content.some(
      (part) =>
        isRecord(part) &&
        typeof part.text === "string" &&
        part.text.trim().length > 0,
    );
  });
}

function extractUserMessagesForSynthesize(
  outboundPayload: Record<string, unknown>,
): unknown[] {
  const input = Array.isArray(outboundPayload.input) ? outboundPayload.input : [];
  const users = input.filter(
    (item) =>
      isRecord(item) &&
      (item.role === "user" ||
        (item.type === "message" && item.role === "user")),
  );
  if (users.length > 0) return users.slice(-3);
  return [
    {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Answer the user question using the search evidence provided.",
        },
      ],
    },
  ];
}

/**
 * Search-only terminal hop: no tools. Used when the request offers only web_search
 * (or when we must stop an endless search loop with nothing else to offer).
 */
async function forceSynthesizeAfterSearch(input: {
  readonly outboundPayload: Record<string, unknown>;
  readonly baseInput: unknown[];
  readonly hits: readonly CollectedSearchHit[];
  readonly options: ForwarderOptions;
  readonly headers: Record<string, string>;
}): Promise<Record<string, unknown> | null> {
  if (input.hits.length === 0) return null;
  const fetchImpl = input.options.fetchImpl ?? fetch;
  const upstream = `${normalizeEndpoint(input.options.upstreamEndpoint)}/v1/responses`;
  const evidence = input.hits
    .map((h, i) => {
      const body = sanitizeSearchSnippetForFallback(h.output, 900);
      return `### Result ${i + 1}\nquery: ${h.query}\nsource: ${h.source}\n${body}`;
    })
    .join("\n\n");
  const slimInput = [
    ...extractUserMessagesForSynthesize(input.outboundPayload),
    {
      type: "message",
      role: "system",
      content: [
        {
          type: "text",
          text: ["Search evidence:", "", evidence].join("\n"),
        },
      ],
    },
  ];
  const nextBody = {
    ...input.outboundPayload,
    tools: [],
    tool_choice: "none",
    stream: false,
    input: slimInput,
  };
  void input.baseInput;
  try {
    const response = await fetchImpl(upstream, {
      method: "POST",
      headers: input.headers,
      body: JSON.stringify(nextBody),
    });
    const text = await response.text();
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) return null;
    if (!responseHasAssistantText(parsed)) return null;
    const output = Array.isArray(parsed.output)
      ? parsed.output.filter((item) => isRecord(item) && item.type === "message")
      : [];
    if (output.length === 0) return null;
    return ensureCodexResponseId({
      ...parsed,
      status: "completed",
      incomplete_details: undefined,
      output,
    });
  } catch {
    return null;
  }
}

/**
 * Multi-tool path: stop offering web_search but keep shell/apply_patch/etc.
 * Returns the upstream hop so Desktop can fulfill client tools.
 */
async function continueWithoutWebSearch(input: {
  readonly outboundPayload: Record<string, unknown>;
  readonly continuationInput: unknown[];
  readonly options: ForwarderOptions;
  readonly headers: Record<string, string>;
}): Promise<Record<string, unknown> | null> {
  const fetchImpl = input.options.fetchImpl ?? fetch;
  const upstream = `${normalizeEndpoint(input.options.upstreamEndpoint)}/v1/responses`;
  const base = withoutWebSearchTools(input.outboundPayload);
  const nextBody = {
    ...base,
    stream: false,
    input: input.continuationInput,
  };
  try {
    const response = await fetchImpl(upstream, {
      method: "POST",
      headers: input.headers,
      body: JSON.stringify(nextBody),
    });
    const text = await response.text();
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) return null;
    return ensureCodexResponseId(parsed);
  } catch {
    return null;
  }
}

/**
 * After search evidence is collected: keep other tools when present; only do a
 * terminal text synthesize when this turn is search-only (or model keeps
 * requesting only web_search after search was stripped).
 */
async function finalizeAfterSearchEvidence(input: {
  readonly outboundPayload: Record<string, unknown>;
  readonly continuationInput: unknown[];
  readonly hits: readonly CollectedSearchHit[];
  readonly options: ForwarderOptions;
  readonly headers: Record<string, string>;
  readonly current: Record<string, unknown>;
  readonly reverseMap: Map<string, BridgeReverseEntry>;
}): Promise<Record<string, unknown>> {
  if (outboundHasNonWebSearchTools(input.outboundPayload)) {
    const continued = await continueWithoutWebSearch({
      outboundPayload: input.outboundPayload,
      continuationInput: input.continuationInput,
      options: input.options,
      headers: input.headers,
    });
    if (continued) {
      const output = Array.isArray(continued.output) ? continued.output : [];
      const stillOnlySearch =
        output.length > 0 &&
        output.every(
          (item) =>
            !isRecord(item) ||
            item.type === "message" ||
            item.type === "reasoning" ||
            isWebSearchOutputItem(item, input.reverseMap),
        ) &&
        output.some(
          (item) => isRecord(item) && isWebSearchOutputItem(item, input.reverseMap),
        );
      if (!stillOnlySearch) {
        return continued;
      }
    }
  }

  const synthesized = await forceSynthesizeAfterSearch({
    outboundPayload: input.outboundPayload,
    baseInput: input.continuationInput,
    hits: input.hits,
    options: input.options,
    headers: input.headers,
  });
  if (synthesized) return synthesized;
  return assistantMessagePayload(
    input.current,
    formatWebSearchFallbackAssistantText(input.hits),
  );
}

/**
 * When the routed model emits shimmed web_search function_calls, fulfill them
 * via ChatGPT alpha/search and continue the role-model turn. Codex Desktop's
 * client web_search_call continue path ends the turn with no answer.
 */
export async function continueRoleModelAfterWebSearch(input: {
  readonly outboundPayload: Record<string, unknown>;
  readonly responsePayload: Record<string, unknown>;
  readonly reverseMap: Map<string, BridgeReverseEntry>;
  readonly options: ForwarderOptions;
  readonly headers: Record<string, string>;
}): Promise<Record<string, unknown>> {
  const fetchImpl = input.options.fetchImpl ?? fetch;
  const upstream = `${normalizeEndpoint(input.options.upstreamEndpoint)}/v1/responses`;
  let current = input.responsePayload;
  let baseInput = Array.isArray(input.outboundPayload.input)
    ? [...input.outboundPayload.input]
    : [];
  const seenQueries: string[] = [];
  const hits: CollectedSearchHit[] = [];
  let forceSynthesize = false;

  for (let attempt = 0; attempt < MAX_WEB_SEARCH_CONTINUES; attempt += 1) {
    const output = Array.isArray(current.output) ? current.output : [];
    const searchCalls = output.filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && isWebSearchOutputItem(item, input.reverseMap),
    );
    if (searchCalls.length === 0) return current;

    const otherOutput = output.filter(
      (item) => !(isRecord(item) && isWebSearchOutputItem(item, input.reverseMap)),
    );
    const continuation: unknown[] = [...baseInput, ...otherOutput];
    let batchHadNewQuery = false;

    for (const call of searchCalls) {
      const query = queryOfWebSearchItem(call);
      const callId = callIdOf(call);
      const name =
        typeof call.name === "string" && call.name
          ? call.name
          : "web_search";
      continuation.push({
        type: "function_call",
        call_id: callId,
        id: callId,
        name,
        arguments:
          typeof call.arguments === "string"
            ? call.arguments
            : JSON.stringify(query ? { query } : {}),
      });

      const priorQuery = seenQueries.find((q) => webSearchQueriesNearDuplicate(q, query));
      if (query && priorQuery) {
        const prior = hits.find((h) => webSearchQueriesNearDuplicate(h.query, query));
        hits.push({
          query,
          source: "deduped",
          output: prior?.output ?? "",
        });
        continuation.push({
          type: "function_call_output",
          call_id: callId,
          output: [
            "source=deduped",
            `Near-duplicate of prior query "${priorQuery}".`,
            prior?.output
              ? `\nPrior evidence:\n${sanitizeSearchSnippetForFallback(prior.output, 800)}`
              : "",
          ].join("\n"),
        });
        forceSynthesize = true;
        continue;
      }

      if (query) seenQueries.push(query);
      batchHadNewQuery = true;
      const searched = await searchViaChatgptAlpha({
        query,
        options: input.options,
        authorization: input.headers.authorization,
        accountId: input.headers["chatgpt-account-id"],
      });
      hits.push({ query, source: searched.source, output: searched.output });
      continuation.push({
        type: "function_call_output",
        call_id: callId,
        output: [`source=${searched.source}`, "", searched.output].join("\n"),
      });
    }

    if (forceSynthesize && !batchHadNewQuery) {
      // Entire batch was near-duplicate — continue with tools intact so the model
      // can run shell/apply_patch or issue a *distinct* new search. Do not strip
      // web_search here (that left Desktop marking missing facts as UNKNOWN).
      forceSynthesize = false;
    }

    // Continue the model with search results (do not short-circuit mid-loop).
    const nextBody = {
      ...input.outboundPayload,
      input: continuation,
      stream: false,
    };
    const response = await fetchImpl(upstream, {
      method: "POST",
      headers: input.headers,
      body: JSON.stringify(nextBody),
    });
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!isRecord(parsed)) {
        return finalizeAfterSearchEvidence({
          outboundPayload: input.outboundPayload,
          continuationInput: continuation,
          hits,
          options: input.options,
          headers: input.headers,
          current,
          reverseMap: input.reverseMap,
        });
      }
      current = parsed;
      baseInput = continuation;
    } catch {
      return finalizeAfterSearchEvidence({
        outboundPayload: input.outboundPayload,
        continuationInput: continuation,
        hits,
        options: input.options,
        headers: input.headers,
        current,
        reverseMap: input.reverseMap,
      });
    }
  }

  // Exhausted continues while model still requests search — last resort only.
  const finalOutput = Array.isArray(current.output) ? current.output : [];
  if (
    finalOutput.some(
      (item) => isRecord(item) && isWebSearchOutputItem(item, input.reverseMap),
    ) ||
    hits.length > 0
  ) {
    return finalizeAfterSearchEvidence({
      outboundPayload: input.outboundPayload,
      continuationInput: baseInput,
      hits,
      options: input.options,
      headers: input.headers,
      current,
      reverseMap: input.reverseMap,
    });
  }
  return current;
}

/**
 * Mixed-hop path: fulfill web_search via ChatGPT alpha/search (adapter auth)
 * without upstream continue. Keeps update_plan/shell/apply_patch for Desktop.
 *
 * Why: restoring `web_search_call` with execution=client makes Codex run native
 * search against the user subscription — quota/outage then looks like
 * "web_search unavailable". Continuing upstream with open client tools causes
 * unpaired tool_calls 400. Fulfill-in-place avoids both.
 */
export async function fulfillWebSearchAlongsideClientTools(input: {
  readonly responsePayload: Record<string, unknown>;
  readonly reverseMap: Map<string, BridgeReverseEntry>;
  readonly options: ForwarderOptions;
  readonly headers: Record<string, string>;
}): Promise<Record<string, unknown>> {
  const output = Array.isArray(input.responsePayload.output)
    ? input.responsePayload.output
    : [];
  const kept: unknown[] = [];
  const evidenceBlocks: string[] = [];
  let fulfilled = 0;

  for (const item of output) {
    if (!isRecord(item) || !isWebSearchOutputItem(item, input.reverseMap)) {
      kept.push(item);
      continue;
    }
    const query = queryOfWebSearchItem(item);
    const searched = await searchViaChatgptAlpha({
      query,
      options: input.options,
      authorization: input.headers.authorization,
      accountId: input.headers["chatgpt-account-id"],
    });
    fulfilled += 1;
    evidenceBlocks.push(
      [
        `### query: ${query || "(empty)"}`,
        `source=${searched.source}`,
        sanitizeSearchSnippetForFallback(searched.output, 1500),
      ].join("\n"),
    );
  }

  if (fulfilled === 0) return input.responsePayload;

  const evidenceMessage = {
    type: "message",
    role: "assistant",
    status: "completed",
    content: [
      {
        type: "output_text",
        text: ["Search evidence:", "", ...evidenceBlocks].join("\n"),
      },
    ],
  };

  return ensureCodexResponseId({
    ...input.responsePayload,
    status: "completed",
    incomplete_details: undefined,
    output: [evidenceMessage, ...kept],
  });
}

/** Drop any leftover search tool items so Codex never runs client web_search_call. */
export function stripWebSearchCallsFromOutput(
  payload: unknown,
  reverseMap: Map<string, BridgeReverseEntry>,
): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.output)) return payload;
  const output = payload.output.filter(
    (item) => !(isRecord(item) && isWebSearchOutputItem(item, reverseMap)),
  );
  if (output.length === 0) {
    return ensureCodexResponseId({
      ...payload,
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: "Search ran but no assistant message was produced.",
            },
          ],
        },
      ],
    });
  }
  return ensureCodexResponseId({ ...payload, status: "completed", output });
}

/**
 * Codex Desktop rejects `response.completed` when `response.id` is missing
 * (`failed to parse ResponseCompleted: missing field id`).
 */
export function ensureCodexResponseId(
  payload: Record<string, unknown>,
  fallbackId = `resp_${randomUUID()}`,
): Record<string, unknown> {
  if (typeof payload.id === "string" && payload.id.trim()) return payload;
  return { ...payload, id: fallbackId };
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Codex Desktop compresses request bodies (commonly zstd).
 * Aligned with duolahypercho/codex-router `decodeBody`.
 */
export function decodeRequestBody(raw: Buffer, contentEncoding?: string): Buffer {
  if (!raw.length) return raw;
  let encodings = String(contentEncoding ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && part !== "identity")
    .reverse();

  const looksGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
  const looksZstd = raw.length >= 4 && raw[0] === 0x28 && raw[1] === 0xb5 && raw[2] === 0x2f && raw[3] === 0xfd;
  if (encodings.length === 0) {
    if (looksZstd) encodings = ["zstd"];
    else if (looksGzip) encodings = ["gzip"];
  }

  let decoded = raw;
  const options = { maxOutputLength: MAX_REQUEST_BODY_BYTES };
  for (const encoding of encodings) {
    if (encoding === "zstd") decoded = zstdDecompressSync(decoded, options);
    else if (encoding === "gzip" || encoding === "x-gzip") decoded = gunzipSync(decoded, options);
    else if (encoding === "deflate") decoded = inflateSync(decoded, options);
    else if (encoding === "br") decoded = brotliDecompressSync(decoded, options);
    else {
      const error = new Error(`Unsupported Content-Encoding: ${encoding}`);
      (error as Error & { status?: number }).status = 415;
      throw error;
    }
  }
  if (decoded.length > MAX_REQUEST_BODY_BYTES) {
    throw new Error(`Decompressed request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes`);
  }
  return decoded;
}

function parseJsonBody(raw: Buffer): unknown {
  const text = raw.toString("utf8").replace(/^\uFEFF/, "");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function writeInvalidBodyDump(
  stateFilePath: string,
  req: IncomingMessage,
  raw: Buffer,
  decodeError?: unknown,
): void {
  try {
    const dir = dirname(stateFilePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "last-invalid-body.bin"), raw);
    writeFileSync(
      join(dir, "last-invalid-body.meta.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          method: req.method,
          url: req.url,
          contentType: req.headers["content-type"] ?? null,
          contentEncoding: req.headers["content-encoding"] ?? null,
          contentLength: req.headers["content-length"] ?? null,
          byteLength: raw.length,
          headHex: raw.subarray(0, 32).toString("hex"),
          decodeError: decodeError instanceof Error ? decodeError.message : decodeError ? String(decodeError) : null,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    // diagnostics are best-effort
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Codex always attaches a `reasoning` object (often `{ effort: "none" }`).
 * role-model infers `reasoning.control` from any `reasoning`/`thinking` object,
 * which fails eligibility for aliases that do not declare that capability.
 * Strip inert none-effort reasoning before upstream proxy; keep non-none effort.
 */
export function stripInertCodexReasoning(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  const reasoning = payload.reasoning;
  if (!isRecord(reasoning)) return payload;
  const effort = reasoning.effort;
  if (effort !== undefined && effort !== null && effort !== "none") {
    return payload;
  }
  const { reasoning: _omit, ...rest } = payload;
  return rest;
}

/**
 * Codex Responses payloads use `role: "developer"`. Some openai-compatible
 * remotes (e.g. DeepSeek) reject that role after runtime chat translation.
 * Map developer → system before upstream proxy.
 */
export function normalizeCodexDeveloperRoles(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.input)) return payload;
  const input = payload.input.map((item) => {
    if (!isRecord(item) || item.role !== "developer") return item;
    return { ...item, role: "system" };
  });
  return { ...payload, input };
}

/**
 * Codex content parts use `input_text` / `output_text`. Some openai-compatible
 * remotes expect chat-style `text` parts after Responses→chat translation.
 */
export function normalizeCodexContentPartTypes(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.input)) return payload;
  const input = payload.input.map((item) => {
    if (!isRecord(item) || !Array.isArray(item.content)) return item;
    const content = item.content.map((part) => {
      if (!isRecord(part)) return part;
      if (part.type === "input_text" || part.type === "output_text") {
        return { ...part, type: "text" };
      }
      return part;
    });
    return { ...item, content };
  });
  return { ...payload, input };
}

const DROP_INPUT_ITEM_TYPES = new Set([
  "reasoning",
  "item_reference",
  "compaction_trigger",
  "file_search_call",
  "code_interpreter_call",
  "image_generation_call",
  "local_shell_call",
  "mcp_call",
  "mcp_list_tools",
  "mcp_approval_request",
]);

function normalizeMessageContent(content: unknown): string | null | unknown[] | undefined {
  if (typeof content === "string" || content === null) return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (!isRecord(part)) return part;
      if (part.type === "input_text" || part.type === "output_text") {
        return { ...part, type: "text" };
      }
      return part;
    });
  }
  if (isRecord(content)) {
    const part =
      content.type === "input_text" || content.type === "output_text"
        ? { ...content, type: "text" }
        : content;
    return [part];
  }
  return undefined;
}

/**
 * role-model's Responses→chat bridge only accepts chat messages and function
 * call items. Codex Desktop also ships reasoning/item_reference/etc. in `input`.
 * Drop or reshape those before upstream (codex-router filters compaction; we
 * additionally strip items that fail runtime `isOpenAIChatCompletionsMessage`).
 */
export function normalizeCodexInputForRoleModel(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if (typeof payload.input === "string") return payload;
  if (!Array.isArray(payload.input)) return payload;

  const input: unknown[] = [];
  for (const item of payload.input) {
    if (!isRecord(item)) continue;
    const type = typeof item.type === "string" ? item.type : undefined;

    if (type && DROP_INPUT_ITEM_TYPES.has(type)) continue;

    if (type === "compaction") {
      const summary =
        typeof item.encrypted_content === "string" && item.encrypted_content.trim()
          ? item.encrypted_content
          : null;
      input.push({
        role: "user",
        content: summary
          ? `Another language model started this task and produced a continuation summary. Use it to continue without repeating completed work:\n\n${summary}`
          : "[Earlier conversation history was compacted.]",
      });
      continue;
    }

    if (type === "function_call" || type === "function_call_output") {
      input.push(item);
      continue;
    }

    if (type === "custom_tool_call") {
      // Codex freeform custom tools (apply_patch) → JSON function_call for chat upstream.
      const name = typeof item.name === "string" ? item.name : "custom";
      const freeform =
        typeof item.input === "string"
          ? item.input
          : item.input === undefined
            ? ""
            : JSON.stringify(item.input);
      const callId =
        typeof item.call_id === "string"
          ? item.call_id
          : typeof item.id === "string"
            ? item.id
            : undefined;
      input.push({
        type: "function_call",
        ...(typeof item.id === "string" ? { id: item.id } : {}),
        ...(callId ? { call_id: callId } : {}),
        name,
        arguments: JSON.stringify({ input: freeform }),
        ...(typeof item.status === "string" ? { status: item.status } : {}),
      });
      continue;
    }

    if (type === "custom_tool_call_output") {
      const callId =
        typeof item.call_id === "string"
          ? item.call_id
          : typeof item.id === "string"
            ? item.id
            : undefined;
      if (!callId) continue;
      input.push({
        type: "function_call_output",
        call_id: callId,
        output:
          typeof item.output === "string"
            ? item.output
            : JSON.stringify(item.output ?? ""),
      });
      continue;
    }

    if (type === "tool_search_call") {
      const callId =
        typeof item.call_id === "string"
          ? item.call_id
          : typeof item.id === "string"
            ? item.id
            : undefined;
      const args = isRecord(item.arguments)
        ? item.arguments
        : typeof item.arguments === "string"
          ? (() => {
              try {
                return JSON.parse(item.arguments) as unknown;
              } catch {
                return { query: item.arguments };
              }
            })()
          : {};
      input.push({
        type: "function_call",
        ...(callId ? { call_id: callId, id: callId } : {}),
        name: "tool_search",
        arguments: JSON.stringify(args ?? {}),
      });
      continue;
    }

    if (type === "tool_search_output") {
      const callId =
        typeof item.call_id === "string"
          ? item.call_id
          : typeof item.id === "string"
            ? item.id
            : undefined;
      if (!callId) continue;
      input.push({
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify({
          tools: Array.isArray(item.tools) ? item.tools : [],
          status: item.status ?? "completed",
        }),
      });
      continue;
    }

    if (type === "web_search_call") {
      const callId =
        typeof item.call_id === "string"
          ? item.call_id
          : typeof item.id === "string"
            ? item.id
            : undefined;
      if (!callId) continue;
      const action = isRecord(item.action) ? item.action : {};
      const query =
        typeof action.query === "string"
          ? action.query
          : Array.isArray(action.queries) && typeof action.queries[0] === "string"
            ? action.queries[0]
            : "";
      // Codex keeps search results on the call item (no separate output). Pair a
      // synthetic function_call_output so DeepSeek chat conversion never sees an
      // unpaired tool_calls message.
      const status = typeof item.status === "string" ? item.status : "completed";
      input.push({
        type: "function_call",
        call_id: callId,
        id: callId,
        name: "web_search",
        arguments: JSON.stringify(query ? { query } : {}),
      });
      input.push({
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify({
          status,
          ...(query ? { query } : {}),
          ...(typeof item.output === "string" ? { result: item.output } : {}),
          note: "web_search_call history (Codex client search)",
        }),
      });
      continue;
    }

    if (type !== undefined && type !== "message") {
      // Unknown Responses item — skip rather than fail the whole turn.
      continue;
    }

    if (typeof item.role !== "string") continue;
    const content = normalizeMessageContent(item.content);
    if (content === undefined) continue;
    const role = item.role === "developer" ? "system" : item.role;
    input.push({ ...item, role, content });
  }

  return { ...payload, input: repairCodexToolCallInputOrder(input) };
}

/**
 * role-model SSE for openai-compat remotes can omit Codex-required frames:
 * - `response.content_part.added` before `response.output_text.delta`
 * - `response.output_text.done` / `content_part.done` / `output_item.done`
 * - `response.completed.response.output` (Desktop clears the turn without it)
 * - `usage.total_tokens` on `response.completed`
 */
export interface CodexSseNormalizeState {
  readonly seenContentPartItemIds: Set<string>;
  readonly seenItemAddedIds: Set<string>;
  readonly textByItemId: Map<string, string>;
  readonly outputIndexByItemId: Map<string, number>;
  readonly doneItemIds: Set<string>;
  readonly itemsById: Map<string, Record<string, unknown>>;
  readonly seenFunctionArgsDone: Set<string>;
  pendingToolCallsIncomplete: Record<string, unknown> | null;
  lastResponseSnapshot: Record<string, unknown> | null;
  emittedTerminal: boolean;
}

export function createCodexSseNormalizeState(): CodexSseNormalizeState {
  return {
    seenContentPartItemIds: new Set(),
    seenItemAddedIds: new Set(),
    textByItemId: new Map(),
    outputIndexByItemId: new Map(),
    doneItemIds: new Set(),
    itemsById: new Map(),
    seenFunctionArgsDone: new Set(),
    pendingToolCallsIncomplete: null,
    lastResponseSnapshot: null,
    emittedTerminal: false,
  };
}

function dataEvent(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}`;
}

function closeOpenMessageItems(state: CodexSseNormalizeState): string[] {
  const out: string[] = [];
  for (const [itemId, text] of state.textByItemId) {
    if (state.doneItemIds.has(itemId)) continue;
    const outputIndex = state.outputIndexByItemId.get(itemId) ?? 0;
    const base = state.itemsById.get(itemId) ?? { type: "message", id: itemId };
    const item = {
      ...base,
      type: "message",
      id: itemId,
      role: typeof base.role === "string" ? base.role : "assistant",
      status: "completed",
      content: [{ type: "output_text", text }],
    };
    out.push(
      dataEvent({
        type: "response.output_text.done",
        item_id: itemId,
        output_index: outputIndex,
        text,
      }),
    );
    out.push(
      dataEvent({
        type: "response.content_part.done",
        item_id: itemId,
        output_index: outputIndex,
        content_index: 0,
        part: { type: "output_text", text },
      }),
    );
    out.push(
      dataEvent({
        type: "response.output_item.done",
        output_index: outputIndex,
        item,
      }),
    );
    state.doneItemIds.add(itemId);
    state.itemsById.set(itemId, item);
  }
  return out;
}

function collectedOutputItems(state: CodexSseNormalizeState): unknown[] {
  const items: { index: number; item: Record<string, unknown> }[] = [];
  for (const itemId of state.doneItemIds) {
    const item = state.itemsById.get(itemId);
    if (!item) continue;
    items.push({
      index: state.outputIndexByItemId.get(itemId) ?? Number.MAX_SAFE_INTEGER,
      item,
    });
  }
  // Sort by output_index so assistant message text precedes function_call. Wrong order
  // makes the next Codex turn convert to chat as tool_calls → assistant → tool (400).
  items.sort((a, b) => a.index - b.index);
  return items.map((entry) => entry.item);
}

/**
 * DeepSeek/chat conversion requires each assistant `tool_calls` message to be
 * immediately followed by `role:tool` messages. Codex sometimes places an
 * assistant commentary message between `function_call` and `function_call_output`
 * (or emits call before commentary in `output`). Reorder so commentary precedes
 * each call/output pair.
 */
export function repairCodexToolCallInputOrder(input: readonly unknown[]): unknown[] {
  const result: unknown[] = [];
  let pendingCalls: Record<string, unknown>[] = [];
  const deferredOutputs = new Map<string, Record<string, unknown>>();

  const callIdOf = (item: Record<string, unknown>): string =>
    typeof item.call_id === "string"
      ? item.call_id
      : typeof item.id === "string"
        ? item.id
        : "";

  const flushCompletePairs = (): void => {
    const stillPending: Record<string, unknown>[] = [];
    for (const call of pendingCalls) {
      const id = callIdOf(call);
      const output = id ? deferredOutputs.get(id) : undefined;
      if (output) {
        result.push(call, output);
        deferredOutputs.delete(id);
      } else {
        stillPending.push(call);
      }
    }
    pendingCalls = stillPending;
  };

  for (const item of input) {
    if (!isRecord(item)) {
      result.push(item);
      continue;
    }
    const type = typeof item.type === "string" ? item.type : "";
    if (type === "function_call") {
      pendingCalls.push(item);
      flushCompletePairs();
      continue;
    }
    if (type === "function_call_output") {
      const id = callIdOf(item);
      const idx = pendingCalls.findIndex((call) => callIdOf(call) === id);
      if (idx >= 0) {
        const earlier = pendingCalls.slice(0, idx);
        const call = pendingCalls[idx]!;
        const later = pendingCalls.slice(idx + 1);
        pendingCalls = earlier;
        flushCompletePairs();
        result.push(call, item);
        pendingCalls = later;
      } else if (id) {
        deferredOutputs.set(id, item);
      } else {
        result.push(item);
      }
      continue;
    }

    // Regular item: keep pending calls after this message so chat conversion sees
    // commentary, then tool_calls, then tool results.
    flushCompletePairs();
    result.push(item);
  }

  flushCompletePairs();
  // DeepSeek rejects assistant tool_calls without matching tool messages. Drop
  // orphan outputs; synthesize stub outputs for unpaired calls still in history.
  for (const call of pendingCalls) {
    result.push(call);
    const id = callIdOf(call);
    if (!id) continue;
    result.push({
      type: "function_call_output",
      call_id: id,
      output: JSON.stringify({
        status: "incomplete",
        note: "Tool result missing from Codex history; stubbed for chat upstream.",
      }),
    });
  }
  // Orphan outputs without a call cannot form a valid pair — drop them.
  return result;
}

export function normalizeCodexResponsesSseEvent(
  dataLine: string,
  state: CodexSseNormalizeState,
): string[] {
  if (!dataLine.startsWith("data:")) return [dataLine];
  const raw = dataLine.slice(5).trim();
  if (!raw || raw === "[DONE]") return [dataLine];
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [dataLine];
  }
  const type = typeof event.type === "string" ? event.type : "";
  const out: string[] = [];

  if (type === "response.created" && isRecord(event.response)) {
    state.lastResponseSnapshot = { ...event.response };
    out.push(dataEvent(event));
    return out;
  }

  if (type === "response.output_item.added" && isRecord(event.item)) {
    const item = { ...event.item };
    const itemId = typeof item.id === "string" ? item.id : "";
    const outputIndex = typeof event.output_index === "number" ? event.output_index : 0;
    if (itemId) {
      state.itemsById.set(itemId, item);
      state.outputIndexByItemId.set(itemId, outputIndex);
      state.seenItemAddedIds.add(itemId);
    }
    out.push(dataEvent({ ...event, item }));
    return out;
  }

  if (type === "response.content_part.added") {
    const itemId = typeof event.item_id === "string" ? event.item_id : "";
    if (itemId) state.seenContentPartItemIds.add(itemId);
    out.push(dataEvent(event));
    return out;
  }

  if (type === "response.output_text.delta") {
    const itemId = typeof event.item_id === "string" ? event.item_id : "";
    const outputIndex = typeof event.output_index === "number" ? event.output_index : 0;
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (itemId) {
      state.outputIndexByItemId.set(itemId, outputIndex);
      state.textByItemId.set(itemId, `${state.textByItemId.get(itemId) ?? ""}${delta}`);
      if (!state.seenItemAddedIds.has(itemId)) {
        // Codex CLI logs "OutputTextDelta without active item" and may abort
        // reconnect loops if message items are never announced.
        const item = state.itemsById.get(itemId) ?? {
          type: "message",
          id: itemId,
          role: "assistant",
          status: "in_progress",
          content: [],
        };
        state.itemsById.set(itemId, item);
        state.seenItemAddedIds.add(itemId);
        out.push(
          dataEvent({
            type: "response.output_item.added",
            output_index: outputIndex,
            item,
          }),
        );
      }
      if (!state.seenContentPartItemIds.has(itemId)) {
        state.seenContentPartItemIds.add(itemId);
        out.push(
          dataEvent({
            type: "response.content_part.added",
            item_id: itemId,
            output_index: outputIndex,
            content_index: 0,
            part: { type: "output_text", text: "" },
          }),
        );
      }
    }
    out.push(dataEvent(event));
    return out;
  }

  if (type === "response.function_call_arguments.delta") {
    const itemId = typeof event.item_id === "string" ? event.item_id : "";
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (itemId) {
      const existing = state.itemsById.get(itemId) ?? { type: "function_call", id: itemId };
      const prevArgs = typeof existing.arguments === "string" ? existing.arguments : "";
      state.itemsById.set(itemId, { ...existing, arguments: `${prevArgs}${delta}` });
    }
    out.push(dataEvent(event));
    return out;
  }

  if (type === "response.function_call_arguments.done") {
    const itemId = typeof event.item_id === "string" ? event.item_id : "";
    if (itemId) state.seenFunctionArgsDone.add(itemId);
    out.push(dataEvent(event));
    return out;
  }

  if (type === "response.output_item.done" && isRecord(event.item)) {
    const item = { ...event.item };
    const itemId = typeof item.id === "string" ? item.id : "";
    if (itemId) {
      state.doneItemIds.add(itemId);
      state.itemsById.set(itemId, item);
      if (item.type === "function_call" && !state.seenFunctionArgsDone.has(itemId)) {
        const args = typeof item.arguments === "string" ? item.arguments : "";
        const outputIndex = typeof event.output_index === "number" ? event.output_index : 0;
        state.seenFunctionArgsDone.add(itemId);
        out.push(
          dataEvent({
            type: "response.function_call_arguments.done",
            item_id: itemId,
            output_index: outputIndex,
            arguments: args,
          }),
        );
      }
    }
    out.push(dataEvent({ ...event, item }));
    return out;
  }

  if (type === "response.incomplete" && isRecord(event.response)) {
    state.lastResponseSnapshot = { ...event.response };
    const details = isRecord(event.response.incomplete_details)
      ? event.response.incomplete_details
      : null;
    if (details?.reason === "tool_calls") {
      // DeepSeek/runtime often ends tool turns as incomplete+tool_calls. Codex Desktop
      // treats that as "stream disconnected … reason: tool_calls". Hold and finalize
      // as response.completed once function_call items are collected.
      state.pendingToolCallsIncomplete = event;
      return out;
    }
    out.push(dataEvent(event));
    return out;
  }

  if (type === "response.completed" && isRecord(event.response)) {
    state.emittedTerminal = true;
    state.pendingToolCallsIncomplete = null;
    out.push(...closeOpenMessageItems(state));
    const response = ensureCodexResponseId({ ...event.response });
    const existingOutput = Array.isArray(response.output) ? response.output : [];
    if (existingOutput.length === 0) {
      response.output = collectedOutputItems(state);
    }
    if (isRecord(response.usage)) {
      const usage = { ...response.usage };
      const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
      const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
      if (typeof usage.total_tokens !== "number") {
        usage.total_tokens = inputTokens + outputTokens;
      }
      response.usage = usage;
    }
    if (typeof response.status !== "string") {
      response.status = "completed";
    }
    out.push(dataEvent({ ...event, type: "response.completed", response }));
    return out;
  }

  out.push(dataEvent(event));
  return out;
}

/**
 * End-of-stream finalize: always emit response.completed when the upstream stream
 * ends without one (held incomplete+tool_calls, or abrupt close after items).
 */
export function finalizeCodexResponsesSse(state: CodexSseNormalizeState): string[] {
  if (state.emittedTerminal) return [];
  const out = [...closeOpenMessageItems(state)];
  const pending = state.pendingToolCallsIncomplete;
  const baseSource =
    pending && isRecord(pending.response) ? pending.response : state.lastResponseSnapshot;
  const hasWork =
    Boolean(baseSource) ||
    state.doneItemIds.size > 0 ||
    state.textByItemId.size > 0 ||
    state.itemsById.size > 0;
  if (!hasWork) return out;

  const base: Record<string, unknown> = isRecord(baseSource)
    ? { ...baseSource }
    : { id: "resp_adapter_synth" };
  const usage = isRecord(base.usage) ? { ...base.usage } : {};
  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
  if (typeof usage.total_tokens !== "number") {
    usage.total_tokens = inputTokens + outputTokens;
  }
  const output = collectedOutputItems(state);
  const response = ensureCodexResponseId({
    ...base,
    status: "completed",
    output,
    usage,
  });
  delete (response as { incomplete_details?: unknown }).incomplete_details;
  out.push(
    dataEvent({
      type: "response.completed",
      response,
    }),
  );
  state.emittedTerminal = true;
  state.pendingToolCallsIncomplete = null;
  return out;
}

export function rewriteIncompleteToolCallsJsonPayload(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  const status = typeof payload.status === "string" ? payload.status : "";
  const details = isRecord(payload.incomplete_details) ? payload.incomplete_details : null;
  const hasFunctionCall =
    Array.isArray(payload.output) &&
    payload.output.some((item) => isRecord(item) && item.type === "function_call");
  if (status === "incomplete" && details?.reason === "tool_calls" && hasFunctionCall) {
    const next = { ...payload, status: "completed" };
    delete (next as { incomplete_details?: unknown }).incomplete_details;
    return next;
  }
  // Some runtimes nest under response
  if (isRecord(payload.response)) {
    return { ...payload, response: rewriteIncompleteToolCallsJsonPayload(payload.response) };
  }
  return payload;
}

export function flushCodexResponsesSseBuffer(
  buffer: string,
  state: CodexSseNormalizeState,
): { readonly emitted: string; readonly rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const emittedChunks: string[] = [];
  for (const part of parts) {
    const lines = part.split("\n");
    for (const line of lines) {
      if (line.startsWith("data:")) {
        // Each JSON payload must be its own SSE event. Joining multiple `data:`
        // lines into one event concatenates them (SSE spec) and Codex then never
        // parses a clean `response.completed` → "stream closed before response.completed".
        for (const dataLine of normalizeCodexResponsesSseEvent(line, state)) {
          emittedChunks.push(`${dataLine}\n\n`);
        }
      } else if (line.length > 0) {
        emittedChunks.push(`${line}\n\n`);
      }
    }
  }
  return { emitted: emittedChunks.join(""), rest };
}

/**
 * Codex attaches hosted tool types (`namespace`, `web_search`, …) that remote
 * OpenAI-compat / Anthropic adapters reject. Keep only function tools for upstream.
 * (Unused on role-model hops: flattenCodexToolsForUpstream owns tool shaping there,
 * and hosted web_search is passed through for provider built-in search.)
 */
export function sanitizeCodexToolsForUpstream(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.tools)) return payload;
  const tools = payload.tools.filter(
    (tool) => isRecord(tool) && tool.type === "function",
  );
  return { ...payload, tools };
}

/**
 * Codex standalone web search (ext/web-search) POSTs to `{base_url}/alpha/search`.
 * With openai_base_url pointing at this adapter (`…/v1`), that is `/v1/alpha/search`.
 *
 * Primary path (OpenCodex-style): relay verbatim to ChatGPT Codex
 * `https://chatgpt.com/backend-api/codex/alpha/search` using the caller's ChatGPT auth.
 * Fallback: DuckDuckGo HTML when Authorization is missing (no ChatGPT session).
 */
export async function handleAlphaSearch(
  req: IncomingMessage,
  res: ServerResponse,
  options: ForwarderOptions,
): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const raw = await readBody(req);
  const enc = req.headers["content-encoding"];
  const encodingHeader = Array.isArray(enc) ? enc.join(", ") : enc;
  let payload: Record<string, unknown> = {};
  let relayBodyText = raw.toString("utf8");
  try {
    const decoded = decodeRequestBody(raw, encodingHeader);
    relayBodyText = decoded.toString("utf8");
    const parsed = JSON.parse(relayBodyText) as unknown;
    if (isRecord(parsed)) payload = parsed;
  } catch {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { message: "Invalid JSON body" } }));
    return;
  }

  const commands = isRecord(payload.commands) ? payload.commands : {};
  const searchQuery = Array.isArray(commands.search_query) ? commands.search_query : [];
  const hasQuery = searchQuery.some(
    (entry) => isRecord(entry) && typeof entry.q === "string" && entry.q.trim().length > 0,
  );
  if (!hasQuery) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { message: "search_query required" } }));
    return;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const nativeBase = options.nativeBaseUrl ?? DEFAULT_CODEX_NATIVE_BASE_URL;
  const headers = selectNativeForwardHeaders(req.headers);
  const auth = headers.authorization;
  const timeoutMs = resolveChatgptSearchTimeoutMs();

  // Remap role-model alias → native ChatGPT model slug for the private search endpoint.
  // ChatGPT requires `id` (Codex always sends one); synthesize if a probe omitted it.
  const searchModel = resolveChatgptSearchModelId(payload.model, {
    aliasIds: options.aliasIds,
    nativeAliasesPath: options.nativeAliasesPath,
  });
  let relayMutated = false;
  if (payload.model !== searchModel) {
    payload = { ...payload, model: searchModel };
    relayMutated = true;
  }
  if (typeof payload.id !== "string" || !payload.id.trim()) {
    payload = { ...payload, id: `search_${randomUUID()}` };
    relayMutated = true;
  }
  if (relayMutated) {
    relayBodyText = JSON.stringify(payload);
  }

  if (typeof auth === "string" && auth.trim()) {
    const upstreamUrl = chatgptAlphaSearchUrl(nativeBase);
    try {
      const upstreamResponse = await fetchImpl(upstreamUrl, {
        method: "POST",
        headers,
        body: relayBodyText,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const upstreamText = await upstreamResponse.text();
      res.statusCode = upstreamResponse.status;
      const contentType = upstreamResponse.headers.get("content-type");
      res.setHeader("content-type", contentType ?? "application/json");
      res.end(upstreamText);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      res.statusCode = timedOut ? 504 : 502;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          error: {
            message: timedOut
              ? `ChatGPT alpha/search timed out after ${timeoutMs}ms`
              : `ChatGPT alpha/search relay failed: ${message.slice(0, 500)}`,
            code: timedOut ? "alpha_search_timeout" : "alpha_search_relay_failed",
          },
        }),
      );
      return;
    }
  }

  // No ChatGPT bearer — last-resort DuckDuckGo HTML (not ChatGPT-parity).
  const query =
    searchQuery
      .map((entry) =>
        isRecord(entry) && typeof entry.q === "string" ? entry.q.trim() : "",
      )
      .find((q) => q.length > 0) ?? "";
  try {
    const searched = await searchWebLive(query, fetchImpl);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        output: searched.output,
        results: searched.results,
        warning:
          "No ChatGPT Authorization on /v1/alpha/search; used DuckDuckGo fallback. Log into ChatGPT in Codex for native search.",
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.statusCode = 401;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          message:
            `Built-in web search needs ChatGPT auth (Authorization header), and DuckDuckGo fallback failed: ${message.slice(0, 300)}`,
          code: "alpha_search_auth_required",
        },
      }),
    );
  }
}

export async function handleResponsesProxy(
  req: IncomingMessage,
  res: ServerResponse,
  options: ForwarderOptions,
): Promise<void> {
  const urlPath = (req.url ?? "").split("?")[0] ?? "";
  if (
    req.method === "POST" &&
    (urlPath === "/v1/alpha/search" || urlPath === "/alpha/search")
  ) {
    await handleAlphaSearch(req, res, options);
    return;
  }

  if (req.method === "POST" && req.url?.startsWith("/v1/responses/compact")) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          message:
            "role-model Codex adapter does not implement /v1/responses/compact; Codex local compaction uses ordinary /v1/responses.",
        },
      }),
    );
    return;
  }

  if (req.method !== "POST" || !req.url?.startsWith("/v1/responses")) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const raw = await readBody(req);
  const enc = req.headers["content-encoding"];
  const encodingHeader = Array.isArray(enc) ? enc.join(", ") : enc;
  let payload: unknown = {};
  try {
    payload = parseJsonBody(decodeRequestBody(raw, encodingHeader));
  } catch (error) {
    writeInvalidBodyDump(options.stateFilePath, req, raw, error);
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { message: "Invalid JSON body" } }));
    return;
  }

  const taxonomy = createStagedCompactTaxonomyReader().loadFullTaxonomy();
  const model =
    isRecord(payload) && typeof payload.model === "string" ? payload.model : undefined;
  const routeToRoleModel = isRoleModelRoutedModel(
    model,
    options.aliasIds,
    options.nativeAliasesPath,
  );

  const fetchImpl = options.fetchImpl ?? fetch;
  let upstream: string;
  let headers: Record<string, string>;
  let outboundBody: string;

  if (routeToRoleModel) {
    const hopStarted = Date.now();
    const bridgeTraceId = createBridgeTraceId();
    const remapped = remapPayloadModel(payload, options.nativeAliasesPath);
    const injected =
      injectRoleModelIntentIntoResponsesPayload(remapped, options.aliasIds, taxonomy) ??
      injectRoleModelIntentIntoPayload(remapped, options.aliasIds, taxonomy) ??
      remapped;
    const flattened = flattenCodexToolsForUpstream(injected, {
      webSearchMode: resolveWebSearchForwardMode(),
    });
    const fulfillWebSearch =
      flattened.stats.shimCounts.web_search > 0 ||
      reverseMapHasWebSearch(flattened.reverseMap);
    const normalizedRaw = normalizeCodexInputForRoleModel(flattened.payload);
    const clientRequestedStream =
      isRecord(normalizedRaw) && normalizedRaw.stream === true;
    // Adapter fulfills shimmed web_search via ChatGPT alpha/search + continue loop.
    // Force JSON upstream so we can splice function_call_output before Codex sees it
    // (Desktop client web_search_call continue ends the turn with no answer).
    const normalizedPayload =
      isRecord(normalizedRaw) && fulfillWebSearch
        ? { ...normalizedRaw, stream: false }
        : normalizedRaw;
    upstream = `${normalizeEndpoint(options.upstreamEndpoint)}/v1/responses`;
    headers = {
      "content-type": "application/json",
      "x-client-request-id": bridgeTraceId,
      "x-role-model-request-id": bridgeTraceId,
      "x-role-model-client-profile": "codex-responses",
    };
    const auth = req.headers.authorization;
    if (typeof auth === "string") headers.authorization = auth;
    const accountId = req.headers["chatgpt-account-id"];
    if (typeof accountId === "string") headers["chatgpt-account-id"] = accountId;
    outboundBody = JSON.stringify(normalizedPayload);

    logBridgeEvent("bridge.hop.start", {
      bridgeTraceId,
      route: "role-model",
      model: isRecord(normalizedPayload) ? normalizedPayload.model : flattened.payload.model,
      histogram: flattened.stats.histogram,
    });
    logBridgeEvent("bridge.transform.request", {
      bridgeTraceId,
      ...flattened.stats,
    });
    logBridgeEvent("bridge.upstream.forward", {
      bridgeTraceId,
      upstream,
      intentPresent: Boolean(
        isRecord(normalizedPayload) &&
          isRecord(normalizedPayload.role_model) &&
          isRecord((normalizedPayload.role_model as Record<string, unknown>).intent),
      ),
    });

    try {
      const debugPath = process.env.ROLE_MODEL_CODEX_DEBUG_REQUEST_PATH;
      if (debugPath) {
        writeFileSync(
          debugPath,
          JSON.stringify(
            {
              route: "role-model",
              bridgeTraceId,
              upstream,
              body: normalizedPayload,
              transform: flattened.stats,
            },
            null,
            2,
          ),
          "utf8",
        );
      }
    } catch {
      // ignore debug write failures
    }

    const upstreamResponse = await fetchImpl(upstream, {
      method: "POST",
      headers,
      body: outboundBody,
    });

    logBridgeEvent("bridge.upstream.response", {
      bridgeTraceId,
      status: upstreamResponse.status,
      contentType: upstreamResponse.headers.get("content-type"),
    });

    res.statusCode = upstreamResponse.status;
    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    const hopPath = join(dirname(options.stateFilePath), "last-bridge-hop.json");
    let restoreStats: RestoreStats | undefined;
    try {
      await pipeRoleModelUpstreamResponse({
        upstreamResponse,
        res,
        reverseMap: flattened.reverseMap,
        contentType,
        options,
        clientRequestedStream,
        outboundPayload: isRecord(normalizedPayload) ? normalizedPayload : {},
        hopHeaders: headers,
        fulfillWebSearch,
        onRestoreStats: (stats) => {
          restoreStats = stats;
        },
      });
      logBridgeEvent("bridge.transform.response", {
        bridgeTraceId,
        ...(restoreStats ?? {}),
      });
      writeLastBridgeHop(hopPath, {
        bridgeTraceId,
        route: "role-model",
        model: typeof flattened.payload.model === "string" ? flattened.payload.model : undefined,
        histogram: flattened.stats.histogram,
        transformRequest: flattened.stats,
        restore: restoreStats,
        upstreamStatus: upstreamResponse.status,
        outcome: "ok",
        durationMs: Date.now() - hopStarted,
      });
      logBridgeEvent("bridge.hop.end", {
        bridgeTraceId,
        outcome: "ok",
        durationMs: Date.now() - hopStarted,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeLastBridgeHop(hopPath, {
        bridgeTraceId,
        route: "role-model",
        model: typeof flattened.payload.model === "string" ? flattened.payload.model : undefined,
        transformRequest: flattened.stats,
        upstreamStatus: upstreamResponse.status,
        outcome: "error",
        error: message,
        durationMs: Date.now() - hopStarted,
      });
      logBridgeEvent("bridge.hop.error", {
        bridgeTraceId,
        phase: "transform-response",
        error: message,
      });
      throw error;
    }
    return;
  }

  const nativeBase = options.nativeBaseUrl ?? DEFAULT_CODEX_NATIVE_BASE_URL;
  upstream = nativeResponsesUrl(nativeBase, req.url ?? "/v1/responses");
  headers = selectNativeForwardHeaders(req.headers);
  outboundBody = JSON.stringify(payload);

  try {
    const debugPath = process.env.ROLE_MODEL_CODEX_DEBUG_REQUEST_PATH;
    if (debugPath) {
      writeFileSync(
        debugPath,
        JSON.stringify({ route: "native", upstream, body: JSON.parse(outboundBody) }, null, 2),
        "utf8",
      );
    }
  } catch {
    // ignore debug write failures
  }

  const upstreamResponse = await fetchImpl(upstream, {
    method: "POST",
    headers,
    body: outboundBody,
  });

  res.statusCode = upstreamResponse.status;
  const contentType = upstreamResponse.headers.get("content-type");
  if (contentType) res.setHeader("content-type", contentType);

  if (!upstreamResponse.body) {
    const text = await upstreamResponse.text();
    res.end(text);
    return;
  }

  const isEventStream = (contentType ?? "").includes("text/event-stream");
  const reader = upstreamResponse.body.getReader();
  if (!isEventStream) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const sseState = createCodexSseNormalizeState();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    buffer += decoder.decode(value, { stream: true });
    const flushed = flushCodexResponsesSseBuffer(buffer, sseState);
    buffer = flushed.rest;
    if (flushed.emitted) res.write(flushed.emitted);
  }
  buffer += decoder.decode();
  if (buffer.length > 0) {
    const flushed = flushCodexResponsesSseBuffer(`${buffer}\n\n`, sseState);
    if (flushed.emitted) res.write(flushed.emitted);
  }
  for (const line of finalizeCodexResponsesSse(sseState)) {
    res.write(`${line}\n\n`);
  }
  res.end();
}

async function finalizePayloadForCodex(input: {
  readonly parsed: unknown;
  readonly reverseMap: Map<string, BridgeReverseEntry>;
  readonly outboundPayload?: Record<string, unknown>;
  readonly options?: ForwarderOptions;
  readonly hopHeaders?: Record<string, string>;
  readonly fulfillWebSearch?: boolean;
}): Promise<{ payload: unknown; stats: RestoreStats }> {
  let working = input.parsed;

  const autoFulfillSearch = shouldAutoFulfillWebSearch(
    working,
    input.reverseMap,
    Boolean(input.fulfillWebSearch),
  );
  const fulfillSearchInPlace = shouldFulfillWebSearchAlongsideClientTools(
    working,
    input.reverseMap,
    Boolean(input.fulfillWebSearch),
  );
  if (
    autoFulfillSearch &&
    input.outboundPayload &&
    input.options &&
    input.hopHeaders &&
    isRecord(working)
  ) {
    working = await continueRoleModelAfterWebSearch({
      outboundPayload: input.outboundPayload,
      responsePayload: working,
      reverseMap: input.reverseMap,
      options: input.options,
      headers: input.hopHeaders,
    });
  } else if (
    fulfillSearchInPlace &&
    input.options &&
    input.hopHeaders &&
    isRecord(working)
  ) {
    // Mixed hop: fulfill via adapter alpha/search, keep client tools for Desktop.
    // Avoids Codex native web_search_call (subscription quota) and unpaired continues.
    working = await fulfillWebSearchAlongsideClientTools({
      responsePayload: working,
      reverseMap: input.reverseMap,
      options: input.options,
      headers: input.hopHeaders,
    });
  }
  // Never hand Codex a client web_search_call after adapter fulfill — that path
  // ends Desktop turns with no answer (Reconnecting / blank after search UI) or
  // burns Codex/ChatGPT search quota on native client search.
  if (autoFulfillSearch || fulfillSearchInPlace) {
    working = stripWebSearchCallsFromOutput(working, input.reverseMap);
  }

  const restored = restoreCodexToolCallsInPayload(working, input.reverseMap);
  const rewritten = rewriteIncompleteToolCallsJsonPayload(restored.payload);
  return { payload: rewritten, stats: restored.stats };
}

function ensureCompletedForClientToolCalls(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  const hasClientToolCall =
    Array.isArray(payload.output) &&
    payload.output.some(
      (item) =>
        isRecord(item) &&
        (item.type === "function_call" ||
          item.type === "custom_tool_call" ||
          item.type === "tool_search_call" ||
          item.type === "web_search_call"),
    );
  if (!hasClientToolCall) return payload;
  const next = { ...payload, status: "completed" };
  delete (next as { incomplete_details?: unknown }).incomplete_details;
  return next;
}

function emitCodexJsonOrSse(input: {
  readonly res: ServerResponse;
  readonly payload: unknown;
  readonly clientRequestedStream: boolean;
}): void {
  const { res, payload, clientRequestedStream } = input;
  const response = ensureCodexResponseId(
    ensureCompletedForClientToolCalls(
      isRecord(payload) ? payload : { output: [] },
    ) as Record<string, unknown>,
  );
  if (clientRequestedStream) {
    res.setHeader("content-type", "text/event-stream");
    // Emit a minimal but complete SSE sequence so Codex wires tool calls.
    const responseId = String(response.id);
    const created = {
      type: "response.created",
      response: {
        id: responseId,
        status: "in_progress",
        output: [],
      },
    };
    res.write(`data: ${JSON.stringify(created)}\n\n`);
    const output = Array.isArray(response.output) ? response.output : [];
    output.forEach((item, outputIndex) => {
      res.write(
        `data: ${JSON.stringify({
          type: "response.output_item.added",
          output_index: outputIndex,
          item,
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({
          type: "response.output_item.done",
          output_index: outputIndex,
          item,
        })}\n\n`,
      );
    });
    res.write(
      `data: ${JSON.stringify({ type: "response.completed", response })}\n\n`,
    );
    res.end();
    return;
  }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(response));
}

async function pipeRoleModelUpstreamResponse(input: {
  readonly upstreamResponse: Response;
  readonly res: ServerResponse;
  readonly reverseMap: Map<string, BridgeReverseEntry>;
  readonly contentType: string | null;
  readonly options: ForwarderOptions;
  readonly clientRequestedStream: boolean;
  readonly outboundPayload: Record<string, unknown>;
  readonly hopHeaders: Record<string, string>;
  readonly fulfillWebSearch: boolean;
  readonly onRestoreStats?: (stats: RestoreStats) => void;
}): Promise<void> {
  const {
    upstreamResponse,
    res,
    reverseMap,
    contentType,
    options,
    clientRequestedStream,
    outboundPayload,
    hopHeaders,
    fulfillWebSearch,
    onRestoreStats,
  } = input;
  const isEventStream = (contentType ?? "").includes("text/event-stream");

  const writeFinalized = async (parsed: unknown, asStream: boolean): Promise<void> => {
    const finalizedPayload = await finalizePayloadForCodex({
      parsed,
      reverseMap,
      outboundPayload,
      options,
      hopHeaders,
      fulfillWebSearch,
    });
    onRestoreStats?.(finalizedPayload.stats);
    const debugResponsePath =
      process.env.ROLE_MODEL_CODEX_DEBUG_RESPONSE_PATH ||
      join(dirname(options.stateFilePath), "last-bridge-response.json");
    try {
      writeFileSync(debugResponsePath, JSON.stringify(finalizedPayload.payload, null, 2), "utf8");
    } catch {
      // ignore debug write failures
    }
    emitCodexJsonOrSse({
      res,
      payload: finalizedPayload.payload,
      clientRequestedStream: asStream,
    });
  };

  // When fulfilling web_search, never stream partial tool calls to Codex — buffer
  // the upstream body (even if it arrived as SSE) and emit the continued result.
  if (fulfillWebSearch) {
    const text = await upstreamResponse.text();
    let parsed: unknown = {
      id: "resp_adapter",
      status: "completed",
      output: [],
    };
    if (isEventStream) {
      const items: unknown[] = [];
      for (const block of text.split("\n\n")) {
        const line = block.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim()) as unknown;
          if (isRecord(ev) && ev.type === "response.completed" && isRecord(ev.response)) {
            parsed = ev.response;
          } else if (
            isRecord(ev) &&
            ev.type === "response.output_item.done" &&
            isRecord(ev.item)
          ) {
            items.push(ev.item);
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
      if (
        isRecord(parsed) &&
        Array.isArray(parsed.output) &&
        parsed.output.length === 0 &&
        items.length > 0
      ) {
        parsed = { id: "resp_adapter", status: "completed", output: items };
      }
    } else {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        res.end(text);
        return;
      }
    }
    await writeFinalized(parsed, clientRequestedStream);
    return;
  }

  if (!upstreamResponse.body || !isEventStream) {
    const text = await upstreamResponse.text();
    try {
      await writeFinalized(JSON.parse(text) as unknown, clientRequestedStream);
    } catch {
      res.end(text);
    }
    return;
  }

  const reader = upstreamResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const sseState = createCodexSseNormalizeState();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    buffer += decoder.decode(value, { stream: true });
    const flushed = flushCodexResponsesSseBuffer(buffer, sseState);
    buffer = flushed.rest;
    if (flushed.emitted) {
      res.write(restoreCodexToolCallsInSseChunk(flushed.emitted, reverseMap));
    }
  }
  buffer += decoder.decode();
  if (buffer.length > 0) {
    const flushed = flushCodexResponsesSseBuffer(`${buffer}\n\n`, sseState);
    if (flushed.emitted) {
      res.write(restoreCodexToolCallsInSseChunk(flushed.emitted, reverseMap));
    }
  }
  const finalized = finalizeCodexResponsesSse(sseState);
  if (finalized.length > 0) {
    const chunk = finalized.map((line) => `${line}\n\n`).join("");
    res.write(restoreCodexToolCallsInSseChunk(chunk, reverseMap));
  }
  onRestoreStats?.({
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
  });
  res.end();
}

export async function startForwarder(options: ForwarderOptions): Promise<Server> {
  // Dynamic import avoids a circular dependency at module load time.
  const { attachResponsesWebSocket } = await import("./responses-websocket.js");
  const host = options.listenHost ?? "127.0.0.1";
  const server = createServer((req, res) => {
    handleResponsesProxy(req, res, options).catch((error) => {
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: { message: error instanceof Error ? error.message : String(error) } }));
    });
  });
  attachResponsesWebSocket(server, options);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.listenPort, host, () => {
      mkdirSync(dirname(options.stateFilePath), { recursive: true });
      writeFileSync(
        options.stateFilePath,
        JSON.stringify({ pid: process.pid, port: options.listenPort, host }, null, 2),
        "utf8",
      );
      resolve(server);
    });
  });
}

export function stopForwarder(stateFilePath: string): boolean {
  if (!existsSync(stateFilePath)) return false;
  try {
    const state = JSON.parse(readFileSync(stateFilePath, "utf8")) as { pid?: number };
    if (state.pid && state.pid !== process.pid) {
      try {
        process.kill(state.pid);
      } catch {
        // process may already be gone
      }
    }
  } finally {
    unlinkSync(stateFilePath);
  }
  return true;
}
