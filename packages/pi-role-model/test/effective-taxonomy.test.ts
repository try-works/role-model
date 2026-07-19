import { describe, expect, test } from "vitest";

import { classifyWithProgressiveDisclosure } from "../src/taxonomy/classify-with-progressive-disclosure.js";
import { loadCompactTaxonomy } from "../src/taxonomy/load-compact-taxonomy.js";
import { resolveEffectiveTaxonomy } from "../src/taxonomy/resolve-effective-taxonomy.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("effective taxonomy resolution", () => {
  test("prefers compatible live runtime compact taxonomy over the packaged snapshot", async () => {
    const packageTaxonomy = loadCompactTaxonomy();
    const calls: string[] = [];
    const runtimeTaxonomy = {
      ...packageTaxonomy,
      manifest: {
        ...packageTaxonomy.manifest,
        contentRevision: "runtime-taxonomy-revision",
      },
      roleTaskChunks: {
        ...packageTaxonomy.roleTaskChunks,
        coder: [
          {
            id: "coder.edit",
            label: "Runtime Code Edit",
            primaryRole: "coder",
            compatibleRoles: ["coder"],
            requiredCapabilities: ["code.read", "code.write"],
            preferredCapabilities: ["reasoning.multi_step"],
            requiredModalities: ["text"],
            toolClasses: ["filesystem.read", "filesystem.write", "shell.execute"],
            variants: [],
          },
        ],
      },
    };

    const result = await resolveEffectiveTaxonomy({
      endpoint: "http://127.0.0.1:3456",
      fetch: async (url) => {
        calls.push(String(url));
        if (String(url).endsWith("/api/role-model/taxonomy/manifest")) {
          return jsonResponse(runtimeTaxonomy.manifest);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/compact/groups")) {
          return jsonResponse(runtimeTaxonomy.groups);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/compact/roles")) {
          return jsonResponse(runtimeTaxonomy.roleSummaries);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/roles/coder/tasks.compact")) {
          return jsonResponse({
            roleId: "coder",
            tasks: runtimeTaxonomy.roleTaskChunks.coder,
          });
        }
        return jsonResponse([], 404);
      },
      roleIds: ["coder"],
    });

    expect(result.source).toBe("runtime");
    expect(result.taxonomy.manifest.contentRevision).toBe("runtime-taxonomy-revision");
    expect(result.taxonomy.roleTaskChunks.coder[0]?.label).toBe("Runtime Code Edit");
    expect(calls).toEqual([
      "http://127.0.0.1:3456/api/role-model/taxonomy/manifest",
      "http://127.0.0.1:3456/api/role-model/taxonomy/compact/groups",
      "http://127.0.0.1:3456/api/role-model/taxonomy/compact/roles",
      "http://127.0.0.1:3456/api/role-model/taxonomy/roles/coder/tasks.compact",
    ]);

    const classification = classifyWithProgressiveDisclosure({
      prompt: "Implement this small bug fix and add a regression test.",
      taxonomy: result.taxonomy,
    });
    expect(classification.role_model.intent.content_revision).toBe("runtime-taxonomy-revision");
  });

  test("does not fetch every runtime role task chunk when no candidate roles are supplied", async () => {
    const packageTaxonomy = loadCompactTaxonomy();
    const calls: string[] = [];

    const result = await resolveEffectiveTaxonomy({
      endpoint: "http://127.0.0.1:3456",
      fetch: async (url) => {
        calls.push(String(url));
        if (String(url).endsWith("/api/role-model/taxonomy/manifest")) {
          return jsonResponse(packageTaxonomy.manifest);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/compact/groups")) {
          return jsonResponse(packageTaxonomy.groups);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/compact/roles")) {
          return jsonResponse(packageTaxonomy.roleSummaries);
        }
        if (String(url).includes("/tasks.compact")) {
          return jsonResponse({ roleId: "unexpected", tasks: [] });
        }
        return jsonResponse([], 404);
      },
    });

    expect(result.source).toBe("runtime");
    expect(calls.filter((url) => url.includes("/tasks.compact"))).toEqual([]);
    expect(calls).toHaveLength(3);
  });

  test("progressive runtime classification loads only candidate role task chunks before final task selection", async () => {
    const packageTaxonomy = loadCompactTaxonomy();
    const calls: string[] = [];
    const runtimeTaxonomy = {
      ...packageTaxonomy,
      manifest: {
        ...packageTaxonomy.manifest,
        contentRevision: "runtime-security-revision",
      },
      roleTaskChunks: {
        ...packageTaxonomy.roleTaskChunks,
        security: [
          {
            id: "security.audit",
            label: "Runtime Security Audit",
            primaryRole: "security",
            compatibleRoles: ["security"],
            requiredCapabilities: ["security.analysis"],
            preferredCapabilities: ["code.read"],
            requiredModalities: ["text"],
            toolClasses: ["filesystem.read"],
            variants: [],
          },
        ],
      },
    };

    const firstPass = classifyWithProgressiveDisclosure({
      prompt: "Review this diff for security risks and likely regressions.",
      taxonomy: packageTaxonomy,
    });
    expect(firstPass.candidateRoleIds).toEqual(["security"]);

    const result = await resolveEffectiveTaxonomy({
      endpoint: "http://127.0.0.1:3456",
      roleIds: firstPass.candidateRoleIds,
      fetch: async (url) => {
        calls.push(String(url));
        if (String(url).endsWith("/api/role-model/taxonomy/manifest")) {
          return jsonResponse(runtimeTaxonomy.manifest);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/compact/groups")) {
          return jsonResponse(runtimeTaxonomy.groups);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/compact/roles")) {
          return jsonResponse(runtimeTaxonomy.roleSummaries);
        }
        if (String(url).endsWith("/api/role-model/taxonomy/roles/security/tasks.compact")) {
          return jsonResponse({
            roleId: "security",
            tasks: runtimeTaxonomy.roleTaskChunks.security,
          });
        }
        return jsonResponse([], 404);
      },
    });
    const finalClassification = classifyWithProgressiveDisclosure({
      prompt: "Review this diff for security risks and likely regressions.",
      taxonomy: result.taxonomy,
    });

    expect(calls.filter((url) => url.includes("/tasks.compact"))).toEqual([
      "http://127.0.0.1:3456/api/role-model/taxonomy/roles/security/tasks.compact",
    ]);
    expect(finalClassification.role_model.intent.content_revision).toBe(
      "runtime-security-revision",
    );
    expect(finalClassification.role_model.intent.task_type).toBe("security.audit");
    expect(finalClassification.loadedChunks).toEqual([
      "groups",
      "role-summaries",
      "tasks:security",
    ]);
  });

  test("falls back to packaged compact taxonomy when runtime taxonomy is unavailable", async () => {
    const result = await resolveEffectiveTaxonomy({
      endpoint: "http://127.0.0.1:3456",
      fetch: async () => {
        throw new Error("runtime offline");
      },
      roleIds: ["coder"],
    });

    expect(result.source).toBe("package");
    expect(result.fallbackReason).toContain("runtime offline");
    expect(result.taxonomy.manifest.entryCounts.taskTypes).toBe(280);
  });

  test("falls back to packaged compact taxonomy when runtime taxonomy is incompatible", async () => {
    const result = await resolveEffectiveTaxonomy({
      endpoint: "http://127.0.0.1:3456",
      fetch: async (url) => {
        if (String(url).endsWith("/api/role-model/taxonomy/manifest")) {
          return jsonResponse({
            taxonomyVersion: "9.0.0",
            contentRevision: "future",
            classificationContractVersion: "role-model.classification.v9",
            entryCounts: { groups: 6, roles: 28, taskTypes: 280 },
          });
        }
        return jsonResponse([]);
      },
      roleIds: ["coder"],
    });

    expect(result.source).toBe("package");
    expect(result.fallbackReason).toContain("incompatible taxonomy");
  });
});
