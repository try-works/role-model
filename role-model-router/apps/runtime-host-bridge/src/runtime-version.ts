import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface RuntimeVersionInfoRecord {
  readonly version: string;
  readonly release_version?: string;
  readonly commit: string;
  readonly build_date: string;
  readonly configVersion?: string;
  readonly channel?: string;
  readonly name?: string;
  readonly endpoint?: string;
  readonly source_tree?: string;
  readonly executable_sha256?: string;
  readonly core_payload_sha256?: string;
}

interface RuntimeVersionManifest {
  readonly version?: unknown;
  readonly commit?: unknown;
  readonly build_date?: unknown;
  readonly channel?: unknown;
  readonly name?: unknown;
  readonly endpoint?: unknown;
  readonly source_tree?: unknown;
  readonly executable_sha256?: unknown;
  readonly core_payload_sha256?: unknown;
}

function readManifestIdentity(
  manifest: RuntimeVersionManifest | null,
): Partial<RuntimeVersionInfoRecord> {
  const fields = [
    "channel",
    "name",
    "endpoint",
    "source_tree",
    "executable_sha256",
    "core_payload_sha256",
  ] as const;
  return Object.fromEntries(
    fields.flatMap((field) => {
      const value = readNonEmptyString(manifest?.[field]);
      return value ? [[field, value]] : [];
    }),
  );
}

export interface ResolveRuntimeVersionInfoOptions {
  readonly repoRoot: string;
  readonly fallbackConfigVersion?: string | null;
  readonly env?: NodeJS.ProcessEnv;
  readonly runGitCommand?: (args: readonly string[], cwd: string) => string | null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeTaggedVersion(value: string | null | undefined): string | null {
  const trimmed = readNonEmptyString(value);
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("refs/tags/")) {
    return normalizeTaggedVersion(trimmed.slice("refs/tags/".length));
  }
  if (/^v\d+\.\d+\.\d+([-.+].*)?$/i.test(trimmed)) {
    return trimmed.slice(1);
  }
  if (/^\d+\.\d+\.\d+([-.+].*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function defaultRunGitCommand(args: readonly string[], cwd: string): string | null {
  try {
    const output = execFileSync("git", [...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return output.length > 0 ? output : null;
  } catch {
    return null;
  }
}

function readFirstLine(value: string | null): string | null {
  const trimmed = readNonEmptyString(value);
  if (!trimmed) {
    return null;
  }
  const [firstLine] = trimmed.split(/\r?\n/, 1);
  return readNonEmptyString(firstLine);
}

async function readManifest(repoRoot: string): Promise<RuntimeVersionManifest | null> {
  const manifestPath = path.join(repoRoot, "manifest.json");
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as RuntimeVersionManifest;
  } catch {
    return null;
  }
}

export async function resolveRuntimeVersionInfo(
  options: ResolveRuntimeVersionInfoOptions,
): Promise<RuntimeVersionInfoRecord> {
  const env = options.env ?? process.env;
  const manifest = await readManifest(options.repoRoot);
  const manifestVersion = normalizeTaggedVersion(readNonEmptyString(manifest?.version));
  if (manifestVersion) {
    return {
      version: manifestVersion,
      release_version: manifestVersion,
      commit:
        readNonEmptyString(manifest?.commit) ??
        readNonEmptyString(env.GITHUB_SHA) ??
        "runtime-derived",
      build_date:
        readNonEmptyString(manifest?.build_date) ??
        readNonEmptyString(env.BUILD_DATE) ??
        readNonEmptyString(env.GITHUB_RUN_CREATED_AT) ??
        "runtime-derived",
      ...readManifestIdentity(manifest),
      ...(options.fallbackConfigVersion ? { configVersion: options.fallbackConfigVersion } : {}),
    };
  }

  const taggedEnvVersion =
    normalizeTaggedVersion(readNonEmptyString(env.ROLE_MODEL_RUNTIME_VERSION)) ??
    normalizeTaggedVersion(readNonEmptyString(env.GITHUB_REF_NAME));
  if (taggedEnvVersion) {
    return {
      version: taggedEnvVersion,
      release_version: taggedEnvVersion,
      commit: readNonEmptyString(env.GITHUB_SHA) ?? "runtime-derived",
      build_date:
        readNonEmptyString(env.BUILD_DATE) ??
        readNonEmptyString(env.GITHUB_RUN_CREATED_AT) ??
        "runtime-derived",
      ...(options.fallbackConfigVersion ? { configVersion: options.fallbackConfigVersion } : {}),
    };
  }

  const runGitCommand = options.runGitCommand ?? defaultRunGitCommand;
  const latestReleaseVersion = normalizeTaggedVersion(
    readFirstLine(
      runGitCommand(["tag", "--list", "v[0-9]*", "--sort=-version:refname"], options.repoRoot),
    ),
  );
  const describedVersion = normalizeTaggedVersion(
    runGitCommand(
      ["describe", "--tags", "--dirty", "--always", "--match", "v[0-9]*"],
      options.repoRoot,
    ),
  );
  if (describedVersion) {
    return {
      version: describedVersion,
      ...(latestReleaseVersion ? { release_version: latestReleaseVersion } : {}),
      commit: runGitCommand(["rev-parse", "HEAD"], options.repoRoot) ?? "runtime-derived",
      build_date:
        readNonEmptyString(env.BUILD_DATE) ??
        readNonEmptyString(env.GITHUB_RUN_CREATED_AT) ??
        runGitCommand(["show", "-s", "--format=%cI", "HEAD"], options.repoRoot) ??
        "runtime-derived",
      ...(options.fallbackConfigVersion ? { configVersion: options.fallbackConfigVersion } : {}),
    };
  }

  if (latestReleaseVersion) {
    return {
      version: latestReleaseVersion,
      release_version: latestReleaseVersion,
      commit: runGitCommand(["rev-parse", "HEAD"], options.repoRoot) ?? "runtime-derived",
      build_date:
        readNonEmptyString(env.BUILD_DATE) ??
        readNonEmptyString(env.GITHUB_RUN_CREATED_AT) ??
        runGitCommand(["show", "-s", "--format=%cI", "HEAD"], options.repoRoot) ??
        "runtime-derived",
      ...(options.fallbackConfigVersion ? { configVersion: options.fallbackConfigVersion } : {}),
    };
  }

  return {
    version: "unknown",
    commit: "runtime-derived",
    build_date: "runtime-derived",
    ...(options.fallbackConfigVersion ? { configVersion: options.fallbackConfigVersion } : {}),
  };
}
