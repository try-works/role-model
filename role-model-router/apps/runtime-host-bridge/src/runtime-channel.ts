import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type RuntimeChannel = "production" | "stage" | "development";

/**
 * Runtime-channel contract generations.  A packaged runtime may read its
 * immediately previous generation, but it must never silently accept a
 * future or downgraded writer.
 */
export const CURRENT_RUNTIME_CHANNEL_VERSION = "2.0.0" as const;
export const PREVIOUS_RUNTIME_CHANNEL_VERSION = "1.0.0" as const;

export interface RuntimeChannelContext {
  readonly channel: RuntimeChannel;
  readonly scopeId: string;
  readonly authorizationEpoch: number;
}

export interface RuntimeChannelStartupNegotiationInput {
  readonly channel: RuntimeChannel;
  readonly writerVersion: string;
  readonly readerVersion: string;
  readonly offeredCapabilities: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly writerContext: RuntimeChannelContext;
  readonly readerContext: RuntimeChannelContext;
  readonly migrationActive?: boolean;
}

export interface RuntimeChannelStartupNegotiationResult {
  readonly accepted: true;
  readonly compatibility: "current" | "N-1";
  readonly channel: RuntimeChannel;
  readonly writerVersion: string;
  readonly readerVersion: string;
  readonly requiredCapabilities: readonly string[];
}

export interface RuntimeChannelProfile {
  readonly schema_version: 1;
  readonly channel: RuntimeChannel;
  readonly name: "role-model" | "role-model-stage" | "role-model-dev";
  readonly host: "127.0.0.1";
  readonly port: 3456 | 3457 | 3458;
  readonly state_root_name:
    | "role-model-runtime"
    | "role-model-runtime-stage"
    | "role-model-runtime-dev";
  readonly scope_id: "standalone-runtime" | "standalone-runtime-stage" | "standalone-runtime-dev";
}

const PROFILES: Record<RuntimeChannel, RuntimeChannelProfile> = {
  production: {
    schema_version: 1,
    channel: "production",
    name: "role-model",
    host: "127.0.0.1",
    port: 3456,
    state_root_name: "role-model-runtime",
    scope_id: "standalone-runtime",
  },
  stage: {
    schema_version: 1,
    channel: "stage",
    name: "role-model-stage",
    host: "127.0.0.1",
    port: 3457,
    state_root_name: "role-model-runtime-stage",
    scope_id: "standalone-runtime-stage",
  },
  development: {
    schema_version: 1,
    channel: "development",
    name: "role-model-dev",
    host: "127.0.0.1",
    port: 3458,
    state_root_name: "role-model-runtime-dev",
    scope_id: "standalone-runtime-dev",
  },
};

function parseRuntimeChannelVersion(value: string): readonly [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) throw new Error(`Unsupported runtime channel version: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareRuntimeChannelVersions(left: string, right: string): number {
  const leftParts = parseRuntimeChannelVersion(left);
  const rightParts = parseRuntimeChannelVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

function assertRuntimeChannelContext(
  expected: RuntimeChannelContext,
  observed: RuntimeChannelContext,
  label: string,
  channel: RuntimeChannel,
): void {
  if (expected.channel !== channel || observed.channel !== channel) {
    throw new Error(`${label} runtime channel context does not match ${channel}`);
  }
  if (expected.scopeId !== observed.scopeId) {
    throw new Error(`${label} runtime channel context scope mismatch`);
  }
  if (
    !Number.isSafeInteger(expected.authorizationEpoch) ||
    expected.authorizationEpoch < 0 ||
    !Number.isSafeInteger(observed.authorizationEpoch) ||
    observed.authorizationEpoch < 0
  ) {
    throw new Error(`${label} runtime channel context authorization epoch is invalid`);
  }
  if (expected.authorizationEpoch !== observed.authorizationEpoch) {
    throw new Error(`${label} runtime channel context authorization epoch is stale`);
  }
}

/**
 * Negotiate the channel contract before any packaged runtime is advertised as
 * ready.  The check is intentionally pure so startup tests can exercise the
 * same boundary used by the executable without launching workers.
 */
export function negotiateRuntimeChannelStartup(
  input: RuntimeChannelStartupNegotiationInput,
): RuntimeChannelStartupNegotiationResult {
  resolveRuntimeChannelProfile(input.channel);
  const currentVersion = CURRENT_RUNTIME_CHANNEL_VERSION;
  const previousVersion = PREVIOUS_RUNTIME_CHANNEL_VERSION;
  const writerVersion = input.writerVersion.trim();
  const readerVersion = input.readerVersion.trim();
  parseRuntimeChannelVersion(writerVersion);
  parseRuntimeChannelVersion(readerVersion);

  for (const [label, version] of [
    ["writer", writerVersion],
    ["reader", readerVersion],
  ] as const) {
    if (version !== currentVersion && version !== previousVersion) {
      throw new Error(`${label} runtime channel version is unsupported: ${version}`);
    }
  }
  if (compareRuntimeChannelVersions(readerVersion, currentVersion) > 0) {
    throw new Error(`reader runtime channel version is newer than this runtime: ${readerVersion}`);
  }
  if (compareRuntimeChannelVersions(writerVersion, currentVersion) > 0) {
    throw new Error(`writer runtime channel version is newer than this runtime: ${writerVersion}`);
  }
  if (
    writerVersion === currentVersion &&
    readerVersion === previousVersion &&
    !input.migrationActive
  ) {
    throw new Error("writer-first runtime channel negotiation requires an active migration");
  }

  assertRuntimeChannelContext(input.writerContext, input.readerContext, "reader", input.channel);
  const offeredCapabilities = new Set(
    input.offeredCapabilities.filter((capability) => capability.trim()),
  );
  const requiredCapabilities = [
    ...new Set(input.requiredCapabilities.filter((capability) => capability.trim())),
  ];
  const missingCapabilities = requiredCapabilities.filter(
    (capability) => !offeredCapabilities.has(capability),
  );
  if (missingCapabilities.length > 0) {
    throw new Error(
      `runtime channel negotiation is missing capabilities: ${missingCapabilities.join(", ")}`,
    );
  }

  return {
    accepted: true,
    compatibility:
      writerVersion === currentVersion && readerVersion === currentVersion ? "current" : "N-1",
    channel: input.channel,
    writerVersion,
    readerVersion,
    requiredCapabilities,
  };
}

export function resolveRuntimeChannelProfile(value: unknown): RuntimeChannelProfile {
  if (value !== "production" && value !== "stage" && value !== "development") {
    throw new Error(`Unsupported runtime channel: ${String(value)}`);
  }
  return PROFILES[value];
}

export function resolveRuntimeStateRoot(
  platformStateBase: string,
  profile: RuntimeChannelProfile,
): string {
  return path.join(platformStateBase, profile.state_root_name);
}

export function resolveBuildRuntimeChannel(env: NodeJS.ProcessEnv = process.env): RuntimeChannel {
  const value = env.ROLE_MODEL_BUILD_CHANNEL?.trim() || "development";
  resolveRuntimeChannelProfile(value);
  return value as RuntimeChannel;
}

export function readPackagedRuntimeProfile(
  executablePath: string | undefined,
): RuntimeChannelProfile | null {
  if (!executablePath) {
    return null;
  }
  const manifestPath = path.join(path.dirname(path.resolve(executablePath)), "manifest.json");
  if (!existsSync(manifestPath)) {
    return null;
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid packaged runtime manifest at ${manifestPath}`, { cause: error });
  }
  const record = manifest as Record<string, unknown>;
  const profile = resolveRuntimeChannelProfile(record.channel);
  for (const [field, expected] of [
    ["name", profile.name],
    ["host", profile.host],
    ["port", profile.port],
    ["state_root_name", profile.state_root_name],
    ["scope_id", profile.scope_id],
  ] as const) {
    if (record[field] !== expected) {
      throw new Error(
        `Packaged runtime manifest ${field} does not match channel ${profile.channel}`,
      );
    }
  }
  return profile;
}
