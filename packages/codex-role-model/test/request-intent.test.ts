import { describe, expect, test } from "vitest";
import { injectRoleModelIntentIntoPayload } from "../src/request-intent.js";

describe("responses intent inject", () => {
  test("injects role_model.intent for responses input when absent", () => {
    const payload = {
      model: "baseline.remote-only",
      input: "Write a short TypeScript helper.",
    };
    const next = injectRoleModelIntentIntoPayload(payload, new Set(["baseline.remote-only"])) as {
      role_model?: { intent?: unknown };
    };
    expect(next.role_model?.intent).toBeTruthy();
  });

  test("preserves existing role_model.intent", () => {
    const payload = {
      model: "baseline.remote-only",
      input: "hello",
      role_model: { intent: { preserved: true } },
    };
    const next = injectRoleModelIntentIntoPayload(payload, new Set(["baseline.remote-only"])) as {
      role_model: { intent: { preserved?: boolean } };
    };
    expect(next.role_model.intent.preserved).toBe(true);
  });

  test("skips non-alias models", () => {
    const payload = { model: "gpt-4o", input: "hello" };
    const next = injectRoleModelIntentIntoPayload(payload, new Set(["baseline.remote-only"]));
    expect(next).toEqual(payload);
  });
});
