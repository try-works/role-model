import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import packageJson from "../package.json" with { type: "json" };
import { loadCompactTaxonomy } from "../src/taxonomy/load-compact-taxonomy.js";

const dataRoot = path.resolve(process.cwd(), "data", "taxonomy");
const goldenFixturePath = path.resolve(
  process.cwd(),
  "..",
  "..",
  "role-model-router",
  "packages",
  "core",
  "testdata",
  "taxonomy",
  "proposal-v1-golden.json",
);
const readJson = <T>(filePath: string): T => JSON.parse(readFileSync(filePath, "utf8")) as T;
const compactChunkLimitBytes = 26 * 1024; // 20 KB — classification fields added for all 28 roles
const allowedIndexTaskKeys = new Set(["id", "label"]);
type RawRoleTaskIndex = Record<
  string,
  readonly (
    | readonly [id: string, label: string]
    | { readonly id: string; readonly label: string }
  )[]
>;
function isRoleTaskTuple(
  task: RawRoleTaskIndex[string][number],
): task is readonly [id: string, label: string] {
  return Array.isArray(task);
}
const normalizeRoleTaskIndex = (index: RawRoleTaskIndex) =>
  Object.fromEntries(
    Object.entries(index).map(([roleId, tasks]) => [
      roleId,
      tasks.map((task) =>
        isRoleTaskTuple(task)
          ? { id: task[0], label: task[1] }
          : { id: task.id, label: task.label },
      ),
    ]),
  );

describe("packaged compact taxonomy data files", () => {
  test("ships compact taxonomy files for offline progressive disclosure", () => {
    const taxonomy = loadCompactTaxonomy();

    expect(readJson(path.join(dataRoot, "compact-manifest.json"))).toEqual(taxonomy.manifest);
    expect(readJson(path.join(dataRoot, "compact-groups.json"))).toEqual(taxonomy.groups);
    expect(readJson(path.join(dataRoot, "compact-role-summaries.json"))).toEqual(
      taxonomy.roleSummaries,
    );
    expect(
      normalizeRoleTaskIndex(readJson(path.join(dataRoot, "compact-role-task-index.json"))),
    ).toEqual(taxonomy.roleTaskIndex);
    expect(existsSync(path.join(dataRoot, "compact-classification-guide.json"))).toBe(true);
    expect(taxonomy.manifest.entryFiles).toEqual({
      groups: "compact-groups.json",
      roleSummaries: "compact-role-summaries.json",
      roleTaskIndex: "compact-role-task-index.json",
      classificationGuide: "compact-classification-guide.json",
    });

    for (const [key, fileName] of Object.entries(taxonomy.manifest.entryFiles)) {
      const digest = createHash("sha256")
        .update(readFileSync(path.join(dataRoot, fileName)))
        .digest("hex");
      expect(taxonomy.manifest.contentHashes[key], key).toBe(`sha256:${digest}`);
      expect(taxonomy.manifest.contentHashes[key].replace(/^sha256:/, ""), key).not.toMatch(
        /^([a-f0-9])\1{63}$/,
      );
    }

    for (const group of taxonomy.groups) {
      expect(readJson(path.join(dataRoot, "groups", `${group.id}.json`))).toEqual(group);
    }
    for (const role of taxonomy.roleSummaries) {
      expect(readJson(path.join(dataRoot, "roles", role.id, "tasks.compact.json"))).toEqual(
        taxonomy.roleTaskChunks[role.id],
      );
    }
  });

  test("includes compact taxonomy data in the published package files", () => {
    expect(packageJson.files).toContain("data");
  });

  test("stays in sync with the proposal golden taxonomy fixture", () => {
    const taxonomy = loadCompactTaxonomy();
    const golden = readJson<{
      manifest: {
        taxonomyVersion: string;
        contentRevision: string;
        classificationContractVersion: string;
      };
      groups: readonly { id: string }[];
      roles: readonly { id: string }[];
      tasks: readonly { id: string }[];
    }>(goldenFixturePath);

    expect(taxonomy.manifest.taxonomyVersion).toBe(golden.manifest.taxonomyVersion);
    expect(taxonomy.manifest.contentRevision).toBe(golden.manifest.contentRevision);
    expect(taxonomy.manifest.classificationContractVersion).toBe(
      golden.manifest.classificationContractVersion,
    );
    expect(taxonomy.manifest).not.toHaveProperty("counts");
    expect(taxonomy.manifest.entryCounts).toEqual({
      groups: golden.groups.length,
      roles: golden.roles.length,
      taskTypes: golden.tasks.length,
    });
    expect(taxonomy.groups.map((group) => group.id)).toEqual(
      golden.groups.map((group) => group.id),
    );
    expect(taxonomy.roleSummaries.map((role) => role.id)).toEqual(
      golden.roles.map((role) => role.id),
    );
    expect(
      Object.values(taxonomy.roleTaskIndex)
        .flat()
        .map((task) => task.id)
        .sort(),
    ).toEqual(golden.tasks.map((task) => task.id).sort());
  });

  test("keeps the role-task index compact and moves task detail into lazy role chunks", () => {
    const taxonomy = loadCompactTaxonomy();
    const golden = readJson<{
      roles: readonly {
        id: string;
        label: string;
        description: string;
        primaryGroupId: string;
        secondaryGroupIds: readonly string[];
        typicalTaskIds?: readonly string[];
      }[];
      tasks: readonly {
        id: string;
        label: string;
        description: string;
        primaryRole: string;
        compatibleRoles: readonly string[];
        requiredCapabilities: readonly string[];
        preferredCapabilities: readonly string[];
        requiredModalities: readonly string[];
        toolClasses: readonly string[];
        classifier?: { useWhen: string; doNotUseWhen: string };
        variants?: readonly string[];
      }[];
    }>(goldenFixturePath);

    expect(statSync(path.join(dataRoot, "compact-role-task-index.json")).size).toBeLessThanOrEqual(
      compactChunkLimitBytes,
    );
    for (const tasks of Object.values(taxonomy.roleTaskIndex)) {
      for (const task of tasks) {
        expect(Object.keys(task).sort()).toEqual([...allowedIndexTaskKeys].sort());
      }
    }

    const compactRolesById = new Map(taxonomy.roleSummaries.map((role) => [role.id, role]));
    for (const goldenRole of golden.roles) {
      expect(compactRolesById.get(goldenRole.id)).toMatchObject({
        id: goldenRole.id,
        label: goldenRole.label,
        description: goldenRole.description,
        primaryGroupId: goldenRole.primaryGroupId,
        secondaryGroupIds: goldenRole.secondaryGroupIds,
        typicalTaskIds: goldenRole.typicalTaskIds,
      });
    }

    const compactTasksById = new Map(
      Object.values(taxonomy.roleTaskChunks)
        .flat()
        .map((task) => [task.id, task]),
    );
    for (const goldenTask of golden.tasks) {
      expect(compactTasksById.get(goldenTask.id)).toMatchObject({
        id: goldenTask.id,
        label: goldenTask.label,
        description: goldenTask.description,
        primaryRole: goldenTask.primaryRole,
        compatibleRoles: goldenTask.compatibleRoles,
        requiredCapabilities: goldenTask.requiredCapabilities,
        preferredCapabilities: goldenTask.preferredCapabilities,
        requiredModalities: goldenTask.requiredModalities,
        toolClasses: goldenTask.toolClasses,
        classifier: goldenTask.classifier,
        variants: goldenTask.variants ?? [],
      });
    }
  });

  test("keeps every prompt-loaded compact chunk under the hard size guardrail", () => {
    const taxonomy = loadCompactTaxonomy();
    const guardedFiles = [
      "compact-manifest.json",
      "compact-groups.json",
      "compact-role-summaries.json",
      "compact-role-task-index.json",
      ...taxonomy.groups.map((group) => path.join("groups", `${group.id}.json`)),
      ...taxonomy.roleSummaries.map((role) => path.join("roles", role.id, "tasks.compact.json")),
    ];

    for (const fileName of guardedFiles) {
      expect(statSync(path.join(dataRoot, fileName)).size, fileName).toBeLessThanOrEqual(
        compactChunkLimitBytes,
      );
    }
  });
});
