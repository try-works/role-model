import { Effect } from "effect";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";
import type { Model } from "../src/model";
import { studioIdle, type StudioState } from "../src/studio";
import type { AppRoute } from "../src/route";

const readback = (rows: readonly { id: string; label: string; value: string; meta: string }[]) => ({ rows, status: "ok" as const, token: 1 });
const row = { id: "row-1", label: "First row", value: "ready", meta: "host" };

type Overrides = { readonly readbacks?: Partial<Model["readbacks"]>; readonly controls?: Model["controls"]; readonly studioTab?: StudioState["tab"] };
const render = async (tag: AppRoute["_tag"], overrides: Overrides = {}) => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: the test supplies one of the exact AppRoute tags.
    route: { _tag: tag } as AppRoute,
    readbacks: { ...base.readbacks, ...(overrides.readbacks ?? {}) },
    controls: overrides.controls ?? base.controls,
    studio: { ...studioIdle(), tab: overrides.studioTab ?? studioIdle().tab },
  });
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};
const expectTitles = async (tag: AppRoute["_tag"], titles: readonly string[], overrides: Overrides = {}, tables = 0) => {
  const container = await render(tag, overrides);
  const text = container.textContent ?? "";
  for (const title of titles) expect(text).toContain(title);
  if (tables > 0) expect(container.querySelectorAll("table").length).toBeGreaterThanOrEqual(tables);
  expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1);
};

describe("S534 providers/studio/system/local structural parity", () => {
  it("providers page has the remote-provider sections", async () => {
    await expectTitles("Providers", ["Remote providers", "Choose provider and models", "Configured provider connections"]);
  });
  it("studio chat workspace", async () => {
    await expectTitles("Studio", ["Chat workspace", "Request", "Result workspace"]);
  });
  it("studio images workspace", async () => {
    await expectTitles("Studio", ["Image request modes"], { studioTab: "images" });
  });
  it("studio audio workspace", async () => {
    await expectTitles("Studio", ["Audio mode and request"], { studioTab: "audio" });
  });
  it("studio rerank workspace", async () => {
    await expectTitles("Studio", ["Rerank request", "Ranked results"], { studioTab: "rerank" });
  });
  it("studio advanced workspace", async () => {
    await expectTitles("Studio", ["Advanced workspace"], { studioTab: "advanced" });
  });
  it("system extensions sections", async () => {
    await expectTitles("SystemExtensions", ["Extension boundary", "Replay automation", "Contribution posture", "Recommendation ledger", "Extension inventory"], { readbacks: { extensions: readback([row]) } }, 1);
  });
  it("system operator sections", async () => {
    await expectTitles("SystemOperator", ["Operator controls", "Trace lineage", "Replay Jobs", "Evaluation Jobs", "Shadow Learning"], { readbacks: { operatorStatus: readback([row]), operatorTraceRoots: readback([row]), replayJobs: readback([row]), evaluationJobs: readback([row]) } }, 4);
  });
  it("system peers table", async () => {
    await expectTitles("SystemPeers", ["Peer topology", "Peer inventory", "Peer config", "Contract fields"], { readbacks: { systemPeers: readback([row]) } }, 1);
  });
  it("storage retention table", async () => {
    await expectTitles("StorageRetention", ["Storage & retention", "Logical classes", "Manual pruning", "Retention policy"], { readbacks: { storageRetention: readback([row]) } }, 1);
  });
  it("local choose peer-backed models", async () => {
    await expectTitles("LocalChoose", ["Choose local backend", "EXTERNAL SERVER", "MANAGED BY ROLE-MODEL", "Peer-backed models", "Llama-swap models"], { readbacks: { localPeers: readback([row]), localLlamaSwapModels: readback([row]) } }, 1);
  });
  it("local peers table", async () => {
    await expectTitles("LocalPeers", ["Local endpoints", "Endpoint inventory", "Add peer endpoint"], { readbacks: { localPeers: readback([row]) } }, 1);
  });
  it("local logs history", async () => {
    await expectTitles("LocalLogs", ["Llama-swap logs", "Structured local log history", "Raw log streams"], { readbacks: { localLogs: readback([row]) } }, 1);
  });
  it("local swap ledger", async () => {
    await expectTitles("LocalSwap", ["Llama-swap swap history", "Event ledger", "Ledger semantics", "Initial load", "Swap reason", "Timeline order"], { readbacks: { localSwap: readback([row]) } }, 1);
  });
  it("llama-swap models load/loaded", async () => {
    await expectTitles("LocalLlamaSwapModels", ["Llama-swap models", "Load model", "Loaded models"], { readbacks: { localLlamaSwapModels: readback([row]) } }, 1);
  });
  it("llama-swap policy title", async () => {
    const policyMeta = "{\"autoUnload\":true,\"maxConcurrency\":1,\"ttl\":300}";
    await expectTitles("LocalPolicy", ["Llama-swap host policy", "Policy configuration", "Raw policy"], { readbacks: { localPolicy: readback([{ id: "policy", label: "Persisted policy", value: "", meta: policyMeta }, { id: "draft", label: "Draft policy", value: "", meta: policyMeta }]) } });
  });
});
