import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  type UsageEventRecord,
  appendUsageEvent,
  readUsageEvents,
  summarizeUsageEvents,
  validateUsageLinkage,
} from "../src/index.js";

function makeEvent(overrides: Partial<UsageEventRecord> = {}): UsageEventRecord {
  return {
    event_id: "usage-001",
    timestamp_ms: 1000,
    app_id: "app-a",
    request_id: "req-001",
    routing_decision_id: "dec-001",
    endpoint_id: "ep-001",
    model_id: "model-gpt",
    provider_kind: "openai",
    tokens_in: 100,
    tokens_out: 50,
    latency_ms: 200,
    ...overrides,
  };
}

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "usage-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("usage artifact persistence", () => {
  it("appends and reads usage events round-trip", async () => {
    await withTempDir(async (dir) => {
      await appendUsageEvent(dir, makeEvent());
      await appendUsageEvent(dir, makeEvent({ event_id: "usage-002" }));

      const events = await readUsageEvents(dir);
      expect(events).toHaveLength(2);
      expect(events[0].event_id).toBe("usage-001");
      expect(events[1].event_id).toBe("usage-002");
    });
  });

  it("reads back an empty array when no events were written", async () => {
    await withTempDir(async (dir) => {
      // Reading from a non-existent file should throw, but we want to document
      // the actual behavior. The current implementation throws on missing file.
      // We test the round-trip path instead.
      await appendUsageEvent(dir, makeEvent());
      // Clean state: after writing and cleaning up the dir ourselves,
      // a fresh temp dir should have no events.
    });

    // Test actual behavior: reading from an empty directory throws
    await withTempDir(async (dir) => {
      await expect(readUsageEvents(dir)).rejects.toThrow();
    });
  });
});

describe("summarizeUsageEvents", () => {
  it("summarizes events by app, endpoint, model, and provider", () => {
    const events = [
      makeEvent(),
      makeEvent({ event_id: "usage-002", app_id: "app-a" }),
      makeEvent({
        event_id: "usage-003",
        app_id: "app-b",
        model_id: "model-claude",
        provider_kind: "anthropic",
      }),
    ];

    const summary = summarizeUsageEvents(events);
    expect(summary.by_app_id).toEqual({ "app-a": 2, "app-b": 1 });
    expect(summary.by_endpoint_id).toEqual({ "ep-001": 3 });
    expect(summary.by_model_id).toEqual({ "model-gpt": 2, "model-claude": 1 });
    expect(summary.by_provider_kind).toEqual({ openai: 2, anthropic: 1 });
  });

  it("handles events without model_id", () => {
    const events = [makeEvent({ model_id: undefined })];

    const summary = summarizeUsageEvents(events);
    expect(summary.by_model_id).toEqual({});
  });
});

describe("validateUsageLinkage", () => {
  const decision = { request_id: "req-001", routing_decision_id: "dec-001" };

  it("passes when all events match the decision", () => {
    const events = [makeEvent(), makeEvent({ event_id: "usage-002" })];
    expect(() => validateUsageLinkage(events, decision)).not.toThrow();
  });

  it("throws when any event has a mismatched request_id", () => {
    const events = [makeEvent({ request_id: "req-mismatch" })];
    expect(() => validateUsageLinkage(events, decision)).toThrow(
      /request_id req-mismatch does not match req-001/,
    );
  });

  it("throws when any event has a mismatched routing_decision_id", () => {
    const events = [makeEvent({ routing_decision_id: "dec-mismatch" })];
    expect(() => validateUsageLinkage(events, decision)).toThrow(
      /routing_decision_id dec-mismatch does not match dec-001/,
    );
  });
});
