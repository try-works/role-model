import { mkdtemp, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";

type ChatPayload = Record<string, unknown> & {
  readonly model?: string;
  readonly messages?: readonly unknown[];
  readonly tools?: readonly unknown[];
};

type PreparedPiPayload = {
  readonly requestPath: string;
  readonly payload: ChatPayload;
  readonly headers: Readonly<Record<string, string>>;
  readonly discovery: {
    readonly models: readonly { readonly id?: string }[];
  };
};

type AgentPathCaseSummary = Record<string, unknown> & {
  readonly caseId?: unknown;
  readonly requestedAlias?: unknown;
  readonly statusCode?: unknown;
  readonly selectedEndpointId?: unknown;
  readonly executionFamily?: unknown;
  readonly adapterFamily?: unknown;
  readonly providerFamily?: unknown;
  readonly vendorId?: unknown;
  readonly eligibleEndpointIds?: unknown;
};

type ValidateAgentPathModule = {
  readonly buildCraftDeclaredToolsPayload: (input: {
    readonly aliasId: string;
    readonly prompt: string;
    readonly toolCount: number;
  }) => ChatPayload;
  readonly buildCraftInlineImagePayload: (input: {
    readonly aliasId: string;
    readonly prompt: string;
  }) => ChatPayload;
  readonly preparePiChatCompletionsPayload: (input: {
    readonly endpoint: string;
    readonly aliasId: string;
    readonly prompt: string;
    readonly clientRequestId: string;
    readonly sessionId?: string;
  }) => Promise<PreparedPiPayload>;
  readonly resolveRuntimeRequestId: (input: {
    readonly backend: {
      readonly listRecentRequestObservations: () => Promise<readonly Record<string, unknown>[]>;
      readonly listTelemetryRequests?: (query: {
        readonly limit: number;
      }) => Promise<readonly Record<string, unknown>[]>;
    };
    readonly clientRequestId: string;
    readonly beforeRequestIds: ReadonlySet<string>;
    readonly attempts?: number;
  }) => Promise<string | null>;
  readonly runAliasAgentPathProof: (input: {
    readonly repoRoot: string;
    readonly outDir: string;
    readonly runtimeStateRoot?: string;
    readonly scopeId?: string;
    readonly build?: boolean;
  }) => Promise<{
    readonly cases: readonly AgentPathCaseSummary[];
  }>;
  readonly waitForRuntimeModelEndpointsReady: (
    backend: {
      readonly listEndpoints: () => Promise<
        readonly {
          readonly modelId?: string | null;
          readonly status?: string | null;
          readonly healthStatus?: string | null;
        }[]
      >;
    },
    modelIds: readonly string[],
    timeoutMs?: number,
  ) => Promise<void>;
  readonly withMockValidationOpenAiApiKey: <T>(callback: () => Promise<T>) => Promise<T>;
};

const validateAgentPathModuleUrl = new URL(
  "../../../scripts/validate-agent-path.ts",
  import.meta.url,
).href;
const {
  buildCraftDeclaredToolsPayload,
  buildCraftInlineImagePayload,
  preparePiChatCompletionsPayload,
  resolveRuntimeRequestId,
  runAliasAgentPathProof,
  waitForRuntimeModelEndpointsReady,
  withMockValidationOpenAiApiKey,
} = (await import(validateAgentPathModuleUrl)) as ValidateAgentPathModule;

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

function createDiscoveryPayload(baseUrl: string) {
  return {
    contractVersion: "role-model.downstream.openai.v1",
    kind: "openai-compatible",
    providerId: "role-model-runtime",
    displayName: "Role-Model Runtime",
    baseUrl,
    endpoints: {
      health: `${baseUrl}/healthz`,
      models: `${baseUrl}/v1/models`,
      chatCompletions: `${baseUrl}/v1/chat/completions`,
      responses: `${baseUrl}/v1/responses`,
    },
    authentication: {
      type: "bearer",
      headerName: "Authorization",
      required: false,
      placeholderToken: "role-model-local",
      note: "test placeholder",
    },
    models: [
      {
        id: "difficulty.remote-only",
        object: "model",
        owned_by: "role-model",
        type: "alias",
        endpoint_ids: ["endpoint-1"],
        targetModelIds: ["openai/gpt-4.1-mini-fast"],
        canonicalModelIds: ["openai/gpt-4.1-mini-fast"],
        providerIds: ["openai"],
        piMapping: {
          contextWindow: 120000,
          maxTokens: 8000,
        },
        modalities: {
          guaranteedInput: ["text"],
          availableInput: ["text", "image"],
          conditionalInput: {},
          output: ["text"],
        },
        capabilities: {
          guaranteed: ["text.chat"],
          available: ["text.chat", "tools.function_calling"],
          conditional: {},
          tools: { functionCalling: true },
          reasoning: { supported: true, effortControl: true },
          structuredOutput: { supported: true },
          caching: { promptRead: null, promptWrite: null, source: "unknown" },
        },
        declared: { modelIds: ["openai/gpt-4.1-mini-fast"], endpointIds: ["endpoint-1"] },
        routable: { modelIds: ["openai/gpt-4.1-mini-fast"], endpointIds: ["endpoint-1"] },
        sources: ["runtime"],
      },
    ],
    setup: {
      recommendedModel: "difficulty.remote-only",
      notes: ["Use discovery"],
    },
    freshness: {
      generatedAt: "2026-07-08T00:00:00.000Z",
      catalogVersion: "test",
    },
  };
}

async function startDiscoveryServer(): Promise<{
  readonly baseUrl: string;
  readonly close: () => Promise<void>;
}> {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/version") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ version: "test" }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/role-model/downstream/openai") {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(createDiscoveryPayload(`http://127.0.0.1:${port}`)));
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test discovery server.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

const serverClosers: Array<() => Promise<void>> = [];
const tempDirs: string[] = [];

afterEach(async () => {
  while (serverClosers.length > 0) {
    await serverClosers.pop()?.();
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) {
      continue;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

describe("validate-agent-path helper", () => {
  test("prepares a Pi alias-routed chat payload through the extension flow", async () => {
    const server = await startDiscoveryServer();
    serverClosers.push(server.close);

    const prepared = await preparePiChatCompletionsPayload({
      endpoint: server.baseUrl,
      aliasId: "difficulty.remote-only",
      prompt: "Implement a small bug fix and add a regression test.",
      clientRequestId: "pi-client-001",
      sessionId: "pi-session-001",
    });

    expect(prepared.requestPath).toBe("/v1/chat/completions");
    expect(prepared.payload).toMatchObject({
      model: "difficulty.remote-only",
      messages: [{ role: "user", content: "Implement a small bug fix and add a regression test." }],
      role_model: {
        intent: expect.objectContaining({
          role_hint_id: expect.any(String),
          task_type: expect.any(String),
        }),
      },
    });
    expect(prepared.headers).toMatchObject({
      "x-client-request-id": "pi-client-001",
      "session-id": "pi-session-001",
    });
    expect(prepared.discovery.models[0]?.id).toBe("difficulty.remote-only");
  });

  test("builds a Craft alias-routed declared-tools payload", () => {
    const payload = buildCraftDeclaredToolsPayload({
      aliasId: "difficulty.remote-only",
      prompt: "Validate the integration and preserve declared tools.",
      toolCount: 4,
    });

    expect(payload).toMatchObject({
      model: "difficulty.remote-only",
      messages: [
        expect.objectContaining({ role: "user" }),
        expect.objectContaining({
          role: "user",
          content: "Validate the integration and preserve declared tools.",
        }),
      ],
    });
    expect(payload.tools).toHaveLength(4);
  });

  test("builds a Craft alias-routed inline-image payload", () => {
    const payload = buildCraftInlineImagePayload({
      aliasId: "difficulty.remote-only",
      prompt: "Describe the attached inline image.",
    });

    expect(payload.model).toBe("difficulty.remote-only");
    expect(payload.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "Describe the attached inline image." },
          expect.objectContaining({ type: "image" }),
        ],
      },
    ]);
  });

  test("resolves runtime request ids from telemetry when observations are unavailable", async () => {
    let observationPolls = 0;
    const requestId = await resolveRuntimeRequestId({
      backend: {
        async listRecentRequestObservations() {
          observationPolls += 1;
          return [];
        },
        async listTelemetryRequests() {
          return observationPolls >= 2
            ? [
                {
                  requestId: "req-telemetry-001",
                  clientRequestId: "pi-client-telemetry-001",
                },
              ]
            : [];
        },
      },
      clientRequestId: "pi-client-telemetry-001",
      beforeRequestIds: new Set(),
      attempts: 2,
    });

    expect(requestId).toBe("req-telemetry-001");
  });

  test("temporarily seeds OPENAI_API_KEY for mock runtime validation", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const observed = await withMockValidationOpenAiApiKey(async () => process.env.OPENAI_API_KEY);
      expect(observed).toBe("runtime-vendor-validation-key");
      expect(process.env.OPENAI_API_KEY).toBeUndefined();
    } finally {
      if (previous === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previous;
      }
    }
  });

  test("waits for required runtime model endpoints to become active and healthy", async () => {
    let polls = 0;

    await waitForRuntimeModelEndpointsReady(
      {
        async listEndpoints() {
          polls += 1;
          return polls === 1
            ? [
                {
                  modelId: "openai/gpt-4.1-mini-fast",
                  status: "starting",
                  healthStatus: "healthy",
                },
              ]
            : [
                {
                  modelId: "openai/gpt-4.1-mini-fast",
                  status: "active",
                  healthStatus: "healthy",
                },
                {
                  modelId: "chatgpt/gpt-5.4",
                  status: "active",
                  healthStatus: "healthy",
                },
              ];
        },
      },
      ["openai/gpt-4.1-mini-fast", "chatgpt/gpt-5.4"],
      250,
    );

    expect(polls).toBeGreaterThan(1);
  });

  test("runs the rebuilt-runtime alias proof through canonical runtime aliases", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "run62-agent-path-test-"));
    tempDirs.push(tempRoot);

    const summary = await runAliasAgentPathProof({
      repoRoot,
      outDir: path.join(tempRoot, "evidence"),
      runtimeStateRoot: path.join(tempRoot, "runtime-state"),
      scopeId: "run62-agent-path-test",
      build: true,
    });

    expect(summary.cases).toHaveLength(6);
    expect(new Set(summary.cases.map((entry) => entry.requestedAlias))).toEqual(
      new Set(["difficulty.remote-only"]),
    );
    const casesById = new Map(summary.cases.map((entry) => [String(entry.caseId), entry]));
    const expectedEligibleEndpoints = new Set([
      "openai.litellm.global.openai-gpt-4-1-mini-fast",
      "openai.personal.openai-codex-subscription.global.gpt-5.4",
    ]);
    const expectedImageEligibleEndpoints = new Set([
      "openai.personal.openai-codex-subscription.global.gpt-5.4",
    ]);
    const imageCaseIds = new Set(["pi-chat-alias-image-001", "craft-chat-alias-inline-image-001"]);
    const expectedExecutionFactsByEndpoint = new Map([
      [
        "openai.litellm.global.openai-gpt-4-1-mini-fast",
        {
          executionFamily: "vendor-litellm",
          adapterFamily: "litellm-proxy",
          providerFamily: "openai",
          vendorId: "litellm",
        },
      ],
      [
        "openai.personal.openai-codex-subscription.global.gpt-5.4",
        {
          executionFamily: "remote-service",
          adapterFamily: "codex-subscription-responses",
          providerFamily: "openai",
          vendorId: "chatgpt-codex-responses",
        },
      ],
    ]);
    for (const caseId of [
      "pi-chat-alias-text-001",
      "pi-chat-alias-tools-001",
      "pi-chat-alias-image-001",
      "craft-chat-alias-text-001",
      "craft-chat-alias-declared-tools-001",
      "craft-chat-alias-inline-image-001",
    ]) {
      const entry = casesById.get(caseId);
      expect(entry).toMatchObject({
        requestedAlias: "difficulty.remote-only",
        statusCode: 200,
      });
      const selectedEndpointId = String(entry?.selectedEndpointId ?? "");
      const expectedCaseEligibleEndpoints = imageCaseIds.has(caseId)
        ? expectedImageEligibleEndpoints
        : expectedEligibleEndpoints;
      expect(expectedCaseEligibleEndpoints.has(selectedEndpointId)).toBe(true);
      expect(entry).toMatchObject(expectedExecutionFactsByEndpoint.get(selectedEndpointId) ?? {});
      expect(new Set((entry?.eligibleEndpointIds as readonly string[]) ?? [])).toEqual(
        expectedCaseEligibleEndpoints,
      );
    }
  }, 180_000);
});
