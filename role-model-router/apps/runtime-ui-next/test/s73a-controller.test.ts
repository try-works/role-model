import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";

interface Harness {
  readonly calls: Array<{ body: unknown; method: string; path: string }>;
  readonly mount: () => { container: HTMLElement; handle: { dispose(): void } };
  controller: string;
  patchResult: "server-c" | "error" | "slow";
  setPatchResult(value: "server-c" | "error" | "slow"): void;
  setController(value: string): void;
}
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const harness = (): Harness => {
  const calls: Harness["calls"] = [];
  const state = { controller: "endpoint-a", patchResult: "server-c" as Harness["patchResult"] };
  let slowResolve: (() => void) | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    const path = new URL(String(input), "http://localhost").pathname;
    const method = init?.method ?? "GET";
    calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), method, path });
    if (path === "/api/role-model/endpoints" && method === "GET") return json([{ endpointId: "endpoint-a" }, { endpointId: "endpoint-b" }, { endpointId: "endpoint-c" }]);
    if (path === "/api/role-model/controller" && method === "GET") return json({ endpointId: state.controller });
    if (path === "/api/role-model/controller" && method === "PATCH") {
      if (state.patchResult === "slow") return await new Promise<Response>((resolve) => { slowResolve = () => resolve(json({ endpointId: "endpoint-c" })); });
      if (state.patchResult === "error") return json({ message: "controller update rejected" }, 409);
      state.controller = "endpoint-c";
      return json({ endpointId: "endpoint-c" });
    }
    return json({});
  };
  return {
    calls,
    controller: state.controller,
    mount: () => { window.history.replaceState({}, "", "/control/controller"); const container = document.createElement("div"); container.id = "s73a-" + String(Math.random()); document.body.append(container); const handle = mountShell(container, { controlFetchImpl: fetchImpl, readbackFetchImpl: fetchImpl }); mounted.push({ container, handle }); return { container, handle }; },
    patchResult: state.patchResult,
    setPatchResult: (value) => { state.patchResult = value; },
    setController: (value) => { state.controller = value; },
  } as Harness;
};
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => { const end = Date.now() + 3000; while (Date.now() < end) { const value = read(); if (value !== undefined) return value; await new Promise((r) => setTimeout(r, 10)); } throw new Error("Timed out waiting for " + label); };
const choose = async (value: string) => { const select = document.querySelector("[data-controller-endpoint-select]") as HTMLSelectElement; select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 20)); };
const save = () => (document.querySelector("[data-controller-save]") as HTMLButtonElement).click();
const current = () => document.querySelector("[data-controller-current]")?.textContent;
afterEach(() => { for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); } window.history.replaceState({}, "", "/"); });

describe("S73a controller edit", () => {
  it("dispatches the exact PATCH body and shows the server's answer plus a notice", async () => {
    const h = harness(); h.mount();
    await waitFor(() => document.querySelector("[data-controller-current]")?.textContent?.includes("endpoint-a") ? true : undefined, "initial controller");
    await choose("endpoint-b"); save();
    await waitFor(() => current()?.includes("endpoint-c") ? true : undefined, "server answer");
    const patch = h.calls.find((call) => call.method === "PATCH" && call.path === "/api/role-model/controller");
    expect(patch?.body).toEqual({ endpointId: "endpoint-b" });
    expect(document.querySelector("[data-controller-notice]")?.textContent).toContain("Server assigned endpoint-c");
  });

  it("keeps the last readback and renders the host error on 4xx", async () => {
    const h = harness(); h.setPatchResult("error"); h.mount();
    await waitFor(() => current()?.includes("endpoint-a") ? true : undefined, "initial controller");
    await choose("endpoint-b"); save();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await waitFor(() => document.querySelector("[role='alert']")?.textContent?.includes("controller update rejected") ? true : undefined, "alert");
    expect(current()).toContain("endpoint-a");
  });

  it("guards double dispatch while the save is pending", async () => {
    const h = harness(); h.setPatchResult("slow"); h.mount();
    await waitFor(() => document.querySelector("[data-controller-current]")?.textContent?.includes("endpoint-a") ? true : undefined, "initial controller");
    await choose("endpoint-b"); save(); await new Promise((resolve) => setTimeout(resolve, 20)); save();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const patches = h.calls.filter((call) => call.method === "PATCH");
    expect(patches).toHaveLength(1);
  });
});
