import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { access, chmod, copyFile, mkdir, writeFile } from "node:fs/promises";

import { stringify } from "yaml";

import { ProcessSupervisor } from "@role-model-router/process-supervisor";
import type {
  VendorExecutionOptions,
  VendorExecutionRequest,
  VendorExecutionResult,
  VendorRuntime,
  VendorRuntimeStatus,
} from "@role-model-router/vendor-abstraction";
import { readVendorStreamTranscript } from "@role-model-router/vendor-abstraction";

const execFile = promisify(execFileCallback);
const LLAMA_SWAP_RELEASE_REPOSITORY = "mostlygeek/llama-swap";

export interface LlamaSwapModelConfig {
  readonly modelId: string;
  readonly path: string;
  readonly contextWindow: number | null;
  readonly command?: string | null;
  readonly proxyBaseUrl?: string | null;
  readonly checkEndpoint?: string | null;
  readonly useModelName?: string | null;
}

export interface LlamaSwapProcessConfig {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly cwd?: string;
  readonly startupTimeoutMs?: number;
}

export interface StartLlamaSwapVendorOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly supervisor: ProcessSupervisor;
  readonly config: {
    readonly models: readonly LlamaSwapModelConfig[];
    readonly command?: string;
    readonly args?: readonly string[];
    readonly env?: Readonly<Record<string, string>>;
    readonly cwd?: string;
    readonly startupTimeoutMs?: number;
  };
}

export interface LlamaSwapAssetDefinition {
  readonly assetKey: string;
  readonly executableName: string;
  readonly relativeAssetPath: string;
  readonly releaseArchiveName: string;
}

export interface ResolveProvisionedLlamaSwapCommandOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly platform?: NodeJS.Platform;
  readonly arch?: string;
  readonly version?: string;
  readonly downloadArchive?: (url: string, archivePath: string) => Promise<void>;
  readonly extractArchive?: (archivePath: string, destinationDir: string) => Promise<void>;
  readonly fetchLatestVersion?: () => Promise<string>;
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

export function renderLlamaSwapConfig(input: {
  readonly models: readonly LlamaSwapModelConfig[];
  readonly upstreamBaseUrl: string;
}): string {
  const models = Object.fromEntries(
    input.models.map((model) => {
      const defaultCommand = [
        "llama-server",
        "--port",
        "${PORT}",
        "--model",
        model.path,
        ...(typeof model.contextWindow === "number" ? ["--ctx-size", String(model.contextWindow)] : []),
      ].join(" ");

      return [
        model.modelId,
        {
          cmd: model.command ?? defaultCommand,
          ...(model.proxyBaseUrl ? { proxy: model.proxyBaseUrl } : {}),
          ...(model.checkEndpoint ? { checkEndpoint: model.checkEndpoint } : {}),
          ...(model.useModelName ? { useModelName: model.useModelName } : {}),
        },
      ];
    }),
  );
  return stringify({
    logLevel: "info",
    metricsMaxInMemory: 100,
    captureBuffer: 5,
    models,
    groups: {},
  });
}

export function readLlamaSwapAssetDefinition(
  platform: NodeJS.Platform,
  arch: string,
): LlamaSwapAssetDefinition | null {
  const targetId = `${platform}-${arch}`;
  switch (targetId) {
    case "linux-x64":
      return {
        assetKey: "vendor/llama-swap/linux-x64/llama-swap",
        executableName: "llama-swap",
        relativeAssetPath: path.join(
          "vendor",
          "llama-swap",
          "dist-assets",
          "linux-x64",
          "llama-swap",
        ),
        releaseArchiveName: "llama-swap_{VERSION}_linux_amd64.tar.gz",
      };
    case "darwin-x64":
      return {
        assetKey: "vendor/llama-swap/darwin-x64/llama-swap",
        executableName: "llama-swap",
        relativeAssetPath: path.join(
          "vendor",
          "llama-swap",
          "dist-assets",
          "darwin-x64",
          "llama-swap",
        ),
        releaseArchiveName: "llama-swap_{VERSION}_darwin_amd64.tar.gz",
      };
    case "darwin-arm64":
      return {
        assetKey: "vendor/llama-swap/darwin-arm64/llama-swap",
        executableName: "llama-swap",
        relativeAssetPath: path.join(
          "vendor",
          "llama-swap",
          "dist-assets",
          "darwin-arm64",
          "llama-swap",
        ),
        releaseArchiveName: "llama-swap_{VERSION}_darwin_arm64.tar.gz",
      };
    case "win32-x64":
      return {
        assetKey: "vendor/llama-swap/win32-x64/llama-swap.exe",
        executableName: "llama-swap.exe",
        relativeAssetPath: path.join(
          "vendor",
          "llama-swap",
          "dist-assets",
          "win32-x64",
          "llama-swap.exe",
        ),
        releaseArchiveName: "llama-swap_{VERSION}_windows_amd64.zip",
      };
    default:
      return null;
  }
}

function readLlamaSwapCachePath(runtimeStateRoot: string, executableName: string): string {
  return path.join(runtimeStateRoot, "vendors", "llama-swap", "bin", executableName);
}

async function fetchLatestLlamaSwapVersion(): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${LLAMA_SWAP_RELEASE_REPOSITORY}/releases/latest`,
  );
  if (!response.ok) {
    throw new Error(`Failed to resolve the latest llama-swap release: ${response.status}.`);
  }
  const payload = (await response.json()) as { tag_name?: string };
  if (typeof payload.tag_name !== "string" || payload.tag_name.length === 0) {
    throw new Error("GitHub Releases did not return a llama-swap tag name.");
  }
  return payload.tag_name.replace(/^v/, "");
}

async function downloadArchive(url: string, archivePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download llama-swap archive from ${url}: ${response.status}.`);
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

export async function resolveProvisionedLlamaSwapCommand(
  options: ResolveProvisionedLlamaSwapCommandOptions,
): Promise<string | null> {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const definition = readLlamaSwapAssetDefinition(platform, arch);
  if (!definition) {
    return null;
  }

  const cachedCommandPath = readLlamaSwapCachePath(
    options.runtimeStateRoot,
    definition.executableName,
  );
  if (await accessIfExists(cachedCommandPath)) {
    return cachedCommandPath;
  }

  const bundledAssetPath = path.join(
    options.repoRoot,
    "role-model-router",
    definition.relativeAssetPath,
  );
  if (await accessIfExists(bundledAssetPath)) {
    await mkdir(path.dirname(cachedCommandPath), { recursive: true });
    await copyFile(bundledAssetPath, cachedCommandPath);
    if (platform !== "win32") {
      await chmod(cachedCommandPath, 0o755);
    }
    return cachedCommandPath;
  }

  const version =
    options.version ?? (await (options.fetchLatestVersion ?? fetchLatestLlamaSwapVersion)());
  const archiveName = definition.releaseArchiveName.replaceAll("{VERSION}", version);
  const archivePath = path.join(
    options.runtimeStateRoot,
    "vendors",
    "llama-swap",
    "downloads",
    archiveName,
  );
  const releaseUrl = `https://github.com/${LLAMA_SWAP_RELEASE_REPOSITORY}/releases/download/v${version}/${archiveName}`;

  await (options.downloadArchive ?? downloadArchive)(releaseUrl, archivePath);
  await (options.extractArchive ?? extractArchive)(archivePath, path.dirname(cachedCommandPath));
  if (!(await accessIfExists(cachedCommandPath))) {
    throw new Error(`Provisioned llama-swap archive did not produce ${definition.executableName}.`);
  }
  if (platform !== "win32") {
    await chmod(cachedCommandPath, 0o755);
  }
  return cachedCommandPath;
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

export async function startLlamaSwapVendor(
  options: StartLlamaSwapVendorOptions,
): Promise<VendorRuntime> {
  const vendorId = "llama-swap";
  const vendorRoot = path.join(options.runtimeStateRoot, "vendors", vendorId);
  await mkdir(vendorRoot, { recursive: true });

  const port = await allocatePort();
  const healthUrl = `http://127.0.0.1:${port}/health`;
  const baseUrl = `http://127.0.0.1:${port}/v1`;
  const configPath = path.join(vendorRoot, "config.role-model.generated.yaml");
  await writeFile(
    configPath,
    renderLlamaSwapConfig({
      models: options.config.models,
      upstreamBaseUrl: baseUrl,
    }),
    "utf8",
  );

  const command =
    options.config.command ??
    (await resolveProvisionedLlamaSwapCommand({
      repoRoot: options.repoRoot,
      runtimeStateRoot: options.runtimeStateRoot,
    }));
  if (!command) {
    throw new Error(`Unsupported llama-swap platform: ${process.platform}-${process.arch}.`);
  }

  const managed = await options.supervisor.startVendor({
    vendorId,
    command,
    args:
      options.config.args && options.config.args.length > 0
        ? options.config.args
        : ["-config", configPath, "-listen", `127.0.0.1:${port}`],
    cwd: options.config.cwd,
    env: {
      ...(options.config.command ? { PORT: String(port) } : {}),
      ...(options.config.env ?? {}),
    },
    healthCheckUrl: healthUrl,
    startupTimeoutMs: options.config.startupTimeoutMs ?? 10_000,
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
    const requestUrl = new URL(request.url.replace("local://runtime", baseUrl));
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
    const latencyMs = Math.max(Date.now() - startedAt, 0);
    lastLatencyMs = latencyMs;
    const resolvedModelId =
      typeof request.body.model === "string"
        ? request.body.model
        : options.config.models[0]?.modelId;
    const contentType = response.headers.get("content-type") ?? "";
    if (request.body.stream === true && contentType.includes("text/event-stream")) {
      const transcript = await readVendorStreamTranscript(response, executionOptions?.streamWriter);
      return {
        statusCode: response.status,
        headers: readResponseHeaders(response),
        body: transcript,
        metadata: {
          vendorId,
          ...(resolvedModelId ? { resolvedModelId } : {}),
          latencyMs,
        },
      };
    }

    const parsed = await parseVendorResponse(response);
    return {
      ...parsed,
      metadata: {
        vendorId,
        ...(resolvedModelId ? { resolvedModelId } : {}),
        latencyMs,
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
