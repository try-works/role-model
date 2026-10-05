import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test, vi } from "vitest";

const persistence = vi.hoisted(() => ({ persist: vi.fn() }));
vi.mock("@role-model-router/sqlite-memory", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, persistRuntimeTelemetryFailure: persistence.persist };
});
import { createRuntimeBridgeBackend } from "../src/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
afterEach(() => {
  persistence.persist.mockReset();
  vi.restoreAllMocks();
});

async function createBackend() {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run105-r15-primary-"));
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot: path.join(repoRoot, "role-model-router/apps/runtime-host-bridge/test/fixtures"),
    runtimeStateRoot,
    scopeId: "r15-primary",
    codexAuthAdapter: {
      startDeviceCodeLogin: async () => ({
        loginId: "r15-login",
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "R15",
        wsUrl: "ws://127.0.0.1:4596",
        pid: 4596,
      }),
      readAccount: async ({ codexHome }) => {
        await mkdir(codexHome, { recursive: true });
        await writeFile(
          path.join(codexHome, "auth.json"),
          JSON.stringify({
            auth_mode: "chatgpt",
            tokens: {
              access_token: "test-access",
              refresh_token: "test-refresh",
              account_id: "r15-account",
            },
            last_refresh: "2026-07-06T09:30:00.000Z",
          }),
        );
        return {
          account: { type: "chatgpt", email: "r15@example.com", planType: "pro" },
          requiresOpenaiAuth: true,
        };
      },
    },
    codexExecutionAdapter: {
      executeRequest: async ({ requestId }) =>
        requestId.startsWith("admission-")
          ? {
              statusCode: 200,
              body: {
                id: requestId,
                choices: [
                  {
                    index: 0,
                    finish_reason: "stop",
                    message: { role: "assistant", content: "ready" },
                  },
                ],
              },
            }
          : {
              statusCode: 422,
              body: {
                error: {
                  message: "Original provider contract rejection",
                  type: "invalid_request",
                  code: "invalid_request",
                },
              },
            },
    },
  });
  const pending = await backend.startProviderDeviceAuthorization({
    providerAccountId: "openai.personal.codex-subscription",
    providerId: "openai",
    providerKind: "provider-openai",
    variantId: "openai-codex-subscription",
    orgScope: "personal",
    accountScope: "workspace-default",
    allowedModels: ["chatgpt/gpt-5.4"],
    deniedModels: [],
    entitlementTags: ["chat"],
    budgetPolicyRef: "budget.default",
    quotaPolicyRef: "quota.default",
  });
  await backend.pollProviderDeviceAuthorization({ authRequestId: pending.authRequestId });
  await backend.activateEndpoint({
    providerAccountId: "openai.personal.codex-subscription",
    modelId: "chatgpt/gpt-5.4",
    region: "global",
  });
  return {
    backend,
    async close() {
      await backend.shutdown?.();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    },
  };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected primary execution rejection");
}

describe("run105 R15 primary failure isolation", () => {
  // Both storage layers throw through this shared synchronous seam. These are injected
  // faults, not a claim that real graph I/O or SQLite failure integration is covered.
  test.each(["graph", "sqlite"])(
    "routed provider status/class/request survive injected secondary %s persistence failure",
    async (layer) => {
      const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
      const secondary = new Error(`${layer}: SECRET_PROVIDER_PAYLOAD ${"秘密🚨".repeat(20_000)}`);
      persistence.persist.mockImplementation(() => {
        throw secondary;
      });
      const runtime = await createBackend();
      try {
        const requestId = `req-r15-${layer}`;
        const error = await rejection(
          runtime.backend.executeChatCompletions(
            {
              model: "chatgpt/gpt-5.4",
              messages: [{ role: "user", content: "Reject this request" }],
            },
            requestId,
          ),
        );
        expect((error as { statusCode?: number }).statusCode).toBe(422);
        expect(error).toMatchObject({
          errorClass: "execution_failed",
          message: "Original provider contract rejection",
        });
        expect(error).not.toBe(secondary);
        expect(persistence.persist).toHaveBeenCalledWith(
          expect.objectContaining({ requestId, statusCode: 422, errorClass: "execution_failed" }),
        );
        // Failed routed persistence must not mark the primary error persisted: the outer catch retries telemetry.
        expect(persistence.persist).toHaveBeenCalledTimes(2);
        expect(diagnostic).toHaveBeenCalled();
        for (const args of diagnostic.mock.calls) {
          expect(args).toHaveLength(1);
          expect(typeof args[0]).toBe("string");
          expect(Buffer.byteLength(String(args[0]), "utf8")).toBeLessThanOrEqual(256);
          expect(String(args[0])).not.toContain("SECRET_PROVIDER_PAYLOAD");
        }
      } finally {
        await runtime.close();
      }
    },
  );

  test("successful routed persistence marks the primary error and avoids duplicate outer persistence", async () => {
    persistence.persist.mockImplementation(() => {});
    const runtime = await createBackend();
    try {
      const error = await rejection(
        runtime.backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "Reject this request" }],
          },
          "req-r15-success",
        ),
      );
      expect(error).toMatchObject({ statusCode: 422, errorClass: "execution_failed" });
      expect(persistence.persist).toHaveBeenCalledTimes(1);
      expect(persistence.persist).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "req-r15-success",
          statusCode: 422,
          errorClass: "execution_failed",
        }),
      );
    } finally {
      await runtime.close();
    }
  });

  test("pre-execution input error survives secondary persistence failure unchanged", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = await createBackend();
    try {
      const body = {
        model: "does-not-exist",
        messages: [{ role: "user" as const, content: "No route" }],
      };
      persistence.persist.mockImplementation(() => {});
      const original = await rejection(
        runtime.backend.executeChatCompletions(body, "req-r15-before"),
      );
      persistence.persist.mockClear();
      persistence.persist.mockImplementation(() => {
        throw new Error("SQLite SECRET_PROVIDER_PAYLOAD");
      });
      const error = await rejection(runtime.backend.executeChatCompletions(body, "req-r15-after"));
      expect((error as { statusCode?: number }).statusCode).toBe(
        (original as { statusCode: number }).statusCode,
      );
      expect(error).toMatchObject({
        message: (original as Error).message,
        body: (original as { body: unknown }).body,
      });
      expect(persistence.persist).toHaveBeenCalledTimes(1);
      expect(persistence.persist).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: "req-r15-after" }),
      );
      expect(diagnostic).toHaveBeenCalled();
    } finally {
      await runtime.close();
    }
  });
});
