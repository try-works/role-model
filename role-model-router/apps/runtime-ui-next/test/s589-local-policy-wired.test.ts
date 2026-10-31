import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (fetchImpl: typeof fetch, localPolicyFetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/local/llama-swap/policy");
  const container = document.createElement("div");
  container.id = "s589-local-policy";
  document.body.append(container);
  const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }), localPolicyFetchImpl });
  mounted.push({ container, handle });
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
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

describe("S589 LocalPolicy wired surface", () => {
  it("renders the wired policy editor instead of the static reference panel", async () => {
    const policyBody = { ttl: 300, maxConcurrency: 1, autoUnload: true };
    const puts: Array<{ body: unknown; url: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/api/role-model/local/policy")) {
        if ((init?.method ?? "GET") === "PUT") {
          puts.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), url });
          return new Response(JSON.stringify(policyBody), { headers: { "content-type": "application/json" }, status: 200 });
        }
        return new Response(JSON.stringify(policyBody), { headers: { "content-type": "application/json" }, status: 200 });
      }
      return new Response(JSON.stringify({ rows: [] }), { headers: { "content-type": "application/json" }, status: 200 });
    };
    mountAt(fetchImpl, async (input, init) => {
      const url = String(input);
      if ((init?.method ?? "GET") === "PUT" && url.includes("/api/role-model/local/policy")) {
        puts.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), url });
      }
      return new Response(JSON.stringify(policyBody), { headers: { "content-type": "application/json" }, status: 200 });
    });
    expect(await waitFor(() => document.querySelector("[data-route='local-policy']")?.getAttribute("data-local-policy-state") ?? null, "policy loaded")).toBe("ok");
    const save = document.querySelector<HTMLButtonElement>("[data-local-policy-save]");
    expect(save, "wired save button missing").not.toBeNull();
    const ttl = document.querySelector<HTMLInputElement>("#local-policy-ttl");
    expect(ttl, "wired ttl input missing").not.toBeNull();
    ttl!.value = "900";
    ttl!.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    save!.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(puts.length).toBeGreaterThan(0);
    expect(puts[0]?.url).toContain("/api/role-model/local/policy");
    expect(puts[0]?.body).toMatchObject({ ttl: 900 });
  });
});
