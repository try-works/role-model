import { describe, expect, test } from "vitest";

import { startBridgeServer } from "../src/index.js";

describe("taxonomy discovery API", () => {
  test("exposes the proposal taxonomy discovery route family", async () => {
    const registry = {
      endpoints: [],
      diagnostics: [],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    } as never;

    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      getRegistry: () => registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      readHealthStatus: async () => ({ status: "healthy" }),
      getRoutableInventory: () => null,
    });

    try {
      const baseUrl = `http://127.0.0.1:${server.port}`;

      for (const route of [
        "/api/role-model/taxonomy",
        "/api/role-model/taxonomy/version",
        "/api/role-model/taxonomy/summary",
        "/api/role-model/taxonomy/effective",
        "/api/role-model/taxonomy/classification-guide",
        "/api/role-model/taxonomy/groups",
        "/api/role-model/taxonomy/roles",
        "/api/role-model/taxonomy/roles?view=summary",
        "/api/role-model/taxonomy/groups/engineering/roles",
        "/api/role-model/taxonomy/roles/coder",
        "/api/role-model/taxonomy/roles/coder/task-types",
        "/api/role-model/taxonomy/task-types",
        "/api/role-model/taxonomy/task-types/coder.edit",
        "/api/role-model/taxonomy/capabilities",
        "/api/role-model/taxonomy/modalities",
        "/api/role-model/taxonomy/tool-classes",
      ]) {
        const response = await fetch(`${baseUrl}${route}`);
        expect(response.ok, route).toBe(true);
        const body = (await response.json()) as {
          taxonomyVersion?: string;
          schemaVersion?: string;
          databaseVersion?: number;
          contentRevision?: string;
          classificationContractVersion?: string;
        };
        expect(body.taxonomyVersion, route).toBe("1.0.0-alpha.1");
        expect(body.schemaVersion, route).toBe("role-model.taxonomy.schema.v1");
        expect(body.databaseVersion, route).toBe(1);
        expect(body.contentRevision, route).toBe("taxonomy-v1-alpha.1");
        expect(body.classificationContractVersion, route).toBe("role-model.classification.v1");
      }

      const summaryResponse = await fetch(`${baseUrl}/api/role-model/taxonomy/summary`);
      const summary = (await summaryResponse.json()) as {
        groups: readonly { id: string; roleIds: readonly string[]; next: string }[];
        next: Record<string, string>;
      };
      expect(summary.groups.find((group) => group.id === "engineering")?.roleIds).toEqual(
        expect.arrayContaining(["coder", "architect"]),
      );
      expect(summary.next.roles).toBe("/api/role-model/taxonomy/roles?view=summary");

      const roleDetailResponse = await fetch(`${baseUrl}/api/role-model/taxonomy/roles/security`);
      const roleDetail = (await roleDetailResponse.json()) as {
        role: { id: string; primaryGroupId: string; secondaryGroupIds: readonly string[] };
        next: { taskTypes: string };
      };
      expect(roleDetail.role).toMatchObject({
        id: "security",
        primaryGroupId: "engineering",
      });
      expect(roleDetail.role.secondaryGroupIds).toEqual(["governance_safety"]);
      expect(roleDetail.next.taskTypes).toBe("/api/role-model/taxonomy/roles/security/task-types");

      const missingResponse = await fetch(`${baseUrl}/api/role-model/taxonomy/roles/nope`);
      expect(missingResponse.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  test("exposes manifest, compact groups, role task chunks, and validation diagnostics", async () => {
    const registry = {
      endpoints: [],
      diagnostics: [],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    } as never;

    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      getRegistry: () => registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      readHealthStatus: async () => ({ status: "healthy" }),
      getRoutableInventory: () => null,
    });

    try {
      const baseUrl = `http://127.0.0.1:${server.port}`;

      const manifestResponse = await fetch(`${baseUrl}/api/role-model/taxonomy/manifest`);
      expect(manifestResponse.ok).toBe(true);
      const manifest = (await manifestResponse.json()) as {
        taxonomyVersion: string;
        classificationContractVersion: string;
        entryCounts: { groups: number; roles: number; taskTypes: number };
        counts?: unknown;
        links: Record<string, string>;
      };
      expect(manifest.taxonomyVersion).toBe("1.0.0-alpha.1");
      expect(manifest.classificationContractVersion).toBe("role-model.classification.v1");
      expect(manifest.counts).toBeUndefined();
      expect(manifest.entryCounts).toMatchObject({ groups: 6, roles: 28 });
      expect(manifest.entryCounts.taskTypes).toBeGreaterThanOrEqual(280);
      expect(manifest.links.compactGroups).toBe("/api/role-model/taxonomy/compact/groups");

      const etag = manifestResponse.headers.get("etag");
      expect(etag).toMatch(/^"sha256:[a-f0-9]{64}"$/);
      const cachedManifestResponse = await fetch(`${baseUrl}/api/role-model/taxonomy/manifest`, {
        headers: { "if-none-match": etag ?? "" },
      });
      expect(cachedManifestResponse.status).toBe(304);
      expect(await cachedManifestResponse.text()).toBe("");

      const groupsResponse = await fetch(`${baseUrl}/api/role-model/taxonomy/compact/groups`);
      expect(groupsResponse.ok).toBe(true);
      const groups = (await groupsResponse.json()) as {
        groups: readonly { id: string; primaryRoleIds: readonly string[] }[];
      };
      expect(groups.groups.find((group) => group.id === "engineering")?.primaryRoleIds).toEqual(
        expect.arrayContaining(["coder", "architect", "operator"]),
      );

      const roleTasksResponse = await fetch(
        `${baseUrl}/api/role-model/taxonomy/roles/coder/tasks.compact`,
      );
      expect(roleTasksResponse.ok).toBe(true);
      const roleTasks = (await roleTasksResponse.json()) as {
        roleId: string;
        tasks: readonly { id: string; requiredCapabilities: readonly string[] }[];
      };
      expect(roleTasks.roleId).toBe("coder");
      expect(roleTasks.tasks.length).toBeGreaterThanOrEqual(10);
      expect(roleTasks.tasks.map((task) => task.id)).toEqual(
        expect.arrayContaining(["coder.edit", "coder.review"]),
      );

      const validationResponse = await fetch(`${baseUrl}/api/role-model/taxonomy/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roleId: "coder",
          taskType: "coder.edit",
          capabilities: ["code.write", "unknown.capability"],
          modalities: ["text"],
          toolClasses: ["filesystem.write"],
        }),
      });
      expect(validationResponse.ok).toBe(true);
      const validation = (await validationResponse.json()) as {
        valid: boolean;
        diagnostics: readonly { code: string; id: string }[];
      };
      expect(validation.valid).toBe(false);
      expect(validation.diagnostics).toEqual(
        expect.arrayContaining([{ code: "UNKNOWN_CAPABILITY", id: "unknown.capability" }]),
      );
    } finally {
      await server.close();
    }
  });

  // ── R4.1: Classification guide generated from taxonomy data ──

  test("classification guide is generated from taxonomy data (R4.1)", async () => {
    const resp = await fetch(`${baseUrl}/api/role-model/taxonomy/classification-guide`);
    expect(resp.status).toBe(200);
    const guide = await resp.json();

    expect(guide.taxonomyVersion).toBe("1.0.0-alpha.1");
    expect(guide.groups).toBeDefined();
    expect(Array.isArray(guide.groups)).toBe(true);
    expect(guide.groups.length).toBe(6);

    for (const group of guide.groups) {
      expect(group.id).toBeDefined();
      expect(group.label).toBeDefined();
      expect(group.roleCount).toBeGreaterThan(0);
    }

    expect(guide.algorithm).toBeDefined();
    expect(Array.isArray(guide.algorithm)).toBe(true);
    expect(guide.algorithm.length).toBeGreaterThan(0);

    const engineering = guide.groups.find((g: { id: string }) => g.id === "engineering");
    expect(engineering).toBeDefined();
  });
});
