import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const packageJsonPath = path.join(appRoot, "package.json");

function parseArgs(argv) {
  const parsed = {
    ref: undefined,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") {
      parsed.write = true;
      continue;
    }
    if (arg === "--ref") {
      parsed.ref = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.write) {
    throw new Error("This script currently supports sync mode only. Re-run with --write.");
  }

  return parsed;
}

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
  });
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function syncManagedPath(sourceRoot, targetRoot, managedPath) {
  const sourcePath = path.join(sourceRoot, managedPath);
  const targetPath = path.join(targetRoot, managedPath);

  if (!(await pathExists(sourcePath))) {
    throw new Error(`Upstream path does not exist: ${managedPath}`);
  }

  await rm(targetPath, { force: true, recursive: true });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { force: true, recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const upstream = packageJson["x-upstream-template"];

  if (
    !upstream?.repo ||
    !upstream?.path ||
    !upstream?.ref ||
    !Array.isArray(upstream.managedPaths)
  ) {
    throw new Error(
      "package.json is missing x-upstream-template.repo/path/ref/managedPaths metadata.",
    );
  }

  const targetRef = args.ref ?? upstream.ref;
  const cloneRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-docs-upstream-"));
  const upstreamRepoUrl = `https://github.com/${upstream.repo}.git`;
  const pnpmExecPath = process.env.npm_execpath;

  try {
    run("git", ["clone", "--filter=blob:none", "--sparse", upstreamRepoUrl, cloneRoot], repoRoot);
    run("git", ["sparse-checkout", "set", upstream.path], cloneRoot);
    run("git", ["checkout", targetRef], cloneRoot);

    const actualRef = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: cloneRoot,
      encoding: "utf8",
    }).trim();
    const upstreamAppRoot = path.join(cloneRoot, upstream.path);

    for (const managedPath of upstream.managedPaths) {
      await syncManagedPath(upstreamAppRoot, appRoot, managedPath);
    }

    packageJson["x-upstream-template"].ref = actualRef;
    await writeFile(`${packageJsonPath}`, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

    const formatTargets = [
      path.relative(repoRoot, packageJsonPath),
      ...upstream.managedPaths.map((managedPath) => path.join("apps", "docs-site", managedPath)),
    ];

    if (!pnpmExecPath) {
      throw new Error(
        "npm_execpath is not available, so the script cannot invoke pnpm for formatting.",
      );
    }

    run(
      process.execPath,
      [pnpmExecPath, "exec", "biome", "check", "--write", "--unsafe", ...formatTargets],
      repoRoot,
    );

    console.log(`Synced ${upstream.repo}:${upstream.path} at ${actualRef}`);
  } finally {
    await rm(cloneRoot, { force: true, recursive: true });
  }
}

await main();
