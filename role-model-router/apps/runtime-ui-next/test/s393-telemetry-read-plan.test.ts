import { Effect, Fiber, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { Message } from "../src/message";
import {
  type RuntimeEventSourceFactory,
  type RuntimeEventSourceLike,
  refreshRevisionStream,
} from "../src/refresh";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S392a (R12): the telemetry read plan. ONE telemetry event must invalidate EVERY real source of
 * the current route -- one read for single-source routes, both reads for ModelsRoles and
 * SystemOperator, one control read for control routes, zero for routes without a source -- with
 * per-key token fencing and no refresh watermark movement.
 */

const telemetry = (requestId = "req-s393"): Message =>
  Message.RuntimeTelemetryReceived({ emittedAtMs: 1, requestId });

const commandsOf = (result: ReturnType<typeof shellUpdate>) => result.commands ?? [];
const readsOf = (result: ReturnType<typeof shellUpdate>, name: string) =>
  commandsOf(result).filter((command) => command.name === name);

const waitFor = async (read: () => boolean, label: string): Promise<void> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label);
};

interface FakeSource extends RuntimeEventSourceLike {
  closeCount(): number;
  emit(type: string, data: string): void;
  listenerCount(type: string): number;
}

const createFakeSource = (): FakeSource => {
  const listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();
  let closes = 0;
  return {
    addEventListener(type, listener) {
      const set = listeners.get(type) ?? new Set<(event: MessageEvent<string>) => void>();
      set.add(listener);
      listeners.set(type, set);
    },
    close() { closes += 1; },
    closeCount: () => closes,
    emit(type, data) {
      for (const listener of listeners.get(type) ?? []) listener(new MessageEvent(type, { data }));
    },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
  };
};

describe("S392a telemetry read plan (R12 exact multiplicity)", () => {
  const single = [
    ["LearningConfiguration", "learningConfiguration"],
    ["LearningPacks", "learningPacks"],
    ["LearningDecisions", "learningDecisions"],
    ["LearningEvidence", "learningEvidence"],
    ["LearningHistory", "learningHistory"],
    ["SystemExtensions", "extensions"],
    ["LocalLlamaSwapModels", "localLlamaSwapModels"],
  ] as const;

  for (const [tag, key] of single) {
    it(`invalidates exactly the one readback source for ${tag}`, () => {
      const model = shellModel({ route: { _tag: tag } });
      const result = shellUpdate(model, telemetry());
      const reads = readsOf(result, "ReadReadback");
      expect(reads).toHaveLength(1);
      expect(reads[0]?.args?.key).toBe(key);
      expect(reads[0]?.args?.token).toBe(model.readbacks[key].token + 1);
      expect(result.model.readbacks[key].status).toBe("loading");
      expect(result.model.refresh).toEqual(model.refresh);
    });
  }

  it("invalidates BOTH sources of ModelsRoles with per-key tokens", () => {
    const model = shellModel({ route: { _tag: "ModelsRoles" } });
    const result = shellUpdate(model, telemetry());
    const reads = readsOf(result, "ReadReadback");
    expect(reads.map((command) => String(command.args?.key)).sort()).toEqual(["configuredModels", "modelEndpoints"]);
    for (const command of reads) {
      const key = String(command.args?.key);
      // SAFETY: the two plan keys were asserted above; indexing only those readback keys.
      const readbackKey = key as "configuredModels" | "modelEndpoints";
      expect(Number(command.args?.token)).toBe(model.readbacks[readbackKey].token + 1);
      expect(result.model.readbacks[readbackKey].status).toBe("loading");
    }
    expect(result.model.refresh).toEqual(model.refresh);
  });

  it("invalidates BOTH sources of SystemOperator with per-key tokens", () => {
    const model = shellModel({ route: { _tag: "SystemOperator" } });
    const result = shellUpdate(model, telemetry());
    const reads = readsOf(result, "ReadReadback");
    expect(reads.map((command) => String(command.args?.key)).sort()).toEqual(["operatorStatus", "operatorTraceRoots"]);
    for (const command of reads) {
      const key = String(command.args?.key);
      // SAFETY: the two plan keys were asserted above; indexing only those readback keys.
      const readbackKey = key as "operatorStatus" | "operatorTraceRoots";
      expect(Number(command.args?.token)).toBe(model.readbacks[readbackKey].token + 1);
      expect(result.model.readbacks[readbackKey].status).toBe("loading");
    }
  });

  for (const [tag, key] of [
    ["Providers", "providers"],
    ["Endpoints", "endpoints"],
    ["ControlController", "controlController"],
  ] as const) {
    it(`invalidates the control surface ${tag} with ONE ReadControl`, () => {
      const model = shellModel({ route: { _tag: tag } });
      const result = shellUpdate(model, telemetry());
      expect(readsOf(result, "ReadReadback")).toHaveLength(0);
      const reads = readsOf(result, "ReadControl");
      expect(reads).toHaveLength(1);
      expect(reads[0]?.args?.key).toBe(key);
      expect(reads[0]?.args?.token).toBe(model.controls[key].token + 1);
      expect(result.model.controls[key].status).toBe("loading");
      expect(result.model.refresh).toEqual(model.refresh);
    });
  }

  it("emits ZERO commands for a route without a readback or control source", () => {
    const model = shellModel({ route: { _tag: "Studio" } });
    const result = shellUpdate(model, telemetry());
    expect(commandsOf(result)).toHaveLength(0);
  });

  it("keeps exact multiplicity for two telemetry events (one read each, tokens advance per event)", () => {
    const first = shellUpdate(shellModel({ route: { _tag: "LearningDecisions" } }), telemetry("req-a"));
    expect(readsOf(first, "ReadReadback")).toHaveLength(1);
    const second = shellUpdate(first.model, telemetry("req-b"));
    const reads = readsOf(second, "ReadReadback");
    expect(reads).toHaveLength(1);
    expect(reads[0]?.args?.token).toBe(first.model.readbacks.learningDecisions.token + 1);
  });

  it("registers ONE listener pair on ONE source and closes it exactly once", async () => {
    const source = createFakeSource();
    const factory: RuntimeEventSourceFactory = () => source;
    const messages: Message[] = [];
    const fiber = Effect.runFork(
      Stream.runForEach(refreshRevisionStream(factory), (message) =>
        Effect.sync(() => { messages.push(message); })),
    );
    try {
      await waitFor(() => source.listenerCount("telemetry.update") === 1, "one telemetry listener");
      expect(source.listenerCount("revision.update")).toBe(1);
      source.emit(
        "telemetry.update",
        JSON.stringify({ emittedAtMs: 1, eventName: "telemetry.update", request: { requestId: "req-1" } }),
      );
      await waitFor(() => messages.length === 1, "one telemetry message");
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber));
    }
    expect(source.closeCount()).toBe(1);
    source.emit(
      "telemetry.update",
      JSON.stringify({ emittedAtMs: 2, eventName: "telemetry.update", request: { requestId: "req-2" } }),
    );
    expect(messages).toHaveLength(1);
  });
});
