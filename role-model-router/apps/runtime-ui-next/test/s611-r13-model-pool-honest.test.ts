import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

/**
 * S611 (R13): the Model pool card must say honestly when the host reports no
 * benchmark profile, instead of drawing an all-neutral scatter that reads as data.
 */
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];

const mountAt = (candidates: unknown) => {
  window.history.replaceState({}, "", "/router");
  const container = document.createElement("div");
  container.id = "s611-model-pool";
  document.body.append(container);
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/role-model/router/candidates")) {
      return new Response(JSON.stringify(candidates), { headers: { "content-type": "application/json" }, status: 200 });
    }
    return new Response(JSON.stringify({ rows: [] }), { headers: { "content-type": "application/json" }, status: 200 });
  };
  const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }) });
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
    if (last !== null) return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + ")");
};

describe("S611 R13 model pool honesty", () => {
  it("says when no benchmark profile is reported", async () => {
    mountAt({ candidates: [{ endpointId: "a", modelId: "m1", healthStatus: "healthy" }] });
    // The Index model-pool card reads the routerCandidates readback, which is populated by
    // visiting the Router family first, then navigating back to the overview.
    window.history.pushState({}, "", "/router");
    window.dispatchEvent(new CustomEvent("foldkit:urlchange"));
    await waitFor(
      () => (document.querySelector("[data-route]")?.getAttribute("data-route") === "router" ? "ok" : null),
      "router page",
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new CustomEvent("foldkit:urlchange"));
    await waitFor(
      () => document.querySelector('[data-overview-card="Model pool"]')?.textContent ?? null,
      "model pool card",
    );
    const notice = await waitFor(
      () => document.querySelector("[data-model-pool-honest]")?.textContent ?? null,
      "model pool honest notice",
    );
    expect(notice).toContain("No benchmark profile is reported");
  });
});
