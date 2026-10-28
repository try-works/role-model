import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { defineEndpointAdmissionCommands } from "../src/commands";
import { renderEndpointAdmissionForm } from "../src/control-view";
import {
  createEndpointAdmissionClient,
  initialEndpointAdmissionState,
  type EndpointAdmissionDraft,
} from "../src/endpoint-admission";
import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S439 (R13/M8): aggregate completion of endpoint activations; no auto-retry of committed-or-unknown failures. */

const draft: EndpointAdmissionDraft = {
  activationBatchId: "activation-batch-1",
  batchMode: "false",
  modelInput: "",
  providerAccountId: "openai.personal.default",
  reasoningEffort: "high",
  region: "global",
  selectedModelIds: ["gpt-6", "gpt-6-mini"],
};

const stateWithDraft = (draftOverride: Partial<EndpointAdmissionDraft> = {}) => ({
  ...initialEndpointAdmissionState(),
  draft: { ...draft, ...draftOverride },
});
const modelWith = (state = stateWithDraft()) => shellModel({ endpointAdmission: state });
const commandsOf = (result: ReturnType<typeof shellUpdate>) => result.commands ?? [];
const metadata = (result: ReturnType<typeof shellUpdate>) =>
  commandsOf(result).map((command) => ({
    activationId: String(command.args?.activationId),
    generation: Number(command.args?.generation),
    name: command.name,
    // SAFETY: this test controls the JSON payload written by the submit handler; it is compared as raw data.
    payload: JSON.parse(String(command.args?.payload)) as unknown,
  }));
const modelAfter = (result: ReturnType<typeof shellUpdate>) => result.model.endpointAdmission!;

describe("S439 aggregate endpoint completion", () => {
  it("single mode captures one distinct activation id per model in one generation", () => {
    const submitted = shellUpdate(modelWith(), Message.EndpointAdmissionSubmitRequested({}));
    const commands = metadata(submitted);
    expect(commands.map((entry) => entry.name)).toEqual(["ActivateEndpoint", "ActivateEndpoint"]);
    expect(commands.map((entry) => entry.activationId)).toEqual(["model:gpt-6", "model:gpt-6-mini"]);
    expect(new Set(commands.map((entry) => entry.generation)).size).toBe(1);
    expect(commands.map((entry) => entry.payload)).toEqual([
      { modelId: "gpt-6", providerAccountId: "openai.personal.default", reasoningEffort: "high", region: "global" },
      { modelId: "gpt-6-mini", providerAccountId: "openai.personal.default", reasoningEffort: "high", region: "global" },
    ]);
    expect(modelAfter(submitted).status).toBe("saving");
    expect(modelAfter(submitted).run.pending).toHaveLength(2);
  });

  it("does not report saved after the FIRST success and refuses a pending submit", () => {
    const submitted = shellUpdate(modelWith(), Message.EndpointAdmissionSubmitRequested({}));
    const [first, second] = metadata(submitted);
    const afterFirst = shellUpdate(
      submitted.model,
      Message.EndpointAdmissionSucceeded({ activationId: first!.activationId, generation: first!.generation }),
    );
    expect(modelAfter(afterFirst).status).not.toBe("saved");
    expect(modelAfter(afterFirst).run.pending).toHaveLength(1);
    expect(commandsOf(shellUpdate(afterFirst.model, Message.EndpointAdmissionSubmitRequested({})))).toEqual([]);
    const afterSecond = shellUpdate(
      afterFirst.model,
      Message.EndpointAdmissionSucceeded({ activationId: second!.activationId, generation: second!.generation }),
    );
    expect(modelAfter(afterSecond).status).toBe("saved");
    expect(modelAfter(afterSecond).run.pending).toHaveLength(0);
    // A settled run requires explicit reset, so a generic submit cannot silently re-activate both models.
    expect(commandsOf(shellUpdate(afterSecond.model, Message.EndpointAdmissionSubmitRequested({})))).toEqual([]);
    const reset = shellUpdate(afterSecond.model, Message.EndpointAdmissionResetRequested({}));
    expect(modelAfter(reset).status).toBe("draft");
    expect(modelAfter(reset).run.settled).toEqual([]);
    const next = shellUpdate(reset.model, Message.EndpointAdmissionSubmitRequested({}));
    expect(metadata(next).map((entry) => entry.generation)).toEqual([
      first!.generation + 1,
      first!.generation + 1,
    ]);
  });

  it("A success then B failure and the reverse both yield the same partial result", () => {
    const runOrder = (order: "success-first" | "failure-first") => {
      const submitted = shellUpdate(modelWith(), Message.EndpointAdmissionSubmitRequested({}));
      const [a, b] = metadata(submitted);
      const success = { activationId: a!.activationId, generation: a!.generation };
      const failure = { activationId: b!.activationId, generation: b!.generation, message: "B boom" };
      const first = order === "success-first"
        ? Message.EndpointAdmissionSucceeded(success)
        : Message.EndpointAdmissionFailed(failure);
      const second = order === "success-first"
        ? Message.EndpointAdmissionFailed(failure)
        : Message.EndpointAdmissionSucceeded(success);
      const afterFirst = shellUpdate(submitted.model, first);
      expect(modelAfter(afterFirst).status).not.toBe("partial");
      expect(modelAfter(afterFirst).run.pending).toHaveLength(1);
      const afterSecond = shellUpdate(afterFirst.model, second);
      expect(modelAfter(afterSecond).status).toBe("partial");
      expect(modelAfter(afterSecond).run.pending).toHaveLength(0);
      expect(modelAfter(afterSecond).error).toContain("B boom");
      expect(modelAfter(afterSecond).run.settled.map((entry) => entry.outcome)).toEqual(
        order === "success-first" ? ["succeeded", "failed"] : ["failed", "succeeded"],
      );
      return modelAfter(afterSecond);
    };
    const successFirst = runOrder("success-first");
    const failureFirst = runOrder("failure-first");
    const settledByActivation = (run: typeof successFirst.run) =>
      [...run.settled].sort((left, right) => left.activationId.localeCompare(right.activationId));
    expect(settledByActivation(failureFirst.run)).toEqual(settledByActivation(successFirst.run));
    expect(failureFirst.run.settled.map((entry) => entry.outcome).sort()).toEqual(["failed", "succeeded"]);
    // Generic submit must refuse until explicit reset; reset starts a fresh generation with the same ids.
    expect(commandsOf(shellUpdate(shellModel({ endpointAdmission: successFirst }), Message.EndpointAdmissionSubmitRequested({})))).toEqual([]);
  });

  it("duplicate, unknown, and old-generation callbacks are ignored before any mutation", () => {
    const submitted = shellUpdate(modelWith(), Message.EndpointAdmissionSubmitRequested({}));
    const [a, b] = metadata(submitted);
    const afterA = shellUpdate(
      submitted.model,
      Message.EndpointAdmissionSucceeded({ activationId: a!.activationId, generation: a!.generation }),
    );
    const repeated = shellUpdate(
      afterA.model,
      Message.EndpointAdmissionSucceeded({ activationId: a!.activationId, generation: a!.generation }),
    );
    expect(modelAfter(repeated).run).toEqual(modelAfter(afterA).run);
    const lateFailure = shellUpdate(
      repeated.model,
      Message.EndpointAdmissionFailed({ activationId: a!.activationId, generation: a!.generation, message: "late" }),
    );
    expect(modelAfter(lateFailure).run).toEqual(modelAfter(afterA).run);
    const unknown = shellUpdate(
      lateFailure.model,
      Message.EndpointAdmissionFailed({ activationId: "model:unknown", generation: a!.generation, message: "unknown" }),
    );
    expect(modelAfter(unknown).run).toEqual(modelAfter(afterA).run);
    const oldGeneration = shellUpdate(
      unknown.model,
      Message.EndpointAdmissionSucceeded({ activationId: b!.activationId, generation: a!.generation - 1 }),
    );
    expect(modelAfter(oldGeneration).run).toEqual(modelAfter(afterA).run);
    // Finish B, then reset explicitly; a stale callback in the new generation is inert.
    const completed = shellUpdate(
      oldGeneration.model,
      Message.EndpointAdmissionSucceeded({ activationId: b!.activationId, generation: b!.generation }),
    );
    const reset = shellUpdate(completed.model, Message.EndpointAdmissionResetRequested({}));
    const next = shellUpdate(reset.model, Message.EndpointAdmissionSubmitRequested({}));
    const [nextA] = metadata(next);
    const stale = shellUpdate(
      next.model,
      Message.EndpointAdmissionSucceeded({ activationId: a!.activationId, generation: a!.generation }),
    );
    expect(modelAfter(stale).run.pending.map((entry) => entry.activationId)).toEqual(
      modelAfter(next).run.pending.map((entry) => entry.activationId),
    );
    expect(nextA!.generation).toBe(a!.generation + 1);
  });

  it("batch mode stays one atomic activation unit", () => {
    const submitted = shellUpdate(
      modelWith(stateWithDraft({ batchMode: "true" })),
      Message.EndpointAdmissionSubmitRequested({}),
    );
    const commands = metadata(submitted);
    expect(commands).toHaveLength(1);
    expect(commands[0]?.name).toBe("ActivateEndpointBatch");
    expect(commands[0]?.activationId).toBe("batch:activation-batch-1");
    const saved = shellUpdate(
      submitted.model,
      Message.EndpointAdmissionSucceeded({ activationId: commands[0]!.activationId, generation: commands[0]!.generation }),
    );
    expect(modelAfter(saved).status).toBe("saved");
    const duplicate = shellUpdate(
      saved.model,
      Message.EndpointAdmissionSucceeded({ activationId: commands[0]!.activationId, generation: commands[0]!.generation }),
    );
    expect(modelAfter(duplicate).run).toEqual(modelAfter(saved).run);
    const failed = shellUpdate(
      submitted.model,
      Message.EndpointAdmissionFailed({ activationId: commands[0]!.activationId, generation: commands[0]!.generation, message: "batch boom" }),
    );
    expect(modelAfter(failed).status).toBe("error");
    expect(modelAfter(failed).error).toContain("batch boom");
  });

  it("freezes draft field/add/remove mutators while pending and until explicit reset", () => {
    const submitted = shellUpdate(modelWith(), Message.EndpointAdmissionSubmitRequested({}));
    const before = modelAfter(submitted).draft;
    const field = shellUpdate(submitted.model, Message.EndpointAdmissionFieldChanged({ field: "region", value: "us" }));
    expect(modelAfter(field).draft).toEqual(before);
    const added = shellUpdate(submitted.model, Message.EndpointAdmissionModelAdded({}));
    expect(modelAfter(added).draft.selectedModelIds).toEqual(before.selectedModelIds);
    const removed = shellUpdate(submitted.model, Message.EndpointAdmissionModelRemoved({ modelId: "gpt-6" }));
    expect(modelAfter(removed).draft.selectedModelIds).toEqual(before.selectedModelIds);
    const [a, b] = metadata(submitted);
    const settled = shellUpdate(
      shellUpdate(
        submitted.model,
        Message.EndpointAdmissionSucceeded({ activationId: a!.activationId, generation: a!.generation }),
      ).model,
      Message.EndpointAdmissionFailed({ activationId: b!.activationId, generation: b!.generation, message: "boom" }),
    );
    expect(modelAfter(settled).status).toBe("partial");
    const stillFrozen = shellUpdate(settled.model, Message.EndpointAdmissionFieldChanged({ field: "region", value: "us" }));
    expect(modelAfter(stillFrozen).draft.region).toBe("global");
    const reset = shellUpdate(settled.model, Message.EndpointAdmissionResetRequested({}));
    const editable = shellUpdate(reset.model, Message.EndpointAdmissionFieldChanged({ field: "region", value: "us" }));
    expect(modelAfter(editable).draft.region).toBe("us");
  });

  it("production command.effect carries the exact captured identity/generation and feeds the reducer", async () => {
    const calls: Array<{ readonly body: string; readonly url: string }> = [];
    // SAFETY: this stub is a real fetch implementation for the production client; it records exact JSON bodies.
    const fetchImpl = (async (url: string, init?: { readonly body?: string }) => {
      const body = String(init?.body ?? "");
      calls.push({ body, url: String(url) });
      // SAFETY: the production submit handler owns this JSON and this stub only branches on the model id.
      const modelId = (JSON.parse(body) as { readonly modelId?: string }).modelId;
      if (modelId === "gpt-6-mini") {
        return new Response(JSON.stringify({ error: "B boom" }), { headers: { "content-type": "application/json" }, status: 500 });
      }
      return new Response(JSON.stringify({ id: "endpoint-gpt-6" }), { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    const commands = defineEndpointAdmissionCommands(createEndpointAdmissionClient({ fetchImpl }));
    const submitted = shellUpdate(modelWith(), Message.EndpointAdmissionSubmitRequested({}));
    const [a, b] = metadata(submitted);
    const firstMessage = await Effect.runPromise(
      commands.activate({ activationId: a!.activationId, generation: a!.generation, payload: JSON.stringify(a!.payload) }).effect,
    );
    const secondMessage = await Effect.runPromise(
      commands.activate({ activationId: b!.activationId, generation: b!.generation, payload: JSON.stringify(b!.payload) }).effect,
    );
    expect(firstMessage._tag).toBe("EndpointAdmissionSucceeded");
    expect(firstMessage).toMatchObject({ activationId: a!.activationId, generation: a!.generation });
    expect(secondMessage._tag).toBe("EndpointAdmissionFailed");
    expect(secondMessage).toMatchObject({ activationId: b!.activationId, generation: b!.generation });
    expect(calls.map((call) => call.url)).toEqual(["/api/role-model/endpoints", "/api/role-model/endpoints"]);
    expect(calls.map((call) => JSON.parse(call.body))).toEqual([a!.payload, b!.payload]);
    const afterFirst = shellUpdate(submitted.model, firstMessage);
    expect(modelAfter(afterFirst).status).toBe("saving");
    const afterBoth = shellUpdate(afterFirst.model, secondMessage);
    expect(modelAfter(afterBoth).status).toBe("partial");
    expect(modelAfter(afterBoth).error).toContain("B boom");
  });

  it("renders pending/partial/all-failure summaries and an explicit reset event, not only per-id text", () => {
    const recordingBuilder = new Proxy(
      {},
      {
        get: (_target, property) => (...args: readonly unknown[]) => ({
          args,
          method: String(property),
        }),
      },
    );
    const render = (state: ReturnType<typeof initialEndpointAdmissionState>) =>
      // SAFETY: the proxy is a recording HtmlBuilder used only to serialize the produced view tree.
      JSON.stringify(renderEndpointAdmissionForm(state, recordingBuilder as never));
    const submitted = shellUpdate(modelWith(), Message.EndpointAdmissionSubmitRequested({}));
    const [a, b] = metadata(submitted);
    const pendingText = render(modelAfter(submitted));
    expect(pendingText).toContain("endpoint-admission-summary");
    expect(pendingText).toContain("Waiting for 2 endpoint activation(s)");
    expect(pendingText).toContain("polite");
    const afterA = shellUpdate(
      submitted.model,
      Message.EndpointAdmissionSucceeded({ activationId: a!.activationId, generation: a!.generation }),
    );
    const partial = shellUpdate(
      afterA.model,
      Message.EndpointAdmissionFailed({ activationId: b!.activationId, generation: b!.generation, message: "B boom" }),
    );
    const partialText = render(modelAfter(partial));
    expect(partialText).toContain("Partial activation: 1 succeeded, 1 failed");
    expect(partialText).toContain("endpoint-admission-summary");
    expect(partialText).toContain("endpoint-admission-reset");
    expect(partialText).toContain("EndpointAdmissionResetRequested");
    expect(partialText).toContain("may be activated again");
    const allFailed = shellUpdate(
      shellUpdate(
        submitted.model,
        Message.EndpointAdmissionFailed({ activationId: a!.activationId, generation: a!.generation, message: "A boom" }),
      ).model,
      Message.EndpointAdmissionFailed({ activationId: b!.activationId, generation: b!.generation, message: "B boom" }),
    );
    expect(render(modelAfter(allFailed))).toContain("Activation failed: 2 endpoint(s) failed");
  });
});
