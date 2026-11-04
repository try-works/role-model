import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { defineReadDiagnostics } from "../src/commands";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";
import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

const update = createUpdate(defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })));
const modelsWith = (ids: ReadonlyArray<string>) => ({
  rows: ids.map((id) => ({ id, label: id, meta: JSON.stringify({ id }), value: "remote" })),
  status: "ok" as const,
  token: 0,
});
const render = async (model: Model): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S634 sidebar rail refresh", () => {
  it("refreshes every rail readback after a registry mutation", () => {
    const base = shellModel({ route: { _tag: "Models" } });
    const next = shellUpdate(base, Message.ModelsActionSucceeded({ message: "saved", token: 1 }));
    const keys = (next.commands ?? []).flatMap((command) => {
      const args = (command as unknown as { readonly args?: { readonly key?: string } }).args;
      return args?.key === undefined ? [] : [args.key];
    });
    expect(keys).toEqual(["models", "runtimeSummary", "health", "dashboard", "router", "overviewMetrics", "routerCandidates"]);
    expect(next.model.readbacks.models.status).toBe("loading");
  });

  it("updates the mounted sidebar after removing a model through the real shell", async () => {
    window.history.replaceState({}, "", "/models");
    let removed = false;
    const fetchImpl: typeof fetch = async (input) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path.includes("/local/peer/models/old-model/unload")) removed = true;
      if (path === "/api/role-model/models") {
        return new Response(JSON.stringify(removed ? [{ displayName: "new-model", id: "new-model", providerId: "p" }] : [{ displayName: "old-model", id: "old-model", providerId: "p" }]), { headers: { "content-type": "application/json" }, status: 200 });
      }
      if (path === "/api/role-model/endpoints") return new Response(JSON.stringify([{ endpointId: "e1", modelId: removed ? "new-model" : "old-model", providerId: "peer", sourceType: "local" }]), { headers: { "content-type": "application/json" }, status: 200 });
      if (path === "/api/role-model/role-policy") return new Response(JSON.stringify({ roleDefinitions: [], taskDefinitions: [] }), { headers: { "content-type": "application/json" }, status: 200 });
      return new Response(JSON.stringify({}), { headers: { "content-type": "application/json" }, status: 200 });
    };
    const container = document.createElement("div");
    container.id = "s634-mounted";
    document.body.append(container);
    const handle = mountShell(container, { modelsFetchImpl: fetchImpl, readbackReaders: createReadbackClients({ fetchImpl }) });
    try {
      const waitFor = async (read: () => boolean, label: string): Promise<void> => {
        const end = Date.now() + 5000;
        while (Date.now() < end) {
          if (read()) return;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error("timed out waiting for " + label);
      };
      await waitFor(() => document.body.textContent?.includes("old-model") === true, "old model in sidebar");
      await new Promise((resolve) => setTimeout(resolve, 100));
      const remove = document.querySelector<HTMLButtonElement>("[data-model-remove]");
      expect(remove).not.toBeNull();
      remove?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await waitFor(() => document.querySelector("[data-model-remove]")?.textContent === "Confirm remove model", "confirm remove label");
      document.querySelector<HTMLButtonElement>("[data-model-remove]")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      const sidebar = (): string => document.querySelector("[data-slot='role-model-model-inventory']")?.textContent ?? "";
      await waitFor(() => sidebar().includes("new-model"), "new model in sidebar");
      expect(sidebar()).not.toContain("old-model");
    } finally {
      handle.dispose();
      container.remove();
      window.history.replaceState({}, "", "/");
    }
  });

  it("renders the new model list in the sidebar after the refresh resolves", async () => {
    const base = shellModel({ route: { _tag: "Models" } });
    const initial = { ...base, readbacks: { ...base.readbacks, models: modelsWith(["old-model"]) } };
    expect((await render(initial)).textContent).toContain("old-model");

    const mutated = update(initial, Message.ModelsActionSucceeded({ message: "saved", token: 1 }));
    const token = mutated.model.readbacks.models.token;
    const loaded = update(mutated.model, Message.ReadbackLoaded({ key: "models", snapshot: { ...modelsWith(["new-model"]), token }, token }));
    const container = await render(loaded.model);
    expect(container.textContent).toContain("new-model");
    expect(container.textContent).not.toContain("old-model");
  });
});
