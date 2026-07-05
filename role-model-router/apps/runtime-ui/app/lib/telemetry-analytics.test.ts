import { describe, expect, test } from "vitest";

import type { RuntimeTelemetryAnalyticsResponse } from "./runtime-api";
import {
  buildTelemetryRankingChartModel,
  buildTelemetryTimeSeriesChartModel,
  resolveTelemetryGranularity,
} from "./telemetry-analytics";

describe("telemetry analytics view models", () => {
  test("builds semantic metric series when the backend response is not broken down by dimension", () => {
    const response: RuntimeTelemetryAnalyticsResponse = {
      startAtMs: Date.UTC(2026, 5, 16, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "hour",
      metrics: ["inputTokens", "outputTokens", "totalTokens"],
      breakdown: null,
      buckets: [
        {
          startAtMs: Date.UTC(2026, 5, 16, 10, 0, 0),
          endAtMs: Date.UTC(2026, 5, 16, 11, 0, 0),
          totals: {
            inputTokens: 120,
            outputTokens: 30,
            totalTokens: 150,
          },
          series: [],
        },
      ],
      totals: {
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
      },
      ranking: null,
      labels: {},
    };

    expect(
      buildTelemetryTimeSeriesChartModel(response, {
        title: "Token Usage Over Time",
        metrics: ["inputTokens", "outputTokens", "totalTokens"],
      }),
    ).toEqual({
      title: "Token Usage Over Time",
      isEmpty: false,
      data: [
        {
          bucketEndMs: Date.UTC(2026, 5, 16, 11, 0, 0),
          bucketLabel: "10:00",
          bucketStartMs: Date.UTC(2026, 5, 16, 10, 0, 0),
          inputTokens: 120,
          outputTokens: 30,
          totalTokens: 150,
        },
      ],
      series: [
        expect.objectContaining({
          key: "inputTokens",
          label: "Input tokens",
          colorToken: "var(--rm-chart-link-blue)",
          dataKey: "inputTokens",
        }),
        expect.objectContaining({
          key: "outputTokens",
          label: "Output tokens",
          colorToken: "var(--rm-chart-cyan)",
          dataKey: "outputTokens",
        }),
        expect.objectContaining({
          key: "totalTokens",
          label: "Total tokens",
          colorToken: "var(--rm-chart-tokens)",
          dataKey: "totalTokens",
        }),
      ],
    });
  });

  test("preserves all requested metrics when a query includes breakdown data that the chart does not directly compare", () => {
    const response: RuntimeTelemetryAnalyticsResponse = {
      startAtMs: Date.UTC(2026, 5, 16, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "hour",
      metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
      breakdown: "providerId",
      buckets: [
        {
          startAtMs: Date.UTC(2026, 5, 16, 10, 0, 0),
          endAtMs: Date.UTC(2026, 5, 16, 11, 0, 0),
          totals: {
            actualCostUsd: 0.0042,
            estimatedCostUsd: 0.0048,
            effectiveCostUsd: 0.0048,
          },
          series: [
            { key: "openai", label: "openai", metrics: { actualCostUsd: 0.0042 } },
            { key: "moonshot", label: "moonshot", metrics: { actualCostUsd: 0 } },
          ],
        },
      ],
      totals: {
        actualCostUsd: 0.0042,
        estimatedCostUsd: 0.0048,
        effectiveCostUsd: 0.0048,
      },
      ranking: null,
      labels: {
        providerId: {
          moonshot: "Moonshot",
          openai: "OpenAI",
        },
      },
    };

    const model = buildTelemetryTimeSeriesChartModel(response, {
      title: "Effective Cost Over Time",
      metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
      breakdown: "providerId",
    });

    expect(model).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            actualCostUsd: 0.0042,
            estimatedCostUsd: 0.0048,
            effectiveCostUsd: 0.0048,
          }),
        ],
        series: [
          expect.objectContaining({ key: "actualCostUsd", dataKey: "actualCostUsd" }),
          expect.objectContaining({ key: "estimatedCostUsd", dataKey: "estimatedCostUsd" }),
          expect.objectContaining({ key: "effectiveCostUsd", dataKey: "effectiveCostUsd" }),
        ],
      }),
    );
    expect(new Set(model.series.map((series) => series.colorToken)).size).toBe(model.series.length);
  });

  test("assigns distinct colors to each visible metric series in the same chart", () => {
    const response: RuntimeTelemetryAnalyticsResponse = {
      startAtMs: Date.UTC(2026, 5, 16, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "hour",
      metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
      breakdown: null,
      buckets: [
        {
          startAtMs: Date.UTC(2026, 5, 16, 10, 0, 0),
          endAtMs: Date.UTC(2026, 5, 16, 11, 0, 0),
          totals: {
            routingCostSavingsUsd: 0.003,
            cacheCostSavingsUsd: 0.001,
            totalAvoidedCostUsd: 0.004,
          },
          series: [],
        },
      ],
      totals: {
        routingCostSavingsUsd: 0.003,
        cacheCostSavingsUsd: 0.001,
        totalAvoidedCostUsd: 0.004,
      },
      ranking: null,
      labels: {},
    };

    const model = buildTelemetryTimeSeriesChartModel(response, {
      title: "Effective Cost Over Time",
      metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
    });

    expect(model.series.map((series) => series.key)).toEqual([
      "routingCostSavingsUsd",
      "cacheCostSavingsUsd",
      "totalAvoidedCostUsd",
    ]);
    expect(new Set(model.series.map((series) => series.colorToken)).size).toBe(model.series.length);
  });

  test("collapses long breakdowns into top series plus Other using backend labels", () => {
    const response: RuntimeTelemetryAnalyticsResponse = {
      startAtMs: Date.UTC(2026, 2, 1, 0, 0, 0),
      endAtMs: Date.UTC(2026, 2, 31, 0, 0, 0),
      granularity: "day",
      metrics: ["requestCount"],
      breakdown: "providerId",
      buckets: [
        {
          startAtMs: Date.UTC(2026, 2, 1, 0, 0, 0),
          endAtMs: Date.UTC(2026, 2, 2, 0, 0, 0),
          totals: {
            requestCount: 29,
          },
          series: [
            { key: "anthropic", label: "anthropic", metrics: { requestCount: 7 } },
            { key: "moonshot", label: "moonshot", metrics: { requestCount: 6 } },
            { key: "openai", label: "openai", metrics: { requestCount: 8 } },
            { key: "deepseek", label: "deepseek", metrics: { requestCount: 5 } },
            { key: "google", label: "google", metrics: { requestCount: 3 } },
          ],
        },
      ],
      totals: {
        requestCount: 29,
      },
      ranking: null,
      labels: {
        providerId: {
          anthropic: "Anthropic",
          deepseek: "DeepSeek",
          google: "Google",
          moonshot: "Moonshot",
          openai: "OpenAI",
        },
      },
    };

    expect(
      buildTelemetryTimeSeriesChartModel(response, {
        title: "Request Volume Over Time",
        metrics: ["requestCount"],
        breakdown: "providerId",
        maxSeries: 3,
      }),
    ).toEqual({
      title: "Request Volume Over Time",
      isEmpty: false,
      data: [
        expect.objectContaining({
          bucketLabel: "Mar 1",
          "series:openai": 8,
          "series:anthropic": 7,
          "series:moonshot": 6,
          "series:other": 8,
        }),
      ],
      series: [
        expect.objectContaining({
          key: "openai",
          label: "OpenAI",
          dataKey: "series:openai",
        }),
        expect.objectContaining({
          key: "anthropic",
          label: "Anthropic",
          dataKey: "series:anthropic",
        }),
        expect.objectContaining({
          key: "moonshot",
          label: "Moonshot",
          dataKey: "series:moonshot",
        }),
        expect.objectContaining({
          key: "other",
          label: "Other",
          dataKey: "series:other",
          colorToken: "var(--rm-chart-neutral-2)",
        }),
      ],
    });
  });

  test("builds ranked routing comparison rows from the analytics response", () => {
    const response: RuntimeTelemetryAnalyticsResponse = {
      startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "day",
      metrics: ["totalAvoidedCostUsd"],
      breakdown: "selectedStrategy",
      buckets: [],
      totals: {
        totalAvoidedCostUsd: 0.021,
      },
      ranking: {
        dimension: "selectedStrategy",
        metric: "totalAvoidedCostUsd",
        rows: [
          { key: "cost", label: "cost", value: 0.0124 },
          { key: "quality", label: "quality", value: 0.0054 },
          { key: "balanced", label: "balanced", value: 0.0032 },
        ],
      },
      labels: {
        selectedStrategy: {
          balanced: "Balanced",
          cost: "Cost",
          quality: "Quality",
        },
      },
    };

    expect(
      buildTelemetryRankingChartModel(response, {
        title: "Cost Avoided By Routing",
        metric: "totalAvoidedCostUsd",
      }),
    ).toEqual({
      title: "Cost Avoided By Routing",
      metric: "totalAvoidedCostUsd",
      isEmpty: false,
      rows: [
        expect.objectContaining({ key: "cost", label: "Cost", value: 0.0124 }),
        expect.objectContaining({ key: "quality", label: "Quality", value: 0.0054 }),
        expect.objectContaining({ key: "balanced", label: "Balanced", value: 0.0032 }),
      ],
    });
  });

  test("maps backend support metadata into semantic chart states", () => {
    const response = {
      startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "day",
      metrics: ["cacheHitTokenRate"],
      breakdown: null,
      buckets: [
        {
          startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
          endAtMs: Date.UTC(2026, 5, 11, 0, 0, 0),
          totals: {
            cacheHitTokenRate: null,
          },
          series: [],
        },
      ],
      totals: {
        cacheHitTokenRate: null,
      },
      ranking: null,
      labels: {},
      metadata: {
        matchedRowCount: 12,
        scannedRowCount: 12,
        aggregationRowCount: 12,
        truncated: false,
        truncationReason: null,
      },
      metricSupport: {
        cacheHitTokenRate: {
          metric: "cacheHitTokenRate",
          status: "unsupported",
          matchedRowCount: 12,
          supportedRowCount: 0,
          unsupportedRowCount: 12,
          nullValueCount: 12,
          reason: "No rows in this slice expose cache-read-token support.",
        },
      },
      dimensionSupport: {},
    } as unknown as RuntimeTelemetryAnalyticsResponse;

    const model = buildTelemetryTimeSeriesChartModel(response, {
      title: "Cache Efficiency",
      metrics: ["cacheHitTokenRate"],
    });

    expect(model).toEqual(
      expect.objectContaining({
        isEmpty: true,
        state: expect.objectContaining({
          kind: "unsupported",
          message: "No rows in this slice expose cache-read-token support.",
        }),
      }),
    );
  });

  test("marks breakdown charts sparse when totals exist but the requested dimension has no series", () => {
    const response = {
      startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "day",
      metrics: ["requestCount"],
      breakdown: "selectedStrategy",
      buckets: [
        {
          startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
          endAtMs: Date.UTC(2026, 5, 11, 0, 0, 0),
          totals: {
            requestCount: 12,
          },
          series: [],
        },
      ],
      totals: {
        requestCount: 12,
      },
      ranking: null,
      labels: {},
      metadata: {
        matchedRowCount: 12,
        scannedRowCount: 12,
        aggregationRowCount: 12,
        truncated: false,
        truncationReason: null,
      },
      metricSupport: {
        requestCount: {
          metric: "requestCount",
          status: "supported",
          matchedRowCount: 12,
          supportedRowCount: 12,
          unsupportedRowCount: 0,
          nullValueCount: 0,
          reason: null,
        },
      },
      dimensionSupport: {
        selectedStrategy: {
          dimension: "selectedStrategy",
          status: "unsupported",
          matchedRowCount: 12,
          populatedRowCount: 0,
          sparseRowCount: 12,
          reason: "No rows in this slice include selectedStrategy.",
        },
      },
    } as unknown as RuntimeTelemetryAnalyticsResponse;

    const model = buildTelemetryTimeSeriesChartModel(response, {
      title: "Strategy Selection Trend",
      metrics: ["requestCount"],
      breakdown: "selectedStrategy",
    });

    expect(model).toEqual(
      expect.objectContaining({
        isEmpty: true,
        series: [],
        state: expect.objectContaining({
          kind: "unsupported",
          message: "No rows in this slice include selectedStrategy.",
        }),
      }),
    );
  });

  test("surfaces explicit mixed-version taxonomy coverage messaging for partial taxonomy breakdowns", () => {
    const response = {
      startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "day",
      metrics: ["requestCount"],
      breakdown: "taxonomyTaskType",
      buckets: [
        {
          startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
          endAtMs: Date.UTC(2026, 5, 11, 0, 0, 0),
          totals: {
            requestCount: 3,
          },
          series: [{ key: "coder.review", label: "coder.review", metrics: { requestCount: 2 } }],
        },
      ],
      totals: {
        requestCount: 3,
      },
      ranking: null,
      labels: {},
      metadata: {
        matchedRowCount: 3,
        scannedRowCount: 3,
        aggregationRowCount: 3,
        truncated: false,
        truncationReason: null,
        taxonomyCoverage: {
          matchedRowCount: 3,
          richerTaxonomyRowCount: 2,
          legacyRowCount: 1,
          coverageRate: 0.666667,
          backfillPerformed: false,
        },
      },
      metricSupport: {
        requestCount: {
          metric: "requestCount",
          status: "supported",
          matchedRowCount: 3,
          supportedRowCount: 3,
          unsupportedRowCount: 0,
          nullValueCount: 0,
          reason: null,
        },
      },
      dimensionSupport: {
        taxonomyTaskType: {
          dimension: "taxonomyTaskType",
          status: "partial",
          matchedRowCount: 3,
          populatedRowCount: 2,
          sparseRowCount: 1,
          reason:
            "1 row(s) in this slice do not include taxonomyTaskType. Richer taxonomy coverage in this range is 2/3 rows (66.7%); rows without richer taxonomy remain included and richer-taxonomy backfill is not performed.",
        },
      },
    } as unknown as RuntimeTelemetryAnalyticsResponse;

    const model = buildTelemetryTimeSeriesChartModel(response, {
      title: "Request Volume By Task",
      metrics: ["requestCount"],
      breakdown: "taxonomyTaskType",
    });

    expect(model.state).toEqual({
      kind: "partial",
      message:
        "1 row(s) in this slice do not include taxonomyTaskType. Richer taxonomy coverage in this range is 2/3 rows (66.7%); rows without richer taxonomy remain included and richer-taxonomy backfill is not performed.",
    });
  });

  test("surfaces backend truncation metadata in ranking chart states", () => {
    const response = {
      startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "day",
      metrics: ["requestCount"],
      breakdown: null,
      buckets: [],
      totals: {
        requestCount: 33,
      },
      ranking: {
        dimension: "endpointId",
        metric: "requestCount",
        rows: [
          { key: "endpoint-a", label: "endpoint-a", value: 4 },
          { key: "endpoint-b", label: "endpoint-b", value: 3 },
        ],
      },
      labels: {},
      metadata: {
        matchedRowCount: 33,
        scannedRowCount: 33,
        aggregationRowCount: 33,
        truncated: true,
        truncationReason:
          "Ranking limited to top 5 endpointId value(s) out of 33 matched value(s).",
      },
      metricSupport: {
        requestCount: {
          metric: "requestCount",
          status: "supported",
          matchedRowCount: 33,
          supportedRowCount: 33,
          unsupportedRowCount: 0,
          nullValueCount: 0,
          reason: null,
        },
      },
      dimensionSupport: {},
    } as unknown as RuntimeTelemetryAnalyticsResponse;

    const model = buildTelemetryRankingChartModel(response, {
      title: "Requests By Endpoint",
      metric: "requestCount",
    });

    expect(model.state).toEqual({
      kind: "truncated",
      message: "Ranking limited to top 5 endpointId value(s) out of 33 matched value(s).",
    });
  });

  test("selects stable query granularity from approved time ranges", () => {
    expect(resolveTelemetryGranularity(24 * 60 * 60 * 1000)).toBe("hour");
    expect(resolveTelemetryGranularity(7 * 24 * 60 * 60 * 1000)).toBe("day");
    expect(resolveTelemetryGranularity(90 * 24 * 60 * 60 * 1000)).toBe("week");
  });
});
