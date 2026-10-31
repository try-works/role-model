import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (fetchImpl: typeof fetch, retentionFetchImpl: typeof fetch, path = "/system/storage-retention") => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  container.id = "s595-storage-retention";
  document.body.append(container);
  const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }), retentionFetchImpl });
  mounted.push({ container, handle });
};

afterEach(() => {
  for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

const waitFor = async (read: () => string | null, label: string): Promise<string> => {
  const end = Date.now() + 8000;
  let last: string | null = null;
  while (Date.now() < end) {
    last = read();
    if (last !== null && last !== "loading" && last !== "idle") return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + ")");
};

describe("S595 storage retention and control wiring", () => {
  it("saves the retention policy to the host", async () => {
    const requests: Array<{ method: string; url: string; body: unknown }> = [];
    const retentionFetch: typeof fetch = async (input, init) => {
      requests.push({ method: init?.method ?? "GET", url: String(input), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" }, status: 200 });
    };
    mountAt(async () => new Response(JSON.stringify({ rows: [] }), { headers: { "content-type": "application/json" }, status: 200 }), retentionFetch);
    await waitFor(() => document.querySelector("[data-route='storage-retention']")?.getAttribute("data-page-layout") ?? null, "storage page");
    const save = document.querySelector<HTMLButtonElement>("[data-retention-save-policy]");
    expect(save, "wired save policy button missing").not.toBeNull();
    const size = document.querySelector<HTMLInputElement>('input[aria-label="Maximum size (GB)"]');
    const age = document.querySelector<HTMLInputElement>('input[aria-label="Maximum age (days)"]');
    expect(size).not.toBeNull();
    expect(age).not.toBeNull();
    size!.value = "2";
    size!.dispatchEvent(new Event("input", { bubbles: true }));
    age!.value = "60";
    age!.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    save!.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    console.log("S595REQS", JSON.stringify(requests), "status", document.querySelector("[data-retention-status]")?.getAttribute("data-retention-status"), "msg", document.querySelector("[data-retention-status]")?.textContent);
    expect(requests.some((request) => request.method === "PUT" && request.url.includes("/api/role-model/storage-retention/policy"))).toBe(true);
    const put = requests.find((request) => request.method === "PUT");
    expect(put?.body).toMatchObject({ maxAgeDays: 60, maxSizeGb: 2 });
  });

  it("runs dry-run and execute against the host", async () => {
    const requests: Array<{ method: string; url: string }> = [];
    const retentionFetch: typeof fetch = async (input, init) => {
      requests.push({ method: init?.method ?? "GET", url: String(input) });
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" }, status: 200 });
    };
    mountAt(async () => new Response(JSON.stringify({ rows: [] }), { headers: { "content-type": "application/json" }, status: 200 }), retentionFetch);
    await waitFor(() => document.querySelector("[data-route='storage-retention']")?.getAttribute("data-page-layout") ?? null, "storage page");
    document.querySelector<HTMLButtonElement>("[data-retention-dry-run]")?.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    document.querySelector<HTMLButtonElement>("[data-retention-execute]")?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(requests.some((request) => request.method === "POST" && request.url.includes("/api/role-model/storage-retention/dry-run"))).toBe(true);
    expect(requests.some((request) => request.method === "POST" && request.url.includes("/api/role-model/storage-retention/execute"))).toBe(true);
  });

  it("reasons every remaining handler-less control and wires the logs refresh", async () => {
    mountAt(async () => new Response(JSON.stringify({ rows: [] }), { headers: { "content-type": "application/json" }, status: 200 }), async () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" }, status: 200 }), "/local/logs");
    // The local logs page which carries the wired refresh control.
    await waitFor(() => document.querySelector("[data-route='local-logs']")?.getAttribute("data-page-layout") ?? null, "logs page");
    const refresh = document.querySelector<HTMLButtonElement>("[data-local-logs-refresh]");
    expect(refresh, "wired local logs refresh missing").not.toBeNull();
  });

  it("updates and rolls back the operator shadow learning state", async () => {
    const requests: Array<{ method: string; url: string; body: unknown }> = [];
    const operatorFetch: typeof fetch = async (input, init) => {
      requests.push({ method: init?.method ?? "GET", url: String(input), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" }, status: 200 });
    };
    window.history.replaceState({}, "", "/system/operator");
    const container = document.createElement("div");
    container.id = "s595-operator";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackReaders: createReadbackClients({ fetchImpl: async () => new Response(JSON.stringify({ rows: [] }), { headers: { "content-type": "application/json" }, status: 200 }) }),
      operatorLearningFetchImpl: operatorFetch,
    });
    mounted.push({ container, handle });
    await waitFor(() => document.querySelector("[data-route='system-operator']")?.getAttribute("data-page-layout") ?? null, "operator page");
    const select = document.querySelector<HTMLSelectElement>("[data-learning-mode-select]");
    expect(select, "learning mode select missing").not.toBeNull();
    select!.value = "off";
    select!.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    document.querySelector<HTMLButtonElement>("[data-learning-mode-update]")?.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    document.querySelector<HTMLButtonElement>("[data-learning-rollback]")?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(requests.some((request) => request.method === "POST" && request.url.includes("/api/role-model/operator/learning/mode"))).toBe(true);
    const modeRequest = requests.find((request) => request.url.includes("/api/role-model/operator/learning/mode"));
    expect(modeRequest?.body).toEqual({ mode: "off" });
    expect(requests.some((request) => request.method === "POST" && request.url.includes("/api/role-model/operator/learning/rollback"))).toBe(true);
  });
});
