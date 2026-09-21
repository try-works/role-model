import { describe, expect, test } from "vitest";

import { redactOperatorSensitiveValue } from "../src/track-b-operations.js";

/**
 * Run 99 - the operator projection redacts *credentials*, not identifiers that merely contain a
 * label word. The value rule matched the literal substring `api-key`, so every endpoint id of the
 * shape `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high` reached the Learning UI as
 * `[redacted]` while `moonshot.personal.kimi-code...` rendered normally.
 */

describe("run99 operator value redaction", () => {
  test("keeps endpoint, model and route-package identifiers readable", () => {
    for (const identifier of [
      "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
      "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
      "moonshot.personal.kimi-code.global.kimi-k3",
      "baseline.decision-only",
      "route-package:candidate-local",
    ]) {
      expect(redactOperatorSensitiveValue(identifier)).toBe(identifier);
    }
  });

  test("still redacts values that are credentials", () => {
    for (const secret of [
      "sk-abcdefgh12345678",
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "api_key=abcdef123456",
      "api-key: abcdef123456",
      "apiKey=abcdef123456",
    ]) {
      expect(redactOperatorSensitiveValue(secret)).toBe("[redacted]");
    }
  });

  test("leaves ordinary prose and ids alone", () => {
    for (const value of [
      "validation-1073ba74ff550d56",
      "candidate-local",
      "holdout:98",
      "rollback",
    ]) {
      expect(redactOperatorSensitiveValue(value)).toBe(value);
    }
  });
});
