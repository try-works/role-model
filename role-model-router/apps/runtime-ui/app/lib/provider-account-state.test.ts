import { describe, expect, test } from "vitest";

import { resolveProviderAccountLifecycle } from "./provider-account-state";

describe("resolveProviderAccountLifecycle", () => {
  test("preserves a previously degraded API-key account when the credential reference is still unresolved", () => {
    expect(
      resolveProviderAccountLifecycle({
        authMode: "api-key-static",
        providerAccountId: "moonshot.personal.primary",
        oauthState: null,
        existingAccount: {
          providerAccountId: "moonshot.personal.primary",
          authMode: "api-key-static",
          status: "disabled",
          healthStatus: "credentials-missing",
          rotationState: "not-required",
        },
      }),
    ).toEqual({
      status: "disabled",
      healthStatus: "credentials-missing",
      rotationState: "not-required",
    });
  });

  test("preserves a previously connected OAuth account when the page reloads without oauthState", () => {
    expect(
      resolveProviderAccountLifecycle({
        authMode: "oauth2-device-code",
        providerAccountId: "moonshot.personal.kimi-code",
        oauthState: null,
        existingAccount: {
          providerAccountId: "moonshot.personal.kimi-code",
          authMode: "oauth2-device-code",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      }),
    ).toEqual({
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });
  });
});
