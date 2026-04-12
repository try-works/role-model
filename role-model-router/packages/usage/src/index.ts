import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface UsageEventRecord {
  event_id: string;
  timestamp_ms: number;
  app_id: string;
  org_id: string;
  request_id: string;
  routing_decision_id: string;
  endpoint_id: string;
  model_id: string;
  package_id: string;
  provider_kind: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cost_estimate: number;
  currency: string;
  error_class: string;
}

export async function appendUsageEvent(
  outputDir: string,
  usageEvent: UsageEventRecord,
): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await appendFile(
    path.join(outputDir, "usage-events.jsonl"),
    `${JSON.stringify(usageEvent)}\n`,
    "utf8",
  );
}
