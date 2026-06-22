import { describe, expect, test } from "vitest";
import { createRoleModelExtension } from "../src/extension.js";

describe("Pi extension registration", () => {
  test("registers the role-model provider and one role-model command", async () => {
    const providers: Array<{ name: string; config: unknown }> = [];
    const commands: Array<{ name: string; config: unknown }> = [];
    const extension = createRoleModelExtension({
      discover: async () => ({
        discovery: {
          contractVersion: "role-model.downstream.openai.v1",
          kind: "openai-compatible",
          providerId: "role-model-runtime",
          displayName: "Role-Model Runtime",
          baseUrl: "http://127.0.0.1:3456",
          endpoints: {
            health: "http://127.0.0.1:3456/healthz",
            models: "http://127.0.0.1:3456/v1/models",
            chatCompletions: "http://127.0.0.1:3456/v1/chat/completions",
            responses: "http://127.0.0.1:3456/v1/responses",
          },
          authentication: {
            type: "bearer",
            headerName: "Authorization",
            required: false,
            placeholderToken: "role-model-local",
            note: "placeholder only",
          },
          models: [
            {
              id: "role-model/auto",
              object: "model",
              owned_by: "role-model",
              endpoint_ids: ["local"],
              type: "alias",
              piMapping: { contextWindow: 120000, maxTokens: 8000 },
              sources: ["runtime"],
            },
          ],
          setup: { recommendedModel: "role-model/auto", notes: [] },
          freshness: {
            generatedAt: "2026-06-22T00:00:00Z",
            catalogVersion: "test",
            catalogCapturedAt: null,
            runtimeConfigHash: "test",
          },
        },
      }),
    });

    await extension({
      registerProvider(name: string, config: unknown) {
        providers.push({ name, config });
      },
      registerCommand(name: string, config: unknown) {
        commands.push({ name, config });
      },
    });

    expect(providers).toEqual([expect.objectContaining({ name: "role-model" })]);
    expect(commands).toHaveLength(1);
    expect(commands[0]?.name).toBe("role-model");
    expect(commands[0]?.config).toEqual(
      expect.objectContaining({
        handler: expect.any(Function),
      }),
    );
    expect(commands[0]?.config).not.toEqual(
      expect.objectContaining({
        run: expect.any(Function),
      }),
    );
  });
});
