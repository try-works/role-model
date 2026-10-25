import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import {
  RouteDecisionProducer,
  RouteDecisionProducerLive,
  routeRequest,
  type RouteRequestInput,
} from "@role-model-router/core";
import {
  type ProjectRuntimeRouteInputInput,
  projectRuntimeRouteInput,
  routeRuntimeRequest,
} from "../src/index.js";
import { TEST_CATALOG } from "./test-catalog-fixture.js";

/**
 * Run 115 S7c (R25): one parity matrix for the pure kernel, the Effect producer and the wired
 * caller. Expectations are derived from the kernel on the projected input; the wired path is
 * compared byte-for-byte (JSON key order included), not just by selected fields.
 */

interface RegistryEndpoint {
  readonly identity: Record<string, unknown>;
  readonly declared: Record<string, unknown>;
  readonly status: "active";
}

function endpoint(
  endpointId: string,
  modelId: string,
  overrides: {
    readonly reasoningEffort?: string | null;
    readonly capabilities?: readonly string[];
    readonly tools?: boolean;
    readonly maxContextTokens?: number;
  } = {},
): RegistryEndpoint {
  const capabilities = overrides.capabilities ?? ["text.chat"];
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "run115-s7c",
      region: "global",
      ...(overrides.reasoningEffort === undefined
        ? {}
        : { reasoning_effort: overrides.reasoningEffort }),
    },
    declared: {
      endpoint_id: endpointId,
      capabilities,
      modalities: ["text"],
      max_context_tokens: overrides.maxContextTokens ?? 32768,
      tool_calling: { supported: overrides.tools ?? false, style: "openai" },
      supports_embeddings: false,
      platform_constraints: [],
    },
    status: "active",
  };
}

function runtimeInput(
  overrides: Partial<ProjectRuntimeRouteInputInput> = {},
): ProjectRuntimeRouteInputInput {
  return {
    request: {
      requestId: "run115-s7c-matrix",
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens: 64,
      needsTools: false,
      strategy: "balanced",
      preferLocal: false,
    },
    catalog: TEST_CATALOG,
    registry: { endpoints: [], diagnostics: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } },
    observedProfilesByEndpointId: {},
    envelope: {
      sessionId: "session-s7c",
      conversationId: "conversation-s7c",
      selectedTurns: [],
      selectedArtifacts: [],
      latestHandoff: null,
      estimatedTokenCount: 0,
      diagnostics: [],
    },
    retrievalReceipt: {
      receiptId: "conversation-s7c-retrieval-receipt",
      conversationId: "conversation-s7c",
      summary: {
        selectedTurns: 0,
        selectedArtifacts: 0,
        omittedTurns: 0,
        omittedArtifacts: 0,
        estimatedTokens: 0,
      },
      entries: [],
    },
    roleDefinitions: [],
    taskDefinitions: [],
    roleBindings: [],
    ...overrides,
  };
}

function registry(endpoints: readonly RegistryEndpoint[]) {
  return { endpoints, diagnostics: [], lifecycleSummary: { active: endpoints.length, degraded: 0, offline: 0 } };
}

const roleDefinitions = [
  {
    role_id: "coder",
    name: "Coder",
    description: "Code work",
    role_kind: "assistant",
    default_system_instructions: "Operate as coder.",
    task_types_supported: ["code.edit"],
    required_capabilities: [],
    preferred_capabilities: [],
    forbidden_capabilities: [],
    tool_policy: { mode: "allowed" },
    routing_policy_overrides: {},
    output_contracts: [],
    safety_policy_refs: [],
  },
];
const taskDefinitions = [
  {
    task_type: "code.edit",
    description: "Code edit",
    required_inputs: ["text"],
    required_capabilities: ["code.edit"],
    preferred_capabilities: [],
    quality_metrics: [],
    allowed_roles: ["coder"],
    default_benchmark_suites: [],
  },
];

const matrix = [
  {
    name: "empty candidate pool",
    runtime: runtimeInput(),
    assert: (decision: ReturnType<typeof routeRequest>) => {
      expect(decision.chosen_endpoint_id).toBe("");
      expect(decision.fallback_endpoint_ids).toEqual([]);
      expect(decision.selection_reasons).toEqual([]);
      expect(decision.eligibility).toEqual([]);
      expect(decision.scored_candidates).toEqual([]);
    },
  },
  {
    name: "tie between candidates",
    runtime: runtimeInput({
      request: { ...runtimeInput().request, requestId: "run115-s7c-tie" },
      registry: registry([
        endpoint("tie.alpha", "openai/gpt-4.1-mini-fast"),
        endpoint("tie.beta", "openai/gpt-4.1-mini-fast"),
      ]),
    }),
    assert: (decision: ReturnType<typeof routeRequest>) => {
      expect(decision.chosen_endpoint_id).toBe("tie.alpha");
      expect(decision.selection_reasons).toContain("TIE_BREAK_APPLIED");
    },
  },
  {
    name: "role/task/effort arm",
    runtime: runtimeInput({
      request: {
        ...runtimeInput().request,
        requestId: "run115-s7c-role-task-effort",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        roleModelIntent: {
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          role: { id: "coder", hard: true },
          task: { id: "code.edit", hard: true },
          capabilities: { required: ["code.edit"], preferred: [] },
          modalities: { required: ["text"] },
          toolClasses: [],
          source: "explicit_user",
          confidence: 0.99,
        },
      },
      registry: registry([
        endpoint("coder.high", "openai/gpt-4.1-mini-fast", {
          reasoningEffort: "high",
          capabilities: ["text.chat", "code.edit"],
        }),
        endpoint("text.low", "moonshotai/kimi-k2.6", { capabilities: ["text.chat"] }),
      ]),
      roleDefinitions,
      taskDefinitions,
      effortResolution: { resolution: "exact_primary", effectiveEffort: "high", source: "named" },
    }),
    assert: (decision: ReturnType<typeof routeRequest>) => {
      expect(decision.chosen_endpoint_id).toBe("coder.high");
      expect(decision.reasoning_effort).toBe("high");
      expect(decision.effort_source).toBe("named");
      expect(decision.effort_resolution).toBe("exact_primary");
      expect(decision.scored_candidates.some((row) => row.endpoint_id === "coder.high")).toBe(true);
      expect(decision.eligibility.find((entry) => entry.endpoint_id === "text.low")?.eligible).toBe(
        false,
      );
    },
  },
  {
    name: "golden fixture",
    runtime: runtimeInput({
      request: {
        ...runtimeInput().request,
        requestId: "run115-s7c-golden",
        needsTools: true,
      },
      registry: registry([
        endpoint("golden.only", "openai/gpt-4.1-mini-fast", {
          tools: true,
          capabilities: ["text.chat", "tools.function_calling"],
        }),
        endpoint("golden.no-tools", "moonshotai/kimi-k2.6", { tools: false }),
      ]),
    }),
    assert: (decision: ReturnType<typeof routeRequest>) => {
      const fixture = JSON.parse(
        readFileSync(new URL("./fixtures/run115-s7c-routing-golden.json", import.meta.url), "utf8"),
      ) as {
        readonly decisionDigest: string;
        readonly chosen_endpoint_id: string;
        readonly selection_reasons: readonly string[];
        readonly eligibilityCodes: readonly { endpoint_id: string; code: string }[];
      };
      const digest = `sha256:${createHash("sha256").update(JSON.stringify(decision)).digest("hex")}`;
      const eligibilityCodes = decision.eligibility.flatMap((entry) =>
        entry.exclusions.map((exclusion) => ({ endpoint_id: entry.endpoint_id, code: exclusion.code })),
      );
      expect(decision.chosen_endpoint_id).toBe(fixture.chosen_endpoint_id);
      expect(decision.selection_reasons).toEqual(fixture.selection_reasons);
      expect(eligibilityCodes).toEqual(fixture.eligibilityCodes);
      expect(digest).toBe(fixture.decisionDigest);
    },
  },
] as const;

function producerDecision(input: RouteRequestInput) {
  return Effect.runSync(
    Effect.provide(
      RouteDecisionProducer.use((producer) => producer.decide(input)),
      RouteDecisionProducerLive,
    ),
  );
}

describe("run115 S7c kernel/producer/wired parity", () => {
  for (const fixture of matrix) {
    test(`${fixture.name}: all three paths are byte-identical`, () => {
      const projected = projectRuntimeRouteInput(fixture.runtime).routeInput;
      const kernel = routeRequest(projected);
      const producer = producerDecision(projected);
      const wired = routeRuntimeRequest(fixture.runtime).decision;

      expect(producer).toEqual(kernel);
      expect(wired).toEqual(kernel);
      expect(JSON.stringify(producer)).toBe(JSON.stringify(kernel));
      expect(JSON.stringify(wired)).toBe(JSON.stringify(kernel));
      fixture.assert(kernel);
    });
  }
});