import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  type TraceEventRecord,
  type TraceSpanRecord,
  readTraceArtifacts,
  validateTraceLinkage,
  writeTraceArtifacts,
} from "../src/index.js";

function makeSpan(overrides: Partial<TraceSpanRecord> = {}): TraceSpanRecord {
  return {
    trace_id: "trace-001",
    span_id: "span-001",
    request_id: "req-001",
    routing_decision_id: "dec-001",
    span_type: "router.selection",
    started_at_ms: 1000,
    ended_at_ms: 1100,
    status: "ok",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<TraceEventRecord> = {}): TraceEventRecord {
  return {
    event_id: "event-001",
    trace_id: "trace-001",
    span_id: "span-001",
    request_id: "req-001",
    routing_decision_id: "dec-001",
    timestamp_ms: 1050,
    event_type: "router.decision.created",
    payload: {},
    ...overrides,
  };
}

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "trace-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("trace artifact persistence", () => {
  it("writes and reads trace artifacts round-trip", async () => {
    await withTempDir(async (dir) => {
      const spans = [makeSpan(), makeSpan({ span_id: "span-002", parent_span_id: "span-001" })];
      const events = [makeEvent(), makeEvent({ event_id: "event-002", span_id: "span-002" })];

      await writeTraceArtifacts(dir, spans, events);
      const result = await readTraceArtifacts(dir);

      expect(result.spans).toHaveLength(2);
      expect(result.events).toHaveLength(2);
      expect(result.spans[0].span_id).toBe("span-001");
      expect(result.events[0].event_id).toBe("event-001");
    });
  });

  it("reads back an empty events file after writing only spans", async () => {
    await withTempDir(async (dir) => {
      const spans = [makeSpan()];
      const events: TraceEventRecord[] = [];

      await writeTraceArtifacts(dir, spans, events);
      const result = await readTraceArtifacts(dir);

      expect(result.spans).toHaveLength(1);
      expect(result.events).toEqual([]);
    });
  });
});

describe("validateTraceLinkage", () => {
  it("passes for valid linkage", () => {
    const spans = [makeSpan()];
    const events = [makeEvent()];
    expect(() => validateTraceLinkage(spans, events)).not.toThrow();
  });

  it("throws when a span references a missing parent span", () => {
    const spans = [makeSpan({ span_id: "span-002", parent_span_id: "span-999" })];
    const events: TraceEventRecord[] = [];
    expect(() => validateTraceLinkage(spans, events)).toThrow(/missing parent span span-999/);
  });

  it("throws when an event references an unknown trace", () => {
    const spans = [makeSpan()];
    const events = [makeEvent({ trace_id: "trace-unknown", span_id: undefined })];
    expect(() => validateTraceLinkage(spans, events)).toThrow(/unknown trace trace-unknown/);
  });

  it("throws when an event references an unknown span", () => {
    const spans = [makeSpan()];
    const events = [makeEvent({ span_id: "span-unknown" })];
    expect(() => validateTraceLinkage(spans, events)).toThrow(/unknown span span-unknown/);
  });

  it("throws when an event request_id does not match its span", () => {
    const spans = [makeSpan({ request_id: "req-001" })];
    const events = [makeEvent({ request_id: "req-mismatch", span_id: "span-001" })];
    expect(() => validateTraceLinkage(spans, events)).toThrow(
      /request_id does not match span span-001/,
    );
  });

  it("throws when an event routing_decision_id does not match its span", () => {
    const spans = [makeSpan({ routing_decision_id: "dec-001" })];
    const events = [makeEvent({ routing_decision_id: "dec-mismatch", span_id: "span-001" })];
    expect(() => validateTraceLinkage(spans, events)).toThrow(
      /routing_decision_id does not match span span-001/,
    );
  });
});
