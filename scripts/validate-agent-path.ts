import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { createRoleModelExtension } from "../packages/pi-role-model/src/extension.js";
import { discoverRoleModelRuntime } from "../packages/pi-role-model/src/runtime-discovery.js";

const CRAFT_PREAMBLE =
  "You are Craft Agent, powered by Craft Agents Backend. Help users connect data sources, automate workflows, and validate integrations. Follow the system contract and schema for tool validation.";

const DEFAULT_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4x8AAAAASUVORK5CYII=";

type DownstreamDiscovery = Awaited<ReturnType<typeof discoverRoleModelRuntime>>["discovery"];

type ChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export function buildChatTools(count: number): ChatTool[] {
  return Array.from({ length: count }, (_, index) => ({
    type: "function",
    function: {
      name: `runtime_agent_path_tool_${index + 1}`,
      description: "Agent-path validation tool schema.",
      parameters: { type: "object", properties: {} },
    },
  }));
}

export function buildCraftDeclaredToolsPayload(input: {
  aliasId: string;
  prompt: string;
  toolCount?: number;
}): Record<string, unknown> {
  return {
    model: input.aliasId,
    messages: [
      { role: "user", content: CRAFT_PREAMBLE },
      { role: "user", content: input.prompt },
    ],
    tools: buildChatTools(input.toolCount ?? 33),
  };
}

export function buildCraftPlainTextPayload(input: {
  aliasId: string;
  prompt: string;
}): Record<string, unknown> {
  return {
    model: input.aliasId,
    messages: [
      { role: "user", content: CRAFT_PREAMBLE },
      { role: "user", content: input.prompt },
    ],
  };
}

export function buildCraftInlineImagePayload(input: {
  aliasId: string;
  prompt: string;
  imageDataUrl?: string;
}): Record<string, unknown> {
  return {
    model: input.aliasId,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: input.prompt },
          {
            type: "image",
            data: (input.imageDataUrl ?? DEFAULT_IMAGE_DATA_URL).replace(
              /^data:image\/png;base64,/,
              "",
            ),
          },
        ],
      },
    ],
  };
}

function buildPiMessages(input: {
  prompt: string;
  imageDataUrl?: string;
}): Array<Record<string, unknown>> {
  if (!input.imageDataUrl) {
    return [{ role: "user", content: input.prompt }];
  }

  return [
    {
      role: "user",
      content: [
        { type: "text", text: input.prompt },
        {
          type: "image_url",
          image_url: {
            url: input.imageDataUrl,
          },
        },
      ],
    },
  ];
}

export async function preparePiChatCompletionsPayload(input: {
  endpoint: string;
  aliasId: string;
  prompt: string;
  clientRequestId: string;
  sessionId?: string;
  transportPreference?: string;
  tools?: readonly ChatTool[];
  imageDataUrl?: string;
}): Promise<{
  discovery: DownstreamDiscovery;
  requestPath: "/v1/chat/completions";
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}> {
  const discoveryResult = await discoverRoleModelRuntime({
    endpoint: input.endpoint,
  });

  let beforeProviderRequest:
    | ((event: { type: "before_provider_request"; payload: unknown }) => unknown | Promise<unknown>)
    | undefined;

  const extension = createRoleModelExtension({
    endpoint: input.endpoint,
    discover: async () => discoveryResult,
    fetchRuntimeTaskChunk: async () => [],
    fetchRuntimeRoleSummaries: async () => [],
  });

  await extension({
    registerProvider() {
      // Discovery/provider registration is part of the Pi path being exercised.
    },
    registerCommand() {
      // Command registration is irrelevant to the payload-preparation path.
    },
    on(event, handler) {
      if (event === "before_provider_request") {
        beforeProviderRequest = handler;
      }
    },
  });

  if (!beforeProviderRequest) {
    throw new Error("Pi extension did not register a before_provider_request hook.");
  }

  const basePayload: Record<string, unknown> = {
    model: input.aliasId,
    messages: buildPiMessages({
      prompt: input.prompt,
      imageDataUrl: input.imageDataUrl,
    }),
    ...(input.tools && input.tools.length > 0 ? { tools: [...input.tools] } : {}),
  };

  const prepared = await beforeProviderRequest({
    type: "before_provider_request",
    payload: basePayload,
  });
  if (!prepared || typeof prepared !== "object") {
    throw new Error("Pi extension returned an invalid prepared payload.");
  }

  return {
    discovery: discoveryResult.discovery,
    requestPath: "/v1/chat/completions",
    payload: prepared as Record<string, unknown>,
    headers: {
      authorization: `Bearer ${discoveryResult.discovery.authentication.placeholderToken}`,
      "content-type": "application/json",
      "x-client-request-id": input.clientRequestId,
      ...(input.sessionId ? { "session-id": input.sessionId } : {}),
      ...(input.transportPreference
        ? { "x-role-model-transport-preference": input.transportPreference }
        : {}),
    },
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text.length > 0 ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${JSON.stringify(body)}`);
  }
  return body;
}

type BackendRequestList = {
  listRecentRequestObservations: () => Promise<
    ReadonlyArray<{
      requestId?: string;
      request_id?: string;
      clientRequestId?: string | null;
      client_request_id?: string | null;
    }>
  >;
};

type BackendTelemetryList = {
  listTelemetryRequests: (query: { limit: number }) => Promise<
    ReadonlyArray<Record<string, unknown>>
  >;
};

type BackendRequestCorrelation = BackendRequestList & Partial<BackendTelemetryList>;

type BackendArtifacts = BackendRequestList &
  BackendTelemetryList & {
    readRequestObservation: (requestId: string) => Promise<unknown>;
    readRouterDecision: (requestId: string) => Promise<unknown>;
    readEndpointProfile: (endpointId: string) => Promise<unknown>;
  };

export async function withMockValidationOpenAiApiKey<T>(callback: () => Promise<T>): Promise<T> {
  const previousOpenAiApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = previousOpenAiApiKey || "runtime-vendor-validation-key";
  try {
    return await callback();
  } finally {
    if (previousOpenAiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAiApiKey;
    }
  }
}

export async function waitForRuntimeModelEndpointsReady(
  backend: {
    listEndpoints: () => Promise<
      ReadonlyArray<{
        modelId?: string | null;
        status?: string | null;
        healthStatus?: string | null;
      }>
    >;
  },
  modelIds: readonly string[],
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const endpoints = await backend.listEndpoints();
    const readyByModelId = new Map(
      modelIds.map((modelId) => [
        modelId,
        endpoints.some(
          (endpoint) =>
            endpoint.modelId === modelId &&
            endpoint.status === "active" &&
            endpoint.healthStatus === "healthy",
        ),
      ]),
    );
    if ([...readyByModelId.values()].every(Boolean)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for runtime endpoints for models: ${modelIds.join(", ")}.`);
}

async function snapshotRequestIds(backend: BackendRequestList): Promise<Set<string>> {
  const payload = await backend.listRecentRequestObservations();
  return new Set(
    payload
      .map((record) => record.requestId ?? record.request_id ?? null)
      .filter((value): value is string => Boolean(value)),
  );
}

export async function resolveRuntimeRequestId(input: {
  backend: BackendRequestCorrelation;
  clientRequestId: string;
  beforeRequestIds: ReadonlySet<string>;
  attempts?: number;
}): Promise<string> {
  const attempts = input.attempts ?? 80;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const payload = await input.backend.listRecentRequestObservations();
    const byClientRequestId = payload.find(
      (record) =>
        (record.clientRequestId ?? record.client_request_id ?? null) === input.clientRequestId &&
        typeof (record.requestId ?? record.request_id) === "string",
    );
    if (byClientRequestId) {
      return byClientRequestId.requestId ?? byClientRequestId.request_id ?? input.clientRequestId;
    }

    const newRecord = payload.find(
      (record) =>
        typeof (record.requestId ?? record.request_id) === "string" &&
        !input.beforeRequestIds.has(record.requestId ?? record.request_id ?? ""),
    );
    if (newRecord) {
      return newRecord.requestId ?? newRecord.request_id ?? input.clientRequestId;
    }

    if (input.backend.listTelemetryRequests) {
      const telemetryMatch = (await input.backend.listTelemetryRequests({ limit: 100 })).find(
        (entry) => {
          const entryClientRequestId =
            typeof entry.clientRequestId === "string"
              ? entry.clientRequestId
              : typeof entry.client_request_id === "string"
                ? entry.client_request_id
                : null;
          return entryClientRequestId === input.clientRequestId;
        },
      );
      const telemetryRequestId =
        typeof telemetryMatch?.requestId === "string"
          ? telemetryMatch.requestId
          : typeof telemetryMatch?.request_id === "string"
            ? telemetryMatch.request_id
            : null;
      if (telemetryRequestId) {
        return telemetryRequestId;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Unable to resolve runtime request id for ${input.clientRequestId}.`);
}

async function readTelemetryRow(backend: BackendArtifacts, requestId: string): Promise<unknown> {
  const rows = await backend.listTelemetryRequests({ limit: 100 });
  const row = rows.find((entry) => {
    const entryRequestId =
      typeof entry.requestId === "string"
        ? entry.requestId
        : typeof entry.request_id === "string"
          ? entry.request_id
          : null;
    return entryRequestId === requestId;
  });
  if (!row) {
    throw new Error(`Telemetry row missing for request ${requestId}.`);
  }
  return row;
}

async function collectArtifacts(
  backend: BackendArtifacts,
  requestId: string,
): Promise<{
  requestDetail: unknown;
  routerDecision: unknown;
  telemetryRow: unknown;
  endpointProfile: unknown;
}> {
  const requestDetail = await backend.readRequestObservation(requestId);
  const routerDecision = await backend.readRouterDecision(requestId);
  const telemetryRow = await readTelemetryRow(backend, requestId);

  const selectedEndpointId =
    (routerDecision as { selectedEndpointId?: string | null })?.selectedEndpointId ??
    (requestDetail as { endpointId?: string | null })?.endpointId;
  if (!selectedEndpointId) {
    throw new Error(`Selected endpoint id missing for request ${requestId}.`);
  }

  const endpointProfile = await backend.readEndpointProfile(selectedEndpointId);

  return {
    requestDetail,
    routerDecision,
    telemetryRow,
    endpointProfile,
  };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createValidationCodexAuthAdapter() {
  return {
    startDeviceCodeLogin: async () => ({
      loginId: "login-runtime-vendor-codex-001",
      verificationUrl: "https://auth.openai.com/codex/device",
      userCode: "VRUN-6201",
      wsUrl: "ws://127.0.0.1:4595",
      pid: 4595,
    }),
    readAccount: async ({ codexHome }: { readonly codexHome: string }) => {
      await mkdir(codexHome, { recursive: true });
      await writeFile(
        path.join(codexHome, "auth.json"),
        JSON.stringify(
          {
            auth_mode: "chatgpt",
            tokens: {
              access_token: "codex-access-runtime-vendor-001",
              refresh_token: "codex-refresh-runtime-vendor-001",
              account_id: "codex-account-runtime-vendor-001",
            },
            last_refresh: "2026-07-08T09:00:00.000Z",
          },
          null,
          2,
        ),
        "utf8",
      );
      return {
        account: {
          type: "chatgpt",
          email: "runtime-vendor@example.com",
          planType: "pro",
        },
        requiresOpenaiAuth: true,
      };
    },
  };
}

function createValidationCodexExecutionAdapter() {
  return {
    executeRequest: async ({
      requestId,
      requestCapture,
    }: {
      readonly requestId: string;
      readonly requestCapture: {
        readonly url: string;
      };
    }) => {
      if (requestCapture.url.endsWith("/v1/responses")) {
        return {
          statusCode: 200,
          body: {
            id: `resp-${requestId}`,
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: "IMAGE_OK" }],
              },
            ],
            usage: {
              input_tokens: 24,
              output_tokens: 2,
            },
          },
          vendorMetadata: {
            vendorId: "chatgpt-codex-responses",
            latencyMs: 8,
          },
        };
      }
      return {
        statusCode: 200,
        body: {
          id: `chatcmpl-${requestId}`,
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: "IMAGE_OK",
              },
            },
          ],
          usage: {
            prompt_tokens: 24,
            completion_tokens: 2,
          },
        },
        vendorMetadata: {
          vendorId: "chatgpt-codex-responses",
          latencyMs: 8,
        },
      };
    },
  };
}

async function startRuntimeForConfig(input: {
  repoRoot: string;
  runtimeStateRoot: string;
  scopeId: string;
  config: Record<string, unknown>;
  codex?: {
    providerAccountId: string;
    modelId: string;
  };
}) {
  const configDir = path.join(input.runtimeStateRoot, input.scopeId);
  const configPath = path.join(configDir, "runtime-config.yaml");
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, `${JSON.stringify(input.config, null, 2)}\n`, "utf8");

  const [{ createRuntimeBridgeBackend, startBridgeServer }, { createCliServerOptions }] =
    await Promise.all([
      import("../role-model-router/apps/runtime-host-bridge/dist/index.js"),
      import("../role-model-router/apps/runtime-host-bridge/dist/cli.js"),
    ]);

  const backend = await createRuntimeBridgeBackend({
    fixtureRoot: path.join(input.repoRoot, "testdata", "router-runtime"),
    repoRoot: input.repoRoot,
    runtimeStateRoot: input.runtimeStateRoot,
    scopeId: input.scopeId,
    unifiedRuntimeConfigPath: configPath,
    ...(input.codex
      ? {
          codexAuthAdapter: createValidationCodexAuthAdapter(),
          codexExecutionAdapter: createValidationCodexExecutionAdapter(),
        }
      : {}),
  });

  if (input.codex) {
    const pending = await backend.startProviderDeviceAuthorization({
      providerAccountId: input.codex.providerAccountId,
      providerId: "openai",
      providerKind: "provider-openai",
      variantId: "openai-codex-subscription",
      orgScope: "personal",
      accountScope: "workspace-default",
      allowedModels: [input.codex.modelId],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
    });
    await backend.pollProviderDeviceAuthorization({
      authRequestId: pending.authRequestId,
    });
    await backend.activateEndpoint({
      providerAccountId: input.codex.providerAccountId,
      modelId: input.codex.modelId,
      region: "global",
    });
    await backend.updateRuntimeConfig({});
  }

  const server = await startBridgeServer(
    createCliServerOptions(
      {
        host: "127.0.0.1",
        port: 0,
      },
      backend,
      async () => {
        await backend.shutdown();
      },
    ),
  );

  return {
    backend,
    server,
    baseUrl: `http://127.0.0.1:${server.port}`,
    async close(): Promise<void> {
      await server.close();
      await backend.shutdown();
    },
  };
}

async function startMockValidationRuntime(input: {
  repoRoot: string;
  runtimeStateRoot?: string;
  scopeId?: string;
}) {
  const runtimeStateRoot =
    input.runtimeStateRoot ?? (await mkdtemp(path.join(os.tmpdir(), "role-model-agent-path-")));
  const createdTempRoot = !input.runtimeStateRoot;
  const scopeId = input.scopeId ?? "runtime-agent-path";
  const { createRuntimeVendorValidationPlan } = await import(
    "../role-model-router/apps/runtime-host-bridge/dist/validate-vendors.js"
  );

  const plan = await createRuntimeVendorValidationPlan({
    runtimeStateRoot,
    scopeId,
    harnessMode: "mock",
  });

  const runtime = await startRuntimeForConfig({
    repoRoot: input.repoRoot,
    runtimeStateRoot,
    scopeId: `${scopeId}-hybrid`,
    config: plan.hybridConfig,
    codex: {
      providerAccountId: "openai.personal.openai-codex-subscription",
      modelId: plan.codexModelId,
    },
  });

  return {
    ...runtime,
    runtimeStateRoot,
    aliases: {
      difficultyHybrid: plan.difficultyAliasModelId,
      difficultyRemoteOnly: plan.codexAliasModelId,
    },
    models: {
      local: plan.localModelId,
      remote: plan.remoteModelId,
      codex: plan.codexModelId,
    },
    async close(): Promise<void> {
      await runtime.close();
      if (createdTempRoot) {
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    },
  };
}

async function executeChatCase(input: {
  runtime: { baseUrl: string; backend: BackendArtifacts };
  requestBody: Record<string, unknown>;
  headers: Record<string, string>;
  caseId: string;
  outDir: string;
  beforeRequestIds: ReadonlySet<string>;
}): Promise<{
  summary: Record<string, unknown>;
}> {
  const response = await fetch(`${input.runtime.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: input.headers,
    body: JSON.stringify(input.requestBody),
  });
  const responseBody = await response.json();
  const runtimeRequestId = await resolveRuntimeRequestId({
    backend: input.runtime.backend,
    clientRequestId: input.headers["x-client-request-id"] ?? input.caseId,
    beforeRequestIds: input.beforeRequestIds,
  });
  const artifacts = await collectArtifacts(input.runtime.backend, runtimeRequestId);

  const caseDir = path.join(input.outDir, "requests", input.caseId);
  await writeJson(path.join(caseDir, "request.json"), input.requestBody);
  await writeJson(path.join(caseDir, "response.json"), responseBody);
  await writeJson(path.join(caseDir, "request-detail.json"), artifacts.requestDetail);
  await writeJson(path.join(caseDir, "router-decision.json"), artifacts.routerDecision);
  await writeJson(path.join(caseDir, "telemetry-row.json"), artifacts.telemetryRow);
  await writeJson(path.join(caseDir, "endpoint-profile.json"), artifacts.endpointProfile);
  await writeJson(path.join(caseDir, "extra.json"), {
    requestedAlias: input.requestBody.model,
    clientRequestId: input.headers["x-client-request-id"] ?? null,
    sessionId: input.headers["session-id"] ?? null,
    transportPreference: input.headers["x-role-model-transport-preference"] ?? null,
    statusCode: response.status,
  });

  const routerDecision = artifacts.routerDecision as {
    selectedEndpointId?: string | null;
    selectedModelId?: string | null;
    routingDiagnostics?: {
      aliasResolution?: Record<string, unknown>;
      capabilityEligibility?: Record<string, unknown>;
    };
  };
  const requestDetail = artifacts.requestDetail as {
    executionTelemetry?: {
      vendorId?: string | null;
    };
    executionSemantics?: {
      executionFamily?: string | null;
      adapterFamily?: string | null;
    };
  };
  const telemetryRow = artifacts.telemetryRow as {
    clientRequestId?: string | null;
    providerFamily?: string | null;
    vendorId?: string | null;
    eligibleEndpointIds?: readonly unknown[] | null;
    eligible_endpoint_ids?: readonly unknown[] | null;
  };
  const eligibleEndpointIds = Array.isArray(telemetryRow.eligibleEndpointIds)
    ? telemetryRow.eligibleEndpointIds
    : Array.isArray(telemetryRow.eligible_endpoint_ids)
      ? telemetryRow.eligible_endpoint_ids
      : [];

  return {
    summary: {
      caseId: input.caseId,
      requestId: runtimeRequestId,
      requestedAlias: input.requestBody.model,
      statusCode: response.status,
      selectedEndpointId: routerDecision.selectedEndpointId ?? null,
      selectedModelId: routerDecision.selectedModelId ?? null,
      executionFamily: requestDetail.executionSemantics?.executionFamily ?? null,
      adapterFamily: requestDetail.executionSemantics?.adapterFamily ?? null,
      providerFamily: telemetryRow.providerFamily ?? null,
      vendorId: requestDetail.executionTelemetry?.vendorId ?? telemetryRow.vendorId ?? null,
      eligibleEndpointIds,
      clientRequestIdObserved: telemetryRow.clientRequestId ?? null,
      aliasResolution: routerDecision.routingDiagnostics?.aliasResolution ?? null,
      capabilityEligibility: routerDecision.routingDiagnostics?.capabilityEligibility ?? null,
    },
  };
}

export async function runAliasAgentPathProof(input: {
  repoRoot: string;
  outDir: string;
  runtimeStateRoot?: string;
  scopeId?: string;
  build?: boolean;
}): Promise<{
  baseUrl: string;
  runtimeStateRoot: string;
  aliases: {
    difficultyHybrid: string;
    difficultyRemoteOnly: string;
  };
  cases: readonly Record<string, unknown>[];
}> {
  if (input.build) {
    await buildRuntimeHostBridgeDist(input.repoRoot);
  }

  return withMockValidationOpenAiApiKey(async () => {
    const runtime = await startMockValidationRuntime({
      repoRoot: input.repoRoot,
      runtimeStateRoot: input.runtimeStateRoot,
      scopeId: input.scopeId,
    });

    try {
      await waitForRuntimeModelEndpointsReady(runtime.backend, [
        runtime.models.local,
        runtime.models.remote,
        runtime.models.codex,
      ]);
      await mkdir(input.outDir, { recursive: true });

      const piToolPayload = await preparePiChatCompletionsPayload({
        endpoint: runtime.baseUrl,
        aliasId: runtime.aliases.difficultyRemoteOnly,
        prompt:
          "Analyze this code-edit workflow, preserve session affinity, and reply with exactly PI_TOOL_OK.",
        clientRequestId: "run62-pi-chat-alias-tools-001",
        sessionId: "run62-pi-session-001",
        transportPreference: "websocket",
        tools: buildChatTools(2),
      });
      const piTextPayload = await preparePiChatCompletionsPayload({
        endpoint: runtime.baseUrl,
        aliasId: runtime.aliases.difficultyRemoteOnly,
        prompt: "Reply with exactly PI_TEXT_OK.",
        clientRequestId: "run62-pi-chat-alias-text-001",
        sessionId: "run62-pi-session-000",
      });
      const piImagePayload = await preparePiChatCompletionsPayload({
        endpoint: runtime.baseUrl,
        aliasId: runtime.aliases.difficultyRemoteOnly,
        prompt: "Describe the attached inline image and reply with exactly IMAGE_OK.",
        clientRequestId: "run62-pi-chat-alias-image-001",
        sessionId: "run62-pi-session-002",
        imageDataUrl: DEFAULT_IMAGE_DATA_URL,
      });

      const cases = [
        {
          caseId: "pi-chat-alias-text-001",
          requestBody: piTextPayload.payload,
          headers: piTextPayload.headers,
        },
        {
          caseId: "pi-chat-alias-tools-001",
          requestBody: piToolPayload.payload,
          headers: piToolPayload.headers,
        },
        {
          caseId: "pi-chat-alias-image-001",
          requestBody: piImagePayload.payload,
          headers: piImagePayload.headers,
        },
        {
          caseId: "craft-chat-alias-text-001",
          requestBody: buildCraftPlainTextPayload({
            aliasId: runtime.aliases.difficultyRemoteOnly,
            prompt: "Reply with exactly CRAFT_TEXT_OK.",
          }),
          headers: {
            authorization: "Bearer role-model-local",
            "content-type": "application/json",
            "x-client-request-id": "run62-craft-chat-alias-text-001",
          },
        },
        {
          caseId: "craft-chat-alias-declared-tools-001",
          requestBody: buildCraftDeclaredToolsPayload({
            aliasId: runtime.aliases.difficultyRemoteOnly,
            prompt: "Validate the integration and reply with exactly CRAFT_TOOL_OK.",
            toolCount: 33,
          }),
          headers: {
            authorization: "Bearer role-model-local",
            "content-type": "application/json",
            "x-client-request-id": "run62-craft-chat-alias-tools-001",
          },
        },
        {
          caseId: "craft-chat-alias-inline-image-001",
          requestBody: buildCraftInlineImagePayload({
            aliasId: runtime.aliases.difficultyRemoteOnly,
            prompt: "Describe the attached inline image and reply with exactly IMAGE_OK.",
          }),
          headers: {
            authorization: "Bearer role-model-local",
            "content-type": "application/json",
            "x-client-request-id": "run62-craft-chat-alias-image-001",
          },
        },
      ] as const;

      const summaries: Record<string, unknown>[] = [];
      for (const testCase of cases) {
        const beforeRequestIds = await snapshotRequestIds(runtime.backend);
        const result = await executeChatCase({
          runtime,
          requestBody: testCase.requestBody,
          headers: testCase.headers,
          caseId: testCase.caseId,
          outDir: input.outDir,
          beforeRequestIds,
        });
        summaries.push(result.summary);
      }

      const summary = {
        baseUrl: runtime.baseUrl,
        runtimeStateRoot: runtime.runtimeStateRoot,
        aliases: runtime.aliases,
        capturedAt: new Date().toISOString(),
        cases: summaries,
      };
      await writeJson(path.join(input.outDir, "summary.json"), summary);
      await writeJson(path.join(input.outDir, "runtime.json"), {
        baseUrl: runtime.baseUrl,
        runtimeStateRoot: runtime.runtimeStateRoot,
        aliases: runtime.aliases,
      });

      return summary;
    } finally {
      await runtime.close();
    }
  });
}

async function buildRuntimeHostBridgeDist(repoRoot: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn(
            "cmd.exe",
            [
              "/d",
              "/s",
              "/c",
              "corepack pnpm --filter @role-model-router/runtime-host-bridge build",
            ],
            {
              cwd: repoRoot,
              stdio: "inherit",
              windowsHide: true,
            },
          )
        : spawn(
            "corepack",
            ["pnpm", "--filter", "@role-model-router/runtime-host-bridge", "build"],
            {
              cwd: repoRoot,
              stdio: "inherit",
              windowsHide: true,
            },
          );
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`runtime-host-bridge build exited with code ${code ?? -1}.`));
    });
    child.once("error", reject);
  });
}

async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      "repo-root": { type: "string" },
      "out-dir": { type: "string" },
      "runtime-state-root": { type: "string" },
      "scope-id": { type: "string" },
      build: { type: "boolean", default: false },
    },
  });

  const repoRoot = path.resolve(args.values["repo-root"] ?? process.cwd());
  const outDir = path.resolve(
    args.values["out-dir"] ??
      path.join(
        repoRoot,
        ".recursive",
        "run",
        "62-litellm-pi-craft-codex-execution-hardening",
        "evidence",
        "runtime",
        "addendum-02-agent-path-rebuilt",
      ),
  );

  const result = await runAliasAgentPathProof({
    repoRoot,
    outDir,
    runtimeStateRoot: args.values["runtime-state-root"],
    scopeId: args.values["scope-id"],
    build: args.values.build,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
