import { afterEach, describe, expect, it } from "vitest";

import { Message } from "../src/message";
import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";

const suite = {
  cases: [
    {
      benchmark_eligible: true,
      case_id: "c1",
      category: "knowledge",
      difficulty_bucket: "easy",
      quick_benchmark: true,
    },
  ],
  description: "fixture",
  suite_id: "suite-1",
  suite_version: "1.0",
  task_type: "capability",
};
const summary = {
  completedAtMs: null,
  judgeEndpointId: null,
  judgeModelId: null,
  mode: null,
  runId: null,
  subjects: [],
  suiteId: "suite-1",
};
const runs: ReadonlyArray<unknown> = [];
const endpoints = [
  { benchmarkEligible: true, endpointId: "ep-a", modelId: "model-a", sourceType: "remote" },
  { benchmarkEligible: true, endpointId: "ep-b", modelId: "model-b", sourceType: "remote" },
];
const responseFor = (path: string): Response => {
  const body = path.includes("/benchmark/suite")
    ? suite
    : path.includes("/benchmark/summary")
      ? summary
      : path.includes("/benchmark/runs")
        ? runs
        : path.includes("/benchmark/preferences")
          ? {}
          : path.includes("/benchmark/active-run")
            ? {}
            : path.includes("/api/role-model/endpoints")
              ? endpoints
              : { rows: [] };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
};

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

const waitFor = async (selector: string, timeoutMs = 5000): Promise<Element | null> => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const found = document.querySelector(selector);
    if (found !== null) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return null;
};

describe("S633 benchmark endpoint loading", () => {
  it("requests modelEndpoints when the Benchmark route is invalidated", () => {
    const base = shellModel({ route: { _tag: "Benchmark" } });
    const next = shellUpdate(base, Message.RuntimePageRestored());
    const keys = (next.commands ?? []).flatMap((command) => {
      const candidate = command as unknown as { readonly args?: { readonly key?: string } };
      return candidate.args?.key === undefined ? [] : [candidate.args.key];
    });
    expect(keys).toContain("modelEndpoints");
  });

  it("mounts /system/benchmark, renders endpoint checkboxes and enables Run", async () => {
    window.history.replaceState({}, "", "/system/benchmark");
    const container = document.createElement("div");
    container.id = "s633-benchmark";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackReaders: createReadbackClients({
        fetchImpl: async (input) => responseFor(String(input)),
      }),
    });
    mounted.push({ container, handle });
    const firstCheckbox = await waitFor("input[type='checkbox'][aria-label^='Select ']");
    expect(firstCheckbox).not.toBeNull();
    const run = document.querySelector("[data-benchmark-run]");
    const checkboxes = document.querySelectorAll("input[type='checkbox'][aria-label^='Select ']");
    expect(checkboxes).toHaveLength(2);
    expect(document.body.textContent).toContain("2 of 2 selected");
    expect(run?.hasAttribute("disabled")).toBe(false);
  });
});
