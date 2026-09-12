import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { build as buildBundle } from "esbuild";

import { resolveBuildRuntimeChannel, resolveRuntimeChannelProfile } from "./runtime-channel.js";
import { resolveRuntimeVersionInfo } from "./runtime-version.js";
import { stageTrackBRuntimeDistribution } from "./track-b-runtime.js";

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

export function validatePairedReleasePackagingInputs<
  T extends Readonly<{ manifestSha256: string }>,
>({
  channel,
  releaseId,
  trackBRuntime,
}: Readonly<{
  channel: "production" | "stage" | "development";
  releaseId: string | undefined;
  trackBRuntime: T | null;
}>): Readonly<{ releaseId: string | undefined; trackBRuntime: T | null }> {
  if (!trackBRuntime || !/^[0-9a-f]{64}$/.test(trackBRuntime.manifestSha256)) {
    throw new Error(`${channel} packaging requires the exact private distribution`);
  }
  if (channel === "stage" || channel === "production") {
    if (!/^sha256:[0-9a-f]{64}$/.test(releaseId ?? "")) {
      throw new Error(`${channel} packaging requires an exact Run 88 release identity`);
    }
  }
  return Object.freeze({ releaseId, trackBRuntime });
}

export function resolvePackagedRuntimeSourceTree({
  statusPorcelain,
  sourceTree,
}: Readonly<{
  statusPorcelain: string;
  sourceTree: string;
}>): string {
  if (statusPorcelain.trim().length > 0) {
    throw new Error(
      "Packaged runtime requires a clean public worktree; commit or discard source changes before packaging",
    );
  }
  if (!/^[0-9a-f]{40}$/.test(sourceTree)) {
    throw new Error("Unable to resolve source_tree for packaged runtime");
  }
  return sourceTree;
}

export function resolveReleaseOutputDirectory({
  distRoot,
  releaseTarget,
  env,
}: Readonly<{
  distRoot: string;
  releaseTarget: string;
  env: NodeJS.ProcessEnv;
}>): string {
  if (!/^[a-z0-9]+-[a-z0-9]+$/i.test(releaseTarget)) {
    throw new Error("Packaged runtime release target is invalid");
  }
  const explicitRoot = env.ROLE_MODEL_RELEASE_OUTPUT_ROOT?.trim();
  if (explicitRoot && !path.isAbsolute(explicitRoot)) {
    throw new Error("ROLE_MODEL_RELEASE_OUTPUT_ROOT must be absolute");
  }
  return path.join(
    explicitRoot ? path.resolve(explicitRoot) : path.join(distRoot, "release"),
    releaseTarget,
  );
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
  {
    sourceRelativePath: "packages/protocol-types/generated/product-contracts.json",
    destinationRelativePath: "packages/protocol-types/generated/product-contracts.json",
  },
  {
    sourceRelativePath: "role-model-router/packages/core/data/taxonomy",
    destinationRelativePath: "role-model-router/packages/core/data/taxonomy",
  },
  {
    sourceRelativePath: "role-model-router/packages/extension-host/index.mjs",
    destinationRelativePath: "role-model-router/packages/extension-host/index.mjs",
  },
  {
    sourceRelativePath: "packages/extension-host/index.mjs",
    destinationRelativePath: "packages/extension-host/index.mjs",
  },
  {
    sourceRelativePath: "packages/extension-host/worker-runtime.mjs",
    destinationRelativePath: "packages/extension-host/worker-runtime.mjs",
  },
  {
    sourceRelativePath: "packages/extension-host/transfer-artifact.mjs",
    destinationRelativePath: "packages/extension-host/transfer-artifact.mjs",
  },
  {
    sourceRelativePath: "packages/extension-host/retained-response-store.mjs",
    destinationRelativePath: "packages/extension-host/retained-response-store.mjs",
  },
  {
    sourceRelativePath: "packages/extension-sdk/index.mjs",
    destinationRelativePath: "packages/extension-sdk/index.mjs",
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
  // Synthetic packaging-validation credential sentinel (R7). Its ref and value
  // must never leak into a production executable/archive/installer payload.
  "SP7_MOONSHOT_API_KEY",
  "packaging-validation-key",
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

export interface PackagedArtifactBinding {
  readonly kind: "file" | "tree";
  readonly path: string;
  readonly sha256: string;
}

export interface PackagedExtensionArtifactBinding extends PackagedArtifactBinding {
  readonly kind: "file";
  readonly id: string;
}

export interface PackagedRuntimeArtifactClosure {
  readonly schema_version: 1;
  readonly runtime_ui: PackagedArtifactBinding;
  readonly track_b_runtime: {
    readonly manifest: PackagedArtifactBinding;
    readonly sidecar: PackagedArtifactBinding;
    readonly public_runtime_adapter: PackagedArtifactBinding;
    readonly public_extension_host: PackagedArtifactBinding;
    readonly worker: PackagedArtifactBinding;
    readonly router_assets: readonly PackagedArtifactBinding[];
    readonly extensions: readonly PackagedExtensionArtifactBinding[];
  };
}

interface TrackBManifestArtifact {
  readonly modulePath: string;
  readonly artifactSha256: string;
}

interface TrackBDistributionManifestForClosure {
  readonly schemaVersion: string;
  readonly sidecar?: TrackBManifestArtifact;
  readonly publicRuntimeAdapter?: TrackBManifestArtifact & {
    readonly routerRoot?: string;
    readonly routerAssets?: readonly TrackBManifestArtifact[];
  };
  readonly publicExtensionHost?: TrackBManifestArtifact & {
    readonly workerModulePath?: string;
    readonly workerArtifactSha256?: string;
  };
  readonly extensions?: readonly {
    readonly descriptor?: { readonly id?: string };
    readonly modulePath: string;
    readonly artifactSha256: string;
  }[];
}

function assertSafeReleaseRelativePath(value: string, label: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").some((segment) => segment === ".." || segment.length === 0)
  ) {
    throw new Error(`Packaged artifact closure ${label} path is unsafe`);
  }
  return normalized;
}

function assertDigest(value: string, label: string): string {
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(`Packaged artifact closure ${label} digest is invalid`);
  }
  return value.toLowerCase();
}

async function hashFile(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function createFileArtifactBinding(
  releaseDir: string,
  relativePath: string,
  label: string,
  expectedSha256?: string,
): Promise<PackagedArtifactBinding> {
  const safePath = assertSafeReleaseRelativePath(relativePath, label);
  const filePath = path.join(releaseDir, ...safePath.split("/"));
  let observedSha256: string;
  try {
    observedSha256 = await hashFile(filePath);
  } catch {
    throw new Error(`Packaged artifact closure ${label} is missing: ${safePath}`);
  }
  if (expectedSha256 !== undefined && observedSha256 !== expectedSha256.toLowerCase()) {
    throw new Error(`Packaged artifact closure ${label} digest mismatch: ${safePath}`);
  }
  return { kind: "file", path: safePath, sha256: observedSha256 };
}

async function createTreeArtifactBinding(
  releaseDir: string,
  relativePath: string,
  label: string,
): Promise<PackagedArtifactBinding> {
  const safePath = assertSafeReleaseRelativePath(relativePath, label);
  const root = path.join(releaseDir, ...safePath.split("/"));
  let files: string[];
  try {
    files = await listReleaseFiles(root);
  } catch {
    throw new Error(`Packaged artifact closure ${label} is missing: ${safePath}`);
  }
  if (files.length === 0) {
    throw new Error(`Packaged artifact closure ${label} is empty: ${safePath}`);
  }
  const entries = await Promise.all(
    files.map(async (filePath) => {
      const fileRelativePath = normalizeReleasePath(path.relative(root, filePath));
      return `${fileRelativePath}\0${await hashFile(filePath)}`;
    }),
  );
  entries.sort();
  const sha256 = createHash("sha256").update(entries.join("\n")).digest("hex");
  return { kind: "tree", path: safePath, sha256 };
}

function requireTrackBManifestArtifact<T extends TrackBManifestArtifact>(
  artifact: T | undefined,
  label: string,
): T {
  if (!artifact || typeof artifact.modulePath !== "string") {
    throw new Error(`Packaged artifact closure ${label} is missing`);
  }
  assertDigest(artifact.artifactSha256, label);
  return artifact;
}

function trackBReleasePath(modulePath: string, label: string): string {
  const safeModulePath = assertSafeReleaseRelativePath(modulePath, label);
  return assertSafeReleaseRelativePath(`track-b-runtime/${safeModulePath}`, label);
}

/**
 * Creates the immutable artifact binding written into a packaged release.
 * Every executable-side Track-B artifact and the copied runtime UI is bound
 * to bytes in the same release directory, so a partial or mixed release
 * cannot pass packaging validation.
 */
export async function createPackagedRuntimeArtifactClosure({
  releaseDir,
  trackBRuntimeManifestPath = path.join(
    releaseDir,
    "track-b-runtime",
    "track-b-runtime-manifest.json",
  ),
}: Readonly<{
  readonly releaseDir: string;
  readonly trackBRuntimeManifestPath?: string;
}>): Promise<PackagedRuntimeArtifactClosure> {
  const runtimeUi = await createTreeArtifactBinding(releaseDir, "build/client", "runtime UI");
  let manifestBytes: Buffer;
  let manifest: TrackBDistributionManifestForClosure;
  try {
    manifestBytes = await readFile(trackBRuntimeManifestPath);
    manifest = JSON.parse(manifestBytes.toString("utf8")) as TrackBDistributionManifestForClosure;
  } catch {
    throw new Error("Packaged artifact closure Track-B manifest is missing or invalid");
  }
  if (manifest.schemaVersion !== "role-model.track-b-runtime-distribution.v2") {
    throw new Error("Packaged artifact closure requires Track-B distribution v2");
  }
  const sidecar = requireTrackBManifestArtifact(manifest.sidecar, "sidecar");
  const adapter = requireTrackBManifestArtifact(
    manifest.publicRuntimeAdapter,
    "public runtime adapter",
  );
  if (!adapter.routerRoot || !adapter.routerAssets?.length) {
    throw new Error("Packaged artifact closure router assets are missing");
  }
  const extensionHost = requireTrackBManifestArtifact(
    manifest.publicExtensionHost,
    "public extension host",
  );
  if (!extensionHost.workerModulePath || !extensionHost.workerArtifactSha256) {
    throw new Error("Packaged artifact closure worker runtime is missing");
  }
  assertDigest(extensionHost.workerArtifactSha256, "worker runtime");
  if (!manifest.extensions || manifest.extensions.length !== 13) {
    throw new Error("Packaged artifact closure requires all 13 extensions");
  }

  const extensionIds = new Set<string>();
  const extensions = await Promise.all(
    manifest.extensions.map(async (extension, index) => {
      const id = extension.descriptor?.id?.trim();
      if (!id || extensionIds.has(id)) {
        throw new Error(`Packaged artifact closure extension ${index + 1} has no unique id`);
      }
      extensionIds.add(id);
      const binding = await createFileArtifactBinding(
        releaseDir,
        trackBReleasePath(extension.modulePath, `extension ${id}`),
        `extension ${id}`,
        assertDigest(extension.artifactSha256, `extension ${id}`),
      );
      return { ...binding, id } as PackagedExtensionArtifactBinding;
    }),
  );
  const routerAssets = await Promise.all(
    adapter.routerAssets.map(async (asset, index) =>
      createFileArtifactBinding(
        releaseDir,
        trackBReleasePath(asset.modulePath, `router asset ${index + 1}`),
        `router asset ${index + 1}`,
        assertDigest(asset.artifactSha256, `router asset ${index + 1}`),
      ),
    ),
  );

  const manifestRelativePath = assertSafeReleaseRelativePath(
    normalizeReleasePath(path.relative(releaseDir, trackBRuntimeManifestPath)),
    "Track-B manifest",
  );
  const manifestBinding = await createFileArtifactBinding(
    releaseDir,
    manifestRelativePath,
    "Track-B manifest",
  );
  return {
    schema_version: 1,
    runtime_ui: runtimeUi,
    track_b_runtime: {
      manifest: manifestBinding,
      sidecar: await createFileArtifactBinding(
        releaseDir,
        trackBReleasePath(sidecar.modulePath, "sidecar"),
        "sidecar",
        assertDigest(sidecar.artifactSha256, "sidecar"),
      ),
      public_runtime_adapter: await createFileArtifactBinding(
        releaseDir,
        trackBReleasePath(adapter.modulePath, "public runtime adapter"),
        "public runtime adapter",
        assertDigest(adapter.artifactSha256, "public runtime adapter"),
      ),
      public_extension_host: await createFileArtifactBinding(
        releaseDir,
        trackBReleasePath(extensionHost.modulePath, "public extension host"),
        "public extension host",
        assertDigest(extensionHost.artifactSha256, "public extension host"),
      ),
      worker: await createFileArtifactBinding(
        releaseDir,
        trackBReleasePath(extensionHost.workerModulePath, "worker runtime"),
        "worker runtime",
        assertDigest(extensionHost.workerArtifactSha256, "worker runtime"),
      ),
      router_assets: routerAssets,
      extensions,
    },
  };
}

async function verifyPackagedArtifactBinding(
  releaseDir: string,
  binding: PackagedArtifactBinding,
  label: string,
): Promise<void> {
  const actual =
    binding.kind === "tree"
      ? await createTreeArtifactBinding(releaseDir, binding.path, label)
      : await createFileArtifactBinding(releaseDir, binding.path, label);
  if (actual.sha256 !== binding.sha256.toLowerCase()) {
    throw new Error(`Packaged artifact closure ${label} digest mismatch: ${binding.path}`);
  }
}

/** Verifies every byte bound by a previously written packaged-release closure. */
export async function verifyPackagedRuntimeArtifactClosure({
  releaseDir,
  closure,
}: Readonly<{
  readonly releaseDir: string;
  readonly closure: PackagedRuntimeArtifactClosure;
}>): Promise<void> {
  if (closure.schema_version !== 1) {
    throw new Error("Packaged artifact closure schema is unsupported");
  }
  await verifyPackagedArtifactBinding(releaseDir, closure.runtime_ui, "runtime UI");
  const trackB = closure.track_b_runtime;
  await Promise.all([
    verifyPackagedArtifactBinding(releaseDir, trackB.manifest, "Track-B manifest"),
    verifyPackagedArtifactBinding(releaseDir, trackB.sidecar, "sidecar"),
    verifyPackagedArtifactBinding(
      releaseDir,
      trackB.public_runtime_adapter,
      "public runtime adapter",
    ),
    verifyPackagedArtifactBinding(
      releaseDir,
      trackB.public_extension_host,
      "public extension host",
    ),
    verifyPackagedArtifactBinding(releaseDir, trackB.worker, "worker runtime"),
    ...trackB.router_assets.map((asset, index) =>
      verifyPackagedArtifactBinding(releaseDir, asset, `router asset ${index + 1}`),
    ),
    ...trackB.extensions.map((extension) =>
      verifyPackagedArtifactBinding(releaseDir, extension, `extension ${extension.id}`),
    ),
  ]);
  if (trackB.extensions.length !== 13) {
    throw new Error("Packaged artifact closure extension set is incomplete");
  }
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

export function createLlamaSwapBuildArgs(outputPath: string): string[] {
  return ["build", "-trimpath", "-buildvcs=false", "-ldflags=-buildid=", "-o", outputPath, "."];
}

function resolvePackagedRuntimeName(name: string): string {
  return process.platform === "win32" ? `${name}.exe` : name;
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
  const tempPath = `${gzPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, gzipSync(content, { level: 9 }));
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rename(tempPath, gzPath);
      return gzPath;
    } catch (error) {
      if (attempt === 9) {
        await rm(tempPath, { force: true }).catch(() => undefined);
        throw error;
      }
      await delay(50 * (attempt + 1));
    }
  }
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
  runOrThrow(goCommand, createLlamaSwapBuildArgs(outputPath), vendorRoot, {
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

export async function stampReleaseTreeModificationTimes(
  releaseDir: string,
  packageBuildDate: Date,
): Promise<void> {
  const entries = await readdir(releaseDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(releaseDir, entry.name);
    if (entry.isDirectory()) {
      await stampReleaseTreeModificationTimes(entryPath, packageBuildDate);
      continue;
    }
    if (entry.isFile()) {
      await utimes(entryPath, packageBuildDate, packageBuildDate);
    }
  }
  await utimes(releaseDir, packageBuildDate, packageBuildDate);
}

async function buildWindowsLauncher(releaseDir: string, launcherName: string): Promise<void> {
  if (process.platform !== "win32") {
    return;
  }
  runOrThrow(
    resolveGoCommand(),
    createWindowsLauncherBuildArgs(releaseDir, launcherName),
    repoRoot,
    {
      GO111MODULE: "off",
      GOWORK: "off",
    },
  );
}

export function createWindowsLauncherBuildArgs(
  releaseDir: string,
  launcherName = "role-model-launcher.exe",
): string[] {
  const launcherPackagePath = `./${path
    .relative(repoRoot, path.join(routerRoot, "apps", "launcher"))
    .split(path.sep)
    .join("/")}`;
  return ["build", "-o", path.join(releaseDir, launcherName), launcherPackagePath];
}

export function createWindowsLauncherBatchFile(launcherName = "role-model-launcher.exe"): string {
  return [
    "@echo off",
    "set SCRIPT_DIR=%~dp0",
    `if exist "%SCRIPT_DIR%${launcherName}" (`,
    `  "%SCRIPT_DIR%${launcherName}"`,
    ") else (",
    `  echo ERROR: ${launcherName} not found.`,
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
  const profile = resolveRuntimeChannelProfile(resolveBuildRuntimeChannel());
  const sourceStatusResult = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  if (sourceStatusResult.status !== 0) {
    throw new Error("Unable to inspect public worktree cleanliness for packaged runtime");
  }
  const sourceTreeResult = spawnSync("git", ["rev-parse", "HEAD^{tree}"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const sourceTree = resolvePackagedRuntimeSourceTree({
    statusPorcelain: sourceStatusResult.stdout,
    sourceTree: sourceTreeResult.status === 0 ? sourceTreeResult.stdout.trim() : "",
  });
  const packageBuildDate = new Date();
  const packageBuildDateIso = packageBuildDate.toISOString();
  const versionInfo = await resolveRuntimeVersionInfo({
    repoRoot,
    env: {
      ...process.env,
      BUILD_DATE:
        process.env.BUILD_DATE && process.env.BUILD_DATE.trim().length > 0
          ? process.env.BUILD_DATE
          : packageBuildDateIso,
    },
  });
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

  const releaseDir = resolveReleaseOutputDirectory({ distRoot, releaseTarget, env: process.env });
  const outputPath = path.join(releaseDir, resolvePackagedRuntimeName(profile.name));
  const blobPath = path.join(distRoot, "sea-prep.blob");
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
  await copyFile(process.execPath, outputPath);
  if (process.platform !== "win32") {
    await chmod(outputPath, 0o755);
  }
  await injectSeaBlob(outputPath, blobPath);

  await stageStandaloneReleaseFiles(releaseDir);
  const trackBDistributionRoot = process.env.ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT?.trim();
  const trackBRuntime = trackBDistributionRoot
    ? await stageTrackBRuntimeDistribution({
        sourceRoot: path.resolve(trackBDistributionRoot),
        releaseDir: path.join(releaseDir, "track-b-runtime"),
        expectedPublicSourceTree: sourceTree,
      })
    : null;
  const launcherName = `${profile.name}-launcher.exe`;
  await buildWindowsLauncher(releaseDir, launcherName);
  if (process.platform === "win32") {
    await writeFile(
      path.join(releaseDir, `${profile.name}.bat`),
      createWindowsLauncherBatchFile(launcherName),
      "ascii",
    );
  }

  const sha256 = await writeSha256(outputPath);
  const run88ReleaseId = process.env.RUN88_RELEASE_ID?.trim();
  validatePairedReleasePackagingInputs({
    channel: profile.channel,
    releaseId: run88ReleaseId,
    trackBRuntime,
  });
  const artifactClosure = await createPackagedRuntimeArtifactClosure({ releaseDir });
  await verifyPackagedRuntimeArtifactClosure({ releaseDir, closure: artifactClosure });
  await writeFile(
    path.join(releaseDir, "manifest.json"),
    JSON.stringify(
      {
        executable: path.basename(outputPath),
        platform: process.platform,
        arch: process.arch,
        target: releaseTarget,
        sha256,
        executable_sha256: sha256,
        core_payload_sha256: sha256,
        source_tree: sourceTree,
        version: versionInfo.version,
        commit: versionInfo.commit,
        build_date: versionInfo.build_date,
        ...profile,
        endpoint: `http://${profile.host}:${profile.port}`,
        ...(profile.channel === "stage" || profile.channel === "production"
          ? {
              release_id: run88ReleaseId,
              private_distribution_sha256: trackBRuntime?.manifestSha256,
            }
          : {}),
        track_b_runtime: trackBRuntime
          ? {
              manifest: "track-b-runtime/track-b-runtime-manifest.json",
              sidecar: path.relative(releaseDir, trackBRuntime.sidecarPath).replaceAll("\\", "/"),
              sidecar_sha256: trackBRuntime.sidecarSha256,
              manifest_sha256: trackBRuntime.manifestSha256,
              compatibility_generation: trackBRuntime.compatibilityGeneration,
              public_source_tree: trackBRuntime.publicSourceTree,
              extension_count: trackBRuntime.extensionCount,
            }
          : null,
        artifact_closure: artifactClosure,
      },
      null,
      2,
    ),
    "utf8",
  );
  await assertProductionReleaseHasNoQaArtifacts(releaseDir);
  await stampReleaseTreeModificationTimes(releaseDir, new Date(versionInfo.build_date));

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
