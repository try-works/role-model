import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";

const check = async (
  tag: string,
  labels: ReadonlyArray<string>,
  controls: { readonly buttons?: ReadonlyArray<string>; readonly inputs?: ReadonlyArray<string>; readonly tables?: number; readonly svgs?: number; readonly tablesExactly?: number; readonly svgsExactly?: number; readonly skipStructure?: boolean; readonly cards?: number } = {},
): Promise<void> => {
  const rendered = await Effect.runPromise(renderToString({
    // SAFETY: each test passes one of the literal route tags exercised below.
    init: () => ({ model: shellModel({ route: { _tag: tag } as never }), commands: [] }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  const text = container.textContent ?? "";
  for (const label of labels) expect(text).toContain(label);
  if (controls.cards !== undefined) expect(container.querySelectorAll("[data-route] > section").length).toBe(controls.cards);
  if (controls.skipStructure !== true) {
    if (controls.tablesExactly !== undefined) expect(container.querySelectorAll("table").length).toBe(controls.tablesExactly);
    else expect(container.querySelectorAll("table").length).toBeGreaterThanOrEqual(controls.tables ?? 1);
    if (controls.svgsExactly !== undefined) expect(container.querySelectorAll("svg").length).toBe(controls.svgsExactly);
    else expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(controls.svgs ?? 1);
  }
  for (const name of controls.buttons ?? []) {
    const button = [...container.querySelectorAll("button, [role='button']")].find((candidate) => candidate.textContent?.trim() === name);
    expect(button, "missing button " + name).toBeDefined();
  }
  for (const name of controls.inputs ?? []) {
    const labelled = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes(name));
    const labelledFor = labelled?.getAttribute("for");
    const byFor = labelledFor === undefined || labelledFor === null ? null : container.querySelector("#" + labelledFor);
    expect(
      container.querySelector('input[aria-label="' + name + '"]') ?? labelled?.querySelector("input") ?? byFor ?? null,
      "missing input " + name,
    ).not.toBeNull();
  }
};

describe("S540 system/local density", () => {
  it("session readiness", async () => { await check("SessionReadiness", ["Session bootstrap", "Canonical lifecycle", "Operator intent manifest", "Credential readiness", "Routable inventory", "Alias drift warnings"], { skipStructure: true }); });
  it("endpoints", async () => { await check("Endpoints", ["Available models & endpoints", "Runtime connections", "Provider", "Connection", "Model", "Endpoint", "Effort", "Source", "Health", "Readiness"]); });
  it("runtime", async () => { await check("Runtime", ["Applied runtime policy", "Execution readiness", "Controller posture", "Version facts"], { skipStructure: true }); });
  it("agent strategy", async () => { await check("RouterAgentStrategy", ["Posture diagnostics", "Entries", "EDITING SAVED ENTRY RESEARCHER", "Role (required)"], { buttons: ["Add entry", "Save Agent strategy"], skipStructure: true }); });
  it("queues", async () => { await check("Queues", ["Queue state", "Queue truth from the shared store", "Waiting", "Active", "Delayed", "Failed", "Stalled", "Oldest waiting", "Last error", "Drain"]); });
  it("system peers", async () => { await check("SystemPeers", ["Peer topology", "Peer inventory", "Peer config", "Contract fields", "proxy", "apiKey", "models", "filters · timeouts"], { tables: 0, skipStructure: false }); });
  it("workloads", async () => { await check("RouterWorkloads", ["Posture diagnostics", "Workload templates", "Entries", "Use batch template", "Use embedding template", "Add workload", "Save Workloads"], { buttons: ["Add workload", "Save Workloads"], skipStructure: true }); });
  it("llama-swap models", async () => { await check("LocalLlamaSwapModels", ["Load model", "Role summary", "28 selected · click to clear", "Loaded models", "No llama-swap models loaded yet."], { buttons: ["Load model", "Open runtime config"], inputs: ["Model ID"], tables: 0, svgs: 0 }); });
  it("llama-swap policy", async () => { await check("LocalPolicy", ["Llama-swap host policy", "Policy configuration", "Raw policy", "Edit runtime behavior for local model loading and unloading.", "No local policy readback is available."], { skipStructure: true }); });
  it("llama-swap swap", async () => { await check("LocalSwap", ["Event ledger", "Ledger semantics", "Initial load", "Swap reason", "Timeline order"], { tables: 0 }); });
  it("local peers", async () => { await check("LocalPeers", ["Local endpoints", "Endpoint inventory", "Add peer endpoint", "No peer endpoints configured."], { buttons: ["Add endpoint"], inputs: ["Endpoint URL"], tables: 0 }); });
});