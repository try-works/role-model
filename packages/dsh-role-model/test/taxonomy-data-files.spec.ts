/**
 * L2: bundled taxonomy data integrity.
 *
 * The taxonomy is copied from `packages/pi-role-model/data/taxonomy`. These specs
 * prove the copy is complete and self-consistent (the manifest's hashes still
 * match the bytes on disk), keep the progressive-disclosure size guardrails, and
 * pin the snapshot values the classifier's output depends on.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  type RawRoleTaskIndex,
  loadCompactTaxonomy,
  normalizeRoleTaskIndex,
  resolveTaxonomyDataRoot,
} from "../src/taxonomy/staged-compact-taxonomy.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
/** The package root, one level above `test/`. */
const packageRoot = resolve(testDirectory, "..");
/** The data root under test. */
const dataRoot = join(packageRoot, "data", "taxonomy");

/** Read and decode one JSON file from the data root. */
function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(dataRoot, relativePath), "utf8")) as T;
}

/** Every prompt-loaded chunk must stay under this bound. */
const CHUNK_LIMIT_BYTES = 26 * 1024;

/** The only keys the task index may carry. */
const INDEX_TASK_KEYS = ["id", "label"];

describe("bundled data files", () => {
  test("ships every compact taxonomy file", () => {
    const taxonomy = loadCompactTaxonomy();
    expect(readJson("compact-manifest.json")).toEqual(taxonomy.manifest);
    expect(readJson("compact-groups.json")).toEqual(taxonomy.groups);
    expect(readJson("compact-role-summaries.json")).toEqual(taxonomy.roleSummaries);
    expect(
      normalizeRoleTaskIndex(readJson<RawRoleTaskIndex>("compact-role-task-index.json")),
    ).toEqual(taxonomy.roleTaskIndex);
    expect(existsSync(join(dataRoot, "compact-classification-guide.json"))).toBe(true);
    expect(taxonomy.manifest.entryFiles).toEqual({
      groups: "compact-groups.json",
      roleSummaries: "compact-role-summaries.json",
      roleTaskIndex: "compact-role-task-index.json",
      classificationGuide: "compact-classification-guide.json",
    });
  });

  test("keeps the manifest hashes consistent with the bytes on disk", () => {
    const taxonomy = loadCompactTaxonomy();
    for (const [key, fileName] of Object.entries(taxonomy.manifest.entryFiles)) {
      const digest = createHash("sha256")
        .update(readFileSync(join(dataRoot, fileName)))
        .digest("hex");
      expect(taxonomy.manifest.contentHashes[key], key).toBe(`sha256:${digest}`);
      // A constant digest would mean the hashes were fabricated.
      expect(taxonomy.manifest.contentHashes[key]?.replace(/^sha256:/u, ""), key).not.toMatch(
        /^([a-f0-9])\1{63}$/u,
      );
    }
  });

  test("ships the per-group and per-role mirrors the loader may address directly", () => {
    const taxonomy = loadCompactTaxonomy();
    for (const group of taxonomy.groups) {
      expect(readJson(join("groups", `${group.id}.json`))).toEqual(group);
    }
    for (const role of taxonomy.roleSummaries) {
      expect(readJson(join("roles", role.id, "tasks.compact.json"))).toEqual(
        taxonomy.roleTaskChunks[role.id],
      );
    }
  });

  test("declares the snapshot the classifier emits into role_model.intent", () => {
    const taxonomy = loadCompactTaxonomy();
    expect(taxonomy.manifest.taxonomyVersion).toBe("1.0.0-alpha.1");
    expect(taxonomy.manifest.contentRevision).toBe("taxonomy-v1-alpha.1");
    expect(taxonomy.manifest.classificationContractVersion).toBe("role-model.classification.v1");
    expect(taxonomy.manifest.entryCounts).toEqual({ groups: 6, roles: 28, taskTypes: 280 });
    expect(taxonomy.manifest).not.toHaveProperty("counts");
  });

  test("has six groups covering all twenty-eight roles", () => {
    const taxonomy = loadCompactTaxonomy();
    expect(taxonomy.groups.map((group) => group.id)).toEqual([
      "engineering",
      "product_design",
      "knowledge_research",
      "business",
      "communication",
      "governance_safety",
    ]);
    expect(taxonomy.roleSummaries).toHaveLength(28);
    expect(new Set(taxonomy.roleSummaries.map((role) => role.id)).size).toBe(28);
    // Every role's primary group must exist.
    const groupIds = new Set(taxonomy.groups.map((group) => group.id));
    for (const role of taxonomy.roleSummaries) {
      expect(groupIds.has(role.primaryGroupId), role.id).toBe(true);
      for (const secondary of role.secondaryGroupIds) {
        expect(groupIds.has(secondary), `${role.id}/${secondary}`).toBe(true);
      }
    }
  });

  test("gives every role at least ten tasks in its own chunk", () => {
    const taxonomy = loadCompactTaxonomy();
    for (const role of taxonomy.roleSummaries) {
      const tasks = taxonomy.roleTaskChunks[role.id];
      expect(tasks, role.id).toBeDefined();
      expect(tasks?.length, role.id).toBeGreaterThanOrEqual(10);
    }
    expect(Object.values(taxonomy.roleTaskChunks).flat()).toHaveLength(280);
  });

  test("carries the classification signals the role scorer depends on", () => {
    const taxonomy = loadCompactTaxonomy();
    for (const role of taxonomy.roleSummaries) {
      expect(role.classification, role.id).toBeDefined();
      expect(role.classification?.summary.length, role.id).toBeGreaterThan(0);
      expect(role.classification?.positiveSignals.length, role.id).toBeGreaterThan(0);
      expect(role.classification?.negativeSignals.length, role.id).toBeGreaterThan(0);
    }
  });

  test("pins the coder role and one of its tasks", () => {
    const taxonomy = loadCompactTaxonomy();
    const coder = taxonomy.roleSummaries.find((role) => role.id === "coder");
    expect(coder).toMatchObject({
      label: "Coder",
      primaryGroupId: "engineering",
      secondaryGroupIds: [],
    });
    expect(coder?.classification?.positiveSignals).toContain("code");

    const task = taxonomy.roleTaskChunks.coder?.find((entry) => entry.id === "coder.edit");
    expect(task).toMatchObject({
      label: "Code Edit",
      primaryRole: "coder",
      compatibleRoles: ["coder", "architect"],
      requiredCapabilities: ["code.read", "code.write"],
      preferredCapabilities: ["reasoning.multi_step"],
      requiredModalities: ["text"],
      toolClasses: ["filesystem.read", "filesystem.write", "shell.execute"],
      variants: [],
    });
  });
});

describe("progressive-disclosure guardrails", () => {
  test("keeps the task index compact and detail-free", () => {
    const taxonomy = loadCompactTaxonomy();
    expect(statSync(join(dataRoot, "compact-role-task-index.json")).size).toBeLessThanOrEqual(
      CHUNK_LIMIT_BYTES,
    );
    for (const tasks of Object.values(taxonomy.roleTaskIndex)) {
      for (const task of tasks) {
        expect(Object.keys(task).sort()).toEqual([...INDEX_TASK_KEYS].sort());
      }
    }
  });

  test("keeps every prompt-loaded chunk under the size guardrail", () => {
    const taxonomy = loadCompactTaxonomy();
    const guarded = [
      "compact-manifest.json",
      "compact-groups.json",
      "compact-role-summaries.json",
      "compact-role-task-index.json",
      ...taxonomy.groups.map((group) => join("groups", `${group.id}.json`)),
      ...taxonomy.roleSummaries.map((role) => join("roles", role.id, "tasks.compact.json")),
    ];
    for (const fileName of guarded) {
      expect(statSync(join(dataRoot, fileName)).size, fileName).toBeLessThanOrEqual(
        CHUNK_LIMIT_BYTES,
      );
    }
  });

  test("keeps the total data set small enough to bundle", () => {
    const taxonomy = loadCompactTaxonomy();
    const total = [
      "compact-manifest.json",
      "compact-groups.json",
      "compact-role-summaries.json",
      "compact-role-task-index.json",
      ...taxonomy.roleSummaries.map((role) => join("roles", role.id, "tasks.compact.json")),
    ].reduce((sum, fileName) => sum + statSync(join(dataRoot, fileName)).size, 0);
    expect(total).toBeLessThan(300 * 1024);
  });

  test("resolves the data root relative to the calling module, for both layouts", () => {
    // The sources live at src/taxonomy/, two levels below the package root.
    expect(resolveTaxonomyDataRoot(join(packageRoot, "src", "taxonomy"))).toBe(dataRoot);
    // The built bundle lives at lib/index.js, one level below it.
    expect(resolveTaxonomyDataRoot(join(packageRoot, "lib"))).toBe(dataRoot);
  });
});
