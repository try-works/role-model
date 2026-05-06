import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

interface PackageManifest {
  readonly name?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly exports?: Record<string, unknown>;
}

async function readManifest(relativePath: string): Promise<PackageManifest> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as PackageManifest;
}

async function collectRuntimeDependencyGraph(): Promise<Array<{ name: string; relativePath: string }>> {
  const manifests = new Map<string, { relativePath: string; manifest: PackageManifest }>();
  const manifestPaths = [
    "packages/protocol-types/package.json",
    "role-model-router/apps/runtime-host-bridge/package.json",
    "role-model-router/packages/adapter-execution/package.json",
    "role-model-router/packages/catalog/package.json",
    "role-model-router/packages/context-envelope/package.json",
    "role-model-router/packages/core/package.json",
    "role-model-router/packages/endpoint-registry/package.json",
    "role-model-router/packages/profile-aggregator/package.json",
    "role-model-router/packages/protocol-routing/package.json",
    "role-model-router/packages/provider-account/package.json",
    "role-model-router/packages/provider-anthropic/package.json",
    "role-model-router/packages/provider-mcp/package.json",
    "role-model-router/packages/provider-openai/package.json",
    "role-model-router/packages/retrieval-receipt/package.json",
    "role-model-router/packages/runtime-observability/package.json",
    "role-model-router/packages/sqlite-memory/package.json",
    "role-model-router/packages/tool-registry/package.json",
    "role-model-router/packages/trace/package.json",
    "role-model-router/packages/usage/package.json",
  ] as const;

  for (const relativePath of manifestPaths) {
    const manifest = await readManifest(relativePath);
    if (manifest.name) {
      manifests.set(manifest.name, { relativePath, manifest });
    }
  }

  const visited = new Set<string>();
  const ordered: Array<{ name: string; relativePath: string }> = [];

  function visit(name: string): void {
    if (visited.has(name)) {
      return;
    }
    visited.add(name);
    const entry = manifests.get(name);
    if (!entry) {
      return;
    }
    ordered.push({ name, relativePath: entry.relativePath });
    const dependencies = {
      ...entry.manifest.dependencies,
      ...entry.manifest.devDependencies,
    };
    for (const dependencyName of Object.keys(dependencies)) {
      if (dependencyName.startsWith("@role-model-router/") || dependencyName === "@role-model/protocol-types") {
        visit(dependencyName);
      }
    }
  }

  visit("@role-model-router/runtime-host-bridge");
  return ordered;
}

describe("runtime-host-bridge executable packaging", () => {
  test("declares a runtime export condition for the built runtime dependency graph", async () => {
    const runtimeGraph = await collectRuntimeDependencyGraph();

    for (const entry of runtimeGraph) {
      const manifest = await readManifest(entry.relativePath);
      const rootExport = manifest.exports?.["."] as { runtime?: string } | undefined;
      expect(rootExport).toMatchObject({
        runtime: "./dist/index.js",
      });
      await expect(
        access(path.join(repoRoot, path.dirname(entry.relativePath), rootExport?.runtime ?? "")),
      ).resolves.toBeUndefined();
    }
  });
});
