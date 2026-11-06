import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { defineProviderAccountCommands } from "../src/commands";
import { defineReadDiagnostics } from "../src/commands";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createProviderAccountClient, initialProviderAccountState } from "../src/provider-account";
import { createUpdate } from "../src/update";
import { shellModel, shellUpdate } from "./support/runtime-shell";

const update = createUpdate(
  defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })),
);
const modelFor = (modelInput: string): Model => {
  const base = shellModel({ route: { _tag: "Providers" } });
  const initial = initialProviderAccountState();
  return {
    ...base,
    providerAccount: {
      ...initial,
      draft: {
        ...initial.draft,
        modelInput,
        providerAccountId: "acct-deepseek",
        providerId: "deepseek",
        providerKind: "openai-compatible",
      },
      pendingAction: "create",
      status: "saving",
      token: 1,
    },
  };
};
const activationCommand = (modelInput: string) => {
  const next = shellUpdate(
    modelFor(modelInput),
    Message.ProviderAccountCreateSucceeded({ token: 1 }),
  );
  const command = (next.commands ?? [])[0] as unknown as {
    readonly args: { readonly payload: string };
    readonly name: string;
  };
  expect(command.name).toBe("ActivateProviderAccountEndpoints");
  return {
    body: JSON.parse(command.args.payload) as {
      readonly activationBatchId: string;
      readonly activations: ReadonlyArray<{ readonly modelId: string }>;
    },
    command,
  };
};

describe("S638 provider account activation batch ids", () => {
  it("uses distinct batch ids for distinct payloads even with the same activation token", () => {
    const first = activationCommand("deepseek-chat");
    const second = activationCommand("deepseek-reasoner");
    expect(first.body.activations).toEqual([
      { modelId: "deepseek-chat", providerAccountId: "acct-deepseek", region: "global" },
    ]);
    expect(second.body.activations).toEqual([
      { modelId: "deepseek-reasoner", providerAccountId: "acct-deepseek", region: "global" },
    ]);
    expect(first.body.activationBatchId).not.toBe(second.body.activationBatchId);
    expect(first.body.activationBatchId).toMatch(/^activation-2-[0-9a-f]{8}$/);
  });

  it("renders the saved account state after activation", () => {
    const model = modelFor("deepseek-chat");
    const activated = update(model, Message.ProviderAccountEndpointsActivated({ token: 2 }));
    expect(activated.model.providerAccount?.status).toBe("saved");
    expect(activated.model.providerAccount?.error).toBeUndefined();
    expect(activated.model.providerAccount?.pendingAction).toBeUndefined();
  });

  it("accepts two consecutive saves on the same account and preserves the exact bodies", async () => {
    const first = activationCommand("deepseek-chat");
    const second = activationCommand("deepseek-reasoner");
    const calls: Array<{ readonly body: unknown; readonly path: string }> = [];
    const hosts = new Map<string, string>();
    const commands = defineProviderAccountCommands(
      createProviderAccountClient({
        fetchImpl: async (input, init) => {
          const path = new URL(String(input), "http://localhost").pathname;
          const body = JSON.parse(String(init?.body)) as { readonly activationBatchId: string };
          calls.push({ body, path });
          const digest = JSON.stringify(body);
          const bound = hosts.get(body.activationBatchId);
          if (bound !== undefined && bound !== digest)
            return new Response(
              JSON.stringify({
                error: "Activation batch was already bound to a different payload.",
              }),
              { status: 409 },
            );
          hosts.set(body.activationBatchId, digest);
          return new Response(
            JSON.stringify({ activationBatchId: body.activationBatchId, status: "committed" }),
            { status: 200 },
          );
        },
      }),
    );
    const firstResult = await Effect.runPromise(
      commands.activate({ payload: first.command.args.payload, token: 1 }).effect,
    );
    const secondResult = await Effect.runPromise(
      commands.activate({ payload: second.command.args.payload, token: 2 }).effect,
    );
    expect(calls.map((call) => call.path)).toEqual([
      "/api/role-model/endpoints/batch",
      "/api/role-model/endpoints/batch",
    ]);
    expect(calls[0]?.body).toEqual(first.body);
    expect(calls[1]?.body).toEqual(second.body);
    expect((firstResult as { readonly _tag: string })._tag).toBe(
      "ProviderAccountEndpointsActivated",
    );
    expect((secondResult as { readonly _tag: string })._tag).toBe(
      "ProviderAccountEndpointsActivated",
    );
  });
});
