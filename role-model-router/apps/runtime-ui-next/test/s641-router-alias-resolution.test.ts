import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "../src/model";
import type { AppRoute } from "../src/route";
import { view } from "../src/view";
import { shellModel } from "./support/runtime-shell";

/** S641 (task-130): never fabricate an alias id by concatenating the execution-mode token (baseline.remote_only). */

const readback = (
  rows: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly meta: string;
  }>,
) => ({ rows, status: "ok" as const, token: 1 });

const configRows = (strategy: string, executionMode: string) => [
  { id: "strategy", label: "Routing strategy", value: strategy, meta: "persisted" },
  { id: "executionMode", label: "Execution mode", value: executionMode, meta: "persisted" },
];

const runtimeConfigRows = (aliasIds: ReadonlyArray<string>) => [
  {
    id: "config",
    label: "Runtime config",
    meta: JSON.stringify({
      config: {
        modelAliases: aliasIds.map((aliasId) => ({ aliasId, mode: "basic", modelIds: ["m1"] })),
      },
    }),
    value: "",
  },
];

const render = async (readbacks: Partial<Model["readbacks"]>): Promise<HTMLElement> => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: one of the exact AppRoute tags.
    route: { _tag: "Router" } as AppRoute,
    readbacks: { ...base.readbacks, ...readbacks },
  });
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S641 routing alias id resolution", () => {
  it("resolves the hyphenated inventory alias instead of fabricating strategy.execution_mode", async () => {
    const container = await render({
      routerConfig: readback(configRows("baseline", "remote_only")),
      runtimeConfig: readback(
        runtimeConfigRows(["baseline.remote-only", "baseline.decision-only"]),
      ),
      router: readback([{ id: "endpoints", label: "endpoints", value: "12", meta: "summary" }]),
    });
    const text = container.textContent ?? "";
    expect(text).toContain("baseline.remote-only");
    expect(text).not.toContain("baseline.remote_only");
    expect(text).toContain("Execution mode");
    expect(text).toContain("remote_only");
  });

  it("prefers the active alias carried by the router readback profile", async () => {
    const container = await render({
      routerConfig: readback(configRows("baseline", "remote_only")),
      runtimeConfig: readback(runtimeConfigRows(["baseline.remote-only", "baseline.local-only"])),
      router: readback([
        { id: "alias", label: "alias", value: "baseline.local-only", meta: "active" },
        { id: "endpoints", label: "endpoints", value: "12", meta: "summary" },
      ]),
    });
    const text = container.textContent ?? "";
    expect(text).toContain("baseline.local-only");
    expect(text).not.toContain("baseline.remote_only");
  });
});
