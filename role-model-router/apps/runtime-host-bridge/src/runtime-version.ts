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
  readonly release_id?: string;
  readonly private_distribution_sha256?: string;
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
  readonly release_id?: unknown;
  readonly private_distribution_sha256?: unknown;
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
    "release_id",
    "private_distribution_sha256",
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

export function validateRun88PackagedStageIdentity(
  manifest: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (manifest.channel !== "stage")
    throw new Error("Run 88 packaged stage identity requires the stage channel");
  if (
    manifest.name !== "role-model-stage" ||
    manifest.host !== "127.0.0.1" ||
    manifest.port !== 3457 ||
    manifest.endpoint !== "http://127.0.0.1:3457" ||
    manifest.state_root_name !== "role-model-runtime-stage" ||
    manifest.scope_id !== "standalone-runtime-stage"
  )
    throw new Error("Run 88 stage package endpoint, state root, scope, name, or port is invalid");
  if (!/^sha256:[0-9a-f]{64}$/.test(String(manifest.release_id ?? "")))
    throw new Error("Run 88 stage release identity is missing or invalid");
  for (const field of [
    "private_distribution_sha256",
    "executable_sha256",
    "core_payload_sha256",
  ] as const) {
    if (!/^[0-9a-f]{64}$/.test(String(manifest[field] ?? "")))
      throw new Error(`Run 88 stage ${field} is missing or invalid`);
  }
  if (!/^[0-9a-f]{40}$/.test(String(manifest.source_tree ?? "")))
    throw new Error("Run 88 stage source tree identity is missing or invalid");
  const trackB = manifest.track_b_runtime as Record<string, unknown> | null | undefined;
  if (!trackB || trackB.manifest_sha256 !== manifest.private_distribution_sha256)
    throw new Error("Run 88 stage private distribution identity mismatch");
  return Object.freeze({ ...manifest });
}

export interface Run88StageRuntimeIdentity {
  readonly releaseId: string;
  readonly sourceId: string;
  readonly executableSha256: string;
}

export function resolveRun88StageRuntimeIdentity(
  channel: "development" | "stage" | "production",
  manifest: Readonly<Record<string, unknown>> | null,
): Run88StageRuntimeIdentity | undefined {
  if (channel !== "stage") return undefined;
  const validated = validateRun88PackagedStageIdentity(manifest ?? {});
  return Object.freeze({
    releaseId: validated.release_id as string,
    sourceId: validated.source_tree as string,
    executableSha256: validated.executable_sha256 as string,
  });
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
