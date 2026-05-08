import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { access, chmod, mkdir, writeFile } from "node:fs/promises";

import { stringify } from "yaml";

import { ProcessSupervisor } from "@role-model-router/process-supervisor";
import type {
  VendorExecutionOptions,
  VendorExecutionRequest,
  VendorExecutionResult,
  VendorRuntime,
  VendorRuntimeStatus,
} from "@role-model-router/vendor-abstraction";
import {
  parseVendorStreamPayloads,
  readVendorStreamTranscript,
} from "@role-model-router/vendor-abstraction";

const execFile = promisify(execFileCallback);
const UV_RELEASE_REPOSITORY = "astral-sh/uv";

export interface LiteLLMProviderMapping {
  readonly modelId: string;
  readonly litellmModel: string;
  readonly litellmParams?: Readonly<Record<string, LiteLLMConfigValue>>;
}

export interface LiteLLMProviderConfig {
  readonly providerId: string;
  readonly apiKeyRef: string | null;
  readonly modelMappings: readonly LiteLLMProviderMapping[];
}

export type LiteLLMConfigValue =
  | string
  | number
  | boolean
  | null
  | readonly LiteLLMConfigValue[]
  | { readonly [key: string]: LiteLLMConfigValue };

export interface StartLiteLLMVendorOptions {
  readonly runtimeStateRoot: string;
  readonly supervisor: ProcessSupervisor;
  readonly config: {
    readonly providers: readonly LiteLLMProviderConfig[];
    readonly command?: string;
    readonly args?: readonly string[];
    readonly env?: Readonly<Record<string, string>>;
    readonly cwd?: string;
    readonly startupTimeoutMs?: number;
  };
}

export interface EnsureLiteLLMCommandOptions {
  readonly runtimeStateRoot: string;
  readonly platform?: NodeJS.Platform;
  readonly arch?: string;
  readonly version?: string;
  readonly whichCommand?: (command: string) => string | null | undefined;
  readonly runCommand?: (
    command: string,
    args: readonly string[],
    env: Readonly<Record<string, string>>,
  ) => Promise<void> | void;
  readonly downloadArchive?: (url: string, archivePath: string) => Promise<void>;
  readonly extractArchive?: (archivePath: string, destinationDir: string) => Promise<void>;
  readonly fetchLatestVersion?: () => Promise<string>;
}

interface UVAssetDefinition {
  readonly executableName: string;
  readonly archiveName: string;
}

interface ParsedResponse {
  readonly body: unknown;
  readonly headers: Record<string, string>;
  readonly statusCode: number;
}

function readResponseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

async function accessIfExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findCommandOnPath(
  command: string,
  platform: NodeJS.Platform,
): Promise<string | null> {
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  if (pathValue.length === 0) {
    return null;
  }

  const pathEntries = pathValue
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const candidateNames =
    platform === "win32"
      ? command.includes(".")
        ? [command]
        : [`${command}.exe`, `${command}.cmd`, `${command}.bat`, command]
      : [command];

  for (const directory of pathEntries) {
    for (const candidateName of candidateNames) {
      const candidatePath = path.join(directory, candidateName);
      if (await accessIfExists(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

async function allocatePort(): Promise<number> {
  const { createServer } = await import("node:net");
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate a local TCP port."));
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

export function renderLiteLLMConfig(input: {
  readonly providers: readonly LiteLLMProviderConfig[];
}): string {
  return stringify({
    model_list: input.providers.flatMap((provider) =>
      provider.modelMappings.map((mapping) => ({
        model_name: mapping.modelId,
        litellm_params: {
          ...(mapping.litellmParams ?? {}),
          model: mapping.litellmModel,
          ...(!mapping.litellmParams?.api_key && provider.apiKeyRef ? { api_key: provider.apiKeyRef } : {}),
        },
      })),
    ),
  });
}

function readUVAssetDefinition(platform: NodeJS.Platform, arch: string): UVAssetDefinition | null {
  const targetId = `${platform}-${arch}`;
  switch (targetId) {
    case "linux-x64":
      return {
        executableName: "uv",
        archiveName: "uv-x86_64-unknown-linux-gnu.tar.gz",
      };
    case "darwin-x64":
      return {
        executableName: "uv",
        archiveName: "uv-x86_64-apple-darwin.tar.gz",
      };
    case "darwin-arm64":
      return {
        executableName: "uv",
        archiveName: "uv-aarch64-apple-darwin.tar.gz",
      };
    case "win32-x64":
      return {
        executableName: "uv.exe",
        archiveName: "uv-x86_64-pc-windows-msvc.zip",
      };
    default:
      return null;
  }
}

function readCachedUVPath(runtimeStateRoot: string, executableName: string): string {
  return path.join(runtimeStateRoot, "vendors", "uv", "bin", executableName);
}

function readLiteLLMExecutablePath(toolDir: string, platform: NodeJS.Platform): string {
  return path.join(
    toolDir,
    "litellm",
    platform === "win32" ? "Scripts" : "bin",
    platform === "win32" ? "litellm.exe" : "litellm",
  );
}

async function fetchLatestUVVersion(): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${UV_RELEASE_REPOSITORY}/releases/latest`,
  );
  if (!response.ok) {
    throw new Error(`Failed to resolve the latest uv release: ${response.status}.`);
  }
  const payload = (await response.json()) as { tag_name?: string };
  if (typeof payload.tag_name !== "string" || payload.tag_name.length === 0) {
    throw new Error("GitHub Releases did not return a uv tag name.");
  }
  return payload.tag_name.replace(/^v/, "");
}

async function downloadArchive(url: string, archivePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download uv archive from ${url}: ${response.status}.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(archivePath), { recursive: true });
  await writeFile(archivePath, buffer);
}

async function extractArchive(archivePath: string, destinationDir: string): Promise<void> {
  await mkdir(destinationDir, { recursive: true });
  if (archivePath.endsWith(".zip")) {
    await execFile("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`,
    ]);
    return;
  }

  await execFile("tar", ["-xzf", archivePath, "-C", destinationDir]);
}

async function resolveProvisionedUVCommand(
  options: EnsureLiteLLMCommandOptions,
  platform: NodeJS.Platform,
  arch: string,
): Promise<string> {
  const fromPath = options.whichCommand?.("uv") ?? (await findCommandOnPath("uv", platform));
  if (typeof fromPath === "string" && fromPath.length > 0) {
    return fromPath;
  }

  const definition = readUVAssetDefinition(platform, arch);
  if (!definition) {
    throw new Error(`Unsupported uv platform: ${platform}-${arch}.`);
  }
  const cachedUVPath = readCachedUVPath(options.runtimeStateRoot, definition.executableName);
  if (await accessIfExists(cachedUVPath)) {
    return cachedUVPath;
  }

  const version = options.version ?? (await (options.fetchLatestVersion ?? fetchLatestUVVersion)());
  const archivePath = path.join(
    options.runtimeStateRoot,
    "vendors",
    "uv",
    "downloads",
    definition.archiveName,
  );
  const releaseUrl = `https://releases.astral.sh/github/uv/releases/download/${version}/${definition.archiveName}`;
  await (options.downloadArchive ?? downloadArchive)(releaseUrl, archivePath);
  await (options.extractArchive ?? extractArchive)(archivePath, path.dirname(cachedUVPath));
  if (!(await accessIfExists(cachedUVPath))) {
    throw new Error(`Provisioned uv archive did not produce ${definition.executableName}.`);
  }
  if (platform !== "win32") {
    await chmod(cachedUVPath, 0o755);
  }
  return cachedUVPath;
}

export async function ensureLiteLLMCommand(
  options: EnsureLiteLLMCommandOptions,
): Promise<{ command: string; toolDir: string; uvCommand: string }> {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const toolDir = path.join(options.runtimeStateRoot, "vendors", "uv-tools");
  const command = readLiteLLMExecutablePath(toolDir, platform);
  if (await accessIfExists(command)) {
    const uvCommand =
      options.whichCommand?.("uv") ??
      readCachedUVPath(options.runtimeStateRoot, platform === "win32" ? "uv.exe" : "uv");
    return { command, toolDir, uvCommand };
  }

  const uvCommand = await resolveProvisionedUVCommand(options, platform, arch);
  await mkdir(toolDir, { recursive: true });
  const toolBinDir = path.join(toolDir, "bin");
  const installEnv = {
    ...Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    ),
    UV_TOOL_DIR: toolDir,
    UV_TOOL_BIN_DIR: toolBinDir,
  };
  await (
    options.runCommand ??
    (async (
      commandToRun: string,
      args: readonly string[],
      env: Readonly<Record<string, string>>,
    ) => {
      await execFile(commandToRun, [...args], { env });
    })
  )(uvCommand, ["tool", "install", "litellm[proxy]"], installEnv);

  if (!(await accessIfExists(command))) {
    throw new Error(`LiteLLM install did not produce ${command}.`);
  }
  if (platform !== "win32") {
    await chmod(command, 0o755);
  }
  return { command, toolDir, uvCommand };
}

async function parseVendorResponse(response: Response): Promise<ParsedResponse> {
  const text = await response.text();
  const headers = readResponseHeaders(response);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return {
      statusCode: response.status,
      headers,
      body: JSON.parse(text) as unknown,
    };
  }
  return {
    statusCode: response.status,
    headers,
    body: text,
  };
}

function readHeaderNumber(headers: Record<string, string>, headerName: string): number | undefined {
  const value = headers[headerName];
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readCost(body: unknown, headers?: Record<string, string>): number | undefined {
  if (!body || typeof body !== "object") {
    return headers ? readHeaderNumber(headers, "x-litellm-response-cost") : undefined;
  }
  if (
    "_hidden_params" in body &&
    body._hidden_params &&
    typeof body._hidden_params === "object" &&
    "response_cost" in body._hidden_params &&
    typeof body._hidden_params.response_cost === "number"
  ) {
    return body._hidden_params.response_cost;
  }
  return headers ? readHeaderNumber(headers, "x-litellm-response-cost") : undefined;
}

function normalizeCacheStatus(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
}

function readCacheStatus(body: unknown, headers?: Record<string, string>): string | undefined {
  if (body && typeof body === "object") {
    if (
      "_hidden_params" in body &&
      body._hidden_params &&
      typeof body._hidden_params === "object" &&
      "cache_status" in body._hidden_params &&
      typeof body._hidden_params.cache_status === "string"
    ) {
      return normalizeCacheStatus(body._hidden_params.cache_status);
    }
    if ("cache_status" in body && typeof body.cache_status === "string") {
      return normalizeCacheStatus(body.cache_status);
    }
  }
  return normalizeCacheStatus(headers?.["x-litellm-cache-status"]);
}

function readCacheHit(body: unknown, headers?: Record<string, string>): boolean | undefined {
  if (!body || typeof body !== "object") {
    const cacheStatus = readCacheStatus(body, headers);
    if (cacheStatus === "HIT") {
      return true;
    }
    if (typeof cacheStatus === "string") {
      return false;
    }
    return undefined;
  }
  if (
    "_hidden_params" in body &&
    body._hidden_params &&
    typeof body._hidden_params === "object" &&
    "cache_hit" in body._hidden_params &&
    typeof body._hidden_params.cache_hit === "boolean"
  ) {
    return body._hidden_params.cache_hit;
  }
  const cacheStatus = readCacheStatus(body, headers);
  if (cacheStatus === "HIT") {
    return true;
  }
  if (typeof cacheStatus === "string") {
    return false;
  }
  return undefined;
}

function readCachedTokens(body: unknown): number | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  if (
    "usage" in body &&
    body.usage &&
    typeof body.usage === "object" &&
    "prompt_tokens_details" in body.usage &&
    body.usage.prompt_tokens_details &&
    typeof body.usage.prompt_tokens_details === "object" &&
    "cached_tokens" in body.usage.prompt_tokens_details &&
    typeof body.usage.prompt_tokens_details.cached_tokens === "number"
  ) {
    return body.usage.prompt_tokens_details.cached_tokens;
  }
  return undefined;
}

function readStreamTerminalBody(transcript: string): unknown {
  const payloads = parseVendorStreamPayloads(transcript);
  for (let index = payloads.length - 1; index >= 0; index -= 1) {
    const payload = payloads[index];
    if (
      ("usage" in payload && payload.usage) ||
      ("_hidden_params" in payload && payload._hidden_params) ||
      ("response_cost" in payload && typeof payload.response_cost === "number")
    ) {
      return payload;
    }
  }
  return payloads.at(-1);
}

export async function startLiteLLMVendor(
  options: StartLiteLLMVendorOptions,
): Promise<VendorRuntime> {
  const vendorId = "litellm";
  const vendorRoot = path.join(options.runtimeStateRoot, "vendors", vendorId);
  await mkdir(vendorRoot, { recursive: true });
  const port = await allocatePort();
  const healthUrl = `http://127.0.0.1:${port}/health/liveliness`;
  const baseUrl = `http://127.0.0.1:${port}/v1`;
  const configPath = path.join(vendorRoot, "litellm.generated.yaml");
  await writeFile(
    configPath,
    renderLiteLLMConfig({
      providers: options.config.providers,
    }),
    "utf8",
  );

  const command =
    options.config.command ??
    (
      await ensureLiteLLMCommand({
        runtimeStateRoot: options.runtimeStateRoot,
      })
    ).command;

  const managed = await options.supervisor.startVendor({
    vendorId,
    command,
    args:
      options.config.args && options.config.args.length > 0
        ? options.config.args
        : ["--config", configPath, "--port", String(port)],
    cwd: options.config.cwd,
    env: {
      PORT: String(port),
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
      ...(options.config.env ?? {}),
    },
    healthCheckUrl: healthUrl,
    startupTimeoutMs: options.config.startupTimeoutMs ?? 30_000,
    required: true,
  });
  let lastLatencyMs: number | undefined;
  const readStatus = (): VendorRuntimeStatus => {
    const status = options.supervisor.getVendorStatus(vendorId);
    return {
      vendorId,
      healthStatus: status?.healthStatus ?? "stopped",
      baseUrl,
      healthUrl,
      pid: status?.pid,
      configPath,
      ...(typeof lastLatencyMs === "number" ? { lastLatencyMs } : {}),
    };
  };
  const execute = async (
    request: VendorExecutionRequest,
    executionOptions?: VendorExecutionOptions,
  ): Promise<VendorExecutionResult> => {
    const startedAt = Date.now();
    const originalUrl = new URL(request.url);
    const requestPath = originalUrl.pathname.startsWith("/v1/")
      ? originalUrl.pathname.slice("/v1".length)
      : originalUrl.pathname;
    const response = await fetch(`${baseUrl}${requestPath}`, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        ...request.body,
        ...(executionOptions?.fallbackModelIds?.length
          ? { fallbacks: executionOptions.fallbackModelIds }
          : {}),
      }),
    });
    const latencyMs = Math.max(Date.now() - startedAt, 0);
    lastLatencyMs = latencyMs;
    const contentType = response.headers.get("content-type") ?? "";
    if (request.body.stream === true && contentType.includes("text/event-stream")) {
      const transcript = await readVendorStreamTranscript(response, executionOptions?.streamWriter);
      const terminalBody = readStreamTerminalBody(transcript);
      return {
        statusCode: response.status,
        headers: readResponseHeaders(response),
        body: transcript,
        metadata: {
          vendorId,
          ...(typeof request.body.model === "string"
            ? { resolvedModelId: request.body.model }
            : {}),
          ...(typeof latencyMs === "number" ? { latencyMs } : {}),
          ...(typeof readCost(terminalBody, readResponseHeaders(response)) === "number"
            ? { costUsd: readCost(terminalBody, readResponseHeaders(response)) }
            : {}),
          ...(typeof readCacheStatus(terminalBody, readResponseHeaders(response)) === "string"
            ? { cacheStatus: readCacheStatus(terminalBody, readResponseHeaders(response)) }
            : {}),
          ...(typeof readCacheHit(terminalBody, readResponseHeaders(response)) === "boolean"
            ? { cacheUsed: readCacheHit(terminalBody, readResponseHeaders(response)) }
            : {}),
          ...(typeof readCachedTokens(terminalBody) === "number"
            ? { cacheReadTokens: readCachedTokens(terminalBody) }
            : {}),
        },
      };
    }

    const parsed = await parseVendorResponse(response);
    return {
      ...parsed,
      metadata: {
        vendorId,
        ...(typeof request.body.model === "string"
          ? { resolvedModelId: request.body.model }
          : {}),
        ...(typeof latencyMs === "number" ? { latencyMs } : {}),
        ...(typeof readCost(parsed.body, parsed.headers) === "number"
          ? { costUsd: readCost(parsed.body, parsed.headers) }
          : {}),
        ...(typeof readCacheStatus(parsed.body, parsed.headers) === "string"
          ? { cacheStatus: readCacheStatus(parsed.body, parsed.headers) }
          : {}),
        ...(typeof readCacheHit(parsed.body, parsed.headers) === "boolean"
          ? { cacheUsed: readCacheHit(parsed.body, parsed.headers) }
          : {}),
        ...(typeof readCachedTokens(parsed.body) === "number"
          ? { cacheReadTokens: readCachedTokens(parsed.body) }
          : {}),
      },
    };
  };

  return {
    execute,
    async executeStream(
      request: VendorExecutionRequest,
      streamWriter,
      executionOptions,
    ): Promise<VendorExecutionResult> {
      return execute(request, {
        ...(executionOptions ?? {}),
        streamWriter,
      });
    },
    readStatus(): VendorRuntimeStatus {
      return readStatus();
    },
    async healthCheck(): Promise<VendorRuntimeStatus> {
      return readStatus();
    },
    async shutdown(): Promise<void> {
      await options.supervisor.stopVendor(vendorId);
    },
  };
}
