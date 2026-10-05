import { describe, expect, test } from "vitest";

import { canonicalTaxonomy } from "@role-model-router/core";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import {
  createRoleModelNormalizedIntentObservation,
  mapChatCompletionsRequest,
  mapResponsesRequest,
} from "../src/index.js";
import { deriveTaxonomyClassification } from "../src/taxonomy-derivation.js";

/**
 * Run 98 addendum 58 slice 2: requests that declare no intent still have to be attributed to the taxonomy,
 * because replay, evaluation, packs and the routing-time advisory all key on the taxonomy identity. The
 * derivation is deterministic, bounded and always returns a value that exists in the shipped taxonomy; its
 * confidence and evidence say how strong the signal was, and only the router's advisory gate decides whether
 * that is enough to move a decision.
 */

const taskIds = new Set(canonicalTaxonomy.tasks.map((task) => task.id));
const roleIds = new Set(canonicalTaxonomy.roles.map((role) => role.id));
const groupIds = new Set(canonicalTaxonomy.groups.map((group) => group.id));
const taskById = new Map(canonicalTaxonomy.tasks.map((task) => [task.id, task]));
const roleById = new Map(canonicalTaxonomy.roles.map((role) => [role.id, role]));

describe("run98 addendum 58 — runtime taxonomy derivation", () => {
  test("every taxonomy task's own declared signal resolves to a taxonomy-valid classification", () => {
    const invalid: { readonly task: string; readonly derived: unknown }[] = [];
    for (const task of canonicalTaxonomy.tasks) {
      const derived = deriveTaxonomyClassification({
        text: `${task.classifier.useWhen} ${task.description}`,
        toolClassIds: [...task.toolClasses],
        modalityIds: [...task.requiredModalities],
      });
      const valid =
        taskIds.has(derived.taskTypeId) &&
        roleIds.has(derived.roleId) &&
        groupIds.has(derived.groupId) &&
        derived.taxonomyVersion === canonicalTaxonomy.manifest.taxonomyVersion &&
        derived.confidence >= 0.2 &&
        derived.confidence <= 0.9 &&
        derived.evidence.length > 0;
      if (!valid) {
        invalid.push({ task: task.id, derived });
      }
    }
    expect(invalid).toEqual([]);
  });

  test("the declared signals resolve to the owning task or the owning role's group at a measured rate", () => {
    let exact = 0;
    let sameGroup = 0;
    const misses: { readonly task: string; readonly derived: string }[] = [];
    for (const task of canonicalTaxonomy.tasks) {
      const derived = deriveTaxonomyClassification({
        text: `${task.classifier.useWhen} ${task.description}`,
        toolClassIds: [...task.toolClasses],
        modalityIds: [...task.requiredModalities],
      });
      if (derived.taskTypeId === task.id) {
        exact += 1;
      } else {
        misses.push({ task: task.id, derived: derived.taskTypeId });
      }
      const owningGroup = roleById.get(task.primaryRole)?.primaryGroupId;
      if (owningGroup && derived.groupId === owningGroup) {
        sameGroup += 1;
      }
    }

    const exactRate = exact / canonicalTaxonomy.tasks.length;
    const groupRate = sameGroup / canonicalTaxonomy.tasks.length;
    // Recorded for the addendum's evidence log: the derivation is a heuristic hint, and these rates say
    // how strong that hint is over the taxonomy's own declared signals.
    console.log(
      `[a58] derivation over declared signals: exact ${exact}/${canonicalTaxonomy.tasks.length} (${(exactRate * 100).toFixed(1)}%), same-group ${sameGroup}/${canonicalTaxonomy.tasks.length} (${(groupRate * 100).toFixed(1)}%)`,
    );
    expect(
      exactRate,
      `exact ${exact}/${canonicalTaxonomy.tasks.length}; misses ${JSON.stringify(misses.slice(0, 20))}`,
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      groupRate,
      `group ${sameGroup}/${canonicalTaxonomy.tasks.length}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  test("a review-shaped request derives a coder-family classification", () => {
    const derived = deriveTaxonomyClassification({
      text: "Please review this pull request diff for correctness, regressions and missing tests.",
      toolClassIds: ["filesystem.read"],
      modalityIds: ["text"],
    });
    const task = taskById.get(derived.taskTypeId);
    const role = roleById.get(derived.roleId);
    expect(task).toBeDefined();
    expect(role).toBeDefined();
    expect(role?.primaryGroupId).toBe("engineering");
    expect(["coder.review", "coder.edit", "architect.review", "tester.reproduce"]).toContain(
      derived.taskTypeId,
    );
    expect(derived.confidence).toBeGreaterThan(0.2);
  });

  test("tool classes and modalities come from the request shape, not from invented names", () => {
    const derived = deriveTaxonomyClassification({
      text: "Run the deployment command and inspect the pod logs.",
      toolClassIds: ["shell.execute", "filesystem.read", "not.a.tool.class"],
      modalityIds: ["image", "not-a-modality", "text"],
    });
    expect(derived.toolClassIds).toEqual(["filesystem.read", "shell.execute"]);
    expect(derived.modalityIds).toEqual(["image", "text"]);
    expect(derived.taxonomyVersion).toBe(canonicalTaxonomy.manifest.taxonomyVersion);
  });

  test("a request with no signal at all still resolves to a taxonomy entry, at low confidence", () => {
    const derived = deriveTaxonomyClassification({
      text: "hello",
      toolClassIds: [],
      modalityIds: ["text"],
    });
    expect(taskIds.has(derived.taskTypeId)).toBe(true);
    expect(derived.normalizedIntent.task?.id).toBe(derived.taskTypeId);
    expect(derived.normalizedIntent.role?.id).toBe(derived.roleId);
    /**
     * The group dimension is part of the taxonomy identity: `extractTaxonomyDimensions` reads it from
     * `normalizedIntent.groupId`, so a derivation that omits it leaves `taxonomy_group_id` null on the ledger.
     */
    expect(derived.normalizedIntent.groupId).toBe(roleById.get(derived.roleId)?.primaryGroupId);
    expect(derived.normalizedIntent.capabilities?.required).toEqual(
      taskById.get(derived.taskTypeId)?.requiredCapabilities,
    );
    expect(derived.evidence.join(" ")).toContain("no-signal");
    expect(derived.confidence).toBeLessThanOrEqual(0.4);
  });

  test("derivation is deterministic", () => {
    const input = {
      text: "Translate this onboarding guide into Japanese and keep the tone.",
      toolClassIds: ["filesystem.read"],
      modalityIds: ["text"],
    };
    expect(deriveTaxonomyClassification(input)).toEqual(deriveTaxonomyClassification(input));
  });

  test("a generic summarize request derives the generic summarize task", () => {
    const derived = deriveTaxonomyClassification({
      text: "Summarize the routing result.",
      toolClassIds: [],
      modalityIds: ["text"],
    });
    expect(derived.taskTypeId).toBe("writer.summarize");
  });

  const registry = {
    endpoints: [
      {
        identity: {
          endpoint_id: "deepseek.personal.primary.global.deepseek-flash",
          endpoint_kind: "remote_api",
          provider_kind: "remote_openai_compat",
          serving_source: "remote-service",
          model_id: "deepseek/deepseek-flash",
          runtime_version: "1",
          region: "global",
        },
        declared: {
          endpoint_id: "deepseek.personal.primary.global.deepseek-flash",
          capabilities: ["text.chat", "tools.function_calling", "reasoning"],
          modalities: ["text"],
          max_context_tokens: 100_000,
          tool_calling: { supported: true, style: "openai" },
          supports_embeddings: false,
        },
        status: "active",
      },
      {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k3",
          endpoint_kind: "remote_api",
          provider_kind: "remote_openai_compat",
          serving_source: "remote-service",
          model_id: "moonshot/kimi-k3",
          runtime_version: "1",
          region: "global",
        },
        declared: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k3",
          capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
          modalities: ["text", "image", "video"],
          max_context_tokens: 100_000,
          tool_calling: { supported: true, style: "openai" },
          supports_embeddings: false,
        },
        status: "active",
      },
    ],
    diagnostics: [],
    lifecycleSummary: { active: 2, degraded: 0, offline: 0 },
  } as unknown as EndpointRegistryResult;

  test("a chat request with no declared intent still carries a taxonomy identity on the routing request", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "deepseek/deepseek-flash",
        messages: [
          {
            role: "user",
            content: "Review this diff for regressions and missing tests.",
          },
        ],
      } as never,
      "req-a58-chat",
    );

    const intent = plan.routingRequest.roleModelIntent;
    expect(intent).toBeDefined();
    expect(taskIds.has(intent?.task?.id ?? "")).toBe(true);
    expect(roleIds.has(intent?.role?.id ?? "")).toBe(true);
    expect(intent?.taxonomyVersion).toBe(canonicalTaxonomy.manifest.taxonomyVersion);
    expect(intent?.source).toBe("runtime_heuristic");
    expect(plan.routingRequest.taskType).toBe(intent?.task?.id);
    expect(plan.routingRequest.requiredCapabilities).toEqual(["text.chat"]);
  });

  test("a responses request with no declared intent still carries a taxonomy identity", () => {
    const plan = mapResponsesRequest(
      registry,
      {
        model: "deepseek/deepseek-flash",
        input: "Write a short release note for the storage retention change.",
      } as never,
      "req-a58-responses",
    );
    const intent = plan.routingRequest.roleModelIntent;
    expect(intent).toBeDefined();
    expect(taskIds.has(intent?.task?.id ?? "")).toBe(true);
    expect(plan.routingRequest.taskType).toBe(intent?.task?.id);
  });

  test("a declared intent always wins over the derivation", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "deepseek/deepseek-flash",
        messages: [{ role: "user", content: "Review this diff." }],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: canonicalTaxonomy.manifest.taxonomyVersion,
            classification_contract_version:
              canonicalTaxonomy.manifest.classificationContractVersion,
            requested_role_id: "translator",
            task_type: "translator.translate",
            confidence: 0.93,
          },
        },
      } as never,
      "req-a58-declared",
    );
    expect(plan.routingRequest.roleModelIntent?.task?.id).toBe("translator.translate");
    expect(plan.routingRequest.taskType).toBe("translator.translate");
    expect(plan.taxonomyIdentity?.groupId).toBe("communication");
  });

  test("the normalized-intent observation carries the group dimension for declared and derived identities", () => {
    const derivedPlan = mapChatCompletionsRequest(
      registry,
      {
        model: "deepseek/deepseek-flash",
        messages: [{ role: "user", content: "Review this diff for regressions." }],
      } as never,
      "req-a58-group-derived",
    );
    const derivedObservation = createRoleModelNormalizedIntentObservation(
      derivedPlan.routingRequest.roleModelIntent,
      [],
      canonicalTaxonomy.tasks.map((task) => ({ task_type: task.id })),
      {
        effectiveTaskTypeId: derivedPlan.taxonomyIdentity?.taskTypeId ?? null,
        effectiveRoleId: derivedPlan.taxonomyIdentity?.roleId ?? null,
      },
    );
    expect(derivedObservation.normalizedIntent?.groupId).toBe(
      canonicalTaxonomy.roles.find((role) => role.id === derivedPlan.taxonomyIdentity?.roleId)
        ?.primaryGroupId,
    );

    const declaredPlan = mapChatCompletionsRequest(
      registry,
      {
        model: "deepseek/deepseek-flash",
        messages: [{ role: "user", content: "Translate this." }],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: canonicalTaxonomy.manifest.taxonomyVersion,
            classification_contract_version:
              canonicalTaxonomy.manifest.classificationContractVersion,
            requested_role_id: "translator",
            task_type: "translator.translate",
            confidence: 0.9,
          },
        },
      } as never,
      "req-a58-group-declared",
    );
    const declaredObservation = createRoleModelNormalizedIntentObservation(
      declaredPlan.routingRequest.roleModelIntent,
      canonicalTaxonomy.roles.map((role) => ({ role_id: role.id })),
      canonicalTaxonomy.tasks.map((task) => ({ task_type: task.id })),
      {
        effectiveTaskTypeId: declaredPlan.taxonomyIdentity?.taskTypeId ?? null,
        effectiveRoleId: declaredPlan.taxonomyIdentity?.roleId ?? null,
      },
    );
    expect(declaredObservation.normalizedIntent?.groupId).toBe("communication");
  });

  test("an image-bearing chat request derives an image modality", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k3",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Review this interface screenshot." },
              { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
            ],
          },
        ],
      } as never,
      "req-a58-image",
    );
    const intent = plan.routingRequest.roleModelIntent;
    expect(intent?.modalities?.required).toContain("image");
    expect(plan.routingRequest.requiredModalities).toContain("image");
  });
});
