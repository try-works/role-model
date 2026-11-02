import { afterEach, describe, expect, it } from "vitest";

import { Message } from "../src/message";
import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";
import { readStoredOperatorToken } from "../src/operator-token";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S619: wire the Learning route family controls from the dead-controls inventory.
 *
 * These are behavioural tests: the token field and the pack/kill-switch buttons must dispatch the
 * real operator writes (body + bearer token), not merely render.
 */
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });
const readbackFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url.includes("/operator/learning/records")) {
    return json({
      records: [{ id: "pack-1", label: "pack-1", status: "active" }],
      scopeId: "scope-learning-test",
      schemaVersion: "role-model.knowledge-learning-records.v1",
    });
  }
  return json({ records: [{ id: "row-1", label: "row-1", status: "active" }], scopeId: "scope-learning-test" });
};
const waitForPacks = async () => {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (document.querySelector("[data-route='learning-packs'][data-page-state='ok']")) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("learning packs readback did not become ok");
};
const mountAt = (path: string, operatorLearningFetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  container.id = "s619-" + String(mounted.length);
  document.body.append(container);
  const handle = mountShell(container, {
    readbackReaders: createReadbackClients({ fetchImpl: readbackFetch }),
    operatorLearningFetchImpl,
  });
  mounted.push({ container, handle });
};
const setToken = (value: string) => {
  const input = document.querySelector("input[aria-label='Operator token']") as HTMLInputElement | null;
  if (!input) throw new Error("operator token input absent");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("S619 Learning route family controls", () => {
  it("writes the operator token and sends a scope-wide rollback with it", async () => {
    const calls: Array<{ body: unknown; headers: Headers; url: string }> = [];
    mountAt("/learning/packs", async (input, init) => {
      calls.push({
        body: JSON.parse(String(init?.body)),
        headers: new Headers(init?.headers as HeadersInit),
        url: String(input),
      });
      return json({ ok: true });
    });
    await waitForPacks();
    setToken("token-abc");
    const rollback = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Roll back active pack (scope-wide)");
    if (!rollback) throw new Error("rollback button absent");
    rollback.click();
    const end = Date.now() + 3000;
    while (calls.length === 0 && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("/api/role-model/operator/learning/rollback-pack");
    expect(calls[0]?.body).toEqual({ scopeId: "scope-learning-test", reason: "operator_ui_rollback" });
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer token-abc");
    expect(window.localStorage.getItem("role-model.learning.operator-token")).toBe("token-abc");
  });

  it("persists the token and decision filters in shell state", () => {
    const model = shellModel({ route: { _tag: "LearningPacks" } });
    const token = shellUpdate(model, Message.LearningOperatorTokenChanged({ value: "token-state" }));
    expect(token.model.learningOperatorToken).toBe("token-state");
    expect(window.localStorage.getItem("role-model.learning.operator-token")).toBe("token-state");
    expect(readStoredOperatorToken()).toBe("token-state");
    const filtered = shellUpdate(token.model, Message.LearningDecisionFilterChanged({ filter: "outcome", value: "tie" }));
    expect(filtered.model.learningDecisionFilters).toMatchObject({ outcome: "tie" });
    const packs = shellUpdate(filtered.model, Message.LearningPackRollbackRequested());
    expect((packs.commands ?? []).map((command) => command.name)).toEqual(["LearningPackRollback"]);
    const kill = shellUpdate(filtered.model, Message.LearningKillSwitchRequested({ engaged: false }));
    expect((kill.commands ?? []).map((command) => command.name)).toEqual(["LearningKillSwitch"]);
  });

  it("feeds a newly stored operator token into the next readback request", async () => {
    window.localStorage.setItem("role-model.learning.operator-token", "read-token");
    const headers: Array<string | null> = [];
    const clients = createReadbackClients({
      fetchImpl: async (_input, init) => {
        headers.push(new Headers(init?.headers as HeadersInit).get("authorization"));
        return json({ records: [{ id: "pack-1" }], scopeId: "scope-learning-test" });
      },
      tokenProvider: readStoredOperatorToken,
    });
    await clients.learningPacks({ signal: new AbortController().signal });
    expect(headers[0]).toBe("Bearer read-token");
  });

  it("engages and releases the kill switch with the exact bodies", async () => {
    const calls: Array<{ body: unknown; url: string }> = [];
    mountAt("/learning/packs", async (input, init) => {
      calls.push({ body: JSON.parse(String(init?.body)), url: String(input) });
      return json({ ok: true });
    });
    await waitForPacks();
    const engage = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Engage kill switch");
    engage?.click();
    let end = Date.now() + 3000;
    while (calls.length < 1 && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls[0]?.url).toBe("/api/role-model/operator/learning/kill-switch");
    expect(calls[0]?.body).toEqual({ scopeId: "scope-learning-test" });
    const release = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Release kill switch");
    release?.click();
    end = Date.now() + 3000;
    while (calls.length < 2 && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls[1]?.body).toEqual({ scopeId: "scope-learning-test", engaged: false });
  });
});
