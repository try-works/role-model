import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { parse } from "smol-toml";
import { adapterBaseUrl, DEFAULT_CODEX_ADAPTER_PORT } from "./config.js";

export const MANAGED_BLOCK_BEGIN = "# BEGIN role-model-provider-managed";
export const MANAGED_BLOCK_END = "# END role-model-provider-managed";
export const MANAGED_BEGIN = MANAGED_BLOCK_BEGIN;
export const MANAGED_END = MANAGED_BLOCK_END;
export const PROVIDER_ID = "role-model";

export function resolveCodexHome(env: Partial<Record<string, string | undefined>> = process.env): string {
  return env.CODEX_HOME?.trim() || join(homedir(), ".codex");
}

export function isProjectLevelCodexConfig(
  configPath: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const normalized = configPath.replace(/\\/g, "/");
  const userConfig = join(resolveCodexHome(env), "config.toml").replace(/\\/g, "/");
  if (normalized === userConfig) return false;
  return normalized.endsWith("/.codex/config.toml");
}

export class ProjectConfigRefusedError extends Error {
  constructor(path: string) {
    super(
      `Refusing to write role-model provider keys into project config ${path}. Use user-level $CODEX_HOME/config.toml instead.`,
    );
    this.name = "ProjectConfigRefusedError";
  }
}

export class InvalidTomlAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTomlAbortError";
  }
}

export function assertUserLevelConfigPath(
  configPath: string,
  envOrCodexHome: NodeJS.ProcessEnv | string = process.env,
): void {
  const env =
    typeof envOrCodexHome === "string"
      ? ({ ...process.env, CODEX_HOME: envOrCodexHome } as NodeJS.ProcessEnv)
      : envOrCodexHome;
  if (isProjectLevelCodexConfig(configPath, env)) {
    throw new ProjectConfigRefusedError(configPath);
  }
}

function tomlString(value: string): string {
  return JSON.stringify(value.replace(/\\/g, "/"));
}

export interface ManagedConfigInput {
  readonly codexHome: string;
  readonly model: string;
  readonly adapterBaseUrl?: string;
  readonly catalogConfigPath?: string;
}

export function renderManagedBlock(input: ManagedConfigInput): string {
  const adapter = input.adapterBaseUrl ?? adapterBaseUrl(DEFAULT_CODEX_ADAPTER_PORT);
  const catalogPath = input.catalogConfigPath ?? catalogPathForHome(input.codexHome);
  return buildManagedProviderBlock({
    model: input.model,
    adapterPort: Number.parseInt(adapter.match(/:(\d+)/)?.[1] ?? String(DEFAULT_CODEX_ADAPTER_PORT), 10),
    catalogPath,
  }).trimEnd();
}

export function buildManagedProviderBlock(options: {
  model: string;
  adapterPort?: number;
  catalogPath: string;
  /** Default signed-in preserves ChatGPT history via openai_base_url hijack. */
  integrationMode?: "signed-in" | "login-free";
}): string {
  const port = options.adapterPort ?? DEFAULT_CODEX_ADAPTER_PORT;
  const baseUrl = adapterBaseUrl(port);
  const mode = options.integrationMode ?? "signed-in";

  if (mode === "signed-in") {
    // Keep ChatGPT auth/session group. Do not force API login or custom model_provider.
    return [
      MANAGED_BLOCK_BEGIN,
      `model = ${tomlString(options.model)}`,
      `openai_base_url = ${tomlString(baseUrl)}`,
      `model_catalog_json = ${tomlString(options.catalogPath)}`,
      MANAGED_BLOCK_END,
      "",
    ].join("\n");
  }

  return [
    MANAGED_BLOCK_BEGIN,
    `model = ${tomlString(options.model)}`,
    `model_provider = "role-model"`,
    `preferred_auth_method = "apikey"`,
    `forced_login_method = "api"`,
    `model_catalog_json = ${tomlString(options.catalogPath)}`,
    "",
    `[model_providers.role-model]`,
    `name = "role-model"`,
    `base_url = ${tomlString(baseUrl)}`,
    `wire_api = "responses"`,
    `supports_websockets = true`,
    `requires_openai_auth = false`,
    `env_key = "ROLE_MODEL_CODEX_API_KEY"`,
    MANAGED_BLOCK_END,
    "",
  ].join("\n");
}

export function upsertManagedBlock(existing: string, managedBlock: string): string {
  // Root keys in the managed block (model, model_catalog_json, …) are only valid in the
  // TOML document root. Appending after an existing [table] nests them into that table
  // (silent Codex fallback to bundled catalog). Always place the managed block first.
  const withoutManaged = removeManagedBlock(existing).replace(/^\s+/, "").replace(/\s+$/, "");
  const block = managedBlock.trimEnd();
  return withoutManaged ? `${block}\n\n${withoutManaged}\n` : `${block}\n`;
}

export function removeManagedBlock(existing: string): string {
  const begin = existing.indexOf(MANAGED_BLOCK_BEGIN);
  const end = existing.indexOf(MANAGED_BLOCK_END);
  if (begin < 0 || end < begin) return existing;
  const afterEnd = end + MANAGED_BLOCK_END.length;
  return `${existing.slice(0, begin).replace(/\s+$/, "")}\n${existing.slice(afterEnd).replace(/^\s+/, "")}`.trim() + "\n";
}

export function validateTomlOrThrow(content: string): void {
  try {
    parse(content);
  } catch (error) {
    throw new InvalidTomlAbortError(
      `Resulting Codex config.toml is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function hasManagedBlock(content: string): boolean {
  return content.includes(MANAGED_BLOCK_BEGIN) && content.includes(MANAGED_BLOCK_END);
}

export function backupCodexFiles(codexHome: string, files: string[]): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(codexHome, "backup-role-model", stamp);
  mkdirSync(backupDir, { recursive: true });
  for (const file of files) {
    if (!existsSync(file)) continue;
    copyFileSync(file, join(backupDir, file.split(/[/\\]/).pop()!));
  }
  return backupDir;
}

export async function backupUserConfig(codexHome: string): Promise<string> {
  const backupDir = backupCodexFiles(codexHome, [
    join(codexHome, "config.toml"),
    join(codexHome, "role-model", "models.json"),
  ]);
  return backupDir;
}

export function writeTextFileAtomic(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  writeFileSync(temp, contents, "utf8");
  renameSync(temp, path);
}

export function readTextFileIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

export function catalogPathForHome(
  codexHome: string,
  _env: Partial<Record<string, string | undefined>> = process.env,
): string {
  // Desktop/Codex on Windows is unreliable with "~/" catalog paths; always write absolute.
  return join(codexHome, "role-model", "models.json").replace(/\\/g, "/");
}

export function absoluteCatalogPath(codexHome: string): string {
  return join(codexHome, "role-model", "models.json");
}

export function resolveUserConfigPath(codexHome: string): string {
  return join(codexHome, "config.toml");
}

export async function writeManagedUserConfig(
  input: ManagedConfigInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ backupDir: string; configPath: string }> {
  const configPath = resolveUserConfigPath(input.codexHome);
  assertUserLevelConfigPath(configPath, env);
  const backupDir = await backupUserConfig(input.codexHome);
  const existing = await readFile(configPath, "utf8").catch(() => "");
  const managedBlock = renderManagedBlock(input);
  const next = upsertManagedBlock(existing, managedBlock);
  validateTomlOrThrow(next);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, next, "utf8");
  return { backupDir, configPath };
}

export async function uninstallManagedUserConfig(
  codexHome: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ backupDir: string; configPath: string }> {
  const configPath = resolveUserConfigPath(codexHome);
  assertUserLevelConfigPath(configPath, env);
  const backupDir = await backupUserConfig(codexHome);
  const existing = await readFile(configPath, "utf8").catch(() => "");
  const next = removeManagedBlock(existing);
  if (next.trim().length > 0) validateTomlOrThrow(next);
  await writeFile(configPath, next, "utf8");
  return { backupDir, configPath };
}

export function readSelectedModelFromToml(content: string): string | null {
  if (!hasManagedBlock(content)) return null;
  const match = content.match(/^model\s*=\s*"([^"]+)"/m);
  return match?.[1] ?? null;
}

export function updateSelectedModelInToml(content: string, model: string): string {
  if (!hasManagedBlock(content)) throw new Error("Managed role-model block is missing from Codex config.");
  const next = content.replace(/^model\s*=\s*"[^"]*"/m, `model = ${tomlString(model)}`);
  validateTomlOrThrow(next);
  return next;
}
