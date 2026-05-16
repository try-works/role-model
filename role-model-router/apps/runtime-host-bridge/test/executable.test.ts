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
  readonly scripts?: Readonly<Record<string, string>>;
}

async function readManifest(relativePath: string): Promise<PackageManifest> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as PackageManifest;
}

async function collectRuntimeDependencyGraph(): Promise<
  Array<{ name: string; relativePath: string }>
> {
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
    "role-model-router/packages/process-supervisor/package.json",
    "role-model-router/packages/protocol-routing/package.json",
    "role-model-router/packages/provider-account/package.json",
    "role-model-router/packages/provider-anthropic/package.json",
    "role-model-router/packages/provider-litellm/package.json",
    "role-model-router/packages/provider-mcp/package.json",
    "role-model-router/packages/provider-openai/package.json",
    "role-model-router/packages/retrieval-receipt/package.json",
    "role-model-router/packages/runtime-observability/package.json",
    "role-model-router/packages/sqlite-memory/package.json",
    "role-model-router/packages/tool-registry/package.json",
    "role-model-router/packages/trace/package.json",
    "role-model-router/packages/usage/package.json",
    "role-model-router/packages/vendor-abstraction/package.json",
    "role-model-router/packages/vendor-llama-swap/package.json",
    "role-model-router/packages/vendor-litellm/package.json",
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
      if (
        dependencyName.startsWith("@role-model-router/") ||
        dependencyName === "@role-model/protocol-types"
      ) {
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
      expect(manifest.scripts).toMatchObject({
        build: expect.any(String),
      });
    }
  });

  test("declares a SEA config and packaging command for platform-specific llama-swap assets", async () => {
    const rootManifest = await readManifest("package.json");
    expect(rootManifest.scripts).toMatchObject({
      "runtime:package-sea": expect.any(String),
    });

    const seaConfigPath = path.join(repoRoot, "role-model-router", "sea-config.json");
    const seaConfig = JSON.parse(await readFile(seaConfigPath, "utf8")) as {
      readonly main?: string;
      readonly output?: string;
      readonly assets?: Record<string, string>;
    };

    expect(seaConfig).toMatchObject({
      main: "./dist/sea/cli.cjs",
      output: "./dist/sea-prep.blob",
    });
    expect(seaConfig.assets).toMatchObject({
      "vendor/llama-swap/linux-x64/llama-swap":
        "./vendor/llama-swap/dist-assets/linux-x64/llama-swap",
      "vendor/llama-swap/darwin-x64/llama-swap":
        "./vendor/llama-swap/dist-assets/darwin-x64/llama-swap",
      "vendor/llama-swap/darwin-arm64/llama-swap":
        "./vendor/llama-swap/dist-assets/darwin-arm64/llama-swap",
      "vendor/llama-swap/win32-x64/llama-swap.exe":
        "./vendor/llama-swap/dist-assets/win32-x64/llama-swap.exe",
    });
  });

  test("ships install and compose artifacts for packaged runtime distribution", async () => {
    const installScriptPath = path.join(repoRoot, "scripts", "install.sh");
    const composePath = path.join(repoRoot, "docker-compose.yml");

    await expect(access(installScriptPath)).resolves.toBeUndefined();
    await expect(access(composePath)).resolves.toBeUndefined();
  });

  test("wires device-authorization readback into the packaged runtime cli server", async () => {
    const cliPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "cli.ts",
    );
    const cliText = await readFile(cliPath, "utf8");

    expect(cliText).toContain(
      "listProviderDeviceAuthorizations: backend.listProviderDeviceAuthorizations",
    );
    expect(cliText).toContain("listModels: backend.listModels");
    expect(cliText).toContain("readVersionInfo: backend.readVersionInfo");
  });

  test("packaged runtime validation exercises account activation and routed request flows", async () => {
    const validatePackagingPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "validate-packaging.ts",
    );
    const validatePackagingText = await readFile(validatePackagingPath, "utf8");

    expect(validatePackagingText).toContain("/api/role-model/accounts");
    expect(validatePackagingText).toContain("/api/role-model/endpoints");
    expect(validatePackagingText).toContain("/v1/chat/completions");
    expect(validatePackagingText).toContain("/v1/responses");
  });

  test("packaged runtime validation rebuilds the bridge before creating the SEA executable", async () => {
    const manifest = await readManifest("role-model-router/apps/runtime-host-bridge/package.json");

    expect(manifest.scripts?.["validate-packaging"]).toContain("pnpm build &&");
  });
});
