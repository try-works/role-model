import { homedir } from "node:os";
import { join } from "node:path";

export const MANAGED_BLOCK_BEGIN = "# BEGIN role-model-provider-managed";
export const MANAGED_BLOCK_END = "# END role-model-provider-managed";
export const PROVIDER_ID = "role-model";

export const DEFAULT_ADAPTER_HOST = "127.0.0.1";
export const DEFAULT_ADAPTER_PORT = 3460;
export const DEFAULT_ROLE_MODEL_ENDPOINT = "http://127.0.0.1:3456";
export const CODEX_API_KEY_ENV = "ROLE_MODEL_CODEX_API_KEY";
export const PLACEHOLDER_LOCAL_TOKEN = "role-model-local";

export function resolveCodexHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.CODEX_HOME?.trim() || join(homedir(), ".codex");
}

export function resolveAdapterPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ROLE_MODEL_CODEX_ADAPTER_PORT?.trim();
  if (!raw) return DEFAULT_ADAPTER_PORT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ROLE_MODEL_CODEX_ADAPTER_PORT: ${raw}`);
  }
  return parsed;
}

export function resolveAdapterBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const port = resolveAdapterPort(env);
  return `http://${DEFAULT_ADAPTER_HOST}:${port}/v1`;
}

export function resolveRoleModelEndpoint(env: NodeJS.ProcessEnv = process.env): string {
  return (env.ROLE_MODEL_ENDPOINT?.trim() || DEFAULT_ROLE_MODEL_ENDPOINT).replace(/\/+$/, "");
}

export function resolveUserConfigPath(codexHome: string): string {
  return join(codexHome, "config.toml");
}

export function resolveCatalogPath(codexHome: string): string {
  return join(codexHome, "role-model", "models.json");
}

export function resolveStatePath(codexHome: string): string {
  return join(codexHome, "role-model", "state.json");
}

export function resolveAdapterStateDir(codexHome: string): string {
  return join(codexHome, "role-model", "adapter");
}

export function resolveBackupRoot(codexHome: string): string {
  return join(codexHome, "backup-role-model");
}

export function formatCatalogConfigPath(
  codexHome: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const defaultHome = join(homedir(), ".codex").replace(/\\/g, "/");
  const normalizedHome = codexHome.replace(/\\/g, "/");
  if (normalizedHome === defaultHome) {
    return "~/.codex/role-model/models.json";
  }
  return resolveCatalogPath(codexHome);
}
