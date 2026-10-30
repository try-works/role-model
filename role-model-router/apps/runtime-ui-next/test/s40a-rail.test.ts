import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { view as chartView } from "@role-model/ui/foldkit-chart";

import { mountShell } from "../src/mount";

const fixture = (key: string): unknown => JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", key + ".json"), "utf8"));
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const response = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const bodies: Record<string, unknown> = {
  "/api/role-model/models": fixture("models"),
  "/api/role-model/runtime/summary": fixture("runtimeSummary"),
  "/api/role-model/telemetry/summary": fixture("dashboard"),
  "/api/role-model/router/summary": fixture("router"),
};
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " | " + (document.body.textContent ?? "").slice(0, 500));
};
afterEach(() => {
  for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

describe("S40a shell rail", () => {
  it("exports the pure-SVG chart view from the client package", () => {
    expect(typeof chartView).toBe("function");
  });

  it("renders real rail values from runtime summary, health, telemetry and models", async () => {
    window.history.replaceState({}, "", "/");
    const container = document.createElement("div");
    container.id = "s40a-rail";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackFetchImpl: async (input) => response(bodies[new URL(String(input), "http://localhost").pathname] ?? {}),
    });
    mounted.push({ container, handle });
    const footer = await waitFor(() => document.querySelector("[data-slot='role-model-sidebar-footer']") ?? undefined, "sidebar footer");
    const inventory = await waitFor(
      () => {
        const slot = footer.querySelector("[data-slot='role-model-model-inventory']");
        return slot?.textContent?.includes("Claude 3.7 Sonnet") ? slot : undefined;
      },
      "model inventory rows",
    );
    const cache = footer.querySelector("[data-slot='role-model-cache']");
    const router = footer.querySelector("[data-slot='role-model-router-endpoint']");
    expect(inventory.textContent).toContain("Models");
    expect(inventory.textContent).toContain("Requests");
    expect(cache?.textContent).toContain("Cache");
    expect(cache?.textContent).toContain("0%");
    expect(router?.textContent).toContain("/v1");
  });

  it("rejects a fabricated rail body instead of showing it", async () => {
    window.history.replaceState({}, "", "/");
    const container = document.createElement("div");
    container.id = "s40a-rail-fabricated";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackFetchImpl: async (input) => {
        const path = new URL(String(input), "http://localhost").pathname;
        return response(path === "/api/role-model/runtime/summary" ? {} : path === "/api/role-model/models" ? [{}] : bodies[path] ?? {});
      },
    });
    mounted.push({ container, handle });
    const footer = await waitFor(() => document.querySelector("[data-slot='role-model-sidebar-footer']") ?? undefined, "fabricated footer");
    const text = footer.textContent ?? "";
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("NaN");
    expect(text).toContain("Cache");
  });

  it("renders a dash with an aria reason for an invalid/failed rail read", async () => {
    window.history.replaceState({}, "", "/");
    const container = document.createElement("div");
    container.id = "s40a-rail-invalid";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackFetchImpl: async () => new Response("not-json", { status: 500 }),
    });
    mounted.push({ container, handle });
    const footer = await waitFor(() => document.querySelector("[data-slot='role-model-sidebar-footer']") ?? undefined, "failed footer");
    expect(footer.querySelector("[data-slot='role-model-cache']")?.textContent).toContain("no live samples");
    expect(footer.querySelector("[data-slot='role-model-router-endpoint']")?.textContent).toContain("—");
  });
});
