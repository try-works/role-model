import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  createLocalPeersClient,
  defineLocalPeersCommands,
  defineReadDiagnostics,
} from "../src/commands";
import { localPeersPage } from "../src/features/local/peers";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

const readback = {
  rows: [
    {
      id: "peer-1",
      label: "http://peer:1234",
      meta: JSON.stringify({ authToken: "t", id: "peer-1", url: "http://peer:1234" }),
      value: "auth",
    },
  ],
  status: "ok" as const,
  token: 0,
};
const update = createUpdate(
  defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })),
);

describe("S626 local peers wiring", () => {
  it("renders the labelled inputs, add button, and row actions", async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        {
          init: () => ({ model: shellModel({}), commands: [] }),
          // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
          view: (_model: Model, h: HtmlBuilder<Message>) => ({
            body: localPeersPage(readback, h as Parameters<typeof localPeersPage>[1], {
              localPeersDraft: { token: "secret", url: "http://new:1234" },
              localPeersMessage: "ready",
            }),
            title: "peers",
          }),
        },
        { isHydratable: false },
      ),
    );
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.querySelector("#peer-url")?.getAttribute("value")).toBe("http://new:1234");
    expect(container.querySelector("#peer-auth-token")?.getAttribute("value")).toBe("secret");
    expect(container.querySelector("[data-local-peer-add]")).not.toBeNull();
    expect(container.querySelector("[data-local-peer-health]")).not.toBeNull();
    expect(container.querySelector("[data-local-peer-remove]")).not.toBeNull();
  });

  it("sends the exact peers PUT array and health GET query", async () => {
    const calls: Array<{ body: unknown; method: string; url: string }> = [];
    const commands = defineLocalPeersCommands(
      createLocalPeersClient(async (input, init) => {
        calls.push({
          body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
          method: String(init?.method ?? "GET"),
          url: String(input),
        });
        return new Response("{}", { status: 200 });
      }),
    );
    await Effect.runPromise(
      commands.save({
        peersJson: JSON.stringify([{ id: "p1", url: "http://peer:1234", authToken: "t" }]),
        token: 1,
      }).effect,
    );
    await Effect.runPromise(commands.health({ token: 1, url: "http://peer:1234" }).effect);
    expect(calls[0]).toEqual({
      body: [{ authToken: "t", id: "p1", url: "http://peer:1234" }],
      method: "PUT",
      url: "/api/role-model/local/peers",
    });
    expect(calls[1]).toEqual({
      body: undefined,
      method: "GET",
      url: "/api/role-model/local/peers/health?url=http%3A%2F%2Fpeer%3A1234",
    });
  });

  it("builds the full typed peer array for add and remove", () => {
    const base = shellModel({ route: { _tag: "LocalPeers" } });
    const model = { ...base, readbacks: { ...base.readbacks, localPeers: readback } };
    const typed = update(model, Message.LocalPeerUrlChanged({ value: "http://new:1234" }));
    const withToken = update(typed.model, Message.LocalPeerTokenChanged({ value: "tok" }));
    const added = update(withToken.model, Message.LocalPeerAddRequested());
    const addArgs = (added.commands ?? [])[0] as unknown as {
      readonly args: { readonly peersJson: string };
    };
    expect(JSON.parse(addArgs.args.peersJson)).toEqual([
      { authToken: "t", id: "peer-1", url: "http://peer:1234" },
      { authToken: "tok", id: "http://new:1234", url: "http://new:1234" },
    ]);
    const removed = update(model, Message.LocalPeerRemoveRequested({ peerId: "peer-1" }));
    const removeArgs = (removed.commands ?? [])[0] as unknown as {
      readonly args: { readonly peersJson: string };
    };
    expect(JSON.parse(removeArgs.args.peersJson)).toEqual([]);
  });
});
