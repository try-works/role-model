import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { canonicalTaxonomy } from "../src/taxonomy/index.js";

const require = createRequire(import.meta.url);
const dataRoot = path.resolve(process.cwd(), "data", "taxonomy");
const repoRoot = path.resolve(process.cwd(), "..", "..", "..");
const schemaRoot = path.join(repoRoot, "schemas", "role-model", "taxonomy");

const readJson = <T>(filePath: string): T => JSON.parse(readFileSync(filePath, "utf8")) as T;

describe("taxonomy data and schema files", () => {
  test("ships proposal-shaped schema files for every taxonomy resource kind", () => {
    for (const fileName of [
      "manifest.schema.json",
      "taxonomy.schema.json",
      "group.schema.json",
      "role.schema.json",
      "task-type.schema.json",
      "capability.schema.json",
      "modality.schema.json",
      "tool-class.schema.json",
      "intent-preset.schema.json",
      "classification.schema.json",
      "model-role-assignment.schema.json",
      "effective-taxonomy.schema.json",
    ]) {
      expect(existsSync(path.join(schemaRoot, fileName)), fileName).toBe(true);
    }
  });

  test("ships canonical JSON data that matches the runtime taxonomy source", () => {
    expect(readJson(path.join(dataRoot, "manifest.json"))).toEqual(canonicalTaxonomy.manifest);
    expect(readJson(path.join(dataRoot, "groups.json"))).toEqual(canonicalTaxonomy.groups);
    expect(readJson(path.join(dataRoot, "roles.json"))).toEqual(canonicalTaxonomy.roles);
    expect(readJson(path.join(dataRoot, "task-types.json"))).toEqual(canonicalTaxonomy.tasks);
    expect(readJson(path.join(dataRoot, "capabilities.json"))).toEqual(
      canonicalTaxonomy.capabilities,
    );
    expect(readJson(path.join(dataRoot, "modalities.json"))).toEqual(canonicalTaxonomy.modalities);
    expect(readJson(path.join(dataRoot, "tool-classes.json"))).toEqual(
      canonicalTaxonomy.toolClasses,
    );
    expect(readJson(path.join(dataRoot, "intent-presets.json"))).toEqual(
      canonicalTaxonomy.intentPresets,
    );
  });

  test("run 58 benchmark and telemetry schemas exist under schemas/role-model/taxonomy/", () => {
    for (const fileName of [
      "benchmark-suite.schema.json",
      "benchmark-run.schema.json",
      "benchmark-result.schema.json",
      "telemetry-taxonomy-event.schema.json",
    ]) {
      expect(existsSync(path.join(schemaRoot, fileName)), fileName).toBe(true);
    }
  });

  test("run 58 benchmark and telemetry schemas validate sample data", () => {
    const ajvModule: typeof import("ajv/dist/2020.js") = require("ajv/dist/2020.js");
    const formatsModule: typeof import("ajv-formats") = require("ajv-formats");
    const Ajv2020 = ajvModule.default;
    const addFormats = formatsModule.default;
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);

    const loadSchema = (fileName: string) => {
      const schema = readJson<Record<string, unknown>>(path.join(schemaRoot, fileName));
      ajv.addSchema(schema, schema.$id as string);
      return ajv.getSchema(schema.$id as string) ?? ajv.compile(schema);
    };

    const benchmarkSuiteSchema = loadSchema("benchmark-suite.schema.json");
    const benchmarkRunSchema = loadSchema("benchmark-run.schema.json");
    const benchmarkResultSchema = loadSchema("benchmark-result.schema.json");
    const telemetryTaxonomyEventSchema = loadSchema("telemetry-taxonomy-event.schema.json");

    // Benchmark suite: valid suite-level taxonomy tags
    expect(
      benchmarkSuiteSchema({
        taxonomyTags: {
          roleId: "coder",
          taskType: "coder.review",
          requiredCapabilities: ["code.read"],
          requiredModalities: ["text"],
          toolClasses: ["filesystem.read"],
        },
      }),
    ).toBe(true);

    // Benchmark run: valid taxonomy context
    expect(
      benchmarkRunSchema({
        taxonomyContext: {
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          dimensions: ["role", "task", "capability"],
        },
      }),
    ).toBe(true);

    // Benchmark run: invalid dimension
    expect(
      benchmarkRunSchema({
        taxonomyContext: {
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          dimensions: ["invalid_dimension"],
        },
      }),
    ).toBe(false);

    // Benchmark result: valid taxonomy scores
    expect(
      benchmarkResultSchema({
        taxonomyScores: {
          byRole: { coder: 0.85 },
          byTask: { "coder.review": 0.9 },
          byVariant: { root_cause: 0.8 },
          byCapability: { "code.read": 0.88 },
          byModality: { text: 0.87 },
          byToolClass: { "filesystem.read": 0.86 },
        },
      }),
    ).toBe(true);

    // Benchmark result: score out of range
    expect(
      benchmarkResultSchema({
        taxonomyScores: {
          byRole: { coder: 1.5 },
        },
      }),
    ).toBe(false);

    // Telemetry event: valid taxonomy dimensions
    expect(
      telemetryTaxonomyEventSchema({
        taxonomy_role_id: "coder",
        taxonomy_task_type: "coder.review",
        taxonomy_role_source: "heuristic",
        taxonomy_task_source: "heuristic",
        taxonomy_confidence: 0.85,
        taxonomy_version: "1.0.0-alpha.1",
        classification_contract_version: "role-model.classification.v1",
      }),
    ).toBe(true);

    // Telemetry event: invalid source enum
    expect(
      telemetryTaxonomyEventSchema({
        taxonomy_role_id: "coder",
        taxonomy_task_type: "coder.review",
        taxonomy_role_source: "invalid",
        taxonomy_task_source: "heuristic",
      }),
    ).toBe(false);

    // Telemetry event: confidence out of range
    expect(
      telemetryTaxonomyEventSchema({
        taxonomy_confidence: 1.5,
      }),
    ).toBe(false);
  });

  test("taxonomy schemas validate canonical data and reject proposal-contract drift", async () => {
    const ajvModule: typeof import("ajv/dist/2020.js") = require("ajv/dist/2020.js");
    const formatsModule: typeof import("ajv-formats") = require("ajv-formats");
    const Ajv2020 = ajvModule.default;
    const addFormats = formatsModule.default;
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);

    const loadSchema = (fileName: string) => {
      const schema = readJson<Record<string, unknown>>(path.join(schemaRoot, fileName));
      ajv.addSchema(schema, schema.$id as string);
      return ajv.getSchema(schema.$id as string) ?? ajv.compile(schema);
    };

    const manifestSchema = loadSchema("manifest.schema.json");
    const groupSchema = loadSchema("group.schema.json");
    const roleSchema = loadSchema("role.schema.json");
    const taskTypeSchema = loadSchema("task-type.schema.json");

    expect(manifestSchema(canonicalTaxonomy.manifest)).toBe(true);
    expect(groupSchema(canonicalTaxonomy.groups[0])).toBe(true);
    expect(roleSchema(canonicalTaxonomy.roles[0])).toBe(true);
    expect(taskTypeSchema(canonicalTaxonomy.tasks[0])).toBe(true);

    expect(taskTypeSchema({ ...canonicalTaxonomy.tasks[0], kind: "task" })).toBe(false);
    expect(taskTypeSchema({ ...canonicalTaxonomy.tasks[0], extraField: true })).toBe(false);
    expect(
      roleSchema({
        ...canonicalTaxonomy.roles[0],
        authority: { ...canonicalTaxonomy.roles[0].authority, scope: "workspace" },
      }),
    ).toBe(false);
    expect(
      manifestSchema({
        ...canonicalTaxonomy.manifest,
        entryFiles: undefined,
      }),
    ).toBe(false);
    expect(
      manifestSchema({
        ...canonicalTaxonomy.manifest,
        contentHashes: undefined,
      }),
    ).toBe(false);
  });
});
