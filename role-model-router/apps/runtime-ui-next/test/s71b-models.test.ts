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
    await waitFor(() => document.querySelector("[data-models-state='success']") ?? undefined, "models success");
    const rows = document.querySelectorAll("[data-model-row]");
    expect(rows.length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain("Provider:");
    expect(document.body.textContent).toContain("Endpoint:");
    expect(document.body.textContent).toContain("Status:");
    expect(document.body.textContent).toContain("Effort:");
    expect(document.body.textContent).toContain("Roles:");
    expect(document.body.textContent).toContain("unavailable");
  });

  it("renders loading, empty and error states", async () => {
    mountAt("s71b-loading", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/models") return await new Promise<Response>(() => undefined); return response([]); });
    await waitFor(() => document.querySelector("[data-models-state='loading']") ?? undefined, "loading");
    mountAt("s71b-empty", async () => response([]));
    await waitFor(() => document.querySelector("[data-models-state='empty']") ?? undefined, "empty");
    mountAt("s71b-error", async (input) => { const path = new URL(String(input), "http://localhost").pathname; return path === "/api/role-model/models" ? response({}) : response([]); });
    await waitFor(() => document.querySelector("[data-models-state='error']") ?? undefined, "error");
  });
});
