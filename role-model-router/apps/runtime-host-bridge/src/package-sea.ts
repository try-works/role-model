import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildBundle } from "esbuild";

interface BuildTarget {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly goos: string;
  readonly goarch: string;
  readonly executableName: string;
}

const NODE_SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const routerRoot = path.join(repoRoot, "role-model-router");
const vendorRoot = path.join(routerRoot, "vendor", "llama-swap");
const distRoot = path.join(routerRoot, "dist");
const releaseTarget = `${process.platform}-${process.arch}`;

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

function runOrThrow(command: string, args: readonly string[], cwd: string, env?: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: "inherit",
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function resolvePostjectCommand(): string {
  return process.platform === "win32"
    ? path.join(repoRoot, "node_modules", ".bin", "postject.cmd")
    : path.join(repoRoot, "node_modules", ".bin", "postject");
}

function resolveGoCommand(): string {
  return process.env.GO_BINARY ??
    (process.platform === "win32" ? "C:\\Program Files\\Go\\bin\\go.exe" : "go");
}

function resolvePackagedRuntimeName(): string {
  return process.platform === "win32" ? "role-model-runtime.exe" : "role-model-runtime";
}

async function buildLlamaSwapAssets(): Promise<void> {
  const goCommand = resolveGoCommand();
  for (const target of buildTargets) {
    const outputPath = path.join(
      vendorRoot,
      "dist-assets",
      `${target.platform}-${target.arch}`,
      target.executableName,
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    runOrThrow(goCommand, ["build", "-o", outputPath, "."], vendorRoot, {
      CGO_ENABLED: "0",
      GOOS: target.goos,
      GOARCH: target.goarch,
    });
    if (target.platform !== "win32") {
      await chmod(outputPath, 0o755);
    }
  }
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
    entryPoints: [path.join(routerRoot, "apps", "runtime-host-bridge", "dist", "cli.js")],
    outfile: seaEntryPath,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    conditions: ["runtime"],
    sourcemap: false,
  });
}

export async function packageSeaRuntime(): Promise<{
  readonly outputPath: string;
  readonly target: string;
  readonly sha256: string;
}> {
  await buildLlamaSwapAssets();
  await mkdir(distRoot, { recursive: true });
  await bundleSeaEntrypoint();
  const seaConfigPath = path.join(routerRoot, "sea-config.json");
  runOrThrow(process.execPath, ["--experimental-sea-config", seaConfigPath], routerRoot);

  const releaseDir = path.join(distRoot, "release", releaseTarget);
  const outputPath = path.join(releaseDir, resolvePackagedRuntimeName());
  const blobPath = path.join(distRoot, "sea-prep.blob");
  await mkdir(releaseDir, { recursive: true });
  await rm(outputPath, { force: true });
  await copyFile(process.execPath, outputPath);
  if (process.platform !== "win32") {
    await chmod(outputPath, 0o755);
  }

  const postjectArgs = [
    outputPath,
    "NODE_SEA_BLOB",
    blobPath,
    "--sentinel-fuse",
    NODE_SEA_FUSE,
  ];
  if (process.platform === "darwin") {
    postjectArgs.push("--macho-segment-name", "NODE_SEA");
  }
  runOrThrow(resolvePostjectCommand(), postjectArgs, repoRoot);

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

  return {
    outputPath,
    target: releaseTarget,
    sha256,
  };
}

if (import.meta.url === `file://${__filename.replace(/\\/g, "/")}`) {
  const result = await packageSeaRuntime();
  console.log(JSON.stringify(result, null, 2));
}
