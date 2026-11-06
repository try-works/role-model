import { afterEach, describe, expect, it } from "vitest";

import { Message } from "../src/message";
import type { Model } from "../src/model";
import { mountShell } from "../src/mount";
import { parseReadbackFixture } from "../src/readback";
import { createReadbackClients } from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S635: the routing-strategy form must hydrate its model fields from the loaded posture so an
 * untouched Save posts the rendered mode/scoring/execution values, never null. The owner observed
 * routing.mode:null on an untouched save even though the three selects rendered baseline/balanced/remote_only.
 */

const postureBody = (mode: string, scoring: string, execution: string) => ({
  agentStrategies: [],
  persisted: { executionMode: execution, strategy: mode },
  postureDiagnostics: { violations: [], warnings: [] },
  routing: { mode, scoringStrategy: scoring },
  workloads: [],
});
const hydratedModel = (body: ReturnType<typeof postureBody>): Model => {
  const base = shellModel({ route: { _tag: "RouterStrategy" } });
  return {
    ...base,
    readbacks: { ...base.readbacks, routerConfig: parseReadbackFixture("routerConfig", body, 0) },
  };
};

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> =
  [];
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

const waitFor = async (read: () => boolean, label: string, timeoutMs = 8000): Promise<void> => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const mountStrategy = (
  body: ReturnType<typeof postureBody>,
  writes: Array<{ body: unknown; method: string; url: string }>,
): void => {
  const readbackFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/role-model/router/config")) {
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    return new Response("{}", { headers: { "content-type": "application/json" }, status: 200 });
  };
  const writeFetch: typeof fetch = async (input, init) => {
    writes.push({
      body: JSON.parse(String(init?.body)),
      method: String(init?.method),
      url: String(input),
    });
    return new Response(JSON.stringify({ applied: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  };
  window.history.replaceState({}, "", "/router/strategy");
  const container = document.createElement("div");
  container.id = "s635-posture";
  document.body.append(container);
  const handle = mountShell(container, {
    readbackReaders: createReadbackClients({ fetchImpl: readbackFetch }),
    routerConfigFetchImpl: writeFetch,
  });
  mounted.push({ container, handle });
};

const clickSave = async (): Promise<void> => {
  await waitFor(
    () =>
      document
        .querySelector("[data-route='router-strategy']")
        ?.getAttribute("data-router-family-state") === "ok",
    "route ok",
  );
  const save = [...document.querySelectorAll("main button")].find(
    (button) => button.textContent?.trim() === "Save routing strategy",
  ) as HTMLButtonElement | undefined;
  if (save === undefined) throw new Error("Save routing strategy button absent");
  save.click();
  await waitFor(
    () =>
      document
        .querySelector("[data-router-posture-status]")
        ?.getAttribute("data-router-posture-status") === "saved",
    "saved",
  );
};

describe("S635 routing-strategy posture hydration", () => {
  it("hydrates model fields from the loaded posture, including host defaults when rows are absent", () => {
    const loaded = shellUpdate(
      hydratedModel(postureBody("hybrid", "cost", "decision_only")),
      Message.ReadbackLoaded({
        key: "routerConfig",
        snapshot: parseReadbackFixture(
          "routerConfig",
          postureBody("hybrid", "cost", "decision_only"),
          0,
        ),
        token: 0,
      }),
    );
    expect(loaded.model.routerPosture).toMatchObject({
      executionMode: "decision_only",
      mode: "hybrid",
      scoringStrategy: "cost",
    });
    const defaults = shellUpdate(
      shellModel({ route: { _tag: "RouterStrategy" } }),
      Message.ReadbackLoaded({
        key: "routerConfig",
        snapshot: parseReadbackFixture(
          "routerConfig",
          { agentStrategies: [], persisted: {}, routing: {}, workloads: [] },
          0,
        ),
        token: 0,
      }),
    );
    expect(defaults.model.routerPosture).toMatchObject({
      executionMode: "decision_only",
      mode: "baseline",
      scoringStrategy: "balanced",
    });
  });

  it("posts the rendered baseline values on an untouched save", async () => {
    const writes: Array<{ body: unknown; method: string; url: string }> = [];
    mountStrategy(postureBody("baseline", "balanced", "remote_only"), writes);
    await clickSave();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.url).toBe("/api/role-model/runtime/config");
    expect(writes[0]?.method).toBe("PUT");
    expect(writes[0]?.body).toEqual({
      execution_mode: "remote_only",
      routing: { mode: "baseline", pin_weights: false, scoring_strategy: "balanced" },
    });
  });

  it("posts a non-default saved posture on an untouched save", async () => {
    const writes: Array<{ body: unknown; method: string; url: string }> = [];
    mountStrategy(postureBody("hybrid", "cost", "decision_only"), writes);
    await clickSave();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.body).toEqual({
      execution_mode: "decision_only",
      routing: { mode: "hybrid", pin_weights: false, scoring_strategy: "cost" },
    });
  });
});
