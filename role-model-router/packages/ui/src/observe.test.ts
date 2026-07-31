import { describe, expect, it } from "vitest";

import {
  OBSERVE_ACTIVITY_CAPTURES,
  OBSERVE_ACTIVITY_ENTRIES,
  OBSERVE_ACTIVITY_METRICS,
} from "./observe-activity-specimens";
import {
  OBSERVE_PAGE_OPTIONS,
  groupObserveChartRows,
  observeNavItems,
  type ObserveChartBlock,
} from "./observe-shared";
import { buildObserveRequestsCharts } from "./observe-requests-specimens";
import { buildObserveRoutingCharts } from "./observe-routing-specimens";

describe("observe activity", () => {
  it("keeps Activity in page nav with Observe sidebar active", () => {
    expect(OBSERVE_PAGE_OPTIONS.map((o) => o.value)).toEqual([
      "requests",
      "routing",
      "activity",
      "logs",
    ]);
    expect(observeNavItems("activity").find((item) => item.id === "observe")?.active).toBe(
      true,
    );
  });

  it("exposes panel MetricStrip facts and 8+4 ledger/capture fixtures", () => {
    expect(OBSERVE_ACTIVITY_METRICS.map((m) => m.label)).toEqual([
      "Entries",
      "Errors",
      "Prompt tokens",
      "Completion tokens",
    ]);
    expect(OBSERVE_ACTIVITY_ENTRIES).toHaveLength(4);
    expect(OBSERVE_ACTIVITY_ENTRIES[0]?.id).toBe("act-1");
    expect(OBSERVE_ACTIVITY_ENTRIES[0]?.kind).toBe("request.complete");
    expect(OBSERVE_ACTIVITY_ENTRIES[0]?.hasCapture).toBe(true);
    expect(OBSERVE_ACTIVITY_CAPTURES["act-1"]?.title).toBe("capture · req-router-001");
    expect(OBSERVE_ACTIVITY_CAPTURES["act-1"]?.body).toContain('"requestId"');
  });
});

describe("observe chart stacks", () => {
  it("builds ten requests charts with expected kinds and spans", () => {
    const charts = buildObserveRequestsCharts();
    expect(charts).toHaveLength(10);
    expect(charts.map((c) => c.kind)).toEqual([
      "line",
      "composition",
      "bar",
      "area",
      "line",
      "line",
      "line",
      "bar",
      "composition",
      "ranking",
    ]);
    expect(charts.every((c) => !/[A-Z][a-z]+ [A-Z]/.test(c.title))).toBe(true);
    expect(charts[0]?.title).toBe("Request volume over time");
    // Request volume legend = endpoint/model-id, not the metric key
    expect(charts[0]?.series?.map((s) => s.label)).toEqual([
      "cli.local.coder",
      "openai.gpt-5.4",
      "anthropic.sonnet",
    ]);
    // Capability leaders legend subject = capabilities, not roles
    expect(charts[8]?.segments?.map((s) => s.label)).toEqual([
      "code.edit",
      "chat.general",
      "rag.retrieve",
      "tools.execute",
      "summarize",
      "embed",
      "rerank",
      "vision",
    ]);
    // Taxonomy demand legend subject = groups
    expect(charts[1]?.segments?.map((s) => s.label)).toEqual([
      "coding",
      "research",
      "ops",
      "chat",
    ]);
  });

  it("builds nine routing charts with ranking for flat mixes", () => {
    const charts = buildObserveRoutingCharts();
    expect(charts).toHaveLength(9);
    expect(charts.map((c) => c.kind)).toEqual([
      "area",
      "line",
      "composition",
      "ranking",
      "ranking",
      "area",
      "ranking",
      "ranking",
      "ranking",
    ]);
    expect(charts[5]?.stacked).toBe(true);
    expect(charts.some((c) => c.title === "Role demand")).toBe(false);
    expect(charts[0]?.title).toBe("Cost avoided by routing");
    expect(charts[2]?.kind).toBe("composition");
    expect(charts[2]?.segments?.[0]?.label).toBe("coder");
    expect(charts[3]?.rows?.[0]?.label).toBe("code.edit");
  });

  it("pairs consecutive span-6 charts into rows", () => {
    const charts: ObserveChartBlock[] = [
      { title: "a", kind: "bar", span: 12, data: [], series: [] },
      { title: "b", kind: "bar", span: 6, data: [], series: [] },
      { title: "c", kind: "bar", span: 6, data: [], series: [] },
      { title: "d", kind: "ranking", span: 6, rows: [] },
    ];
    const rows = groupObserveChartRows(charts);
    expect(rows).toEqual([[charts[0]], [charts[1], charts[2]], [charts[3]]]);
  });
});
