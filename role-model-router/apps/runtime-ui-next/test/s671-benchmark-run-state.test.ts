import { describe, expect, it } from "vitest";

import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S671: the benchmark run chain owns a dedicated monotonic generation token
 * (modelsView.benchmarkRunToken) and fences every start/poll/failure result on it plus the runId.
 * Before this the start fence read a readback token (a readback landing between request and
 * response dropped the start) and a stale poll failure could fail a newer run.
 */
const modelWithRun = (runToken: number, runId = "run-A") => {
  const base = shellModel();
  return shellModel({
    route: { _tag: "Benchmark" },
    modelsView: {
      ...base.modelsView,
      benchmarkAction: { status: "saving" },
      benchmarkProgress: { runId, status: "running" },
      benchmarkRunToken: runToken,
    },
  });
};

describe("S671 benchmark run generation fencing", () => {
  it("ignores a stale start failure from a superseded run", () => {
    const model = modelWithRun(2);
    const result = shellUpdate(
      model,
      Message.BenchmarkRunStartFailed({ message: "old failure", token: 1 }),
    );
    const state = result.model.modelsView;
    expect(state?.benchmarkRunToken).toBe(2);
    expect(state?.benchmarkProgress?.runId).toBe("run-A");
    expect(state?.benchmarkAction?.status).toBe("saving");
  });

  it("applies a start failure whose generation matches", () => {
    const model = modelWithRun(2);
    const result = shellUpdate(
      model,
      Message.BenchmarkRunStartFailed({ message: "real failure", token: 2 }),
    );
    const state = result.model.modelsView;
    expect(state?.benchmarkProgress).toBeUndefined();
    expect(state?.benchmarkAction).toEqual({ message: "real failure", status: "error" });
  });

  it("applies a start response even when a readback token moved in between", () => {
    const base = shellModel();
    const model = shellModel({
      route: { _tag: "Benchmark" },
      readbacks: {
        ...base.readbacks,
        benchmarkSummary: { ...base.readbacks.benchmarkSummary, token: 99 },
      },
      modelsView: { ...base.modelsView, benchmarkRunToken: 3, benchmarkAction: { status: "saving" } },
    });
    const result = shellUpdate(model, Message.BenchmarkRunStarted({ runId: "run-A", token: 3 }));
    expect(result.model.modelsView?.benchmarkProgress?.status).toBe("running");
    expect(result.model.modelsView?.benchmarkProgress?.runId).toBe("run-A");
    expect((result.commands ?? []).length).toBeGreaterThan(0);
  });

  it("ignores a start response from a superseded generation", () => {
    const base = shellModel();
    const model = shellModel({
      route: { _tag: "Benchmark" },
      modelsView: { ...base.modelsView, benchmarkRunToken: 4, benchmarkAction: { status: "saving" } },
    });
    const result = shellUpdate(model, Message.BenchmarkRunStarted({ runId: "run-A", token: 2 }));
    expect(result.model.modelsView?.benchmarkProgress).toBeUndefined();
    expect((result.commands ?? []).length).toBe(0);
  });

  it("ignores a stale poll failure for a different run", () => {
    const model = modelWithRun(2, "run-A");
    const result = shellUpdate(
      model,
      Message.BenchmarkRunPollFailed({ message: "old poll failed", runId: "run-B", token: 2 }),
    );
    expect(result.model.modelsView?.benchmarkProgress?.status).toBe("running");
  });

  it("ignores a poll failure from a stale generation", () => {
    const model = modelWithRun(2, "run-A");
    const result = shellUpdate(
      model,
      Message.BenchmarkRunPollFailed({ message: "stale", runId: "run-A", token: 1 }),
    );
    expect(result.model.modelsView?.benchmarkProgress?.status).toBe("running");
  });

  it("applies the current run's poll failure and stops the panel", () => {
    const model = modelWithRun(2, "run-A");
    const result = shellUpdate(
      model,
      Message.BenchmarkRunPollFailed({ message: "current failed", runId: "run-A", token: 2 }),
    );
    const state = result.model.modelsView;
    expect(state?.benchmarkProgress?.status).toBe("failed");
    expect(state?.benchmarkProgress?.message).toBe("current failed");
  });
});
