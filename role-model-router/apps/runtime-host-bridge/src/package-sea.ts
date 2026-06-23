import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { build as buildBundle } from "esbuild";

export interface BuildTarget {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly goos: string;
  readonly goarch: string;
  readonly executableName: string;
}

export interface SeaConfigForTarget {
  readonly main: string;
  readonly output: string;
  readonly disableExperimentalSEAWarning: boolean;
  readonly useCodeCache: boolean;
  readonly useSnapshot: boolean;
  readonly assets: Readonly<Record<string, string>>;
}

export interface StandaloneReleaseCopy {
  readonly sourceRelativePath: string;
  readonly destinationRelativePath: string;
}

const NODE_SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const routerRoot = path.join(repoRoot, "role-model-router");
const vendorRoot = path.join(routerRoot, "vendor", "llama-swap");
const distRoot = path.join(routerRoot, "dist");
const goCacheRoot = path.join(repoRoot, ".cache", "go");
const goModuleCache = path.join(goCacheRoot, "pkg", "mod");

const buildTargets: readonly BuildTarget[] = [
  {
    platform: "linux",
    arch: "x64",
    goos: "linux",
    goarch: "amd64",
    executableName: "llama-swap",
  },
  {
    platform: "darwin",
    arch: "x64",
    goos: "darwin",
    goarch: "amd64",
    executableName: "llama-swap",
  },
  {
    platform: "darwin",
    arch: "arm64",
    goos: "darwin",
    goarch: "arm64",
    executableName: "llama-swap",
  },
  {
    platform: "win32",
    arch: "x64",
    goos: "windows",
    goarch: "amd64",
    executableName: "llama-swap.exe",
  },
];

const standaloneReleaseCopies = [
  {
    sourceRelativePath: "role-model-router/apps/runtime-ui/build/client",
    destinationRelativePath: "build/client",
  },
  {
    sourceRelativePath: "testdata/catalog/litellm-model-prices.json",
    destinationRelativePath: "role-model-router/packages/vendor-litellm/data/model-prices.json",
  },
  {
    sourceRelativePath: "role-model-router/packages/catalog/data/normalized-catalog.json",
    destinationRelativePath: "role-model-router/packages/catalog/data/normalized-catalog.json",
  },
] as const satisfies readonly StandaloneReleaseCopy[];

const forbiddenProductionReleasePathFragments = [
  "testdata/",
  "testdata/router-runtime",
  ".recursive",
  "fixtures/provider-accounts.json",
  "fixtures/observability-history.json",
  "fixtures/registry-sources.json",
] as const;

const forbiddenProductionReleaseTextMarkers = [
  "phase5.mock",
  "mock.openai",
  "openai.litellm",
  "http://127.0.0.1:45679",
  "anthropic.team.shared",
  "cli.local.coder",
] as const;

const productionReleaseTextExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".txt",
  ".yaml",
  ".yml",
]);

export function resolveBuildTarget(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): BuildTarget | null {
  return (
    buildTargets.find((target) => target.platform === platform && target.arch === arch) ?? null
  );
}

export function createSeaConfigForTarget(target: BuildTarget): SeaConfigForTarget {
  const targetId = `${target.platform}-${target.arch}`;
  return {
    main: "./dist/sea/cli.cjs",
    output: "./dist/sea-prep.blob",
    disableExperimentalSEAWarning: true,
    useCodeCache: false,
    useSnapshot: false,
    assets: {
      [`vendor/llama-swap/${targetId}/${target.executableName}.gz`]: `./vendor/llama-swap/dist-assets/${targetId}/${target.executableName}.gz`,
    },
  };
}

export function listStandaloneReleaseCopies(): readonly StandaloneReleaseCopy[] {
  return standaloneReleaseCopies;
}

function normalizeReleasePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

async function listReleaseFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listReleaseFiles(entryPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

export async function assertProductionReleaseHasNoQaArtifacts(releaseDir: string): Promise<void> {
  const files = await listReleaseFiles(releaseDir);
  const pathViolations = files
    .map((filePath) => normalizeReleasePath(path.relative(releaseDir, filePath)))
    .filter((relativePath) =>
      forbiddenProductionReleasePathFragments.some((fragment) => relativePath.includes(fragment)),
    );
  if (pathViolations.length > 0) {
    throw new Error(
      [
        "Production release contains QA fixture artifacts.",
        ...pathViolations.map((relativePath) => `- ${relativePath}`),
      ].join("\n"),
    );
  }

  const textViolations: string[] = [];
  for (const filePath of files) {
    if (!productionReleaseTextExtensions.has(path.extname(filePath))) {
      continue;
    }
    const text = await readFile(filePath, "utf8");
    for (const marker of forbiddenProductionReleaseTextMarkers) {
      if (text.includes(marker)) {
        textViolations.push(
          `${normalizeReleasePath(path.relative(releaseDir, filePath))}: ${marker}`,
        );
      }
    }
  }
  if (textViolations.length > 0) {
    throw new Error(
      [
        "Production release contains QA/mock data markers.",
        ...textViolations.map((violation) => `- ${violation}`),
      ].join("\n"),
    );
  }
}

export function isDirectSeaInvocation(
  moduleUrl: string,
  argvEntry: string | undefined = process.argv[1],
): boolean {
  if (!argvEntry || argvEntry.trim().length === 0) {
    return false;
  }
  return moduleUrl === pathToFileURL(path.resolve(argvEntry)).href;
}

function runOrThrow(
  command: string,
  args: readonly string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): void {
  const renderedCommand = `${command} ${args.join(" ")}`.trim();
  const result = spawnSync(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const failureDetails = [
      `Command failed with exit code ${result.status}: ${renderedCommand}`,
      `cwd: ${cwd}`,
      result.stdout?.trim() ? `stdout:\n${result.stdout.trimEnd()}` : null,
      result.stderr?.trim() ? `stderr:\n${result.stderr.trimEnd()}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join("\n\n");
    throw new Error(failureDetails);
  }
}

function resolvePostjectCommand(): string {
  return process.platform === "win32"
    ? path.join(repoRoot, "node_modules", ".bin", "postject.cmd")
    : path.join(repoRoot, "node_modules", ".bin", "postject");
}

export function resolveGoCommand(): string {
  return process.env.GO_BINARY ?? "go";
}

function resolvePackagedRuntimeName(): string {
  return process.platform === "win32" ? "role-model-runtime.exe" : "role-model-runtime";
}

function resolvePowerShellCommand(): string {
  return process.env.PWSH_BINARY ?? "pwsh";
}

function quotePowerShellLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function ensureGoCache(): Promise<void> {
  await mkdir(goCacheRoot, { recursive: true });
  await mkdir(goModuleCache, { recursive: true });
}

async function gzipAsset(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  const gzPath = `${filePath}.gz`;
  await writeFile(gzPath, gzipSync(content, { level: 9 }));
  return gzPath;
}

async function buildLlamaSwapAsset(target: BuildTarget): Promise<void> {
  const goCommand = resolveGoCommand();
  const outputPath = path.join(
    vendorRoot,
    "dist-assets",
    `${target.platform}-${target.arch}`,
    target.executableName,
  );
  await ensureGoCache();
  await mkdir(path.dirname(outputPath), { recursive: true });
  runOrThrow(goCommand, ["build", "-o", outputPath, "."], vendorRoot, {
    GO111MODULE: "on",
    GOWORK: "off",
    GOPATH: goCacheRoot,
    GOMODCACHE: goModuleCache,
    CGO_ENABLED: "0",
    GOOS: target.goos,
    GOARCH: target.goarch,
  });
  if (target.platform !== "win32") {
    await chmod(outputPath, 0o755);
  }
  await gzipAsset(outputPath);
}

async function writeSeaConfig(target: BuildTarget): Promise<string> {
  const configPath = path.join(routerRoot, "sea-config.generated.json");
  await writeFile(configPath, JSON.stringify(createSeaConfigForTarget(target), null, 2), "utf8");
  return configPath;
}

async function stageStandaloneReleaseFiles(releaseDir: string): Promise<void> {
  for (const copySpec of listStandaloneReleaseCopies()) {
    const sourcePath = path.join(repoRoot, copySpec.sourceRelativePath);
    const destinationPath = path.join(releaseDir, copySpec.destinationRelativePath);
    await rm(destinationPath, { recursive: true, force: true });
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, { recursive: true, force: true });
  }
}

async function buildWindowsLauncher(releaseDir: string): Promise<void> {
  if (process.platform !== "win32") {
    return;
  }
  const launcherMainPath = path.join(routerRoot, "apps", "launcher", "main.go");
  runOrThrow(
    resolveGoCommand(),
    ["build", "-o", path.join(releaseDir, "role-model-launcher.exe"), launcherMainPath],
    repoRoot,
    {
      GO111MODULE: "off",
      GOWORK: "off",
    },
  );
}

function createWindowsLauncherBatchFile(): string {
  return [
    "@echo off",
    "set SCRIPT_DIR=%~dp0",
    'if exist "%SCRIPT_DIR%role-model-launcher.exe" (',
    '  "%SCRIPT_DIR%role-model-launcher.exe"',
    ") else (",
    "  echo ERROR: role-model-launcher.exe not found.",
    "  pause",
    "  exit /b 1",
    ")",
  ].join("\r\n");
}

async function writeSha256(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  const sha = createHash("sha256").update(content).digest("hex");
  await writeFile(`${filePath}.sha256`, `${sha}  ${path.basename(filePath)}${os.EOL}`, "utf8");
  return sha;
}

async function bundleSeaEntrypoint(): Promise<void> {
  const seaEntryPath = path.join(distRoot, "sea", "cli.cjs");
  await mkdir(path.dirname(seaEntryPath), { recursive: true });
  await buildBundle({
    entryPoints: [path.join(routerRoot, "apps", "runtime-host-bridge", "dist", "cli-entry.js")],
    outfile: seaEntryPath,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    conditions: ["runtime"],
    sourcemap: false,
  });
}

async function patchSeaSentinel(outputPath: string): Promise<void> {
  const sentinel = Buffer.from(`${NODE_SEA_FUSE}:0`, "utf8");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const buffer = await readFile(outputPath);
      const firstIndex = buffer.indexOf(sentinel);
      if (firstIndex < 0) {
        throw new Error(`Could not find sentinel ${NODE_SEA_FUSE} in ${outputPath}.`);
      }
      const lastIndex = buffer.lastIndexOf(sentinel);
      if (firstIndex !== lastIndex) {
        throw new Error(`Found multiple ${NODE_SEA_FUSE} sentinels in ${outputPath}.`);
      }
      buffer[firstIndex + sentinel.length - 1] = "1".charCodeAt(0);
      await writeFile(outputPath, buffer);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EBUSY" || attempt === 9) {
        throw error;
      }
      await delay(250);
    }
  }
}

function injectSeaBlobWithWindowsResourceUpdate(outputPath: string, blobPath: string): void {
  const script = [
    'Add-Type -TypeDefinition @"',
    "using System;",
    "using System.Runtime.InteropServices;",
    "public static class RoleModelSeaResourceWriter {",
    '  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]',
    "  public static extern IntPtr BeginUpdateResource(string pFileName, bool bDeleteExistingResources);",
    '  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]',
    "  public static extern bool UpdateResource(IntPtr hUpdate, IntPtr lpType, string lpName, ushort wLanguage, byte[] lpData, uint cbData);",
    '  [DllImport("kernel32.dll", SetLastError = true)]',
    "  public static extern bool EndUpdateResource(IntPtr hUpdate, bool fDiscard);",
    "}",
    '"@',
    `$target = ${quotePowerShellLiteral(outputPath)}`,
    `$blob = ${quotePowerShellLiteral(blobPath)}`,
    "$data = [System.IO.File]::ReadAllBytes($blob)",
    "$handle = [RoleModelSeaResourceWriter]::BeginUpdateResource($target, $false)",
    'if ($handle -eq [IntPtr]::Zero) { throw "BeginUpdateResource failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }',
    "$committed = $false",
    "try {",
    "  if (-not [RoleModelSeaResourceWriter]::UpdateResource($handle, [IntPtr]10, 'NODE_SEA_BLOB', 0, $data, [uint32]$data.Length)) {",
    '    throw "UpdateResource failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"',
    "  }",
    "  if (-not [RoleModelSeaResourceWriter]::EndUpdateResource($handle, $false)) {",
    '    throw "EndUpdateResource failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"',
    "  }",
    "  $committed = $true",
    "} finally {",
    "  if (-not $committed -and $handle -ne [IntPtr]::Zero) {",
    "    [RoleModelSeaResourceWriter]::EndUpdateResource($handle, $true) | Out-Null",
    "  }",
    "}",
  ].join("\n");
  runOrThrow(resolvePowerShellCommand(), ["-NoLogo", "-NoProfile", "-Command", script], repoRoot);
}

async function injectSeaBlob(outputPath: string, blobPath: string): Promise<void> {
  if (process.platform === "win32") {
    injectSeaBlobWithWindowsResourceUpdate(outputPath, blobPath);
    await patchSeaSentinel(outputPath);
    return;
  }

  const postjectArgs = [outputPath, "NODE_SEA_BLOB", blobPath, "--sentinel-fuse", NODE_SEA_FUSE];
  if (process.platform === "darwin") {
    postjectArgs.push("--macho-segment-name", "NODE_SEA");
  }
  runOrThrow(resolvePostjectCommand(), postjectArgs, repoRoot, {
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=8192",
  });
}

export async function packageSeaRuntime(): Promise<{
  readonly outputPath: string;
  readonly target: string;
  readonly sha256: string;
}> {
  const buildTarget = resolveBuildTarget();
  if (!buildTarget) {
    throw new Error(`Unsupported runtime packaging target: ${process.platform}-${process.arch}`);
  }
  const releaseTarget = `${buildTarget.platform}-${buildTarget.arch}`;
  runOrThrow(
    process.execPath,
    [
      path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"),
      "-p",
      path.join(routerRoot, "apps", "runtime-host-bridge", "tsconfig.json"),
    ],
    repoRoot,
  );
  await buildLlamaSwapAsset(buildTarget);
  await mkdir(distRoot, { recursive: true });
  await bundleSeaEntrypoint();
  const seaConfigPath = await writeSeaConfig(buildTarget);
  try {
    runOrThrow(process.execPath, ["--experimental-sea-config", seaConfigPath], routerRoot);
  } finally {
    await rm(seaConfigPath, { force: true });
  }

  const releaseDir = path.join(distRoot, "release", releaseTarget);
  const outputPath = path.join(releaseDir, resolvePackagedRuntimeName());
  const blobPath = path.join(distRoot, "sea-prep.blob");
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
  await copyFile(process.execPath, outputPath);
  if (process.platform !== "win32") {
    await chmod(outputPath, 0o755);
  }
  await injectSeaBlob(outputPath, blobPath);

  await stageStandaloneReleaseFiles(releaseDir);
  await buildWindowsLauncher(releaseDir);
  if (process.platform === "win32") {
    await writeFile(
      path.join(releaseDir, "Role-Model.bat"),
      createWindowsLauncherBatchFile(),
      "ascii",
    );
  }

  const sha256 = await writeSha256(outputPath);
  await writeFile(
    path.join(releaseDir, "manifest.json"),
    JSON.stringify(
      {
        executable: path.basename(outputPath),
        platform: process.platform,
        arch: process.arch,
        target: releaseTarget,
        sha256,
      },
      null,
      2,
    ),
    "utf8",
  );
  await assertProductionReleaseHasNoQaArtifacts(releaseDir);

  return {
    outputPath,
    target: releaseTarget,
    sha256,
  };
}

if (isDirectSeaInvocation(import.meta.url)) {
  const result = await packageSeaRuntime();
  console.log(JSON.stringify(result, null, 2));
}
