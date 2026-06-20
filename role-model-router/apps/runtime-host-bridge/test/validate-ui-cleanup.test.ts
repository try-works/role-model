import { describe, expect, test, vi } from "vitest";

import { cleanupRuntimeUiValidationResources } from "../src/validate-ui.js";

describe("cleanupRuntimeUiValidationResources", () => {
  test("closes the bridge server and then shuts down the backend", async () => {
    const steps: string[] = [];
    const server = {
      close: vi.fn(async () => {
        steps.push("server");
      }),
    };
    const backend = {
      shutdown: vi.fn(async () => {
        steps.push("backend");
      }),
    };

    await cleanupRuntimeUiValidationResources({ server, backend });

    expect(server.close).toHaveBeenCalledOnce();
    expect(backend.shutdown).toHaveBeenCalledOnce();
    expect(steps).toEqual(["server", "backend"]);
  });

  test("tolerates backends without an explicit shutdown hook", async () => {
    const server = {
      close: vi.fn(async () => undefined),
    };

    await expect(
      cleanupRuntimeUiValidationResources({
        server,
        backend: {},
      }),
    ).resolves.toBeUndefined();

    expect(server.close).toHaveBeenCalledOnce();
  });
});
