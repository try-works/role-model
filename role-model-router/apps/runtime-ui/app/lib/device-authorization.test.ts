import { describe, expect, test, vi } from "vitest";

import {
  getDeviceAuthorizationPollDelayMs,
  restorePersistedDeviceAuthorization,
  resolveVerificationWindowUrl,
  syncConnectedDeviceAuthorizationEndpoints,
  shouldAutoPollDeviceAuthorization,
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
