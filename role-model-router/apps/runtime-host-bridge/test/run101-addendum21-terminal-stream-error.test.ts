import { describe, expect, test } from "vitest";

import { buildTerminalStreamErrorPayload } from "../src/index.js";

/**
 * Run 101 addendum 21 - a stream that dies after content was delivered must end with a named terminal frame.
 *
 * Measured on RC `6f769013` (2026-09-27 ~20:2x): two of six alias streams delivered 389 and 789 chunks (118 KB /
 * 239 KB) and then ended with no `finish_reason` and no `[DONE]`. The provider connection died mid-answer; no proxy
 * can replay content the client already holds, so the router's duty is to fail cleanly and by name - what pi
 * reports today is a bare "Stream ended without finish_reason".
 */
describe("run 101 addendum 21: a broken stream ends with a named terminal frame", () => {
  test("a classified upstream failure names its class and status", () => {
    const payload = buildTerminalStreamErrorPayload(
      Object.assign(new Error("terminated"), {
        errorClass: "upstream_connection_error",
        statusCode: 502,
      }),
    );
    expect(payload.error.message).toBe("terminated");
    expect(payload.error.type).toBe("upstream_connection_error");
    expect(payload.error.code).toBe("upstream_connection_error");
    expect(payload.error.statusCode).toBe(502);
  });

  test("an unclassified error still yields a bounded, named frame", () => {
    const payload = buildTerminalStreamErrorPayload(new Error("socket closed"));
    expect(payload.error.message).toBe("socket closed");
    expect(payload.error.type).toBe("upstream_error");
    expect(payload.error.code).toBe("upstream_error");
    expect(payload.error.statusCode).toBeUndefined();
  });

  test("a non-error value falls back to a bounded message", () => {
    const payload = buildTerminalStreamErrorPayload(undefined);
    expect(payload.error.message.length).toBeGreaterThan(0);
    expect(payload.error.type).toBe("upstream_error");
  });
});
