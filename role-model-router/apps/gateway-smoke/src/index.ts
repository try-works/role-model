import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { routeRequest } from "@role-model-router/core";
import { aggregateObservedPerformance } from "@role-model-router/profile-aggregator";
import { detectAcpEndpoints } from "@role-model-router/provider-acp";
import { detectCliEndpoints } from "@role-model-router/provider-cli";
import { detectMcpEndpoints } from "@role-model-router/provider-mcp";
import { exportStableConfig } from "@role-model-router/router-devtools";
import { writeTraceArtifacts } from "@role-model-router/trace";
import { appendUsageEvent } from "@role-model-router/usage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function main(): Promise<void> {
  const samplePath = path.join(repoRoot, "testdata", "endpoint-metadata", "sample-endpoints.json");
  const declared = JSON.parse(await readFile(samplePath, "utf8")) as {
    acp: Array<{
      endpoint_id: string;
      model_id: string;
      capabilities: string[];
      modalities: string[];
    }>;
    cli: Array<{
      endpoint_id: string;
      model_id: string;
      capabilities: string[];
      modalities: string[];
    }>;
    mcp: Array<{
      endpoint_id: string;
      model_id: string;
      capabilities: string[];
      modalities: string[];
    }>;
  };

  const candidates = [
    ...detectCliEndpoints(declared.cli),
    ...detectAcpEndpoints(declared.acp),
    ...detectMcpEndpoints(declared.mcp),
  ];

  const decision = routeRequest({
    request: {
      requestId: "gateway-smoke",
      taskType: "code.edit",
      requiredCapabilities: ["code.edit"],
      preferredCapabilities: ["reasoning.multi_step"],
      requiredModalities: ["text"],
      contextTokens: 4096,
      needsTools: true,
      strategy: "balanced",
      preferLocal: true,
      budgetLimit: 0.01,
    },
    candidates,
  });

  const chosen = candidates.find(
    (candidate) => candidate.identity.endpoint_id === decision.chosen_endpoint_id,
  );
  if (!chosen) {
    throw new Error("Gateway smoke did not produce a routable endpoint.");
  }

  const outputDir = path.join(repoRoot, "runtime-output", "gateway-smoke");
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "router-decision.json"),
    `${JSON.stringify(decision, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "observed-performance.json"),
    `${JSON.stringify(
      aggregateObservedPerformance({
        endpointId: chosen.identity.endpoint_id,
        judgeScore: chosen.observed?.judge_score ?? 0.8,
        latencyMs: chosen.observed?.latency_ms_p95 ?? 150,
        tokensPerSec: chosen.observed?.tokens_per_sec ?? 50,
        costPer1kTokensEst: chosen.observed?.cost_per_1k_tokens_est ?? 0,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );

  const now = Date.now();
  const eligibleCount = decision.eligibility.filter((candidate) => candidate.eligible).length;
  const ineligibleCount = decision.eligibility.length - eligibleCount;
  await writeTraceArtifacts(
    outputDir,
    [
      {
        trace_id: "trace-gateway-smoke",
        span_id: "span-router-eligibility",
        request_id: decision.request_id,
        routing_decision_id: decision.routing_decision_id,
        span_type: "router.eligibility",
        started_at_ms: now,
        ended_at_ms: now + 3,
        status: "ok",
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
        status: "ok",
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
        status: "ok",
        attributes: { chosen_endpoint_id: decision.chosen_endpoint_id },
      },
    ],
    [
      {
        event_id: "event-eligibility",
        trace_id: "trace-gateway-smoke",
        span_id: "span-router-eligibility",
        request_id: decision.request_id,
        routing_decision_id: decision.routing_decision_id,
        timestamp_ms: now + 1,
        event_type: "trace.span.opened",
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
        event_type: "trace.span.opened",
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
        event_type: "router.decision.created",
        payload: { chosen_endpoint_id: decision.chosen_endpoint_id },
      },
    ],
  );

  await appendUsageEvent(outputDir, {
    event_id: "usage-gateway-smoke",
    timestamp_ms: now + 11,
    app_id: "gateway-smoke",
    org_id: "local-dev",
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
  });

  const configPath = await exportStableConfig();
  console.log(
    JSON.stringify(
      {
        chosen_endpoint_id: decision.chosen_endpoint_id,
        router_decision_path: path.join(outputDir, "router-decision.json"),
        config_export_path: configPath,
      },
      null,
      2,
    ),
  );
}

await main();
