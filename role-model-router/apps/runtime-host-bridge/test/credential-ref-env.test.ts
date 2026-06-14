import { describe, expect, test } from "vitest";

import {
  looksLikeInlineApiKey,
  resolveEnvCredentialRef,
} from "../src/credential-ref-env.js";

describe("resolveEnvCredentialRef", () => {
  test("uses explicit env placeholder name from ${DEEPSEEK_API_KEY}", () => {
    expect(resolveEnvCredentialRef("${DEEPSEEK_API_KEY}", "DEEPSEEK_API_KEY")).toEqual({
      backend: "env",
      ref: "DEEPSEEK_API_KEY",
    });
  });

  test("falls back to provider env name when api key ref is missing", () => {
    expect(resolveEnvCredentialRef(null, "DEEPSEEK_API_KEY")).toEqual({
      backend: "env",
      ref: "DEEPSEEK_API_KEY",
    });
  });

  test("never stores inline sk- secrets as credential ref", () => {
    expect(
      resolveEnvCredentialRef("sk-inline-test-key-do-not-persist", "DEEPSEEK_API_KEY"),
    ).toEqual({
      backend: "env",
      ref: "DEEPSEEK_API_KEY",
    });
  });

  test("preserves non-secret sentinel values such as none", () => {
    expect(resolveEnvCredentialRef("none", "MOONSHOT_API_KEY")).toEqual({
      backend: "env",
      ref: "none",
    });
  });
});

describe("looksLikeInlineApiKey", () => {
  test("detects sk- prefixed inline keys", () => {
    expect(looksLikeInlineApiKey("sk-inline-test-key")).toBe(true);
  });

  test("does not treat env placeholders as inline keys", () => {
    expect(looksLikeInlineApiKey("${DEEPSEEK_API_KEY}")).toBe(false);
  });
});
