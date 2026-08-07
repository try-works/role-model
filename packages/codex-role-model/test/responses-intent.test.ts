import { describe, expect, test } from "vitest";
import { injectRoleModelIntentIntoResponsesPayload } from "../src/responses-intent.js";

describe("Responses API intent injection", () => {
  test("injects role_model.intent for discovered alias with Responses input", () => {
    const payload = {
      model: "baseline.remote-only",
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "Fix this bug and add a test." }] }],
    };
    const result = injectRoleModelIntentIntoResponsesPayload(
      payload,
      new Set(["baseline.remote-only"]),
    ) as Record<string, unknown>;
    expect(result).not.toBe(payload);
    expect(result.role_model).toBeTruthy();
  });

  test("preserves existing role_model.intent", () => {
    const payload = {
      model: "baseline.remote-only",
      role_model: { intent: { source: "explicit_user" } },
      input: "hello",
    };
    expect(
      injectRoleModelIntentIntoResponsesPayload(payload, new Set(["baseline.remote-only"])),
    ).toBe(payload);
  });

  test("skips non role-model aliases", () => {
    const payload = { model: "gpt-4o", input: "hello" };
    expect(injectRoleModelIntentIntoResponsesPayload(payload, new Set(["baseline.remote-only"]))).toBe(
      payload,
    );
  });
});
