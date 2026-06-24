import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  canonicalTaxonomy,
  getCanonicalTaskAction,
  taxonomyManifest,
  validateCanonicalTaxonomy,
} from "../src/taxonomy/index.js";

const expectedGroups = [
  "engineering",
  "product_design",
  "knowledge_research",
  "business",
  "communication",
  "governance_safety",
];

const expectedRoles = [
  "coder",
  "architect",
  "security",
  "researcher",
  "writer",
  "operator",
  "analyst",
  "planner",
  "tester",
  "data",
  "product",
  "designer",
  "support",
  "legal",
  "finance",
  "creative",
  "educator",
  "translator",
  "marketer",
  "seller",
  "recruiter",
  "procurement",
  "coordinator",
  "knowledge",
  "strategist",
  "mathematician",
  "scientist",
  "health",
];

const expectedMembership: Record<string, { primary: string; secondary: readonly string[] }> = {
  coder: { primary: "engineering", secondary: [] },
  architect: { primary: "engineering", secondary: [] },
  security: { primary: "engineering", secondary: ["governance_safety"] },
  researcher: { primary: "knowledge_research", secondary: [] },
  writer: { primary: "communication", secondary: [] },
  operator: { primary: "engineering", secondary: [] },
  analyst: { primary: "product_design", secondary: [] },
  planner: { primary: "product_design", secondary: [] },
  tester: { primary: "engineering", secondary: [] },
  data: { primary: "engineering", secondary: [] },
  product: { primary: "product_design", secondary: [] },
  designer: { primary: "product_design", secondary: [] },
  support: { primary: "communication", secondary: [] },
  legal: { primary: "governance_safety", secondary: ["business"] },
  finance: { primary: "business", secondary: ["governance_safety"] },
  creative: { primary: "communication", secondary: [] },
  educator: { primary: "knowledge_research", secondary: [] },
  translator: { primary: "communication", secondary: [] },
  marketer: { primary: "business", secondary: [] },
  seller: { primary: "business", secondary: [] },
  recruiter: { primary: "governance_safety", secondary: ["business"] },
  procurement: { primary: "business", secondary: [] },
  coordinator: { primary: "communication", secondary: [] },
  knowledge: { primary: "knowledge_research", secondary: [] },
  strategist: { primary: "business", secondary: [] },
  mathematician: { primary: "knowledge_research", secondary: [] },
  scientist: { primary: "knowledge_research", secondary: [] },
  health: { primary: "governance_safety", secondary: ["knowledge_research"] },
};

const dataRoot = path.resolve(process.cwd(), "data", "taxonomy");
const goldenFixturePath = path.resolve(
  process.cwd(),
  "testdata",
  "taxonomy",
  "proposal-v1-golden.json",
);

describe("canonical taxonomy catalog", () => {
  test("declares approved taxonomy versions and counts", () => {
    expect(taxonomyManifest.schemaVersion).toBe("role-model.taxonomy.schema.v1");
    expect(taxonomyManifest.taxonomyVersion).toBe("1.0.0-alpha.1");
    expect(taxonomyManifest.databaseVersion).toBe(1);
    expect(taxonomyManifest.classificationContractVersion).toBe("role-model.classification.v1");
    expect(taxonomyManifest).not.toHaveProperty("counts");
    expect(taxonomyManifest.entryCounts.groups).toBe(6);
    expect(taxonomyManifest.entryCounts.roles).toBe(28);
    expect(taxonomyManifest.entryCounts.capabilities).toBe(46);
    expect(taxonomyManifest.entryCounts.modalities).toBe(9);
    expect(taxonomyManifest.entryCounts.toolClasses).toBe(15);
    expect(taxonomyManifest.entryCounts.taskTypes).toBe(280);
    expect(taxonomyManifest.entryFiles).toMatchObject({
      groups: "groups.json",
      roles: "roles.json",
      taskTypes: "task-types.json",
      capabilities: "capabilities.json",
      modalities: "modalities.json",
      toolClasses: "tool-classes.json",
      intentPresets: "intent-presets.json",
    });
    expect(taxonomyManifest.contentHashes.taskTypes).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("uses real manifest content hashes for canonical JSON files", () => {
    const entries = [
      ["groups", taxonomyManifest.entryFiles.groups],
      ["roles", taxonomyManifest.entryFiles.roles],
      ["taskTypes", taxonomyManifest.entryFiles.taskTypes],
      ["capabilities", taxonomyManifest.entryFiles.capabilities],
      ["modalities", taxonomyManifest.entryFiles.modalities],
      ["toolClasses", taxonomyManifest.entryFiles.toolClasses],
      ["intentPresets", taxonomyManifest.entryFiles.intentPresets],
    ] as const;

    for (const [key, fileName] of entries) {
      const hash = taxonomyManifest.contentHashes[key];
      const digest = createHash("sha256")
        .update(readFileSync(path.join(dataRoot, fileName)))
        .digest("hex");
      expect(hash, key).toBe(`sha256:${digest}`);
      expect(hash.replace(/^sha256:/, ""), key).not.toMatch(/^([a-f0-9])\1{63}$/);
    }
  });

  test("declares exact groups, roles, and role group membership", () => {
    expect(canonicalTaxonomy.groups.map((group) => group.id)).toEqual(expectedGroups);
    expect(canonicalTaxonomy.roles.map((role) => role.id)).toEqual(expectedRoles);

    for (const role of canonicalTaxonomy.roles) {
      const expected = expectedMembership[role.id];
      expect(expected).toBeDefined();
      expect(role.primaryGroupId).toBe(expected.primary);
      expect(role.secondaryGroupIds).toEqual(expected.secondary);
    }
  });

  test("gives every role at least ten native task types", () => {
    for (const roleId of expectedRoles) {
      const nativeTasks = canonicalTaxonomy.tasks.filter((task) => task.primaryRole === roleId);
      expect(nativeTasks.length, roleId).toBeGreaterThanOrEqual(10);
      expect(
        nativeTasks.every((task) => task.id.startsWith(`${roleId}.`)),
        roleId,
      ).toBe(true);
    }
  });

  test("validates task naming, references, and classifier guidance", () => {
    const roleIds = new Set(canonicalTaxonomy.roles.map((role) => role.id));
    const capabilityIds = new Set(
      canonicalTaxonomy.capabilities.map((capability) => capability.id),
    );
    const modalityIds = new Set(canonicalTaxonomy.modalities.map((modality) => modality.id));
    const toolClassIds = new Set(canonicalTaxonomy.toolClasses.map((toolClass) => toolClass.id));

    for (const task of canonicalTaxonomy.tasks) {
      expect(task.id).toMatch(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/);
      expect(task.id.startsWith(`${task.primaryRole}.`), task.id).toBe(true);
      expect(getCanonicalTaskAction(task.id)).toBeTruthy();
      expect(roleIds.has(task.primaryRole), task.id).toBe(true);
      expect(
        task.compatibleRoles.every((roleId) => roleIds.has(roleId)),
        task.id,
      ).toBe(true);
      expect(
        task.requiredCapabilities.every((id) => capabilityIds.has(id)),
        task.id,
      ).toBe(true);
      expect(
        task.preferredCapabilities.every((id) => capabilityIds.has(id)),
        task.id,
      ).toBe(true);
      expect(
        task.requiredModalities.every((id) => modalityIds.has(id)),
        task.id,
      ).toBe(true);
      expect(
        task.toolClasses.every((id) => toolClassIds.has(id)),
        task.id,
      ).toBe(true);
      expect(task.classifier.useWhen).not.toHaveLength(0);
      expect(task.classifier.doNotUseWhen).not.toHaveLength(0);
      expect(task.description, task.id).not.toMatch(/\bwork for the .+ role\.$/i);
      expect(task.classifier.useWhen, task.id).not.toMatch(
        /^Use for .+ requests assigned to .+ work\.$/i,
      );
    }
  });

  test("returns no structural validation diagnostics for the canonical catalog", () => {
    expect(validateCanonicalTaxonomy(canonicalTaxonomy)).toEqual([]);
  });

  test("matches the proposal-derived golden taxonomy fixture exactly", () => {
    const golden = JSON.parse(readFileSync(goldenFixturePath, "utf8"));

    expect({
      manifest: taxonomyManifest,
      groups: canonicalTaxonomy.groups,
      roles: canonicalTaxonomy.roles,
      tasks: canonicalTaxonomy.tasks,
      capabilities: canonicalTaxonomy.capabilities,
      modalities: canonicalTaxonomy.modalities,
      toolClasses: canonicalTaxonomy.toolClasses,
      intentPresets: canonicalTaxonomy.intentPresets,
    }).toEqual(golden);
  });

  test("matches proposal semantics for cross-role task routing examples", () => {
    expect(canonicalTaxonomy.tasks.find((task) => task.id === "coder.review")).toMatchObject({
      label: "Code Review",
      description:
        "Review source changes for correctness, regressions, maintainability, and missing tests.",
      primaryRole: "coder",
      compatibleRoles: ["coder", "security", "architect"],
      requiredCapabilities: ["code.read"],
      preferredCapabilities: ["reasoning.multi_step"],
      classifier: {
        useWhen: "User asks to inspect existing code or a diff and identify issues.",
        doNotUseWhen: "User asks to implement changes directly.",
      },
    });

    expect(canonicalTaxonomy.tasks.find((task) => task.id === "operator.install")).toMatchObject({
      label: "Installation",
      description: "Install, configure, and verify software on a local or managed environment.",
      primaryRole: "operator",
      compatibleRoles: ["operator", "coder", "support"],
      requiredCapabilities: ["tools.function_calling"],
      preferredCapabilities: ["tools.command_execution"],
      classifier: {
        useWhen:
          "User asks to install a package, set up a runtime, configure endpoints, or verify local integration.",
        doNotUseWhen: "User asks only for written installation instructions.",
      },
    });
  });

  // ── R12.1: Deprecation schema fields ──

  test("deprecation schema fields are present on all entity kinds (R12.1)", () => {
    const schemaRoot = path.resolve(process.cwd(), "..", "..", "..", "schemas", "role-model", "taxonomy");
    const entitySchemas = [
      "role.schema.json",
      "task-type.schema.json",
      "capability.schema.json",
      "modality.schema.json",
      "tool-class.schema.json",
      "group.schema.json",
      "intent-preset.schema.json",
    ];

    for (const schemaFile of entitySchemas) {
      const schema = JSON.parse(
        readFileSync(path.join(schemaRoot, schemaFile), "utf8"),
      ) as Record<string, unknown>;
      const props = (schema.properties ?? {}) as Record<string, unknown>;

      // replacement: optional string
      expect(props.replacement, `${schemaFile}: replacement field`).toBeDefined();
      const repl = props.replacement as Record<string, unknown>;
      expect(repl.type, `${schemaFile}: replacement type`).toBe("string");

      // deprecationReason: optional string
      expect(props.deprecationReason, `${schemaFile}: deprecationReason field`).toBeDefined();
      const reason = props.deprecationReason as Record<string, unknown>;
      expect(reason.type, `${schemaFile}: deprecationReason type`).toBe("string");
    }
  });
});
