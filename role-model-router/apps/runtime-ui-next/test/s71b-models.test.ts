import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";

const fixture = (name: string): unknown => JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", name + ".json"), "utf8"));
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const mountAt = (id: string, impl: typeof fetch) => { window.history.replaceState({}, "", "/models"); const container = document.createElement("div"); container.id = id; document.body.append(container); const handle = mountShell(container, { readbackFetchImpl: impl }); mounted.push({ container, handle }); };
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => { const end = Date.now() + 3000; while (Date.now() < end) { const value = read(); if (value !== undefined) return value; await new Promise((r) => setTimeout(r, 10)); } throw new Error("Timed out waiting for " + label); };
afterEach(() => { for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); } window.history.replaceState({}, "", "/"); });

describe("S71b configured models", () => {
  it("renders configured models with endpoint, status, effort and roles from real captures", async () => {
    mountAt("s71b-success", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/models") return response(fixture("models-real")); if (path === "/api/role-model/endpoints") return response(fixture("model-endpoints-real")); return response({}); });
    await waitFor(() => document.querySelector('[data-route="models"] h2') ?? undefined, "models success");
    const headers = [...document.querySelectorAll('[data-route="models"] table thead th')].map((cell) => cell.textContent);
    expect(headers).toContain("MODEL");
    expect(headers).toContain("PROVIDER");
    expect(headers).toContain("ENDPOINT IDS");
    expect(document.querySelectorAll('[data-route="models"] table tbody tr').length).toBeGreaterThan(0);
  });

  it("joins the real fixture to exact endpoint, health, effort and roles", async () => {
    mountAt("s71b-exact", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/models") return response(fixture("models-real")); if (path === "/api/role-model/endpoints") return response(fixture("model-endpoints-real")); return response({}); });
    await waitFor(() => (document.querySelectorAll('[data-route="models"] table tbody tr').length > 1 ? true : undefined), "model rows");
    const text = document.querySelector('[data-route="models"]')?.textContent ?? "";
    expect(text).toContain("TASKS");
    expect(text).toContain("ELIGIBILITY");
  });

  it("renders loading, empty and error states", async () => {
    mountAt("s71b-loading", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/models") return await new Promise<Response>(() => undefined); return response([]); });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.body.textContent).not.toContain("Claude 3.7 Sonnet");
    mountAt("s71b-empty", async () => response([]));
    await waitFor(() => (document.body.textContent?.includes("No configured models yet.") ? true : undefined), "empty");
    mountAt("s71b-error", async (input) => { const path = new URL(String(input), "http://localhost").pathname; return path === "/api/role-model/models" ? response({}) : response([]); });
    await waitFor(() => (document.body.textContent?.includes("No configured models yet.") ? true : undefined), "error");
  });
});
