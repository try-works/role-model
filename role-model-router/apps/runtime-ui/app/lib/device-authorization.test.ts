import { describe, expect, test, vi } from "vitest";

import {
  getDeviceAuthorizationPollDelayMs,
  isCodexSubscriptionDeviceAuthorization,
  resolveVerificationWindowUrl,
  restorePersistedDeviceAuthorization,
  shouldAutoOpenDeviceAuthorizationWindow,
  shouldAutoPollDeviceAuthorization,
  shouldFallbackToCurrentBrowserForDeviceAuthorization,
  syncConnectedDeviceAuthorizationEndpoints,
} from "./device-authorization";

describe("resolveVerificationWindowUrl", () => {
  test("prefers the complete verification URL when it is available", () => {
    expect(
      resolveVerificationWindowUrl({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
        verificationUri: "https://www.kimi.com/code/authorize_device",
        verificationUriComplete: "https://www.kimi.com/code/authorize_device?user_code=ABCD-EFGH",
      }),
    ).toBe("https://www.kimi.com/code/authorize_device?user_code=ABCD-EFGH");
  });

  test("falls back to the base verification URL when the complete URL is missing", () => {
    expect(
      resolveVerificationWindowUrl({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
        verificationUri: "https://www.kimi.com/code/authorize_device",
      }),
    ).toBe("https://www.kimi.com/code/authorize_device");
  });

  test("returns null when neither verification URL is present", () => {
    expect(
      resolveVerificationWindowUrl({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
      }),
    ).toBeNull();
  });
});

describe("shouldAutoPollDeviceAuthorization", () => {
  test("continues polling while the device-auth session is pending", () => {
    expect(
      shouldAutoPollDeviceAuthorization({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
      }),
    ).toBe(true);
  });

  test("stops polling once the device-auth session is connected", () => {
    expect(
      shouldAutoPollDeviceAuthorization({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "connected",
      }),
    ).toBe(false);
  });
});

describe("shouldAutoOpenDeviceAuthorizationWindow", () => {
  test("keeps Codex Subscription in-app so the user can copy the device code first", () => {
    expect(
      shouldAutoOpenDeviceAuthorizationWindow({
        providerId: "openai",
        variantId: "openai-codex-subscription",
      }),
    ).toBe(false);
  });

  test("still auto-opens device auth providers that return complete browser URLs", () => {
    expect(
      shouldAutoOpenDeviceAuthorizationWindow({
        providerId: "moonshot",
        variantId: "kimi-code",
      }),
    ).toBe(true);
  });
});

describe("isCodexSubscriptionDeviceAuthorization", () => {
  test("recognizes the OpenAI Codex Subscription variant", () => {
    expect(
      isCodexSubscriptionDeviceAuthorization({
        providerId: "openai",
        variantId: "openai-codex-subscription",
      }),
    ).toBe(true);
  });

  test("does not treat other device-auth providers as Codex Subscription", () => {
    expect(
      isCodexSubscriptionDeviceAuthorization({
        providerId: "moonshot",
        variantId: "kimi-code",
      }),
    ).toBe(false);
  });
});

describe("shouldFallbackToCurrentBrowserForDeviceAuthorization", () => {
  test("does not fall back to the current browser context for Codex Subscription", () => {
    expect(
      shouldFallbackToCurrentBrowserForDeviceAuthorization({
        providerId: "openai",
        variantId: "openai-codex-subscription",
      }),
    ).toBe(false);
  });

  test("still allows browser-context fallback for standard device-auth providers", () => {
    expect(
      shouldFallbackToCurrentBrowserForDeviceAuthorization({
        providerId: "moonshot",
        variantId: "kimi-code",
      }),
    ).toBe(true);
  });
});

describe("getDeviceAuthorizationPollDelayMs", () => {
  test("uses the provider interval when it is present", () => {
    expect(
      getDeviceAuthorizationPollDelayMs({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
        intervalSeconds: 7,
      }),
    ).toBe(7000);
  });

  test("falls back to a safe default interval when the session omits it", () => {
    expect(
      getDeviceAuthorizationPollDelayMs({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
      }),
    ).toBe(5000);
  });
});

describe("syncConnectedDeviceAuthorizationEndpoints", () => {
  test("activates each selected model once after device OAuth connects", async () => {
    const activateEndpoint = vi.fn().mockResolvedValue(undefined);

    await syncConnectedDeviceAuthorizationEndpoints({
      session: {
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "connected",
      },
      selectedModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.5", "moonshot/kimi-audio"],
      activateEndpoint,
    });

    expect(activateEndpoint).toHaveBeenCalledTimes(2);
    expect(activateEndpoint).toHaveBeenNthCalledWith(1, {
      providerAccountId: "moonshot.personal.kimi-code",
      modelId: "moonshot/kimi-k2.5",
      region: "global",
    });
    expect(activateEndpoint).toHaveBeenNthCalledWith(2, {
      providerAccountId: "moonshot.personal.kimi-code",
      modelId: "moonshot/kimi-audio",
      region: "global",
    });
  });

  test("skips endpoint activation until the device-auth session is connected", async () => {
    const activateEndpoint = vi.fn().mockResolvedValue(undefined);

    await syncConnectedDeviceAuthorizationEndpoints({
      session: {
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
      },
      selectedModels: ["moonshot/kimi-k2.5"],
      activateEndpoint,
    });

    expect(activateEndpoint).not.toHaveBeenCalled();
  });

  test("activates endpoints for connected Codex Subscription sessions", async () => {
    const activateEndpoint = vi.fn().mockResolvedValue(undefined);

    await syncConnectedDeviceAuthorizationEndpoints({
      session: {
        authRequestId: "auth-001",
        providerAccountId: "openai.personal.codex-subscription",
        providerId: "openai",
        variantId: "openai-codex-subscription",
        status: "connected",
      },
      selectedModels: ["chatgpt/gpt-5.3-codex"],
      activateEndpoint,
    });

    expect(activateEndpoint).toHaveBeenCalledTimes(1);
    expect(activateEndpoint).toHaveBeenCalledWith({
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "chatgpt/gpt-5.3-codex",
      region: "global",
    });
  });
});

describe("restorePersistedDeviceAuthorization", () => {
  test("restores a pending persisted device-auth session for the selected provider account", () => {
    expect(
      restorePersistedDeviceAuthorization({
        current: null,
        providerAccountId: "moonshot.personal.kimi-code",
        persistedSessions: [
          {
            authRequestId: "auth-001",
            providerAccountId: "moonshot.personal.kimi-code",
            providerId: "moonshot",
            variantId: "kimi-code",
            status: "pending",
            userCode: "ABCD-EFGH",
            verificationUriComplete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
          },
        ],
      }),
    ).toEqual({
      authRequestId: "auth-001",
      providerAccountId: "moonshot.personal.kimi-code",
      providerId: "moonshot",
      variantId: "kimi-code",
      status: "pending",
      userCode: "ABCD-EFGH",
      verificationUriComplete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
    });
  });

  test("does not auto-restore a persisted session when restore is suppressed for manual selection changes", () => {
    expect(
      restorePersistedDeviceAuthorization({
        current: null,
        providerAccountId: "openai.personal.codex-subscription",
        persistedSessions: [
          {
            authRequestId: "auth-001",
            providerAccountId: "openai.personal.codex-subscription",
            providerId: "openai",
            variantId: "openai-codex-subscription",
            status: "pending",
            userCode: "STALE-CODE",
          },
        ],
        allowPersistedRestore: false,
      }),
    ).toBeNull();
  });

  test("preserves the current session when it already matches the selected provider account", () => {
    expect(
      restorePersistedDeviceAuthorization({
        current: {
          authRequestId: "auth-current",
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          variantId: "kimi-code",
          status: "pending",
          userCode: "LIVE-CODE",
        },
        providerAccountId: "moonshot.personal.kimi-code",
        persistedSessions: [
          {
            authRequestId: "auth-001",
            providerAccountId: "moonshot.personal.kimi-code",
            providerId: "moonshot",
            variantId: "kimi-code",
            status: "pending",
            userCode: "ABCD-EFGH",
          },
        ],
      }),
    ).toEqual({
      authRequestId: "auth-current",
      providerAccountId: "moonshot.personal.kimi-code",
      providerId: "moonshot",
      variantId: "kimi-code",
      status: "pending",
      userCode: "LIVE-CODE",
    });
  });
});
