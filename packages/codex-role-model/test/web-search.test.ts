import { describe, expect, test } from "vitest";
import {
  type SearchEnricher,
  assessSearchEvidence,
  enrichWeakSearchEvidence,
  formatStructuredSearchOutput,
  isWeakSearchEvidence,
  searchWebLive,
} from "../src/web-search.js";

describe("searchWebLive", () => {
  test("parses DuckDuckGo HTML results", async () => {
    const html = `
      <html><body>
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=${encodeURIComponent("https://example.com/a")}">Alpha Title</a>
        <span class="result__snippet">Alpha snippet with enough body text to count as usable evidence for synthesis.</span>
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=${encodeURIComponent("https://example.com/b")}">Beta Title</a>
        <span class="result__snippet">Beta snippet also carries distinct body content beyond the title line.</span>
      </body></html>
    `;
    const result = await searchWebLive("example query", async () => {
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    });
    expect(result.results.length).toBeGreaterThanOrEqual(1);
    expect(result.results[0]?.title).toBe("Alpha Title");
    expect(result.results[0]?.url).toBe("https://example.com/a");
    expect(result.output).toContain("Alpha Title");
    expect(result.output).toContain("Alpha snippet");
  });

  test("surfaces empty-result message when HTML has no hits", async () => {
    const result = await searchWebLive("zzzz-unlikely", async () => {
      return new Response("<html><body>no results</body></html>", { status: 200 });
    });
    expect(result.results).toEqual([]);
    expect(result.output).toContain("No web search results");
  });
});

describe("structural search evidence quality", () => {
  test("flags chrome / title-only SERP as weak without domain checks", () => {
    const weak = [
      "Topic Alpha: Overview page - Example Site",
      "[wordlim: 200] Published: 0.1 years ago",
      "Topic Alpha: Overview page - Example Site UK",
    ].join("\n");
    expect(isWeakSearchEvidence(weak)).toBe(true);
    expect(
      assessSearchEvidence(weak).reasons.some((r) => r.includes("chrome") || r.includes("title")),
    ).toBe(true);

    const strong =
      "Topic Alpha was last observed at value 42 with supporting context from multiple independent sources.";
    expect(isWeakSearchEvidence(strong)).toBe(false);
  });

  test("enriches weak primary evidence via pluggable enricher chain", async () => {
    const weak = [
      "Topic Alpha: Overview page - Example Site",
      "[wordlim: 200] Published: 0.1 years ago",
      "Topic Alpha: Overview page - Example Site",
    ].join("\n");
    const html = `
      <html><body>
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=${encodeURIComponent("https://example.com/alpha")}">Topic Alpha</a>
        <span class="result__snippet">Topic Alpha currently reports value 42 with range 40–44 according to Example Site.</span>
      </body></html>
    `;
    const enriched = await enrichWeakSearchEvidence({
      query: "Topic Alpha current value",
      primaryOutput: weak,
      fetchImpl: async () =>
        new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    });
    expect(enriched.source).toBe("chatgpt+enriched");
    expect(enriched.output).toContain("Enriched (duckduckgo)");
    expect(enriched.output).toContain("value 42");
  });

  test("accepts a custom enricher without hard-coding providers", async () => {
    const custom: SearchEnricher = {
      name: "fixture",
      search: async () => ({
        output: formatStructuredSearchOutput(
          "q",
          [
            {
              type: "text_result",
              ref_id: "1",
              title: "Fixture",
              snippet:
                "Fixture body with enough characters to clear the structural quality gate easily.",
              url: "https://example.com/fixture",
            },
          ],
          "Fixture answer summary with concrete detail.",
        ),
        results: [
          {
            type: "text_result",
            ref_id: "1",
            title: "Fixture",
            snippet:
              "Fixture body with enough characters to clear the structural quality gate easily.",
            url: "https://example.com/fixture",
          },
        ],
        source: "fixture",
      }),
    };
    const enriched = await enrichWeakSearchEvidence({
      query: "q",
      primaryOutput: "[wordlim: 10] title only",
      enrichers: [custom],
    });
    expect(enriched.enricher).toBe("fixture");
    expect(enriched.output).toContain("Enriched (fixture)");
  });

  test("formatStructuredSearchOutput includes optional answer summary", () => {
    const text = formatStructuredSearchOutput(
      "q",
      [
        {
          type: "text_result",
          ref_id: "1",
          title: "T",
          snippet: "body text here",
          url: "https://x",
        },
      ],
      "Summary line.",
    );
    expect(text).toContain("Answer summary:");
    expect(text).toContain("Summary line.");
  });
});
