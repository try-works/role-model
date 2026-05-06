import { describe, expect, test } from "vitest";

import {
  getDeviceAuthorizationPollDelayMs,
  resolveVerificationWindowUrl,
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
