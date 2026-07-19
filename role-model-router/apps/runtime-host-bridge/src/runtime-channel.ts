import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type RuntimeChannel = "production" | "stage" | "development";

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
