import { Effect } from "effect";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { emptyReadbacks } from "../src/readback";
import { shellModel } from "./support/runtime-shell";
import { studioIdle, type StudioState } from "../src/studio";
import { view } from "../src/view";
import type { AppRoute } from "../src/route";
import type { Model } from "../src/model";

const row = { id: "row-1", label: "First row", value: "ready", meta: "host" };
const readback = (rows = [row]) => ({ rows, status: "ok" as const, token: 1 });

const renderPage = async (tag: AppRoute["_tag"], readbacks: Partial<Model["readbacks"]> = {}, tab?: StudioState["tab"]): Promise<HTMLElement> => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: the test supplies one of the exact AppRoute tags.
    route: { _tag: tag } as AppRoute,
    readbacks: { ...emptyReadbacks(), ...base.readbacks, ...readbacks },
    studio: { ...studioIdle(), tab: tab ?? studioIdle().tab },
  });
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const headings = (container: HTMLElement): readonly string[] =>
  [...container.querySelectorAll("h2,h3")].map((node) => node.textContent?.trim() ?? "");

const expectOrder = (container: HTMLElement, titles: readonly string[]) => {
  const all = headings(container);
  let at = -1;
  for (const title of titles) {
    const found = all.findIndex((heading, index) => index > at && heading === title);
    expect(found, "missing heading in order: " + title + " in " + JSON.stringify(all)).toBeGreaterThan(at);
    at = found;
  }
};

const expectColumns = (container: HTMLElement, columns: readonly string[]) => {
  const headers = [...container.querySelectorAll("table thead th")].map((cell) => cell.textContent?.trim() ?? "");
  for (const column of columns) expect(headers).toContain(column);
};

const expectControls = (container: HTMLElement, names: readonly string[]) => {
  const controls = [...container.querySelectorAll("button, a[role='button'], input, select")];
  const labels = [...container.querySelectorAll("label")].map((label) => label.textContent?.trim() ?? "");
  for (const name of names) {
    const found = controls.some((element) => {
      const text = element.textContent?.trim() ?? "";
      const aria = element.getAttribute("aria-label") ?? "";
      const title = element.getAttribute("title") ?? "";
      const labelledInput = element.tagName === "INPUT" && labels.some((label) => label.includes(name));
      return text === name || aria.includes(name) || title === name || labelledInput;
    });
    expect(found, "missing control " + name).toBe(true);
  }
};

const learningReadbacks = () => ({
  learning: readback(),
  learningConfiguration: readback(),
  learningPacks: readback(),
  learningDecisions: readback(),
  learningEvidence: readback(),
  learningHistory: readback(),
  replayJobs: readback(),
  evaluationJobs: readback(),
});

describe("S563 learning/models/studio/local reference layout", () => {
  it("learning overview", async () => {
    const page = await renderPage("Learning", learningReadbacks());
    expectOrder(page, ["Learning overview", "Live replay & evaluation", "Recent decisions"]);
    expectControls(page, ["Operator token"]);
  });

  it("learning configuration", async () => {
    const page = await renderPage("LearningConfiguration", learningReadbacks());
    expectOrder(page, ["Learning configuration"]);
    expectControls(page, ["Operator token"]);
  });

  it("learning packs", async () => {
    const page = await renderPage("LearningPacks", learningReadbacks());
    expectOrder(page, ["Learned packs", "ENDPOINT LADDER INDEX", "TASK-SCOPED LEARNED PACKS"]);
    expectColumns(page, ["ROLE · TASK", "TOP ENDPOINTS", "ACTIVATION", "PACK", "VALIDATION", "STATE"]);
    expectControls(page, ["Roll back active pack (scope-wide)", "Engage kill switch", "Release kill switch"]);
  });

  it("learning decisions", async () => {
    const page = await renderPage("LearningDecisions", learningReadbacks());
    expectOrder(page, ["Decision receipts"]);
    expectColumns(page, ["DECISION", "OUTCOME", "ORIGIN", "EVIDENCE"]);
    expectControls(page, ["Role", "Task", "Outcome", "Advisory state", "Observation origin"]);
  });

  it("learning evidence", async () => {
    const page = await renderPage("LearningEvidence", learningReadbacks());
    expectOrder(page, ["Evidence", "Evidence loss by reason"]);
    expectColumns(page, ["Guardrail", "Bound", "Observed", "Verdict", "REASON", "COUNT", "DETAIL"]);
    expectControls(page, []);
  });

  it("learning history", async () => {
    const page = await renderPage("LearningHistory", learningReadbacks());
    expectOrder(page, ["Learning history"]);
    expectColumns(page, ["BUCKET", "VALUE", "DETAIL"]);
  });

  it("models", async () => {
    const page = await renderPage("Models", { configuredModels: readback(), modelEndpoints: readback() });
    expectOrder(page, ["Model inventory"]);
  });

  it("models roles", async () => {
    const page = await renderPage("ModelsRoles", { configuredModels: readback(), modelEndpoints: readback() });
    expectOrder(page, ["Create role", "Role catalog", "Role task allowlists", "Edit selected role"]);
    expectControls(page, ["Role id", "Name", "Description", "Default system instructions", "Kind", "Tool policy mode", "Create role", "Reset"]);
  });

  it("benchmark", async () => {
    const cases = [1, 2, 3].map((index) => ({
      id: "case-" + String(index),
      label: "case-" + String(index),
      meta: JSON.stringify({ benchmarkEligible: true, quickBenchmark: true }),
      value: "hard",
    }));
    const endpoints = readback([
      { id: "ep-a", label: "ep-a", meta: JSON.stringify({ endpointId: "ep-a", healthStatus: "healthy", modelId: "model-a", sourceType: "remote" }), value: "remote" },
      { id: "ep-b", label: "ep-b", meta: JSON.stringify({ endpointId: "ep-b", healthStatus: "healthy", modelId: "model-b", sourceType: "local" }), value: "local" },
    ]);
    const page = await renderPage("Benchmark", { benchmarkSuite: readback(cases), modelEndpoints: endpoints });
    expectOrder(page, ["Capability benchmark", "Run capability benchmark", "Benchmark scores", "Taxonomy dimensions", "Run history"]);
    expectColumns(page, ["Model", "Path", "Scope", "Status", "MODEL", "SCOPE", "STATUS", "DIMENSION", "VALUE", "SCORE", "RUN"]);
    expectControls(page, ["Benchmark mode", "Judge endpoint", "Run quick benchmark (2 models, 3 cases)", "Clear all benchmark data"]);
  });

  for (const [tab, titles, controls] of [
    ["chat", ["Request", "Result workspace"], ["Run request"]],
    ["images", ["Image request modes", "Image result stage"], ["Run image request"]],
    ["audio", ["Audio mode and request", "Audio result stage"], ["Run audio request", "Voice"]],
    ["rerank", ["Rerank request", "Ranked results"], ["Submit rerank request"]],
    ["advanced", ["Endpoint family", "Response workspace"], ["Submit advanced request"]],
  ] as const) {
    it("studio " + tab, async () => {
      const page = await renderPage("Studio", {}, tab);
      expectOrder(page, titles);
      expectControls(page, controls);
    });
  }

  it("local choose", async () => {
    const page = await renderPage("LocalChoose", { localPeers: readback(), localLlamaSwapModels: readback() });
    expectOrder(page, ["Peer-backed models", "Llama-swap models"]);
    expectControls(page, ["Open peer models", "Configure endpoints", "Open llama-swap models", "Edit runtime config"]);
  });

  it("local peers", async () => {
    const page = await renderPage("LocalPeers", { localPeers: readback() });
    expectOrder(page, ["Endpoint inventory", "Add peer endpoint"]);
    expectColumns(page, ["Endpoint", "Status", "Type", "Actions"]);
    expectControls(page, ["Endpoint URL", "Add endpoint"]);
  });

  it("peer models", async () => {
    const page = await renderPage("LocalPeerModels", { localPeerModels: readback() });
    expectOrder(page, ["Register model", "Registered models"]);
    expectControls(page, ["Model ID", "Register model"]);
  });

  it("local logs", async () => {
    const page = await renderPage("LocalLogs", { localLogs: readback() });
    expectOrder(page, ["Structured local log history", "Raw log streams"]);
    expectColumns(page, ["Time", "Source", "Level", "Message", "Request"]);
  });

  it("llama-swap models", async () => {
    const page = await renderPage("LocalLlamaSwapModels", { localLlamaSwapModels: readback() });
    expectOrder(page, ["Load model", "Loaded models"]);
    expectControls(page, ["Model ID", "Load model"]);
  });

  it("llama-swap swap", async () => {
    const page = await renderPage("LocalSwap", { localSwap: readback() });
    expectOrder(page, ["Event ledger", "Ledger semantics"]);
    expectColumns(page, ["Timestamp", "Model", "Reason"]);
  });

  it("llama-swap policy", async () => {
    const page = await renderPage("LocalPolicy", { localPolicy: readback() });
    expectOrder(page, ["Policy configuration", "Raw policy"]);
    expectControls(page, []);
  });
});
