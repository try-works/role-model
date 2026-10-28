import { describe, expect, it } from "vitest";

import { Message } from "../src/message";
import {
  buildRequestsRankingQuery,
  createRequestsRankingClient,
  initialRequestsRankingState,
  REQUESTS_RANKING_METRIC_OPTIONS,
  REQUESTS_RANKING_TARGET_OPTIONS,
} from "../src/requests-ranking";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S413: Requests ranking metric/target filters -> POST /telemetry/query with the original body. */

const stateWith = (extra: Partial<ReturnType<typeof initialRequestsRankingState>> = {}) => ({
  ...initialRequestsRankingState(),
  ...extra,
});
const modelWith = (requestsRanking: ReturnType<typeof initialRequestsRankingState>) =>
  shellModel({ requestsRanking });
const commandsOf = (result: ReturnType<typeof shellUpdate>) => result.commands ?? [];

describe("S413 requests ranking controls", () => {
  it("keeps the original metric and target option sets", () => {
    expect(REQUESTS_RANKING_METRIC_OPTIONS).toEqual([
      { label: "Requests", value: "requestCount" },
      { label: "Total tokens", value: "totalTokens" },
      { label: "Effective cost", value: "effectiveCostUsd" },
      { label: "Average latency", value: "averageLatencyMs" },
      { label: "Cache hit rate", value: "cacheHitTokenRate" },
    ]);
    expect(REQUESTS_RANKING_TARGET_OPTIONS.map((option) => option.value)).toEqual([
      "endpointId",
      "modelId",
      "reasoningEffort",
      "effortSource",
      "providerId",
      "taxonomyGroupId",
      "taxonomyRoleId",
      "taxonomyTaskType",
      "taxonomyTaskVariant",
      "taxonomyCapabilityId",
      "taxonomyModalityId",
      "taxonomyToolClassId",
    ]);
  });

  it("builds the exact original POST /telemetry/query body", () => {
    expect(buildRequestsRankingQuery({ metric: "averageLatencyMs", rankingTarget: "endpointId" })).toEqual({
      breakdown: null,
      filters: {},
      granularity: "day",
      metrics: ["averageLatencyMs"],
      ranking: { dimension: "endpointId", limit: 8, metric: "averageLatencyMs" },
      windowMs: 604800000,
    });
  });

  it("POSTs that exact body to /telemetry/query", async () => {
    const calls: Array<{ body?: string; url: string }> = [];
    // SAFETY: this stub only records the JSON string body the client sends.
    const fetchImpl = (async (url: string, init?: { body?: string }) => {
      calls.push({ body: init?.body, url });
      return new Response(JSON.stringify({ ranking: { dimension: "endpointId", metric: "averageLatencyMs", rows: [{ key: "a", label: "A", value: 1 }] } }), { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    const client = createRequestsRankingClient({ fetchImpl });
    const rows = await client.query(buildRequestsRankingQuery({ metric: "averageLatencyMs", rankingTarget: "endpointId" }));
    expect(calls[0]?.url).toBe("/api/role-model/telemetry/query");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual(buildRequestsRankingQuery({ metric: "averageLatencyMs", rankingTarget: "endpointId" }));
    expect(rows).toEqual([{ key: "a", label: "A", value: 1 }]);
  });
});


describe("S417 freshness during loading", () => {
  it("refences an in-flight query when the metric changes while loading", () => {
    const loading = modelWith(stateWith({ metric: "averageLatencyMs", status: "loading" as const, token: 2 }));
    const changed = shellUpdate(loading, Message.RequestsRankingFieldChanged({ field: "metric", value: "requestCount" }));
    expect((changed.commands ?? []).map((command) => command.name)).toEqual(["QueryRequestsRanking"]);
    const payload = JSON.parse(String((changed.commands ?? [])[0]?.args?.payload));
    expect(payload.metrics).toEqual(["requestCount"]);
    expect(changed.model.requestsRanking?.status).toBe("loading");
    expect(changed.model.requestsRanking?.token).toBe(3);
    const old = shellUpdate(changed.model, Message.RequestsRankingLoaded({ rows: [{ key: "old", label: "Old", value: 1 }], token: 2 }));
    expect(old.model.requestsRanking?.status).toBe("loading");
    expect(old.model.requestsRanking?.rows).toEqual([]);
    const fresh = shellUpdate(old.model, Message.RequestsRankingLoaded({ rows: [{ key: "new", label: "New", value: 2 }], token: 3 }));
    expect(fresh.model.requestsRanking?.status).toBe("ok");
    expect(fresh.model.requestsRanking?.rows).toEqual([{ key: "new", label: "New", value: 2 }]);
  });


  it("invalidates the active token when an unsupported selection is set", () => {
    const loading = modelWith(stateWith({ metric: "averageLatencyMs", status: "loading" as const, token: 2 }));
    const invalid = shellUpdate(loading, Message.RequestsRankingFieldChanged({ field: "metric", value: "not-a-metric" }));
    expect(invalid.commands ?? []).toEqual([]);
    expect(invalid.model.requestsRanking?.status).toBe("error");
    expect(invalid.model.requestsRanking?.message).toMatch(/supported metric/);
    expect(invalid.model.requestsRanking?.token).toBe(3);
    const lateLoaded = shellUpdate(invalid.model, Message.RequestsRankingLoaded({ rows: [{ key: "old", label: "Old", value: 1 }], token: 2 }));
    expect(lateLoaded.model.requestsRanking?.status).toBe("error");
    expect(lateLoaded.model.requestsRanking?.rows).toEqual([]);
    expect(lateLoaded.model.requestsRanking?.message).toMatch(/supported metric/);
    const lateFailed = shellUpdate(invalid.model, Message.RequestsRankingFailed({ message: "old failed", token: 2 }));
    expect(lateFailed.model.requestsRanking?.status).toBe("error");
    expect(lateFailed.model.requestsRanking?.message).toMatch(/supported metric/);
  });

  it("ignores a stale failure from the superseded query", () => {
    const loading = modelWith(stateWith({ rankingTarget: "providerId", status: "loading" as const, token: 2 }));
    const changed = shellUpdate(loading, Message.RequestsRankingFieldChanged({ field: "rankingTarget", value: "modelId" }));
    const stale = shellUpdate(changed.model, Message.RequestsRankingFailed({ message: "old failed", token: 2 }));
    expect(stale.model.requestsRanking?.status).toBe("loading");
    expect(stale.model.requestsRanking?.message).toBeUndefined();
  });
});
describe("S413 requests ranking state machine", () => {
  it("auto-queries one token-fenced command when the metric changes", () => {
    const changed = shellUpdate(modelWith(stateWith()), Message.RequestsRankingFieldChanged({ field: "metric", value: "totalTokens" }));
    expect(changed.model.requestsRanking?.metric).toBe("totalTokens");
    expect((changed.commands ?? []).map((command) => command.name)).toEqual(["QueryRequestsRanking"]);
    expect(JSON.parse(String((changed.commands ?? [])[0]?.args?.payload)).metrics).toEqual(["totalTokens"]);
    expect(changed.model.requestsRanking?.status).toBe("loading");
  });

  it("auto-queries when the ranking target changes and keeps the current metric", () => {
    const changed = shellUpdate(modelWith(stateWith({ metric: "totalTokens" })), Message.RequestsRankingFieldChanged({ field: "rankingTarget", value: "providerId" }));
    const payload = JSON.parse(String((changed.commands ?? [])[0]?.args?.payload));
    expect(payload.ranking.dimension).toBe("providerId");
    expect(payload.ranking.metric).toBe("totalTokens");
  });

  it("refuses a second submit while loading and fences stale results", () => {
    const loading = modelWith(stateWith({ status: "loading" as const, token: 2 }));
    expect(commandsOf(shellUpdate(loading, Message.RequestsRankingSubmitRequested({})))).toEqual([]);
    const stale = shellUpdate(loading, Message.RequestsRankingLoaded({ rows: [], token: 1 }));
    expect(stale.model.requestsRanking?.status).toBe("loading");
  });

  it("maps empty and error results honestly while keeping the controls", () => {
    const loading = modelWith(stateWith({ metric: "totalTokens", rankingTarget: "providerId", status: "loading" as const, token: 2 }));
    const empty = shellUpdate(loading, Message.RequestsRankingLoaded({ rows: [], token: 2 }));
    expect(empty.model.requestsRanking?.status).toBe("empty");
    const failed = shellUpdate(loading, Message.RequestsRankingFailed({ message: "query failed", token: 2 }));
    expect(failed.model.requestsRanking?.status).toBe("error");
    expect(failed.model.requestsRanking?.message).toBe("query failed");
    expect(failed.model.requestsRanking?.metric).toBe("totalTokens");
    expect(failed.model.requestsRanking?.rankingTarget).toBe("providerId");
  });
});
