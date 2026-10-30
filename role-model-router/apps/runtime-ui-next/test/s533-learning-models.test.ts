import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";

const renderContainer = async (tag: string): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    // SAFETY: each test passes one of the literal route tags exercised below.
    init: () => ({ model: shellModel({ route: { _tag: tag } as never }), commands: [] }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const check = async (tag: string, labels: ReadonlyArray<string>): Promise<string> => {
  const container = await renderContainer(tag);
  const text = container.textContent ?? "";
  for (const label of labels) expect(text).toContain(label);
  expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1);
  expect(container.querySelectorAll("table").length).toBeGreaterThanOrEqual(1);
  return text;
};

describe("S533 learning/models structural parity", () => {
  it("learning overview", async () => { await check("Learning", ["Learning overview", "Live replay & evaluation", "Recent decisions"]); });
  it("learning configuration", async () => { await check("LearningConfiguration", ["Learning configuration", "Operator token", "Operator identity"]); });
  it("learning decisions", async () => { await check("LearningDecisions", ["Decision receipts", "Role", "Task", "Outcome", "Advisory state", "Observation origin"]); });
  it("learning evidence", async () => { await check("LearningEvidence", ["Cohort evidence", "Evidence", "Evidence loss by reason"]); });
  it("learning history", async () => { await check("LearningHistory", ["Learning history"]); });
  it("learning packs", async () => { await check("LearningPacks", ["Learned packs", "ENDPOINT LADDER INDEX", "TASK-SCOPED LEARNED PACKS"]); });
  it("models inventory", async () => { await check("Models", ["Model inventory", "Select a model to inspect and configure", "No configured models are available yet.", "Open Local Models", "Open Local Endpoints", "Open Providers"]); });
  it("models roles", async () => { await check("ModelsRoles", ["Create role", "Role catalog", "Role task allowlists", "Edit selected role"]); });
  it("models benchmark", async () => { await check("Benchmark", ["Capability benchmark", "Run capability benchmark", "Benchmark scores", "Taxonomy dimensions", "Run history"]); });
});