import { describe, expect, test } from "vitest";

import {
  buildDownstreamProviderGuide,
  buildProviderCards,
  buildWorkbenchModelOptions,
  summarizeRuntimeStats,
} from "./view-models";

describe("buildProviderCards", () => {
  test("turns provider variants and account state into provider cards for the onboarding page", () => {
    expect(
      buildProviderCards(
        [
          {
            providerId: "moonshotai",
            displayName: "Moonshot AI",
            variants: [
              {
                variantId: "moonshot-open-platform",
                label: "Moonshot Open Platform",
                authMode: "api-key-static",
                availability: "ready",
              },
              {
                variantId: "kimi-code",
                label: "Kimi Code",
                authMode: "oauth2-device-code",
                availability: "backend-limited",
              },
            ],
          },
        ],
        [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshotai",
          },
        ],
      ),
    ).toEqual([
      {
        providerId: "moonshotai",
        title: "Moonshot AI",
        accountCount: 1,
        variants: [
          {
            variantId: "moonshot-open-platform",
            label: "Moonshot Open Platform",
            authMode: "api-key-static",
            availability: "ready",
          },
          {
            variantId: "kimi-code",
            label: "Kimi Code",
            authMode: "oauth2-device-code",
            availability: "backend-limited",
          },
        ],
      },
    ]);
  });
});

describe("summarizeRuntimeStats", () => {
  test("creates stable dashboard stat cards from the runtime summary counts", () => {
    expect(
      summarizeRuntimeStats({
        providerCount: 3,
        accountCount: 2,
        endpointCount: 3,
      }),
    ).toEqual([
      { label: "Providers", value: "3" },
      { label: "Accounts", value: "2" },
      { label: "Endpoints", value: "3" },
    ]);
  });
});

describe("buildWorkbenchModelOptions", () => {
  test("sorts and deduplicates model options for the workbench composer", () => {
    expect(
      buildWorkbenchModelOptions([
        { id: "moonshotai/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
        { id: "openai/gpt-4.1-mini-fast", endpoint_ids: ["openai.personal.primary.us-east-1.fast"] },
        { id: "moonshotai/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
      ]),
    ).toEqual([
      { label: "Kimi K2.5", value: "moonshotai/kimi-k2.5" },
      { label: "GPT 4.1 Mini Fast", value: "openai/gpt-4.1-mini-fast" },
    ]);
  });
});

describe("buildDownstreamProviderGuide", () => {
  test("creates stable connection rows and examples for downstream OpenAI-compatible clients", () => {
    expect(
      buildDownstreamProviderGuide({
        kind: "openai-compatible",
        providerId: "role-model-runtime",
        displayName: "Role Model Runtime",
        baseUrl: "http://127.0.0.1:8091",
        endpoints: {
          health: "http://127.0.0.1:8091/healthz",
          models: "http://127.0.0.1:8091/v1/models",
          chatCompletions: "http://127.0.0.1:8091/v1/chat/completions",
        },
        authentication: {
          type: "bearer",
          headerName: "Authorization",
          required: false,
          placeholderToken: "role-model-local",
          note: "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
        },
        models: [
          {
            id: "moonshotai/kimi-k2.5",
          },
          {
            id: "openai/gpt-4.1-mini-fast",
          },
        ],
        setup: {
          recommendedModel: "moonshotai/kimi-k2.5",
          notes: [
            "Configure downstream tooling as an OpenAI-compatible provider.",
            "Use GET /v1/models to discover the current model ids.",
            "Use POST /v1/chat/completions for routed chat inference.",
          ],
        },
      }),
    ).toEqual({
      connectionRows: [
        { label: "Provider type", value: "OpenAI-compatible" },
        { label: "Base URL", value: "http://127.0.0.1:8091" },
        { label: "Models endpoint", value: "http://127.0.0.1:8091/v1/models" },
        { label: "Chat endpoint", value: "http://127.0.0.1:8091/v1/chat/completions" },
        { label: "Auth header", value: "Authorization: Bearer role-model-local" },
      ],
      availableModels: ["moonshotai/kimi-k2.5", "openai/gpt-4.1-mini-fast"],
      opencodeSteps: [
        "Choose an OpenAI-compatible provider entry in the downstream client.",
        "Set the base URL to http://127.0.0.1:8091.",
        "If the client requires an API key, use role-model-local as the bearer token.",
        "Select a model returned by http://127.0.0.1:8091/v1/models.",
      ],
      examples: {
        modelsCurl: "curl http://127.0.0.1:8091/v1/models",
        chatCurl:
          "curl http://127.0.0.1:8091/v1/chat/completions -H \"content-type: application/json\" -H \"Authorization: Bearer role-model-local\" -d '{\"model\":\"moonshotai/kimi-k2.5\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with ok.\"}]}'",
      },
    });
  });
});
