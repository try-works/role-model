import { describe, expect, test } from "vitest";

import {
  type CompactTaxonomyFileReader,
  createStagedCompactTaxonomyReader,
} from "../src/taxonomy/staged-compact-taxonomy.js";

function createTrackedReader(): {
  readonly calls: string[];
  readonly readJson: CompactTaxonomyFileReader;
} {
  const calls: string[] = [];
  const fixtures: Record<string, unknown> = {
    "compact-manifest.json": {
      taxonomyVersion: "1.0.0-alpha.1",
      contentRevision: "taxonomy-v1-alpha.1",
      classificationContractVersion: "role-model.classification.v1",
      entryCounts: { groups: 1, roles: 2, taskTypes: 2 },
      entryFiles: {},
      contentHashes: {},
      roleTaskChunkFiles: {
        coder: "roles/coder/tasks.compact.json",
        security: "roles/security/tasks.compact.json",
      },
    },
    "compact-groups.json": [
      {
        id: "engineering",
        label: "Engineering",
        primaryRoleIds: ["coder", "security"],
        secondaryRoleIds: [],
      },
    ],
    "compact-role-summaries.json": [
      {
        id: "coder",
        label: "Coder",
        primaryGroupId: "engineering",
        secondaryGroupIds: [],
      },
      {
        id: "security",
        label: "Security",
        primaryGroupId: "engineering",
        secondaryGroupIds: ["governance_safety"],
      },
    ],
    "compact-role-task-index.json": {
      coder: [["coder.edit", "Code Edit"]],
      security: [["security.audit", "Security Audit"]],
    },
    "roles/coder/tasks.compact.json": [
      {
        id: "coder.edit",
        label: "Code Edit",
        primaryRole: "coder",
        compatibleRoles: ["coder"],
        requiredCapabilities: ["code.read"],
        preferredCapabilities: ["code.write"],
        requiredModalities: ["text"],
        toolClasses: ["filesystem.read"],
        variants: [],
      },
    ],
    "roles/security/tasks.compact.json": [
      {
        id: "security.audit",
        label: "Security Audit",
        primaryRole: "security",
        compatibleRoles: ["security"],
        requiredCapabilities: ["security.analysis"],
        preferredCapabilities: ["code.read"],
        requiredModalities: ["text"],
        toolClasses: ["filesystem.read"],
        variants: [],
      },
    ],
  };

  return {
    calls,
    readJson: <T>(fileName: string): T => {
      calls.push(fileName);
      if (!(fileName in fixtures)) {
        throw new Error(`unexpected read ${fileName}`);
      }
      return fixtures[fileName] as T;
    },
  };
}

describe("staged compact taxonomy reader", () => {
  test("loads manifest, groups, role summaries, and role-task index independently", () => {
    const tracked = createTrackedReader();
    const reader = createStagedCompactTaxonomyReader({ readJson: tracked.readJson });

    expect(reader.loadManifest().taxonomyVersion).toBe("1.0.0-alpha.1");
    expect(tracked.calls).toEqual(["compact-manifest.json"]);

    expect(reader.loadGroups().map((group) => group.id)).toEqual(["engineering"]);
    expect(tracked.calls).toEqual(["compact-manifest.json", "compact-groups.json"]);

    expect(reader.loadRoleSummaries().map((role) => role.id)).toEqual(["coder", "security"]);
    expect(tracked.calls).toEqual([
      "compact-manifest.json",
      "compact-groups.json",
      "compact-role-summaries.json",
    ]);

    expect(reader.loadRoleTaskIndex().security).toEqual([
      { id: "security.audit", label: "Security Audit" },
    ]);
    expect(tracked.calls).toEqual([
      "compact-manifest.json",
      "compact-groups.json",
      "compact-role-summaries.json",
      "compact-role-task-index.json",
    ]);
  });

  test("loads only requested role task chunks", () => {
    const tracked = createTrackedReader();
    const reader = createStagedCompactTaxonomyReader({ readJson: tracked.readJson });

    expect(reader.loadRoleTaskChunk("security")[0]?.id).toBe("security.audit");

    expect(tracked.calls).toEqual(["compact-manifest.json", "roles/security/tasks.compact.json"]);
    expect(tracked.calls).not.toContain("roles/coder/tasks.compact.json");
  });
});
