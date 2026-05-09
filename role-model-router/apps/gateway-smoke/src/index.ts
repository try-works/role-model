import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";
import {
  aggregateObservedPerformanceSamples,
  validateObservedPerformanceProfileConsistency,
} from "@role-model-router/profile-aggregator";
import {
  createRuntimeObservationBundle,
} from "@role-model-router/runtime-observability";
import { createOpenTelemetryGenAiExport } from "@role-model-router/runtime-observability/otel";
import { readRuntimeMaintenancePolicy } from "@role-model-router/sqlite-memory";
import {
  readTraceArtifacts,
  type TraceEventRecord,
  type TraceSpanRecord,
  validateTraceLinkage,
  writeTraceArtifacts,
} from "@role-model-router/trace";
import {
  appendUsageEvent,
  readUsageEvents,
  summarizeUsageEvents,
  validateUsageLinkage,
} from "@role-model-router/usage";

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
  const validation = await runRuntimeAdapterValidation({
    repoRoot,
    fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
    runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-adapter"),
    scopeId: "gateway-smoke",
  });
  const decision = validation.decision;
  const chosen = validation.execution.target.candidate;
  const observedProfiles = JSON.parse(
    await readFile(path.join(repoRoot, "testdata", "router-runtime", "routing-observed-profiles.json"), "utf8"),
  ) as Record<
    string,
    {
      endpoint_id: string;
      judge_score?: number;
      latency_ms_p50?: number;
      latency_ms_p95?: number;
      tokens_per_sec?: number;
      cost_per_1k_tokens_est?: number;
    }
  >;
  const observabilityHistory = JSON.parse(
    await readFile(path.join(repoRoot, "testdata", "router-runtime", "observability-history.json"), "utf8"),
  ) as {
    byEndpointId: Record<string, Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]>;
  };
  const observabilityPolicy = JSON.parse(
    await readFile(path.join(repoRoot, "testdata", "router-runtime", "observability-policy.json"), "utf8"),
  ) as Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"];
  const chosenObserved = observedProfiles[decision.chosen_endpoint_id];
  if (!decision.chosen_endpoint_id) {
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
        latency_ms: chosenObserved?.latency_ms_p50 ?? 120,
        latency_ms_p95: chosenObserved?.latency_ms_p95 ?? 180,
        tokens_per_sec: chosenObserved?.tokens_per_sec ?? 50,
        cost_per_1k_tokens_est: chosenObserved?.cost_per_1k_tokens_est ?? 0.001,
        judge_score: chosenObserved?.judge_score ?? 0.8,
      },
      {
        endpoint_id: chosen.identity.endpoint_id,
        endpoint_version: endpointVersion,
        source_type: "live_request",
        timestamp_ms: now - 25,
        latency_ms: validation.execution.normalized.latencyMs,
        latency_ms_p95: validation.execution.normalized.latencyMs,
        tokens_per_sec:
          validation.execution.normalized.usage.outputTokens > 0 &&
          validation.execution.normalized.latencyMs > 0
            ? Math.round(
                (validation.execution.normalized.usage.outputTokens /
                  validation.execution.normalized.latencyMs) *
                  1000,
              )
            : chosenObserved?.tokens_per_sec ?? 55,
        cost_per_1k_tokens_est:
          typeof validation.execution.usageEvent.cost_estimate === "number"
            ? validation.execution.usageEvent.cost_estimate
            : chosenObserved?.cost_per_1k_tokens_est ?? 0.001,
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
  const routingSpans: TraceSpanRecord[] = [
    {
      trace_id: `trace-${decision.request_id}`,
      span_id: `span-router-eligibility-${decision.request_id}`,
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      span_type: "router.eligibility" as const,
      started_at_ms: now,
      ended_at_ms: now + 3,
      status: "ok" as const,
      attributes: {
        eligible_count: eligibleCount,
        ineligible_count: ineligibleCount,
      },
    },
    {
      trace_id: `trace-${decision.request_id}`,
      span_id: `span-router-scoring-${decision.request_id}`,
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      span_type: "router.scoring" as const,
      started_at_ms: now + 3,
      ended_at_ms: now + 7,
      status: "ok" as const,
      attributes: {
        scored_candidate_count: decision.scored_candidates.length,
      },
    },
    {
      trace_id: `trace-${decision.request_id}`,
      span_id: `span-router-selection-${decision.request_id}`,
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      span_type: "router.selection" as const,
      started_at_ms: now + 7,
      ended_at_ms: now + 10,
      status: "ok" as const,
      attributes: {
        chosen_endpoint_id: decision.chosen_endpoint_id,
      },
    },
  ];
  const routingEvents: TraceEventRecord[] = [
    {
      event_id: `event-router-eligibility-${decision.request_id}`,
      trace_id: `trace-${decision.request_id}`,
      span_id: routingSpans[0].span_id,
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      timestamp_ms: now + 1,
      event_type: "trace.span.opened" as const,
      payload: {
        eligible_count: eligibleCount,
        ineligible_count: ineligibleCount,
      },
    },
    {
      event_id: `event-router-selection-${decision.request_id}`,
      trace_id: `trace-${decision.request_id}`,
      span_id: routingSpans[2].span_id,
      request_id: decision.request_id,
      routing_decision_id: decision.routing_decision_id,
      timestamp_ms: now + 8,
      event_type: "router.decision.created" as const,
      payload: {
        chosen_endpoint_id: decision.chosen_endpoint_id,
      },
    },
  ];
  const spans = [...routingSpans, ...validation.execution.trace.spans];
  const events = [...routingEvents, ...validation.execution.trace.events];
  validateTraceLinkage(spans, events);
  const usageEvent = validation.execution.usageEvent;
  validateUsageLinkage([usageEvent], decision);

  const outputDir = path.join(repoRoot, "runtime-output", "gateway-smoke");
  await mkdir(outputDir, { recursive: true });
  await Promise.all(
    [
      "router-decision.json",
      "observed-performance.json",
      "request-capture.json",
      "response-capture.json",
        "normalized-response.json",
        "adapter-diagnostics.json",
        "request-observation.json",
        "endpoint-profile-state.json",
        "otel-export.json",
        "trace-spans.json",
        "trace-events.jsonl",
        "usage-events.jsonl",
    ].map((name) => rm(path.join(outputDir, name), { force: true })),
  );
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
  await writeFile(
    path.join(outputDir, "request-capture.json"),
    `${JSON.stringify(validation.execution.requestCapture, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "response-capture.json"),
    `${JSON.stringify(validation.execution.responseCapture, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "normalized-response.json"),
    `${JSON.stringify(validation.execution.normalized, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "adapter-diagnostics.json"),
    `${JSON.stringify(validation.execution.diagnostics, null, 2)}\n`,
    "utf8",
  );
  const observation = createRuntimeObservationBundle({
    decision: validation.decision,
    routingDiagnostics: validation.routingDiagnostics,
    retrievalReceipt: validation.retrievalReceipt,
    contextEnvelope: validation.contextEnvelope,
    execution: validation.execution,
    priorSamples: observabilityHistory.byEndpointId[decision.chosen_endpoint_id] ?? [],
    maintenancePolicy: readRuntimeMaintenancePolicy({
      databasePath: validation.databasePath,
    }),
    capturePolicy: observabilityPolicy,
  });
  const otelExport = createOpenTelemetryGenAiExport(observation);
  await writeFile(
    path.join(outputDir, "request-observation.json"),
    `${JSON.stringify(observation, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "endpoint-profile-state.json"),
    `${JSON.stringify(observation.inspection.endpoint, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "otel-export.json"),
    `${JSON.stringify(otelExport, null, 2)}\n`,
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

  console.log(
    JSON.stringify(
      {
        chosen_endpoint_id: decision.chosen_endpoint_id,
        adapter_family: validation.execution.target.adapterFamily,
        router_decision_path: path.join(outputDir, "router-decision.json"),
        request_capture_path: path.join(outputDir, "request-capture.json"),
        response_capture_path: path.join(outputDir, "response-capture.json"),
        request_observation_path: path.join(outputDir, "request-observation.json"),
        otel_export_path: path.join(outputDir, "otel-export.json"),
        usage_summary: summarizeUsageEvents(writtenUsageEvents),
      },
      null,
      2,
    ),
  );
}

await main();
