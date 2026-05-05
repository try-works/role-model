import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { routeRequest } from "@role-model-router/core";
import {
  aggregateObservedPerformanceSamples,
  validateObservedPerformanceProfileConsistency,
} from "@role-model-router/profile-aggregator";
import {
  readTraceArtifacts,
  validateTraceLinkage,
  writeTraceArtifacts,
} from "@role-model-router/trace";
import {
  appendUsageEvent,
  readUsageEvents,
  summarizeUsageEvents,
  validateUsageLinkage,
} from "@role-model-router/usage";
import { exportStableConfig } from "@role-model-router/router-devtools";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const schemaDir = path.join(repoRoot, "protocol", "schemas");

type JsonSchema = Record<string, unknown>;

async function createAjv() {
  const ajvModule: typeof import("ajv/dist/2020.js") = require("ajv/dist/2020.js");
  const formatsModule: typeof import("ajv-formats") = require("ajv-formats");
  const Ajv2020 = ajvModule.default;
  const addFormats = formatsModule.default;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);

  const { readdir } = await import("node:fs/promises");
  const names = (await readdir(schemaDir)).filter((name) => name.endsWith(".schema.json")).sort();
  for (const fileName of names) {
    const schema = JSON.parse(await readFile(path.join(schemaDir, fileName), "utf8")) as JsonSchema;
    ajv.addSchema(schema, String(schema.$id));
  }

  return ajv;
}

function assertValid(
  validate: ((data: unknown) => boolean) & { errors?: unknown },
  payload: unknown,
  label: string,
): void {
  if (!validate(payload)) {
    throw new Error(`${label}\n${JSON.stringify(validate.errors, null, 2)}`);
  }
}

function deriveEndpointVersion(candidate: {
  identity: { endpoint_version?: string; runtime_version: string; variant_id?: string };
}): string {
  return (
    candidate.identity.endpoint_version ??
    `${candidate.identity.runtime_version}:${candidate.identity.variant_id ?? "default"}`
  );
}

async function main(): Promise<void> {
  const fixturePath = path.join(
    repoRoot,
    "protocol",
    "fixtures",
    "router-golden",
    "cases",
    "measured-profile-prefers-observed.json",
  );
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
    input: Parameters<typeof routeRequest>[0];
  };

  const decision = routeRequest(fixture.input);
  const chosen = fixture.input.candidates.find(
    (candidate) => candidate.identity.endpoint_id === decision.chosen_endpoint_id,
  );
  if (!chosen) {
    throw new Error("Gateway smoke did not produce a routable endpoint.");
  }

  const endpointVersion = deriveEndpointVersion(chosen);
  const now = Date.now();
  const observedProfile = aggregateObservedPerformanceSamples(
    [
      {
        endpoint_id: chosen.identity.endpoint_id,
        endpoint_version: endpointVersion,
        source_type: "benchmark",
        timestamp_ms: now - 250,
        latency_ms: chosen.observed?.latency_ms_p50 ?? 120,
        latency_ms_p95: chosen.observed?.latency_ms_p95 ?? 180,
        tokens_per_sec: chosen.observed?.tokens_per_sec ?? 50,
        cost_per_1k_tokens_est: chosen.observed?.cost_per_1k_tokens_est ?? 0.001,
        judge_score: chosen.observed?.judge_score ?? chosen.observed?.quality_score ?? 0.8,
      },
      {
        endpoint_id: chosen.identity.endpoint_id,
        endpoint_version: endpointVersion,
        source_type: "live_request",
        timestamp_ms: now - 25,
        latency_ms: chosen.observed?.latency_ms_p50 ?? 110,
        latency_ms_p95: chosen.observed?.latency_ms_p95 ?? 160,
        tokens_per_sec: chosen.observed?.tokens_per_sec ?? 55,
        cost_per_1k_tokens_est: chosen.observed?.cost_per_1k_tokens_est ?? 0.001,
        failure: false,
        request_id: decision.request_id,
        routing_decision_id: decision.routing_decision_id,
      },
    ],
    { nowMs: now },
  );
  validateObservedPerformanceProfileConsistency(observedProfile);

  const eligibleCount = decision.eligibility.filter((candidate) => candidate.eligible).length;
  const ineligibleCount = decision.eligibility.length - eligibleCount;
  const spans = [
    {
      trace_id: "trace-gateway-smoke",
      span_id: "span-router-eligibility",
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      span_type: "router.eligibility",
      started_at_ms: now,
      ended_at_ms: now + 3,
      status: "ok" as const,
      attributes: {
        eligible_count: eligibleCount,
        ineligible_count: ineligibleCount,
      },
    },
    {
      trace_id: "trace-gateway-smoke",
      span_id: "span-router-scoring",
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      span_type: "router.scoring",
      started_at_ms: now + 3,
      ended_at_ms: now + 7,
      status: "ok" as const,
      attributes: {
        scored_candidate_count: decision.scored_candidates.length,
      },
    },
    {
      trace_id: "trace-gateway-smoke",
      span_id: "span-router-selection",
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      span_type: "router.selection",
      started_at_ms: now + 7,
      ended_at_ms: now + 10,
      status: "ok" as const,
      attributes: { chosen_endpoint_id: decision.chosen_endpoint_id },
    },
  ];
  const events = [
    {
      event_id: "event-eligibility",
      trace_id: "trace-gateway-smoke",
      span_id: "span-router-eligibility",
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      timestamp_ms: now + 1,
      event_type: "trace.span.opened" as const,
      payload: {
        span_id: "span-router-eligibility",
        span_type: "router.eligibility",
        eligible_count: eligibleCount,
        ineligible_count: ineligibleCount,
      },
    },
    {
      event_id: "event-scoring",
      trace_id: "trace-gateway-smoke",
      span_id: "span-router-scoring",
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      timestamp_ms: now + 5,
      event_type: "trace.span.opened" as const,
      payload: {
        span_id: "span-router-scoring",
        span_type: "router.scoring",
        scored_candidate_count: decision.scored_candidates.length,
      },
    },
    {
      event_id: "event-selection",
      trace_id: "trace-gateway-smoke",
      span_id: "span-router-selection",
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      timestamp_ms: now + 8,
      event_type: "router.decision.created" as const,
      payload: { chosen_endpoint_id: decision.chosen_endpoint_id },
    },
  ];
  validateTraceLinkage(spans, events);

  const usageEvent = {
    event_id: "usage-gateway-smoke",
    timestamp_ms: now + 11,
    app_id: decision.app_id,
    org_id: decision.org_id ?? undefined,
    request_id: decision.request_id,
    routing_decision_id: decision.routing_decision_id,
    endpoint_id: chosen.identity.endpoint_id,
    model_id: chosen.identity.model_id,
    package_id: chosen.identity.package_id,
    provider_kind: chosen.identity.provider_kind,
    tokens_in: 32,
    tokens_out: 24,
    latency_ms: chosen.observed?.latency_ms_p95 ?? 150,
    cost_estimate: chosen.observed?.cost_per_1k_tokens_est ?? 0,
    currency: "USD",
    error_class: "none",
  };
  validateUsageLinkage([usageEvent], decision);

  const outputDir = path.join(repoRoot, "runtime-output", "gateway-smoke");
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "router-decision.json"),
    `${JSON.stringify(decision, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "observed-performance.json"),
    `${JSON.stringify(observedProfile, null, 2)}\n`,
    "utf8",
  );
  await writeTraceArtifacts(outputDir, spans, events);
  await appendUsageEvent(outputDir, usageEvent);

  const { spans: writtenSpans, events: writtenEvents } = await readTraceArtifacts(outputDir);
  const writtenUsageEvents = await readUsageEvents(outputDir);
  validateTraceLinkage(writtenSpans, writtenEvents);
  validateUsageLinkage(writtenUsageEvents, decision);

  const ajv = await createAjv();
  const validators = {
    routerDecision: ajv.getSchema("router-decision.schema.json"),
    observedProfile: ajv.getSchema("observed-performance-profile.schema.json"),
    traceSpan: ajv.getSchema("trace-span.schema.json"),
    traceEvent: ajv.getSchema("trace-event.schema.json"),
    usageEvent: ajv.getSchema("usage-event.schema.json"),
  };
  if (
    !validators.routerDecision ||
    !validators.observedProfile ||
    !validators.traceSpan ||
    !validators.traceEvent ||
    !validators.usageEvent
  ) {
    throw new Error("Gateway smoke could not compile the canonical observability schemas.");
  }

  assertValid(validators.routerDecision, decision, "router-decision");
  assertValid(validators.observedProfile, observedProfile, "observed-performance");
  for (const span of writtenSpans) {
    assertValid(validators.traceSpan, span, "trace-span");
  }
  for (const event of writtenEvents) {
    assertValid(validators.traceEvent, event, "trace-event");
  }
  for (const event of writtenUsageEvents) {
    assertValid(validators.usageEvent, event, "usage-event");
  }

  const configPath = await exportStableConfig();
  console.log(
    JSON.stringify(
      {
        chosen_endpoint_id: decision.chosen_endpoint_id,
        router_decision_path: path.join(outputDir, "router-decision.json"),
        config_export_path: configPath,
        usage_summary: summarizeUsageEvents(writtenUsageEvents),
      },
      null,
      2,
    ),
  );
}

await main();
