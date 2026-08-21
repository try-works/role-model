import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { UsageEvent } from "@role-model/protocol-types";

export type UsageEffortSource = "none" | "client" | "variant" | "variant_coerced";

export interface UsageEffortFields {
  readonly reasoning_effort?: string | null;
  readonly effort_source?: UsageEffortSource;
}

export type UsageEventRecord = UsageEvent & UsageEffortFields;

export interface UsageLinkageDecision {
  readonly request_id: string;
  readonly routing_decision_id: string;
  readonly reasoning_effort?: string | null;
  readonly effort_source?: UsageEffortSource;
}

function normalizeEffortFields(event: UsageEventRecord): Required<UsageEffortFields> {
  const reasoning_effort = event.reasoning_effort ?? null;
  const effort_source = event.effort_source ?? "none";
  return { reasoning_effort, effort_source };
}

function normalizeUsageEvent(event: UsageEventRecord): UsageEventRecord {
  return { ...event, ...normalizeEffortFields(event) };
}

export async function appendUsageEvent(
  outputDir: string,
  usageEvent: UsageEventRecord,
): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await appendFile(
    path.join(outputDir, "usage-events.jsonl"),
    `${JSON.stringify(normalizeUsageEvent(usageEvent))}\n`,
    "utf8",
  );
}

export async function readUsageEvents(outputDir: string): Promise<UsageEventRecord[]> {
  return (await readFile(path.join(outputDir, "usage-events.jsonl"), "utf8"))
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeUsageEvent(JSON.parse(line) as UsageEventRecord));
}

/** Read exactly one request's receipt without relying on latest/window ordering. */
export async function readUsageEventByRequestId(
  outputDir: string,
  requestId: string,
): Promise<UsageEventRecord | undefined> {
  if (!requestId) {
    throw new Error("requestId is required for an exact usage lookup.");
  }
  return (await readUsageEvents(outputDir)).find((event) => event.request_id === requestId);
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
  by_reasoning_effort: Record<string, number>;
  by_effort_source: Record<string, number>;
  by_endpoint_effort: Record<string, number>;
} {
  return {
    by_app_id: countBy(events.map((event) => event.app_id)),
    by_endpoint_id: countBy(events.map((event) => event.endpoint_id)),
    by_model_id: countBy(events.flatMap((event) => (event.model_id ? [event.model_id] : []))),
    by_provider_kind: countBy(events.map((event) => event.provider_kind)),
    by_reasoning_effort: countBy(
      events.map((event) => normalizeEffortFields(event).reasoning_effort ?? "default"),
    ),
    by_effort_source: countBy(events.map((event) => normalizeEffortFields(event).effort_source)),
    by_endpoint_effort: countBy(
      events.map((event) => {
        const effort = normalizeEffortFields(event).reasoning_effort ?? "default";
        return `${event.endpoint_id}|${effort}`;
      }),
    ),
  };
}

export function validateUsageLinkage(
  events: readonly UsageEventRecord[],
  decision: UsageLinkageDecision,
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
    const eventEffort = normalizeEffortFields(event);
    const decisionEffort = decision.reasoning_effort ?? null;
    if (eventEffort.reasoning_effort !== decisionEffort) {
      throw new Error(
        `Usage event ${event.event_id} reasoning_effort ${eventEffort.reasoning_effort ?? "default"} does not match ${decisionEffort ?? "default"}.`,
      );
    }
    if (decision.effort_source && eventEffort.effort_source !== decision.effort_source) {
      throw new Error(
        `Usage event ${event.event_id} effort_source ${eventEffort.effort_source} does not match ${decision.effort_source}.`,
      );
    }
  }
}
