import { describe, expect, test } from "vitest";
import { assessEndpointTrust, createRoleModelConfig } from "../src/config.js";

describe("Role-Model package configuration and endpoint trust", () => {
  test("defaults to the local Role-Model runtime endpoint", () => {
    expect(createRoleModelConfig({}, {}).endpoint).toBe("http://127.0.0.1:3456");
  });

  test("normalizes explicit and environment endpoint configuration", () => {
    expect(createRoleModelConfig({ endpoint: "http://127.0.0.1:3456/" }, {}).endpoint).toBe(
      "http://127.0.0.1:3456",
    );
    expect(
      createRoleModelConfig({}, { ROLE_MODEL_ENDPOINT: "http://localhost:4567/" }).endpoint,
    ).toBe("http://localhost:4567");
  });

  test("allows loopback endpoints by default", () => {
    expect(assessEndpointTrust("http://localhost:3456")).toMatchObject({
      allowed: true,
      remote: false,
    });
    expect(assessEndpointTrust("http://[::1]:3456")).toMatchObject({
      allowed: true,
      remote: false,
    });
  });

  test("blocks remote endpoints until allowRemote and trusted context are explicit", () => {
    expect(assessEndpointTrust("https://role-model.example.test")).toMatchObject({
      allowed: false,
      remote: true,
      code: "remote-blocked",
    });
    expect(
      assessEndpointTrust("https://role-model.example.test", {
        allowRemote: true,
        isProjectTrusted: () => false,
      }),
    ).toMatchObject({
      allowed: false,
      remote: true,
      code: "remote-untrusted",
    });
    expect(
      assessEndpointTrust("https://role-model.example.test", {
        allowRemote: true,
        isProjectTrusted: () => true,
      }),
    ).toMatchObject({
      allowed: true,
      remote: true,
    });
  });
});
