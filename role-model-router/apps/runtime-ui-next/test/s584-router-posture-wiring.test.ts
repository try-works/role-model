import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

const routerConfigBody = {
  persisted: { strategy: "hybrid", executionMode: "decision_only" },
  routing: { mode: "hybrid", scoringStrategy: "cost" },
  agentStrategies: [],
  workloads: [],
  postureDiagnostics: { violations: [], warnings: [] },
};

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (fetchImpl: typeof fetch, routerConfigFetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/router/strategy");
  const container = document.createElement("div");
  container.id = "s584-router-posture";
  document.body.append(container);
  const handle = mountShell(container, {
    readbackReaders: createReadbackClients({ fetchImpl }),
    routerConfigFetchImpl,
  });
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
    if (last !== null && last !== "idle" && last !== "loading") return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + ")");
};

describe("S584 router posture wiring", () => {
  it("saves the edited routing posture to the unified runtime config", async () => {
    const writes: Array<{ readonly body: unknown; readonly url: string }> = [];
    const readbackFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/role-model/router/config")) {
        return new Response(JSON.stringify(routerConfigBody), { headers: { "content-type": "application/json" }, status: 200 });
      }
      if (url.includes("/api/role-model/runtime/config")) {
        return new Response(JSON.stringify({ applied: true, path: "runtime-config.yaml", config: {} }), { headers: { "content-type": "application/json" }, status: 200 });
      }
      return new Response(JSON.stringify({ rows: [] }), { headers: { "content-type": "application/json" }, status: 200 });
    };
    const routerConfigFetch: typeof fetch = async (input, init) => {
      writes.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), url: String(input) });
      return new Response(JSON.stringify({ applied: true, path: "runtime-config.yaml", config: {} }), { headers: { "content-type": "application/json" }, status: 200 });
    };
    mountAt(readbackFetch, routerConfigFetch);
    expect(await waitFor(() => document.querySelector("[data-route='router-strategy']")?.getAttribute("data-router-family-state") ?? null, "strategy ok")).toBe("ok");
    const setSelect = (label: string, value: string) => {
      const select = [...document.querySelectorAll("main select")].find((element) => element.getAttribute("aria-label") === label) as HTMLSelectElement | undefined;
      if (select === undefined) throw new Error("missing select " + label);
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setSelect("Routing mode", "hybrid");
    setSelect("Scoring strategy", "cost");
    setSelect("Execution scope", "decision_only");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const save = [...document.querySelectorAll("main button")].find((element) => element.textContent?.trim() === "Save routing strategy") as HTMLButtonElement | undefined;
    expect(save).toBeDefined();
    save?.click();
    expect(await waitFor(() => document.querySelector("[data-router-posture-status]")?.getAttribute("data-router-posture-status") ?? null, "saved status")).toBe("saved");
    expect(document.querySelector("[data-router-posture-status]")?.textContent).toBe("Routing posture saved.");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.url).toBe("/api/role-model/runtime/config");
    expect(writes[0]?.body).toEqual({
      execution_mode: "decision_only",
      routing: { mode: "hybrid", pin_weights: false, scoring_strategy: "cost", weights: { quality: 0.15, latency: 0.1, throughput: 0.05, cost: 0.5, reliability: 0.15, preference: 0.05 } },
    });
  });
});
