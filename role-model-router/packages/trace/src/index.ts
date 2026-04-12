import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface TraceSpanRecord {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  request_id: string;
  routing_decision_id: string;
  span_type: string;
  started_at_ms: number;
  ended_at_ms: number;
  status: "ok" | "error" | "cancelled";
  attributes: Record<string, string | number | boolean>;
}

export interface TraceEventRecord {
  event_id: string;
  trace_id: string;
  span_id: string;
  request_id: string;
  routing_decision_id: string;
  timestamp_ms: number;
  event_type: string;
  payload: Record<string, unknown>;
}

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
