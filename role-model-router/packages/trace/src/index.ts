import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { TraceEvent, TraceSpan } from "@role-model/protocol-types";

export type TraceSpanRecord = TraceSpan;
export type TraceEventRecord = TraceEvent;

export async function writeTraceArtifacts(
  outputDir: string,
  spans: TraceSpanRecord[],
  events: TraceEventRecord[],
): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "trace-spans.json"),
    `${JSON.stringify(spans, null, 2)}\n`,
    "utf8",
  );
  for (const event of events) {
    await appendFile(
      path.join(outputDir, "trace-events.jsonl"),
      `${JSON.stringify(event)}\n`,
      "utf8",
    );
  }
}

export async function readTraceArtifacts(outputDir: string): Promise<{
  spans: TraceSpanRecord[];
  events: TraceEventRecord[];
}> {
  const spans = JSON.parse(
    await readFile(path.join(outputDir, "trace-spans.json"), "utf8"),
  ) as TraceSpanRecord[];
  const events = (await readFile(path.join(outputDir, "trace-events.jsonl"), "utf8"))
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TraceEventRecord);
  return { spans, events };
}

export function validateTraceLinkage(
  spans: readonly TraceSpanRecord[],
  events: readonly TraceEventRecord[],
): void {
  const spanIds = new Set(spans.map((span) => span.span_id));
  const traceIds = new Set(spans.map((span) => span.trace_id));

  for (const span of spans) {
    if (span.parent_span_id && !spanIds.has(span.parent_span_id)) {
      throw new Error(`Trace span ${span.span_id} references missing parent span ${span.parent_span_id}.`);
    }
  }

  for (const event of events) {
    if (!traceIds.has(event.trace_id)) {
      throw new Error(`Trace event ${event.event_id} references unknown trace ${event.trace_id}.`);
    }
    if (event.span_id && !spanIds.has(event.span_id)) {
      throw new Error(`Trace event ${event.event_id} references unknown span ${event.span_id}.`);
    }
    const span = event.span_id ? spans.find((candidate) => candidate.span_id === event.span_id) : undefined;
    if (span) {
      if (span.request_id !== event.request_id) {
        throw new Error(`Trace event ${event.event_id} request_id does not match span ${event.span_id}.`);
      }
      if (span.routing_decision_id !== event.routing_decision_id) {
        throw new Error(
          `Trace event ${event.event_id} routing_decision_id does not match span ${event.span_id}.`,
        );
      }
    }
  }
}
