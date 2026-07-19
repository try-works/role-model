import { access, mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";
import * as packageSea from "../src/package-sea.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const originalGoBinary = process.env.GO_BINARY;

afterEach(() => {
  if (originalGoBinary === undefined) {
    delete process.env.GO_BINARY;
  } else {
    process.env.GO_BINARY = originalGoBinary;
  }
});

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
  test("does not treat imported package-sea modules as direct CLI execution", () => {
    expect(
      (
        packageSea as {
          isDirectSeaInvocation: (moduleUrl: string, argvEntry?: string) => boolean;
        }
      ).isDirectSeaInvocation("file:///repo/src/package-sea.ts", "C:\\tools\\vitest\\entry.mjs"),
    ).toBe(false);

    const isWindows = process.platform === "win32";
    const platformModuleUrl = isWindows
      ? "file:///D:/repo/src/package-sea.ts"
      : `file://${process.cwd()}/src/package-sea.ts`;
    const platformArgvEntry = isWindows
      ? "D:\\repo\\src\\package-sea.ts"
      : `${process.cwd()}/src/package-sea.ts`;

    expect(
      (
        packageSea as {
          isDirectSeaInvocation: (moduleUrl: string, argvEntry?: string) => boolean;
        }
      ).isDirectSeaInvocation(platformModuleUrl, platformArgvEntry),
    ).toBe(true);
  });

  test("resolves Go through PATH unless GO_BINARY overrides it", () => {
    delete process.env.GO_BINARY;

    expect(
      (
        packageSea as {
          resolveGoCommand: () => string;
        }
      ).resolveGoCommand(),
    ).toBe("go");

    process.env.GO_BINARY = "C:\\tools\\go\\bin\\go.exe";

    expect(
      (
        packageSea as {
          resolveGoCommand: () => string;
        }
      ).resolveGoCommand(),
    ).toBe("C:\\tools\\go\\bin\\go.exe");
  });

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

  test("declares target-scoped SEA config and standalone release inputs for Windows packaging", async () => {
    const rootManifest = await readManifest("package.json");
    expect(rootManifest.scripts).toMatchObject({
      "runtime:package-sea": expect.any(String),
    });

    expect(typeof (packageSea as { resolveBuildTarget?: unknown }).resolveBuildTarget).toBe(
      "function",
    );
    expect(
      typeof (packageSea as { createSeaConfigForTarget?: unknown }).createSeaConfigForTarget,
    ).toBe("function");
    expect(
      typeof (packageSea as { listStandaloneReleaseCopies?: unknown }).listStandaloneReleaseCopies,
    ).toBe("function");

    const target = (
      packageSea as {
        resolveBuildTarget: (
          platform: NodeJS.Platform,
          arch: string,
        ) => {
          platform: NodeJS.Platform;
          arch: string;
          executableName: string;
        } | null;
      }
    ).resolveBuildTarget("win32", "x64");

    expect(target).toMatchObject({
      platform: "win32",
      arch: "x64",
      executableName: "llama-swap.exe",
    });
    if (!target) {
      throw new Error("Expected win32 x64 build target to be available.");
    }

    const seaConfig = (
      packageSea as {
        createSeaConfigForTarget: (target: {
          platform: NodeJS.Platform;
          arch: string;
          executableName: string;
        }) => {
          main: string;
          output: string;
          disableExperimentalSEAWarning: boolean;
          useCodeCache: boolean;
          useSnapshot: boolean;
          assets: Record<string, string>;
        };
      }
    ).createSeaConfigForTarget(target);

    expect(seaConfig).toEqual({
      main: "./dist/sea/cli.cjs",
      output: "./dist/sea-prep.blob",
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
      useSnapshot: false,
      assets: {
        "vendor/llama-swap/win32-x64/llama-swap.exe.gz":
          "./vendor/llama-swap/dist-assets/win32-x64/llama-swap.exe.gz",
      },
    });

    const copies = (
      packageSea as {
        listStandaloneReleaseCopies: () => Array<{
          sourceRelativePath: string;
          destinationRelativePath: string;
        }>;
      }
    ).listStandaloneReleaseCopies();

    expect(copies).toEqual(
      expect.arrayContaining([
        {
          sourceRelativePath: "role-model-router/apps/runtime-ui/build/client",
          destinationRelativePath: "build/client",
        },
        {
          sourceRelativePath: "testdata/catalog/litellm-model-prices.json",
          destinationRelativePath:
            "role-model-router/packages/vendor-litellm/data/model-prices.json",
        },
        {
          sourceRelativePath: "role-model-router/packages/catalog/data/normalized-catalog.json",
          destinationRelativePath:
            "role-model-router/packages/catalog/data/normalized-catalog.json",
        },
      ]),
    );
    expect(copies).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destinationRelativePath: expect.stringContaining("testdata/"),
        }),
        {
          sourceRelativePath: "testdata/router-runtime",
          destinationRelativePath: "testdata/router-runtime",
        },
      ]),
    );
  });

  test("generates a direct Windows batch launcher without the PowerShell wrapper sidecar", () => {
    expect(typeof packageSea.createWindowsLauncherBatchFile).toBe("function");

    const batchFile = packageSea.createWindowsLauncherBatchFile();

    expect(batchFile).toContain('"%SCRIPT_DIR%role-model-launcher.exe"');
    expect(batchFile).not.toContain("role-model-launcher.ps1");
    expect(batchFile).not.toContain("powershell");
  });

  test("builds the Windows launcher package so build-tag helper files are included", () => {
    expect(typeof packageSea.createWindowsLauncherBuildArgs).toBe("function");

    const args = packageSea.createWindowsLauncherBuildArgs("D:\\release");
    const buildTarget = args.at(-1);

    expect(args).toContain("build");
    expect(args).toContain("-o");
    expect(buildTarget).toBe("./role-model-router/apps/launcher");
    expect(buildTarget).not.toMatch(/main\.go$/);
  });

  test("ships install and compose artifacts for packaged runtime distribution", async () => {
    const installScriptPath = path.join(repoRoot, "scripts", "install.sh");
    const installPowerShellPath = path.join(repoRoot, "scripts", "install.ps1");
    const composePath = path.join(repoRoot, "docker-compose.yml");

    await expect(access(installScriptPath)).resolves.toBeUndefined();
    await expect(access(installPowerShellPath)).resolves.toBeUndefined();
    await expect(access(composePath)).resolves.toBeUndefined();

    const installScript = await readFile(installScriptPath, "utf8");
    const installPowerShell = await readFile(installPowerShellPath, "utf8");

    expect(installScript).toContain("role-model-${TARGET}.tar.gz");
    expect(installScript).toContain("role-model");
    expect(installScript).toContain(".local/bin");
    expect(installPowerShell).toContain("role-model-$target.zip");
    expect(installPowerShell).toContain("role-model.cmd");
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

    expect(cliText).toContain('"listProviderDeviceAuthorizations"');
    expect(cliText).toContain('"listModels"');
    expect(cliText).toContain('"listRecentRequestIds"');
    expect(cliText).toContain('"readVersionInfo"');
  });

  test("wires latest-request-id startup parity into every non-QA runtime launch path", async () => {
    const cliPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "cli.ts",
    );
    const startScriptPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "scripts",
      "start.ts",
    );
    const prodLauncherPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "scripts",
      "prod-launcher.ts",
    );

    const [cliText, startText, prodLauncherText] = await Promise.all([
      readFile(cliPath, "utf8"),
      readFile(startScriptPath, "utf8"),
      readFile(prodLauncherPath, "utf8"),
    ]);

    expect(cliText).toContain('"listRecentRequestIds"');
    expect(startText).toContain("listRecentRequestIds");
    expect(prodLauncherText).toContain("listRecentRequestIds");
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
    expect(validatePackagingText).toContain("/api/role-model/role-policy");
    expect(validatePackagingText).toContain("/api/role-model/runtime/summary");
    expect(validatePackagingText).toContain("/api/role-model/requests/latest-ids?limit=10");
    expect(validatePackagingText).toContain("/v1/chat/completions");
    expect(validatePackagingText).toContain("/v1/responses");
    expect(validatePackagingText).toContain("--fixture-root");
    expect(validatePackagingText).toContain(
      'path.join(repoRoot, "testdata", "router-runtime", "fixtures")',
    );
  });

  test("packaged runtime validation exercises taxonomy manifest and compact task parity", async () => {
    const validatePackagingPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "validate-packaging.ts",
    );
    const validatePackagingText = await readFile(validatePackagingPath, "utf8");

    expect(validatePackagingText).toContain("/api/role-model/taxonomy/manifest");
    expect(validatePackagingText).toContain("/api/role-model/taxonomy/version");
    expect(validatePackagingText).toContain("/api/role-model/taxonomy/summary");
    expect(validatePackagingText).toContain(
      "/api/role-model/taxonomy/roles/security/tasks.compact",
    );
    expect(validatePackagingText).toContain("taxonomyVersion");
    expect(validatePackagingText).toContain("contentRevision");
    expect(validatePackagingText).toContain("entryCounts");
    expect(validatePackagingText).toContain("security.audit");
  });

  test("packaged runtime validation tears down the packaged process tree before cleaning release artifacts", async () => {
    const validatePackagingPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "validate-packaging.ts",
    );
    const validatePackagingText = await readFile(validatePackagingPath, "utf8");

    expect(validatePackagingText).toContain("async function stopProcessTree");
    expect(validatePackagingText).toContain(
      'spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]',
    );
    expect(validatePackagingText).toContain("await stopProcessTree(child);");
  });

  test("packaged runtime validation rebuilds the bridge before creating the SEA executable", async () => {
    const manifest = await readManifest("role-model-router/apps/runtime-host-bridge/package.json");

    expect(manifest.scripts?.["validate-packaging"]).toContain("pnpm build &&");
  });

  test("packaged runtime recreates the release directory to avoid stale fixture artifacts", async () => {
    const packageSeaPath = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "package-sea.ts",
    );
    const packageSeaText = await readFile(packageSeaPath, "utf8");

    expect(packageSeaText).toContain("await rm(releaseDir, { recursive: true, force: true });");
  });

  test("release timestamp stamping refreshes nested copied assets with stale upstream mtimes", async () => {
    expect(typeof packageSea.stampReleaseTreeModificationTimes).toBe("function");

    const releaseDir = await mkdtemp(path.join(os.tmpdir(), "role-model-stale-release-"));
    try {
      const nestedDir = path.join(releaseDir, "build", "client", "assets", "fonts");
      const fontAsset = path.join(nestedDir, "inter-latin-400-normal.woff2");
      await mkdir(nestedDir, { recursive: true });
      await writeFile(fontAsset, "font-bytes", "utf8");
      await utimes(
        fontAsset,
        new Date("1985-10-26T08:15:00.000Z"),
        new Date("1985-10-26T08:15:00.000Z"),
      );

      const packageBuildDate = new Date("2026-07-11T05:45:00.000Z");
      await packageSea.stampReleaseTreeModificationTimes(releaseDir, packageBuildDate);

      expect((await stat(fontAsset)).mtime.toISOString()).toBe(packageBuildDate.toISOString());
      expect((await stat(nestedDir)).mtime.toISOString()).toBe(packageBuildDate.toISOString());
    } finally {
      await rm(releaseDir, { recursive: true, force: true });
    }
  });

  test("production release guard accepts clean runtime artifacts", async () => {
    const releaseDir = await mkdtemp(path.join(os.tmpdir(), "role-model-clean-release-"));
    try {
      await mkdir(path.join(releaseDir, "build", "client"), { recursive: true });
      await writeFile(
        path.join(releaseDir, "build", "client", "index.html"),
        "<!doctype html><title>role-model</title>",
        "utf8",
      );
      await writeFile(
        path.join(releaseDir, "manifest.json"),
        JSON.stringify({ executable: "role-model-runtime.exe" }),
        "utf8",
      );

      await expect(
        packageSea.assertProductionReleaseHasNoQaArtifacts(releaseDir),
      ).resolves.toBeUndefined();
    } finally {
      await rm(releaseDir, { recursive: true, force: true });
    }
  });

  test("production release guard rejects router fixtures and mock markers", async () => {
    const releaseDir = await mkdtemp(path.join(os.tmpdir(), "role-model-dirty-release-"));
    try {
      const fixtureDir = path.join(releaseDir, "testdata", "router-runtime", "fixtures");
      await mkdir(fixtureDir, { recursive: true });
      await writeFile(
        path.join(fixtureDir, "provider-accounts.json"),
        JSON.stringify({ accounts: [{ providerAccountId: "phase5.mock.openai" }] }),
        "utf8",
      );

      await expect(packageSea.assertProductionReleaseHasNoQaArtifacts(releaseDir)).rejects.toThrow(
        /QA fixture artifacts|QA\/mock data markers/,
      );
    } finally {
      await rm(releaseDir, { recursive: true, force: true });
    }
  });

  test("packaging rules still forbid testdata/router-runtime path fragment including mcp-connectors.json", async () => {
    const releaseDir = await mkdtemp(path.join(os.tmpdir(), "role-model-mcp-connector-release-"));
    try {
      const targetDir = path.join(releaseDir, "testdata", "router-runtime");
      await mkdir(targetDir, { recursive: true });
      await writeFile(
        path.join(targetDir, "mcp-connectors.json"),
        JSON.stringify([{ connectorId: "lookupRegistry" }]),
        "utf8",
      );

      await expect(packageSea.assertProductionReleaseHasNoQaArtifacts(releaseDir)).rejects.toThrow(
        /QA fixture artifacts|QA\/mock data markers/,
      );
    } finally {
      await rm(releaseDir, { recursive: true, force: true });
    }
  });

  test("production release guard rejects persisted LiteLLM fixture endpoint markers", async () => {
    const releaseDir = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-fixture-release-"));
    try {
      await mkdir(path.join(releaseDir, "state"), { recursive: true });
      await writeFile(
        path.join(releaseDir, "state", "runtime-endpoints.json"),
        JSON.stringify({
          endpoints: [
            {
              endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
              modelId: "openai/gpt-4.1-mini-fast",
            },
          ],
        }),
        "utf8",
      );

      await expect(packageSea.assertProductionReleaseHasNoQaArtifacts(releaseDir)).rejects.toThrow(
        /QA\/mock data markers/,
      );
    } finally {
      await rm(releaseDir, { recursive: true, force: true });
    }
  });
});
