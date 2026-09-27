import { describe, expect, test } from "vitest";

import {
  isTransientProviderTransportError,
  resolveOauthDeviceHttpTimeoutMs,
} from "../src/index.js";

/**
 * Run 101 addendum 17 - the Codex Subscription device flow had no transport bound and no retry.
 *
 * Measured on `:3457` (2026-09-27T09:2xZ) while the operator's OAuth attempt failed with
 * "Codex Subscription login helper stopped before the device authorization completed":
 * `POST /api/role-model/accounts/device/start` hung for more than 60 s, and a direct Node fetch to
 * `https://auth.openai.com/api/accounts/deviceauth/usercode` failed with
 * `fetch failed | cause: ECONNRESET` after 10.8 s (once) and 71.2 s (again) while `curl` answered the same
 * endpoint in 3.0 s - the host's route to `auth.openai.com` is intermittently reset.
 *
 * The device calls (`startDeviceCodeLogin`, `readAccount`, the code exchange) had no `AbortSignal`, so a stalled
 * attempt hung until the caller gave up; and a single transient poll failure permanently marked the session
 * `failed` and cleaned up the device session, which is what the operator saw as "the helper stopped".
 */
describe("run 101 addendum 17: the device flow bounds each call and treats a reset as transient", () => {
  test("the device-call timeout defaults to thirty seconds when it is not configured", () => {
    expect(resolveOauthDeviceHttpTimeoutMs({})).toBe(30_000);
    expect(resolveOauthDeviceHttpTimeoutMs({ ROLE_MODEL_OAUTH_HTTP_TIMEOUT_MS: "" })).toBe(30_000);
    expect(resolveOauthDeviceHttpTimeoutMs({ ROLE_MODEL_OAUTH_HTTP_TIMEOUT_MS: "0" })).toBe(30_000);
    expect(resolveOauthDeviceHttpTimeoutMs({ ROLE_MODEL_OAUTH_HTTP_TIMEOUT_MS: "later" })).toBe(
      30_000,
    );
  });

  test("an explicit device-call timeout is honoured and clamped to one second - two minutes", () => {
    expect(resolveOauthDeviceHttpTimeoutMs({ ROLE_MODEL_OAUTH_HTTP_TIMEOUT_MS: "15000" })).toBe(
      15_000,
    );
    expect(resolveOauthDeviceHttpTimeoutMs({ ROLE_MODEL_OAUTH_HTTP_TIMEOUT_MS: "50" })).toBe(1_000);
    expect(resolveOauthDeviceHttpTimeoutMs({ ROLE_MODEL_OAUTH_HTTP_TIMEOUT_MS: "600000" })).toBe(
      120_000,
    );
  });

  test("a reset, timeout or refused connection is transient; a protocol error is not", () => {
    const reset = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }),
    });
    const timedOut = Object.assign(new Error("The operation was aborted due to timeout"), {
      name: "TimeoutError",
    });
    const refused = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
    });
    const badJson = new SyntaxError("Unexpected token < in JSON at position 0");

    expect(isTransientProviderTransportError(reset)).toBe(true);
    expect(isTransientProviderTransportError(timedOut)).toBe(true);
    expect(isTransientProviderTransportError(refused)).toBe(true);
    expect(isTransientProviderTransportError(badJson)).toBe(false);
    expect(isTransientProviderTransportError(new Error("device authorization expired"))).toBe(
      false,
    );
  });
});
