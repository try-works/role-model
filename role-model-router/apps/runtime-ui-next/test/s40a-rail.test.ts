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
    const rail = await waitFor(() => document.querySelector("[data-shell-rail]") ?? undefined, "rail");
    await waitFor(() => document.querySelector("[data-rail-value='requests']") ?? undefined, "requests value");
    const text = rail.textContent ?? "";
    expect(text).toContain("Models");
    expect(text).toContain("Requests");
    expect(text).toContain("Cache");
    expect(text).toContain("Router");
    expect(text).toContain("Mode");
    expect(document.querySelector("[data-rail-value='models']")?.textContent).not.toBe("—");
    expect(document.querySelector("[data-rail-value='requests']")?.textContent).toBe("1");
    expect(document.querySelector("[data-rail-value='cache']")?.textContent).toBe("0%");
    expect(document.querySelector("[data-rail-value='router']")?.textContent).toMatch(/\/v1$/);
    expect(document.querySelector("[data-rail-value='mode']")?.textContent).toBe("decision_only");
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
    const dash = await waitFor(() => document.querySelector("[data-rail-value='dash']") ?? undefined, "fabricated dash");
    expect(dash.getAttribute("aria-label")).toContain("unavailable");
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
    const dash = await waitFor(() => document.querySelector("[data-rail-value='dash']") ?? undefined, "dash");
    expect(dash.getAttribute("aria-label")).toContain("unavailable");
  });
});
