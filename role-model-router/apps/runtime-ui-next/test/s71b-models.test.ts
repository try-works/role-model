import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";

const fixture = (name: string): unknown => JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", name + ".json"), "utf8"));
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const mountAt = (id: string, impl: typeof fetch) => { window.history.replaceState({}, "", "/models"); const container = document.createElement("div"); container.id = id; document.body.append(container); const handle = mountShell(container, { readbackFetchImpl: impl }); mounted.push({ container, handle }); };
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => { const end = Date.now() + 3000; while (Date.now() < end) { const value = read(); if (value !== undefined) return value; await new Promise((r) => setTimeout(r, 10)); } throw new Error("Timed out waiting for " + label); };
const page = () => document.querySelector('[data-route="models"]');
afterEach(() => { for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); } window.history.replaceState({}, "", "/"); });

describe("S71b configured models (reference inventory)", () => {
  it("renders the two-column inventory: model rows with badges, runtime facts and the roles panel", async () => {
    mountAt("s71b-success", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/models") return response(fixture("models-real")); if (path === "/api/role-model/endpoints") return response(fixture("model-endpoints-real")); return response({}); });
    const body = (await waitFor(() => (page()?.textContent?.includes("Claude 3.7 Sonnet") ? page() : undefined), "models inventory")) as HTMLElement;
    const text = body.textContent ?? "";
    expect(text).toContain("Select a model to inspect and configure.");
    expect(text).toContain("Models");
    expect(text).toContain("RUNTIME");
    expect(text).toContain("ROLES");
    expect(text).toContain("Source");
    expect(text).toContain("Endpoints");
    expect(text).toContain("Context");
    expect(text).toContain("COST");
    expect(text).toContain("BENCHMARK");
    expect(document.querySelectorAll('[data-route="models"] [data-models-role-list] li').length).toBeGreaterThan(0);
  });

  it("joins the real fixture to model identity, controller badge and role task counts", async () => {
    mountAt("s71b-exact", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/models") return response(fixture("models-real")); if (path === "/api/role-model/endpoints") return response(fixture("model-endpoints-real")); return response({}); });
    await waitFor(() => (page()?.textContent?.includes("controller") ? page() : undefined), "controller badge");
    const text = page()?.textContent ?? "";
    expect(text).toContain("controller");
    expect(text).toMatch(/\d+ tasks/);
  });

  it("renders the reference empty state and never fabricates rows", async () => {
    mountAt("s71b-empty", async () => response([]));
    const body = (await waitFor(() => (page()?.textContent?.includes("No configured models are available yet.") ? page() : undefined), "empty state")) as HTMLElement;
    expect(body.textContent).toContain("Open Local Models");
    expect(body.textContent).toContain("Open Providers");
  });

  it("keeps the page renderable while models load", async () => {
    mountAt("s71b-loading", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/models") return await new Promise<Response>(() => undefined); return response([]); });
    await waitFor(() => (page() ?? undefined), "models page");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.body.textContent).toContain("Configured models");
  });
});
