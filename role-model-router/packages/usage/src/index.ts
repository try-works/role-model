import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { UsageEvent } from "@role-model/protocol-types";

export type UsageEventRecord = UsageEvent;

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

export async function readUsageEvents(outputDir: string): Promise<UsageEventRecord[]> {
  return (await readFile(path.join(outputDir, "usage-events.jsonl"), "utf8"))
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as UsageEventRecord);
}

function countBy(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function summarizeUsageEvents(events: readonly UsageEventRecord[]): {
  by_app_id: Record<string, number>;
  by_endpoint_id: Record<string, number>;
  by_model_id: Record<string, number>;
  by_provider_kind: Record<string, number>;
} {
  return {
    by_app_id: countBy(events.map((event) => event.app_id)),
    by_endpoint_id: countBy(events.map((event) => event.endpoint_id)),
    by_model_id: countBy(events.flatMap((event) => (event.model_id ? [event.model_id] : []))),
    by_provider_kind: countBy(events.map((event) => event.provider_kind)),
  };
}

export function validateUsageLinkage(
  events: readonly UsageEventRecord[],
  decision: { request_id: string; routing_decision_id: string },
): void {
  for (const event of events) {
    if (event.request_id !== decision.request_id) {
      throw new Error(
        `Usage event ${event.event_id} request_id ${event.request_id} does not match ${decision.request_id}.`,
      );
    }
    if (event.routing_decision_id !== decision.routing_decision_id) {
      throw new Error(
        `Usage event ${event.event_id} routing_decision_id ${event.routing_decision_id} does not match ${decision.routing_decision_id}.`,
      );
    }
  }
}
