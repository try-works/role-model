import { describe, expect, test } from "vitest";

import {
  buildControllerSystemPrompt,
  parseAndSanitizeControllerRoutingGuidance,
  sanitizeControllerRoutingGuidance,
} from "../src/controller-routing-contract";

describe("controller routing contract", () => {
  const roleDefinitions = [
    {
      role_id: "coder.patch",
      name: "Coder Patch",
      description: "Code editing and patch generation tasks.",
      role_kind: "assistant",
      default_system_instructions: "Operate as Coder Patch.",
      task_types_supported: ["code.edit"],
      required_capabilities: [],
      preferred_capabilities: ["reasoning.multi_step"],
      forbidden_capabilities: [],
      tool_policy: { mode: "allowed", allowed_tools: [] },
      routing_policy_overrides: {},
      output_contracts: [],
      safety_policy_refs: [],
    },
    {
      role_id: "general.chat",
      name: "General Chat",
      description: "General-purpose chat tasks.",
      role_kind: "assistant",
      default_system_instructions: "Operate as General Chat.",
      task_types_supported: ["text.chat"],
      required_capabilities: [],
      preferred_capabilities: [],
      forbidden_capabilities: [],
      tool_policy: { mode: "allowed", allowed_tools: [] },
      routing_policy_overrides: {},
      output_contracts: [],
      safety_policy_refs: [],
    },
  ] as const;

  const taskDefinitions = [
    {
      task_type: "code.edit",
      description: "Code editing task",
      required_inputs: [],
      required_capabilities: ["code.edit"],
      preferred_capabilities: ["reasoning.multi_step"],
      quality_metrics: [],
      allowed_roles: ["coder.patch"],
      default_benchmark_suites: [],
    },
    {
      task_type: "text.chat",
      description: "General chat task",
      required_inputs: [],
      required_capabilities: ["text.chat"],
      preferred_capabilities: [],
      quality_metrics: [],
      allowed_roles: ["general.chat"],
      default_benchmark_suites: [],
    },
  ] as const;

  test("builds a bounded prompt that lists runtime-known roles, tasks, capabilities, and omission rules", () => {
    const prompt = buildControllerSystemPrompt({
      roleDefinitions,
      taskDefinitions,
      candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
    });

    expect(prompt).toContain("Return only compact JSON.");
    expect(prompt).toContain("If no exact match exists for a field, omit that field.");
    expect(prompt).toContain('"requestedRoleId": [');
    expect(prompt).toContain('"coder.patch"');
    expect(prompt).toContain('"general.chat"');
    expect(prompt).toContain('"taskType": [');
    expect(prompt).toContain('"code.edit"');
    expect(prompt).toContain('"text.chat"');
    expect(prompt).toContain('"strategy": [');
    expect(prompt).toContain('"balanced"');
    expect(prompt).toContain('"cost"');
    expect(prompt).toContain('"quality"');
    expect(prompt).toContain("moonshot.personal.kimi-code.global.kimi-k2.7-code");
    expect(prompt).toContain("Choose a valid role instead of inventing a new task label");
    expect(prompt).toContain("Always include strategy whenever you return any other directive.");
    expect(prompt).toContain("Use quality for code edits, schema adherence, verification-heavy");
  });

  test("drops invalid task, capability, and endpoint fields while preserving compatible strategy and valid role guidance", () => {
    const guidance = sanitizeControllerRoutingGuidance(
      {
        requestedRoleId: "coder.patch",
        taskType: "code-generation",
        requiredCapabilities: ["code.edit", "imaginary.capability"],
        preferredCapabilities: ["reasoning.multi_step", "not-real"],
        strategy: "capability_based",
        preferredEndpointIds: [
          "moonshot.personal.kimi-code.global.kimi-k2.7-code",
          "openai.personal.openai-codex-subscription.global.gpt-5.4",
        ],
      },
      {
        roleDefinitions,
        taskDefinitions,
        candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
      },
    );

    expect(guidance).toEqual({
      requestedRoleId: "coder.patch",
      requiredCapabilities: ["code.edit"],
      preferredCapabilities: ["reasoning.multi_step"],
      strategy: "quality",
      preferredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
    });
  });

  test("keeps a valid task choice even when the requested role is unknown", () => {
    const guidance = sanitizeControllerRoutingGuidance(
      {
        requestedRoleId: "code-generation",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        strategy: "quality",
      },
      {
        roleDefinitions,
        taskDefinitions,
        candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
      },
    );

    expect(guidance).toEqual({
      taskType: "code.edit",
      requiredCapabilities: ["code.edit"],
      strategy: "quality",
    });
  });

  test("maps known compatibility strategy aliases into runtime-safe directives", () => {
    expect(
      sanitizeControllerRoutingGuidance(
        {
          strategy: "capability_based",
        },
        {
          roleDefinitions,
          taskDefinitions,
          candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
        },
      ),
    ).toEqual({
      strategy: "quality",
    });

    expect(
      sanitizeControllerRoutingGuidance(
        {
          strategy: "prefer-capability",
        },
        {
          roleDefinitions,
          taskDefinitions,
          candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
        },
      ),
    ).toEqual({
      strategy: "quality",
    });
  });

  test("maps remote-only compatibility strategy into a preserved remote preference", () => {
    const guidance = sanitizeControllerRoutingGuidance(
      {
        strategy: "remote_only",
      },
      {
        roleDefinitions,
        taskDefinitions,
        candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
      },
    );

    expect(guidance).toEqual({
      preferLocal: false,
    });
  });

  test("infers a quality strategy when controller guidance omits strategy for code-edit work", () => {
    const guidance = sanitizeControllerRoutingGuidance(
      {
        requestedRoleId: "coder.patch",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: ["reasoning.multi_step"],
      },
      {
        roleDefinitions,
        taskDefinitions,
        candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
      },
    );

    expect(guidance).toEqual({
      requestedRoleId: "coder.patch",
      taskType: "code.edit",
      requiredCapabilities: ["code.edit"],
      preferredCapabilities: ["reasoning.multi_step"],
      strategy: "quality",
    });
  });

  test("normalizes an explicit balanced strategy into quality for code-edit work", () => {
    const guidance = sanitizeControllerRoutingGuidance(
      {
        requestedRoleId: "coder.patch",
        taskType: "code.edit",
        preferredCapabilities: ["reasoning.multi_step"],
        strategy: "balanced",
      },
      {
        roleDefinitions,
        taskDefinitions,
        candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
      },
    );

    expect(guidance).toEqual({
      requestedRoleId: "coder.patch",
      taskType: "code.edit",
      preferredCapabilities: ["reasoning.multi_step"],
      strategy: "quality",
    });
  });

  test("infers a cost strategy when controller guidance omits strategy for classification work", () => {
    const guidance = sanitizeControllerRoutingGuidance(
      {
        requestedRoleId: "general.chat",
        taskType: "text.chat",
      },
      {
        roleDefinitions: [
          ...roleDefinitions,
          {
            role_id: "classifier",
            name: "Classifier",
            description: "Classification tasks.",
            role_kind: "assistant",
            default_system_instructions: "Operate as Classifier.",
            task_types_supported: ["text.classification"],
            required_capabilities: [],
            preferred_capabilities: [],
            forbidden_capabilities: [],
            tool_policy: { mode: "allowed", allowed_tools: [] },
            routing_policy_overrides: {},
            output_contracts: [],
            safety_policy_refs: [],
          },
        ],
        taskDefinitions: [
          ...taskDefinitions,
          {
            task_type: "text.classification",
            description: "Classification task",
            required_inputs: [],
            required_capabilities: ["text.classification"],
            preferred_capabilities: [],
            quality_metrics: [],
            allowed_roles: ["classifier"],
            default_benchmark_suites: [],
          },
        ],
        candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
      },
    );

    expect(guidance).toEqual({
      requestedRoleId: "general.chat",
      taskType: "text.chat",
      strategy: "balanced",
    });

    expect(
      parseAndSanitizeControllerRoutingGuidance(
        JSON.stringify({
          requestedRoleId: "classifier",
          taskType: "text.classification",
          requiredCapabilities: ["text.classification"],
        }),
        {
          roleDefinitions: [
            ...roleDefinitions,
            {
              role_id: "classifier",
              name: "Classifier",
              description: "Classification tasks.",
              role_kind: "assistant",
              default_system_instructions: "Operate as Classifier.",
              task_types_supported: ["text.classification"],
              required_capabilities: [],
              preferred_capabilities: [],
              forbidden_capabilities: [],
              tool_policy: { mode: "allowed", allowed_tools: [] },
              routing_policy_overrides: {},
              output_contracts: [],
              safety_policy_refs: [],
            },
          ],
          taskDefinitions: [
            ...taskDefinitions,
            {
              task_type: "text.classification",
              description: "Classification task",
              required_inputs: [],
              required_capabilities: ["text.classification"],
              preferred_capabilities: [],
              quality_metrics: [],
              allowed_roles: ["classifier"],
              default_benchmark_suites: [],
            },
          ],
          candidateEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.7-code"],
        },
      ),
    ).toEqual({
      requestedRoleId: "classifier",
      taskType: "text.classification",
      requiredCapabilities: ["text.classification"],
      strategy: "cost",
    });
  });
});
