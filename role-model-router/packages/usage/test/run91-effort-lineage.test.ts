import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  type UsageEventRecord,
  readUsageEventByRequestId,
  readUsageEvents,
  summarizeUsageEvents,
  validateUsageLinkage,
} from "../src/index.js";

type EffortSource = "none" | "client" | "variant" | "variant_coerced";
type EffortFields = {
  reasoning_effort?: string | null;
  effort_source?: EffortSource;
};

function makeEvent(
  overrides: Partial<UsageEventRecord> & EffortFields = {},
): UsageEventRecord & EffortFields {
  return {
    event_id: "usage-001",
    timestamp_ms: 1000,
    app_id: "app-a",
    request_id: "req-001",
    routing_decision_id: "dec-001",
    endpoint_id: "ep-001",
    model_id: "model-deepseek-v4",
    provider_kind: "deepseek",
    tokens_in: 100,
    tokens_out: 50,
    latency_ms: 200,
    ...overrides,
  };
}

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "usage-run91-lineage-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Run 91 usage effort lineage", () => {
  it("keeps provider-default and effort instances distinct in usage summaries", () => {
    const events = [
      makeEvent({ reasoning_effort: null, effort_source: "none" }),
      makeEvent({
        event_id: "usage-002",
        endpoint_id: "ep-001-medium",
        reasoning_effort: "medium",
        effort_source: "variant",
      }),
      makeEvent({
        event_id: "usage-003",
        endpoint_id: "ep-002-low",
        reasoning_effort: "low",
        effort_source: "client",
      }),
    ];

    const summary = summarizeUsageEvents(events);

    expect(summary.by_reasoning_effort).toEqual({ default: 1, medium: 1, low: 1 });
    expect(summary.by_effort_source).toEqual({ none: 1, variant: 1, client: 1 });
    expect(summary.by_endpoint_effort).toEqual({
      "ep-001|default": 1,
      "ep-001-medium|medium": 1,
      "ep-002-low|low": 1,
    });
  });

  it("normalizes historical rows without effort columns to explicit provider-default nulls", async () => {
    await withTempDir(async (dir) => {
      await appendFile(join(dir, "usage-events.jsonl"), `${JSON.stringify(makeEvent())}\n`, "utf8");

      const events = await readUsageEvents(dir);
      expect(events[0]).toMatchObject({ reasoning_effort: null, effort_source: "none" });
    });
  });

  it("looks up one exact request id and never substitutes a latest/window row", async () => {
    await withTempDir(async (dir) => {
      const first = makeEvent({ request_id: "req-first" });
      const second = makeEvent({ event_id: "usage-002", request_id: "req-second" });
      const { appendUsageEvent } = await import("../src/index.js");
      await appendUsageEvent(dir, first);
      await appendUsageEvent(dir, second);

      await expect(readUsageEventByRequestId(dir, "req-first")).resolves.toMatchObject({
        request_id: "req-first",
      });
      await expect(readUsageEventByRequestId(dir, "req-missing")).resolves.toBeUndefined();
    });
  });

  it("rejects an effort receipt that does not match its request decision", () => {
    const event = makeEvent({ reasoning_effort: "medium", effort_source: "variant" });
    expect(() =>
      validateUsageLinkage([event], {
        request_id: "req-001",
        routing_decision_id: "dec-001",
        reasoning_effort: "low",
        effort_source: "variant",
      }),
    ).toThrow(/reasoning_effort medium does not match low/);
  });
});
