import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { shellModel } from "./support/runtime-shell";
import { emptyReadbacks } from "../src/readback";
import { studioIdle } from "../src/studio";
import { view } from "../src/view";

const renderModel = async (overrides: Parameters<typeof shellModel>[0]): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model: shellModel(overrides), commands: [] }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const row = (id: string, label: string, value: string, meta: string) => ({ id, label, value, meta });

describe("S544 models density and studio tab depth", () => {
  it("models renders role/task rows and controller actions from endpoint data", async () => {
    const readbacks = {
      ...emptyReadbacks(),
      configuredModels: { rows: [row("gpt-5.4", "GPT-5.4", "openai", JSON.stringify({ id: "gpt-5.4", providerId: "openai" }))], status: "ok" as const, token: 1 },
      modelEndpoints: { rows: [row("endpoint-a", "gpt-5.4", "openai", JSON.stringify({ roleIds: ["writer", "coder", "analyst"], healthStatus: "healthy" }))], status: "ok" as const, token: 1 },
    };
    const container = await renderModel({ readbacks, route: { _tag: "Models" } });
    const text = container.textContent ?? "";
    for (const expected of ["GPT-5.4", "ROLES", "writer", "85 tasks", "coder", "49 tasks", "Make primary controller", "Open Roles", "Open Benchmark", "Eject controller"]) {
      expect(text).toContain(expected);
    }
  });

  for (const [tab, labels] of [
    ["chat", ["Chat workspace", "Request", "Result workspace"]],
    ["images", ["Images workspace", "Image request modes", "Image result stage", "GENERATED IMAGES", "\"No image request yet\""]],
    ["audio", ["Audio workspace", "Audio mode and request", "Audio result stage", "VOICE INVENTORY", "Voice inventory is unavailable on this runtime host."]],
    ["rerank", ["Rerank workspace", "Rerank request", "Ranked results", "CONTRACT DETAILS", "\"No rerank request yet\""]],
    ["advanced", ["Advanced workspace", "Endpoint family", "Response workspace", "REQUEST TEMPLATE", "deepseek.personal.deepseek-api-key.global.deepseek-flash-high"]],
  ] as const) {
    it("studio " + tab + " renders reference depth", async () => {
      const container = await renderModel({ studio: { ...studioIdle(), tab }, route: { _tag: "Studio" } });
      const text = container.textContent ?? "";
      for (const label of labels) expect(text).toContain(label);
    });
  }
});
