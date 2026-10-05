import { describe, expect, test } from "vitest";

import { routeRequest } from "../src/router.js";
import { canonicalTaxonomy } from "../src/taxonomy/index.js";
import type { EndpointCandidate, RouteRequestInput, RoutingRequest } from "../src/types.js";

/**
 * Run 98 addendum 58 slice 1: every group, role and task in the shipped taxonomy must be accepted by the
 * router. The live endpoints declare the small transport vocabulary below (`code.edit`, `reasoning`,
 * `structured.output`, `text.chat`, `tools.function_calling`); the taxonomy's 280 task types require 44
 * distinct capability identifiers, most of which no catalogue entry declares. An advisory classification
 * must therefore never turn a taxonomy definition's capability expectations into an eligibility filter.
 */
const LIVE_ENDPOINT_CAPABILITIES = [
  "text.chat",
  "code.edit",
  "reasoning",
  "structured.output",
  "tools.function_calling",
] as const;

function liveCandidate(endpointId: string): EndpointCandidate {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: endpointId,
      runtime_version: "1",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: [...LIVE_ENDPOINT_CAPABILITIES],
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: true, style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
  };
}

const roleDefinitions = canonicalTaxonomy.roles.map((role) => ({
  role_id: role.id,
  name: role.label,
  description: role.description,
  role_kind: "assistant",
  default_system_instructions: `Operate as ${role.label}.`,
  task_types_supported: [...role.taskIds],
  required_capabilities: [...role.requiredCapabilities],
  preferred_capabilities: [...role.preferredCapabilities],
  forbidden_capabilities: [],
  tool_policy: { mode: "allowed" as const },
  routing_policy_overrides: {},
  output_contracts: [],
  safety_policy_refs: [],
}));

const taskDefinitions = canonicalTaxonomy.tasks.map((task) => ({
  task_type: task.id,
  description: task.description,
  required_inputs: [...task.requiredModalities],
  required_capabilities: [...task.requiredCapabilities],
  preferred_capabilities: [...task.preferredCapabilities],
  quality_metrics: [],
  allowed_roles: [...task.compatibleRoles],
  default_benchmark_suites: [],
}));

function baseRequest(overrides: Partial<RoutingRequest> = {}): RoutingRequest {
  return {
    requestId: "a58-totality",
    taskType: "text.chat",
    requiredCapabilities: [],
    preferredCapabilities: [],
    requiredModalities: ["text"],
    contextTokens: 2_000,
    needsTools: false,
    strategy: "balanced",
    preferLocal: false,
    ...overrides,
  };
}

function advisoryIntent(taskType: string, roleId: string) {
  return {
    contractVersion: 1,
    taxonomyVersion: canonicalTaxonomy.manifest.taxonomyVersion,
    contentRevision: canonicalTaxonomy.manifest.contentRevision,
    classificationContractVersion: canonicalTaxonomy.manifest.classificationContractVersion,
    role: { id: roleId, hard: false },
    task: { id: taskType, hard: false },
    source: "heuristic" as const,
    confidence: 0.62,
  };
}

function route(input: RouteRequestInput) {
  return routeRequest({
    ...input,
    candidates: [liveCandidate("live-a"), liveCandidate("live-b")],
    roleDefinitions,
    taskDefinitions,
  });
}

const taskRolePairs = canonicalTaxonomy.tasks.flatMap((task) => {
  const roles = task.compatibleRoles.length > 0 ? task.compatibleRoles : [task.primaryRole];
  return roles.map((roleId) => ({ task: task.id, role: roleId }));
});

const taxonomyCapabilityVocabulary = new Set(
  canonicalTaxonomy.capabilities.map((capability) => capability.id),
);

describe("run98 addendum 58 — taxonomy totality at the router", () => {
  test("the shipped taxonomy is the enumerated population", () => {
    expect(canonicalTaxonomy.manifest.entryCounts.groups).toBe(6);
    expect(canonicalTaxonomy.manifest.entryCounts.roles).toBe(28);
    expect(canonicalTaxonomy.manifest.entryCounts.taskTypes).toBe(280);
    expect(canonicalTaxonomy.groups).toHaveLength(6);
    expect(canonicalTaxonomy.roles).toHaveLength(28);
    expect(canonicalTaxonomy.tasks).toHaveLength(280);
    expect(taskRolePairs.length).toBeGreaterThan(280);
  });

  test("every task the taxonomy declares is accepted when the host carries it as the request task", () => {
    const failures: {
      readonly task: string;
      readonly exclusions: readonly string[];
    }[] = [];

    for (const task of canonicalTaxonomy.tasks) {
      const decision = route({
        request: baseRequest({
          taskType: task.id,
          roleModelIntent: advisoryIntent(task.id, task.primaryRole),
        }),
      });
      const eligible = decision.eligibility.filter((entry) => entry.eligible);
      if (eligible.length === 0) {
        failures.push({
          task: task.id,
          exclusions: decision.eligibility
            .flatMap((entry) => entry.exclusions.map((exclusion) => exclusion.code))
            .filter((code, index, all) => all.indexOf(code) === index),
        });
      }
    }

    expect(failures.slice(0, 25)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  test("every task/role pair the taxonomy declares is accepted with the role on the request", () => {
    const failures: {
      readonly task: string;
      readonly role: string;
      readonly exclusions: readonly string[];
    }[] = [];

    for (const pair of taskRolePairs) {
      const decision = route({
        request: baseRequest({
          taskType: pair.task,
          requestedRoleId: pair.role,
          roleModelIntent: advisoryIntent(pair.task, pair.role),
        }),
      });
      const eligible = decision.eligibility.filter((entry) => entry.eligible);
      if (eligible.length === 0) {
        failures.push({
          task: pair.task,
          role: pair.role,
          exclusions: decision.eligibility
            .flatMap((entry) => entry.exclusions.map((exclusion) => exclusion.code))
            .filter((code, index, all) => all.indexOf(code) === index),
        });
      }
    }

    expect(failures.slice(0, 25)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  test("every taxonomy capability named by a task is part of the shipped capability vocabulary", () => {
    const unknown = canonicalTaxonomy.tasks
      .flatMap((task) => [...task.requiredCapabilities, ...task.preferredCapabilities])
      .filter((capability, index, all) => all.indexOf(capability) === index)
      .filter((capability) => !taxonomyCapabilityVocabulary.has(capability));
    expect(unknown).toEqual([]);
  });

  test("a taxonomy task whose requirements no endpoint declares is still routed to a candidate", () => {
    const decision = route({
      request: baseRequest({
        taskType: "legal.review",
        roleModelIntent: advisoryIntent("legal.review", "legal"),
      }),
    });

    expect(decision.eligibility.every((entry) => entry.eligible)).toBe(true);
    expect(decision.chosen_endpoint_id).not.toBe("");
  });

  test("hard intent keeps the documented narrowing", () => {
    const decision = routeRequest({
      request: baseRequest({
        taskType: "legal.review",
        requestedRoleId: "legal",
        roleModelIntent: {
          ...advisoryIntent("legal.review", "legal"),
          role: { id: "legal", hard: true },
          task: { id: "legal.review", hard: true },
          capabilities: { required: ["legal.analysis"] },
        } as RoutingRequest["roleModelIntent"],
      }),
      candidates: [liveCandidate("live-a"), liveCandidate("live-b")],
      roleDefinitions,
      taskDefinitions,
    });

    expect(decision.eligibility.every((entry) => !entry.eligible)).toBe(true);
    expect(
      decision.eligibility
        .flatMap((entry) => entry.exclusions)
        .some((exclusion) => exclusion.code === "CAPABILITY_MISSING"),
    ).toBe(true);
  });

  test("an unknown task variant is recorded and does not gate", () => {
    const decision = route({
      request: baseRequest({
        taskType: "coder.review",
        roleModelIntent: {
          ...advisoryIntent("coder.review", "coder"),
          taskVariant: "not-a-taxonomy-variant",
        } as RoutingRequest["roleModelIntent"],
      }),
    });

    expect(decision.eligibility.every((entry) => entry.eligible)).toBe(true);
    expect(decision.chosen_endpoint_id).not.toBe("");
  });
});
