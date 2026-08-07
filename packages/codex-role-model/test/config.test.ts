import { describe, expect, test } from "vitest";
import {
  adapterBaseUrl,
  assessEndpointTrust,
  createRoleModelConfig,
  DEFAULT_CODEX_ADAPTER_PORT,
} from "../src/config.js";

describe("codex-role-model configuration and endpoint trust", () => {
  test("defaults to local runtime endpoint and adapter port 3460", () => {
    const config = createRoleModelConfig({}, {});
    expect(config.endpoint).toBe("http://127.0.0.1:3456");
    expect(config.adapterPort).toBe(DEFAULT_CODEX_ADAPTER_PORT);
    expect(adapterBaseUrl(config.adapterPort)).toBe("http://127.0.0.1:3460/v1");
  });

  test("reads ROLE_MODEL_CODEX_ADAPTER_PORT override", () => {
    expect(
      createRoleModelConfig({}, { ROLE_MODEL_CODEX_ADAPTER_PORT: "3471" }).adapterPort,
    ).toBe(3471);
  });

  test("allows loopback and blocks remote without allow-remote", () => {
    expect(assessEndpointTrust("http://127.0.0.1:3456")).toMatchObject({
      allowed: true,
      remote: false,
    });
    expect(assessEndpointTrust("https://role-model.example.test")).toMatchObject({
      allowed: false,
      code: "remote-blocked",
    });
    expect(
      assessEndpointTrust("https://role-model.example.test", { allowRemote: true }),
    ).toMatchObject({ allowed: true, code: "remote-allowed" });
  });
});
