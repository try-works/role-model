import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test, vi } from "vitest";
import { type RuntimeBridgeBackend, createRuntimeBridgeBackend } from "../src/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const roots: string[] = [];
const servers: ReturnType<typeof createServer>[] = [];
const backends: RuntimeBridgeBackend[] = [];
const modelId = "deepseek/deepseek-v4-pro";
const explicitToken = "synthetic-explicit-credential-000000";
const envToken = "synthetic-environment-credential-0000";
type Call = {
  route: string;
  method: string;
  authenticated: boolean;
  body: Record<string, unknown>;
  context: unknown[];
};

async function operationsServer(token: string, captureStatus = 200) {
  const calls: Call[] = [];
  let capture: Record<string, unknown> | undefined;
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    // Store only authentication success, never the bearer credential.
    const authenticated = request.headers.authorization === `Bearer ${token}`;
    calls.push({
      route: request.url ?? "",
      method: request.method ?? "",
      authenticated,
      body,
      context: [
        request.headers["x-role-model-channel"],
        request.headers["x-role-model-scope"],
        request.headers["x-role-model-authorization-epoch"],
      ],
    });
    let status = authenticated ? 200 : 401;
    let result: Record<string, unknown> = { status: "accepted" };
    if (!authenticated) result = { error: "test authentication refused" };
    else if (request.url === "/capture/route") {
      status = captureStatus;
      if (status === 200) capture = body;
      result =
        status === 200 ? { status: "captured" } : { error: "test capture service unavailable" };
    } else if (request.url === "/capture/read") {
      status = capture ? 200 : 409;
      result = capture
        ? {
            requestId: capture.requestId,
            routingDecisionId: capture.routingDecisionId,
            endpointId: capture.endpointId,
            modelId: capture.modelId,
            scope: "test-service-owned-scope",
            messages: [],
            tools: [],
          }
        : { error: `unknown route capture ${body.requestId}` };
    }
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(result));
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  return { endpoint: `http://127.0.0.1:${address.port}`, calls };
}

async function actualBackend(
  options: { trackBOperationsEndpoint?: string; trackBOperationsToken?: string } = {},
) {
  const parent = process.env.ROLE_MODEL_TEST_TEMP_ROOT?.trim() || os.tmpdir();
  await mkdir(parent, { recursive: true });
  const runtimeStateRoot = await mkdtemp(path.join(parent, "run105-context-"));
  roots.push(runtimeStateRoot);
  let providerCalls = 0;
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    runtimeStateRoot,
    scopeId: "run105-operations-context",
    runtimeChannel: "development",
    runtimeVendorStartup: "disabled",
    // No fixtureRoot: exercise the actual backend/client. All provider traffic is intercepted.
    providerCredentialEnvironment: { RUN105_TEST_KEY: "synthetic-provider-key" },
    networkFetcher: async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const probe = body.messages?.[0]?.content === "role-model admission readiness probe";
      if (!probe) providerCalls += 1;
      return new Response(
        JSON.stringify(
          probe
            ? {
                id: "test-probe",
                object: "chat.completion",
                choices: [
                  {
                    index: 0,
                    message: { role: "assistant", content: "ready" },
                    finish_reason: "stop",
                  },
                ],
              }
            : {
                error: {
                  message: "test primary balance exhausted",
                  type: "unknown_error",
                  code: "invalid_request_error",
                },
              },
        ),
        { status: probe ? 200 : 402, headers: { "content-type": "application/json" } },
      );
    },
    ...options,
  });
  backends.push(backend);
  await backend.upsertProviderAccount({
    providerAccountId: "deepseek.personal.run105-context",
    providerId: "deepseek",
    providerKind: "provider-openai",
    orgScope: "personal",
    accountScope: "workspace-default",
    credentialRef: { backend: "env", ref: "RUN105_TEST_KEY" },
    authMode: "api-key-static",
    regionPolicy: { mode: "prefer", regions: ["global"] },
    baseUrlOverride: "https://api.deepseek.com/v1",
    allowedModels: [modelId],
    modelRoleBindings: [
      { modelId, roleAssignmentMode: "all", roleIds: [], enabledRoleIds: [], disabledRoleIds: [] },
    ],
    deniedModels: [],
    entitlementTags: ["chat"],
    budgetPolicyRef: "budget.default",
    quotaPolicyRef: "quota.default",
    status: "active",
    healthStatus: "healthy",
    rotationState: "stable",
  });
  const endpoint = await backend.activateEndpoint({
    providerAccountId: "deepseek.personal.run105-context",
    modelId,
    region: "global",
  });
  return { backend, endpointId: endpoint.endpointId, providerCalls: () => providerCalls };
}

async function providerFailure(backend: RuntimeBridgeBackend, requestId: string) {
  await expect(
    backend.executeChatCompletions(
      { model: modelId, messages: [{ role: "user", content: "synthetic context test" }] },
      requestId,
    ),
  ).rejects.toMatchObject({
    statusCode: 402,
    errorClass: "execution_failed",
    message: expect.stringContaining("test primary balance exhausted"),
  });
  expect(
    (await backend.listTelemetryRequests()).find((row) => row.requestId === requestId),
  ).toMatchObject({ requestId, statusCode: 402, errorClass: "execution_failed" });
}

afterEach(async () => {
  await Promise.all(backends.splice(0).map((backend) => backend.shutdown()));
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        }),
    ),
  );
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.unstubAllEnvs();
});

// GREEN characterization: the local constructor wrapper already binds options.
// No invented RED, production repair, artifact preservation, or policy-denial claim.
describe("Run 105 actual backend operations context", () => {
  test.each(["options-only", "options-over-distinct-env", "env-fallback"] as const)(
    "capture/read select authoritative endpoint and token: %s",
    async (mode) => {
      const selected = await operationsServer(mode === "env-fallback" ? envToken : explicitToken);
      const decoy = await operationsServer(envToken);
      vi.stubEnv(
        "ROLE_MODEL_TRACK_B_OPERATIONS_URL",
        mode === "options-only"
          ? undefined
          : mode === "env-fallback"
            ? `  ${selected.endpoint}  `
            : decoy.endpoint,
      );
      vi.stubEnv(
        "ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN",
        mode === "options-only" ? undefined : envToken,
      );
      const runtime = await actualBackend(
        mode === "env-fallback"
          ? {}
          : { trackBOperationsEndpoint: selected.endpoint, trackBOperationsToken: explicitToken },
      );
      const requestId = `run105-context-${mode}`;
      await providerFailure(runtime.backend, requestId);
      expect(runtime.providerCalls()).toBe(1);
      await expect(runtime.backend.readCaptureEvidence(requestId)).resolves.toMatchObject({
        status: "ok",
        requestId,
        scope: "test-service-owned-scope",
        endpointId: runtime.endpointId,
        modelId,
      });
      const capture = selected.calls.find((call) => call.route === "/capture/route");
      const read = selected.calls.find((call) => call.route === "/capture/read");
      expect(capture).toMatchObject({
        method: "POST",
        authenticated: true,
        body: {
          requestId,
          endpointId: runtime.endpointId,
          modelId,
          routingDecisionId: expect.any(String),
          failure: { statusCode: 402, errorClass: "execution_failed" },
          providerExecutions: [
            {
              attemptId: `attempt:${requestId}:failure`,
              providerId: "deepseek",
              statusCode: 402,
            },
          ],
        },
      });
      expect(read).toMatchObject({ method: "POST", authenticated: true, body: { requestId } });
      // Capture uses bearer auth; channel/scope/epoch headers belong to operator routes only.
      expect(capture?.context).toEqual([undefined, undefined, undefined]);
      expect(decoy.calls).toHaveLength(0);
      expect(selected.calls.every((call) => call.authenticated)).toBe(true);
      expect(JSON.stringify(selected.calls).includes(explicitToken)).toBe(false);
      expect(JSON.stringify(selected.calls).includes(envToken)).toBe(false);
    },
  );

  test("capture unavailability cannot replace the primary provider error", async () => {
    const selected = await operationsServer(explicitToken, 503);
    vi.stubEnv("ROLE_MODEL_TRACK_B_OPERATIONS_URL", undefined);
    vi.stubEnv("ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN", undefined);
    const runtime = await actualBackend({
      trackBOperationsEndpoint: selected.endpoint,
      trackBOperationsToken: explicitToken,
    });
    await providerFailure(runtime.backend, "run105-context-unavailable");
    expect(selected.calls.find((call) => call.route === "/capture/route")).toMatchObject({
      authenticated: true,
    });
    await expect(
      runtime.backend.readCaptureEvidence("run105-context-unavailable"),
    ).resolves.toMatchObject({ status: "missing" });
  });

  test("an explicitly invalid token never borrows the environment credential", async () => {
    const selected = await operationsServer(envToken);
    vi.stubEnv("ROLE_MODEL_TRACK_B_OPERATIONS_URL", selected.endpoint);
    vi.stubEnv("ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN", envToken);
    const runtime = await actualBackend({
      trackBOperationsEndpoint: selected.endpoint,
      trackBOperationsToken: "",
    });
    await providerFailure(runtime.backend, "run105-context-invalid-token");
    await expect(
      runtime.backend.readCaptureEvidence("run105-context-invalid-token"),
    ).resolves.toMatchObject({
      status: "unreadable",
      reason: expect.stringContaining("launcher-issued authentication token"),
    });
    expect(selected.calls).toHaveLength(0);
  });
});
