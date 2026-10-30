import assert from "node:assert/strict";
import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " | " + (document.body.textContent ?? "").slice(0, 400));
};
const mountStudio = (id: string, fetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/studio");
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, { studioFetchImpl: fetchImpl });
  mounted.push({ container, handle });
};
const workspaceSelector = (tab: string): string =>
  tab === "images" ? "[data-studio-field='size']"
    : tab === "audio" ? "[data-studio-field='mode']"
      : tab === "rerank" ? "[data-studio-field='query']"
        : tab === "advanced" ? "[data-studio-field='advancedBody']"
          : "[data-studio-field='prompt']";
const selectWorkspace = async (tab: string, runLabel: string) => {
  window.history.replaceState({}, "", "/studio?tab=" + tab);
  window.dispatchEvent(new CustomEvent("foldkit:urlchange"));
  await waitFor(() => document.querySelector(workspaceSelector(tab)) ?? undefined, tab + " workspace");
  await waitFor(() => document.querySelector("[data-studio-run]")?.textContent?.includes(runLabel) ? true : undefined, tab + " run label");
  await waitFor(() => document.querySelector("[role='alert']") === null ? true : undefined, tab + " clear alert");
};
afterEach(() => {
  for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

/**
 * S46a: the Studio wiring that needs a real client.
 *
 * The reference page renders one workspace selected by ?tab=; there is no in-page tab strip.
 * These assertions mount each workspace URL, keep the exact request-shape checks, and use the
 * page's own fields and run control. The rendering assertions live in s255.
 */
const workspaces = [
  { tab: "chat", title: "Request", fields: ["Model", "Prompt"], run: "Run request" },
  { tab: "images", title: "Image request modes", fields: ["Mode", "Model", "Prompt", "Size"], run: "Run image request" },
  { tab: "audio", title: "Audio mode and request", fields: ["Mode", "Model", "Voice", "Input"], run: "Run audio request" },
  { tab: "rerank", title: "Rerank request", fields: ["Contract", "Model", "Query", "Candidate documents"], run: "Submit rerank request" },
  { tab: "advanced", title: "Endpoint family", fields: ["Family", "Model", "JSON payload"], run: "Submit advanced request" },
] as const;

describe("S46a Studio", () => {
  it("renders each workspace's reference controls and run action", async () => {
    mountStudio("s46a-workspaces", async () => new Response("{}", { status: 200 }));
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    for (const workspace of workspaces) {
      await selectWorkspace(workspace.tab, workspace.run);
      for (const field of workspace.fields) {
        expect(document.body.textContent).toContain(field);
      }
      expect(document.body.textContent).toContain(workspace.title);
      expect(document.querySelector("[data-studio-run]")?.textContent).toContain(workspace.run);
    }
  });

  it("dispatches each workspace with the exact method, path and body", async () => {
    const calls: Array<{ readonly path: string; readonly init: RequestInit | undefined }> = [];
    const expected = [
      { tab: "chat", path: "/v1/chat/completions", body: { messages: [{ content: "A quiet harbour at dawn", role: "user" }], model: "moonshot/kimi-k2.5", stream: false } },
      { tab: "images", path: "/v1/images/generations", body: { mode: "generate", model: "moonshot/kimi-k2.5", prompt: "A quiet harbour at dawn", size: "1024x1024" } },
      { tab: "audio", path: "/v1/audio/speech", body: { input: "A quiet harbour at dawn", model: "moonshot/kimi-k2.5", response_format: "mp3", voice: "alloy" } },
      { tab: "rerank", path: "/v1/rerank", body: { documents: ["first document", "second document"], model: "moonshot/kimi-k2.5", query: "Which document is first?", top_n: 5 } },
      { tab: "advanced", path: "/v1/responses", body: { model: "moonshot/kimi-k2.5", max_tokens: 64, messages: [{ role: "user", content: "Hello" }] } },
    ] as const;
    mountStudio("s258-dispatch", async (input, init) => {
      const pathname = new URL(String(input), "http://localhost").pathname;
      if (pathname.startsWith("/v1/")) calls.push({ path: pathname, init });
      return new Response('{"error":"fixture rejection"}', { status: 404, headers: { "content-type": "application/json" } });
    });
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    for (const [index, entry] of expected.entries()) {
      const runLabel = entry.tab === "chat" ? "Run request" : entry.tab === "images" ? "Run image request" : entry.tab === "audio" ? "Run audio request" : entry.tab === "rerank" ? "Submit rerank request" : "Submit advanced request";
      await selectWorkspace(entry.tab, runLabel);
      await waitFor(() => document.querySelector("[data-studio-run]") ?? undefined, entry.tab + " run");
      const run = document.querySelector("[data-studio-run]");
      assert.ok(run instanceof HTMLButtonElement);
      run.click();
      await waitFor(() => document.querySelector("[role='alert']") ?? undefined, entry.tab + " error");
      expect(calls).toHaveLength(index + 1);
      const call = calls[index];
      assert.ok(call);
      expect(call.path).toBe(entry.path);
      expect(call.init?.method).toBe("POST");
      expect(JSON.parse(String(call.init?.body))).toEqual(entry.body);
    }
  });

  it("dispatches typed values, including a custom model and prompt", async () => {
    let body: Record<string, unknown> | undefined;
    mountStudio("s46a-typed", async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ error: "no_eligible_target", requestedModel: body.model }), { status: 400, headers: { "content-type": "application/json" } });
    });
    await waitFor(() => document.querySelector("[data-studio-field='model']") ?? undefined, "model field");
    const model = document.querySelector("[data-studio-field='model']") as HTMLInputElement;
    model.value = "custom-model-xyz";
    model.dispatchEvent(new Event("input", { bubbles: true }));
    const prompt = document.querySelector("[data-studio-field='prompt']") as HTMLInputElement;
    prompt.value = "typed prompt";
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    (document.querySelector("[data-studio-run]") as HTMLButtonElement).click();
    const alert = await waitFor(() => document.querySelector("[role='alert']") ?? undefined, "typed 400");
    expect(body?.model).toBe("custom-model-xyz");
    expect((body?.messages as Array<{ content: string }>)[0]?.content).toBe("typed prompt");
    expect(alert.textContent).toContain("HTTP 400");
    expect(alert.textContent).toContain("custom-model-xyz");
  });

  it("shows 404 raw body with role=alert and no fabricated success", async () => {
    mountStudio("s46a-404", async () => new Response('{"error":"not found"}', { status: 404, headers: { "content-type": "application/json" } }));
    await waitFor(() => document.querySelector("[data-studio-run]") ?? undefined, "run");
    (document.querySelector("[data-studio-run]") as HTMLButtonElement).click();
    const alert = await waitFor(() => document.querySelector("[role='alert']") ?? undefined, "alert");
    expect(alert.textContent).toContain("HTTP 404");
    expect(alert.textContent).toContain('{"error":"not found"}');
    expect(document.querySelector("[data-studio-raw='success']")).toBeNull();
  });

  it("renders a real chat response", async () => {
    mountStudio("s46a-chat", async () => new Response('{"choices":[{"message":{"content":"hello"}}]}', { status: 200, headers: { "content-type": "application/json" } }));
    await waitFor(() => document.querySelector("[data-studio-run]") ?? undefined, "run");
    (document.querySelector("[data-studio-run]") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-studio-raw='success']") ?? undefined, "chat success");
    expect(document.body.textContent).toContain("hello");
  });
});
