import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

/**
 * S591 RED: the router posture editor must expose the six scoring weight metrics
 * (quality/latency/throughput/cost/reliability/preference) and persist them as
 * routing.weights in the unified runtime config PUT.
 *
 * Contract for the implementation:
 * - each weight input carries data-router-weight="<metric>" and an accessible name;
 * - the input value is the numeric weight (0..1);
 * - saving the strategy sends routing.weights with all six metrics.
 */
const WEIGHT_METRICS = [
  "quality",
  "latency",
  "throughput",
  "cost",
  "reliability",
  "preference",
] as const;

const routerConfigBody = {
  persisted: { strategy: "hybrid", executionMode: "decision_only" },
  routing: {
    mode: "hybrid",
    scoringStrategy: "custom",
    weights: {
      quality: 0.4,
      latency: 0.2,
      throughput: 0.1,
      cost: 0.1,
      reliability: 0.1,
      preference: 0.1,
    },
  },
  agentStrategies: [],
  workloads: [],
  postureDiagnostics: { violations: [], warnings: [] },
};

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (fetchImpl: typeof fetch, routerConfigFetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/router/strategy");
  const container = document.createElement("div");
  container.id = "s591-router-weights";
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
  throw new Error(`Timed out waiting for ${label} (last: ${String(last)})`);
};

const setInput = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("S591 router weights editor", () => {
  it("renders the six scoring weight inputs and saves routing.weights", async () => {
    const writes: Array<{ readonly body: unknown; readonly url: string }> = [];
    const readbackFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/role-model/router/config")) {
        return new Response(JSON.stringify(routerConfigBody), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      if (url.includes("/api/role-model/runtime/config")) {
        return new Response(
          JSON.stringify({ applied: true, path: "runtime-config.yaml", config: {} }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ rows: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const routerConfigFetch: typeof fetch = async (input, init) => {
      writes.push({
        body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
        url: String(input),
      });
      return new Response(
        JSON.stringify({ applied: true, path: "runtime-config.yaml", config: {} }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    };

    mountAt(readbackFetch, routerConfigFetch);
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-route='router-strategy']")
            ?.getAttribute("data-router-family-state") ?? null,
        "strategy ok",
      ),
    ).toBe("ok");

    const inputs = WEIGHT_METRICS.map((metric) => {
      const input = document.querySelector<HTMLInputElement>(`[data-router-weight="${metric}"]`);
      expect(input, `missing weight input for ${metric}`).not.toBeNull();
      if (input === null) throw new Error(`missing weight input for ${metric}`);
      if (!(input.getAttribute("aria-label") ?? "").toLowerCase().includes(metric)) {
        throw new Error(
          `weight input for ${metric} lacks an accessible name containing the metric`,
        );
      }
      return { metric, input };
    });

    // Hydration: inputs start from the host weights, not the defaults.
    expect(inputs.find((entry) => entry.metric === "quality")?.input.value).toBe("0.4");
    expect(inputs.find((entry) => entry.metric === "cost")?.input.value).toBe("0.1");

    const scoring = [...document.querySelectorAll<HTMLSelectElement>("main select")].find(
      (element) => element.getAttribute("aria-label") === "Scoring strategy",
    );
    expect(scoring).toBeDefined();
    scoring!.value = "custom";
    scoring?.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));

    const inputFor = (metric: string): HTMLInputElement => {
      const input = inputs.find((entry) => entry.metric === metric)?.input;
      if (!input) throw new Error(`missing weights input for ${metric}`);
      return input;
    };

    setInput(inputFor("quality"), "0.3");
    setInput(inputFor("latency"), "0.1");
    setInput(inputFor("throughput"), "0.1");
    setInput(inputFor("cost"), "0.2");
    setInput(inputFor("reliability"), "0.2");
    setInput(inputFor("preference"), "0.1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const save = [...document.querySelectorAll<HTMLButtonElement>("main button")].find(
      (element) => element.textContent?.trim() === "Save routing strategy",
    );
    expect(save).toBeDefined();
    save?.click();
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-router-posture-status]")
            ?.getAttribute("data-router-posture-status") ?? null,
        "saved status",
      ),
    ).toBe("saved");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.url).toBe("/api/role-model/runtime/config");
    expect(writes[0]?.body).toMatchObject({
      routing: {
        scoring_strategy: "custom",
        weights: {
          quality: 0.3,
          latency: 0.1,
          throughput: 0.1,
          cost: 0.2,
          reliability: 0.2,
          preference: 0.1,
        },
      },
    });
  });

  it("omits routing.weights for non-custom scoring strategies", async () => {
    const writes: Array<{
      readonly body: { routing?: Record<string, unknown> };
      readonly url: string;
    }> = [];
    const readbackFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/role-model/router/config")) {
        return new Response(
          JSON.stringify({
            ...routerConfigBody,
            routing: { mode: "hybrid", scoringStrategy: "cost" },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ rows: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const routerConfigFetch: typeof fetch = async (input, init) => {
      writes.push({
        body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
        url: String(input),
      });
      return new Response(
        JSON.stringify({ applied: true, path: "runtime-config.yaml", config: {} }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    };
    mountAt(readbackFetch, routerConfigFetch);
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-route='router-strategy']")
            ?.getAttribute("data-router-family-state") ?? null,
        "strategy ok",
      ),
    ).toBe("ok");
    const save = [...document.querySelectorAll<HTMLButtonElement>("main button")].find(
      (element) => element.textContent?.trim() === "Save routing strategy",
    );
    save?.click();
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-router-posture-status]")
            ?.getAttribute("data-router-posture-status") ?? null,
        "saved status",
      ),
    ).toBe("saved");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.body?.routing).toBeDefined();
    expect(writes[0]?.body?.routing?.weights).toBeUndefined();
    expect(writes[0]?.body?.routing?.scoring_strategy).toBe("cost");
  });

  it("persists hydrated host weights when saved without editing", async () => {
    const writes: Array<{
      readonly body: { routing?: Record<string, unknown> };
      readonly url: string;
    }> = [];
    const readbackFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/role-model/router/config")) {
        return new Response(JSON.stringify(routerConfigBody), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      return new Response(JSON.stringify({ rows: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const routerConfigFetch: typeof fetch = async (input, init) => {
      writes.push({
        body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
        url: String(input),
      });
      return new Response(
        JSON.stringify({ applied: true, path: "runtime-config.yaml", config: {} }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    };
    mountAt(readbackFetch, routerConfigFetch);
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-route='router-strategy']")
            ?.getAttribute("data-router-family-state") ?? null,
        "strategy ok",
      ),
    ).toBe("ok");
    const save = [...document.querySelectorAll<HTMLButtonElement>("main button")].find(
      (element) => element.textContent?.trim() === "Save routing strategy",
    );
    save?.click();
    expect(
      await waitFor(
        () =>
          document
            .querySelector("[data-router-posture-status]")
            ?.getAttribute("data-router-posture-status") ?? null,
        "saved status",
      ),
    ).toBe("saved");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.body?.routing).toMatchObject({
      scoring_strategy: "custom",
      weights: {
        quality: 0.4,
        latency: 0.2,
        throughput: 0.1,
        cost: 0.1,
        reliability: 0.1,
        preference: 0.1,
      },
    });
  });
});
