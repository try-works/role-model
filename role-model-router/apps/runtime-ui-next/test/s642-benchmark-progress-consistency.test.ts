import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Message } from "../src/message";
import { mountShell } from "../src/mount";
import { emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";
import { view } from "../src/view";

/** S642 (task-132): the benchmark request carries every checked endpoint, progress shows requested vs executed and stale/contradictory snapshots never win. */

const endpoint = (endpointId: string, modelId: string) => ({ endpointId, modelId, sourceType: "remote" });
const endpointsBody = [endpoint("ep-a", "model-a"), endpoint("ep-b", "model-b"), endpoint("ep-c", "model-c")];
const endpointsReadback = parseReadbackFixture("modelEndpoints", endpointsBody);

const renderWith = async (modelsView: Record<string, unknown>, readbacks: Record<string, unknown> = {}) => {
  const base = shellModel({ route: { _tag: "Benchmark" } });
  const model = { ...base, modelsView: { ...base.modelsView, ...modelsView }, readbacks: { ...emptyReadbacks(), ...base.readbacks, ...readbacks } };
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const waitFor = async (read: () => boolean, label: string) => {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for " + label);
};

describe("S642 benchmark request and progress coherence", () => {
  it("posts every checked endpoint id from the mounted route", async () => {
    window.history.replaceState({}, "", "/system/benchmark");
    const bodies: Array<{ readonly endpointIds?: ReadonlyArray<string> }> = [];
    const container = document.createElement("div");
    container.id = "s642-benchmark";
    document.body.append(container);
    const handle = mountShell(container, {
      modelsFetchImpl: async (input, init) => {
        const url = String(input);
        if (url === "/api/role-model/benchmark/runs") {
          bodies.push(JSON.parse(String(init?.body)));
          return new Response(JSON.stringify({ runId: "run-1", status: "running" }), { status: 202, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
      },
      readbackFetchImpl: async (input) => {
        const url = String(input);
        const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
        if (url.includes("/benchmark/suite")) return json({ cases: [{ benchmark_eligible: true, case_id: "c1", difficulty_bucket: "easy", quick_benchmark: true }], suite_id: "s", suite_version: "1" });
        if (url.includes("/endpoints")) return json(endpointsBody);
        if (url.includes("/benchmark/runs")) return json([]);
        return json({});
      },
    });
    try {
      await waitFor(() => document.querySelector("input[aria-label='Select model-a']") !== null, "endpoint rows");
      const judge = document.querySelector("select[aria-label='Judge endpoint']") as HTMLSelectElement;
      judge.value = "ep-a";
      judge.dispatchEvent(new Event("change", { bubbles: true }));
      for (const id of ["ep-a", "ep-b", "ep-c"]) {
        const input = document.querySelector("input[aria-label='Select model-" + id.slice(3) + "']") as HTMLInputElement | null;
        if (input !== null && !input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      const run = [...document.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Run quick benchmark"));
      expect(run).not.toBeUndefined();
      run?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await waitFor(() => bodies.length > 0, "benchmark POST");
      expect([...(bodies[0]?.endpointIds ?? [])].sort()).toEqual(["ep-a", "ep-b", "ep-c"]);
    } finally {
      handle.dispose();
      container.remove();
    }
  });

  it("shows host requested/executed counts and skipped endpoints", async () => {
    const result = { endpointGrades: [{ endpointId: "ep-a", modelId: "model-a", overallScore: 1, caseResults: [{ caseId: "c1", score: 1, rationale: "ok" }] }, { endpointId: "ep-b", modelId: "model-b", overallScore: 1, caseResults: [{ caseId: "c1", score: 1, rationale: "ok" }] }] };
    const container = await renderWith({
      benchmarkRunRequestedEndpointIds: ["ep-a", "ep-b", "ep-c"],
      benchmarkProgress: { completedSteps: 60, executedEndpointCount: 2, requestedEndpointCount: 3, resultJson: JSON.stringify(result), runId: "run-1", skippedEndpoints: ["ep-c"], status: "completed", totalSteps: 60 },
    });
    const counts = container.querySelector("[data-benchmark-endpoint-counts]")?.textContent ?? "";
    expect(counts).toBe("Requested 3 endpoints · executed 2 · skipped: ep-c");
  });

  it("derives the skipped endpoints from the click-time selection when the host has not started reporting counts", async () => {
    const result = { endpointGrades: [{ endpointId: "ep-a", modelId: "model-a", overallScore: 1, caseResults: [{ caseId: "c1", score: 1, rationale: "ok" }] }] };
    const container = await renderWith({
      benchmarkRunRequestedEndpointIds: ["ep-a", "ep-b", "ep-c"],
      benchmarkProgress: { completedSteps: 60, resultJson: JSON.stringify(result), runId: "run-1", status: "completed", totalSteps: 60 },
    });
    const counts = container.querySelector("[data-benchmark-endpoint-counts]")?.textContent ?? "";
    expect(counts).toBe("Requested 3 endpoints · executed 1 · skipped: ep-b, ep-c");
  });

  it("ignores a polled snapshot from another run and keeps polling the started run", () => {
    const base = shellModel({ route: { _tag: "Benchmark" } });
    const started = shellUpdate(base, Message.BenchmarkRunStarted({ runId: "run-A", token: 1 }));
    const stale = shellUpdate(started.model, Message.BenchmarkRunPolled({
      progressJson: JSON.stringify({ caseIndex: 4, completedSteps: 2, runId: "run-B", status: "running", totalSteps: 60 }),
      token: 2,
    }));
    expect(stale.model.modelsView?.benchmarkProgress?.runId).toBe("run-A");
    const command = (stale.commands ?? [])[0] as unknown as { readonly args: { readonly runId: string }; readonly name: string };
    expect(command.name).toBe("PollBenchmarkRun");
    expect(command.args.runId).toBe("run-A");
  });

  it("never renders a case index that contradicts the completed step count", async () => {
    const container = await renderWith({
      benchmarkProgress: { caseCount: 12, caseIndex: 4, completedSteps: 2, currentCaseId: "case-4", currentPhase: "execute", runId: "run-1", runPhase: "execution", status: "running", totalSteps: 60 },
    });
    const text = container.querySelector("[data-benchmark-progress-detail]")?.textContent ?? "";
    expect(text).not.toContain("case 5/12");
    expect(container.querySelector("[data-benchmark-progress-steps]")?.textContent).toBe("2 / 60 steps");
  });
});
