import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { classifyWithProgressiveDisclosure } from "../src/taxonomy/classify-with-progressive-disclosure.js";
import { loadCompactTaxonomy } from "../src/taxonomy/load-compact-taxonomy.js";
import { createStagedCompactTaxonomyReader } from "../src/taxonomy/staged-compact-taxonomy.js";

describe("compact taxonomy and progressive classification", () => {
  test("loads a compact group-first taxonomy snapshot", () => {
    const taxonomy = loadCompactTaxonomy();

    expect(taxonomy.manifest.taxonomyVersion).toBe("1.0.0-alpha.1");
    expect(taxonomy.groups.map((group) => group.id)).toEqual(
      expect.arrayContaining(["engineering", "communication", "governance_safety"]),
    );
    expect(taxonomy.roleSummaries.map((role) => role.id)).toEqual(
      expect.arrayContaining(["coder", "security", "researcher", "support", "product"]),
    );
    expect(taxonomy.roleTaskIndex.coder).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "coder.edit", label: "Code Edit" })]),
    );
    expect(taxonomy.manifest.entryCounts.taskTypes).toBe(280);
    for (const role of taxonomy.roleSummaries) {
      expect(taxonomy.roleTaskChunks[role.id]?.length, role.id).toBeGreaterThanOrEqual(10);
    }
    expect(taxonomy.roleTaskChunks.coder).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "coder.review",
          label: "Code Review",
          compatibleRoles: ["coder", "security", "architect"],
          requiredCapabilities: ["code.read"],
        }),
      ]),
    );
  });

  test.each([
    {
      prompt: "Review this diff for security risks and likely regressions.",
      expectedRole: "security",
      acceptedTasks: ["security.audit"],
      capabilities: ["code.read", "security.analysis"],
      toolClasses: ["filesystem.read"],
    },
    {
      prompt: "Implement this small bug fix and add a regression test.",
      expectedRole: "tester",
      acceptedTasks: ["tester.reproduce"],
      capabilities: ["code.read", "code.write"],
      toolClasses: ["filesystem.write"],
      lowConfidence: true,
    },
    {
      prompt: "Compare current public documentation for this API and cite differences.",
      expectedRole: "researcher",
      acceptedTasks: ["researcher.web_research.current"],
      capabilities: ["web.search", "citation.synthesis"],
      toolClasses: ["web.search"],
    },
    {
      prompt: "Turn these support notes into a clear customer reply.",
      expectedRole: "support",
      acceptedTasks: ["support.ticket.reply"],
      capabilities: ["communication.user_facing"],
      toolClasses: [],
    },
    {
      prompt: "Inspect this schema and propose a migration plan.",
      expectedRole: "data",
      acceptedTasks: ["data.schema.review"],
      capabilities: ["data.schema", "reasoning.multi_step"],
      toolClasses: [],
    },
    {
      prompt: "Create product requirements and acceptance criteria for this workflow.",
      expectedRole: "product",
      acceptedTasks: ["product.requirements"],
      capabilities: ["reasoning.multi_step"],
      toolClasses: [],
    },
  ])("classifies $prompt", ({ prompt, expectedRole, acceptedTasks, capabilities, toolClasses, lowConfidence }) => {
    const classification = classifyWithProgressiveDisclosure({ prompt });
    const emittedTasks = [
      classification.role_model.intent.task_type,
      ...classification.role_model.intent.alternatives.map((alternative) => alternative.task_type),
    ];
    const emittedCapabilities = classification.role_model.intent.preferred_capabilities;

    expect(classification.role_model.contract_version).toBe(1);
    expect(classification.role_model.intent.role_hint_id).toBe(expectedRole);
    expect(emittedTasks).toEqual(expect.arrayContaining(acceptedTasks));
    expect(emittedCapabilities).toEqual(expect.arrayContaining(capabilities));
    if (toolClasses.length > 0) {
      expect(classification.role_model.intent.tool_classes).toEqual(
        expect.arrayContaining(toolClasses),
      );
    }
    expect(classification.role_model.intent.taxonomy_version).toBe("1.0.0-alpha.1");
    expect(classification.role_model.intent.classification_contract_version).toBe(
      "role-model.classification.v1",
    );
    expect(classification.role_model.intent.task_source).toBe("heuristic");
    expect(classification.role_model.intent.task_confidence).toBeGreaterThan(lowConfidence ? 0.2 : 0.5);
    expect(classification.role_model.intent.evidence.length).toBeGreaterThan(0);
    expect(classification.loadedChunks[0]).toBe("groups");
    expect(classification.hiddenModelCallUsed).toBe(false);
  });

  test("emits the complete stable advisory classification contract", () => {
    const classification = classifyWithProgressiveDisclosure({
      prompt: "Implement this small bug fix and add a regression test.",
    });

    expect(classification.role_model.intent).toMatchObject({
      classification_version: "role-model.pi-classifier.v1",
      source: "heuristic",
      confidence: expect.any(Number),
      output_modalities: ["text"],
      context_tokens_estimate: expect.any(Number),
    });
    expect(classification.role_model.intent.confidence).toBeGreaterThan(0);
    expect(classification.role_model.intent.confidence).toBeLessThanOrEqual(1);
  });

  test("degrades unknown prompts to broad low-confidence advisory metadata", () => {
    const classification = classifyWithProgressiveDisclosure({
      prompt: "Can you help me think about this?",
    });

    expect(classification.role_model.intent.role_hint_id).not.toBe("security");
    expect(classification.role_model.intent.task_type).not.toBe("security.audit");
    expect(classification.role_model.intent.confidence).toBeLessThan(0.5);
    expect(classification.role_model.intent.task_confidence).toBeLessThan(0.5);
    // Group-first classifier produces structured evidence, not just "fallback"
    expect(classification.role_model.intent.evidence.length).toBeGreaterThan(0);
    expect(classification.role_model.intent.alternatives.length).toBeGreaterThan(0);
    expect(classification.hiddenModelCallUsed).toBe(false);
  });

  test("records only taxonomy chunks that were actually consulted", () => {
    const classification = classifyWithProgressiveDisclosure({
      prompt: "Create product requirements and acceptance criteria for this workflow.",
    });

    expect(classification.candidateGroupIds).toEqual(["product_design"]);
    expect(classification.candidateRoleIds).toEqual(expect.arrayContaining(["product"]));
    expect(classification.loadedChunks).toEqual(
      expect.arrayContaining(["groups", "role-summaries", "tasks:product"]),
    );
    expect(classification.loadedChunks).not.toContain("tasks:security");
  });

  test("classifies request-time prompts without reading unrelated role task chunks", () => {
    const calls: string[] = [];
    const reader = createStagedCompactTaxonomyReader({
      readJson: <T>(fileName: string): T => {
        calls.push(fileName);
        return JSON.parse(
          readFileSync(new URL(`../data/taxonomy/${fileName}`, import.meta.url), "utf8"),
        ) as T;
      },
    });

    const classification = classifyWithProgressiveDisclosure({
      prompt: "Review this diff for security risks and likely regressions.",
      reader,
    });

    expect(classification.role_model.intent.role_hint_id).toBe("security");
    expect(classification.role_model.intent.task_type).toBe("security.audit");
    expect(calls).toContain("roles/security/tasks.compact.json");
    expect(calls).not.toContain("roles/coder/tasks.compact.json");
    expect(calls.filter((fileName) => fileName.endsWith("/tasks.compact.json"))).toEqual([
      "roles/security/tasks.compact.json",
    ]);
  });

  // ── F6: Expanded classifier coverage across all 28 role families ──

  test("classifies prompts across all 28 role families without hardcoded rules (F6)", () => {
    const promptsByGroup: Record<string, readonly { readonly prompt: string; readonly expectedRole: string; readonly expectedGroup: string }[]> = {
      engineering: [
        { prompt: "Debug this failing startup script and fix the port conflict.", expectedRole: "operator", expectedGroup: "engineering" },
        { prompt: "Write E2E tests for the login flow using Playwright.", expectedRole: "tester", expectedGroup: "engineering" },
        { prompt: "Review this SQL schema for normalization issues and indexing.", expectedRole: "data", expectedGroup: "engineering" },
        { prompt: "Design the API contract for our new payments service.", expectedRole: "architect", expectedGroup: "engineering" },
      ],
      product_design: [
        { prompt: "Evaluate these three vendors and tell me which is the best fit.", expectedRole: "analyst", expectedGroup: "product_design" },
        { prompt: "Break this goal into milestones with acceptance criteria.", expectedRole: "planner", expectedGroup: "product_design" },
        { prompt: "Review this user interface for accessibility and visual hierarchy.", expectedRole: "designer", expectedGroup: "product_design" },
      ],
      knowledge_research: [
        { prompt: "Design a science experiment to test this hypothesis with controls.", expectedRole: "scientist", expectedGroup: "knowledge_research" },
        { prompt: "Solve this optimization problem and explain each step.", expectedRole: "mathematician", expectedGroup: "knowledge_research" },
        { prompt: "Create a lesson plan for teaching Python to beginners.", expectedRole: "educator", expectedGroup: "knowledge_research" },
        { prompt: "Organize these notes into a structured knowledge base.", expectedRole: "knowledge", expectedGroup: "knowledge_research" },
      ],
      business: [
        { prompt: "Analyze our market position and recommend a GTM strategy.", expectedRole: "strategist", expectedGroup: "business" },
        { prompt: "Write SEO-optimized landing page copy for our launch.", expectedRole: "marketer", expectedGroup: "business" },
        { prompt: "Draft a cold outreach email for enterprise prospects.", expectedRole: "seller", expectedGroup: "business" },
        { prompt: "Compare these vendor proposals and build a scorecard.", expectedRole: "procurement", expectedGroup: "business" },
        { prompt: "Estimate the ROI of migrating to this new infrastructure.", expectedRole: "finance", expectedGroup: "business" },
      ],
      communication: [
        { prompt: "Translate this technical document into Japanese.", expectedRole: "translator", expectedGroup: "communication" },
        { prompt: "Brainstorm catchy brand names and taglines for our new launch.", expectedRole: "creative", expectedGroup: "communication" },
        { prompt: "Prepare a meeting agenda and decision log for the quarterly review.", expectedRole: "coordinator", expectedGroup: "communication" },
        { prompt: "Rewrite this article to match our new brand voice.", expectedRole: "writer", expectedGroup: "communication" },
      ],
      governance_safety: [
        { prompt: "Review this privacy policy for GDPR compliance.", expectedRole: "legal", expectedGroup: "governance_safety" },
        { prompt: "Write a job description for a senior platform engineer.", expectedRole: "recruiter", expectedGroup: "governance_safety" },
        { prompt: "What are the general exercise recommendations for improving sleep?", expectedRole: "health", expectedGroup: "governance_safety" },
      ],
    };

    for (const [group, cases] of Object.entries(promptsByGroup)) {
      for (const testCase of cases) {
        const classification = classifyWithProgressiveDisclosure({ prompt: testCase.prompt });
        expect(
          classification.role_model.intent.role_hint_id,
          `Prompt "${testCase.prompt}" classified as ${classification.role_model.intent.role_hint_id}, expected ${testCase.expectedRole}`,
        ).toBe(testCase.expectedRole);
        expect(
          classification.candidateGroupIds,
          `Expected group ${testCase.expectedGroup} for prompt "${testCase.prompt}"`,
        ).toContain(testCase.expectedGroup);
        expect(classification.role_model.intent.evidence.length).toBeGreaterThan(0);
        expect(classification.hiddenModelCallUsed).toBe(false);
      }
    }
  });

  test("broad ambiguous prompts use group-first fallback instead of single writer fallback (F6)", () => {
    const classification = classifyWithProgressiveDisclosure({
      prompt: "Can you help me think through a complex decision?",
    });
    expect(classification.role_model.intent.role_hint_id).toBeDefined();
    expect(classification.role_model.intent.task_type).toBeDefined();
    expect(classification.role_model.intent.confidence).toBeLessThan(0.5);
    expect(classification.role_model.intent.alternatives.length).toBeGreaterThan(0);
    expect(classification.loadedChunks[0]).toBe("groups");
  });

  test("unknown prompts still produce advisory metadata with alternatives (F6)", () => {
    const classification = classifyWithProgressiveDisclosure({
      prompt: "I need help with something important.",
    });
    expect(classification.role_model.contract_version).toBe(1);
    expect(classification.role_model.intent.role_source).toBe("heuristic");
    expect(classification.role_model.intent.task_source).toBe("heuristic");
    expect(classification.role_model.intent.alternatives.length).toBeGreaterThanOrEqual(1);
    expect(classification.hiddenModelCallUsed).toBe(false);
  });
});
