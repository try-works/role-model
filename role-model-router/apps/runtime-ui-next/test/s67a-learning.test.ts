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
    expect(page.querySelector("h1")?.textContent).toBe("Learning");
    await waitFor(() => document.querySelector("[data-readback-route='learning'][data-readback-state='ok']") ?? undefined, "knowledge ok");
    expect(page.textContent).toContain("sqlite_fts5_bm25");
    expect(page.textContent).toContain("disabled");
    expect(page.textContent).toContain("No replay jobs.");
    expect(page.textContent).toContain("No evaluation jobs.");
    expect(document.querySelector("a[data-nav='learning']")?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelector("[data-nav-group='Learning']")).not.toBeNull();
  });

  it("shows loading, empty, error and ok for each of the three surfaces", async () => {
    const configs = [
      { key: "learning", empty: { knowledge: { available: false } }, error: {}, ok: fixture("learning-real"), path: "/api/role-model/operator/learning" },
      { key: "replayJobs", empty: [], error: [{}], ok: fixture("replay-jobs-real"), path: "/api/role-model/operator/replay/jobs" },
      { key: "evaluationJobs", empty: [], error: [{}], ok: fixture("evaluation-jobs-real"), path: "/api/role-model/operator/evaluation/jobs" },
    ] as const;
    for (const config of configs) {
      let release: ((value: Response) => void) | undefined;
      mountAt("s67a-states-" + config.key, async (input) => {
        const path = new URL(String(input), "http://localhost").pathname;
        if (path === config.path) return await new Promise<Response>((resolve) => { release = resolve; });
        return response(baseBodies[path] ?? {});
      });
      const selector = "[data-readback-route='" + config.key + "'][data-readback-state='loading']";
      await waitFor(() => document.querySelector(selector) ?? undefined, config.key + " loading");
      release?.(response(config.empty));
      await waitFor(() => document.querySelector("[data-readback-route='" + config.key + "'][data-readback-state='empty']") ?? undefined, config.key + " empty");
    }
    for (const config of configs) {
      mountAt("s67a-error-" + config.key, async (input) => {
        const path = new URL(String(input), "http://localhost").pathname;
        return path === config.path ? response(config.error) : response(baseBodies[path] ?? {});
      });
      await waitFor(() => document.querySelector("[data-readback-route='" + config.key + "'][data-readback-state='error']") ?? undefined, config.key + " error");
    }
  });

  it("renders a real-shaped job row but never a fabricated id as success", async () => {
    mountAt("s67a-row", async (input) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/role-model/operator/replay/jobs") return response(fixture("replay-jobs-row"));
      return response(baseBodies[path] ?? {});
    });
    await waitFor(() => document.querySelector("[data-readback-route='replayJobs'][data-readback-state='ok']") ?? undefined, "row ok");
    expect(document.body.textContent).toContain("job-real-1");
    expect(document.body.textContent).toContain("running");
    mountAt("s67a-fabricated", async (input) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/role-model/operator/replay/jobs") return response([{ id: "fabricated-job" }]);
      return response(baseBodies[path] ?? {});
    });
    await waitFor(() => document.querySelector("[data-readback-route='replayJobs'][data-readback-state='error']") ?? undefined, "fabricated error");
    expect(document.body.textContent).not.toContain("fabricated-job");
  });
});
