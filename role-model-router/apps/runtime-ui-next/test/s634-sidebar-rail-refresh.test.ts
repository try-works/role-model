import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { defineReadDiagnostics } from "../src/commands";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

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
