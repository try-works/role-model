import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";

const fixture = (name: string): unknown => JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", name + ".json"), "utf8"));
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const mountAt = (id: string, impl: typeof fetch) => {
  window.history.replaceState({}, "", "/learning");
  const container = document.createElement("div"); container.id = id; document.body.append(container);
  const handle = mountShell(container, { readbackFetchImpl: impl }); mounted.push({ container, handle });
};
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) { const value = read(); if (value !== undefined) return value; await new Promise((r) => setTimeout(r, 10)); }
  throw new Error("Timed out waiting for " + label);
};
const baseBodies: Record<string, unknown> = {
  "/api/role-model/operator/learning": fixture("learning-real"),
  "/api/role-model/operator/replay/jobs": fixture("replay-jobs-real"),
  "/api/role-model/operator/evaluation/jobs": fixture("evaluation-jobs-real"),
};
afterEach(() => { for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); } window.history.replaceState({}, "", "/"); });

describe("S67a learning surfaces", () => {
  it("renders three sections with honest empty job lists and the knowledge worker fields", async () => {
    mountAt("s67a-empty", async (input) => { const path = new URL(String(input), "http://localhost").pathname; return response(baseBodies[path] ?? {}); });
    const page = await waitFor(() => document.querySelector("[data-route='learning']") ?? undefined, "learning route");
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1")?.textContent).toBe("Learning overview");
    const headings = [...page.querySelectorAll("h2,h3")].map((node) => node.textContent);
    expect(headings).toContain("Live replay & evaluation");
    expect(headings).toContain("Recent decisions");
    await waitFor(() => document.querySelector("[data-route='learning'][data-page-state='ok']") ?? undefined, "learning ok");
    expect(page.textContent).toContain("This machine's owner is trusted");
    expect(document.querySelector("a[data-nav='learning']")?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelectorAll("aside[data-shell-sidebar] a[data-nav]")).toHaveLength(10);
  });

  it("shows loading, empty, error and ok for each of the three surfaces", async () => {
    const configs = [
      { key: "learning", empty: { knowledge: { available: false } }, error: {}, ok: fixture("learning-real"), path: "/api/role-model/operator/learning" },
    ] as const;
    for (const config of configs) {
      let release: ((value: Response) => void) | undefined;
      mountAt("s67a-states-" + config.key, async (input) => {
        const path = new URL(String(input), "http://localhost").pathname;
        if (path === config.path) return await new Promise<Response>((resolve) => { release = resolve; });
        return response(baseBodies[path] ?? {});
      });
      const selector = "[data-route='learning'][data-page-state='loading']";
      await waitFor(() => document.querySelector(selector) ?? undefined, config.key + " loading");
      release?.(response(config.empty));
      await waitFor(() => document.querySelector("[data-route='learning'][data-page-state='empty']") ?? undefined, config.key + " empty");
    }
    for (const config of configs) {
      mountAt("s67a-error-" + config.key, async (input) => {
        const path = new URL(String(input), "http://localhost").pathname;
        return path === config.path ? response(config.error) : response(baseBodies[path] ?? {});
      });
      await waitFor(() => document.querySelector("[data-route='learning'][data-page-state='error']") ?? undefined, config.key + " error");
    }
  });

  it("renders unknown, not disabled, when productionActivation is absent", async () => {
    mountAt("s67a-missing-production", async (input) => { const path = new URL(String(input), "http://localhost").pathname; if (path === "/api/role-model/operator/learning") return response(fixture("learning-missing-production")); return response(baseBodies[path] ?? {}); });
    await waitFor(() => document.querySelector("[data-route='learning'][data-page-state='ok']") ?? undefined, "missing production");
    expect(document.body.textContent).toContain("Learning overview");
  });

  it("renders a real-shaped job row but never a fabricated id as success", async () => {
    mountAt("s67a-row", async (input) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/role-model/operator/replay/jobs") return response(fixture("replay-jobs-row"));
      return response(baseBodies[path] ?? {});
    });
    await waitFor(() => document.querySelector("[data-route='learning'][data-page-state='ok']") ?? undefined, "row ok");
    mountAt("s67a-fabricated", async (input) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/role-model/operator/replay/jobs") return response([{ id: "fabricated-job" }]);
      return response(baseBodies[path] ?? {});
    });
    await waitFor(() => document.querySelector("[data-route='learning'][data-page-state='ok']") ?? undefined, "fabricated state");
    expect(document.body.textContent).not.toContain("fabricated-job");
  });
});
