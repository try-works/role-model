/**
 * Live web search helpers for Codex adapter fulfill.
 *
 * Design goals (generic, extensible — not prompt/domain-specific):
 * - Primary path: ChatGPT alpha/search (caller).
 * - Quality gate: structural SERP weakness (chrome / title-only / empty body).
 * - Enrichment: ordered provider chain (Tavily → DuckDuckGo by default).
 *
 * Patterns borrowed structurally from:
 * - CLIProxyAPI: optional Tavily `include_answer` fallback when primary search is thin
 * - 9router: structured title/url/snippet search results
 */

export interface WebSearchResultItem {
  readonly type: "text_result";
  readonly ref_id: string;
  readonly title: string;
  readonly snippet: string;
  readonly url?: string;
}

export interface WebSearchResponse {
  readonly output: string;
  readonly results: readonly WebSearchResultItem[];
  readonly answer?: string;
  readonly source?: string;
}

/** Pluggable enricher: return null to skip (e.g. missing API key). */
export type SearchEnricher = {
  readonly name: string;
  search(query: string, fetchImpl: typeof fetch): Promise<WebSearchResponse | null>;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripTags(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function parseDuckDuckGoHtml(html: string): WebSearchResultItem[] {
  const results: WebSearchResultItem[] = [];
  const anchorRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let index = 0;
  while (index < 8) {
    const match = anchorRe.exec(html);
    if (match === null) break;
    const href = match[1] ?? "";
    const title = stripTags(match[2] ?? "");
    if (!title) continue;
    const after = html.slice(match.index, match.index + 1200);
    const snippetMatch = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\//i.exec(after);
    const snippet = snippetMatch ? stripTags(snippetMatch[1] ?? "") : "";
    const uddg = /uddg=([^&"]+)/.exec(href);
    const url = uddg ? decodeURIComponent(uddg[1]) : href.startsWith("http") ? href : undefined;
    results.push({
      type: "text_result",
      ref_id: `turn0search${index}`,
      title,
      snippet: snippet || title,
      ...(url ? { url } : {}),
    });
    index += 1;
  }
  return results;
}

export function formatStructuredSearchOutput(
  query: string,
  results: readonly WebSearchResultItem[],
  answer?: string,
): string {
  if (results.length === 0 && !answer) {
    return `No web search results found for: ${query}`;
  }
  const lines = [`Web search results for "${query}":`, ""];
  if (answer?.trim()) {
    lines.push(`Answer summary: ${answer.trim()}`, "");
  }
  for (const [i, item] of results.entries()) {
    lines.push(`${i + 1}. ${item.title}`);
    if (item.url) lines.push(`   ${item.url}`);
    if (item.snippet) lines.push(`   ${item.snippet}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

/** Provider chrome often present on ChatGPT alpha/search SERP dumps. */
const SERP_CHROME_RE =
  /\[wordlim:\s*\d+\][^\n]*|Published:\s*[\d.]+\s*years?\s*ago[^\n]*|Crawled:\s*[^\n]*/gi;

function stripSerpChrome(text: string): string {
  return text
    .replace(SERP_CHROME_RE, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function lineLooksLikeUrl(line: string): boolean {
  return /^https?:\/\/\S+/i.test(line.trim()) || /^\s{2,}https?:\/\/\S+/i.test(line);
}

/**
 * Short headline-like lines without sentence body — common in title-only SERPs.
 * Domain-agnostic (no site allow/deny lists).
 */
function lineLooksLikeTitleOnly(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 140) return false;
  if (lineLooksLikeUrl(t)) return false;
  if (/^web search results for/i.test(t)) return false;
  if (/^answer summary:/i.test(t)) return false;
  if (/^\d+\.\s+\S/.test(t) && t.length < 100) return true;
  if (/\s[-–|]\s.+$/.test(t) && t.length <= 120 && !/[.!?].+\w/.test(t)) return true;
  if (t.length < 90 && !/[.!?]$/.test(t) && !lineLooksLikeUrl(t)) return true;
  return false;
}

function lineLooksLikeBody(line: string): boolean {
  const t = line.trim();
  if (t.length < 48) return false;
  if (lineLooksLikeUrl(t)) return false;
  if (lineLooksLikeTitleOnly(t) && t.length < 80) return false;
  return t.length >= 60 || /[.!?]/.test(t);
}

export type SearchEvidenceAssessment = {
  readonly weak: boolean;
  readonly reasons: readonly string[];
  readonly bodyChars: number;
  readonly urlCount: number;
  readonly titleOnlyLines: number;
  readonly bodyLines: number;
};

/**
 * Structural quality gate for search evidence.
 * Weak = empty/error, chrome-only, or title-only dumps without usable body text.
 * Does not look for domain-specific facts (prices, tickers, site names).
 */
export function assessSearchEvidence(text: string): SearchEvidenceAssessment {
  const raw = text.trim();
  const reasons: string[] = [];
  if (!raw) {
    return {
      weak: true,
      reasons: ["empty"],
      bodyChars: 0,
      urlCount: 0,
      titleOnlyLines: 0,
      bodyLines: 0,
    };
  }
  if (/chatgpt alpha\/search (failed|error)/i.test(raw)) {
    return {
      weak: true,
      reasons: ["provider_error"],
      bodyChars: 0,
      urlCount: 0,
      titleOnlyLines: 0,
      bodyLines: 0,
    };
  }
  if (/^no web search results found/i.test(raw) || /^empty search query/i.test(raw)) {
    return {
      weak: true,
      reasons: ["no_results"],
      bodyChars: 0,
      urlCount: 0,
      titleOnlyLines: 0,
      bodyLines: 0,
    };
  }

  const hasChrome =
    /\[wordlim:\s*\d+\]/i.test(raw) || /Published:\s*[\d.]+\s*years?\s*ago/i.test(raw);
  const cleaned = stripSerpChrome(raw);
  if (!cleaned) {
    return {
      weak: true,
      reasons: ["chrome_only"],
      bodyChars: 0,
      urlCount: 0,
      titleOnlyLines: 0,
      bodyLines: 0,
    };
  }

  const urlCount = (cleaned.match(/https?:\/\/\S+/g) ?? []).length;
  const lines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const titleOnlyLines = lines.filter(lineLooksLikeTitleOnly).length;
  const bodyLines = lines.filter(lineLooksLikeBody).length;
  const bodyChars = lines
    .filter((l) => lineLooksLikeBody(l) || lineLooksLikeUrl(l))
    .join(" ").length;

  // Explicit answer summaries from structured providers are strong signals.
  if (/^answer summary:/im.test(cleaned) && cleaned.length >= 80) {
    return {
      weak: false,
      reasons: ["has_answer_summary"],
      bodyChars,
      urlCount,
      titleOnlyLines,
      bodyLines,
    };
  }

  // Structured results with URLs + body are strong.
  if (urlCount >= 2 && bodyChars >= 120) {
    return {
      weak: false,
      reasons: ["structured_urls_body"],
      bodyChars,
      urlCount,
      titleOnlyLines,
      bodyLines,
    };
  }
  if (bodyLines >= 2 && bodyChars >= 100) {
    return { weak: false, reasons: ["multi_body"], bodyChars, urlCount, titleOnlyLines, bodyLines };
  }
  // Single substantial paragraph without chrome.
  if (!hasChrome && bodyChars >= 120) {
    return {
      weak: false,
      reasons: ["substantial_body"],
      bodyChars,
      urlCount,
      titleOnlyLines,
      bodyLines,
    };
  }

  if (hasChrome && bodyChars < 160) reasons.push("chrome_thin_body");
  if (titleOnlyLines >= 2 && bodyLines === 0 && bodyChars < 160) reasons.push("title_only");
  if (cleaned.length < 80) reasons.push("short");

  const weak = reasons.length > 0;
  if (!weak && bodyChars < 80 && urlCount === 0) {
    reasons.push("low_density");
    return { weak: true, reasons, bodyChars, urlCount, titleOnlyLines, bodyLines };
  }
  return { weak, reasons, bodyChars, urlCount, titleOnlyLines, bodyLines };
}

export function isWeakSearchEvidence(text: string): boolean {
  return assessSearchEvidence(text).weak;
}

export async function searchWebLive(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WebSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { output: "Empty search query.", results: [], source: "duckduckgo" };
  }

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; codex-role-model/0.1; +https://github.com/try-works/role-model)",
      accept: "text/html",
    },
  });
  const html = await response.text();
  if (!response.ok) {
    throw new Error(`web search upstream HTTP ${response.status}: ${html.slice(0, 200)}`);
  }
  const results = parseDuckDuckGoHtml(html);
  return {
    output: formatStructuredSearchOutput(trimmed, results),
    results,
    source: "duckduckgo",
  };
}

/**
 * Optional Tavily enricher (CLIProxyAPI-style). Active when
 * ROLE_MODEL_CODEX_TAVILY_API_KEY is set.
 */
export async function searchTavily(
  query: string,
  fetchImpl: typeof fetch = fetch,
  apiKey = process.env.ROLE_MODEL_CODEX_TAVILY_API_KEY?.trim() ?? "",
): Promise<WebSearchResponse | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;

  const response = await fetchImpl("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query: trimmed,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`tavily http ${response.status}: ${text.slice(0, 400)}`);
  }
  const parsed = JSON.parse(text) as {
    answer?: string;
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  const results: WebSearchResultItem[] = (parsed.results ?? []).map((r, i) => ({
    type: "text_result" as const,
    ref_id: `tavily${i}`,
    title: String(r.title ?? "").trim() || `Result ${i + 1}`,
    snippet: String(r.content ?? "").trim(),
    ...(r.url ? { url: String(r.url).trim() } : {}),
  }));
  const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  return {
    output: formatStructuredSearchOutput(trimmed, results, answer),
    results,
    answer,
    source: "tavily",
  };
}

export function defaultSearchEnrichers(): SearchEnricher[] {
  return [
    {
      name: "tavily",
      search: (query, fetchImpl) => searchTavily(query, fetchImpl),
    },
    {
      name: "duckduckgo",
      search: async (query, fetchImpl) => searchWebLive(query, fetchImpl),
    },
  ];
}

/**
 * When primary evidence fails the structural quality gate, try enrichers in order
 * until one returns non-weak output. Callers may pass a custom enricher list.
 */
export async function enrichWeakSearchEvidence(input: {
  readonly query: string;
  readonly primaryOutput: string;
  readonly fetchImpl?: typeof fetch;
  readonly enrichers?: readonly SearchEnricher[];
}): Promise<{
  output: string;
  source: "chatgpt" | "duckduckgo" | "tavily" | "chatgpt+enriched";
  enricher?: string;
}> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const primary = input.primaryOutput.trim();
  if (!isWeakSearchEvidence(primary)) {
    return { output: primary, source: "chatgpt" };
  }

  const enrichers = input.enrichers ?? defaultSearchEnrichers();
  for (const enricher of enrichers) {
    try {
      const result = await enricher.search(input.query, fetchImpl);
      if (!result) continue;
      const hasHits = (result.results?.length ?? 0) > 0;
      const usable = hasHits || !isWeakSearchEvidence(result.output);
      if (!usable) continue;
      return {
        output: [
          "### Primary search — thin evidence; enriched below",
          sanitizeForMerge(primary, 500),
          "",
          `### Enriched (${enricher.name})`,
          result.output,
        ].join("\n"),
        source: "chatgpt+enriched",
        enricher: enricher.name,
      };
    } catch {
      // try next enricher
    }
  }

  return { output: primary, source: "chatgpt" };
}

function sanitizeForMerge(text: string, maxChars: number): string {
  const cleaned = stripSerpChrome(text)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}
